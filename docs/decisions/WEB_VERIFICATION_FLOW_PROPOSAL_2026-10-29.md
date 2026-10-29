# G2 — Đề xuất nối các luồng OTP thật trên Web

Trạng thái: đề xuất, chưa được duyệt. Không dùng văn bản này để coi G1 đã cho phép lưu proof OTP hoặc đổi luồng hồ sơ. Áp dụng backend develop953f597; các nhánh OMTS-216 chưa merge không phải contract runtime.

Các API đăng ký Trader, quên mật khẩu, xác minh/đổi liên hệ và đổi mật khẩu bằng email đã có, nhưng Web API hiện chưa có cơ chế giữ challenge/proof của chúng. G1 xử lý đăng nhập/phiên, không tự giải quyết các token xác minh dùng một lần. Quy tắc AGENTS: “Session storage, refresh-token handling, SSR/CSR boundaries, route protection, permission payloads, and caching can affect security or backend contracts. Present the proposed design and obtain confirmation before choosing one.”

## Phương án đề xuất để duyệt

1. Dùng context cookie HttpOnly G1 hiện có, không thêm cookie. Flow ẩn danh gắn đúng context; flow cá nhân gắn thêm tài khoản/phiên G1 đã kiểm. Browser chỉ giữ ID lượt ngẫu nhiên và metadata an toàn như đích nhận đã che, hạn dùng, số lần thử/gửi lại.
2. Redis giữ trạng thái riêng cho từng lượt OTP, mã hóa proof/token bằng keyring server, TTL không vượt thời hạn backend. Không lưu mật khẩu hay mã OTP người dùng nhập; không đưa verificationToken/access/refresh token xuống browser hoặc log. ID flow không tự là quyền truy cập; mọi bước kiểm lại context/session/purpose.
3. Mọi lệnh đi qua BFF fixed endpoint/schema/CSRF, khóa chuyển trạng thái bằng CAS để hai tab không xác nhận/lưu cùng proof. Không tự retry request ghi. Lượt chưa rõ kết quả không được giả định thất bại hoặc tự dùng lại proof; hiện đối chiếu/khởi tạo lượt mới có chủ ý khi an toàn. Backend vẫn kiểm OTP, rate limit và single use.
4. Đăng ký Trader: email hoặc SMS→OTP→tạo account theo contract, không đăng nhập tự động. Quên mật khẩu: luôn thông báo chống dò tài khoản→OTP→đổi mật khẩu→đăng nhập lại. Không dùng API DevInbox trong product; chỉ tester local dùng Fake provider được backend hỗ trợ.
5. Hồ sơ: OTP chỉ chứng minh liên hệ mới/hiện có chưa xác minh; giữ trạng thái “đã xác minh, chờ Lưu” đúng quyết định cũ. Chỉ khi người dùng chọn Lưu mới consume proof bằng contact-confirm. Hủy trước Lưu không đổi liên hệ. Mỗi lần chỉ có một thay đổi liên hệ chờ lưu; không giữ mật khẩu hiện tại sau lệnh gửi mã.
6. Backend hiện lưu tên hiển thị và contact-confirm bằng hai endpoint độc lập. Nếu người dùng lưu cả hai, Web báo rõ phần nào đã lưu và phần nào chưa được xác nhận, cập nhật đúng version sau phần đã lưu và không giả lập rollback/atomic. Không tự gửi lại phần lỗi; giữ nháp còn lại cho người dùng xử lý. Cần duyệt điểm này cùng G2.
7. Đổi mật khẩu bằng email dùng cùng proof server; khi backend trả phiên/token mới tiếp tục giao thức G1 đã duyệt. Không mở refresh tự động, offline queue, cấp quyền hay device Push trên Web. Gate Staff email OR phone tiếp tục chờ backend, không chuyển phone-only.

## Kiểm trước khi bật

Test server cho session/context/purpose sai, flow ID giả, hai tab, TTL, verify thành công nhưng mất phản hồi, single-use/unknown write, logout/login xen giữa và không serialize/log proof. Test UI cho giới hạn/resend, sai/hết hạn OTP, OTP→chờ Lưu→Save/Cancel, partial success và giữ nháp. HTTP thật với QA dữ liệu giả, kiểm restore/contact cũ và các actor; không đổi mật khẩu tài khoản seed. Đây là điều kiện triển khai, chưa phải bằng chứng đã đạt.
