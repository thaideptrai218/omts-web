# Phase C (phần 2) - Loại hình trả lương, điều chỉnh lương, hồ sơ nhân viên, nhập/xuất Excel

Trạng thái: chưa làm. **Mỗi mục cần PM duyệt**; trả lời ghi vào `docs/decisions/` rồi mới làm. Phụ thuộc: Phase A (A5 công thức chi phí, A8 quyền). Đổi công thức lương chỉ áp cho bảng tạo/Tải lại sau khi phát hành; bảng đã chốt không đổi.
Hiện trạng: lương = giờ x đơn giá theo loại việc (`PayRate`, hiệu lực theo ngày), `PayrollLine.Bonus` luôn 0, `Deduction` = tạm ứng (`PayrollLine.cs`, `PayrollCalculator.cs`).

## C3 Loại hình trả lương - Công L - Cần PM duyệt
Đề xuất mặc định: giữ **Giờ**; thêm **Ngày công**. **Khoán theo kg/lồng** và **Lương tháng cho Staff** là tùy chọn, chỉ làm khi PM nói rõ (mặc định bỏ).

### C3a Ngày công (mặc định làm)
- Backend: `PayRate` thêm `Unit` (`PayUnit { Hour, Day }`, mặc định Hour; migration thêm cột có default) - một loại việc có thể có đơn giá giờ hoặc ngày theo từng thời điểm. `AttendanceSettingsVersion` thêm `FullDayMinMinutes` (mặc định 270 = 4,5 giờ) và `HalfDayMinMinutes` (mặc định 60): quy đổi giờ làm của một loại việc trong ngày -> 0,5 hoặc 1 công (mẫu KiotViet `CCR_081126-21`).
- `PayrollCalculator`: dòng việc có `Unit` và `Quantity` (giờ hoặc công); `PayrollLineJob` thêm `Unit`, `Quantity`; `Amount = Quantity x đơn giá`; `Hours` của phiếu vẫn là tổng giờ thật. Giữ làm tròn VND cùng chỗ để không lệch với `LaborCostCalculator` (L12): dùng chung một hàm tính tiền/ngày.
- Web: `features/operations` (màn Loại công việc `job-types`): chọn đơn vị khi thêm mức giá; phiếu lương hiện "Số lượng + đơn vị". Hộp thoại thiết lập chấm công (`workforce-setup-dialog.tsx`): thêm hai ngưỡng quy đổi công.
- Test: `PayrollCalculatorTests.cs` (3 giờ = 0,5 công; 5 giờ = 1 công; nhiều việc/ngày; đơn giá đổi giữa kỳ).
Chấp nhận: bảng lương kỳ mới có dòng "công" đúng; chi phí bè khớp tổng bảng lương.

### C3b Khoán theo sản lượng (tùy chọn, mặc định KHÔNG làm) - Công L
Tương đương "hoa hồng" của KiotViet: đơn giá VND/kg (thu hoạch) hoặc VND/lồng (ươm) theo loại việc, chia cho tổ theo tỷ lệ giờ công. Dữ liệu có sẵn (lô thu hoạch có kg, `HarvestLotCrew`, `HarvestPlanLineId` trên phân công). Cần PM chốt: ai là tổ, chia theo giờ hay đều, có cộng thêm giờ công không (tránh trả hai lần), mức khoán có đổi theo kích cỡ/độ chín không. Chưa có quyết định thì ghi "ngoài phạm vi" trong `SRS_DEVIATIONS`.

### C3c Lương tháng cho Staff (tùy chọn, mặc định KHÔNG làm)
Đổi BR-LABOR-09 (hiện Staff không trả qua OMTS). Nếu duyệt: `Employee` thêm `MonthlySalary` (từ ngày hiệu lực), dòng lương "Cố định" theo ngày công chuẩn từ bảng chấm công C2.

## C4 Điều chỉnh lương: phụ cấp, thưởng, phạt, tăng ca - Công L - Cần PM duyệt
Thay thế "sửa tay số trên bảng" của KiotViet bằng khoản có lý do và dấu vết.

### Backend
- Entity mới `PayrollAdjustment` (`Domain/Entities/Labor/PayrollAdjustment.cs`: `PayrollLineId`, `Kind {Allowance, Bonus, Penalty}`, `CategoryId?`, `Amount` (>0, VND nguyên), `Reason` bắt buộc <= 500, `EnteredByAccountId`) và `AdjustmentCategory` (`Name`, `Kind`, `DefaultAmount?`, `IsActive`; tên duy nhất). Configurations + migration `PayrollAdjustments`.
- `PayrollLine`: `Bonus` = tổng Phụ cấp + Thưởng; thêm `Penalty`; `Income = MainPay + Bonus`; `Net = Income - Penalty - Deduction(tạm ứng)`. Cập nhật `PayrollLineSync`, `PayrollCalculator`, `PayrollDtos`, `PayrollQueryService` (cột mới), `PayrollExportService`; Tải lại **giữ** các điều chỉnh.
- Endpoint (Owner; Kế toán chỉ GET sau A8): `GET/POST/DELETE api/payroll-slips/{slipId}/adjustments` (chỉ khi bảng Tạm tính; 409 sau chốt), `GET/POST/PUT api/payroll-adjustment-categories` (+ `discontinue/resume`). Audit mỗi lần thêm/xóa (trước/sau, lý do). Chặn tổng Phạt > Thu nhập (MSG-GEN-01 nêu trường).
- Tăng ca (con của C4, mặc định tắt): `AttendanceSettingsVersion` thêm `OvertimeAfterMinutes?` và `OvertimeMultiplier?` (ví dụ 480 phút, 1,5): phần phút vượt ngưỡng trong ngày trả thêm (hệ số - 1) x đơn giá. Tính trong `PayrollCalculator` và `LaborCostCalculator` bằng cùng hàm.
- Báo cáo tài chính (A5) đã dùng `Income`, tự gồm phụ cấp + thưởng; Phạt trừ vào thực lĩnh, **không** giảm chi phí (đề xuất; xác nhận cùng Q1).
- Test: `PayrollCalculatorTests.cs` (net với phạt + tạm ứng, giữ điều chỉnh khi reload, chặn sau chốt).

