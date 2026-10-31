# OMTS-196 — D1.1 Cooperative provisioning scope review

## Phạm vi đã xác nhận

UC72 chỉ dành cho System Administrator và chỉ dùng để khởi tạo lần đầu. Normal flow tạo một Cooperative ở trạng thái Preliminary và first Cooperative Owner account ở trạng thái Active, phát mật khẩu tạm 10 ký tự hiển thị một lần/hiệu lực 24 giờ, đồng thời ghi audit.

Flow không tự tạo farming zone, customer, order, Employee permission hoặc business data khác. Theo BR-33, System Administrator cũng không dùng UC72 để sửa profile cá nhân hay dữ liệu nghiệp vụ sau khi khởi tạo. Owner đăng nhập qua UC02, bắt buộc đổi mật khẩu và tự hoàn thiện hồ sơ qua UC09.

Duplicate Owner/cooperative bị dừng bằng MSG03. Nếu chưa xác minh được người/HTX, hệ thống không cấp quyền và trả MSG55. Mật khẩu không kịp bàn giao hoặc quá 24 giờ không được phát lại âm thầm; SysAdmin phải đi qua UC74 và xác minh lại.

## Điểm chưa chốt

- SCR-56/SRS ghi `preliminary code` là required, nhưng `OMTS-196`, story acceptance criteria và backend sibling chỉ ghi cooperative name, Owner contact và evidence images.
- “Identity/contact of the first Cooperative Owner” chưa xác định rõ field breakdown và validation.
- Evidence image chưa có MIME, dung lượng tối đa, số lượng tối đa hoặc upload DTO.

Các điểm này ảnh hưởng required fields/API nên chưa được tự quyết trong frontend.
