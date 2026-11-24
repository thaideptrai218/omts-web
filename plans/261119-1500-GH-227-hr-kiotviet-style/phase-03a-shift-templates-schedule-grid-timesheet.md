# Phase C (phần 1) - Lưới lịch tuần, mẫu ca, bảng chấm công tháng

Trạng thái: chưa làm. **Cần PM duyệt** trước khi bắt đầu (ghi lại trả lời vào `docs/decisions/`). Phụ thuộc: Phase A (A1, A2 sửa tính giờ và ca qua đêm), Phase B1 (liên kết sửa chấm công).
Mô hình giữ nguyên: một bản ghi chấm công/ngày, nhiều chu kỳ việc/ngày (`WorkAssignment`). Lưới và bảng tháng chỉ là **cách xem và nhập nhanh** trên dữ liệu đó, không tạo kho lịch thứ hai.

## C1 Lưới lịch làm việc tuần + mẫu ca - Công M-L - Cần PM duyệt
Đề xuất mặc định (PM có thể thu hẹp): làm lưới tuần + phân công nhiều người/nhiều ngày + sao chép tuần trước; **Mẫu ca** chỉ làm khi PM muốn Staff có giờ dự kiến/cảnh báo muộn.

### Backend
1. Đọc theo khoảng ngày (mới): `GET /api/workforce/schedule?from&to&zoneId` trong `WorkforceController.cs`, hàm `ListScheduleAsync` ở `Features/Labor/Work/WorkQueryService.cs`: mỗi nhân viên một dòng, mỗi ngày danh sách chu kỳ việc (bè, loại việc, nguồn là kế hoạch thu hoạch hay thủ công), cờ nghỉ phép đã duyệt, giờ vào/ra nếu có. Giới hạn 31 ngày, 300 nhân viên, lọc vùng theo quyền (`PermissionFunctions.WorkAssignments` View).
2. Ghi: **tái dùng** `POST /api/workforce/assignments` (`AssignWorkRequest`, một ngày, nhiều nhân viên) - web gọi tuần tự theo ngày; không thêm endpoint ghi mới.
3. Mẫu ca (chỉ nếu duyệt): `Domain/Entities/Labor/ShiftTemplate.cs` (Name, StartTime, EndTime, CrossesMidnight, IsActive; kế thừa `AuditableEntity`), `Persistence/Configurations/Labor/ShiftTemplateConfiguration.cs`, migration `ShiftTemplates`, `Features/Labor/Shifts/ShiftTemplateService.cs` (+DTO), `ShiftTemplatesController.cs` (`api/shift-templates`: GET list, POST, PUT, `discontinue`/`resume`; quyền `PayRules` hoặc `WorkAssignments` Edit, Owner). Tên duy nhất không phân biệt hoa thường; ca đang dùng không xóa, chỉ ngừng.
4. Không tự động tạo chấm công, không tự phạt đi muộn/về sớm; mẫu ca chỉ cho giờ gợi ý khi phân công và nhãn "Muộn 12 phút" trong bảng chấm công (C2).

### Web
- Khu vực `schedule` ("Lịch làm việc"), thư mục `src/features/workforce-schedule/`: `schedule-screen.tsx` (thanh điều hướng tuần, lọc vùng/bè/tìm NV, chuyển "Xem theo nhân viên / theo bè"), `schedule-grid.tsx` (hàng NV x 7 cột, ô là chip màu theo loại việc: mã bè + việc; ô trống "+ Thêm"), `schedule-cell-dialog.tsx` (phân công một ô), `schedule-bulk-dialog.tsx` (chọn nhiều NV x nhiều ngày + bè + việc; hiển thị xung đột MSG-LABOR-06 và hỏi chuyển bè như `workforce-assignment-editor.tsx`), `schedule-copy-week.tsx` ("Sao chép tuần trước": xem trước các ô sẽ tạo, bỏ qua ô đã có và ngày < hôm nay), `use-schedule.ts`, `schedule-contracts.ts`.
- Cột phải: số ngày làm + số giờ dự kiến (nếu có mẫu ca), như cột "Lương dự kiến" của KiotViet (`CCR_081126-8`); **không** hiển thị tiền ở màn này cho Quản lý vùng.
- BFF: `src/server/operations/schedule-plan.ts` (GET schedule), đăng ký theo mẫu ở Phase B; menu "Phân công và chấm công > Lịch làm việc".
- Ca qua đêm: chip hiện "22:00 -> 02:00 (+1)" khi có giờ vào/ra; ô thuộc ngày bắt đầu (khớp A2).
Chấp nhận: xếp 5 nhân viên x 3 ngày trong một thao tác; sao chép tuần giữ đúng bè/việc; Quản lý vùng chỉ thấy vùng mình; 360 px cuộn ngang với cột tên cố định.

