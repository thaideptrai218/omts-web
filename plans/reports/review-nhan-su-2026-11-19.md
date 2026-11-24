# Review mảng Nhân sự (web + backend) - 19/11/2026

Phạm vi: nhân viên, phân công, chấm công, tổng giờ, tổ trên bản ghi ươm/thả giống/thu hoạch, bảng lương, thanh toán lương → phiếu chi, chi phí nhân công theo bè/chu kỳ, phân quyền.
Nhánh `feature/OMTS-227-kiotviet-style-reports`. Read-only: không sửa mã, không commit.
Cách làm: đọc mã backend (`OMTS.Application/Features/{Employees,Labor,Workforce}`, controllers, config EF) + web (`features/{employee-api,operations/workforce-*,payroll,labor-api}`), chạy thật các GET và 2 POST bị từ chối (không ghi dữ liệu) với owner / quanlyvung1 / ketoan.
Chú thích xác nhận: **[CHẠY]** = đã gọi API thật; **[ĐỌC]** = chỉ đọc mã (không ghi dữ liệu demo để tái hiện).

---

## 1) Tóm tắt đánh giá

Mức trưởng thành: **6,5/10** (backend ~7,5; web ~5,5).

Điểm mạnh
- Backend chặt: khóa kỳ lương (`PayPeriodLock`), row-version + `MarkChanged` chống thanh toán đôi/lệch, unique (EmployeeId, Date) cho chấm công, nhật ký audit đủ before/after, xác thực ngày UTC+7 đúng (`BusinessClock`), đơn giá có hiệu lực theo ngày, Idempotency-Key cho thanh toán.
- Luồng lương đủ vòng: tạo → tính lại → chốt (trừ tạm ứng) → thanh toán từng phần → phiếu chi vào Sổ quỹ; đối soát demo khớp: chi phí nhân công T9 = 19.512.500 = tổng bảng lương BL000001 **[CHẠY]**.
- Phân quyền Quản lý vùng đúng: không vào được bảng lương/chi phí (403), thông tin cá nhân của nhân viên không thuộc vùng bị ẩn **[CHẠY]**.

Điểm yếu
- Web thiếu nhiều chức năng backend đã có: **sửa chấm công, điểm danh hàng loạt (crew-start), chấm công Staff, mã QR, chi phí nhân công theo bè/chu kỳ, cài đặt kỳ lương, loại yêu cầu bù chấm công**.
- Lỗi chốt lương không hiển thị lý do (message backend tiếng Anh, web nuốt thành câu chung) + không có UI sửa chấm công → kỳ lương có thể kẹt.
- Tính giờ sai khi nhân viên được phân công lại sau khi ra về (tính cả khoảng nghỉ giữa hai phiên); không hỗ trợ ca qua đêm.
- Mô hình lương mỏng: chỉ đơn giá theo giờ theo loại việc; không thưởng/phạt/phụ cấp/tăng ca/lương Staff.

---

## 2) LỖI LOGIC

### L1. [Cao] Phân công lại sau khi ra về tính cả khoảng nghỉ giữa hai phiên là giờ công - **[ĐỌC]**
- File: `OMTS.Application/Features/Labor/Work/WorkAssignmentService.cs:273-296` (`ReopenDay` xóa `CheckOutAt`, giữ nguyên `CheckInAt`); `Work/WorkHoursCalculator.cs:44-54` (chu kỳ cuối lấy `to = end`, chu kỳ trước lấy `to = StartsAt của chu kỳ sau`).
- Mỗi người-ngày chỉ có 1 bản ghi (vào, ra) (`AttendanceConfiguration.cs:18`). Quyết định "đã ra về thì chọn lại được" mở lại bản ghi và xóa giờ ra cũ.
- Tái hiện: A vào 07:00, ra 11:00 (4h). 14:00 được phân công lại (ươm → thu hoạch), ra 17:00. Hệ thống tính 07:00-17:00 trừ nghỉ trưa = 9h thay vì 7h. 3h nghỉ giữa hai phiên bị trả lương, và còn tính vào chi phí bè.
- Hướng sửa: lưu danh sách phiên (vào/ra) thay vì 1 bản ghi; hoặc khi mở lại, chốt phiên cũ vào một chu kỳ "đã kết thúc lúc 11:00". Cần PM duyệt (đổi mô hình chấm công).

