# Nghiên cứu KiotViet "Nhân viên" và đối chiếu OMTS "Nhân sự"

Nguồn: 5 hướng dẫn web KiotViet Retail (`docs/reports/kiotviet-nhan-vien/01..05`), review OMTS `plans/reports/review-nhan-su-2026-11-19.md`, mã web + backend nhánh `feature/OMTS-227-kiotviet-style-reports`.
Ký hiệu: Có / Một phần / Thiếu. Khuyến nghị: Áp dụng / Điều chỉnh / Bỏ (kèm lý do). "PM" = cần PM/chủ đồ án duyệt (AGENTS.md: đổi bước nghiệp vụ, trường, trạng thái).

## 0. Khác biệt nền tảng (quyết định cách áp dụng)

| KiotViet (cửa hàng) | OMTS (HTX nuôi hàu) | Hệ quả |
|---|---|---|
| Nhân viên thuộc chi nhánh, chấm công theo ca/khung giờ | Nhân viên thời vụ được **phân công theo bè/việc/vùng**, vào-ra ghi theo phân công; Staff chấm công riêng | Không có "ca cố định" cho công nhân; "lịch làm việc" của OMTS là phân công + kế hoạch ngày làm (`WorkDayPlan`) |
| Lương = ca/giờ/ngày công/cố định + thưởng/hoa hồng/phụ cấp/giảm trừ + BHXH/TNCN | Lương = giờ x đơn giá theo loại việc (có hiệu lực theo ngày); `Bonus` luôn 0; `Deduction` = tạm ứng | Mô hình lương mỏng; mở rộng có kiểm soát (Phase C) |
| Hoa hồng theo doanh thu bán hàng | Không có bán hàng theo nhân viên | Bỏ nguyên bản; khoán theo kg/lồng là phương án tương đương (PM) |
| Zalo mini app, máy vân tay, GPS | App nhân viên riêng (Mobile) + QR; Web chỉ cho Owner/Quản lý vùng/Kế toán | Bỏ |

## 1. Khởi tạo dữ liệu (file 01)

| Tính năng KiotViet | OMTS hiện có | Đánh giá | Khuyến nghị |
|---|---|---|---|
| Checklist 5 bước "Thiết lập nhanh" có tiến độ (ảnh `KTNVR_191026-31`) | Không có; cài đặt rải ở Phân công/Công việc/Bảng lương | Thiếu | **Áp dụng** trang "Thiết lập nhân sự": nhân viên, loại việc + đơn giá, chấm công (nghỉ/làm tròn), kỳ lương, bảng lương đầu tiên. Tiến độ suy ra từ dữ liệu có sẵn, không thêm bảng. |
| Chọn chế độ chấm công theo ca / khung giờ | Luôn theo phân công | Không áp dụng | **Bỏ** (không có ca cố định cho công nhân) |
| Gợi ý ca Sáng/Chiều/Tối | Không | Thiếu | **Điều chỉnh** thành "Mẫu ca" tùy chọn (Phase C, PM) |
| Hình thức chấm công Zalo/vân tay/tự động | QR + thủ công (QR chưa có UI web) | Một phần | **Bỏ** Zalo/vân tay; QR thuộc Mobile |
| Thiết lập lương từng NV, "áp dụng cho toàn bộ" | Đơn giá theo loại việc (`PayRate`), không theo NV | Một phần | **Điều chỉnh** (Phase C: loại hình trả lương) |
| Tạo bảng lương đầu tiên + ngày bắt đầu kỳ + kỳ hạn | Có tạo bảng lương; `payroll-settings` (ngày bắt đầu kỳ, tự tạo) có API, **chưa có UI** | Một phần | **Áp dụng** UI cài đặt kỳ lương (Phase B) |
| Nhập Excel NV (tối đa 500, dừng/bỏ qua lỗi, file mẫu) | Có: `import/template`, `import`, `export`, `employee-import-dialog` | Có | **Điều chỉnh**: kiểm tra có chọn dừng/bỏ qua và báo lỗi theo dòng (Phase C7) |
| Xuất Excel NV theo bộ lọc/đã chọn | Có (`GET /api/employees/export`) | Có | Giữ |

## 2. Hồ sơ nhân viên (file 02)

