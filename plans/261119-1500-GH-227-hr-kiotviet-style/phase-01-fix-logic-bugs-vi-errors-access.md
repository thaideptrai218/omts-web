# Phase A - Sửa lỗi logic L1-L8, thông báo tiếng Việt, quyền Kế toán, chi phí lương

Ưu tiên: cao. Trạng thái: chưa làm. Công: M-L (A1 L, còn lại S-M). Nguồn lỗi: `plans/reports/review-nhan-su-2026-11-19.md`.
Không thêm bước nghiệp vụ mới. Các mục có "Cổng" cần người dùng xác nhận câu hỏi trong `plan.md` trước khi làm; chưa có trả lời thì làm theo mặc định đã nêu.

## Mục tiêu
Số giờ/lương đúng, chốt lương không bị kẹt mà không biết lý do, không chi đôi tiền, Kế toán đối chiếu được, báo cáo tài chính đúng công thức.

## A1 (L1) Giờ nghỉ giữa hai phiên không bị tính công - Công L - Cổng Q3
Nguyên nhân: `WorkAssignmentService.ReopenDay` (dòng ~273) xóa `CheckOutAt` giữ `CheckInAt`; khi cùng bè/việc không tạo chu kỳ mới, khi khác thì chu kỳ cũ kéo dài đến `StartsAt` của chu kỳ mới; `WorkHoursCalculator.Calculate` lấy `to = StartsAt` kế tiếp.
Cách sửa (cộng thêm, không đổi mô hình một bản ghi chấm công/ngày):
1. `OMTS.Domain/Entities/Labor/WorkAssignment.cs`: thêm `DateTimeOffset? EndsAt` (chu kỳ đã đóng lúc ra về). `Configurations/Labor/WorkAssignmentConfiguration.cs` + migration mới `Migrations/2026111xxxxxxx_WorkAssignmentEndsAt.cs` (cột nullable, không backfill).
2. `AttendanceRecordingService` (nhánh check-out, `RecordAsync`): đặt `EndsAt = giờ ra` cho chu kỳ cuối của ngày.
3. `ReopenDay`: **luôn** thêm chu kỳ mới `StartsAt = now` (kể cả cùng bè/việc, kế thừa `HarvestPlanLineId`); giữ nguyên `EndsAt` chu kỳ cũ; audit `Attendance.Reopened` giữ.
4. `WorkHoursCalculator.Calculate`: `to = Min(end, kế tiếp.StartsAt ?? end, p.EndsAt ?? end)`; trừ phần nghỉ như cũ; bỏ qua `EndsAt` nếu lớn hơn `checkOut` hiện tại.
5. `AttendanceCorrectionService`: khi Owner sửa giờ ra/chu kỳ, đồng bộ hoặc xóa `EndsAt` để không lệch.
6. `LaborCostCalculator`, `PayrollCalculator`, `RecordCrewAttendance` (L14) đều đọc `DayHours` nên tự đúng; L14: hiển thị cùng một con số (đã trừ nghỉ) trong `RecordCrewAttendance.cs:139-149`.
Test: `tests/OMTS.Application.UnitTests/Features/Labor/WorkHoursCalculatorTests.cs` thêm ca "vào 07:00, ra 11:00, phân công lại 14:00, ra 17:00" kỳ vọng 4h + 3h trừ nghỉ trưa, không 9h.
Chấp nhận: ví dụ trên ra đúng; chi phí bè và bảng lương cùng số; ngày không phân công lại không đổi.

## A2 (L2) Ca qua đêm - Công M - Cổng Q3
- `AttendanceRecordingService.cs:76-79`: cho check-out khi `assignment.Date` là hôm nay **hoặc** hôm qua và `giờ ra - giờ vào <= 18 giờ`; ngày công vẫn là ngày vào (`Attendance.Date`).
- `AttendanceCorrectionService.cs:118-120`: `Validate` cho `CheckOutAt` trong khoảng `[ngày D 00:00, ngày D+1 18:00]`; chu kỳ việc trong khoảng đó.
- Nghỉ giữa giờ: cửa sổ nghỉ tính theo ngày của giờ vào (đã có trong `BreakWindow`).
- Web: `workforce-board-state.ts` hiển thị "Chưa ra về (từ hôm qua)" và cho nút Ra về trên dòng hôm qua; lọc theo ngày vào.
Test: ca 22:00-02:00 ra 4h (trừ nghỉ nếu có). Chấp nhận: ghi được ra về hôm sau; Owner sửa được; chốt lương không còn thiếu lượt.