### L2. [Cao] Không có ca qua đêm - **[ĐỌC]**
- `AttendanceRecordingService.cs:76-79` (`assignment.Date != today` → từ chối ra về hôm sau); `AttendanceCorrectionService.cs:118-120` (giờ vào/ra bắt buộc cùng ngày `day`).
- Hàu thu hoạch theo con nước, hay bắt đầu 22:00-03:00. Vào 22:00 ngày D, ra 02:00 ngày D+1: không ghi được ra về (hôm sau chưa có phân công), Owner cũng không sửa được (giờ ra phải thuộc ngày D) → ngày công thiếu lượt, bảng lương không chốt được (L3).
- Hướng sửa: cho phép check-out sang ngày kế (cửa sổ ≤ 24h sau giờ vào) và `Validate` chấp nhận `CheckOutAt` ≤ ngày D+1 06:00. Cần PM duyệt.

### L3. [Cao] Chốt lương có thể kẹt không lối thoát trên giao diện - **[ĐỌC]** (+ **[CHẠY]** xác nhận message tiếng Anh)
- Chốt bị chặn khi: kỳ chưa kết thúc, ngày công thiếu lượt, giờ không có đơn giá, còn yêu cầu chờ duyệt (`PayrollService.cs:261-286`, `:180-184`). Backend trả message tiếng Anh: "The payroll cannot be finalized yet: ..." **[CHẠY]** (tương tự MSG-LABOR-34 "the amount cannot be more than the 3,640,000 VND still owed").
- Web: `features/api-workspace/workspace-error.ts:4-18` chỉ có Vietnamese cho vài mã; `message-catalog.ts` chỉ có `MSG-LABOR-03`, không có LABOR-28/31/34. Kết quả: 400 → "Vui lòng kiểm tra lại thông tin đã nhập." (không nói ai/ngày nào); 409 (LABOR-31, còn yêu cầu chờ duyệt) → "Dữ liệu đã thay đổi. Hãy tải lại…" (sai nghĩa).
- Web không có màn sửa chấm công (`PUT /api/workforce/attendance/{emp}/{day}` không có trong `server/operations/new-module-plan.ts:40-49`) → Owner biết "có ngày thiếu lượt" cũng không sửa được bằng UI (chỉ gọi API tay).
- Hướng sửa: (a) map các mã LABOR-28/31/34/04 sang tiếng Việt, hiển thị `reason_list`; (b) làm màn "Sửa chấm công" cho Owner, link thẳng từ lỗi chốt; (c) trang "Rà soát trước khi chốt" liệt kê ngày thiếu lượt/thiếu đơn giá.

### L4. [Trung] Yêu cầu "quên vào/ra" hiển thị như nghỉ phép - **[ĐỌC]**
- Backend `EmployeeRequestView` trả `type` (Leave / MissedCheckIn / MissedCheckOut) và `requestedTime` (`EmployeeRequestViews.cs:11-32`). Web `leaveSchema` (`operations/new-module-contracts.ts:29`) bỏ `type`/`requestedTime`; `workforce-leave-dialogs.tsx` chỉ vẽ `from`–`to`.
- Hậu quả: Owner duyệt "bù giờ vào 06:30" mà không thấy giờ đề nghị, hiểu là xin nghỉ; duyệt = ghi giờ vào vào bảng công (sai nếu hiểu nhầm). Khi duyệt/từ chối cần xem giờ.

