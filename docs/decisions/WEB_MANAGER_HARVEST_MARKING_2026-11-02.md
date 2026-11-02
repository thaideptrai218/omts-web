# Manager ghi nhận thu hoạch — yêu cầu đã chốt 02/11/2026

Người dùng sửa lại: Manager được đánh dấu làn hoặc phần vùng đang/đã thu hoạch trong phạm vi được giao. Hạn chế chỉ Owner sửa bè/làn là hạn chế đối với cấu trúc: thêm/xóa vùng, bè, làn; không đồng nghĩa cấm Manager ghi nhận nghiệp vụ thu hoạch. Vật tư vẫn theo quyền Owner đã chốt.

## Gửi nhóm backend, chưa tạo API

- HARVEST (OMTS-221) cần contract ghi nhận bắt đầu/đang thu và hoàn tất, gắn vùng, bè, làn/khoảng mét từ–đến; lưu người thực hiện, người ghi, thời gian có timezone và ngày nghiệp vụ.
- Cần quyền Manager theo vùng hiện được phân công, kiểm lại bản ghi/chu kỳ/làn ở backend. Không mở quyền thêm/xóa cấu trúc qua endpoint thu hoạch.
- Số kg, phần mét đã thu, phần còn lại, ghi chú và liên kết phân công/nhân viên dùng contract thu hoạch; không lưu một cờ Đã thu cho toàn vùng khi mới có một phần được thu, và không quy đổi mét thành kg ở frontend.
- Cần version/chống xung đột, danh sách trạng thái/chuyển trạng thái hợp lệ và quy tắc sửa ghi nhận sai; backend/BA công bố trước khi nối Web. Yêu cầu đánh dấu thu hoạch đã được duyệt, chi tiết contract chưa phát hành.
- Nhật ký Manager theo vùng áp dụng phạm vi metadata đã duyệt ở WEB_MANAGER_ACTIVITY_PROPOSAL_2026-11-02.md.

Tiếp tục quyết định của người dùng: chỉ note API cần bổ sung; không tự tạo API backend hoặc dùng dữ liệu mock để tuyên bố đã lưu thu hoạch thật.