## A3 (L3) Chốt lương không kẹt, thông báo tiếng Việt - Công M
- `src/shared/messages/message-catalog.ts` + `backend-message-code.ts`: thêm `MSG-LABOR-04/28/31/34/36` (và 06/07/12 nếu chưa có) tiếng Việt, ví dụ "Chưa thể chốt bảng lương: {reason_list}". Ánh xạ trong `categories` để `workspaceError` (`features/api-workspace/workspace-error.ts`) dùng `formatMessage` thay câu chung "Vui lòng kiểm tra lại thông tin đã nhập".
- Lấy `Parameters` (`reason_list`, `request_list`, `employee_name`, `owed_amount`) từ phản hồi lỗi: mở rộng parser lỗi trong `features/payroll/repository.ts` và `server/operations/operation-http.ts` để chuyển `params` xuống UI (kiểm tra cách `formatMessage({code, params})` đang dùng).
- Backend: dịch/chuẩn hóa chuỗi `reasons` trong `PayrollRules`/`PayrollService.cs:261-286` sang tiếng Việt có tên + ngày (ví dụ "Nguyễn A: thiếu giờ ra ngày 12/11").
- Web: dialog chốt `features/payroll/payroll-confirm-dialogs.tsx` hiển thị danh sách lý do dạng danh sách có liên kết "Sửa chấm công" (link sang B1) và xem trước: số NV, tổng thu nhập, tổng tạm ứng trừ, thực lĩnh, "Không thể hoàn tác, khóa chấm công đến ngày X". Sửa `payroll-create-dialog.tsx:33` để 409 ghi đúng nguyên nhân thay vì luôn "Đã có bảng lương".
Chấp nhận: tạo tình huống thiếu lượt ra, bấm Chốt: thấy tên, ngày và nút tới màn sửa; lỗi 409 chờ duyệt hiển thị danh sách yêu cầu.

## A4 (L4) Hiển thị đúng loại yêu cầu - Công S
- `features/operations/new-module-contracts.ts:29` (`leaveSchema`): thêm `type` (Leave/MissedCheckIn/MissedCheckOut) và `requestedTime`.
- `workforce-leave-dialogs.tsx`: tiêu đề "Xin nghỉ" / "Bù giờ vào" / "Bù giờ ra", hiển thị giờ đề nghị; câu xác nhận duyệt ghi rõ "Sẽ ghi giờ vào 06:30 ngày 12/11". Thêm lọc theo loại.
Chấp nhận: yêu cầu quên vào/ra không còn hiện như nghỉ phép; duyệt có giờ trên màn xác nhận.

## A5 (L5) Chi phí lương trong báo cáo tài chính - Công S - Cổng Q1
- `OMTS.Infrastructure/Persistence/Queries/FinancialReportQuery.cs:57`: dùng `Income` (`MainPay + Bonus`) thay `MainPay + Bonus - Deduction` (mặc định gross). Phiếu chi loại Payroll vẫn **không** vào chi phí khác (tránh tính đôi) - giữ `CashBookConfiguration.cs:52`.
- Cập nhật chú thích trong `SRS_DEVIATIONS` (REP-01) và nhãn web "Chi trả lương NV" (`financial-report-*.tsx`) ghi "Tổng thu nhập các bảng lương đã chốt".
- Chỉ áp cho truy vấn; bảng đã chốt không đổi số liệu lưu. Test: thêm case trong test của `FinancialReportQuery`/service (kiểm có test sẵn trước).
Chấp nhận: bảng có tạm ứng: chi phí = tổng thu nhập; không đổi tổng chi tiền sổ quỹ.

## A6 (L6) Idempotency-Key cho thanh toán lương - Công S
- Web: `features/payroll/payroll-pay-dialog.tsx` và `payroll-standalone-payment-dialog.tsx` sinh `crypto.randomUUID()` mỗi lần mở dialog, gửi header `Idempotency-Key` qua repository (`features/payroll/repository.ts`) và `server/operations/payroll-plan.ts` (chuyển tiếp header đã sanitize).
- Backend: `PayrollPaymentService.PayEmployeeAsync` đã nhận key (`PayrollsController.cs:97-100`); kiểm tra dòng 156 thực sự trả lại bản ghi cũ khi trùng key (thêm test nếu thiếu).
Chấp nhận: gửi hai lần cùng key chỉ tạo một phiếu tạm ứng.