### L5. [Trung] Báo cáo tài chính ghi chi phí lương = thực lĩnh (đã trừ tạm ứng) - **[ĐỌC]**
- `OMTS.Infrastructure/Persistence/Queries/FinancialReportQuery.cs:57` dùng `MainPay + Bonus - Deduction`; ghi trong `SRS_DEVIATIONS.md` REP-01. Phiếu chi lương (loại Payroll) không vào mục chi phí khác (`CashBookConfiguration.cs:52` + `FinancialReportQuery.cs:64-71`).
- Hậu quả: tạm ứng đã chi tiền mặt nhưng không bao giờ thành chi phí; tổng chi phí lương cả đời thấp hơn thật đúng bằng tổng tạm ứng đã trừ. Kế toán chuẩn: chi phí = tổng thu nhập (gross, `Income`); tạm ứng là khoản phải thu tạm.
- Cần PM/chủ dự án xác nhận (đã ghi là quyết định D5, nhưng công thức chưa được hỏi riêng).

### L6. [Trung] Tạm ứng độc lập không chống gửi trùng; web không gửi Idempotency-Key - **[ĐỌC]**
- `PayrollPaymentService.cs:156` (phần tạm ứng không gắn payslip nên không có dòng nào để `MarkChanged`); `PayrollsController.cs:97-100` nhận `Idempotency-Key` nhưng không có chỗ nào trong `web/src` gửi header này (grep "idempotency" = 0 kết quả).
- Tái hiện: bấm "Tạo phiếu chi" khi mạng chập chờn/timeout rồi thử lại → hai phiếu tạm ứng, chi 2 lần tiền. Thanh toán theo payslip vẫn an toàn nhờ row-version.
- Sửa: web sinh `crypto.randomUUID()` mỗi lần mở dialog, gửi `Idempotency-Key` cho cả hai dialog thanh toán.

### L7. [Trung] Hủy phiếu chi lương từ Sổ quỹ không bị chặn - **[ĐỌC]**
- `CashBookRules.cs:66` chặn **sửa** phiếu loại hệ thống, nhưng `CashVoucherService.cs:184-221` (`CancelAsync`) không chặn phiếu `PaymentPayroll`. `PayrollRepositories.cs:98` coi phiếu hủy là chưa trả → công nợ lương tự mở lại, không có dấu vết bên bảng lương.
- Với phiếu tạm ứng (`:113`): hủy sau khi đã được trừ vào payslip đã chốt thì `PayrollAdvanceDeduction` còn nguyên → nhân viên bị trừ tiền tạm ứng chưa hề nhận (payslip net thấp hơn thật, không có đường sửa vì bảng đã chốt).
- Sửa: chặn hủy phiếu có `WagePayment` hoặc đổi sang luồng "hoàn chi" có lý do trong module Lương; nếu tạm ứng đã bị trừ thì chặn hẳn.

### L8. [Trung] Ma trận quyền nói Kế toán có `PAYROLL` nhưng API khóa riêng Chủ HTX - **[CHẠY]**
- `FixedRoles.cs:63` `Full(Payroll)` cho Accountant; `PayrollsController.cs:17` `[RequireCooperativeOwner]`. `ketoan` gọi `/api/payrolls`, `/api/labor-costs/rafts`, export → 403 hết **[CHẠY]**. Cũng không vào được `/api/employees` (403).
- Màn Vai trò/Quyền hiển thị ma trận có Payroll cho Kế toán (gây hiểu nhầm); Kế toán xem được báo cáo tài chính (REP-01) nhưng không truy được bảng lương để đối chiếu; không thấy hồ sơ nhân viên để đối soát phiếu chi lương. PAY-01 ghi là quyết định "chỉ Chủ", nhưng ma trận phải khớp (hoặc bỏ quyền thừa).

### L9. [Trung] Nghỉ việc không khóa tài khoản liên kết, không kiểm tra công nợ - **[ĐỌC]**
- `EmploymentService.cs:94-96,167-183`: chỉ gửi nhắc Owner (MSG-LABOR-02); tài khoản nhân viên (có thể là Quản lý vùng) vẫn đăng nhập được cho đến khi có người khóa tay.
- Không kiểm tra: còn tạm ứng chưa trừ, còn payslip chưa trả, đang check-in chưa ra về, còn phân công tương lai (backend tự xóa phân công sau ngày cuối nhưng dialog web không nói).
- Web `employee-status-action-dialog.tsx:50-56` chỉ có xác nhận "nghỉ từ hôm nay", không cho chọn ngày làm cuối trong quá khứ (backend cho phép `lastDay ≤ today`), không cảnh báo gì.

