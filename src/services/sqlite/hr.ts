import { query, queryOne, run, addToSyncQueue, transaction } from './db'
import { getCurrentUserId, uuid, nowIso } from './db'
import type {
  Employee,
  EmployeeInsert,
  EmployeeUpdate,
  EmployeeWithStats,
  Attendance,
  AttendanceInsert,
  AttendanceUpdate,
  Payroll,
  EmployeeLoan,
  EmployeeLoanInsert,
  EmployeeLoanUpdate,
  EmployeeLoanPayment,
  EmployeeLoanPaymentInsert,
} from '@/types/database'

// ============================================================
// SQLite Service: HR & Payroll
// Mirror dari src/services/hr.ts — sistem payroll per-karyawan
// (slip gaji mandiri per karyawan, periode custom, insentif
// bongkar muat otomatis dari surat jalan, potongan kasbon manual).
// Fungsi replikasi dari Supabase + RPC:
//   - generate_payroll_for_employee (JS mirror)
//   - post_payroll_journal (JS mirror, per slip)
//   - delete_payroll (JS mirror, ikut hapus jurnal)
// ============================================================

export const sqliteHrService = {
  // ============================================================
  // EMPLOYEES
  // ============================================================

  async fetchEmployees(): Promise<Employee[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM employees WHERE user_id = ? ORDER BY name`,
      [userId]
    )
    return rows.map(this.mapEmployee)
  },

  async getEmployee(id: string): Promise<Employee | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM employees WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    return row ? this.mapEmployee(row) : null
  },

  async generateEmployeeCode(): Promise<string> {
    const userId = getCurrentUserId()
    const now = new Date()
    const prefix = `EMP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`
    const row = await queryOne<any>(
      `SELECT COUNT(*) as count FROM employees WHERE user_id = ? AND employee_code LIKE ?`,
      [userId, prefix + '%']
    )
    const count = (row?.count || 0) + 1
    return `${prefix}${String(count).padStart(4, '0')}`
  },

  async createEmployee(input: EmployeeInsert): Promise<Employee> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    // Auto-generate employee code
    let code = input.employee_code
    if (!code) {
      code = await this.generateEmployeeCode()
    }

    await run(
      `INSERT INTO employees (id, user_id, employee_code, name, gender, birth_place, birth_date,
        phone, email, address, identity_type, identity_number, position,
        join_date, resign_date, status, salary_type, base_salary, bank_name, bank_account_number,
        bank_account_name, npwp, notes, is_active, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, userId, code, input.name, input.gender || null, input.birth_place || null, input.birth_date || null,
       input.phone || null, input.email || null, input.address || null, input.identity_type || null,
       input.identity_number || null, input.position || null,
       input.join_date || null, input.resign_date || null, input.status || 'aktif',
       input.salary_type || 'bulanan', input.base_salary || 0, input.bank_name || null,
       input.bank_account_number || null, input.bank_account_name || null, input.npwp || null,
       input.notes || null, input.is_active !== false ? 1 : 0, now, now, now]
    )

    const emp = await this.getEmployee(id)
    await addToSyncQueue('INSERT', 'employees', id, emp || { id })
    return emp!
  },

  async updateEmployee(id: string, updates: EmployeeUpdate): Promise<Employee> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const fields: string[] = []
    const values: any[] = []

    const updatable = [
      'name', 'gender', 'birth_place', 'birth_date', 'phone', 'email', 'address',
      'identity_type', 'identity_number', 'position', 'join_date',
      'resign_date', 'status', 'salary_type', 'base_salary', 'bank_name',
      'bank_account_number', 'bank_account_name', 'npwp', 'notes', 'is_active',
    ] as const

    for (const key of updatable) {
      if ((updates as any)[key] !== undefined) {
        const val = (updates as any)[key]
        fields.push(`${key} = ?`)
        values.push(key === 'is_active' ? (val ? 1 : 0) : val)
      }
    }

    fields.push('updated_at = ?', 'sync_status = ?', 'updated_at_local = ?')
    values.push(now, 'pending', now, id, userId)

    await run(
      `UPDATE employees SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    )

    const emp = await this.getEmployee(id)
    await addToSyncQueue('UPDATE', 'employees', id, emp || { id })
    return emp!
  },

  async deleteEmployee(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await run(`DELETE FROM employees WHERE id = ? AND user_id = ?`, [id, userId])
    await addToSyncQueue('DELETE', 'employees', id, { id })
  },

  /** Karyawan dengan statistik absensi */
  async fetchEmployeesWithStats(): Promise<EmployeeWithStats[]> {
    const employees = await this.fetchEmployees()
    const userId = getCurrentUserId()
    const currentMonth = new Date().toISOString().slice(0, 7)

    const attRows = await query<any>(
      `SELECT employee_id, status FROM attendance
       WHERE user_id = ? AND attendance_date >= ? AND attendance_date <= ?
       ORDER BY employee_id`,
      [userId, currentMonth + '-01', currentMonth + '-31']
    )

    const totalByEmp = new Map<string, number>()
    const absenceByEmp = new Map<string, number>()
    for (const r of attRows) {
      const eId = r.employee_id
      totalByEmp.set(eId, (totalByEmp.get(eId) || 0) + 1)
      if (r.status === 'alpa') {
        absenceByEmp.set(eId, (absenceByEmp.get(eId) || 0) + 1)
      }
    }

    return employees.map((e) => ({
      ...e,
      total_attendance: totalByEmp.get(e.id) || 0,
      total_absences: absenceByEmp.get(e.id) || 0,
    }))
  },

  // ============================================================
  // ATTENDANCE
  // ============================================================

  async fetchAttendance(startDate?: string, endDate?: string): Promise<Attendance[]> {
    const userId = getCurrentUserId()
    let sql = `SELECT a.*, e.name as employee_name, e.employee_code
               FROM attendance a
               LEFT JOIN employees e ON e.id = a.employee_id
               WHERE a.user_id = ?`
    const params: any[] = [userId]

    if (startDate) { sql += ` AND a.attendance_date >= ?`; params.push(startDate) }
    if (endDate) { sql += ` AND a.attendance_date <= ?`; params.push(endDate) }

    sql += ` ORDER BY a.attendance_date DESC, e.name ASC`

    const rows = await query<any>(sql, params)
    return rows.map((r: any) => ({
      ...this.mapAttendance(r),
      employee: r.employee_name ? { name: r.employee_name, employee_code: r.employee_code } as any : undefined,
    }))
  },

  async getAttendance(id: string): Promise<Attendance | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT a.*, e.name as employee_name, e.employee_code
       FROM attendance a
       LEFT JOIN employees e ON e.id = a.employee_id
       WHERE a.id = ? AND a.user_id = ?`,
      [id, userId]
    )
    if (!row) return null
    return {
      ...this.mapAttendance(row),
      employee: row.employee_name ? { name: row.employee_name, employee_code: row.employee_code } as any : undefined,
    }
  },

  async createAttendance(input: AttendanceInsert): Promise<Attendance> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    // Cek duplicate (unique constraint employee_id + attendance_date)
    const existing = await queryOne<any>(
      `SELECT id FROM attendance WHERE employee_id = ? AND attendance_date = ? AND user_id = ?`,
      [input.employee_id, input.attendance_date, userId]
    )
    if (existing) {
      throw new Error('Absensi untuk karyawan pada tanggal ini sudah ada')
    }

    await run(
      `INSERT INTO attendance (id, user_id, employee_id, attendance_date, check_in, check_out, status, notes, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, userId, input.employee_id, input.attendance_date,
       input.check_in || null, input.check_out || null,
       input.status || 'hadir', input.notes || null, now, now, now]
    )

    const att = await this.getAttendance(id)
    await addToSyncQueue('INSERT', 'attendance', id, att || { id })
    return att!
  },

  async updateAttendance(id: string, updates: AttendanceUpdate): Promise<Attendance> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const fields: string[] = []
    const values: any[] = []

    const updatable = ['employee_id', 'attendance_date', 'check_in', 'check_out', 'status', 'notes'] as const
    for (const key of updatable) {
      if ((updates as any)[key] !== undefined) {
        fields.push(`${key} = ?`)
        values.push((updates as any)[key])
      }
    }

    fields.push('updated_at = ?', 'sync_status = ?', 'updated_at_local = ?')
    values.push(now, 'pending', now, id, userId)

    await run(
      `UPDATE attendance SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    )

    const att = await this.getAttendance(id)
    await addToSyncQueue('UPDATE', 'attendance', id, att || { id })
    return att!
  },

  async deleteAttendance(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await run(`DELETE FROM attendance WHERE id = ? AND user_id = ?`, [id, userId])
    await addToSyncQueue('DELETE', 'attendance', id, { id })
  },

  /** Absensi bulk untuk satu karyawan (isian bulanan) */
  async bulkCreateAttendance(records: AttendanceInsert[]): Promise<number> {
    let count = 0
    for (const r of records) {
      try {
        await this.createAttendance(r)
        count++
      } catch {
        // Skip duplicate
      }
    }
    return count
  },

  // ============================================================
  // PAYROLL (Slip Gaji per karyawan — sistem baru)
  // Mirror RPC Supabase: generate_payroll_for_employee,
  // post_payroll_journal, delete_payroll.
  // Tidak ada payroll_periods/payroll_components/payroll_items lagi.
  // ============================================================

  /** generate_payroll_code(): 'PAY-YYYYMM-NNNN' (urutan per bulan berjalan). */
  async generatePayrollCode(): Promise<string> {
    const userId = getCurrentUserId()
    const now = new Date()
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const row = await queryOne<any>(
      `SELECT COUNT(*) as count FROM payrolls
       WHERE user_id = ? AND substr(created_at, 1, 7) = ?`,
      [userId, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`]
    )
    return `PAY-${ym}-${String((row?.count || 0) + 1).padStart(4, '0')}`
  },

  async fetchPayrolls(employeeId?: string): Promise<Payroll[]> {
    const userId = getCurrentUserId()
    let sql = `SELECT p.*, e.name as employee_name, e.employee_code, e.position
               FROM payrolls p
               LEFT JOIN employees e ON e.id = p.employee_id
               WHERE p.user_id = ?`
    const params: any[] = [userId]
    if (employeeId) {
      sql += ` AND p.employee_id = ?`
      params.push(employeeId)
    }
    sql += ` ORDER BY p.created_at DESC`
    const rows = await query<any>(sql, params)
    return rows.map(this.mapPayrollWithEmployee)
  },

  async getPayroll(id: string): Promise<Payroll | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT p.*, e.name as employee_name, e.employee_code, e.position
       FROM payrolls p
       LEFT JOIN employees e ON e.id = p.employee_id
       WHERE p.id = ? AND p.user_id = ?`,
      [id, userId]
    )
    return row ? this.mapPayrollWithEmployee(row) : null
  },

  /**
   * Mirror RPC generate_payroll_for_employee (satu slip per karyawan).
   * base_salary dari data karyawan; insentif bongkar muat dihitung dari
   * surat jalan 'selesai' dalam periode (CEIL(nilai muatan ÷ jumlah loader));
   * potongan kasbon diinput manual.
   */
  async generatePayroll(
    employeeId: string,
    periodStart: string,
    periodEnd: string,
    kasbonDeduction: number = 0
  ): Promise<Payroll> {
    const userId = getCurrentUserId()
    const now = nowIso()

    const emp = await queryOne<any>(
      `SELECT * FROM employees WHERE id = ? AND user_id = ?`,
      [employeeId, userId]
    )
    if (!emp) throw new Error('Karyawan tidak ditemukan')
    if (emp.status !== 'aktif' || !emp.is_active) throw new Error('Karyawan tidak aktif')
    if (periodStart > periodEnd) throw new Error('Tanggal mulai tidak boleh lebih besar dari tanggal selesai')

    const periodCode = await this.generatePayrollCode()
    const payrollId = uuid()
    const baseSalary = Number(emp.base_salary) || 0

    // Detail insentif untuk slip gaji
    const incentiveDetails: Array<{
      type: 'loader' | 'driver'
      date: string
      do_number: string
      description: string
      quantity?: number
      unit_price?: number
      amount: number
    }> = []

    // Insentif bongkar muat (hanya jika karyawan pernah jadi loader)
    let incentive = 0
    const isLoader = await queryOne<any>(
      `SELECT 1 as x FROM delivery_loaders WHERE employee_id = ? AND user_id = ? LIMIT 1`,
      [employeeId, userId]
    )
    if (isLoader) {
      const doRows = await query<any>(
        `SELECT dor.id, dor.do_number, dor.do_date,
                COALESCE((SELECT SUM(li.quantity * li.unit_price) FROM delivery_load_items li WHERE li.delivery_order_id = dor.id), 0) as nilai_muatan,
                (SELECT COUNT(*) FROM delivery_loaders l WHERE l.delivery_order_id = dor.id) as jumlah_loader
         FROM delivery_orders dor
         WHERE dor.user_id = ? AND dor.status = 'selesai'
           AND substr(dor.do_date, 1, 10) >= ? AND substr(dor.do_date, 1, 10) <= ?
           AND EXISTS (SELECT 1 FROM delivery_loaders l WHERE l.delivery_order_id = dor.id AND l.employee_id = ?)`,
        [userId, periodStart, periodEnd, employeeId]
      )
      for (const dor of doRows) {
        const nilai = Number(dor.nilai_muatan) || 0
        const orang = Number(dor.jumlah_loader) || 0
        if (orang > 0 && nilai > 0) {
          const bagianLoader = Math.ceil(nilai / orang)
          incentive += bagianLoader
          
          // Dapatkan detail barang untuk deskripsi
          const items = await query<any>(
            `SELECT product_name, quantity, unit_price FROM delivery_load_items WHERE delivery_order_id = ?`,
            [dor.id]
          )
          const itemDesc = items.map((it: any) => 
            `${it.product_name} (${it.quantity} x ${new Intl.NumberFormat('id-ID').format(it.unit_price)})`
          ).join(', ')
          
          incentiveDetails.push({
            type: 'loader',
            date: dor.do_date.slice(0, 10),
            do_number: dor.do_number || dor.id.slice(0, 8),
            description: `Bongkar muat: ${itemDesc} — Dibagi ${orang} orang`,
            amount: bagianLoader
          })
        }
      }
    }

    // Insentif supir (hitung total driver_fee dari surat jalan yang diselesaikan)
    const isDriver = await queryOne<any>(
      `SELECT 1 as x FROM delivery_orders WHERE driver_id = ? AND user_id = ? LIMIT 1`,
      [employeeId, userId]
    )
    if (isDriver) {
      const driverTrips = await query<any>(
        `SELECT id, do_number, do_date, driver_fee
         FROM delivery_orders
         WHERE user_id = ? AND driver_id = ? AND status = 'selesai'
           AND substr(do_date, 1, 10) >= ? AND substr(do_date, 1, 10) <= ?`,
        [userId, employeeId, periodStart, periodEnd]
      )
      for (const trip of driverTrips) {
        const fee = Number(trip.driver_fee) || 0
        if (fee > 0) {
          incentive += fee
          incentiveDetails.push({
            type: 'driver',
            date: trip.do_date.slice(0, 10),
            do_number: trip.do_number || trip.id.slice(0, 8),
            description: `Ongkos supir`,
            amount: fee
          })
        }
      }
    }

    const kasbon = Number(kasbonDeduction) || 0
    const totalNet = baseSalary + incentive - kasbon

    await run(
      `INSERT INTO payrolls (id, user_id, employee_id, period_code, period_start, period_end,
        base_salary, incentive_amount, kasbon_deduction, total_net, incentive_details, status, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, 'pending', ?)`,
      [payrollId, userId, employeeId, periodCode, periodStart, periodEnd,
       baseSalary, incentive, kasbon, totalNet, JSON.stringify(incentiveDetails), now, now, now]
    )

    const created = await this.getPayroll(payrollId)
    await addToSyncQueue('INSERT', 'payrolls', payrollId, created || { id: payrollId })
    return created!
  },

  async updatePayroll(id: string, updates: Partial<Payroll>): Promise<Payroll> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const fields: string[] = []
    const values: any[] = []
    const updatable = [
      'employee_id', 'period_code', 'period_start', 'period_end',
      'base_salary', 'incentive_amount', 'kasbon_deduction', 'total_net', 'status', 'notes',
    ] as const
    for (const key of updatable) {
      if ((updates as any)[key] !== undefined) {
        fields.push(`${key} = ?`)
        values.push((updates as any)[key])
      }
    }
    fields.push('updated_at = ?', 'sync_status = ?', 'updated_at_local = ?')
    values.push(now, 'pending', now, id, userId)
    await run(`UPDATE payrolls SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values)
    const updated = await this.getPayroll(id)
    await addToSyncQueue('UPDATE', 'payrolls', id, updated || { id })
    return updated!
  },

  /**
   * Mirror RPC post_payroll_journal (per slip). Debit: akun Beban Gaji,
   * Kredit: akun Hutang Gaji. Akun dicari via tipe+nama (enum lokal:
   * 'beban' / 'kewajiban'), bukan kode tetap.
   */
  async postPayrollJournal(payrollId: string): Promise<Payroll> {
    const userId = getCurrentUserId()
    const now = nowIso()

    const payroll = await queryOne<any>(
      `SELECT p.*, e.name as employee_name
       FROM payrolls p
       JOIN employees e ON e.id = p.employee_id
       WHERE p.id = ? AND p.user_id = ?`,
      [payrollId, userId]
    )
    if (!payroll) throw new Error('Slip gaji tidak ditemukan')
    if (payroll.status === 'paid') throw new Error('Slip gaji sudah dibayar')
    const totalNet = Number(payroll.total_net) || 0
    if (totalNet <= 0) throw new Error('Gaji bersih harus lebih dari 0')

    const expenseAccount = await queryOne<any>(
      `SELECT id, code, name FROM chart_of_accounts
       WHERE user_id = ? AND type = 'beban' AND is_active = 1
         AND (LOWER(name) LIKE '%gaji%' OR LOWER(name) LIKE '%salary%')
       ORDER BY created_at LIMIT 1`,
      [userId]
    )
    if (!expenseAccount)
      throw new Error('Akun biaya gaji tidak ditemukan. Buat dulu akun tipe Beban dengan nama mengandung "Gaji"')

    const liabilityAccount = await queryOne<any>(
      `SELECT id, code, name FROM chart_of_accounts
       WHERE user_id = ? AND type = 'kewajiban' AND is_active = 1
         AND LOWER(name) LIKE '%hutang%' AND LOWER(name) LIKE '%gaji%'
       ORDER BY created_at LIMIT 1`,
      [userId]
    )
    if (!liabilityAccount)
      throw new Error('Akun hutang gaji tidak ditemukan. Buat dulu akun tipe Kewajiban dengan nama mengandung "Hutang Gaji"')

    // Nomor jurnal: JV-YYYYMMDD-NNNN
    const d = new Date()
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const jc = await queryOne<any>(`SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ?`, [userId])
    const journalNumber = `JV-${ymd}-${String((jc?.count || 0) + 1).padStart(4, '0')}`
    const journalId = uuid()

    await transaction(async (tx) => {
      await tx.run(
        `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, 'payroll', ?, 'posted', ?, ?, 'pending', ?)`,
        [journalId, userId, journalNumber, now.split('T')[0],
         `Pembayaran gaji ${payroll.employee_name} periode ${payroll.period_start} s/d ${payroll.period_end}`,
         payrollId, now, now, now]
      )
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, expenseAccount.id, expenseAccount.code, expenseAccount.name, totalNet, now, now]
      )
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, liabilityAccount.id, liabilityAccount.code, liabilityAccount.name, totalNet, now, now]
      )
      await tx.run(
        `UPDATE payrolls SET status = 'paid', journal_entry_id = ?, paid_at = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [journalId, now, now, now, payrollId, userId]
      )
    })

    // Queue slip (status paid) + jurnal (header+lines lewat embedded self-heal syncEngine)
    const paid = await this.getPayroll(payrollId)
    if (!paid) throw new Error('Slip gaji tidak ditemukan setelah diposting')
    
    await addToSyncQueue(
      'UPDATE',
      'payrolls',
      payrollId,
      paid
    )
    const { sqliteFinanceService } = await import('./finance')
    const journal = await sqliteFinanceService.getJournal(journalId)
    if (journal) {
      await addToSyncQueue('INSERT', 'journal_entries', journalId, journal)
    }

    return paid
  },

  /**
   * Mirror RPC delete_payroll: hapus jurnal terkait (jika sudah diposting)
   * lalu slip-nya.
   */
  async deletePayroll(id: string): Promise<void> {
    const userId = getCurrentUserId()
    const payroll = await queryOne<any>(
      `SELECT id, journal_entry_id FROM payrolls WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    if (!payroll) throw new Error('Slip gaji tidak ditemukan')

    if (payroll.journal_entry_id) {
      await run(`DELETE FROM journal_lines WHERE journal_id = ? AND user_id = ?`, [payroll.journal_entry_id, userId])
      await run(`DELETE FROM journal_entries WHERE id = ? AND user_id = ?`, [payroll.journal_entry_id, userId])
      await addToSyncQueue('DELETE', 'journal_entries', payroll.journal_entry_id, { id: payroll.journal_entry_id })
    }

    await run(`DELETE FROM payrolls WHERE id = ? AND user_id = ?`, [id, userId])
    await addToSyncQueue('DELETE', 'payrolls', id, { id })
  },

  // ============================================================
  // EMPLOYEE LOANS (KASBON)
  // ============================================================

  async fetchEmployeeLoans(): Promise<EmployeeLoan[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT el.*, e.name as employee_name, e.employee_code, e.position
       FROM employee_loans el
       LEFT JOIN employees e ON e.id = el.employee_id
       WHERE el.user_id = ? ORDER BY el.loan_date DESC`,
      [userId]
    )
    const result: EmployeeLoan[] = []
    for (const r of rows) {
      const payments = await query<any>(
        `SELECT * FROM employee_loan_payments WHERE loan_id = ? AND user_id = ? ORDER BY payment_date DESC`,
        [r.id, userId]
      )
      result.push({
        ...this.mapEmployeeLoan(r),
        employee: r.employee_name ? {
          id: r.employee_id,
          name: r.employee_name,
          employee_code: r.employee_code,
          position: r.position,
        } as any : undefined,
        payments: payments.map(this.mapEmployeeLoanPayment),
      })
    }
    return result
  },

  async getEmployeeLoan(id: string): Promise<EmployeeLoan | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT el.*, e.name as employee_name, e.employee_code, e.position
       FROM employee_loans el
       LEFT JOIN employees e ON e.id = el.employee_id
       WHERE el.id = ? AND el.user_id = ?`,
      [id, userId]
    )
    if (!row) return null

    const payments = await query<any>(
      `SELECT * FROM employee_loan_payments WHERE loan_id = ? AND user_id = ? ORDER BY payment_date DESC`,
      [id, userId]
    )

    return {
      ...this.mapEmployeeLoan(row),
      employee: row.employee_name ? {
        id: row.employee_id,
        name: row.employee_name,
        employee_code: row.employee_code,
        position: row.position,
      } as any : undefined,
      payments: payments.map(this.mapEmployeeLoanPayment),
    }
  },

  async createEmployeeLoan(input: EmployeeLoanInsert): Promise<EmployeeLoan> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    await run(
      `INSERT INTO employee_loans (id, user_id, employee_id, loan_date, amount, remaining_amount, description, status, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, userId, input.employee_id, input.loan_date, input.amount, input.amount,
       input.description || null, input.status || 'active', now, now, now]
    )

    const loan = await this.getEmployeeLoan(id)
    await addToSyncQueue('INSERT', 'employee_loans', id, loan || { id })
    return loan!
  },

  async updateEmployeeLoan(id: string, updates: EmployeeLoanUpdate): Promise<EmployeeLoan> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const fields: string[] = []
    const values: any[] = []

    const updatable = ['employee_id', 'loan_date', 'amount', 'remaining_amount', 'description', 'status'] as const
    for (const key of updatable) {
      if ((updates as any)[key] !== undefined) {
        fields.push(`${key} = ?`)
        values.push((updates as any)[key])
      }
    }

    // Kalau amount diubah tapi remaining_amount tidak diberikan, hitung ulang
    if (updates.amount !== undefined && updates.remaining_amount === undefined) {
      const existing = await this.getEmployeeLoan(id)
      if (existing) {
        const paid = Number(existing.amount) - Number(existing.remaining_amount)
        const newRemaining = Math.max(0, Number(updates.amount) - paid)
        const idx = fields.findIndex(f => f === 'remaining_amount = ?')
        if (idx !== -1) {
          values[idx] = newRemaining
        } else {
          fields.push('remaining_amount = ?')
          values.push(newRemaining)
        }
        // Auto-update status
        if (updates.status === undefined) {
          const statusIdx = fields.findIndex(f => f === 'status = ?')
          const newStatus = newRemaining <= 0 ? 'paid' : 'active'
          if (statusIdx !== -1) {
            values[statusIdx] = newStatus
          } else {
            fields.push('status = ?')
            values.push(newStatus)
          }
        }
      }
    }

    fields.push('updated_at = ?', 'sync_status = ?', 'updated_at_local = ?')
    values.push(now, 'pending', now, id, userId)

    await run(
      `UPDATE employee_loans SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    )

    const loan = await this.getEmployeeLoan(id)
    await addToSyncQueue('UPDATE', 'employee_loans', id, loan || { id })
    return loan!
  },

  async deleteEmployeeLoan(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await run(`DELETE FROM employee_loans WHERE id = ? AND user_id = ?`, [id, userId])
    await addToSyncQueue('DELETE', 'employee_loans', id, { id })
  },

  async createLoanPayment(input: EmployeeLoanPaymentInsert): Promise<EmployeeLoanPayment> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    await run(
      `INSERT INTO employee_loan_payments (id, user_id, loan_id, payroll_id, payment_date, amount, notes, created_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, userId, input.loan_id, input.payroll_id || null, input.payment_date,
       input.amount, input.notes || null, now, now]
    )

    // Update remaining_amount kasbon
    await run(
      `UPDATE employee_loans SET remaining_amount = remaining_amount - ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
       WHERE id = ? AND user_id = ?`,
      [input.amount, now, now, input.loan_id, userId]
    )

    // Update status jadi 'paid' kalau sisa <= 0
    await run(
      `UPDATE employee_loans SET status = 'paid' WHERE id = ? AND user_id = ? AND remaining_amount <= 0`,
      [input.loan_id, userId]
    )

    const payment = await queryOne<any>(
      `SELECT * FROM employee_loan_payments WHERE id = ? AND user_id = ?`,
      [id, userId]
    )

    await addToSyncQueue('INSERT', 'employee_loan_payments', id, payment || { id })
    await addToSyncQueue('UPDATE', 'employee_loans', input.loan_id, { id: input.loan_id })

    return this.mapEmployeeLoanPayment(payment!)
  },

  // ============================================================
  // Sync helpers
  // ============================================================

  async replaceAllEmployees(records: Employee[]): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM employees WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO employees (id, user_id, employee_code, name, gender, birth_place, birth_date,
          phone, email, address, identity_type, identity_number, position,
          join_date, resign_date, status, salary_type, base_salary, bank_name, bank_account_number,
          bank_account_name, npwp, notes, is_active, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.employee_code, r.name, r.gender || null, r.birth_place || null, r.birth_date || null,
         r.phone || null, r.email || null, r.address || null, 'KTP', r.identity_number || null,
         r.position || null, r.join_date || null, r.resign_date || null,
         r.status, r.salary_type, r.base_salary, r.bank_name || null, r.bank_account_number || null,
         r.bank_account_name || null, r.npwp || null, r.notes || null, r.is_active ? 1 : 0,
         r.created_at, r.updated_at, r.updated_at || now]
      )
    }
  },

  async replaceAllAttendance(records: Attendance[]): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM attendance WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO attendance (id, user_id, employee_id, attendance_date, check_in, check_out, status, notes, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.employee_id, r.attendance_date, r.check_in || null, r.check_out || null,
         r.status, r.notes || null, r.created_at, r.updated_at, r.updated_at || now]
      )
    }
  },

  async replaceAllEmployeeLoans(records: Array<EmployeeLoan & { payments?: EmployeeLoanPayment[] }>): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM employee_loan_payments WHERE loan_id IN (SELECT id FROM employee_loans WHERE user_id = ?)', [userId])
    await run('DELETE FROM employee_loans WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO employee_loans (id, user_id, employee_id, loan_date, amount, remaining_amount, description, status, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.employee_id, r.loan_date, r.amount, r.remaining_amount,
         r.description || null, r.status, r.created_at, r.updated_at, r.updated_at || now]
      )
      for (const payment of r.payments || []) {
        await run(
          `INSERT OR REPLACE INTO employee_loan_payments (id, user_id, loan_id, payroll_id, payment_date, amount, notes, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [payment.id, userId, r.id, payment.payroll_id || null, payment.payment_date,
           payment.amount, payment.notes || null, payment.created_at, payment.created_at || now]
        )
      }
    }
  },

  async replaceAllPayrolls(records: Payroll[]): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM payrolls WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO payrolls (id, user_id, employee_id, period_code, period_start, period_end,
          base_salary, incentive_amount, kasbon_deduction, total_net, status, journal_entry_id, paid_at,
          notes, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.employee_id, r.period_code, r.period_start, r.period_end,
         r.base_salary, r.incentive_amount, r.kasbon_deduction, r.total_net, r.status,
         r.journal_entry_id || null, r.paid_at || null, r.notes || null,
         r.created_at, r.updated_at, r.updated_at || now]
      )
    }
  },

  // ============================================================
  // Internal helpers — map DB rows ke typed objects
  // ============================================================

  mapEmployee(r: any): Employee {
    return {
      id: r.id,
      user_id: r.user_id,
      employee_code: r.employee_code,
      name: r.name,
      gender: r.gender ?? undefined,
      birth_place: r.birth_place ?? undefined,
      birth_date: r.birth_date ?? undefined,
      phone: r.phone ?? undefined,
      email: r.email ?? undefined,
      address: r.address ?? undefined,
      identity_type: r.identity_type ?? undefined,
      identity_number: r.identity_number ?? undefined,
      position: r.position ?? undefined,
      join_date: r.join_date ?? undefined,
      resign_date: r.resign_date ?? undefined,
      status: r.status,
      salary_type: r.salary_type,
      base_salary: r.base_salary,
      bank_name: r.bank_name ?? undefined,
      bank_account_number: r.bank_account_number ?? undefined,
      bank_account_name: r.bank_account_name ?? undefined,
      npwp: r.npwp ?? undefined,
      notes: r.notes ?? undefined,
      is_active: !!r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapAttendance(r: any): Attendance {
    return {
      id: r.id,
      user_id: r.user_id,
      employee_id: r.employee_id,
      attendance_date: r.attendance_date,
      check_in: r.check_in ?? undefined,
      check_out: r.check_out ?? undefined,
      status: r.status,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapPayroll(r: any): Payroll {
    return {
      id: r.id,
      user_id: r.user_id,
      employee_id: r.employee_id,
      period_code: r.period_code,
      period_start: r.period_start,
      period_end: r.period_end,
      base_salary: r.base_salary,
      incentive_amount: r.incentive_amount,
      kasbon_deduction: r.kasbon_deduction,
      total_net: r.total_net,
      incentive_details: r.incentive_details ? JSON.parse(r.incentive_details) : undefined,
      status: r.status,
      journal_entry_id: r.journal_entry_id ?? undefined,
      paid_at: r.paid_at ?? undefined,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  /** Baris hasil JOIN payrolls × employees (dipakai fetchPayrolls/getPayroll). */
  mapPayrollWithEmployee(r: any): Payroll {
    const payroll = this.mapPayroll(r)
    if (r.employee_name) {
      payroll.employee = {
        name: r.employee_name,
        employee_code: r.employee_code,
        position: r.position ?? undefined,
      } as any
    }
    return payroll
  },

  mapEmployeeLoan(r: any): EmployeeLoan {
    return {
      id: r.id,
      user_id: r.user_id,
      employee_id: r.employee_id,
      loan_date: r.loan_date,
      amount: r.amount,
      remaining_amount: r.remaining_amount,
      description: r.description ?? undefined,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapEmployeeLoanPayment(r: any): EmployeeLoanPayment {
    return {
      id: r.id,
      loan_id: r.loan_id,
      payroll_id: r.payroll_id ?? undefined,
      payment_date: r.payment_date,
      amount: r.amount,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
    }
  },
}