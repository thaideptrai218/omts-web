# Xác nhận nhân lực cho yêu cầu mua — quyết định Web

Người dùng duyệt trong chat ngày 04/11/2026: **Áp dụng đầy đủ luồng mới trên Web** sau khi được thông báo khác biệt với luồng Owner nhận đơn trực tiếp trước đây.

Nguồn contract: backend `chore/cors-zalo-mini-app`, commit `b5a1d73` (HEAD rà soát `33ae741`), `docs/purchase-staffing.md` và các DTO/controller/service tương ứng.

- Owner lập số lồng, ngày làm/ngày nhận, năng suất nguyên dương, nhân viên và ghi chú; gửi lời mời chuyển yêu cầu sang `AWAITING_STAFF`.
- Kế hoạch đã gửi được giữ nguyên. Owner có thể mời thêm người khả dụng; không mời lại người đã được mời.
- Staff xem lời mời của chính hồ sơ gắn với phiên và đồng ý hoặc từ chối; từ chối bắt buộc có lý do. Không nhận employee/account ID do browser chọn.
- Số người cần là làm tròn lên(số lồng / năng suất). Chỉ sau đủ xác nhận và ngày làm còn hợp lệ Owner mới nhận đơn, theo đúng số lồng và ngày nhận đã gửi. Không tự nhận đơn khi đủ người.
- Owner vẫn có thể từ chối có lý do; Trader có thể hủy trong các trạng thái backend cho phép, gồm `AWAITING_STAFF`. Backend giải phóng ca và giữ lịch sử.
- Trader và Staff xem yêu cầu không được truy cập danh sách nhân viên/lý do riêng. Danh sách lời mời của yêu cầu là Owner-only; Staff chỉ dùng API cá nhân.
- Giữ cơ chế xác nhận, phiên, CSRF, rowVersion, bản nháp và không tự gửi lại khi chưa rõ kết quả. Đây chưa phải luồng thu hoạch/cân hàng/bán hàng/hóa đơn.

Không tự áp migration staffing vào database QA đang dùng. Nhánh này còn xung đột với integration ở snapshot/catalog, cần backend tích hợp trước khi nghiệm thu API E2E.
