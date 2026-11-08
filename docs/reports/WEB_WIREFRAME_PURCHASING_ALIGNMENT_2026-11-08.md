# Rà soát wireframe Web và đợt sửa mua hàng, tài khoản — 08/11/2026

## Phạm vi đọc và bằng chứng

Nguồn: `D:/Đồ_án/wireframe/261028-1340-wireframes/review-images/WEB-desktop`.
Kiểm kê 208 PNG, 10 nhóm; danh sách đầy đủ trong `WEB_WIREFRAME_INVENTORY_2026-11-08.csv`.
Đã xem toàn cảnh 10 nhóm qua contact sheet trong `.hallmark/wireframe-audit-20261108/`. Đây là rà soát bố cục toàn bộ thư mục, **không đồng nghĩa đã kiểm chứng từng dòng chú thích hay đã triển khai đủ 208 trạng thái**.
Đợt này đọc phóng lớn các màn mua hàng 01 (ảnh người dùng), 02, 04, 09 và 10: danh sách phiếu, nhập hàng, phiếu hoàn thành, nhà cung cấp hoạt động/ngừng dùng. Phân tích tập trung vào ba lỗi người dùng chỉ ra, không tuyên bố hoàn tất toàn bộ wireframe.

| Nhóm | Số ảnh | Mẫu giao diện cần đối chiếu tiếp |
|---|---:|---|
| 01 Công khai / tài khoản | 17 | Tab tài khoản xuyên suốt, form cân giữa; thông báo chi tiết trong danh sách, nguồn gốc theo lô |
| 02 Thương lái | 8 | Bộ lọc trái, yêu cầu mua / hóa đơn, chi tiết thanh toán và sao kê; không tự đổi quyết định số lồng |
| 04 Nhập hàng | 13 | Tìm kiếm trên, bộ lọc trái, chi tiết dưới dòng, nhập/trả hàng, nhà cung cấp |
| 05 Nuôi trồng / thu hoạch | 32 | Chọn bè/làn, trạng thái theo ngày, thả giống, nhật ký ảnh, số đo/ngưỡng, sản lượng |
| 06 Bán hàng / trả hàng | 19 | Dòng hàng và tổng tiền, hóa đơn và chi tiết, điều chỉnh/hoàn trả theo trạng thái |
| 07 Truy xuất / nhân sự | 26 | Công bố nguồn gốc và tài liệu; phân công, chấm công, nhân viên; trạng thái có quyền |
| 08 Tổng quan / chờ xử lý | 16 | Tổng hợp từ báo cáo thật, việc cần xử lý, truy cập chi tiết; không biến dữ liệu mẫu thành thật |
| 09 Thiết lập / phân quyền | 24 | Danh sách và chi tiết quyền/vùng, biểu mẫu theo actor, kiểm soát thao tác |
| 10 Cài đặt | 17 | Hồ sơ HTX, danh mục, thiết lập, các trạng thái sửa/xác nhận |
| 11 Kế toán | 36 | Nợ phải thu/phải trả, sao kê, lương và báo cáo, lọc kỳ và xuất tệp |

## Thay đổi đã làm đợt này

- Đổi mật khẩu: căn chính **khung form 672 px** giữa trang, giữ ba tab, không chỉ căn container bên ngoài.
- Nhà cung cấp: nhấn dòng hoặc nút xem để mở/thu chi tiết ngay dưới đúng dòng; có tên, loại, liên hệ, địa chỉ, email, trạng thái, truy cập chứng nhận và nút sửa. Đọc chi tiết thật qua repository, trạng thái tải/lỗi/retry; không mở editor chỉ để xem. Sửa/ngừng dùng/sử dụng lại vẫn dùng editor cũ để giữ validation, xung đột và xác nhận.
- Tìm nhà cung cấp chuyển lên trên kết quả; loại và trạng thái ở thanh lọc trái. Phân trang server 10/20/50/100 giữ nguyên.
- Phiếu nhập hàng: tìm mã phía trên, bộ lọc trái đầy đủ thời gian, nhóm hàng, bè, nhà cung cấp, trạng thái. Nhóm/bè/nhà cung cấp gửi backend **trước phân trang**, không lọc riêng trang hiện tại. Có nút Tháng này và Đặt lại.
- Phiếu nhập mở chi tiết dưới dòng: người lập/ngày/NCC, dòng hàng, số lượng/đơn giá/bè/thành tiền, ghi chú, tổng tiền, lý do hủy, danh sách phiếu trả nếu có. Mở phiếu dùng editor hiện có, giữ đầy đủ CRUD/xác nhận/quyền.
- Nút Nhập hàng nối thao tác tạo phiếu hiện có; không tạo workflow mới.
- Xuất Excel nối GET `/api/purchase-receipts/export` qua BFF v2 với quyền **Export**, giữ bộ lọc, không bypass session hoặc giới hạn tải.
- In / Lưu PDF tạo bản in từng phiếu từ dữ liệu đã đọc thật. Trình duyệt cung cấp đích Lưu PDF, không có API PDF mới. Escape dữ liệu trước đưa vào tài liệu in; không chèn HTML từ ghi chú/tên hàng.
- Sau ghi phiếu, đóng chi tiết cũ để tránh hiển thị snapshot trước khi lưu.

