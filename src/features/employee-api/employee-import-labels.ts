/** Vietnamese wording for the per-row errors of an employee import (the backend answers with English labels and texts). */
const fields: Record<string, string> = {
  "Full name": "Họ và tên", "Phone number": "Số điện thoại", Birthday: "Ngày sinh", Gender: "Giới tính", "Employee type": "Loại nhân viên", EmployeeType: "Loại nhân viên",
  "Working zones": "Vùng làm việc", "Job types": "Loại công việc", Address: "Địa chỉ", Area: "Khu vực", Ward: "Phường/Xã", Notes: "Ghi chú", "Other information": "Thông tin khác",
  "Bank account": "Ngân hàng", Code: "Mã nhân viên", "ID number": "CCCD", "Start date": "Ngày bắt đầu làm việc",
};
const byCode: Record<string, string> = {
  "MSG-GEN-01": "Thiếu hoặc không hợp lệ.",
  "MSG-GEN-02": "Mã nhân viên đã được dùng.",
  "MSG-LABOR-03": "Số điện thoại đã thuộc về một nhân viên đang làm việc.",
};
const byText: Record<string, string> = {
  "Missing or invalid.": "Thiếu hoặc không hợp lệ.",
  "Repeated in this file.": "Bị lặp lại trong file.",
  "Formulas are not accepted.": "Không nhận ô chứa công thức.",
};

export const importFieldLabel = (field: string) => fields[field] ?? field;
export const importErrorReason = (error: { message: string; messageCode?: string | null }) =>
  (error.messageCode ? byCode[error.messageCode] : undefined) ?? byText[error.message] ?? "Dòng này không hợp lệ.";

/** Shown when the backend refuses the whole file (wrong type, too large, missing columns, no rows). */
export const importFileRefusal = "File chưa đúng mẫu: cần file .xlsx tối đa 2 MB, 1000 dòng, đủ các cột bắt buộc của file mẫu và ít nhất một dòng.";
