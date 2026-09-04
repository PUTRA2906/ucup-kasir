import { query, queryOne, run, addToSyncQueue, transaction } from './db'
import { getCurrentUserId, uuid, nowIso } from './db'
import type {
  Department,
  DepartmentInsert,
  DepartmentUpdate,
  Position,
  PositionInsert,
  PositionUpdate,
  Employee,
  EmployeeInsert,
  EmployeeUpdate,
  EmployeeWithStats,
  Attendance,
  AttendanceInsert,
  AttendanceUpdate,
  PayrollComponent,
  PayrollComponentInsert,
  PayrollComponentUpdate,
  PayrollPeriod,
  PayrollPeriodInsert,
  PayrollPeriodUpdate,
  Payroll,
  PayrollInsert,
  PayrollItem,
  PayrollSummary,
} from '@/types/database'

// ============================================================
// SQLite Service: HR & Payroll
// Mirror dari src/services/hr.ts
// Semua fungsi replikasi dari Supabase + RPC:
//   - generate_payroll
//   - post_payroll_journal
// ============================================================

export const sqliteHrService = {
  // ============================================================
  // DEPARTMENTS
  // ============================================================

  async fetchDepartments(): Promise<Department[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM departments WHERE user_id = ? ORDER BY name`,
      [userId]
    )
    return rows.map(this.mapDepartment)
  },

  async getDepartment(id: string): Promise<Department | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM departments WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    return row ? this.mapDepartment(row) : null
  },

  async createDepartment(input: DepartmentInsert): Promise<Department> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    await run(
      `INSERT INTO departments (id, user_id, name, description, is_active, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, userId, input.name, input.description || null,
       input.is_active !== false ? 1 : 0, now, now, now]
    )

    const dept = await this.getDepartment(id)
    await addToSyncQueue('INSERT', 'departments', id, dept || { id })
    return dept!
  },

  async updateDepartment(id: string, updates: DepartmentUpdate): Promise<Department> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description) }
    if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active ? 1 : 0) }

    fields.push('updated_at = ?', 'sync_status = ?', 'updated_at_local = ?')
    values.push(now, 'pending', now, id, userId)

    await run(
      `UPDATE departments SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    )

    const dept = await this.getDepartment(id)
    await addToSyncQueue('UPDATE', 'departments', id, dept || { id })
    return dept!
  },

  async deleteDepartment(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await run(`DELETE FROM departments WHERE id = ? AND user_id = ?`, [id, userId])
    await addToSyncQueue('DELETE', 'departments', id, { id })
  },

  // ============================================================
  // POSITIONS
  // ============================================================

  async fetchPositions(): Promise<Position[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM positions WHERE user_id = ? ORDER BY name`,
      [userId]
    )
    return rows.map(this.mapPosition)
  },

  async fetchPositionsWithDepartment(): Promise<Position[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT p.*, d.name as department_name
       FROM positions p
       LEFT JOIN departments d ON d.id = p.department_id
       WHERE p.user_id = ? ORDER BY p.name`,
      [userId]
    )
    return rows.map((r: any) => ({
      ...this.mapPosition(r),
      department: r.department_name ? { name: r.department_name } as any : undefined,
    }))
  },

  async getPosition(id: string): Promise<Position | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM positions WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    return row ? this.mapPosition(row) : null
  },

  async createPosition(input: PositionInsert): Promise<Position> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    await run(
      `INSERT INTO positions (id, user_id, department_id, name, base_salary, is_active, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, userId, input.department_id || null, input.name,
       input.base_salary || 0, input.is_active !== false ? 1 : 0, now, now, now]
    )

    const pos = await this.getPosition(id)
    await addToSyncQueue('INSERT', 'positions', id, pos || { id })
    return pos!
  },

  async updatePosition(id: string, updates: PositionUpdate): Promise<Position> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
    if (updates.department_id !== undefined) { fields.push('department_id = ?'); values.push(updates.department_id || null) }
    if (updates.base_salary !== undefined) { fields.push('base_salary = ?'); values.push(updates.base_salary) }
    if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active ? 1 : 0) }

    fields.push('updated_at = ?', 'sync_status = ?', 'updated_at_local = ?')
    values.push(now, 'pending', now, id, userId)

    await run(
      `UPDATE positions SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    )

    const pos = await this.getPosition(id)
    await addToSyncQueue('UPDATE', 'positions', id, pos || { id })
    return pos!
  },

  async deletePosition(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await run(`DELETE FROM positions WHERE id = ? AND user_id = ?`, [id, userId])
    await addToSyncQueue('DELETE', 'positions', id, { id })
  },

  // ============================================================
  // EMPLOYEES
  // ============================================================

  async fetchEmployees(): Promise<Employee[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT e.*, d.name as department_name, p.name as position_name
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN positions p ON p.id = e.position_id
       WHERE e.user_id = ? ORDER BY e.name`,
      [userId]
    )
    return rows.map((r: any) => ({
      ...this.mapEmployee(r),
      department: r.department_name ? { name: r.department_name } as any : undefined,
      position: r.position_name ? { name: r.position_name } as any : undefined,
    }))
  },

  async getEmployee(id: string): Promise<Employee | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT e.*, d.name as department_name, p.name as position_name
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN positions p ON p.id = e.position_id
       WHERE e.id = ? AND e.user_id = ?`,
      [id, userId]
    )
    if (!row) return null
    return {
      ...this.mapEmployee(row),
      department: row.department_name ? { name: row.department_name } as any : undefined,
      position: row.position_name ? { name: row.position_name } as any : undefined,
    }
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
        phone, email, address, identity_type, identity_number, department_id, position_id,
        join_date, resign_date, status, salary_type, base_salary, bank_name, bank_account_number,
        bank_account_name, npwp, notes, is_active, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, userId, code, input.name, input.gender || null, input.birth_place || null, input.birth_date || null,
       input.phone || null, input.email || null, input.address || null, input.identity_type || null,
       input.identity_number || null, input.department_id || null, input.position_id || null,
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
      'identity_type', 'identity_number', 'department_id', 'position_id', 'join_date',
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
  // PAYROLL COMPONENTS
  // ============================================================

  async fetchPayrollComponents(): Promise<PayrollComponent[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM payroll_components WHERE user_id = ? ORDER BY type, name`,
      [userId]
    )
    return rows.map(this.mapPayrollComponent)
  },

  async createPayrollComponent(input: PayrollComponentInsert): Promise<PayrollComponent> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    await run(
      `INSERT INTO payroll_components (id, user_id, name, type, amount, is_percentage, apply_to, position_id, employee_id, is_active, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, userId, input.name, input.type, input.amount || 0,
       input.is_percentage ? 1 : 0, input.apply_to || 'semua',
       input.position_id || null, input.employee_id || null,
       input.is_active !== false ? 1 : 0, now, now, now]
    )

    const comp = await this.getPayrollComponent(id)
    await addToSyncQueue('INSERT', 'payroll_components', id, comp || { id })
    return comp!
  },

  async getPayrollComponent(id: string): Promise<PayrollComponent | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM payroll_components WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    return row ? this.mapPayrollComponent(row) : null
  },

  async updatePayrollComponent(id: string, updates: PayrollComponentUpdate): Promise<PayrollComponent> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const fields: string[] = []
    const values: any[] = []

    const updatable = ['name', 'type', 'amount', 'is_percentage', 'apply_to', 'position_id', 'employee_id', 'is_active'] as const
    for (const key of updatable) {
      if ((updates as any)[key] !== undefined) {
        const val = (updates as any)[key]
        if (key === 'is_percentage' || key === 'is_active') {
          fields.push(`${key} = ?`)
          values.push(val ? 1 : 0)
        } else {
          fields.push(`${key} = ?`)
          values.push(val)
        }
      }
    }

    fields.push('updated_at = ?', 'sync_status = ?', 'updated_at_local = ?')
    values.push(now, 'pending', now, id, userId)

    await run(
      `UPDATE payroll_components SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    )

    const comp = await this.getPayrollComponent(id)
    await addToSyncQueue('UPDATE', 'payroll_components', id, comp || { id })
    return comp!
  },

  async deletePayrollComponent(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await run(`DELETE FROM payroll_components WHERE id = ? AND user_id = ?`, [id, userId])
    await addToSyncQueue('DELETE', 'payroll_components', id, { id })
  },

  // ============================================================
  // PAYROLL PERIODS
  // ============================================================

  async fetchPayrollPeriods(): Promise<PayrollPeriod[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM payroll_periods WHERE user_id = ? ORDER BY period_year DESC, period_month DESC`,
      [userId]
    )
    return rows.map(this.mapPayrollPeriod)
  },

  async getPayrollPeriod(id: string): Promise<PayrollPeriod | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM payroll_periods WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    return row ? this.mapPayrollPeriod(row) : null
  },

  async createPayrollPeriod(input: PayrollPeriodInsert): Promise<PayrollPeriod> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    await run(
      `INSERT INTO payroll_periods (id, user_id, period_code, period_month, period_year, start_date, end_date, status, total_employee, total_gross, total_deduction, total_net, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 0, 0, 0, 0, ?, ?, 'pending', ?)`,
      [id, userId, input.period_code, input.period_month, input.period_year,
       input.start_date, input.end_date, now, now, now]
    )

    const period = await this.getPayrollPeriod(id)
    await addToSyncQueue('INSERT', 'payroll_periods', id, period || { id })
    return period!
  },

  async updatePayrollPeriod(id: string, updates: PayrollPeriodUpdate): Promise<PayrollPeriod> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const fields: string[] = []
    const values: any[] = []

    const updatable = ['period_code', 'period_month', 'period_year', 'start_date', 'end_date', 'status'] as const
    for (const key of updatable) {
      if ((updates as any)[key] !== undefined) {
        fields.push(`${key} = ?`)
        values.push((updates as any)[key])
      }
    }

    fields.push('updated_at = ?', 'sync_status = ?', 'updated_at_local = ?')
    values.push(now, 'pending', now, id, userId)

    await run(
      `UPDATE payroll_periods SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    )

    const period = await this.getPayrollPeriod(id)
    await addToSyncQueue('UPDATE', 'payroll_periods', id, period || { id })
    return period!
  },

  async deletePayrollPeriod(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await run(`DELETE FROM payroll_items WHERE payroll_id IN (SELECT id FROM payrolls WHERE period_id = ? AND user_id = ?)`, [id, userId])
    await run(`DELETE FROM payrolls WHERE period_id = ? AND user_id = ?`, [id, userId])
    await run(`DELETE FROM payroll_periods WHERE id = ? AND user_id = ?`, [id, userId])
    await addToSyncQueue('DELETE', 'payroll_periods', id, { id })
  },

  // ============================================================
  // PAYROLLS (Slip Gaji)
  // ============================================================

  async fetchPayrolls(periodId: string): Promise<Payroll[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT p.*, e.name as employee_name, e.employee_code, e.department_id, e.position_id,
              e.bank_name, e.bank_account_number, e.bank_account_name
       FROM payrolls p
       LEFT JOIN employees e ON e.id = p.employee_id
       WHERE p.period_id = ? AND p.user_id = ?
       ORDER BY p.created_at`,
      [periodId, userId]
    )

    const result: Payroll[] = []
    for (const r of rows) {
      const items = await query<any>(
        `SELECT * FROM payroll_items WHERE payroll_id = ? AND user_id = ? ORDER BY created_at`,
        [r.id, userId]
      )
      result.push({
        ...this.mapPayroll(r),
        items: items.map(this.mapPayrollItem),
        employee: r.employee_name ? {
          name: r.employee_name,
          employee_code: r.employee_code,
          bank_name: r.bank_name,
          bank_account_number: r.bank_account_number,
          bank_account_name: r.bank_account_name,
        } as any : undefined,
      })
    }

    return result
  },

  async getPayroll(id: string): Promise<Payroll | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT p.*, e.name as employee_name, e.employee_code, e.department_id, e.position_id,
              e.bank_name, e.bank_account_number, e.bank_account_name
       FROM payrolls p
       LEFT JOIN employees e ON e.id = p.employee_id
       WHERE p.id = ? AND p.user_id = ?`,
      [id, userId]
    )
    if (!row) return null

    const items = await query<any>(
      `SELECT * FROM payroll_items WHERE payroll_id = ? AND user_id = ? ORDER BY created_at`,
      [id, userId]
    )

    return {
      ...this.mapPayroll(row),
      items: items.map(this.mapPayrollItem),
      employee: row.employee_name ? {
        name: row.employee_name,
        employee_code: row.employee_code,
        bank_name: row.bank_name,
        bank_account_number: row.bank_account_number,
        bank_account_name: row.bank_account_name,
      } as any : undefined,
    }
  },

  /**
   * Generate payroll untuk semua karyawan aktif dalam periode tertentu.
   * Replikasi dari fungsi RPC generate_payroll.
   */
  async generatePayroll(periodId: string): Promise<Payroll[]> {
    const userId = getCurrentUserId()
    const now = nowIso()

    // Validasi period
    const period = await this.getPayrollPeriod(periodId)
    if (!period) throw new Error('Periode payroll tidak ditemukan')
    if (period.status === 'paid') throw new Error('Periode payroll sudah dibayar, tidak bisa digenerate ulang')

    // Hitung hari kerja (Senin-Jumat) dalam periode
    const start = new Date(period.start_date)
    const end = new Date(period.end_date)
    let workingDays = 0
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay()
      if (day >= 1 && day <= 5) workingDays++
    }

    // Hapus payroll lama untuk periode ini (regenerate)
    await run(
      `DELETE FROM payroll_items WHERE payroll_id IN (SELECT id FROM payrolls WHERE period_id = ? AND user_id = ?)`,
      [periodId, userId]
    )
    await run(
      `DELETE FROM payrolls WHERE period_id = ? AND user_id = ?`,
      [periodId, userId]
    )

    // Ambil semua karyawan aktif
    const employees = await query<any>(
      `SELECT e.*, p.base_salary as position_salary
       FROM employees e
       LEFT JOIN positions p ON p.id = e.position_id
       WHERE e.user_id = ? AND e.is_active = 1 AND e.status = 'aktif'`,
      [userId]
    )

    // Ambil semua komponen payroll aktif
    const components = await query<any>(
      `SELECT * FROM payroll_components WHERE user_id = ? AND is_active = 1`,
      [userId]
    )

    // Hitung absensi per karyawan
    const attRows = await query<any>(
      `SELECT employee_id, status FROM attendance
       WHERE user_id = ? AND attendance_date >= ? AND attendance_date <= ?`,
      [userId, period.start_date, period.end_date]
    )
    const attByEmp = new Map<string, string[]>()
    for (const a of attRows) {
      const list = attByEmp.get(a.employee_id) || []
      list.push(a.status)
      attByEmp.set(a.employee_id, list)
    }

    const createdPayrolls: Payroll[] = []

    for (const emp of employees) {
      const payrollId = uuid()
      const grossSalary = emp.base_salary && emp.base_salary > 0 ? emp.base_salary : (emp.position_salary || 0)
      let totalAllowance = 0
      let totalDeduction = 0
      const items: PayrollItem[] = []

      // Hitung komponen
      for (const comp of components) {
        // Cek apakah komponen berlaku untuk karyawan ini
        if (comp.apply_to === 'per_jabatan' && comp.position_id !== emp.position_id) continue
        if (comp.apply_to === 'per_karyawan' && comp.employee_id !== emp.id) continue

        const isPercentage = !!comp.is_percentage
        const amount = isPercentage ? Math.round(grossSalary * comp.amount / 100 * 100) / 100 : comp.amount

        if (amount <= 0) continue

        const itemId = uuid()
        await run(
          `INSERT INTO payroll_items (id, user_id, payroll_id, component_id, component_name, component_type, amount, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [itemId, userId, payrollId, comp.id, comp.name, comp.type, amount, now, now]
        )

        items.push({
          id: itemId,
          user_id: userId,
          payroll_id: payrollId,
          component_id: comp.id,
          component_name: comp.name,
          component_type: comp.type,
          amount,
          created_at: now,
        })

        if (comp.type === 'tunjangan') totalAllowance += amount
        else totalDeduction += amount
      }

      const totalGross = grossSalary + totalAllowance
      const totalNet = Math.max(0, totalGross - totalDeduction)

      // Simpan payroll
      await run(
        `INSERT INTO payrolls (id, user_id, period_id, employee_id, base_salary, total_allowance, total_deduction, total_gross, total_net, status, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, 'pending', ?)`,
        [payrollId, userId, periodId, emp.id, grossSalary, totalAllowance, totalDeduction, totalGross, totalNet, now, now, now]
      )

      createdPayrolls.push({
        id: payrollId,
        user_id: userId,
        period_id: periodId,
        employee_id: emp.id,
        base_salary: grossSalary,
        total_allowance: totalAllowance,
        total_deduction: totalDeduction,
        total_gross: totalGross,
        total_net: totalNet,
        status: 'draft',
        created_at: now,
        updated_at: now,
        items,
        employee: { name: emp.name, employee_code: emp.employee_code } as any,
      })
    }

    // Update summary periode
    const totalGross = createdPayrolls.reduce((s, p) => s + p.total_gross, 0)
    const totalDeduction = createdPayrolls.reduce((s, p) => s + p.total_deduction, 0)
    const totalNet = createdPayrolls.reduce((s, p) => s + p.total_net, 0)

    await run(
      `UPDATE payroll_periods SET status = 'generated', total_employee = ?, total_gross = ?, total_deduction = ?, total_net = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
       WHERE id = ? AND user_id = ?`,
      [createdPayrolls.length, totalGross, totalDeduction, totalNet, now, now, periodId, userId]
    )

    await addToSyncQueue('UPDATE', 'payroll_periods', periodId, { id: periodId, status: 'generated' })

    return createdPayrolls
  },

  /**
   * Post payroll journal ke finance (auto-jurnal).
   * Replikasi dari fungsi RPC post_payroll_journal.
   * Debit: Beban Gaji (5-5200), Kredit: Utang Usaha (2-2000)
   */
  async postPayrollJournal(periodId: string): Promise<string> {
    const userId = getCurrentUserId()
    const now = nowIso()

    const period = await this.getPayrollPeriod(periodId)
    if (!period) throw new Error('Periode payroll tidak ditemukan')
    if (period.status !== 'generated') throw new Error('Periode payroll harus dalam status generated sebelum posting jurnal')

    // Cari akun
    const bebanGaji = await queryOne<any>(
      `SELECT id, code, name FROM chart_of_accounts WHERE user_id = ? AND code = '5-5200' AND is_active = 1`,
      [userId]
    )
    if (!bebanGaji) throw new Error('Akun Beban Gaji (5-5200) belum tersedia')

    const utangGaji = await queryOne<any>(
      `SELECT id, code, name FROM chart_of_accounts WHERE user_id = ? AND code = '2-2000' AND is_active = 1`,
      [userId]
    )

    const journalId = uuid()
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const journalNumber = `JRN-${date}-${suffix}`

    // Buat jurnal dalam transaksi
    await transaction(async (tx) => {
      await tx.run(
        `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, 'payroll', ?, 'posted', ?, ?, 'pending', ?)`,
        [journalId, userId, journalNumber, now, `Beban Gaji ${period.period_code}`, periodId, now, now, now]
      )

      // Debit: Beban Gaji
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, bebanGaji.id, '5-5200', 'Beban Gaji', period.total_gross, now, now]
      )

      // Kredit: Utang Gaji (jika ada akun)
      if (utangGaji && period.total_net > 0) {
        await tx.run(
          `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending', ?)`,
          [uuid(), userId, journalId, utangGaji.id, '2-2000', 'Utang Usaha', period.total_net, now, now]
        )
      }
    })

    // Update status periode & payroll
    await run(
      `UPDATE payroll_periods SET status = 'paid', paid_at = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
       WHERE id = ? AND user_id = ?`,
      [now, now, now, periodId, userId]
    )

    await run(
      `UPDATE payrolls SET status = 'paid', updated_at = ?, sync_status = 'pending', updated_at_local = ?
       WHERE period_id = ? AND user_id = ?`,
      [now, now, periodId, userId]
    )

    await addToSyncQueue('UPDATE', 'payroll_periods', periodId, { id: periodId, status: 'paid', paid_at: now })

    return journalId
  },

  /** Summary payroll untuk dashboard */
  async getPayrollSummary(): Promise<PayrollSummary[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT id, period_code, total_employee, total_gross, total_deduction, total_net
       FROM payroll_periods WHERE user_id = ?
       ORDER BY period_year DESC, period_month DESC LIMIT 12`,
      [userId]
    )
    return rows.map((r: any) => ({
      period_id: r.id,
      period_code: r.period_code,
      employee_count: r.total_employee,
      total_gross: r.total_gross,
      total_deduction: r.total_deduction,
      total_net: r.total_net,
    }))
  },

  // ============================================================
  // Sync helpers
  // ============================================================

  async replaceAllDepartments(records: Department[]): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM departments WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO departments (id, user_id, name, description, is_active, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.name, r.description || null, r.is_active ? 1 : 0, r.created_at, r.updated_at, r.updated_at || now]
      )
    }
  },

  async replaceAllPositions(records: Position[]): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM positions WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO positions (id, user_id, department_id, name, base_salary, is_active, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.department_id || null, r.name, r.base_salary, r.is_active ? 1 : 0, r.created_at, r.updated_at, r.updated_at || now]
      )
    }
  },

  async replaceAllEmployees(records: Employee[]): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM employees WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO employees (id, user_id, employee_code, name, gender, birth_place, birth_date,
          phone, email, address, identity_type, identity_number, department_id, position_id,
          join_date, resign_date, status, salary_type, base_salary, bank_name, bank_account_number,
          bank_account_name, npwp, notes, is_active, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.employee_code, r.name, r.gender || null, r.birth_place || null, r.birth_date || null,
         r.phone || null, r.email || null, r.address || null, 'KTP', r.identity_number || null,
         r.department_id || null, r.position_id || null, r.join_date || null, r.resign_date || null,
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

  async replaceAllPayrollComponents(records: PayrollComponent[]): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM payroll_components WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO payroll_components (id, user_id, name, type, amount, is_percentage, apply_to, position_id, employee_id, is_active, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.name, r.type, r.amount, r.is_percentage ? 1 : 0, r.apply_to,
         r.position_id || null, r.employee_id || null, r.is_active ? 1 : 0, r.created_at, r.updated_at, r.updated_at || now]
      )
    }
  },

  async replaceAllPayrollPeriods(periods: PayrollPeriod[]): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM payroll_periods WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const r of periods) {
      await run(
        `INSERT OR REPLACE INTO payroll_periods (id, user_id, period_code, period_month, period_year, start_date, end_date, status, total_employee, total_gross, total_deduction, total_net, paid_at, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.period_code, r.period_month, r.period_year, r.start_date, r.end_date,
         r.status, r.total_employee, r.total_gross, r.total_deduction, r.total_net, r.paid_at || null,
         r.created_at, r.updated_at, r.updated_at || now]
      )
    }
  },

  async replaceAllPayrolls(records: Array<Payroll & { items?: PayrollItem[] }>): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM payroll_items WHERE payroll_id IN (SELECT id FROM payrolls WHERE user_id = ?)', [userId])
    await run('DELETE FROM payrolls WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO payrolls (id, user_id, period_id, employee_id, base_salary, total_allowance, total_deduction, total_gross, total_net, status, notes, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.period_id, r.employee_id, r.base_salary, r.total_allowance, r.total_deduction,
         r.total_gross, r.total_net, r.status, r.notes || null, r.created_at, r.updated_at, r.updated_at || now]
      )
      for (const item of r.items || []) {
        await run(
          `INSERT OR REPLACE INTO payroll_items (id, user_id, payroll_id, component_id, component_name, component_type, amount, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [item.id, item.user_id || userId, r.id, item.component_id || null, item.component_name, item.component_type,
           item.amount, item.created_at, item.created_at || now]
        )
      }
    }
  },

  // ============================================================
  // Internal helpers — map DB rows ke typed objects
  // ============================================================

  mapDepartment(r: any): Department {
    return {
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      description: r.description ?? undefined,
      is_active: !!r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapPosition(r: any): Position {
    return {
      id: r.id,
      user_id: r.user_id,
      department_id: r.department_id ?? undefined,
      name: r.name,
      base_salary: r.base_salary,
      is_active: !!r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

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
      department_id: r.department_id ?? undefined,
      position_id: r.position_id ?? undefined,
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

  mapPayrollComponent(r: any): PayrollComponent {
    return {
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      type: r.type,
      amount: r.amount,
      is_percentage: !!r.is_percentage,
      apply_to: r.apply_to,
      position_id: r.position_id ?? undefined,
      employee_id: r.employee_id ?? undefined,
      is_active: !!r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapPayrollPeriod(r: any): PayrollPeriod {
    return {
      id: r.id,
      user_id: r.user_id,
      period_code: r.period_code,
      period_month: r.period_month,
      period_year: r.period_year,
      start_date: r.start_date,
      end_date: r.end_date,
      status: r.status,
      total_employee: r.total_employee,
      total_gross: r.total_gross,
      total_deduction: r.total_deduction,
      total_net: r.total_net,
      paid_at: r.paid_at ?? undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapPayroll(r: any): Payroll {
    return {
      id: r.id,
      user_id: r.user_id,
      period_id: r.period_id,
      employee_id: r.employee_id,
      base_salary: r.base_salary,
      total_allowance: r.total_allowance,
      total_deduction: r.total_deduction,
      total_gross: r.total_gross,
      total_net: r.total_net,
      status: r.status,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapPayrollItem(r: any): PayrollItem {
    return {
      id: r.id,
      user_id: r.user_id,
      payroll_id: r.payroll_id,
      component_id: r.component_id ?? undefined,
      component_name: r.component_name,
      component_type: r.component_type,
      amount: r.amount,
      created_at: r.created_at,
    }
  },
}