Bố cục KiotViet (`QLNVR_280726-29`): thanh lọc trái (Trạng thái, Chi nhánh, Phòng ban, Chức danh), bảng (Mã, Mã chấm công, Tên, SĐT, CCCD, **Nợ và tạm ứng**, Ghi chú), bấm dòng mở chi tiết với tab Thông tin / Lịch làm việc / Thiết lập lương / Phiếu lương / Nợ và tạm ứng; chân trang "Ngừng làm việc" + "Cập nhật".

| Tính năng | OMTS hiện có | Đánh giá | Khuyến nghị |
|---|---|---|---|
| Danh sách + lọc + tìm | `employee-directory` (lọc trạng thái, vùng; tìm 300ms; phân trang) | Có | Thêm cột **Nợ và tạm ứng** và **Giờ công tháng này** (Phase C) |
| Thông tin cá nhân, ngân hàng | Có (tab Thông tin, Ngân hàng, sửa tại chỗ) | Có | Giữ |
| Ảnh đại diện | Không | Thiếu | **Điều chỉnh**: chữ cái đầu làm avatar; ảnh thật chỉ khi PM duyệt (cần lưu tệp) |
| Phòng ban / Chức danh | Không; có Loại nhân viên (Thời vụ/Staff), Loại công việc, Vùng làm việc | Tương đương | **Bỏ** phòng ban/chức danh; dùng Vùng + Loại việc làm "nhóm" |
| Trạng thái (Đang làm/Đã nghỉ), ngừng/làm lại | Có (`end-employment`, `resume`); thiếu chọn ngày làm cuối, cảnh báo công nợ (L9, L10) | Một phần | **Áp dụng** dialog nghỉ việc an toàn (Phase B) |
| Tài khoản đăng nhập liên kết | Có (tab Tài khoản) | Có | Giữ |
| Tab Lịch làm việc theo NV (xem bảng/danh sách) | Không | Thiếu | **Áp dụng** tab "Công và phân công" theo tháng (Phase C8) |
| Tab Phiếu lương / Nợ và tạm ứng | Có (`employee-payslips-tab`, `employee-debt-tab`) | Có | Giữ |
| Lịch sử thay đổi | Có lịch sử loại NV; audit có ở backend, chưa hiện theo NV | Một phần | **Áp dụng** tab "Lịch sử" (Phase C8) |
| Duyệt yêu cầu (tab Nhân viên/Chấm công, duyệt hàng loạt) | Có duyệt nghỉ/quên vào-ra; web hiển thị sai loại (L4) | Một phần | **Áp dụng** sửa L4; duyệt hàng loạt (Phase A/B) |
| Quản lý phòng ban/chức danh | Không | - | **Bỏ** |
| BHXH, Thuế TNCN, MST, người phụ thuộc | Không | - | **Bỏ**: công nhân thời vụ trả công nhật, ngoài phạm vi đồ án (ghi `SRS_DEVIATIONS`); chỉ xét nếu PM đưa Staff hợp đồng vào |
| Phiếu lương in/xuất, hủy phiếu | Xem phiếu; chưa in/xuất | Một phần | **Áp dụng** PDF (Phase D); hủy phiếu: không (OMTS khóa sau chốt, xem L7) |
| Thanh toán lương / tạm ứng ngoài bảng lương | Có (`payroll-payments`, dialog riêng) | Có | Giữ; thêm Idempotency-Key (L6) |

## 3. Ca làm việc, lịch làm việc (file 03, mục 1-2)

Lưới tuần (`CCR_081126-8`): hàng = nhân viên (mã, chức danh), cột = Thứ 2..CN, ô = chip màu theo ca, cột phải "Lương dự kiến" + số ca; chuyển "Xem theo nhân viên / theo ca"; Import, Xuất file; "Thêm lịch" có lặp hàng tuần và "thêm cho NV khác".

