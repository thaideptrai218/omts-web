# OMTS Web: Design Guidelines

Quy tắc UX/UI đã được người dùng xác nhận (09/11/2026). Module mẫu đầu tiên: Nhà cung cấp.
KiotViet là tham chiếu bố cục; không dùng logo, tên hoặc nội dung của họ.

## 1. Màn hình quản lý (danh sách + bộ lọc)

Áp dụng cho mọi màn tác vụ quản lý.

### 1.1 Khung trang

- Desktop: toàn trang nằm gọn trong 1 viewport. **Chỉ danh sách cuộn**; header app, hàng công cụ, cột lọc và tiêu đề bảng đứng yên.
- Padding của vùng main nhỏ: phía trên gọn, phía dưới chỉ chừa một khoảng rất nhỏ cách đáy.
- Ưu tiên diện tích cho danh sách: ô tìm kiếm và các nút trên hàng công cụ phải thấp, gọn.
- Bảng rộng hơn khung thì có thanh cuộn ngang.
- Màu sắc và style lấy từ tông chính của web (design token), không lấy từ ảnh mẫu hay wireframe.
- Cột lọc dài hơn màn hình thì cuộn riêng trong cột.
- Màn hẹp (≤ 900px): bỏ khóa 1 viewport, cột lọc thành panel trượt, phải dùng được ở 360px và 1024px.

### 1.2 Hàng công cụ (hàng đầu tiên), trái sang phải

1. Icon + tên chức năng. **Không có câu mô tả** vì người dùng thường xuyên đã biết chức năng.
2. Ô tìm kiếm. Mép trái thẳng hàng với mép trái danh sách khi cột lọc đang mở.
3. Nút `+ Thêm <đối tượng>`.
4. Import file.
5. Xuất file.
6. Nút chọn trường hiển thị (danh sách cột có checkbox, nhớ theo trình duyệt).
7. Icon `?` mở trang hướng dẫn. Vô hiệu cho tới khi có link.

Nút nào người dùng không có quyền thì ẩn.

### 1.3 Cột lọc (bên trái)

- Mục đầu tiên là **nhóm phân loại** của chức năng (ví dụ Nhà cung cấp: Giống, Vật tư, Khác).
- Sau đó là các trường lọc riêng, theo dữ liệu thực của chức năng.
- Không đặt bộ lọc cho dữ liệu người dùng không có quyền xem.
- Tiết kiệm chiều dọc: trên 5 phương án hoặc danh sách có thể tăng trong tương lai thì dùng **select**; ít và cố định thì dùng **pills xếp ngang**.
- Lọc khoảng số dùng component riêng: nhãn `Từ`/`Đến` luôn hiện, không dùng placeholder làm nhãn.
- Lọc thời gian không dùng hai ô Từ ngày/Đến ngày. Gồm hai lựa chọn: (1) một ô mở bảng mốc nhanh theo ngày, tuần, tháng, quý, năm và Toàn thời gian; (2) "Tùy chỉnh" mở lịch hai tháng chọn một khoảng, có dòng `Từ ngày – Đến ngày`, nút `Hôm nay`, `Bỏ qua`, `Áp dụng`.

### 1.4 Đóng/mở cột lọc

- Hover cột lọc: hiện nút `<` ở **giữa mép phải** cột để đóng. Thiết bị cảm ứng không có hover nên nút luôn hiện.
- Khi đóng: danh sách giãn sát trái, nút đổi thành `>` ở **giữa mép trái** danh sách, title "Hiện bộ lọc".
- Ô tìm kiếm giữ nguyên vị trí khi đóng cột lọc để hàng công cụ không nhảy.
- Trạng thái đóng/mở được nhớ theo trình duyệt.
- Nút phải có tên truy cập được và dùng được bằng bàn phím.

### 1.5 Danh sách