## C2 Bảng chấm công tháng - Công M - Cần PM duyệt (nhẹ: ai được xem tổng giờ)
Mục đích: ma trận nhân viên x ngày trong tháng, kèm chú giải, thay cho việc mở từng ngày (khoảng trống lớn nhất so với KiotViet `CCR_081126-43`).

### Backend
- `GET /api/workforce/timesheet?from&to&zoneId&employeeId` (`WorkforceController`): `Features/Labor/Work/TimesheetQueryService.cs` dùng `WorkHoursCalculator.Calculate` (nguồn giờ duy nhất, hết lệch L14). Mỗi ô: tổng phút đã trừ nghỉ, trạng thái (Đủ công / Thiếu lượt vào / Chưa ra về / Nghỉ phép / Không làm), danh sách chu kỳ (bè, việc). Hàng cuối: tổng giờ theo ngày; cột cuối: tổng giờ, số ngày công, giờ theo từng loại việc.
- Quyền: `Attendance` View theo vùng (Owner, Quản lý vùng). Kế toán xem toàn bộ nếu Q2 = có (dùng `Payroll` View). Giới hạn 31 ngày/lượt.
- DTO đặt trong `Features/Labor/Work/TimesheetDtos.cs`; test `Features/Labor/TimesheetQueryTests.cs` (ca qua đêm, phân công lại, nghỉ phép).

### Web
- `src/features/timesheet/`: `timesheet-screen.tsx` (chọn tháng, vùng, tìm NV, chuyển Tuần/Tháng), `timesheet-grid.tsx` (ô hiển thị giờ "7,5", màu theo trạng thái), `timesheet-legend.tsx` (chú giải 5 trạng thái, không chỉ dựa vào màu: kèm ký hiệu/văn bản), `timesheet-day-drawer.tsx` (chi tiết ngày: vào/ra, chu kỳ, người ghi, lý do; Owner có nút "Sửa chấm công" -> B1), `use-timesheet.ts`, `timesheet-contracts.ts`.
- Hàng tổng cố định trên cùng; cột tên cố định khi cuộn ngang; ở 360 px mặc định chế độ tuần.
- Nút Tải xuống dùng `ExportMenu` (Phase D).
- BFF `server/operations/timesheet-plan.ts`; menu "Phân công và chấm công > Bảng chấm công".
Chấp nhận: tổng giờ tháng của một nhân viên khớp "Số giờ" trên phiếu lương cùng kỳ; ô thiếu lượt bấm vào thấy lý do và đường tới B1.

## Rủi ro
- Hiệu năng: ma trận 300 x 31: tính ở backend bằng truy vấn theo khoảng, không N+1.
- Hai nguồn "lịch": lưới chỉ đọc `WorkAssignment` + `WorkDayPlan`; kế hoạch chưa được phân công hiện chip nhạt "Kế hoạch".
- Mẫu ca không được dùng để suy ra tiền công (tránh nhầm với Phase C3).

## Việc cần làm
- [ ] Nhận quyết định PM [ ] C1 backend [ ] C1 web [ ] C2 backend [ ] C2 web
- [ ] Lint, typecheck, build; `dotnet build` + test mới; kiểm 360/1024.
