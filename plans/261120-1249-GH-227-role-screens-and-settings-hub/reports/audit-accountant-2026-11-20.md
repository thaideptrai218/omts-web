# Audit vai Kế toán (`ketoan`) - 20/11/2026

Phạm vi: Web http://localhost:3002 (API 8080), Chrome headless (Puppeteer), 1280x800 và 390x844. Chỉ đọc mã nguồn; không sửa/xóa dữ liệu demo.
Ảnh: `D:\Đồ_án\omts-web\.hallmark\audit-accountant\` (git-ignored). Ghi chú: login chỉ hoạt động qua `localhost:3002` (qua `127.0.0.1:3002` bị 403 do kiểm tra Origin - đúng thiết kế CSRF, không phải lỗi).

Mức: Chặn = sai quyền/hỏng luồng; Khó dùng = gây hiểu nhầm/khó tìm; Nhỏ = thẩm mỹ/câu chữ.

## Dữ liệu test đã tạo
| Mã | Nội dung |
|---|---|
| KH000008 | Khách hàng `QA-audit-KH`, SĐT 0900099001 (tạo bằng tài khoản `ketoan`, thành công "Đã tạo khách hàng KH000008"). Chưa xóa/sửa. |

Không ghi phiếu thu/chi/thanh toán NCC nào (chỉ mở dialog, bấm Lưu khi rỗng để xem validation).

## Bảng phát hiện
| # | Màn | Thao tác | Kỳ vọng | Thực tế | Mức | Ảnh |
|---|---|---|---|---|---|---|
| 1 | /settings (Thiết lập) | Mở trực tiếp /settings, bấm từng mục | Chỉ thấy Sổ quỹ (mục được phép) | Thấy đủ 7 mục: Vùng nuôi, Bè nuôi, Vật tư & Giống, Loại công việc và đơn giá, Sản phẩm, Khách hàng, Sổ quỹ; mở được nội dung Vật tư&Giống, Sản phẩm, Khách hàng (có cả form thiết lập bắt buộc). Biểu tượng bánh răng trên header luôn hiện. | Chặn | 03-forbid-_settings, 20-settings-0..6 |
| 2 | /operations/purchase-receipts/new (-> supply-receipts/new) | Mở URL | Kế toán chỉ xem phiếu nhập | Mở được form lập phiếu nhập vật tư với nút "Lưu tạm / Hoàn thành" (chưa bấm lưu, cần xác nhận backend có chặn không) | Chặn | (crawl, không ảnh) |
| 3 | /workspace/customers | Xem danh sách + mở dòng | Chỉ xem/xuất | Có nút "+ Khách hàng", "Import file", trong dòng có "Chỉnh sửa", "Ngừng hoạt động", "Gộp hồ sơ". Tạo thử KH000008 thành công => backend cho phép. Cần chốt: Kế toán có được sửa khách hàng không? | Chặn (nếu SRS chỉ cho xem) | 70-customer-create, 71, 72, 60-expand-invoice |
| 4 | /operations/job-types | Mở trang, bấm "Thêm loại công việc" | Kế toán không sửa đơn giá (trừ khi có quyền riêng) | Dialog mở được (không bấm Lưu). Cần xác nhận quyền "đơn giá". | Khó dùng | 24-jobtype-add |
| 5 | Tổng quan > Việc tiền hôm nay | Mở /dashboard | Hai khối hiện số phiếu chờ | Cả hai khối hiện lỗi "Chưa thể thực hiện thao tác..." / "Vui lòng kiểm tra lại thông tin đã nhập". Network: `GET /api/operations/customer-payments?page=1&pageSize=1&action=awaiting` trả 400 `invalid-input` (pageSize=1 bị từ chối; trang customer-payments tự nó tải được danh sách). Khối "Phiếu nhập chờ thanh toán" cũng lỗi dù `supplier-payments?action=debts` trả 200. "Thử lại" không hết lỗi. Thông điệp lỗi chung chung, không nói rõ. | Chặn | 01-dashboard, 06-dashboard-full, 80-m-dashboard |
| 3b | Menu | Tìm Thanh toán NCC / Thanh toán của khách / Công nợ NCC | Có lối vào trong menu (Mua hàng / Kinh doanh / Sổ quỹ) | Ba trang /operations/supplier-payments, /customer-payments, /supplier-debts không có trong menu nào; chỉ vào được từ link trên Tổng quan (đang lỗi, xem #5) hoặc gõ URL. Menu "Sổ quỹ" chỉ có 1 mục (cần mở dropdown để vào 1 trang). Không có link "công nợ khách hàng" riêng (chỉ cột Nợ hiện tại + báo cáo). | Chặn | 02-menu-d0..d5 |
| 6 | /operations/my-work (Nhân sự > Công việc và nghỉ phép) | Mở | Thông báo "Tài khoản chưa gắn hồ sơ nhân viên" hoặc ẩn mục | Hiện "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại." (API 401 `rejected`) trong khi phiên còn hiệu lực => gây hiểu nhầm. Mục này hiện trong menu của Kế toán. | Khó dùng | 07-mywork |
| 7 | Quyền nông nghiệp | /farming/cycles, /farming/zones, /farming/seed-lots, /workspace/zones, /inputs/* | Thông báo từ chối hoặc ẩn | Mở được (có thể là quyền xem). /farming/cycles hiện "Chưa có vùng nuôi nào được phép xem" (sai: Kế toán có tất cả vùng, chỉ thiếu quyền Hành trình). /farming/zones log lỗi hydration mismatch. | Khó dùng | 03-forbid-_farming_cycles |
| 8 | /workspace/rafts và /farming/rafts | Mở | Thông báo từ chối rõ ràng | Bộ lọc vẫn hiện, bảng trống kèm "Bạn không có quyền thực hiện thao tác này. Tải lại" (API 403). Nút "Tải lại" vô nghĩa với lỗi quyền. Các trang cấm khác (/work/schedule, /workspace/accounts, /operations/hr-setup, /access/roles, /audit...) hiện thông báo rõ, không crash => trang này không đồng nhất. | Khó dùng | 03-forbid-_farming_rafts |
| 9 | URL cấm | /work/schedule, /workspace/accounts, /operations/hr-setup, /access/accounts->/workspace/accounts, /access/roles, /audit, /system/accounts, /cooperative/profile, /trader-requests, /work/today, /farming/harvest-lots, /farming/harvest-plans(/new), /farming/nursery, /sales/orders/new | Thông báo quyền, không crash | Đạt: đều hiện thông báo tiếng Việt, không trắng/500. Lưu ý /trader-requests ghi console error "Next.js encountered uncached data during prerendering" và /farming/harvest-plans/new gọi API 403 trước khi hiện thông báo. Các trang này thiếu thẻ H1 (chỉ có đoạn văn). | Nhỏ | 03-forbid-* |
| 10 | Nhân viên > mở dòng | Bấm các tab Thông tin / Ngân hàng / Tài khoản đăng nhập | Ẩn tab không có quyền | Tab hiện hết nhưng 3 tab báo "Bạn không có quyền xem thông tin cá nhân và ngân hàng" (tab "Tài khoản đăng nhập" cũng dùng cùng câu, sai nội dung). Cột bảng bị cắt tên ("Đinh Văn N..."). | Khó dùng | 60-expand-employee |
| 11 | Thiết lập > Sổ quỹ > Ví điện tử | Mở tab | Nút "Thêm ví", trạng thái trống có hướng dẫn | Nút vẫn ghi "Thêm tài khoản"; trạng thái trống chỉ "Chưa có ví điện tử nào." không có nút thêm tiếp. Nút sửa dòng chỉ là biểu tượng bút chì không có nhãn. | Nhỏ | 22-ewallet, 20-settings-6 |
| 12 | Sổ quỹ | Tìm "cài đặt sổ quỹ" | Có lối vào cài đặt từ trang Sổ quỹ | Cài đặt Sổ quỹ chỉ ở Thiết lập (bánh răng > Sổ quỹ), không có link từ trang Sổ quỹ. Nút "Hướng dẫn (chưa có)" xuất hiện ở hầu hết trang danh sách (thông điệp "chưa có" lộ ra người dùng). | Nhỏ | 05-cashbook-row |
| 13 | Sổ quỹ - số liệu | Xem tháng này | Số hợp lý | Quỹ đầu kỳ -52.500.000, Tồn quỹ -64.730.000 (âm). Có thể do dữ liệu demo, cần xác nhận không phải lỗi tính. | Nhỏ | 05-cashbook-row |
| 14 | Dialog Ghi thanh toán NCC (và các form dùng validate trình duyệt) | Bấm "Lưu giao dịch" khi trống | Lỗi tiếng Việt cạnh trường | Hiện bong bóng tiếng Anh gốc của trình duyệt "Please select an item in the list." Dialog có × và "Đóng", Esc đóng được. Dialog phiếu thu/chi lại dùng lỗi tiếng Việt ("Chọn loại chi.") => không đồng nhất. | Nhỏ | 13-supplier-submit-empty, 90-cash-empty-submit |
| 15 | Bộ chọn ngày giờ (dialog thanh toán NCC) | Bấm biểu tượng lịch | Popup neo vào ô nhập | Popup bật ở góc trên trái màn hình, xa ô; tiêu đề thứ "T4" và "T5" lệch cột so với ngày (T5 nằm lệch ~14px). Chọn Giờ/Phút, "Hôm nay", "Bây giờ", "Đóng" đều có. | Nhỏ | 12-supplier-datepicker |
| 16 | Dialog Ghi nhận thanh toán khách (/operations/customer-payments) | Mở trang | Chưa chọn khách | Danh sách tự highlight "Chị Hoa Cái Rồng" (dòng 2) mà không phải dòng đầu/không chọn; dễ ghi nhầm khách. Tab "Chờ xác nhận" hoạt động (2 khoản 5,2tr). | Khó dùng | 30-customer-payments, 32-cust-pay-await |
| 17 | Báo cáo > Xu hướng giá | Mở | Có dữ liệu (đã có 2 hóa đơn T11) | "Chưa có dữ liệu để hiển thị", bộ lọc Sản phẩm/Vùng trống, "Kỳ báo cáo: —". Bố cục khác các báo cáo còn lại (nút Xuất file nằm trong khung lọc, không có ô tìm). Trang "Vấn đề sau bán" cũng khác bố cục. | Khó dùng | 40-price-trend-report |
| 18 | Báo cáo > Tài chính | Xem biểu đồ | Nhãn trục đọc được | Nhãn trục Y "-120 tr" xuống dòng đè lên nhãn "01/2026"; đường cong làm tròn vượt dưới các điểm. Lợi nhuận năm -225.919.860 (cần đối chiếu số). | Nhỏ | 40-financial-report |
| 19 | Xuất file (sổ quỹ, NCC, khách hàng, hóa đơn, đặt hàng, nhập giống, bảng lương, công nợ NCC, báo cáo bán hàng) | Bấm Xuất file | Tải xlsx | Đạt: tất cả API trả 200 và tải được .xlsx. Không đồng nhất: Cuối ngày/Chi phí nhân công là menu "Tải xuống" (PDF + Excel), còn lại tải thẳng xlsx; công nợ NCC ghi "Xuất Excel"; tên file lẫn tiếng Anh/Việt (`payrolls-...`, `sales-invoice-list-...`, `so-quy`). | Nhỏ | 50-export-* |
| 20 | Tổng quan - a11y | Duyệt heading | H1 trước, thứ tự H1>H2>H3 | Trang có 12 thẻ H3 rỗng (menu) trước nội dung, H2 "Việc tiền hôm nay" đứng trước H1 "Tổng quan"; hai tiêu đề lớn ngang cấp trên cùng trang. Liên kết "1 khách hàng còn nợ ... →" tên truy cập chứa mũi tên. | Nhỏ | 01-dashboard |
| 21 | Mobile 390x844 (Tổng quan, Sổ quỹ, Thanh toán NCC, Thanh toán khách, Bảng lương, Khách hàng) | Xem | Dùng được | Không tràn ngang. Nhưng: thanh menu chiếm ~150px, tên HTX bị xuống 4 dòng; trên Sổ quỹ thẻ tổng "Tổng thu / Quỹ đầu kỳ" bị cắt mép trái ("ổng thu", ".000"); bảng sổ quỹ cắt cột (cần cuộn ngang); nhiều nút/liên kết cao <32px (17-33 phần tử mỗi trang). | Khó dùng | 80-m-* |
| 22 | 404 | /operations/customer-debts, /sales/invoices/new, /nonexistent-page | Trang 404 tiếng Việt | Hiện nguyên bản Next.js "404 This page could not be found." tiếng Anh, không có menu/đường về. | Nhỏ | (crawl) |
| 23 | Click hàng hóa đơn/đơn đặt hàng | Bấm giữa dòng | Mở chi tiết dòng | Bấm trúng ô "Mã KH" thì chuyển sang trang Khách hàng (link nằm sát giữa dòng), người dùng mất ngữ cảnh. Phải bấm mũi tên đầu dòng để mở. | Nhỏ | 60-expand-invoice |

## Đã đạt (không lỗi)
- Thứ tự menu: Tổng quan, Sổ quỹ, Mua hàng, Kinh doanh, Báo cáo, Vật tư & Giống, Nhân sự. Không có menu Nuôi trồng/Công việc/Truy cập.
- Báo cáo (8 trang) đều tải 200, không lỗi console. Phiếu nhập, hóa đơn bán, đơn hàng, sản phẩm, bảng lương, thanh toán lương, chi phí nhân công hiển thị, xuất được.
- Dialog Phiếu thu/Phiếu chi, Ghi thanh toán NCC, Thêm tài khoản: đều có × và nút huỷ, Esc đóng.

## Chưa kiểm tra được
- Không bấm Lưu phiếu thu/chi/thanh toán NCC/khách, xác nhận khoản chờ (PT000001/PT000002), hủy phiếu, mở lại phiếu, vì sẽ đổi dữ liệu demo thật (không xóa được).
- Chưa thử lưu phiếu nhập (#2), lưu loại công việc (#4), Import khách (#3), sửa tài khoản ngân hàng/loại thu chi.
- Chưa xác nhận kết quả backend cho #5 (lý do khối "Phiếu nhập chờ thanh toán" lỗi dù API 200) vì không đọc mã nguồn.
- Chưa kiểm tra bàn phím/focus ring chi tiết và trình đọc màn hình; chưa kiểm tra 1024px.
- Bảng lương: không đánh giá UX theo yêu cầu (redesign hoãn); chỉ ghi nhận không có click chết hay lỗi.

## Câu hỏi mở
1. Kế toán có quyền tạo/sửa khách hàng, tạo phiếu nhập và đơn giá công việc không? Nếu không, backend cần chặn (hiện cho tạo KH000008).
2. Mục Thiết lập: Kế toán chỉ nên thấy "Sổ quỹ" hay thêm Sản phẩm/Khách hàng (chỉ xem)?
3. Quỹ đầu kỳ âm là dữ liệu demo hay lỗi tính?
