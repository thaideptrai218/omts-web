# Tinh chỉnh giao diện mua vật tư và thanh toán nhà cung cấp

Ngày: 04/11/2026
Nhánh: `feature/OMTS-132-web-foundation`

## Đối chiếu nghiệp vụ

Report3_v8, BF-01 và PURCHASE-01–08 đặt việc lập phiếu nhập ở Quản lý vùng, xem công nợ/ghi nhận thanh toán ở Kế toán. Quyết định Web ngày 03/11 giữ Chủ nhiệm HTX ở vai trò theo dõi thông báo, không thêm bước duyệt phiếu. Phạm vi này chỉ thay cách trình bày; không thay đổi luồng gửi Kế toán, các thao tác trả/hủy, quyền, xác nhận, phiên bản bản ghi hoặc contract API.

## Thay đổi

- Màn thanh toán nhà cung cấp có phần tóm tắt công nợ ngắn, tính từ danh sách công nợ API và bộ lọc nhà cung cấp đang chọn: số nhà cung cấp còn nợ, tổng công nợ và tiền chưa phân bổ.
- Tách lịch sử thanh toán và công nợ thành hai khu vực đọc riêng, đưa tổng tiền/khoản ghi vào tiêu đề danh sách, nhấn số còn nợ bằng chữ và trạng thái, đồng thời thêm thao tác xóa bộ lọc khi có điều kiện lọc.
- Màn phiếu nhập đổi khối tổng tiền thành dải đối chiếu gọn; nhấn số còn nợ và ghi rõ số phiếu/kỳ dùng để tính tổng.
- Danh mục nhà cung cấp/vật tư dùng đúng nhãn thao tác “Thêm nhà cung cấp”, “Mở nhà cung cấp”, “Thêm vật tư”, “Mở vật tư”; lưới lọc dùng hết chiều ngang hợp lý khi chỉ có ba điều kiện.

## Kiểm tra và giới hạn

- `npm run lint`, `npm run typecheck`, `npm run build` và `git diff --check` đạt.
- Đã mở local để kiểm tra đăng nhập, tổng quan và nhóm điều hướng Vật tư & mua hàng.
- `.env.local` đang chọn nguồn mock; màn Thanh toán nhà cung cấp là màn API, nên browser QA trực quan cho dữ liệu/API màn này chưa thực hiện được trong phiên. Không đổi nguồn dữ liệu, không tạo số liệu mẫu để giả lập màn API.
- Không chạy Vitest trong lượt này; không thay đổi endpoint, payload hay trạng thái nghiệp vụ.
