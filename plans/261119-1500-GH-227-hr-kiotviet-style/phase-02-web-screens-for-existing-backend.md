# Phase B - Màn web còn thiếu cho API backend đã có

Ưu tiên: cao (sau A). Trạng thái: chưa làm. Công: L (8 mục, mỗi mục S-M). Không đổi nghiệp vụ: chỉ nối API và UI; Q6 chỉ ảnh hưởng B7.
Phụ thuộc: A3 (thông báo lỗi), A8 (Kế toán xem chi phí nhân công/kỳ lương).

## Cách thêm một màn mới (mẫu đã dùng cho "Cuối ngày")
Mỗi khu vực mới cần đăng ký ở 5 chỗ: `src/server/operations/<area>-plan.ts` (schema zod + endpoint + quyền) -> `operation-plan.ts` và `operation-http.ts` (đăng ký area) -> `src/features/operations/operation-screen.tsx` (ánh xạ area -> component) -> `src/features/operations/permissions.ts` (quyền xem) -> menu `src/features/api-workspace/api-workspace-shell.tsx` (nhóm "Nhân sự": dòng ~59 và ~159-162). Mẫu: `end-of-day-report-plan.ts` + `features/sales-reports/end-of-day-*.tsx`. Hợp đồng dữ liệu đặt trong `features/operations/new-module-contracts.ts` hoặc file `*-contracts.ts` riêng (tách khi >200 dòng).

## B1 Sửa chấm công (Owner) - Công M
API: `GET/PUT /api/workforce/attendance/{employeeId}/{day}` (`WorkforceController.cs:116-127`, `AttendanceDayView`, `CorrectAttendanceRequest`, `AttendanceCorrected`, hỏi MSG-GEN-04).
- Web: `features/operations/workforce-correction-dialog.tsx` (mới) mở từ menu "..." của dòng trong `workforce-table.tsx`/`workforce-assignment-row.tsx` và từ liên kết lỗi chốt lương (A3). Trường: giờ vào, giờ ra (cho phép sang ngày kế sau A2), danh sách chu kỳ việc (bè, việc, giờ bắt đầu), lý do bắt buộc; hiển thị giờ công tính lại trước khi lưu; `rowVersion` nếu API trả.
- BFF: thêm 2 route vào `new-module-plan.ts:40-49` (quyền Owner).
- Hook ghi: `useOperationEditor` (xem `workforce-setup-dialog.tsx` làm mẫu: xác nhận -> `repository.write`).
Chấp nhận: sửa ngày thiếu lượt ra, bảng lương tải lại hết cảnh báo; lỗi 409/validate hiển thị tiếng Việt; Quản lý vùng không thấy nút.

## B2 Vào làm cả tổ (crew-start) và chọn nhiều dòng - Công M
API: `POST /api/workforce/crew-start` (`CrewStartRequest`: bè, thành viên, giờ bắt đầu, lý do).
- Web: thanh công cụ `workforce-toolbar-actions.tsx` thêm "Vào làm cả tổ" (chọn bè -> tick thành viên -> giờ bắt đầu mặc định giờ hiện tại, lý do bắt buộc); bảng có cột chọn, hành động "Ghi vào làm / Ra về cho N người" dùng các endpoint check-in/out từng dòng tuần tự, hiển thị kết quả theo người (thành công/thất bại).
- Cột cảnh báo "Quá 12 giờ chưa ra về"; tách trạng thái "Chưa ra về" khỏi "Thiếu lượt vào" (`workforce-board-state.ts`).
Chấp nhận: 1 thao tác vào làm cho cả tổ; lỗi từng người không làm hỏng người khác; không gửi trùng khi bấm hai lần.

## B3 Chấm công Staff - Công S
API: `GET /api/workforce/staff-attendance`, `POST /api/workforce/staff/{id}/check-in|check-out`.
- Web: tab "Nhân viên Staff" trong màn Phân công và chấm công (`workforce-layout.tsx`), danh sách Staff theo vùng với giờ vào/ra, nút Vào/Ra, trạng thái nghỉ phép được duyệt.
Chấp nhận: Quản lý vùng chấm cho Staff trong vùng được phân quyền.

## B4 Chi phí nhân công theo bè/chu kỳ - Công M
API: `GET /api/labor-costs/rafts`, `GET /api/labor-costs/cycles/{cycleId}` (BR-LABOR-07; Owner, Kế toán xem sau A8).
- Web: khu vực mới `labor-costs`, menu "Nhân sự > Tiền lương > Chi phí nhân công". Bộ lọc: khoảng ngày, vùng, bè, chu kỳ; bảng bè/chu kỳ x giờ x chi phí x chi phí theo loại việc; bấm dòng mở chi tiết theo ngày/nhân viên; tổng cuối bảng; xuất tải xuống ở Phase D.
- Hiển thị chú thích L13 (công cấp vùng như ươm không tính vào chu kỳ) cho đến khi PM quyết; không tự đổi công thức.
- Tên file: `features/labor-costs/labor-costs-screen.tsx`, `labor-costs-contracts.ts`, `use-labor-costs.ts` (<200 dòng mỗi file).
Chấp nhận: tổng chi phí tháng 9 demo khớp tổng bảng lương BL000001 (19.512.500).

## B5 Cài đặt kỳ lương - Công S
API: `GET/PUT /api/payroll-settings`, `GET /api/payroll-settings/preview?startDay&automaticPayroll` (`LaborSettingsController.cs`).
- Web: nút "Thiết lập kỳ lương" trên `payroll-screen.tsx` mở dialog: ngày bắt đầu kỳ (1-28), "Tự tạo bảng lương" (ghi chú nếu backend chưa chạy: PAY-08), xem trước 2 kỳ kế tiếp, câu hỏi MSG-LABOR-36 trước khi lưu, `rowVersion`.
Chấp nhận: lưu rồi tải lại giữ giá trị; xem trước đổi theo ngày chọn.