## Khác biệt có chủ ý / phần cần tiếp tục

- Backend `PurchaseReceiptQuery` hiện nhận một `ItemGroup`, `StatusId`; chưa áp checkbox chọn nhiều như ảnh để tránh giả lọc hoặc sai phân trang/tổng tiền. Supplier hiện tương tự một loại/trạng thái.
- API search phiếu nhận `Code`, không có tìm tự do theo tên NCC: tìm theo mã và chọn NCC riêng, nhãn không hứa tìm theo tên NCC.
- Tổng tiền mỗi phiếu giữ nguyên cả phiếu; số tổng hợp theo dòng thỏa bộ lọc. Đã thêm chú thích khi lọc nhóm/bè.
- Wireframe cho các thao tác sửa/trả/hủy ngay vùng chi tiết. Đợt này vẫn mở editor hiện có cho ghi dữ liệu, không viết lại toàn bộ luồng tài chính. Chứng nhận NCC vẫn có hộp quản lý riêng.
- Editor nhập hàng dạng bảng trái + tổng tiền phải (ảnh02), tìm mặt hàng và sao chép phiếu vẫn cần đợt riêng. Không khẳng định các phần này đã làm giống ảnh.
- Xuất PDF toàn bộ kết quả có lọc chưa có endpoint; hiện Excel danh sách và PDF từng phiếu. Chưa xác minh hộp In/Lưu PDF trên trình duyệt thực, tránh mở hộp native làm kẹt phiên kiểm tra.
- Các nhóm còn lại cần đọc từng màn full-size và đối chiếu workflow/API trước khi sửa; không áp toàn bộ ảnh cũ lên contract mới.

## Kiểm tra

- 11 kiểm thử đích cho inline supplier và query/export v2: PASS.
- Lint/typecheck/build đã PASS trước các bổ sung nhỏ cuối; kết quả cuối ghi tiếp bên dưới.
- Browser localhost3002, Owner / API8082: danh sách 5 NCC; mở chi tiết đúng dưới dòng, không dialog. Phiếu nhập 7 bản ghi; mở PN000025 hiển thị dòng hàng thật; lọc Material còn5, tổng nhập8.000 / trả2.000 / ròng6.000. Xuất Excel tải thật7023byte.
- Form đổi mật khẩu: CSS1440 khung672, lề trái/phải384; CSS1024 lề176.25/175.75; CSS360 khung336, lề12/12. Không nhập hoặc đổi mật khẩu thật.
- Ảnh tạm `.hallmark/supplier-inline-20261108.jpg`, `receipt-inline-20261108.jpg`, `password-centered-20261108.jpg`. Công cụ screenshot desktop có lỗi scale/crop; không coi ảnh này là bằng chứng đủ toàn trang; dùng DOM bounds để kiểm vị trí/tràn.
- Chưa ghi tài chính/ngừng NCC/đổi quyền; không đổi API backend, schema hay routing; không commit/push/merge.

Kết quả cuối: lint, typecheck, build PASS sau các sửa cuối; git diff --check không có lỗi khoảng trắng. Browser phiếu nhập chi tiết: CSS360 scrollWidth360, CSS1024 scrollWidth1024. Nút Nhập hàng mở đúng form và đóng không ghi dữ liệu. PDF chưa chạy hộp In native; Excel đã tải thật. Tab phiếu nhập được giữ mở cho người dùng.
