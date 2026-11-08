# Phạm vi Web cho Sales/Workforce — đã duyệt 31/10/2026

Người dùng trả lời trực tiếp hai câu hỏi trong chat:

1. **“Đồng ý theo số lồng và luồng trên”**: nối API yêu cầu mua theo số lồng nguyên dương. Thương lái gửi/hủy yêu cầu của mình. Owner chấp nhận số lồng, ngày nhận và lựa chọn cho trả sau hoặc từ chối có lý do. Quản lý vùng chỉ xem theo quyền. Không quy đổi sang kg, không tạo giá/giữ kho/hóa đơn/thanh toán từ yêu cầu mua.
2. **“Thêm cả công việc cá nhân/nghỉ phép trên Web”**: ngoài màn quản lý phân công/chấm công cho Owner và quản lý vùng, Web có công việc/ngày công cá nhân và yêu cầu nghỉ phép. Backend xác định hồ sơ nhân viên từ phiên; client không chọn account/employee ID cho endpoint cá nhân.

Quyết định này thay trạng thái chờ ở báo cáo lát đọc 31/10. Không sửa Jira/SRS, không merge backend hoặc Web. G1/G2, quyền/grants, không tự gửi lại lệnh khi chưa rõ kết quả và các blocker hợp đồng khác giữ nguyên.

API hiện có: products create/update, Trader submit/cancel, Owner respond, workforce assign/remove/change-crew/manual check-in/out, job types, dated attendance settings, personal work/attendance/leave create/cancel và Owner leave review. Workforce assign/remove/change-crew/attendance không nhận rowVersion công khai; Web không giả lập bảo đảm phiên bản nguyên tử cho các endpoint đó. Bằng chứng hồi quy và giới hạn được ghi riêng sau triển khai. Employee QR/login riêng và payroll không được coi là đã hoàn tất bởi quyết định thêm màn cá nhân/nghỉ phép này.
