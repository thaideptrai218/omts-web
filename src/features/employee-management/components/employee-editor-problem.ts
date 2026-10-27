import type { BindableEmployeeProblem, EmployeeIssueTarget } from "../domain/employee-problem";
import type { EmployeeEditorValues } from "../schemas/employee-editor-schema";
import { formatMessage } from "@/shared/messages/message-catalog";

// Visual order of the actual controls, not arbitrary backend field order.
const editableFields = [
  "fullName", "phone", "birthday", "accountId", "address", "area", "wardCommune", "otherInformation", "notes",
] as const satisfies readonly (keyof EmployeeEditorValues & EmployeeIssueTarget)[];
type EditableField = typeof editableFields[number];
const targetLabels: Readonly<Record<EmployeeIssueTarget, string>> = {
  fullName: "Họ và tên", phone: "Số điện thoại", birthday: "Ngày sinh", accountId: "Tài khoản hệ thống",
  address: "Địa chỉ", area: "Khu vực", wardCommune: "Phường/Xã", otherInformation: "Thông tin khác", notes: "Ghi chú",
  workingZoneIds: "Vùng làm việc", bankAccount: "Thông tin ngân hàng", recordVersion: "Phiên bản hồ sơ",
};

export type EmployeeEditorProblem = Readonly<{
  fieldErrors: readonly Readonly<{ field: EditableField; message: string }>[];
  summary: string;
  existingEmployeeId?: string;
}>;

export function bindEmployeeEditorProblem(problem: BindableEmployeeProblem): EmployeeEditorProblem {
  if (problem.status === "duplicate") {
    const message = formatMessage({ code: "MSG03", params: { object_name: "Hồ sơ nhân viên" } });
    return { fieldErrors: [{ field: "fullName", message }], summary: message, existingEmployeeId: problem.existingEmployeeId };
  }
  const targets = new Set(problem.fields);
  return {
    fieldErrors: editableFields.filter((field) => targets.has(field))
      .map((field) => ({ field, message: formatMessage({ code: "MSG01" }) })),
    summary: `Hồ sơ chưa được lưu. Các mục cần kiểm tra: ${[...targets].map((target) => targetLabels[target]).join(", ")}.`,
  };
}
