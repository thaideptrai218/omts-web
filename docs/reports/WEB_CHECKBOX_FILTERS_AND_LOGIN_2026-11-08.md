# Bộ lọc ô tick và đăng nhập — 08/11/2026

## Đã thay đổi

- Component `FilterChecks` dùng chung: chọn tất cả, chọn nhiều, bỏ hết; trạng thái chọn một phần, label/legend và focus bàn phím. Checkbox gọn trên desktop, vùng bấm44px trên mobile.
- Tìm kiếm đưa lên phía trên kết quả ở các directory API: nhà cung cấp, vật tư, nhân viên nội bộ, vai trò, khách hàng, vùng/bè; nhân viên thời vụ, sản phẩm, phân công. Tra cứu bè của thả giống/sử dụng vật tư/thu hoạch đưa lên trước workspace.
- Nhóm/loại/trạng thái dùng checkbox tại danh mục, tài khoản, vùng/bè, nhân viên thời vụ, sản phẩm, chu kỳ, phiếu nhập, yêu cầu mua, chấm công, phép đo và lô thu hoạch.
- Giữ select cho ngữ cảnh một vùng đang thao tác, chọn bè/NCC cụ thể theo wireframe, số dòng mỗi trang và các trường form. Không biến các trường nhập liệu thành lọc chọn nhiều.
- Các danh sách không có bộ lọc ngoài tìm kiếm (vai trò/khách hàng) không giữ khung lọc trái rỗng.

## Dữ liệu và phân trang

API vẫn nhận bộ lọc đơn như trước. UI không gửi chuỗi nhiều giá trị sang backend và không chỉ lọc trang đang xem.

- Chọn tất cả hoặc một giá trị: giữ một truy vấn phân trang thông thường.
- Chọn nhiều giá trị: repository tách thành truy vấn GET hợp lệ, đọc đủ trang từng phần, loại trùng ID, sắp xếp và phân trang tập kết quả hợp nhất. Không sửa endpoint, schema DB, CRUD, permission hay session.
- Bỏ hết: kết quả rỗng, không trở thành không lọc. Không xuất dữ liệu ngoài lựa chọn.
- Chặn hiển thị một phần khi có lỗi, phân trang lặp hoặc số bản ghi thay đổi trong lúc đọc. Giới hạn100trang100dòng mỗi tổ hợp; nếu vượt giới hạn báo lỗi, không báo kết quả thiếu là đầy đủ. Đây không phải snapshot giao dịch nguyên tử; backend hỗ trợ OR trực tiếp sẽ hiệu quả hơn với dữ liệu rất lớn.
- Phiếu nhập: hợp nhất theo ID, cộng giá trị dòng thuộc nhóm rời nhau; số phiếu hoàn thành đếm ID duy nhất. Tổng nhập/trả/ròng lấy các tổng server cho từng phần rời nhau. Chi phí vật tư của bè (backend cố ý bỏ qua nhóm hàng) chỉ cộng một lần mỗi trạng thái.
- Xuất Excel một phạm vi giữ tệp XLSX. Nhiều phạm vi dùng từng API export đã kiểm quyền rồi đóng gói ZIP chứa XLSX; ghi rõ trên màn. Không tạo endpoint, không đổi quyền Export, không thêm dependency. Dung lượng ZIP tối đa64MB; không tải một gói thiếu khi có phần lỗi.

## Login và nhận diện

- Dùng đúng ảnh người dùng `C:/Users/duyth/Downloads/OIP.webp`, lưu asset `/brand/trung-nam-oyster.webp`.
- BrandMark dùng asset mới trên layout chung. Login dùng nền sáng cho form, mảng giới thiệu navy, hình hàu và nội dung tiếng Việt; bỏ minh họa SVG cũ. AuthShell dùng chung nên recovery/onboarding cùng nhận khung thị giác mới; logic bên trong giữ nguyên.
- Favicon ICO 16/32/48, icon PNG192 và Apple PNG180 cùng một nguồn. PNG nhúng trong ICO có alpha RGBA để Next/Turbopack decode được.
- PasswordField chỉ còn nút chữ Hiện/Ẩn; thêm CSS ẩn eye mặc định Edge, không tắt autocomplete/password manager. Không thể điều khiển icon do extension ngoài ứng dụng tự chèn.

## Kiểm tra thực tế

- 24 targeted tests PASS (union/phân trang/lỗi, tổng phiếu không trùng, ZIP CRC32, query whitelist, màn directory, yêu cầu cá nhân, login credentials/completion).
- Browser localhost3002: login thật Owner thành công, logo tải được, metadata favicon/icon/apple đúng asset mới. Toggle Hiện đổi type=text, chỉ một nút Ẩn, đổi lại password.
- Login không tràn ngang: CSS360/1024/1440; form312/410px ở360/1024.
- Phiếu nhập: bỏ hết nhóm trả0; Giống+Vật tư có7phiếu, tổng nhập10.008.000 / trả2.000 / ròng10.006.000. Xuất ZIP thật gồm Seed vàMaterial, cả2XLSX là archive hợp lệ, CRC không lỗi.
- Ảnh `.hallmark/login-oyster-20261108.jpg`, `receipt-checkboxes-20261108.jpg`; screenshot desktop hiện có lỗi scale/crop của công cụ, dùng DOM bounds để đối chiếu responsive.
- Chưa chạy lại mọi actor hoặc thao tác ghi tài chính; không tuyên bố toàn bộ208wireframe đã hoàn tất. Không commit/push/merge.

Kết quả cuối: npm run lint, npm run typecheck, npm run build PASS;24 targeted tests PASS. Nhà cung cấp Giống+Vật tư trả4hồ sơ; tìm kiếm nằm trên tiêu đề kết quả, nhóm lọc bên trái; CSS360 scrollWidth360. Browser giữ tab danh mục cho người dùng. Không ghi dữ liệu nghiệp vụ, không commit/push/merge.