| Tính năng | OMTS | Đánh giá | Khuyến nghị |
|---|---|---|---|
| Danh mục ca (tên, giờ, giờ cho phép chấm) | Không | Thiếu | **Điều chỉnh** (C1, PM): "Mẫu ca" chỉ để Staff/giờ dự kiến, cờ qua đêm |
| Lưới lịch tuần NV x ngày | Bảng phân công **một ngày** (`workforce-screen`) | Thiếu | **Áp dụng** lưới tuần đọc `WorkAssignment` + `WorkDayPlan`, chip = bè/việc; không tạo kho lịch thứ hai |
| Lặp hàng tuần, thêm cho nhiều NV, sao chép tuần | Không; phân công từng người/ngày | Thiếu | **Điều chỉnh**: "Phân công nhiều người x nhiều ngày" + "Sao chép tuần trước"; không lặp vô hạn (con nước đổi theo ngày) |
| Làm nhiều ca/ngày | Có (nhiều chu kỳ việc/ngày, đổi việc giữa ngày) | Có | Giữ; sửa tính giờ khi phân công lại (L1, Phase A) |
| Ngày lễ tết, ngày nghỉ chi nhánh | Không | - | **Bỏ** mặc định (HTX làm theo con nước); hệ số lễ chỉ nếu PM muốn (C4) |

## 4. Chấm công (file 03, mục 3 và phần nâng cao)

| Tính năng | OMTS | Đánh giá | Khuyến nghị |
|---|---|---|---|
| Chấm công thủ công từng ô, hàng loạt, ghi nghỉ phép/không lương, đổi ca | Vào/ra từng dòng; `crew-start` (cả tổ) có API **chưa UI**; nghỉ phép chỉ ghi nhận | Một phần | **Áp dụng** "Vào làm cả tổ" (Phase B); chọn nhiều dòng vào/ra |
| Sửa chấm công + lịch sử chấm công | `PUT attendance/{emp}/{day}` có, **chưa UI**; audit đủ | Một phần | **Áp dụng** màn Sửa chấm công (Phase B) |
| Chấm công Staff | `staff-attendance` + check-in/out có API, **chưa UI** | Thiếu | **Áp dụng** (Phase B) |
| Đi muộn / về sớm / tăng ca tự tính | Không (không có ca) | Thiếu | **Điều chỉnh**: chỉ khi có Mẫu ca (C1) và chỉ **cảnh báo**, không tự phạt; phạt nhập tay ở C4 |
| Giờ làm tròn, nghỉ giữa giờ, quy đổi giờ -> công | Làm tròn xuống + nghỉ theo khung (`attendance-settings`); nhãn web sai (L15) | Một phần | Sửa nhãn "Làm tròn xuống", ngày dd/mm/yyyy (Phase A). Quy đổi giờ -> công: C3 |
| Phạt vi phạm (loại vi phạm, mức, số lần) | Không | Thiếu | **Điều chỉnh** thành "Điều chỉnh lương" loại Phạt (C4) |
| Chấm 1 lượt nhiều ca liên tục, tự động chấm công | Không | - | **Bỏ** |
| Bảng chấm công tháng/tuần (ma trận NV x ngày, chú giải trạng thái, `CCR_081126-43`) | Không (chỉ bảng một ngày; tổng giờ có trong phiếu lương) | Thiếu | **Áp dụng** Bảng chấm công tháng (C6) + xuất (Phase D) |
| Ca qua đêm | Không hỗ trợ (L2) | Lỗi | Sửa kỹ thuật ở Phase A (cần xác nhận Q3) |

## 5. Tính lương (file 04)

Bảng lương KiotViet (`TLR_081126-32`): hàng tổng cố định ở đầu; cột Lương chính / Làm thêm / Hoa hồng / Phụ cấp / Thưởng / Tổng thu nhập / Giảm trừ / BH / Thuế / Thực nhận / Đã trả / Còn cần trả; ô sửa tại chỗ; bấm số để xem công thức; nút **Lưu tạm - Thanh toán - Chốt lương**; "Tải lại dữ liệu" (toàn bộ / chỉ theo ngày làm). Phiếu lương (`TLR_081126-47`): 2 tab Thanh toán / Chấm công chi tiết, nút Hủy, Xuất file, In.

