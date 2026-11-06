# Rà soát Hallmark và đổi hệ màu Web sang xanh biển

Ngày: 25/10/2026. Phạm vi: `omts-web`, nhánh hiện tại; chỉ thay đổi giao diện, không đổi luồng nghiệp vụ hoặc hợp đồng API.

## Kết luận về Hallmark

[Hallmark](https://github.com/Nutlope/hallmark) là bộ hướng dẫn thiết kế và công cụ rà soát trang do AI tạo, không phải thư viện React để lắp sẵn component. Bản v2 có hệ chủ đề, lệnh rà soát và kiểm tra trình duyệt. Các tiêu chí phù hợp với OMTS là dùng màu nhất quán qua token, chữ đủ tương phản, focus rõ, giảm chuyển động theo thiết lập của người dùng và kiểm tra ở nhiều chiều rộng. Quy trình dựng lại trang, tạo HTML/CSS độc lập và đổi bố cục hàng loạt không phù hợp với lần đổi màu này vì Web hiện là ứng dụng Next.js đang có luồng và component thật. Vì vậy không cài thêm Hallmark, không thay cây component và không coi chủ đề mẫu của Hallmark là thiết kế bắt buộc.

## Thay đổi

1. Chuyển màu thương hiệu từ xanh lục sang xanh biển đậm `#075985`; màu hover/sidebar `#0c4a6e`; nền nhấn `#e0f2fe`. Nền trang và bề mặt phụ chuyển sang sắc xanh rất nhạt để giữ độ dễ đọc.
2. Đổi chữ và trang trí còn dùng màu teal ở trang đăng nhập, sidebar, logo và bảng điều hành sang màu sky tương ứng. Biểu đồ nhân sự dùng token `--omts-color-primary`, tránh trở lại màu cũ khi đổi theme lần sau.
3. Giữ xanh lục tại thông báo **thành công**, hồng/đỏ tại **lỗi**, vàng tại **cảnh báo**. Đây là mã màu phản hồi, không phải màu thương hiệu.

## Kiểm tra

- Tỷ lệ tương phản: chữ xanh chính trên trắng **7,56:1**; chữ sidebar sky-50 80% trên nền sidebar **6,31:1**; nhãn sidebar sky-100 80% **5,90:1**. Các cặp này vượt mức 4,5:1 cho chữ thường.
- Kiểm tra trực tiếp `/login` và `/dashboard` ở viewport **360 px** và **1024 px**: không tràn ngang (`scrollWidth` lần lượt bằng chiều rộng nội dung có thể cuộn; ở dashboard 360 px: 345 so với viewport 360 do thanh cuộn dọc). Nội dung, nút và biểu đồ hiển thị đúng tông biển.
- `npm run lint`: đạt. `npm run typecheck`: đạt. `npm run build`: đạt. `npm test` chạy tuần tự: **1254 đạt, 27 bỏ qua**.

Lần `npm test` đầu chạy đồng thời với lint và dev server bị timeout ở bước `beforeAll` tải cấu hình ESLint của fixture cookie (giới hạn 10 giây), dù 1245 test còn lại đạt. Sau khi ngừng dev server và chạy tuần tự, toàn bộ test đạt trong 5,65 giây. Đây là bằng chứng phù hợp với giả thuyết tranh chấp tài nguyên khi chạy đồng thời; chưa có bằng chứng lỗi chức năng ở thay đổi màu.

Ảnh chụp Chrome dòng lệnh đầu tiên trông bị cắt ngang ở 360 px vì cửa sổ Chrome không áp dụng viewport CSS 360 px như dự kiến. Sau đó đặt viewport bằng trình duyệt kiểm thử và đọc `innerWidth`/`scrollWidth` trực tiếp để xác nhận kết quả. Chưa kiểm tra trực quan mọi route và mọi trạng thái popup; các màn còn lại dùng token chung nên nhận cùng hệ màu, nhưng các trạng thái riêng vẫn cần rà soát khi chỉnh tiếp UI.

Một lần thử lưu ảnh bổ sung sau khi dừng dev server gặp `localhost refused to connect`; không có ảnh kiểm chứng mới từ bước này. Bằng chứng 360/1024 px nêu trên đã được ghi nhận khi server còn chạy.

**Bổ sung sau báo cáo gốc:** Hallmark v2 sau đó đã được cài và chạy audit tĩnh + trình duyệt. Kết quả, thay đổi và giới hạn của lượt mới nằm ở [báo cáo 25/10](WEB_HALLMARK_BACKEND_AUDIT_2026-10-25.md); phát biểu “chưa chạy sloplint” ở phần tự đánh giá bên dưới chỉ mô tả thời điểm của lượt đổi màu ban đầu.

## Tự đánh giá

Đổi màu tập trung vào hệ token và các màu teal còn hard-code; không thêm package hoặc thay nghiệp vụ. Các màn đã xem có độ tương phản và kích thước phù hợp. Phần Hallmark được áp dụng ở mức nguyên tắc kiểm tra, chưa chạy công cụ `sloplint` của họ; không ghi nhận là đã đạt toàn bộ tiêu chí Hallmark.