### L10. [Thấp-Trung] Nhân viên đã nghỉ không sửa được hồ sơ khi còn nợ lương - **[ĐỌC]**
- `EmployeeService.cs:108-111`: chỉ nhân viên Working mới sửa. Nhân viên Left còn payslip chưa trả (thực tế gặp: NV000008 nghỉ 29/10, còn nợ T9 3.640.000 **[CHẠY]**) không đổi được tài khoản ngân hàng/SĐT sai → phải "Cho làm việc lại" chỉ để sửa số tài khoản, mà làm vậy xóa `LastWorkingDay`.
- Sửa: cho sửa nhóm trường ngân hàng/liên hệ kể cả Left.

### L11. [Thấp-Trung] Bảng lương Tạm tính không báo "dữ liệu đã đổi"; tổng có thể nhảy khi chốt - **[ĐỌC]**
- `PayrollService.FinalizeAsync:173,186` tự tính lại toàn bộ và ghi đè; web không so sánh tổng đang xem với tổng sau tính lại. Chủ HTX xem 18.367.500 hôm trước, chốt ra số khác mà không được cảnh báo. Thiếu nút/nhãn "Cập nhật lần cuối lúc…", thiếu "số thay đổi so với lần xem".
- Hơn nữa ZM vẫn sửa được chấm công khi bảng còn Tạm tính (chỉ khóa sau chốt) → dễ lệch.

### L12. [Thấp] Làm tròn không khớp giữa các nơi - **[ĐỌC]** (demo hiện khớp)
- `PayrollCalculator.cs:83` làm tròn VND theo (loại việc, đơn giá) cả kỳ; `LaborCostCalculator.cs:43` làm tròn theo từng ngày → tổng chi phí bè có thể lệch vài đồng so với tổng bảng lương khi đơn giá không chia hết 60 phút (T9 demo: 19.512.500 = 19.512.500 **[CHẠY]**).
- `PayrollLine.Hours` lưu 2 số thập phân nhưng `Amount` tính từ phút (`PayrollCalculator.cs:40,83`): hiển thị Giờ × Đơn giá ≠ Thành tiền vài trăm đồng (7h20 = 7,33h). Demo 3 phiếu T10 không lệch vì giờ tròn **[CHẠY]**.

### L13. [Thấp] Chi phí theo chu kỳ bỏ công cấp vùng và công ngoài khoảng ngày chu kỳ - **[ĐỌC]**
- `LaborCostService.cs:54-58`: chỉ lấy `RaftId == cycle.RaftId` trong [StartDate, CloseDate]. Công ươm (cấp vùng, `RaftId = null`) và công trước ngày bắt đầu chu kỳ không tính vào chu kỳ nào dù ươm là chi phí của lứa này.
- Web không có màn hiển thị chi phí nhân công (grep "labor-costs" trong `src` = 0), nên số liệu này chưa ai thấy.

### L14. [Thấp] Hai con số "giờ công" cho cùng người-ngày - **[ĐỌC]**
- Tổ trên bản ghi: phút thô vào→ra, chưa trừ nghỉ (`RecordCrewAttendance.cs:139-149`; `record-crew-work-text.ts:14`, ghi chú "break not deducted"). Màn Chấm công/Bảng lương: đã trừ giờ nghỉ và làm tròn xuống. Cùng người, cùng ngày hiện 8h00 và 7h00. Theo quyết định "nghỉ cố định 1 giờ, một tổng" nên thống nhất một con số (tổng giờ công trả lương).

