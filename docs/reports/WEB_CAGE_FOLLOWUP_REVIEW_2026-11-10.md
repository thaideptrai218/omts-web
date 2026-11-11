# Rà soát bổ sung phần lồng — 10/11/2026

Phạm vi: thay đổi Web về thu hoạch, quy đổi lồng/kg, báo cáo sản lượng và các màn dùng tỷ lệ thu hoạch. Rà source và kiểm thử liên quan; không phải kiểm thử bảo mật toàn hệ thống hoặc xác minh CRUD trên backend đang chạy.

## Đã sửa

- Hook lấy kg/lồng và component chọn lô hóa đơn trước đây mặc định bật request nếu caller quên truyền cờ. Nay không truyền ID Owner thì không gọi API; các caller truyền ID từ identity hiện tại khi actor là CooperativeOwner. Đây là điều kiện hiển thị; BFF vẫn kiểm quyền Owner bằng phiên phía server.
- Hook trước đây có thể hiện lại tỷ lệ cũ khi bật lại hoặc đổi tài khoản trong cùng component. Kết quả nay gắn với từng lượt đọc và tài khoản; trong lúc tải lượt mới không dùng kết quả lượt cũ. Hủy request khi đổi ngữ cảnh/unmount và bỏ qua phản hồi cũ kể cả khi transport vẫn trả về.
- Formatter kg chung trước đây làm tròn còn 2 số lẻ, lệch formatter bán hàng giữ 3 số lẻ. Nay giữ 3 số lẻ (180,125 kg), không đổi payload API.
- Giữ sửa trước đó: tổng lồng quy đổi không hiện một tổng thiếu khi có lô không có tỷ lệ hợp lệ; số kg và số lồng thu hoạch gốc vẫn hiển thị.

## Kiểm chứng

- 7 file kiểm thử liên quan: 46/46 đạt. Gồm đổi tài khoản khi request chưa trả về, bỏ qua phản hồi cũ, tắt/bật lại, thiếu quyền mặc định, tỷ lệ không hợp lệ, độ chính xác kg và hiển thị các màn liên quan.
- Lint toàn dự án, typecheck và production build đạt. Không chạy lại toàn bộ 341 file test; lượt trước đã dừng vì chạy lâu chưa có kết quả.
- Không đổi API, schema DB, đơn vị nhập liệu hoặc trạng thái nghiệp vụ; chưa commit/push.

## Giới hạn còn lại

Báo cáo sản lượng API chưa có số lồng và tỷ lệ lịch sử từng lô. Số lồng trong báo cáo vẫn là xấp xỉ từ trung bình hiện tại của HTX, có nhãn ≈ và chú thích nguồn; không coi là số lồng thực tế. Yêu cầu bổ sung API đã ghi tại BACKEND_API_REQUESTS_FROM_WEB_2026-11-09.md, mục D.

Câu hỏi mới chưa chốt: không có trong phạm vi sửa này.
