# Thiết kế lại trang giới thiệu và trang truy xuất nguồn gốc (27/11/2026)

## Học gì từ các trang tham khảo

| Trang | Lấy | Không lấy |
| --- | --- | --- |
| wholechain.com/traceability | Nền sáng, tiêu đề lớn, mỗi mục một ý, hành trình theo mốc | Giọng bán phần mềm, chuẩn quốc tế, bảng giá |
| tracely.tech (hộ chiếu hải sản) | Thẻ định danh sản phẩm, số liệu chính ở đầu, hành trình có biểu tượng, vị trí trên bản đồ | Nền đen, điểm độ tươi, đánh giá sao (không có dữ liệu) |
| truyxuat.mae.gov.vn | Ưu tiên điện thoại, ảnh đầu trang, tách sản phẩm và đơn vị sản xuất | Khối mô tả chữ dài |
| trace.icheck.vn | Không lấy gì: lúc xem bị che bởi biểu mẫu xin thông tin khách | Bắt người quét khai thông tin |

## Quyết định

- Hai trang dùng chung khung (`src/features/public-site/`): đầu trang, chân trang, màu, phông Be Vietnam Pro, nút, nhãn.
- Chung "đường hành trình": trang giới thiệu kể năm chặng, trang truy xuất điền ngày thật.
- Trang truy xuất đưa lô hàu lên trước, hợp tác xã xuống sau.
- Trang giới thiệu chỉ hứa đúng những gì trang truy xuất hiển thị (bản cũ nói có nhật ký nuôi và chất lượng nước, thực tế dữ liệu công khai không có).
- Hình vùng nuôi là hình vẽ. Ảnh thật thêm qua `landingPhotos` và ảnh bìa trong Thiết lập.
- Dữ liệu công khai và hợp đồng API giữ nguyên.
- Nút đổi tiếng Anh chuyển xuống chân trang, chưa bỏ.

## Lỗi có sẵn đã sửa

`src/proxy.ts` coi `/origin/photo` là mã QR nên mọi ảnh trên trang truy xuất trả 404.

## Đợt 2 (cùng ngày)

- Hình bè hàu chuyển động bằng CSS, tự tắt khi máy chọn giảm chuyển động.
- Trang truy xuất chia hai thẻ: Sản phẩm và Hợp tác xã.
- Trang mẫu `/xem-mau` dùng đúng giao diện thật với dữ liệu cố định.
- Đường hành trình dọc, sáng dần theo cuộn (ý từ wholechain), dùng ở cả hai trang.
- Ảnh trong `public/landing/mau/` do chủ dự án đưa để minh họa. Hai ảnh mang dấu BAVABI Seafoods, một ảnh chưa rõ nguồn: phải xin phép hoặc thay ảnh tự chụp trước khi công khai.

## Đợt 3 (cùng ngày)

- Trang giới thiệu: ảnh nền, sản phẩm (từ danh mục, không có giá), lô hàu thật, giấy chứng nhận, báo chí; bỏ mục vai trò; hình bè hàu xuống cuối trang.
- Màn mới Cài đặt, Trang giới thiệu (`/cooperative/landing`), chỉ chủ hợp tác xã.
- Backend: bảng `LandingPhotos`, cột `Cooperatives.FeaturedInvoiceCode`, `GET api/public/landing`, `api/cooperative/landing/*`, trang truy xuất thêm `productDetails`. Migration `LandingPagePhotos`.
- Bỏ tiếng Anh trên web (backend vẫn nhận `lang=en`).
- Test tích hợp backend đã sửa danh sách trường công khai nhưng chưa chạy.
- Ảnh mặc định trong `public/landing/mau/` (kể cả ảnh nền và bản tin VTV1) chưa rõ quyền sử dụng.

## Đợt 4 (dữ liệu demo trên máy)

- Thêm 3 ảnh cho mỗi sản phẩm, đổi ảnh bìa và logo qua API. Ảnh sản phẩm và ảnh bìa lấy từ Wikimedia Commons, ghi nguồn ở `public/landing/nguon-anh.txt` (liên kết "Nguồn ảnh" ở chân trang).
- 11 tệp ảnh khối màu của bè và lô thu hoạch được thay nội dung ngay trong volume `omts_files`; bản gốc ở `.hallmark/redesign/backup-storage/`. Không sửa bản ghi nào. Các thay đổi dữ liệu này chỉ có trên máy này, không nằm trong git.
- Thẻ đầu trang giới thiệu và mục báo chí được thiết kế lại.

## Trước khi đẩy mã

Kho mã công khai nên ảnh chưa rõ quyền (ảnh chủ dự án đưa, gồm ảnh mang dấu công ty khác và ảnh bản tin truyền hình) không đưa vào git. Mã chỉ kèm ảnh Wikimedia Commons; các ảnh kia được đăng vào kho ảnh trên máy qua Cài đặt, Trang giới thiệu. Mục báo chí không có ảnh mặc định. Những dòng ở trên nói về ảnh trong `public/landing/mau/` đã được thay bằng mục này.
