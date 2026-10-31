# OMTS-183 — D2.6 Preview và save

## Đã triển khai

Flow gồm hai bước tuần tự: nhập thông tin và xem trước công khai. Preview chỉ nhận `PublicCooperativeProjection` gồm tên HTX và địa chỉ. Mã số thuế, liên hệ, ngành nghề và tài khoản ngân hàng không được truyền vào preview component.

Confirm gọi service với `recordVersion`; pending chỉ khóa mutation button. Kết quả save xử lý MSG01, MSG02, MSG03, MSG06, MSG10 và session expiry. Thành công cập nhật trạng thái `Completed`; conflict quay về form và cung cấp nút tải dữ liệu mới nhất.

## Kiểm tra

Browser DOM check sau khi nhập dữ liệu xác nhận tên và địa chỉ có mặt, còn tax ID `5701234567` và account number `0123456789` không xuất hiện. Save thành công đổi badge sang `Đã hoàn thiện`. Tax ID fixture trùng trả MSG03, quay lại details và focus `#cooperative-tax-id`.
