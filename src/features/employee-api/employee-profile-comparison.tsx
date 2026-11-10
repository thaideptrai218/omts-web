"use client";
import type { Employee } from "./contracts";
import { accountLabel, dateLabel, employmentLabel, employeeTypeLabel } from "./employee-editor-model";

/** Read-only summary of the server copy of an employee, used when reconciling with a draft. */
export function ProfileComparison({ employee }: { employee: Employee }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Hồ sơ hiện tại trên hệ thống</h3>
      <p>
        {employee.fullName} · {employee.phoneNumber || "—"} · {employmentLabel(employee.status)} ·{" "}
        {dateLabel(employee.lastWorkingDay)}
      </p>
      <p>
        Ngày sinh: {dateLabel(employee.birthday)} · {employee.address || "—"} · {employee.area || "—"} ·{" "}
        {employee.ward || "—"}
      </p>
      <p>
        {employee.otherInformation || "—"} · {employee.notes || "—"}
      </p>
      <p>Vùng: {employee.workingZones.map((zone) => zone.code).join(", ") || "—"}</p>
      <p>Loại nhân viên: {employeeTypeLabel(employee.employeeType)}</p>
      <p>Loại công việc: {employee.jobTypes.map((job) => job.name).join(", ") || "—"}</p>
      <p>
        Ngân hàng:{" "}
        {employee.bankAccount
          ? `${employee.bankAccount.bankName} · ${employee.bankAccount.accountNumber} · ${employee.bankAccount.accountHolderName}`
          : "—"}
      </p>
      <p>
        Tài khoản:{" "}
        {employee.account
          ? `@${employee.account.username} · ${accountLabel(employee.account.status)}`
          : "Chưa liên kết"}
      </p>
    </div>
  );
}
