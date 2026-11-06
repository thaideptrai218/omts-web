# Đợt nối API kinh doanh

- Sản phẩm: màn danh sách/tìm/lọc, xem, thêm/sửa tên và đơn giá/kg, ngừng/khôi phục; BFF gọi `/api/products` và lấy `ProductSaved.product`. Trader không thấy giá, Staff chỉ đọc khi có SALES_INVOICES Create, Owner quản lý. Backend vẫn quyết định quyền.
- Form yêu cầu mua theo lồng đọc danh mục sản phẩm mới qua cùng BFF.
- Yêu cầu đăng ký thương lái: `/trader-requests`, trang riêng thay popup menu; giữ xác nhận duyệt, lý do từ chối, chống gửi lại khi chưa rõ kết quả.
- Người dùng sửa quyết định sau khi xác nhận kg: **quay lại số lồng và luồng nhân lực cũ**. Giữ adapter request/staffing cũ, không kích hoạt adapter kg. Develop `f8e42428` chỉ có kg/Owner phản hồi trực tiếp, nên KHÔNG khẳng định màn request chạy được với develop. Cần backend thống nhất contract lồng và staffing trước khi nghiệm thu.
- Ngân hàng và khách hàng đã có màn/BFF ở các đợt trước; merge hồ sơ khách hàng chưa nối. Sử dụng vật tư/thả giống/thu hoạch chưa được hoàn thiện.
- Không chạy test theo yêu cầu; chỉ kiểm TypeScript. Docker Engine không kết nối tại thời điểm kiểm, chưa chạy API live, không thay runtime/database. Không commit/push/merge develop Web.