### L15. [Thấp] Cài đặt chấm công gây hiểu lầm - **[ĐỌC]**
- Backend làm tròn **xuống** (`WorkHoursCalculator.cs:73`), web ghi "Làm tròn (phút)" (`workforce-setup-dialog.tsx:91`) → chọn 30 phút, ra 7h29 → 7h00. Nhãn nên là "Làm tròn xuống".
- Dialog hiển thị ngày dạng ISO `2026-11-19` (`:78`, `:58`), dùng `<input type="date|time">` gốc thay `DatePickerField`; Giờ nghỉ cấu hình khung giờ trong khi quyết định là "nghỉ cố định 1 giờ" → thừa tùy chọn, trừ nghỉ sai nếu ca không phủ khung nghỉ.

### L16. [Thấp] Các kiểm tra còn thiếu
- Không kiểm tra trùng CCCD giữa các nhân viên (`EmployeeProfileValidator.cs`, `EmployeeInput.cs`; chỉ kiểm tra mã và SĐT của người đang làm).
- `PaidAt` của thanh toán lương chỉ chặn tương lai (`PayrollPaymentService.cs:253`), không chặn trước khi bảng được chốt/trước kỳ làm.
- Nút "Ghi ra về" hiện cả khi chưa có lượt vào (`workforce-assignment-row.tsx:28`): tạo ngày công thiếu lượt, chỉ có câu hỏi xác nhận ở `workforce-board-state.ts:21`. Nên chặn hoặc yêu cầu giờ vào kèm lý do.
- Gỡ vùng làm việc khỏi hồ sơ không kiểm tra phân công tương lai tại vùng đó (`EmployeeProfileChanges.SyncZones`).
- Zone Manager tạo nhân viên chỉ tick "Chủ đã duyệt trực tiếp" (`EmployeeService.cs:57-60`), không có bằng chứng/ghi nhận duyệt thật (chỉ lý do audit).

---

## 3) THIẾU SÓT CHỨC NĂNG

So với SRS / backend đã có nhưng web chưa có UI (xác nhận bằng grep `src/`)
- Sửa chấm công của Owner (LABOR-04.4) - có API, không có màn.
- Điểm danh hàng loạt khi chưa ở bè (`crew-start`, LABOR-04.8), chấm công Staff (`staff-attendance`, LABOR-04.7), quét mã QR (`qrCode` luôn `null`).
- Chi phí nhân công theo bè/chu kỳ (BR-LABOR-07, `GET /api/labor-costs/*`).
- Cài đặt kỳ lương (ngày bắt đầu kỳ, tự động tạo bảng): `payroll-settings` không có trong web (và backend ghi nhận chưa có tác dụng, PAY-08).
- Hiển thị loại yêu cầu bù chấm công (L4).
- Thông báo cho nhân viên (CL-02, chờ app nhân viên).

So với SRS/phần mềm chuyên nghiệp (cần PM duyệt vì đổi nghiệp vụ)
- Mô hình lương: chỉ đơn giá theo giờ × loại việc. Thiếu loại hình trả lương theo nhân viên (ngày công, khoán/sản phẩm theo kg/lồng thu hoạch, tháng cho Staff), hợp đồng, ngày bắt đầu hợp đồng, mức lương cơ bản. Staff không được trả qua OMTS (BR-LABOR-09) nên "nhân sự cố định" không có lương.
- Thưởng/phạt/phụ cấp/khấu trừ ngoài tạm ứng (`PayrollLine.Bonus` luôn 0, `PayrollLine.cs:28`), tăng ca/ngày lễ, tính bảo hiểm/thuế (nếu cần).
- Điều chỉnh bảng lương sau khi chốt: không có "mở lại/điều chỉnh có lý do" (`PayrollService.cs:205` chốt xong không hủy được). Sai số liệu sau chốt chỉ còn cách tạo phiếu tạm ứng ngược (không có).
- Hoàn/chuộc thanh toán lương trong module Lương (xem L7), hoàn tạm ứng khi nhân viên nghỉ (tạm ứng không thu hồi được cho nhân viên Left).
- Bảng chấm công theo tháng (ma trận nhân viên × ngày) + xuất PDF/Excel; phiếu lương (payslip) in/PDF/gửi từng người; xuất danh sách phân công/chấm công trong ngày; báo cáo giờ công theo bè/chu kỳ/nhân viên.
- Phép: có yêu cầu nghỉ nhưng không số dư phép, không loại phép (có lương/không lương), nghỉ không phép không đánh dấu, không ảnh hưởng lương ("only recorded").
- Phân công theo mẫu/lịch lặp (copy ngày hôm qua, phân công theo tuần), theo kế hoạch thu hoạch đã có nhưng phân công thủ công khác vẫn cần từng người.
- Hành động hàng loạt: chấm công vào/ra cho cả tổ, nghỉ việc nhiều người, đổi vùng nhiều người (trang nhân viên chỉ có xuất file khi chọn nhiều; `employee-directory.tsx:87-89`).
- Hồ sơ: không có ảnh, người liên hệ khẩn cấp, hợp đồng/tệp đính kèm, tay nghề/chứng chỉ, lịch sử công tác từng nhân viên (phân công, giờ công theo tháng ngay trong hồ sơ).
- Cảnh báo: ngày quên ra về cuối ngày, nhân viên vắng không phép, vượt giờ làm trong ngày, bảng lương quá hạn chốt.

