# 05 — UX và nội dung

## Nguyên tắc chung (`AGENTS.md`)
- Thiết kế Web trước nhưng **kiểm chứng luồng quan trọng ở 360 px và 1024 px**.
- Ưu tiên tiếng Việt, truy cập, dùng bàn phím, landmark có nghĩa, focus nhìn thấy.
- Có đủ trạng thái: loading, empty, error, offline, success, syncing, permission-denied.
- Skeleton cho nội dung tải lần đầu; thao tác ghi dùng pending/disabled tại chỗ. Không thay mọi loading bằng skeleton.
- Màn đã làm là **UI sản phẩm**: không panel giải thích cho dev, không bộ chọn ngữ cảnh, không cảnh báo "chưa hoàn thiện", không route `/dev/*` vĩnh viễn trừ khi người dùng yêu cầu showcase. Harness tạm không được commit thành UI.
- Tiêu đề dashboard và lối tắt hiện trước khi số liệu tải xong.

## Hallmark `audit` (khi có trên máy)
- Đối chiếu từng phát hiện với công việc thực của Owner/Manager/Staff.
- Giữ nguyên luồng, nội dung, quyền đã chốt; không áp máy móc quy tắc trang quảng bá vào màn quản trị.
- Ảnh/chẩn đoán tạm ở `.hallmark/` (ignore); tóm tắt phát hiện đã kiểm chứng vào `docs/reports/`.

## Sidebar và điều hướng
- Thanh bên sáng, mở mặc định trên desktop, thu gọn/ghim được; hover có độ trễ 160–280 ms, focus giữ mở.
- Sidebar chiếm cột bố cục, **không** phủ lên nội dung. Drawer mobile đóng và nhả khóa cuộn khi đổi sang desktop.
- Tên tài khoản, vai trò, phạm vi hiện trên ba dòng.
- Danh mục: dạng bảng trên desktop, hàng xuống dòng trên điện thoại.

## Hộp thoại và bản nháp
- Đóng form chưa lưu dùng dialog trong app: **Quay lại** giữ nháp, **Đồng ý** bỏ nháp. Không dùng `confirm`/`alert` native.
- Tải tệp hóa đơn/giấy phép/chứng nhận trực tiếp, không popup.
- Khóa cuộn dùng chung, an toàn khi lồng nhau.

## Không bịa số
- Chưa biết thì `null`/"Chưa có số liệu". Không doanh thu hay sản lượng giả. Chi phí vật tư bè chưa biết đến khi có phiếu nhập.

## Ngoại lệ ghi nhận
- `/account` không tham gia bộ kiểm tra điều hướng tức thời vì cổng xác thực giữ lại trang (`docs/REVIEW_GUIDE.md`).