- Ô chọn từng dòng, ô chọn tất cả, thanh **bulk action** tùy chức năng xuất hiện khi có dòng được chọn.
- Tiêu đề cột bấm được để sắp xếp tăng/giảm, có icon cho biết cột đang sắp xếp và chiều. Sắp xếp phải chạy trên **toàn bộ dữ liệu** (server), không chỉ trang hiện tại.
- **Tuyệt đối không đặt nút thao tác trên dòng chưa mở.**

### 1.6 Mở dòng

- Bấm dòng để mở chi tiết ngay dưới dòng; mỗi lúc chỉ mở một dòng. Bấm ô chọn không mở dòng.
- Nội dung mở ra giữ đúng chiều rộng khung nhìn, không giãn theo số cột đang hiển thị của bảng.
- Bên trong có **subtab**. Mỗi subtab có bộ action riêng, đặt ở chân subtab đó.
- Chân subtab chia hai bên. **Bên trái**: action phụ như Xóa, Hủy, Xuất file, kiểu không nền (chữ + icon). **Bên phải**: action chính như Chỉnh sửa, Thanh toán dùng màu chủ đạo; action trạng thái như Ngừng hoạt động dùng nút viền.
- Action phá hủy/đổi trạng thái có xác nhận.
- Nút chỉ cao vừa đủ chữ/icon cộng padding (desktop khoảng 30px). Ô tìm kiếm có icon kính lúp.

### 1.7 Phân trang (cuối danh sách)

Thanh thấp, là một khối riêng **nằm ngoài** khung danh sách, cách khung một khoảng nhỏ và luôn ở cuối trang. Không đặt phân trang bên trong vùng cuộn của danh sách.

`Hiển thị [15 dòng]` · đầu · trước · ô số trang · sau · cuối · `1–15 trong N <đối tượng>`.

### 1.8 Thêm mới

Modal, các trường chia nhóm thu gọn được, chân modal có `Bỏ qua` và `Lưu`.

Ngoại lệ: chứng từ có nhiều dòng hàng (phiếu nhập, phiếu trả) mở **trang riêng**: nút quay lại + tiêu đề + ô tìm hàng ở hàng đầu, bảng dòng hàng bên trái, cột thông tin phiếu bên phải với `Lưu tạm` và `Hoàn thành` ở chân cột. Thao tác phá hủy (Xóa phiếu tạm) nằm trong menu `...` ở góc phải.

### 1.9 Lỗi đã gặp, không lặp lại ở module sau

Bố cục:
- Cột lọc và danh sách đều có nền trắng và viền; nền xám nhạt gần như trùng nền trang nên khó nhìn.
- Nội dung mở dòng dùng chiều rộng khung nhìn đo được, không để giãn theo cột. Toàn cục đang ẩn scrollbar nên vùng danh sách phải tự bật lại.

Lọc khoảng số:
- `Từ`/`Đến` nằm trong ô nền khác với ô nhập.
- Số nhập canh trái, gõ từ trái sang phải.

Lọc thời gian:
- Bảng chọn mở **sang phải**, căn giữa theo mũi tên `>` của ô, có mũi tên kiểu tooltip chỉ về ô; hết chỗ thì mới mở xuống dưới. Mở trên `body` để cột lọc không cắt mất.
- Bảng mốc nhanh đủ lớn để đọc và bấm dễ (pill cao khoảng 34px, chữ 13px).

Lịch chọn khoảng:
- Chữ nhỏ gọn (12px); ngày đang chọn không được to hơn ngày thường.
- Hover một ngày phải cho thấy kết quả nếu bấm: tô trước khoảng và cập nhật dòng `Từ ngày`/`Đến ngày`.
- Chỉnh được riêng từng đầu: bấm `Từ ngày` hoặc `Đến ngày` để chọn đầu đang sửa; mỗi bên lịch có điều hướng tháng riêng.
- Nền hover nằm gọn trong ô ngày.

## 2. Nguyên tắc chung

- Không dựng nút, cột, số liệu giả cho chức năng chưa có dữ liệu thật.
- Dữ liệu chỉ hiện theo đúng quyền của tài khoản.
- Có trạng thái đang tải, lỗi kèm cách thử lại, và danh sách trống.
