"use client";
import { EmployeeDebtTab } from "@/features/payroll/employee-debt-tab";
import { EmployeePayslipsTab } from "@/features/payroll/employee-payslips-tab";
import type { Employee } from "./contracts";
import type { PayrollTabKey } from "./employee-tabs";
import styles from "./employee-detail.module.css";

/** Owner-only payroll tabs of the employee profile (KiotViet section 7); read-only, so they sit outside the profile edit form. */
export function EmployeePayrollTabs({ employee, tab }: { employee: Employee; tab: PayrollTabKey }) {
  return <div className={styles.payroll}>{tab === "payslips" ? <EmployeePayslipsTab employeeId={employee.id} /> : <EmployeeDebtTab employeeId={employee.id} employeeName={employee.fullName} />}</div>;
}