---

## 4) CẢI THIỆN UI/UX

- **Lỗi nghiệp vụ**: dịch toàn bộ thông điệp LABOR sang tiếng Việt kèm danh sách chi tiết (ai, ngày nào) ở màn chốt lương; hiện chỉ có câu chung (L3).
- **Chốt lương**: dialog ghi "Hệ thống ghi nhận khoản tạm ứng vào bảng lương" (`payroll-confirm-dialogs.tsx:16`) → nên hiển thị bản xem trước: tổng thu nhập, tổng khấu trừ tạm ứng, thực lĩnh, số nhân viên; nêu rõ "không thể hoàn tác, khóa chấm công đến ngày X".
- **Tạo bảng lương**: mọi lỗi 409 hiện "Đã có bảng lương cho kỳ làm việc này" (`payroll-create-dialog.tsx:33`) kể cả xung đột đồng thời; lỗi "kỳ trùng/chồng" (400) hiện chung chung; thiếu giải thích "không có giờ công trong kỳ" (hint tiếng Anh bị nuốt).
- **Bảng chấm công trong ngày**: mỗi người phải mở từng dòng để vào/ra; thêm chọn nhiều dòng → "Ghi vào làm / Ra về cho N người"; thêm cột cảnh báo "Quá 12 giờ chưa ra về".
- Trạng thái "Thiếu lượt vào" gộp lẫn ca thiếu lượt ra; tách "Chưa ra về" khỏi "Thiếu lượt vào".
- **Ngày và định dạng**: dialog thiết lập chấm công hiện ngày ISO; thống nhất `dd/mm/yyyy` và `DatePickerField` như các màn khác.
- **Nhãn không thống nhất**: dialog "Nghỉ việc?", nút "Ngừng làm việc", trạng thái "Đã nghỉ việc", nút "Cho làm việc lại" (`employee-status-action-dialog.tsx`, `employee-detail-tabs.tsx:58`); chọn 1 cụm (Nghỉ việc / Làm việc lại).
- **Dialog nghỉ việc**: thêm chọn ngày làm cuối, tóm tắt hậu quả (phân công bị gỡ, còn nợ lương/tạm ứng, nhắc khóa tài khoản).
- **Thanh toán lương**: số tiền mặc định đúng, nhưng thiếu chọn tài khoản/quỹ (tiền mặt/ngân hàng cụ thể), thiếu ảnh/chứng từ chuyển khoản, thiếu nút "Trả toàn bộ".
- **Responsive 360/1024**: chưa kiểm bằng trình duyệt trong lượt review này (cần chụp lại bảng chấm công và dialog thanh toán 7 cột ở 360 px).
- Bảng nhân viên mặc định ẩn "Tài khoản" và "Ngày làm cuối"; nên hiện cột "Giờ công tháng này/ngày làm gần nhất" cho người điều hành.
- **Tồn mã giả lập**: ~5,9 nghìn dòng mã mock (`features/employee-management`, `workforce-demo`, `role-management`) vẫn trong repo cho chế độ không API; ngoài tính năng chính, làm tăng chi phí bảo trì và dễ lệch hành vi so với API thật.

