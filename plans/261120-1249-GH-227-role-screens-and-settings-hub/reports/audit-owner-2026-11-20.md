# Audit giao diện vai trò Owner - 20/11/2026

Phạm vi: đăng nhập `owner`, Chrome thật (headless, Puppeteer), 1280x800 và 390x844 (6 màn). Web `http://localhost:3002` (dev, Turbopack), API `http://localhost:8080`. Mã nguồn chỉ đọc, không sửa.
Ảnh: `D:\Đồ_án\omts-web\.hallmark\audit-owner\` (ghi tên file ở cột cuối). Mức: Chặn / Khó dùng / Nhỏ.

## 1. Dữ liệu test đã tạo (cần dọn)

| Loại | Giá trị | Ghi chú |
|---|---|---|
| Tài khoản | `QA-audit-User1` (username `qa.audit.user1`, SĐT 0911999001) | Tạo kèm Quản lý vùng - Vùng nuôi Ngọc Vừng (còn hiệu lực) |
| Phân quyền | Quản lý vùng - Vùng nuôi Minh Châu cho QA-audit-User1 | Đã thu hồi (lý do "QA-audit thu hoi thu") - còn trong lịch sử |
| Trạng thái | Khóa rồi mở khóa; đặt lại mật khẩu 1 lần | Hiện đang Hoạt động |

Không tạo gì khác. Các bản ghi sau KHÔNG phải của audit này (đã có sẵn/agent khác): khách hàng `QA-audit-KH` (KH000008), tài khoản `Scratch ...`, phân công Đinh Văn Nam - Ươm 20/11, chấm công Đỗ Văn Cường 15:09.

## 2. Bảng phát hiện

| # | Màn | Thao tác | Kỳ vọng | Thực tế | Mức | Ảnh |
|---|---|---|---|---|---|---|
| 1 | `/operations/purchase-requests` (đích của "Chờ chủ duyệt" ở Tổng quan) | Bấm "1 yêu cầu mua chờ phản hồi" | Danh sách yêu cầu mua + nút phản hồi | `GET /api/operations/purchase-requests?action=list` trả 502 `{"status":"invalid-response"}`; màn báo "Chưa tải được dữ liệu... báo nhóm kỹ thuật kiểm tra contract". Backend `GET /api/purchase-requests` trả 200 (items có `customer{...,code}`, `status:"Awaiting response"`, `code`, `sendings`, `rowVersion`) nhưng schema Web `purchaseRequestPageSchema` từ chối. Lặp lại 3 lần. Owner không duyệt được yêu cầu nào | Chặn | operations_purchase_requests.png |
| 2 | Cùng màn #1 | Đọc thông báo lỗi | Câu cho người dùng | Câu lỗi hướng tới dev ("kiểm tra contract") | Nhỏ | operations_purchase_requests.png |
| 3 | Toàn app (dev) | Đăng nhập bằng `http://127.0.0.1:3002` | Vào được | `POST /api/auth/login` 403 (origin 127.0.0.1 khác localhost), form báo "Chưa thể xác nhận phiên đăng nhập" khó hiểu. Dùng `localhost:3002` thì vào bình thường. Có thể chỉ là cấu hình dev origin | Khó dùng | 00-after-login.png |
| 4 | Toàn app | Mở trang ở tab nền / cửa sổ ẩn (`visibilityState=hidden`) | Tự tải | Kẹt ở "Đang tải hệ thống quản lý HTX..." 20s+, không gọi API nào; chỉ chạy khi tab hiển thị. Giống cảm giác "bấm không ra gì" khi mở link ở tab mới | Khó dùng (chưa xác nhận do dev) | dbg.png |
| 5 | Phiên đăng nhập | Dùng liên tục ~20 phút | Báo hết phiên / tự gia hạn | Hộp thoại "Phân công" ở `/work/schedule` đứng ở skeleton >15s, không lỗi, không 401 hiện ra; ngay sau đó tải lại trang bị đẩy về `/login`. Nghi hết phiên nhưng dialog không báo | Khó dùng (nghi) | sched-cell-today2.png |
| 6 | `/settings` | Bấm 19 mục sidebar | Mở panel | Mọi mục đều mở được, không lỗi console/mạng. 13/19 panel chỉ là 1 đoạn mô tả + nút "Mở ..." (thêm 1 click mới tới màn thật); chỉ Thu hoạch, Vật tư & Giống, Sản phẩm, Khách hàng, Sổ quỹ sửa tại chỗ | Nhỏ | settings-02.png, settings-08.png, settings-10.png |
| 7 | `/settings` | Ô tìm "tài khoản", "phân quyền", "mật khẩu", "nhân viên", "zone" | Ra Quản lý người dùng / Vai trò | Không có kết quả ("Không tìm thấy thiết lập phù hợp") và không gợi ý gì tiếp. Chỉ khớp theo tên mục ("lương", "giá", "vùng", "chứng nhận", "don gia" không dấu đều ra) | Khó dùng | settings-search-t_i_kho_n.png, settings-search-ph_n_quy_n.png |
| 8 | `/settings` -> Chứng nhận HTX | Đọc nút | "Mở Chứng nhận HTX" | Nút ghi "Mở chứng nhận htx" (viết thường hóa cả HTX) | Nhỏ | settings-03.png |
| 9 | `/settings` | Đọc dòng "Ai sửa được: ..." | Câu dễ hiểu | "Ai sửa được: Chủ hợp tác xã; người khác chỉ xem", "Người được cấp quyền thiết lập" - lặp ở mọi panel, khá cứng | Nhỏ | settings-08.png |
| 10 | `/settings` -> Thiết lập kỳ lương / menu bánh răng | Bấm "Mở thiết lập kỳ lương" | Màn thiết lập kỳ lương | Tới `/operations/payroll-settings` và bị chuyển thành `/operations/payroll` (Bảng lương); phải tìm nút "Thiết lập kỳ lương" trong trang. Menu "Ngưỡng nước" -> `/operations/water` (trang theo dõi, không phải trang chỉnh ngưỡng) | Khó dùng | operations_payroll_settings.png |
| 11 | Menu bánh răng | Bấm tiêu đề nhóm "Nhân sự" | Hub hoặc nhóm | Đi thẳng `/operations/hr-setup`; các dòng con đi `/settings?section=...` - hai kiểu điều hướng khác nhau trong cùng menu | Nhỏ | hdr-gear.png |
| 12 | `/workspace/accounts` | Mở bảng ở 1280px | Thấy cột Trạng thái | Cột Trạng thái (Hoạt động/Đã khóa) nằm ngoài khung, phải cuộn ngang | Khó dùng | workspace_accounts.png |
| 13 | `/workspace/accounts` -> Tạo người dùng | Bấm Lưu khi trống | Lỗi từng ô | Chỉ 1 dòng đỏ ở cuối "Số điện thoại gồm đúng 10 chữ số..."; 3 ô bắt buộc khác không đánh dấu lỗi (`aria-invalid` null). Tạo thật (tên, username, SĐT, Quản lý vùng + vùng) thành công, hiện mật khẩu tạm 1 lần, có nút sao chép | Khó dùng | acc-create-empty.png, acc-create-result.png |
| 14 | Chi tiết người dùng | Đọc tiêu đề + nút | Nhất quán | Nút "Ngừng hoạt động" nhưng hộp thoại "Khóa tài khoản?", trạng thái "Đã khóa", nút ngược "Cho phép hoạt động" -> hộp "Mở khóa tài khoản?". 3 cách gọi cho 1 hành động | Nhỏ | qa-lock-click.png |
| 15 | Chi tiết người dùng | Xem lịch sử/thu hồi | Tiếng Việt | Hiện "Zone Manager · Hiệu lực", nút "Thu hồi · Zone Manager", hộp "Zone Manager · Vùng nuôi Minh Châu" (tên vai trò tiếng Anh) trong khi nơi khác là "Quản lý vùng" | Nhỏ | qa-revoke-click.png |
| 16 | Chi tiết người dùng | Cuộn | Form cấp quyền gần danh sách | Tiêu đề "Lịch sử phân quyền vùng" nằm trên form "Thêm phân quyền"; dialog rất dài, sau khi thêm form ở xa thẻ mới | Nhỏ | qa-grant-added.png |
| 17 | Chi tiết người dùng | Nút bị tắt | Có lý do | "Thêm phân quyền" tắt cho tới khi chọn vùng; "Đặt lại mật khẩu" tắt khi tài khoản đã khóa; "Xác nhận thu hồi"/"Đồng ý" tắt cho tới khi nhập lý do. Không title/aria-describedby/chữ giải thích; ô lý do không đánh dấu bắt buộc | Khó dùng | qa-reset-click.png, qa-revoke-click.png |
| 18 | Chi tiết người dùng | Đặt lại mật khẩu -> Đồng ý | Phản hồi nhanh | Nút đổi "Đang xử lý..." 2-5s, hộp xác nhận biến mất trước khi kết quả hiện | Nhỏ | qa-reset-done2.png |
| 19 | Vai trò (tab/`/workspace/roles`) | Bấm "Xem quyền của vai trò" | Thấy quyền | Ma trận nằm dưới màn hình; bấm nút gần như không đổi gì nhìn thấy (Quản lý vùng đã chọn sẵn), không cuộn tới ma trận | Khó dùng | roles-view.png |
| 20 | Danh sách người dùng | Lọc, cột, tìm | Hoạt động | Lọc Kế toán -> 1, Đã khóa -> 7, chọn cột OK. Tìm không ra: "Không có người dùng phù hợp bộ lọc." không có nút "Đặt lại bộ lọc" | Nhỏ | acc-filter-locked.png, acc-colpicker.png |
| 21 | Mọi màn danh sách | Nút "?" cạnh Chọn trường hiển thị | Mở hướng dẫn | Nút bị vô hiệu, aria "Hướng dẫn (chưa có)" - nút chết hiển thị trên hầu hết màn (khiếu nại chính xác "bấm không ra gì") | Khó dùng | acc-help.png, employees-list.png |
| 22 | `/workspace/employees` | Đọc menu và tiêu đề | Cùng tên | Menu "Nhân viên thời vụ" nhưng trang tên "Nhân viên" và liệt kê cả Nội bộ lẫn Thời vụ | Nhỏ | employees-list.png |
| 23 | Hồ sơ nhân viên -> Tài khoản đăng nhập | Bấm "Cấp tài khoản đăng nhập", tích "Phân quyền ngay" | Chọn vai trò + vùng | Đúng: có Quản lý vùng/Kế toán, vùng, cảnh báo "chưa chọn vai trò thì chưa đăng nhập được". Không bấm Lưu để khỏi sửa dữ liệu demo | - | emp-issue-dialog.png, emp-issue-grant.png |
| 24 | `/operations/hr-setup` | Mở trang | 6 bước | Bước 2 "Đang kiểm tra" 5-10s với thanh rỗng; trong lúc đó bước 3-6 hiện "Chưa mở khóa theo thứ tự" dù đã "Đã xong". Sau khi xong: 5/6, bước 6 "Cần xem lại" đỏ vì chưa có phân công hôm nay. Tiêu đề mobile "Thiết lập nhanh nhân sự" khác desktop "Thiết lập nhân sự" | Nhỏ | operations_hr_setup.png, hr-setup-after12s.png |
| 25 | `/work/today` | Đọc nhãn | Rõ | Nút "Vào làm cả tổ (7)" nhưng chỉ có 1 nhóm "Nhân viên nội bộ" - "tổ" chưa được giải thích. Nút "Vào làm" từng người và "Vào làm cả tổ" KHÔNG bấm (sẽ ghi chấm công thật) | Nhỏ | work_today.png |
| 26 | `/work/schedule` | Bấm ô ngày hôm nay | Form phân công | Có form (Loại công việc, Bè, Lưu phân công) sau ~0,6s; bấm Lưu trống -> tooltip trình duyệt tiếng Anh "Please select an item in the list." Ô quá khứ: "Ngày đã qua · Chỉ xem... Bạn không có quyền tạo cho ô này" (Owner vẫn thấy câu "không có quyền") | Nhỏ | sched-form.png |
| 27 | `/work/schedule` | "Chép từ tuần trước" | Xem trước | Có bảng xem trước: 3 dòng "Sẽ tạo", 3 "Bỏ qua: ngày đã qua", nút "Xác nhận chép 3 phân công" - tốt. Không bấm xác nhận | - | sched-copy-preview.png |
| 28 | `/work/schedule` | Ô trống | Nhãn rõ | 56 nút đều tên "—" (đọc màn hình không phân biệt nhân viên/ngày) | Nhỏ | work_schedule.png |
| 29 | `/operations/workforce` | Menu ⋯ | Dễ tìm | "Thiết lập chấm công", "Thêm loại công việc", "Duyệt yêu cầu", "Đổi việc trong ngày" chỉ nằm trong ⋯ (2 click). Mở đủ 4 hộp thoại, × đóng được. "Duyệt yêu cầu" rỗng chỉ ghi "Không có dữ liệu phù hợp." | Nhỏ | wf-more-menu.png |
| 30 | `/operations/workforce` | Các tab Phân công / Chấm công / Nhân viên nội bộ | Đủ | Cả 3 tab mở được. Ở tab "Nhân viên nội bộ" bộ lọc trái (trạng thái chấm công, "Tạo phân công") vẫn hiện nhưng không liên quan; tiêu đề cắt "Phân công, chấm côn..."; ⋯ đè lên banner hướng dẫn | Nhỏ | wf-tab-staff.png |
| 31 | `/operations/workforce` | Cột Bè | Thống nhất | Phân công cấp vùng hiện "Chưa xác định" trong khi lịch ghi "Cấp vùng" | Nhỏ | wf-more-menu.png |
| 32 | Tổng quan | Bấm Theo vùng, Khối lượng, 3 thẻ thông báo | Đổi biểu đồ/đi đúng | Đều chạy; 3 thẻ đi `/operations/purchase-requests` (lỗi #1), `/operations/customer-report`, `/farming/harvest-lots`. "Hoạt động gần đây" lặp 7 dòng "Đổi trạng thái nhân viên - System" | Nhỏ | dashboard.png, dash-by-zone.png |
| 33 | Chuông thông báo | Mở | Tiêu đề nghĩa | 82 chưa đọc, nhiều dòng chỉ ghi "Thông báo mới" không nội dung | Nhỏ | hdr-notifications.png |
| 34 | `/operations/water` | Mở | Số liệu khớp | Thẻ "Vùng chưa đo gần đây: 5" trong khi DEMO-01/02 có lần đo 3 ngày trước; tiêu đề "Theo dõi chất lượng ..." bị cắt | Nhỏ | operations_water.png |
| 35 | Các nút "Xuất file / Xuất Excel" (lô thu hoạch, vật tư, NCC, nhập/trả hàng...) | Bấm | Thấy đang xuất/đã tải | Chỉ gọi `GET ...action=export`, không toast/trạng thái trên màn. Headless không thấy file tải nên chưa kết luận đã tải được | Khó dùng (chưa xác nhận) | dbg4.png |
| 36 | `/inputs/supplies` -> Import file | Mở hộp thoại | Ô chọn file tiếng Việt | Hiện thêm control gốc tiếng Anh "Choose File No file chosen" dưới nhãn "Chọn file" | Nhỏ | sweep-_inputs_supplies-2.png |
| 37 | Hộp thoại (zones, rafts, nursery, seeds, suppliers, products, cash-book thu/chi, import x4, workforce x4, schedule x2) | Bấm × | Đóng | 100% hộp thoại thử đều có × và đóng được; Esc cũng đóng | - | sweep-*.png |
| 38 | `/operations/lot-tracing`, `/operations/quality-claims` | Quét nút chính | Có hành động | Không có nút hành động trên thanh công cụ (trang tra cứu/xem) - chưa thao tác sâu | Nhỏ | operations_lot_tracing.png |
| 39 | `/operations/financial-report` | Xem biểu đồ | Đọc đúng | Đường lợi nhuận làm trơn đi xuống tới ~-170 tr giữa các tháng dù dữ liệu theo tháng; nhãn trục "-120 tr" chồng "01/2026" | Nhỏ | operations_financial_report.png |
| 40 | `/operations/end-of-day-report` | Mở | Có dữ liệu | Rỗng "Không có giao dịch..." (hôm nay không có bán); phải bấm "Xem báo cáo" để nạp; có "Tải xuống"/"In" | Nhỏ | operations_end_of_day_report.png |
| 41 | Dev server (môi trường) | Quét nhiều trang | Sạch | Lúc quét có lỗi biên dịch `nursery-detail-panel.tsx:95-103 Expression expected` do file đang được sửa; làm 500 cho `/api/account/profile`, `/api/inbox`, `/api/workspace/zones`, `/api/supplier-debts` ở một lượt. Chạy lại thì hết | Nhỏ (môi trường) | - |
| 42 | Mobile 390x844 (6 màn) | Mở | Không tràn ngang | Không tràn ngang (scrollWidth = 390). Menu chính chiếm ~245px trước nội dung; tên HTX xuống 3 dòng; ở /settings và /workspace/accounts khối "Bắt đầu từ đây" đẩy nội dung xuống dưới màn đầu. Nhiều nút cao <36px (4-34 mỗi màn) | Nhỏ | m-settings.png, m-work_schedule.png, m-workspace_accounts.png |

## 3. Top 10

1. `/operations/purchase-requests` lỗi 502 invalid-response: "Chờ chủ duyệt" dẫn tới màn không dùng được (#1).
2. Nút "?" Hướng dẫn bị vô hiệu ("chưa có") trên hầu hết màn danh sách - nút chết (#21).
3. Nút bị tắt không giải thích: Thêm phân quyền, Đặt lại mật khẩu, Xác nhận thu hồi/Đồng ý (#17).
4. Tìm kiếm Thiết lập không hiểu "tài khoản/phân quyền/mật khẩu/nhân viên" (#7); 13/19 panel chỉ là link "Mở..." (#6).
5. Hộp thoại/trang đứng ở "Đang tải" khi tab nền hoặc hết phiên, không báo gì (#4, #5).
6. Tạo người dùng: lỗi chỉ ở một dòng cuối, ô trống không đánh dấu (#13).
7. "Xem quyền của vai trò" gần như không đổi gì nhìn thấy, ma trận dưới màn (#19).
8. Cột Trạng thái người dùng ngoài khung 1280px (#12).
9. Xuất file không có phản hồi trên màn (#35).
10. Từ vựng không nhất quán: Ngừng hoạt động/Khóa/Cho phép hoạt động; "Zone Manager"; "Nhân viên thời vụ" vs trang "Nhân viên"; "Chưa xác định" vs "Cấp vùng" (#14, #15, #22, #31).

## 4. Chưa kiểm tra được / giới hạn

- Không bấm: "Vào làm", "Vào làm cả tổ", "Vào làm tất cả đang chờ" (ghi chấm công thật); "Xác nhận chép 3 phân công"; "Lưu phân công" hợp lệ; Cấp tài khoản cho nhân viên thật (tránh sửa dữ liệu demo). Chưa tạo thử luồng "Phân quyền ngay" tới cùng.
- Chưa thử tạo/duyệt phiếu ở form đầy đủ: Nhập giống/vật tư, Trả hàng nhập, Xuất dùng/hủy, Lập kế hoạch thu hoạch, Phiếu thu/chi (chỉ mở được form/hộp thoại, đóng được).
- Chưa kiểm tra sâu Kinh doanh (đơn đặt, hóa đơn, trả hàng bán, khiếu nại, truy xuất) và từng báo cáo ngoài việc tải trang không lỗi mạng/console.
- Tải file xuất (Excel/PDF/CSV) không xác minh được trong headless.
- Mobile: chỉ 6 màn, chỉ xem bố cục, không thao tác.
- Không có "role blocks" riêng cho Owner trên Tổng quan để so sánh ngoài thẻ KPI, biểu đồ, Chờ chủ duyệt, Thông báo, Hoạt động.
- Mọi quan sát chạy trên dev server (chậm, HMR do agent khác sửa file); các điểm #3, #4, #5, #41 có thể là đặc thù dev.

## Câu hỏi chưa giải quyết

- Backend `PurchaseRequest` trả field nào làm `purchaseRequestPageSchema` fail (cần chạy parse schema với payload thật)?
- #5 có đúng là hết phiên (refresh token) không, và dialog có nên chuyển về đăng nhập?
- Nút "?" nên ẩn hay bổ sung nội dung hướng dẫn?