### Web
- `features/payroll/payroll-slip-detail.tsx`: khối "Điều chỉnh" (danh sách, Thêm khoản: loại, danh mục, số tiền, lý do; Xóa với xác nhận); tách file `payroll-adjustment-section.tsx`, `payroll-adjustment-dialog.tsx`, `payroll-adjustment-categories-dialog.tsx`.
- `payroll-data-table.tsx`/`payroll-list-table.tsx`: thêm cột Phụ cấp+Thưởng, Phạt; hàng tổng cố định ở đầu (mẫu `TLR_081126-32`), bấm số mở chi tiết công thức/khoản.
- Nút "Danh mục điều chỉnh" trong cài đặt lương; mặc định vài mục gợi ý (Phụ cấp ăn trưa/đi lại, Phạt đi muộn, Thưởng chuyên cần) tạo bằng lần nhập đầu của người dùng, không seed cứng.
- BFF `payroll-plan.ts`: thêm route + schema; quyền Owner ghi.
Chấp nhận: thêm phạt 50.000 cho một phiếu: thực lĩnh giảm đúng, xuất Excel/PDF có cột; Tải lại giữ khoản; sau chốt không sửa được.

## C5 Hồ sơ nhân viên chi tiết và lịch sử - Công M - Cần PM duyệt (nhẹ: trường mới)
- Route `src/app/(app)/employees/[id]/page.tsx` (BFF/route đọc `GET /api/employees/{id}`). Đầu trang: avatar chữ cái, tên, mã, trạng thái, loại NV, vùng, thẻ tóm tắt (giờ công tháng này, nợ lương, tạm ứng chưa trừ, ngày làm gần nhất). Tab: Thông tin | Công việc | **Công và phân công** (tháng; dùng `timesheet?employeeId=` của C2) | Phiếu lương | Nợ và tạm ứng | **Lịch sử** | Tài khoản. Danh sách vẫn mở chi tiết tại chỗ (`employee-detail-panel.tsx`), thêm liên kết "Mở trang hồ sơ"; tách tab thành `features/employee-api/employee-profile-*.tsx` (mỗi file < 200 dòng; hiện `employee-detail-tabs.tsx` đã 66 dòng nhưng rất dày).
- Danh sách: thêm cột **Nợ và tạm ứng** (chỉ Owner/Kế toán) và **Giờ công tháng này**; backend thêm `OutstandingPay`, `AdvanceBalance`, `MonthHours` vào `EmployeeDtos.cs`/`EmployeeQueryService.cs` bằng truy vấn gộp (không N+1), ẩn với vai không có quyền.
- Lịch sử: xem `AuditEventsController` có lọc theo bản ghi nhân viên chưa; chưa có thì thêm `GET /api/employees/{id}/history` theo mẫu `RecordHistoryController` (mẫu dùng cho lô thu hoạch, nhật ký...). Hiển thị: tạo hồ sơ, đổi loại NV (đã có `TypePeriods`), đổi vùng, nghỉ/làm lại, liên kết tài khoản, sửa ngân hàng (che số tài khoản).
- Trường mới (chỉ khi PM duyệt): `EmergencyContactName`, `EmergencyContactPhone`; **ảnh đại diện thật** cần lưu tệp (mẫu upload như logo HTX): mặc định bỏ, dùng chữ cái đầu. Không thêm phòng ban/chức danh/hợp đồng/chứng chỉ.
Chấp nhận: mở hồ sơ thấy tháng làm việc, phiếu lương, nợ, lịch sử có người sửa + thời gian; Quản lý vùng không thấy phần tiền.

## C6 Nhập/xuất Excel nhân viên - Công S
- Đã có: `employee-import-dialog.tsx`, `employee-file-repository.ts`, `EmployeeImportService.cs` (bỏ qua dòng lỗi), `import/template`, `export`.
- Bổ sung: kết quả nhập liệt kê lỗi theo dòng (số dòng, cột, lý do tiếng Việt) và tải file lỗi; chọn "Dừng khi gặp lỗi" hoặc "Bỏ qua dòng lỗi"; giới hạn 500 dòng hiển thị trong dialog; cảnh báo trùng CCCD (A9). Xuất danh sách dùng `ExportMenu` thêm PDF (Phase D).
- Không nhập lịch làm việc/chấm công từ Excel (rủi ro sai số liệu lương).

## Rủi ro
- C3/C4 đổi số liệu lương: chạy so sánh tổng kỳ T9/T10 demo trước và sau (kết quả phải bằng nhau khi chưa nhập điều chỉnh/công).
- Migration: chỉ thêm cột/bảng; đặt default an toàn; không xóa dữ liệu; không `docker down -v`.
- Quyền: mọi endpoint điều chỉnh/lương là Owner (ghi) và Owner + Kế toán (đọc, sau A8).

## Việc cần làm
- [ ] Nhận quyết định PM theo từng mục [ ] C3a [ ] C4 [ ] C5 [ ] C6 [ ] (tùy chọn) C3b/C3c
- [ ] Lint, typecheck, build; `dotnet build` + test; đối chiếu tổng kỳ demo.
