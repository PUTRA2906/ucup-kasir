import { defineStore } from 'pinia'
import { ref } from 'vue'
import { hrServiceAdapter } from '@/services'
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
  PayrollSummary,
} from '@/types/database'

// ============================================================
// Store: HR & Payroll — Manajemen Karyawan
// - Master: Departemen, Jabatan, Karyawan
// - Absensi
// - Komponen Payroll
// - Periode Payroll & Slip Gaji
// ============================================================

export const useHrStore = defineStore('hr', () => {
  // ============================================================
  // State
  // ============================================================
  const departments = ref<Department[]>([])
  const positions = ref<Position[]>([])
  const employees = ref<Employee[]>([])
  const employeesWithStats = ref<EmployeeWithStats[]>([])
  const attendance = ref<Attendance[]>([])
  const payrollComponents = ref<PayrollComponent[]>([])
  const payrollPeriods = ref<PayrollPeriod[]>([])
  const payrolls = ref<Payroll[]>([])
  const payrollSummary = ref<PayrollSummary[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ============================================================
  // DEPARTMENTS
  // ============================================================

  async function fetchDepartments() {
    loading.value = true
    error.value = null
    try {
      departments.value = await hrServiceAdapter.fetchDepartments()
      return departments.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createDepartment(input: DepartmentInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await hrServiceAdapter.createDepartment(input)
      departments.value.push(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateDepartment(id: string, updates: DepartmentUpdate) {
    loading.value = true
    error.value = null
    const index = departments.value.findIndex((d) => d.id === id)
    const old = index !== -1 ? { ...departments.value[index] } : null
    try {
      const updated = await hrServiceAdapter.updateDepartment(id, updates)
      if (index !== -1) departments.value[index] = updated
      return updated
    } catch (e: any) {
      if (old && index !== -1) departments.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteDepartment(id: string) {
    loading.value = true
    error.value = null
    const index = departments.value.findIndex((d) => d.id === id)
    const old = index !== -1 ? { ...departments.value[index] } : null
    try {
      await hrServiceAdapter.deleteDepartment(id)
      departments.value = departments.value.filter((d) => d.id !== id)
    } catch (e: any) {
      if (old && index !== -1) departments.value.splice(index, 0, old)
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // POSITIONS
  // ============================================================

  async function fetchPositions() {
    loading.value = true
    error.value = null
    try {
      positions.value = await hrServiceAdapter.fetchPositionsWithDepartment()
      return positions.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createPosition(input: PositionInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await hrServiceAdapter.createPosition(input)
      positions.value.push(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updatePosition(id: string, updates: PositionUpdate) {
    loading.value = true
    error.value = null
    const index = positions.value.findIndex((p) => p.id === id)
    const old = index !== -1 ? { ...positions.value[index] } : null
    try {
      const updated = await hrServiceAdapter.updatePosition(id, updates)
      if (index !== -1) positions.value[index] = updated
      return updated
    } catch (e: any) {
      if (old && index !== -1) positions.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deletePosition(id: string) {
    loading.value = true
    error.value = null
    const index = positions.value.findIndex((p) => p.id === id)
    const old = index !== -1 ? { ...positions.value[index] } : null
    try {
      await hrServiceAdapter.deletePosition(id)
      positions.value = positions.value.filter((p) => p.id !== id)
    } catch (e: any) {
      if (old && index !== -1) positions.value.splice(index, 0, old)
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // EMPLOYEES
  // ============================================================

  async function fetchEmployees() {
    loading.value = true
    error.value = null
    try {
      employees.value = await hrServiceAdapter.fetchEmployees()
      return employees.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchEmployeesWithStats() {
    loading.value = true
    error.value = null
    try {
      employeesWithStats.value = await hrServiceAdapter.fetchEmployeesWithStats()
      return employeesWithStats.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getEmployee(id: string): Promise<Employee | null> {
    loading.value = true
    error.value = null
    try {
      return await hrServiceAdapter.getEmployee(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createEmployee(input: EmployeeInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await hrServiceAdapter.createEmployee(input)
      employees.value.push(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateEmployee(id: string, updates: EmployeeUpdate) {
    loading.value = true
    error.value = null
    const index = employees.value.findIndex((e) => e.id === id)
    const old = index !== -1 ? { ...employees.value[index] } : null
    try {
      const updated = await hrServiceAdapter.updateEmployee(id, updates)
      if (index !== -1) employees.value[index] = updated
      return updated
    } catch (e: any) {
      if (old && index !== -1) employees.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteEmployee(id: string) {
    loading.value = true
    error.value = null
    const index = employees.value.findIndex((e) => e.id === id)
    const old = index !== -1 ? { ...employees.value[index] } : null
    try {
      await hrServiceAdapter.deleteEmployee(id)
      employees.value = employees.value.filter((e) => e.id !== id)
      employeesWithStats.value = employeesWithStats.value.filter((e) => e.id !== id)
    } catch (e: any) {
      if (old && index !== -1) employees.value.splice(index, 0, old)
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // ATTENDANCE
  // ============================================================

  async function fetchAttendance(startDate?: string, endDate?: string) {
    loading.value = true
    error.value = null
    try {
      attendance.value = await hrServiceAdapter.fetchAttendance(startDate, endDate)
      return attendance.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createAttendance(input: AttendanceInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await hrServiceAdapter.createAttendance(input)
      attendance.value.unshift(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateAttendance(id: string, updates: AttendanceUpdate) {
    loading.value = true
    error.value = null
    const index = attendance.value.findIndex((a) => a.id === id)
    const old = index !== -1 ? { ...attendance.value[index] } : null
    try {
      const updated = await hrServiceAdapter.updateAttendance(id, updates)
      if (index !== -1) attendance.value[index] = updated
      return updated
    } catch (e: any) {
      if (old && index !== -1) attendance.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteAttendance(id: string) {
    loading.value = true
    error.value = null
    try {
      await hrServiceAdapter.deleteAttendance(id)
      attendance.value = attendance.value.filter((a) => a.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function bulkCreateAttendance(records: AttendanceInsert[]) {
    loading.value = true
    error.value = null
    try {
      const count = await hrServiceAdapter.bulkCreateAttendance(records)
      return count
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // PAYROLL COMPONENTS
  // ============================================================

  async function fetchPayrollComponents() {
    loading.value = true
    error.value = null
    try {
      payrollComponents.value = await hrServiceAdapter.fetchPayrollComponents()
      return payrollComponents.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createPayrollComponent(input: PayrollComponentInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await hrServiceAdapter.createPayrollComponent(input)
      payrollComponents.value.push(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updatePayrollComponent(id: string, updates: PayrollComponentUpdate) {
    loading.value = true
    error.value = null
    const index = payrollComponents.value.findIndex((c) => c.id === id)
    const old = index !== -1 ? { ...payrollComponents.value[index] } : null
    try {
      const updated = await hrServiceAdapter.updatePayrollComponent(id, updates)
      if (index !== -1) payrollComponents.value[index] = updated
      return updated
    } catch (e: any) {
      if (old && index !== -1) payrollComponents.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deletePayrollComponent(id: string) {
    loading.value = true
    error.value = null
    try {
      await hrServiceAdapter.deletePayrollComponent(id)
      payrollComponents.value = payrollComponents.value.filter((c) => c.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // PAYROLL PERIODS & PAYROLLS
  // ============================================================

  async function fetchPayrollPeriods() {
    loading.value = true
    error.value = null
    try {
      payrollPeriods.value = await hrServiceAdapter.fetchPayrollPeriods()
      return payrollPeriods.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getPayrollPeriod(id: string): Promise<PayrollPeriod | null> {
    loading.value = true
    error.value = null
    try {
      return await hrServiceAdapter.getPayrollPeriod(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createPayrollPeriod(input: PayrollPeriodInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await hrServiceAdapter.createPayrollPeriod(input)
      payrollPeriods.value.unshift(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updatePayrollPeriod(id: string, updates: PayrollPeriodUpdate) {
    loading.value = true
    error.value = null
    const index = payrollPeriods.value.findIndex((p) => p.id === id)
    const old = index !== -1 ? { ...payrollPeriods.value[index] } : null
    try {
      const updated = await hrServiceAdapter.updatePayrollPeriod(id, updates)
      if (index !== -1) payrollPeriods.value[index] = updated
      return updated
    } catch (e: any) {
      if (old && index !== -1) payrollPeriods.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deletePayrollPeriod(id: string) {
    loading.value = true
    error.value = null
    try {
      await hrServiceAdapter.deletePayrollPeriod(id)
      payrollPeriods.value = payrollPeriods.value.filter((p) => p.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchPayrolls(periodId: string) {
    loading.value = true
    error.value = null
    try {
      payrolls.value = await hrServiceAdapter.fetchPayrolls(periodId)
      return payrolls.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getPayroll(id: string): Promise<Payroll | null> {
    loading.value = true
    error.value = null
    try {
      return await hrServiceAdapter.getPayroll(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function generatePayroll(periodId: string) {
    loading.value = true
    error.value = null
    try {
      const generated = await hrServiceAdapter.generatePayroll(periodId)
      payrolls.value = generated
      // Refresh summary periode
      await fetchPayrollPeriods()
      return generated
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function postPayrollJournal(periodId: string): Promise<string> {
    loading.value = true
    error.value = null
    try {
      const journalId = await hrServiceAdapter.postPayrollJournal(periodId)
      // Update status lokal
      const index = payrollPeriods.value.findIndex((p) => p.id === periodId)
      if (index !== -1) {
        payrollPeriods.value[index].status = 'paid'
        payrollPeriods.value[index].paid_at = new Date().toISOString()
      }
      payrolls.value = payrolls.value.map((p) => ({ ...p, status: 'paid' as const }))
      return journalId
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchPayrollSummary() {
    loading.value = true
    error.value = null
    try {
      payrollSummary.value = await hrServiceAdapter.getPayrollSummary()
      return payrollSummary.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    departments,
    positions,
    employees,
    employeesWithStats,
    attendance,
    payrollComponents,
    payrollPeriods,
    payrolls,
    payrollSummary,
    loading,
    error,
    fetchDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    fetchPositions,
    createPosition,
    updatePosition,
    deletePosition,
    fetchEmployees,
    fetchEmployeesWithStats,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    fetchAttendance,
    createAttendance,
    updateAttendance,
    deleteAttendance,
    bulkCreateAttendance,
    fetchPayrollComponents,
    createPayrollComponent,
    updatePayrollComponent,
    deletePayrollComponent,
    fetchPayrollPeriods,
    getPayrollPeriod,
    createPayrollPeriod,
    updatePayrollPeriod,
    deletePayrollPeriod,
    fetchPayrolls,
    getPayroll,
    generatePayroll,
    postPayrollJournal,
    fetchPayrollSummary,
  }
})