---

## 5) ĐỀ XUẤT ƯU TIÊN (top 8)

| # | Việc | Công | Cần PM duyệt? |
|---|------|------|---------------|
| 1 | Dịch + hiển thị lý do chốt lương (LABOR-28/31/34/04) và trang rà soát trước chốt (L3) | S-M | Không |
| 2 | Màn **Sửa chấm công** của Owner + link từ lỗi chốt; hiển thị đúng loại yêu cầu bù chấm công (L3, L4) | M | Không (SRS đã có LABOR-04.4) |
| 3 | Sửa tính giờ khi phân công lại sau ra về: lưu nhiều phiên vào/ra hoặc chốt phiên cũ (L1) | M-L | **Có** (đổi mô hình chấm công) |
| 4 | Ca qua đêm: ra về/sửa chấm công sang ngày kế (L2) | M | **Có** |
| 5 | Idempotency-Key cho cả hai dialog thanh toán + chặn hủy phiếu chi lương từ Sổ quỹ (L6, L7) | S | Chặn hủy: **Có** (đổi luồng sổ quỹ) |
| 6 | Chi phí lương gross trong báo cáo tài chính hoặc ghi chú rõ công thức (L5); đối chiếu ma trận quyền Kế toán với API (L8) | S | **Có** |
| 7 | Màn Chi phí nhân công theo bè/chu kỳ (BR-LABOR-07) + bảng chấm công tháng + xuất Excel/PDF + payslip PDF | L | Không với báo cáo; **Có** với mẫu in |
| 8 | Nghỉ việc an toàn: chọn ngày làm cuối, kiểm công nợ/tạm ứng, sửa ngân hàng khi Left, khóa tài khoản kèm xác nhận (L9, L10) | M | Khóa tự động tài khoản: **Có** |

Việc nhỏ có thể làm cùng đợt: nhãn "Làm tròn xuống", ngày dd/mm/yyyy, thống nhất tên trạng thái nghỉ việc, chặn nút "Ra về" khi chưa có lượt vào, kiểm trùng CCCD (cảnh báo).

---

## 6) Câu hỏi mở

1. Chi phí lương trong báo cáo tài chính tính gross (thu nhập) hay net (sau trừ tạm ứng)? (L5)
2. Phân công lại sau khi ra về: tính hai phiên riêng (giờ nghỉ giữa không trả) hay một khoảng liên tục như hiện tại? Nếu hai phiên: giờ nghỉ cố định 1 giờ có trừ cho từng phiên hay chung ngày? (L1)
3. Có ca làm qua đêm không? Giờ công tính theo ngày bắt đầu ca hay theo ngày dương lịch? (L2)
4. Kế toán có được xem bảng lương và chi phí nhân công (chỉ xem), hay giữ "chỉ Chủ HTX" và bỏ `PAYROLL` khỏi ma trận Kế toán? (L8)
5. Hủy phiếu chi lương/tạm ứng từ Sổ quỹ: cấm, hay cho hủy có lý do và tự mở lại công nợ? Tạm ứng của nhân viên đã nghỉ thu hồi bằng cách nào? (L7, L9)
6. Khi nghỉ việc có tự khóa tài khoản liên kết không, hay chỉ nhắc như SRS (MSG-LABOR-02)? (L9)
7. Có cần thưởng/phạt/phụ cấp, lương khoán theo kg/lồng, hay lương tháng cho Staff trong phạm vi đồ án? Nếu không: ghi rõ "ngoài phạm vi" trong SRS_DEVIATIONS.
8. Cho phép Quản lý vùng sửa chấm công quá khứ (có lý do, Owner duyệt) hay chỉ Owner sửa như hiện tại? Hiện mọi ngày quên ra về phải qua Owner.
9. Chưa kiểm tra: hiển thị 360 px, hành vi thực tế của L1/L2/L6/L7 trên dữ liệu thật (tránh ghi dữ liệu demo); cần phiên chạy riêng với DB thử nếu muốn có bằng chứng chạy.
