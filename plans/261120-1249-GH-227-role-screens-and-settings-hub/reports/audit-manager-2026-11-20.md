# Audit vai trò Quản lý vùng (quanlyvung1, DEMO-01) - 20/11/2026

Phạm vi: Web http://localhost:3002 (Next dev) + API thật :8080, Chrome headless (Puppeteer), 1280x800 và 390x844. Chỉ đọc mã nguồn; không sửa code, không commit, không đụng docker.
Ảnh: `.hallmark/audit-manager/` (git-ignored). Cột Ảnh dưới đây là tên file trong thư mục đó.
Mức: **Chặn** = trái quyết định 20/11 hoặc làm hỏng việc chính; **Khó dùng** = dùng được nhưng gây hiểu sai/lạc; **Nhỏ** = chữ nghĩa, thẩm mỹ.

## Tóm tắt

- Menu đúng phần lớn: không có bán hàng, khách hàng, lương, sổ quỹ, tài khoản. URL cấm đều ra thông báo quyền, không crash/500.
- **Chặn lớn nhất**: Sửa chấm công và Duyệt nghỉ phép chỉ dành cho Chủ HTX trong code Web (`subjectType === "CooperativeOwner"`), nên Quản lý vùng không dùng được dù quyết định 20/11 cho phép trong vùng mình. "Công việc và nghỉ phép" báo sai "Phiên đăng nhập đã hết hạn" (401).
- Tổng quan: khối "Lô thu hoạch cần xử lý" lỗi 400 trên cả desktop lẫn mobile.
- Hồ sơ nhân viên lộ số tài khoản ngân hàng, có nút Chỉnh sửa/Xóa ngân hàng, hiện 2 tab lương/nợ (403).

## Bảng phát hiện