| Tính năng | OMTS | Đánh giá | Khuyến nghị |
|---|---|---|---|
| Thiết lập chung: ngày bắt đầu kỳ, tự tạo bảng, tự cập nhật | `payroll-settings` + preview (API), không UI; "tự tạo" backend ghi chưa có tác dụng (PAY-08) | Một phần | **Áp dụng** UI (Phase B); "tự cập nhật hằng ngày": **Bỏ** (chỉ nút Tải lại) |
| Cách tính giờ: thực tế / trong ca | Giờ thực tế vào-ra trừ nghỉ | Có | Giữ |
| Mẫu lương (gói thưởng/phụ cấp/giảm trừ áp cho nhiều NV) | Không; có đơn giá theo loại việc | Thiếu | **Bỏ** ở đợt này (đơn giá theo loại việc đã đóng vai trò mẫu); xem lại sau C3 |
| Loại lương: ca / giờ / ngày công / cố định | Chỉ giờ x loại việc | Một phần | **Điều chỉnh** C3 (PM): thêm Ngày công; Khoán theo kg và Lương tháng Staff là tùy chọn |
| Làm thêm giờ (hệ số 150%/200%, theo thứ/lễ) | Không | Thiếu | **Điều chỉnh** C4 (PM): chỉ hệ số giờ vượt N giờ/ngày; mặc định không bật |
| Phụ cấp, Thưởng, Giảm trừ (danh mục + từng NV) | Không (`Bonus`=0) | Thiếu | **Áp dụng** C4 "Điều chỉnh lương" (phụ cấp/thưởng/phạt, có lý do, danh mục dùng lại) |
| Vòng đời: Đang tạo -> Tạm tính -> Chốt -> Hủy; tải lại; khóa chấm công | Có đủ (`create/reload/finalize/cancel`, `PayPeriodLock`) | Có | Giữ; thêm "Rà soát trước khi chốt" + xem trước tổng (Phase A) |
| Sửa tay giá trị trên bảng tạm tính | Không | Thiếu | **Bỏ**: sửa nguồn (chấm công/điều chỉnh có lý do) để có dấu vết |
| Chốt: chọn tháng ghi nhận chi phí | Có | Có | Giữ |
| Thanh toán lương, phiếu chi vào Sổ quỹ, trả từng phần | Có, đối soát khớp | Có | Giữ |
| Tạm ứng, tự trừ kỳ sau | Có; web thiếu Idempotency-Key (L6) | Có | Sửa L6 |
| Chi phí lương vào báo cáo tài chính | Có nhưng ghi net (L5) | Lệch | Sửa theo gross (Phase A, Q1) |
| Xuất bảng lương / phiếu lương / in | Xuất Excel danh sách + bảng; chưa PDF, chưa phiếu | Một phần | **Áp dụng** Phase D |
| BHXH, BHYT, BHTN, đoàn phí, thuế TNCN | Không | - | **Bỏ** (xem mục 2) |

## 6. Hoa hồng (file 05) và phương án "khoán" cho HTX

KiotViet: bảng hoa hồng theo hàng hóa (% hoặc VND), áp theo chi nhánh/toàn hệ thống, tính trên doanh thu bán hàng của nhân viên; thưởng theo bậc doanh thu.
OMTS: không có doanh thu theo nhân viên. **Bỏ nguyên bản** (bảng hoa hồng, thưởng theo doanh thu).
Tương đương hợp lý: **lương khoán theo sản lượng** (đơn giá VND/kg thu hoạch hoặc VND/lồng ươm theo loại việc, chia cho tổ theo giờ công). Dữ liệu đã có (lô thu hoạch kg, tổ trên kế hoạch, `HarvestPlanLineId` trên phân công). Rủi ro: đổi mô hình tính lương, cần quy tắc chia và chống tính hai lần với giờ công. **Cần PM**: mặc định không làm; nếu duyệt, làm ở C3 sau Ngày công.

## 7. Điều rút ra để làm "chi tiết và chuyên nghiệp hơn"

1. Một trang thiết lập có tiến độ thay vì cài đặt rải rác.
2. Lưới tuần/tháng có chú giải màu cho trạng thái công (đủ, thiếu, chưa vào, nghỉ).
3. Bảng lương có hàng tổng cố định, số bấm được để xem công thức, trạng thái rõ, một hàng nút Lưu tạm - Thanh toán - Chốt.
4. Phiếu lương cá nhân 2 tab (Thanh toán, Chấm công chi tiết) kèm Xuất PDF/In.
5. Cột "Nợ và tạm ứng" ngay trong danh sách nhân viên; lịch sử thay đổi theo hồ sơ.
6. Điều chỉnh lương có danh mục và lý do thay vì sửa số tay.

## Câu hỏi còn mở
Xem `plan.md` mục "Câu hỏi cho người dùng".