## B6 Trang "Thiết lập nhân sự" (checklist kiểu KiotViet) - Công M
Dữ liệu từ API sẵn có, không thêm bảng: số nhân viên (`/api/employees`), loại việc + đơn giá (`/api/job-types`), thiết lập chấm công (`/api/attendance-settings`), kỳ lương (`/api/payroll-settings`), bảng lương gần nhất (`/api/payrolls`).
- Web: khu vực `hr-setup` (menu đầu nhóm Nhân sự), 5 thẻ có tiến độ n/5, mỗi thẻ: trạng thái (xong/chưa), tóm tắt ("12 nhân viên", "3 loại việc có đơn giá"), nút "Thiết lập" mở đúng màn/dialog (nhân viên, loại việc, B5, `workforce-setup-dialog`, tạo bảng lương). Owner thấy đủ; vai khác thấy phần được quyền.
- Mẫu giao diện: ảnh `KTNVR_191026-31.png`.
Chấp nhận: dữ liệu demo hiện 5/5 hoặc đúng thiếu bước nào; không thêm trạng thái lưu ở backend.

## B7 Nghỉ việc an toàn (L9, L10) - Công M - Cổng Q6
- Dialog `employee-status-action-dialog.tsx`: chọn ngày làm cuối (<= hôm nay), tóm tắt hậu quả lấy từ API (phân công tương lai bị gỡ, đang vào chưa ra về, tạm ứng chưa trừ, phiếu lương còn nợ, tài khoản liên kết cần khóa); nếu Q6 = tự khóa thì gọi khóa tài khoản sau xác nhận, ngược lại hiện nhắc có liên kết "Khóa tài khoản".
- Backend `EmploymentService`/`EmploymentEndService`: trả danh sách hậu quả (endpoint GET preview hoặc mở rộng phản hồi) - chỉ đọc; `EmployeeService.cs:108-111` cho sửa ngân hàng/liên hệ khi trạng thái Left.
Chấp nhận: nghỉ việc ngày quá khứ có tóm tắt; nhân viên Left còn nợ sửa được số tài khoản.

## B8 Duyệt yêu cầu hàng loạt và hiển thị nhật ký - Công S
`workforce-leave-dialogs.tsx`: chọn nhiều yêu cầu cùng loại -> Duyệt/Từ chối (từ chối bắt buộc lý do, gọi tuần tự `POST leave-requests/{id}/review`); huy hiệu số yêu cầu chờ duyệt ở nút. Mẫu: nút "Duyệt yêu cầu" trong KiotViet (`QLNVRT_N_-24..26`).

## B9 Bảng lương trình bày kiểu KiotViet - Công M (chỉ UI, dữ liệu sẵn có)
Mẫu `TLR_081126-32` / `TLR_081126-47` trong `docs/reports/kiotviet-nhan-vien/images/`.
- `payroll-screen`/bảng chi tiết: **hàng tổng cố định ở đầu**; cột Giờ công · Lương chính · Thưởng/Phụ cấp (0 tới khi có C4) · Tổng thu nhập · Tạm ứng trừ · Thực lĩnh · Đã trả · Còn cần trả; trạng thái bảng rõ (Tạm tính / Đã chốt / Đã hủy) và hàng nút **Tải lại · Chốt · Thanh toán**.
- Bấm số giờ/lương của một người → panel chi tiết theo ngày (ngày, bè, loại việc, vào-ra, giờ, đơn giá, thành tiền) để giải thích công thức.
- Phiếu lương 2 tab **Thanh toán / Chấm công chi tiết**.
- Dialog thanh toán: chọn quỹ (tiền mặt/ngân hàng từ `cash-accounts`), nút "Trả toàn bộ", Idempotency-Key (A6).

## B10 Danh sách nhân viên đủ thông tin vận hành - Công S-M
- Thêm cột **Nợ lương/tạm ứng** và **Giờ công tháng này** (nếu API danh sách chưa có thì thêm trường tổng hợp vào `GET /api/employees`, chỉ đọc, Owner/Kế toán). Hiện mặc định cột Tài khoản, Ngày làm cuối.
- Avatar chữ cái đầu; nhãn trạng thái thống nhất "Đang làm / Đã nghỉ việc".
- Cảnh báo trên bảng phân công trong ngày: "Quên ra về" (>12 giờ), "Thiếu lượt vào" tách khỏi "Chưa ra về".

## Responsive và truy cập
Kiểm 360 px và 1024 px: bảng cuộn ngang trong khung, dialog dạng compact (`Dialog mobileLayout="compact"`), focus rõ, phím tắt Esc đóng, nhãn tiếng Việt, trạng thái rỗng "Chưa có dữ liệu trong khoảng đã chọn".

## Rủi ro
- Quyền: mỗi route BFF phải khớp quyền backend (Owner-only với B1, Owner+Kế toán xem với B4/B5 sau A8).
- B2: gửi tuần tự có thể chậm với tổ lớn: giới hạn 30 người/lượt.
- B6 chỉ phản ánh dữ liệu: không lưu trạng thái hoàn thành riêng.

## Việc cần làm
- [ ] B1 [ ] B2 [ ] B3 [ ] B4 [ ] B5 [ ] B6 [ ] B7 [ ] B8 [ ] B9 [ ] B10
- [ ] Lint, typecheck, build; chụp 360/1024 cho B1, B2, B4 vào `.hallmark/` (không commit), tóm tắt kết quả trong `docs/reports/`.