| # | Màn | Thao tác | Kỳ vọng | Thực tế | Mức | Ảnh |
|---|-----|----------|---------|---------|-----|-----|
| 1 | /operations/workforce (chi tiết phân công) | Mở dòng phân công ngày 19/11 (đã ra về), tìm "Sửa chấm công" | Quản lý vùng sửa chấm công trong vùng mình (quyết định 20/11) | Không có nút. Code `workforce-assignment-row.tsx:29` `canCorrect = isOwner && ...`; `workforce-table.tsx:32` truyền `isOwner` theo `CooperativeOwner`. Chưa kiểm tra backend có cho phép không | Chặn | 11-wf-detail.png |
| 2 | /operations/workforce, menu "⋯" | Tìm "Duyệt yêu cầu" (nghỉ phép) | Duyệt nghỉ trong vùng mình | Menu "⋯" chỉ có "Đổi việc trong ngày". Code `workforce-toolbar-actions.tsx:28` chỉ thêm "Duyệt yêu cầu" và "Thiết lập chấm công" khi là Owner; `workforce-board-state.ts:72` không tải danh sách nghỉ phép nếu không phải Owner | Chặn | 09-wf-more.png |
| 3 | Menu Nhân sự > Công việc và nghỉ phép (/operations/my-work) | Mở màn | Hoặc màn dùng được, hoặc thông báo đúng nguyên nhân | API `my-work` trả 401 (2 lần), màn hiện "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại." dù phiên còn tốt (các trang khác vẫn chạy). Dễ bị hiểu là bị đăng xuất; đăng nhập lại cũng không hết | Chặn | 03-operations_my_work.png |
| 4 | Tổng quan > "Lô thu hoạch cần xử lý" | Mở /dashboard | Khối hiện số lô hoặc "không có" | `GET /api/operations/harvest?statusId=2904&...&action=lots` và `statusId=2901` đều 400; khối hiện "Vui lòng kiểm tra lại thông tin đã nhập." + "Thử lại" (bấm không hết lỗi). Giống hệt ở 390 px | Chặn | 01-overview.png, m-dashboard.png |
| 5 | Nhân viên > mở Đỗ Văn Cường > tab Ngân hàng | Xem hồ sơ nhân viên | Quản lý vùng chỉ xem thông tin làm việc; không tài chính | Hiện đủ số tài khoản ngân hàng (Vietinbank 99990...), nút "Xóa thông tin ngân hàng" và "Chỉnh sửa". Không biết nút lưu có bị backend chặn không (chưa bấm Lưu) | Chặn | 23-emp-tab-Ngân_hàng.png |
| 6 | Nhân viên > mở hồ sơ > nút "Chỉnh sửa" | Bấm Chỉnh sửa | Vai trò xem: không có form sửa | Mở form sửa đầy đủ (mã NV, CCCD, ngày sinh, địa chỉ). Chưa thử Lưu (tránh sửa dữ liệu demo) | Khó dùng | 24-emp-edit.png |
| 7 | Nhân viên > hồ sơ > tab "Phiếu lương", "Nợ và tạm ứng" | Bấm 2 tab | Ẩn tab không có quyền | Tab vẫn hiện, bấm ra 403 `payroll?action=employee-slips`, `payroll-payments`, nội dung "Bạn không có quyền thực hiện thao tác này." + "Tải lại" (tải lại vô nghĩa). Danh sách còn cột "Nợ lương" và "Giờ công tháng này" (đang "—") | Khó dùng | 23-emp-tab-Phiếu_lương.png, 22-employees.png |
| 8 | Nhân viên (danh sách) | Xem tất cả vùng | Chỉ nhân viên thuộc vùng được cấp | Thấy 11 người, gồm Phạm Thị Lan, Vũ Thị Mai, thaiii chỉ thuộc DEMO-02, và cột vùng của Đinh Văn Nam liệt kê DEMO-02, KV-36, KV0555. Có thể là danh bạ toàn HTX có chủ đích, cần xác nhận | Khó dùng | 22-employees.png |
| 9 | /settings (nút bánh răng) | Mở trực tiếp | Không có thiết lập (quyết định 20/11) | Mở được, chỉ có mục Nhân sự > Chấm công với link "Mở chấm công" ("Ai sửa được: Người được cấp quyền thiết lập"). Gần như trang rỗng, không giải thích; nút bánh răng luôn hiện | Nhỏ | 03-settings.png |
| 10 | /work/today | Bấm "Vào làm" Đỗ Văn Cường, rồi "Ra về" | Ghi giờ vào/ra | Chạy đúng: vào 15:09, ra 15:09, trạng thái đổi ngay, thống kê cập nhật. Không thấy thông báo thành công rõ ràng ngoài đổi trạng thái. Chỉ liệt kê 6 NV nội bộ, không có NV thời vụ | Nhỏ | 04-today-checkin.png, 04-today-checkout.png |
| 11 | /work/today > "Vào làm cả tổ (5)" | Mở hộp thoại | Hộp thoại có × và xác nhận | Có ×, danh sách 5 người, "Bỏ qua" / "Xác nhận vào làm". Chưa xác nhận (xem mục chưa kiểm). Nút tên "Vào làm" ở đây nhưng "Ghi vào làm" ở tab Nhân viên nội bộ, không thống nhất | Nhỏ | 04-today-crew.png, 09-wf-Nhân_viên_nội_bộ.png |
| 12 | Tổng quan "Chưa vào làm hôm nay" vs /work/today | So số liệu | Cùng con số chưa vào làm | Tổng quan nói "Hôm nay chưa có ai được phân công", trong khi /work/today có 6 NV nội bộ "Chưa vào làm". Hai nguồn khác nhau (phân công và nhân viên nội bộ) nhưng không giải thích; link "Chấm công" dẫn tới /operations/workforce, không phải /work/today | Khó dùng | 01-overview.png, 03-work_today.png |
| 13 | /work/schedule | Bấm ô trống ngày tương lai, chọn công việc, Lưu | Tạo được phân công | Chạy: tạo Đinh Văn Nam 22/11 "Cấp vùng · Ươm", đổi thành B1-03 Treo giống, gỡ có bước xác nhận "Xác nhận gỡ". Lịch cập nhật đúng. Hộp thoại có ×, ? và nút Đóng | OK | 06-sched-saved.png, 07-sched-changed.png, 08-sched-removed.png |
| 14 | /work/schedule | Bấm ô trống của ngày đã qua (18/11) | Thông báo ngày đã qua | Hiện "Chưa có phân công. Bạn không có quyền tạo cho ô này." Nguyên nhân thật là ngày đã qua, không phải quyền; gây hiểu sai | Nhỏ | 07-sched-past2.png |
| 15 | /work/schedule | Bấm Lưu khi chưa chọn loại công việc | Báo lỗi tiếng Việt | Hiện bong bóng trình duyệt tiếng Anh "Please select an item in the list." (HTML required, phụ thuộc ngôn ngữ Chrome). Cùng kiểu ở form Ghi nhận thả giống | Nhỏ | 06-sched-empty-save.png, 19-seeding-empty.png |
| 16 | /work/schedule > "Chép từ tuần trước" | Mở xem trước | Xem trước đúng | Chạy: bảng "Sẽ tạo 3 / Bỏ qua 3 (ngày đã qua)", nút Bỏ qua/Xác nhận. Chưa xác nhận để tránh tạo 3 phân công thật | OK | 05-sched-copy.png |
| 17 | /operations/workforce | Duyệt 3 tab Phân công / Chấm công / Nhân viên nội bộ | Mỗi tab có việc riêng | Tab Chấm công ngày 19/11 hiện dữ liệu thật. Thẻ thống kê trái ("Phân công 0, Nhân viên 0") không tính NV nội bộ nên còn 0 dù tab Nhân viên nội bộ có người đã ra về. Tiêu đề bị cắt "Phân công và chấm ..." | Nhỏ | 09-wf-Nhân_viên_nội_bộ.png, 10-wf-19-cham-cong.png |
| 18 | /operations/workforce > Tạo phân công / Đổi việc trong ngày | Mở hộp thoại | Ngày dạng dd/mm/yyyy | Đổi việc trong ngày hiện "Ngày đổi việc: 2026-11-20" (ISO), nơi khác dùng 20/11/2026. Danh sách nhân viên không phân biệt thời vụ/nội bộ | Nhỏ | 12-wf-switch.png, 12-wf-create.png |
| 19 | Phân công/chấm công (đa màn) | Rê vào nút trợ giúp "?" | Có hướng dẫn | Nút có aria-label "Hướng dẫn (chưa có)" trên nhiều màn (workforce, bè, ươm, nhân viên, lô thu hoạch...) | Nhỏ | 09-workforce.png |
| 20 | Nuôi trồng > Bắt đầu chu kỳ nuôi (/operations/seeding) | Mở bè B1-04 > Ghi nhận thả giống | Thả giống theo làn | Form chạy: chọn lô, ngày, số lượng, chọn làn/dải làn, ảnh, Lưu; × và Bỏ qua có. Chưa lưu. Tên menu "Bắt đầu chu kỳ nuôi", tiêu đề trang "Thả giống"; 3 đường /operations/seeding, /farming/cycles, /operations/harvest, /operations/material-usages cho cùng danh sách bè | Khó dùng | 19-seeding-form.png, 18-seeding-open.png |
| 21 | Form Ghi nhận thả giống | Mở danh sách lô giống | Lô còn hàng ở trên | Lô "còn 0 mảnh" (PN000028-1, PN000027-1) xếp đầu danh sách chọn | Nhỏ | 19-seeding-form.png |
| 22 | Danh sách bè (/workspace/rafts) | Xem B1-04 | Mô tả trạng thái đúng | B1-04 "Chờ thả giống · 73 ngày nuôi" (chưa thả giống nhưng có số ngày nuôi); cột "Chu kỳ nuôi" hiện đang mở từ 09/09 | Nhỏ | 03-workspace_rafts.png |
| 23 | /farming/nursery > Bắt đầu ươm | Mở hộp thoại | Bước 1/2 | Chạy, có ×; chọn lô giống có tồn. Chưa gửi. 4 đợt ươm, 2 đợt đang ươm hiển thị khớp Tổng quan | OK | 20-nursery-start.png |
| 24 | /operations/water | Chọn vùng, tìm nút ghi nhận phép đo | Ghi nước (nhiệm vụ của Quản lý vùng) | Chỉ có bảng, lọc, biểu đồ, Xuất file. Không có nút "Ghi phép đo". `NewMeasurement` trong `water-new-measurement-dialog.tsx` chỉ được re-export, không tìm thấy nơi gọi. Có thể do thiết kế (ghi trên Mobile), cần xác nhận | Khó dùng | 21-water-zone.png |
| 25 | /farming/harvest-plans | Xem kế hoạch (chỉ xem) | Danh sách + vô hiệu tạo | Trống "Chưa có kế hoạch thu hoạch." không gợi ý gì tiếp. Nhãn "Đã giao QLV", cột "KHT" ở lô thu hoạch là viết tắt khó hiểu. /farming/harvest-plans/new chặn đúng, nhưng vẫn gọi API 403 trước | Nhỏ | 03-farming_harvest_plans.png, 03-farming_harvest_plans_new.png |
| 26 | /farming/harvest-lots > mở lô | Xem nút thao tác | Quản lý vùng vận hành lô | Có Xóa, Cân lại, Xuất hủy, Đóng lô; tab "Bán hàng" chỉ hiện lịch sử kg, đơn giá "—" (không lộ giá). Không thử bấm các nút phá hủy | OK | 22-harvest-lot-open.png, 24-lot-ban-hang.png |
| 27 | Mua hàng > Nhập vật tư mới | Chọn NCC, VT005, đơn giá 150000, ghi chú QA, Lưu tạm | Lưu phiếu tạm có giá | Chạy: tạo phiếu PN000029, chuyển về danh sách. Form không có ô Vùng (không rõ phiếu thuộc vùng nào) | OK / câu hỏi | 14-receipt-ready.png, 14-receipt-saved.png |
| 28 | Vật tư & Giống > Xuất dùng mới | Chọn VT005 (tồn 0), Lưu tạm | Chặn khi hết hàng, báo rõ | Ô tìm cho chọn hàng tồn 0 ("còn 0"). Lưu tạm trả 400 `POST /api/input-items` với lỗi mơ hồ "Thông tin còn thiếu hoặc chưa hợp lệ. Kiểm tra: Hàng xuất." Cũng lỗi y hệt khi chọn giống VT001 (lô còn 10.000 mảnh) với loại xuất "Sửa chữa bè". Với VT014 (tồn 900), loại "Dùng chung cho vùng" thì lưu được XD000029 | Khó dùng | 16-uses-saved.png, 16-uses-saved2.png, 16-uses-saved3.png |
| 29 | Kinh doanh (nhóm menu) | Mở nhóm | Tên nhóm phản ánh nội dung | Quản lý vùng không bán hàng nhưng nhóm "Kinh doanh" chỉ có Xuất hủy hàu, Sản phẩm (có cột Giá bán 25.000/35.000), Truy xuất lô hàng. Tên gây hiểu nhầm là có bán hàng; có thể xem giá bán | Nhỏ | 02-menu-6.png, 03-sales_products.png |
| 30 | Mua hàng > Nhà cung cấp | Xem danh sách | NCC chỉ để chọn khi nhập | Có "Thêm nhà cung cấp", "Import file", cột "Tổng mua" (0 ₫). Tổng mua có thể coi là số liệu tài chính | Nhỏ | 03-workspace_suppliers.png |
| 31 | Menu Báo cáo | Mở nhóm | Báo cáo của vùng mình | Chỉ có "Sản lượng nuôi" (tháng này 3 lô, 44 lồng). Các báo cáo KiotViet đều "Bạn không có quyền xem chức năng này" (đúng ý), nhưng báo cáo nước/chấm công/vật tư vùng chưa có | Nhỏ | 03-operations_harvest_yield.png |
| 32 | URL cấm: /sales/orders, /workspace/customers, /operations/payroll, /workspace/accounts, /access/accounts, /operations/cash-book, /operations/hr-setup, /operations/purchase-requests, /operations/*-report | Gõ thẳng URL | Thông báo quyền rõ | Tất cả hiện "Bạn không có quyền xem chức năng này." trong khung giao diện, không crash/500. Thông báo cụt, không có nút "Về tổng quan"; riêng /operations/cash-book còn gọi 2 API 403 (collectors, types) rồi mới chặn | Nhỏ | 03-sales_orders.png, 03-operations_cash_book.png |
| 33 | 404 | /reports, /sales/invoices, đường dẫn bậy | Trang 404 tiếng Việt, có đường về | Trang 404 mặc định Next bằng tiếng Anh "This page could not be found." | Nhỏ | 03-reports.png |
| 34 | Đăng nhập tại http://127.0.0.1:3002 | Đăng nhập | Đăng nhập được | `POST /api/auth/login` trả 403, hiện "Chưa thể xác nhận phiên đăng nhập". Đăng nhập bằng http://localhost:3002 thì được. Có thể do kiểm tra origin; người dùng truy cập bằng 127.0.0.1 sẽ không vào được | Khó dùng | 00-login.png |
| 35 | Mobile 390x844 (5 màn + lô thu hoạch) | /dashboard, /work/today, /work/schedule, /operations/workforce, /inputs/uses/new, /farming/harvest-lots | Không tràn ngang, dùng được | Không có cuộn ngang trang (scrollWidth = 390). Menu nhóm chiếm ~150 px đầu mỗi màn, đẩy nội dung xuống. Lịch tuần cuộn ngang trong bảng (chấp nhận được) | Nhỏ | m-dashboard.png, m-work-schedule.png, m-work-today.png, m-workforce.png, m-uses-new.png |
| 36 | Tổng quan, các thẻ liên kết | Bấm "Mở màn", "Chấm công", đợt ươm | Link đúng đích | Link đều đúng (harvest-plans, harvest-lots, nursery, water, workforce). Nhãn "Mở màn" thiếu chữ (đọc như "mở màn trình diễn"), nên là "Mở màn hình" hoặc "Xem" | Nhỏ | 01-overview.png |
| 37 | Mở màn tạo kế hoạch ngày công (work-plan) | Tìm UI cho `POST /api/work-plans` | Có màn tạo kế hoạch ngày công | Không tìm thấy: /work-plans và /operations/work-plans đều 404, không có mục menu. Phân công theo ngày (lịch tuần, Tạo phân công) là cách duy nhất | Khó dùng | 03-work_plans.png |

## Menu thực tế của Quản lý vùng

- Tổng quan
- Nuôi trồng: Vùng nuôi, Bè nuôi, Ươm giống, Bắt đầu chu kỳ nuôi, Hành trình, Chất lượng nước, Kế hoạch thu hoạch, Lô thu hoạch
- Nhân sự: Nhân viên thời vụ (thực tế là toàn bộ nhân viên), Lịch làm việc vùng, Chấm công hôm nay, Phân công và chấm công, Công việc và nghỉ phép
- Vật tư & Giống: Giống, Lô giống, Vật tư, Xuất dùng
- Mua hàng: Nhà cung cấp, Nhập giống, Nhập vật tư, Trả giống nhập, Trả vật tư nhập
- Kinh doanh: Xuất hủy hàu, Sản phẩm, Truy xuất lô hàng
- Báo cáo: Sản lượng nuôi
- Không có: bán hàng, đơn, hóa đơn, trả hàng, khách hàng, khiếu nại chất lượng, yêu cầu mua, lương, sổ quỹ, thiết lập HR, tài khoản. Khớp kỳ vọng. Nhỏ: mục "Nhân viên thời vụ" mở ra danh sách có cả nhân viên nội bộ; không có đường vào "Nhân viên nội bộ" từ menu ngoài tab trong Phân công và chấm công.

## Dữ liệu đã tạo / thay đổi (không xóa dữ liệu demo)

| Loại | Chi tiết |
|------|----------|
| Chấm công | NV000004 Đỗ Văn Cường ngày 20/11/2026: vào 15:09, ra 15:09 (qua /work/today; không có ô ghi chú nên không đặt được tiền tố QA-audit-). Không hoàn tác được từ UI của Quản lý vùng (do mục 1) |
| Phân công | Đinh Văn Nam 22/11/2026: tạo "Cấp vùng · Ươm", đổi "B1-03 · Treo giống", rồi gỡ. Kết quả cuối: không còn phân công |
| Phiếu nhập vật tư (tạm) | PN000029, NCC Cơ sở giống thủy sản Bạch Long, VT005 x1 giá 150.000, ghi chú `QA-audit-nhap-vat-tu` |
| Phiếu xuất dùng (tạm) | XD000029, DEMO-01 / B1-03, loại "Dùng chung cho vùng", VT014 Vôi sát khuẩn x1, ghi chú `QA-audit-xuat-dung-3` |
| Lưu thất bại (không lưu) | 2 lần Lưu tạm xuất dùng bị 400 (ghi chú `QA-audit-xuat-dung`, `QA-audit-xuat-dung-2`) |
| Ngoài dự án | Lỡ tạo thư mục rỗng `C:\omts-web` (do lỗi script đường dẫn); hệ thống chặn xóa, cần xóa tay. Không chứa file |

## Chưa kiểm được

- Xác nhận "Vào làm cả tổ" (5 người), "Chép từ tuần trước" (tạo 3 phân công), lưu thả giống, bắt đầu ươm, hoàn thành phiếu nhập/xuất, đóng/xóa/cân lại lô thu hoạch: không bấm xác nhận để tránh ghi dữ liệu thật không gắn tiền tố QA-audit-.
- Sửa chấm công và duyệt nghỉ phép: chỉ xác định qua UI (không thấy nút) và đọc code; chưa biết backend có cho phép Quản lý vùng hay không (cần thử gọi API).
- Lưu form sửa nhân viên và xóa thông tin ngân hàng bằng Quản lý vùng: chưa bấm (nhạy cảm); chưa biết backend chặn hay không.
- Ghi phép đo nước: không có đường vào từ UI Web.
- Tạo kế hoạch ngày công (`POST /api/work-plans`): không có màn.
- Kế hoạch thu hoạch có dữ liệu: demo không có kế hoạch giao cho DEMO-01, chỉ thấy trạng thái trống.
- Phản hồi 400 của `statusId=2904/2901`: chưa xác định có do thiếu quyền, id trạng thái sai hay vai trò (không so được với Owner).
- Nhật ký truy xuất lô, khiếu nại, thông báo chi tiết, trang tài khoản/thiết bị: chỉ xem lướt/chưa duyệt; menu avatar chưa đọc được nội dung.
- Bàn phím/tab-focus, trình đọc màn hình, độ tương phản: không đánh giá.
- Chỉ DEMO-01; chưa thử nhiều vùng hay `nhanvien.doimk`.

## Câu hỏi chưa giải quyết

1. Sửa chấm công / duyệt nghỉ phép cho Quản lý vùng: backend đã mở quyền chưa, Web chỉ cần bỏ cổng `CooperativeOwner`, hay cần thêm kiểm tra theo vùng?
2. Danh sách nhân viên cho Quản lý vùng: chỉ nhân viên có vùng làm việc trùng vùng được cấp, hay toàn HTX?
3. Quản lý vùng có được xem số tài khoản ngân hàng, tổng mua NCC, giá bán sản phẩm không?
4. Ghi phép đo nước có chủ ý chỉ làm trên Mobile không?
5. Lỗi 403 khi đăng nhập qua 127.0.0.1 có chủ ý (allowed origins) không?
