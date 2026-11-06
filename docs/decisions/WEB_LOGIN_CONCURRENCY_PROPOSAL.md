# Phối hợp đăng nhập giữa các tab — đã chốt hành vi

Ngày: 26/10/2026. Phạm vi W3.1b4/W3.4/W4. Không bật API thật từ tài liệu này.

**Cập nhật27/10/2026:** Duy Thái chọn quy tắc chờ/kiểm tra lại phiên của phương án A; không tự gửi lại mật khẩu khi mất phản hồi. Đây là xác nhận hành vi. Công nghệ, cookie bổ sung và giao thức Redis chưa được duyệt; [thiết kế G1](WEB_LOGIN_COORDINATION_PROTOCOL_PROPOSAL.md) là bước review riêng. Nội dung đề xuất26/10 bên dưới được giữ để giải thích lựa chọn.

## Vấn đề cần chốt

Quyết định WEB-API-08 đã xử lý trường hợp request mang cookie hợp lệ: giữ phiên hiện tại, muốn đổi tài khoản phải logout trước. Nó chưa xử lý hai tab đều bắt đầu khi chưa có cookie.

Ví dụ: tab1 nhập A và tab2 nhập B. Cả hai request có thể tới BFF trước khi có phiên. Nếu B trả trước rồi A trả sau, browser có thể nhận cookie A sau cùng dù người dùng vừa thao tác B. Chỉ chặn callback React cũ không ngăn browser xử lý Set-Cookie của response.

## Phương án A — Một lượt đăng nhập đang chờ cho mỗi trình duyệt

Quy tắc chờ/đối chiếu đã được chốt27/10; phần logout vẫn phải triển khai theo W4 và các quyết định riêng:

1. Khi một tab đang đăng nhập, tab khác chờ và kiểm lại trạng thái phiên; không đồng thời gửi credentials khác. Không broadcast username/password/token.
2. Sau khi lượt đầu có phiên hợp lệ, mọi tab giữ phiên đó theo WEB-API-08. Muốn B thì logout A trước.
3. Nếu mất phản hồi, chỉ đọc lại phiên bằng GET để đối chiếu; không tự gửi lại POST login. Nếu kết quả vẫn chưa xác định, hiển thị trạng thái chưa thể kiểm tra và cho kiểm tra lại. Không tự kết luận đã đăng xuất.
4. Logout làm các kết quả đọc/login cũ hết quyền cập nhật UI. Việc thu hồi BFF/backend và response cookie về muộn vẫn phải có cổng server riêng; chặn UI không thay cho revoke.

Ưu điểm: người dùng ít gặp tình huống hai tài khoản giành nhau phiên chung của browser; tránh gửi credentials lặp khi mạng chậm. Nhược điểm: tab thứ hai phải chờ; browser không hỗ trợ cơ chế phối hợp cần phương án riêng, không được âm thầm fallback sang last-writer-wins.

Đây là **quy tắc hành vi đã chốt**, chưa phải thiết kế production đã hoàn tất. Web Locks/BroadcastChannel có thể hỗ trợ phối hợp tab nhưng không tự khóa được mọi worker; một Map RAM phía Next không đủ. Muốn phối hợp server cần định danh lượt/browser tin cậy và thao tác Redis nguyên tử; việc thêm cookie tạm hay thay hợp đồng phiên phải được review riêng trước code.

## Phương án B — Lựa chọn lịch sử, không được chọn

Tiếp tục schema, reader, hydration và tests bằng fixture. Giao diện dùng mock, API login/refresh vẫn tắt cho tới khi duyệt đầy đủ hành vi và giao thức phối hợp. Ưu điểm là không chốt vội cơ chế phiên; nhược điểm là demo đăng nhập API chưa mở.

## Micro-task sau khi chốt A

- b4.1: duyệt hành vi chờ/đối chiếu/mất phản hồi và hỗ trợ browser.
- b4.2: đề xuất giao thức browser/server/Redis; mô tả bootstrap chưa có cookie, request chết, nhiều workers, expiry và crash. Không dùng khóa chỉ theo username hoặc địa chỉ IP để đoán cùng browser.
- b4.3: test lịch A/B trả lệch thứ tự, server đã commit nhưng mất response, reload/crash giữ lock, login→logout→login và response clear cookie cũ.
- b4.4: kiểm HTTP cookie trong Next fixture rồi browser; chỉ mount product sau khi các cổng và gate/backend alignment đều đạt.

## Những việc có thể làm ngay

W3.2a/b: schema của response GET session, reader chỉ đọc có cancellation và kiểm kết quả cũ, test ghép server response sang browser parser. Không tự đổi UI sang API hoặc gọi logout khi chỉ đọc session bị lỗi. Các phần này không cần tự quyết chính sách login cạnh tranh.