## A7 (L7) Chặn hủy phiếu chi lương/tạm ứng từ Sổ quỹ - Công S - Cổng Q4
- `OMTS.Application/Features/CashBook/CashVoucherService.cs` (`CancelAsync`, dòng ~184-221): trả lỗi MSG-GEN-09 "Phiếu chi lương do hệ thống tạo, không hủy từ Sổ quỹ" khi phiếu thuộc `WagePayment` hoặc loại `PaymentPayroll`; thông điệp web trong catalog.
- Web Sổ quỹ: ẩn nút Hủy cho phiếu loại Lương/Tạm ứng (xem `features/cash-book`).
- Hướng "hoàn chi trong module Lương" chỉ làm nếu Q4 chọn cho hủy có lý do.
Chấp nhận: hủy phiếu lương từ Sổ quỹ bị từ chối rõ lý do; công nợ lương không tự mở lại.

## A8 (L8) Kế toán xem được lương - Công M - Cổng Q2
- Backend: `PayrollsController`, `LaborCostsController`: các **GET** (list, detail, export, payable-employees, employee payslips, slip, labor-costs) đổi `[RequireCooperativeOwner]` sang `[RequirePermission(PermissionFunctions.Payroll, View|Export, AnyZone)]`; các POST (create/reload/finalize/cancel/payments) giữ Owner. `FixedRoles.cs:63` đã có `Full(Payroll)` cho Kế toán: đổi thành View+Export (không Create/Edit) để ma trận khớp API.
- `EmployeesController`: cho Kế toán `LaborWorkers` View (chỉ danh sách/tên/mã/SĐT; ẩn CCCD/ngân hàng như người không `canMaintain`).
- Web: `features/operations/permissions.ts` + menu `api-workspace-shell.tsx` (nhóm "Tiền lương") hiển thị theo quyền; nút ghi ẩn với Kế toán; BFF `payroll-plan.ts` khai báo quyền View/Export cho GET.
- `features/role-management`: ma trận hiển thị đúng sau khi đổi fixed role.
Chấp nhận: đăng nhập `ketoan`: xem được bảng lương/phiếu/chi phí nhân công, không thấy nút Chốt/Thanh toán, POST trả 403; `quanlyvung1` vẫn 403.

## A9 Việc nhỏ cùng đợt - Công S
`workforce-setup-dialog.tsx`: nhãn "Làm tròn xuống (phút)", dùng `DatePickerField` dd/mm/yyyy, bỏ khung giờ nghỉ nếu đã chốt nghỉ cố định 1 giờ (xác nhận với quyết định trước khi bỏ); `workforce-assignment-row.tsx:28` chặn "Ra về" khi chưa có lượt vào (hoặc yêu cầu giờ vào + lý do); thống nhất nhãn Nghỉ việc / Làm việc lại (`employee-status-action-dialog.tsx`, `employee-detail-tabs.tsx:58`); cảnh báo trùng CCCD (`EmployeeProfileValidator.cs`).

## A10 (L11, L12, L16) Lỗi nhỏ bổ sung khi rà plan - Công S-M
- L11: bảng Tạm tính hiện "Cập nhật lần cuối lúc hh:mm"; khi chốt, nếu tổng sau tính lại khác tổng đang xem thì **dừng** và hiện chênh lệch (số NV, tổng cũ → mới) để Owner xác nhận lại; không tự chốt số mới.
- L12: thống nhất làm tròn: `LaborCostCalculator` làm tròn theo (loại việc, đơn giá) cả kỳ như `PayrollCalculator`; hiển thị giờ dạng `7h20` (không `7,33h`) ở phiếu lương để Giờ × Đơn giá khớp Thành tiền.
- L16: chặn `PaidAt` trước ngày chốt bảng; gỡ vùng khỏi hồ sơ khi còn phân công tương lai ở vùng đó → báo lỗi tiếng Việt liệt kê ngày; cảnh báo (không chặn) trùng CCCD.
- L13: không đổi công thức (cần PM); B4 hiển thị chú thích "Công ươm cấp vùng không tính vào chu kỳ".

## Rủi ro
- A1 đổi số giờ của các ngày đã phân công lại trong kỳ chưa chốt: bảng Tạm tính đổi khi Tải lại; bảng đã chốt giữ. Báo trong ghi chú phát hành.
- A5/A8 đổi số liệu hiển thị: ghi rõ trong `SRS_DEVIATIONS`.
- Migration A1 chỉ thêm cột nullable: an toàn với DB demo.

## Việc cần làm
- [ ] A1 [ ] A2 [ ] A3 [ ] A4 [ ] A5 [ ] A6 [ ] A7 [ ] A8 [ ] A9 [ ] A10
- [ ] `tsc` + eslint file đã sửa; `dotnet build` (Docker). Test: chỉ 1-2 case nhỏ cho A1/A2/A5 (công thức giờ/tiền), không chạy cả bộ, không CI.
- [ ] Smoke bằng curl với owner / ketoan / quanlyvung1 cho A3, A6, A7, A8.
