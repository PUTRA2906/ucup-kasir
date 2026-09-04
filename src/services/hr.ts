import { supabase } from '@/lib/supabase'
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
// Service: HR & Payroll (Supabase)
// - Master: Departemen, Jabatan, Karyawan
// - Absensi
// - Komponen Payroll
// - Payroll Period & Slip Gaji (via RPC generate_payroll / post_payroll_journal)
// ============================================================

export const hrService = {
  // ============================================================
  // DEPARTMENTS
  // ============================================================

  async fetchDepartments(): Promise<Department[]> {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name')
    if (error) throw error
    return (data || []) as Department[]
  },

  async getDepartment(id: string): Promise<Department | null> {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Department
  },

  async createDepartment(input: DepartmentInsert): Promise<Department> {
    const { data, error } = await supabase
      .from('departments')
      .insert({ ...input, is_active: input.is_active !== false })
      .select()
      .single()
    if (error) throw error
    return data as Department
  },

  async updateDepartment(id: string, updates: DepartmentUpdate): Promise<Department> {
    const { data, error } = await supabase
      .from('departments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Department
  },

  async deleteDepartment(id: string): Promise<void> {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ============================================================
  // POSITIONS
  // ============================================================

  async fetchPositions(): Promise<Position[]> {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .order('name')
    if (error) throw error
    return (data || []) as Position[]
  },

  async fetchPositionsWithDepartment(): Promise<Position[]> {
    const { data, error } = await supabase
      .from('positions')
      .select('*, department:departments(name)')
      .order('name')
    if (error) throw error
    return (data || []) as Position[]
  },

  async getPosition(id: string): Promise<Position | null> {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Position
  },

  async createPosition(input: PositionInsert): Promise<Position> {
    const { data, error } = await supabase
      .from('positions')
      .insert({ ...input, is_active: input.is_active !== false })
      .select()
      .single()
    if (error) throw error
    return data as Position
  },

  async updatePosition(id: string, updates: PositionUpdate): Promise<Position> {
    const { data, error } = await supabase
      .from('positions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Position
  },

  async deletePosition(id: string): Promise<void> {
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ============================================================
  // EMPLOYEES
  // ============================================================

  async fetchEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*, department:departments(name), position:positions(name)')
      .order('name')
    if (error) throw error
    return (data || []) as Employee[]
  },

  async getEmployee(id: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*, department:departments(name), position:positions(name)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Employee
  },

  async createEmployee(input: EmployeeInsert): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as Employee
  },

  async updateEmployee(id: string, updates: EmployeeUpdate): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, department:departments(name), position:positions(name)')
      .single()
    if (error) throw error
    return data as Employee
  },

  async deleteEmployee(id: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  /** Karyawan dengan statistik absensi */
  async fetchEmployeesWithStats(): Promise<EmployeeWithStats[]> {
    const employees = await this.fetchEmployees()
    const currentMonth = new Date().toISOString().slice(0, 7)

    const { data: attRows, error: attErr } = await supabase
      .from('attendance')
      .select('employee_id, status')
      .gte('attendance_date', currentMonth + '-01')
    if (attErr) throw attErr

    const totalByEmp = new Map<string, number>()
    const absenceByEmp = new Map<string, number>()
    for (const r of (attRows || [])) {
      const eId = r.employee_id as string
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
    let query = supabase
      .from('attendance')
      .select('*, employee:employees(name, employee_code)')
      .order('attendance_date', { ascending: false })

    if (startDate) query = query.gte('attendance_date', startDate)
    if (endDate) query = query.lte('attendance_date', endDate)

    const { data, error } = await query
    if (error) throw error
    return (data || []) as Attendance[]
  },

  async getAttendance(id: string): Promise<Attendance | null> {
    const { data, error } = await supabase
      .from('attendance')
      .select('*, employee:employees(name, employee_code)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Attendance
  },

  async createAttendance(input: AttendanceInsert): Promise<Attendance> {
    const { data, error } = await supabase
      .from('attendance')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as Attendance
  },

  async updateAttendance(id: string, updates: AttendanceUpdate): Promise<Attendance> {
    const { data, error } = await supabase
      .from('attendance')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Attendance
  },

  async deleteAttendance(id: string): Promise<void> {
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id)
    if (error) throw error
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
    const { data, error } = await supabase
      .from('payroll_components')
      .select('*')
      .order('type')
      .order('name')
    if (error) throw error
    return (data || []) as PayrollComponent[]
  },

  async createPayrollComponent(input: PayrollComponentInsert): Promise<PayrollComponent> {
    const { data, error } = await supabase
      .from('payroll_components')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as PayrollComponent
  },

  async updatePayrollComponent(id: string, updates: PayrollComponentUpdate): Promise<PayrollComponent> {
    const { data, error } = await supabase
      .from('payroll_components')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as PayrollComponent
  },

  async deletePayrollComponent(id: string): Promise<void> {
    const { error } = await supabase
      .from('payroll_components')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ============================================================
  // PAYROLL PERIODS & PAYROLLS
  // ============================================================

  async fetchPayrollPeriods(): Promise<PayrollPeriod[]> {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
    if (error) throw error
    return (data || []) as PayrollPeriod[]
  },

  async getPayrollPeriod(id: string): Promise<PayrollPeriod | null> {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as PayrollPeriod
  },

  async createPayrollPeriod(input: PayrollPeriodInsert): Promise<PayrollPeriod> {
    const { data, error } = await supabase
      .from('payroll_periods')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as PayrollPeriod
  },

  async updatePayrollPeriod(id: string, updates: PayrollPeriodUpdate): Promise<PayrollPeriod> {
    const { data, error } = await supabase
      .from('payroll_periods')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as PayrollPeriod
  },

  async deletePayrollPeriod(id: string): Promise<void> {
    const { error } = await supabase
      .from('payroll_periods')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  /** Payroll (slip gaji) per periode */
  async fetchPayrolls(periodId: string): Promise<Payroll[]> {
    const { data, error } = await supabase
      .from('payrolls')
      .select('*, items:payroll_items(*), employee:employees(name, employee_code, department_id, position_id, bank_name, bank_account_number, bank_account_name)')
      .eq('period_id', periodId)
      .order('created_at')
    if (error) throw error
    return (data || []) as Payroll[]
  },

  async getPayroll(id: string): Promise<Payroll | null> {
    const { data, error } = await supabase
      .from('payrolls')
      .select('*, items:payroll_items(*), employee:employees(name, employee_code, department_id, position_id, bank_name, bank_account_number, bank_account_name)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Payroll
  },

  /** Generate payroll via RPC */
  async generatePayroll(periodId: string): Promise<Payroll[]> {
    const { data, error } = await supabase.rpc('generate_payroll', {
      p_period_id: periodId,
    })
    if (error) throw error
    return (data || []) as Payroll[]
  },

  /** Post payroll journal via RPC (auto-jurnal ke finance) */
  async postPayrollJournal(periodId: string): Promise<string> {
    const { data, error } = await supabase.rpc('post_payroll_journal', {
      p_period_id: periodId,
    })
    if (error) throw error
    return data as string
  },

  /** Summary payroll untuk dashboard */
  async getPayrollSummary(): Promise<PayrollSummary[]> {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('id, period_code, total_employee, total_gross, total_deduction, total_net')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(12)
    if (error) throw error
    return (data || []).map((r) => ({
      period_id: r.id,
      period_code: r.period_code,
      employee_count: Number(r.total_employee) || 0,
      total_gross: Number(r.total_gross) || 0,
      total_deduction: Number(r.total_deduction) || 0,
      total_net: Number(r.total_net) || 0,
    }))
  },
}