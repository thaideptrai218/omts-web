import type { EmployeeEditorValues } from "../schemas/employee-editor-schema";
import { employeeTextLimits } from "../schemas/employee-personal-schema";

export const employeePersonalHints: Readonly<Partial<Record<keyof EmployeeEditorValues, string>>> = {
  fullName: `Tối đa ${employeeTextLimits.fullName} ký tự.`,
  phone: "Chấp nhận đầu số 0, +84 hoặc 84; có thể nhập dấu cách, chấm hoặc gạch ngang.",
  birthday: "Có thể để trống. Không chọn ngày sau hôm nay.",
  address: `Tối đa ${employeeTextLimits.address} ký tự.`,
  area: `Tối đa ${employeeTextLimits.area} ký tự.`,
  wardCommune: `Tối đa ${employeeTextLimits.wardCommune} ký tự.`,
  otherInformation: `Tối đa ${employeeTextLimits.otherInformation} ký tự.`,
  notes: `Tối đa ${employeeTextLimits.notes} ký tự.`,
};
