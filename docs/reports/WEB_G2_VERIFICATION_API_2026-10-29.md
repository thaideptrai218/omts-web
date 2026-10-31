# G2 — OTP và lưu hồ sơ từng phần trên API thật

Ngày29/10/2026, người dùng duyệt [thiết kế G2](../decisions/WEB_VERIFICATION_FLOW_PROPOSAL_2026-10-29.md) và “Báo từng phần và giữ nháp”. Đây là phần tiếp theo của [cá nhân/thông báo/quyền + PR19](WEB_PERSONAL_NOTIFICATIONS_ACCESS_API_2026-10-29.md). Áp dụng backend develop953f597 đang chạy; PR19 vẫn draft, không merge/sửa backend hoặc Jira.

## Luồng đã nối

- `/register`: thương lái chọn Email/SMS, gửi/xác minh mã, nhập mật khẩu và xác nhận tạo tài khoản thật; trả username, hướng về đăng nhập, không tự login hoặc cấp quyền nội bộ. `/login` có liên kết đăng ký và quên mật khẩu.
- `/recover`: gửi tới đúng liên hệ nhập, luôn dùng câu trả lời chung; nhập OTP rồi lưu mật khẩu mới, đăng nhập lại. Resend recovery gọi start mới theo contract backend, không gọi endpoint resend vốn từ chối recovery. ID thật/ID giả không được đưa xuống browser; metadata recovery luôn có cùng cấu trúc và thời hạn theo contract5phút, không có số lượt gửi bí mật.
- `/account`: thêm/đổi hoặc xác minh email/phone hiện có chưa verified. Gửi mã cần current password, bỏ current password khỏi state sau lệnh gửi; OTP đúng chỉ tạo liên hệ **đã xác minh, chờ Lưu**. Một contact pending; mở lại dialog đọc lượt hiện có đúng context. Hủy trước Lưu xóa flow/proof phía Web, không gọi contact-confirm.
- Lưu hồ sơ: nếu tên đổi, lưu tên với rowVersion trước; sau đó mới consume contact proof. Name conflict/error không chạy contact endpoint. Nếu tên đã lưu nhưng contact lỗi, báo rõ từng phần, giữ tên canonical/version mới và nháp contact; xác minh lại contact không gửi tên thêm lần nữa. Contact đã lưu nhưng GET profile lỗi được báo đã lưu, bắt đọc phiên bản mới trước sửa tiếp. Unknown write không được mở khóa chỉ bởi một GET thành công.
- `/account/security` và forced-password gate có lựa chọn mã email đã xác minh. Proof do server cấp vào giao thức G1 hiện có; token mới được mã hóa/cất server, đổi cookie HttpOnly, thu hồi binding cũ. Không biến proof thành body browser hoặc tự refresh.

## Giao thức và bảo vệ

POST `/api/verifications` chỉ nhận union strict: start/read/resend/verify/cancel/complete + purpose enum; complete không nhận verificationToken do browser cung cấp. Fixed endpoint/method, CSRF, giới hạn JSON8192B, private/no-store/Vary Cookie/nosniff và schema response. `read` cũng dùng CSRF; mọi projection kiểm lại context/session sau await trước khi trả.

Dùng context cookie HttpOnly G1 hiện có. Lượt ẩn danh chỉ dùng context ledger idle; contact cần application session; password-email dùng application/password-change-required. Binding hash gắn ledger revision và session ID/revision/account. Login/logout/rotation khác generation làm flow cũ không đọc/consume được. Không mở phone-only onboarding Staff: email OR phone tiếp tục chờ backend. Đăng ký email vẫn có thể dừng ở contact gate mà backend đang áp, không tự bỏ gate cho Trader.

Redis có key riêng theo namespace/context/purpose, flow ID ngẫu nhiên và revision/CAS. Payload gồm đích nhận, backend verification ID và proof được AES-256-GCM bằng keyring server với domain/AAD riêng gắn namespace/context/binding/purpose/flow/key. Nonce mới mỗi lần seal; key rotation đọc theo key ID. Mật khẩu/OTP chỉ qua request hiện tại, không nằm trong Redis, response hoặc log sản phẩm. Browser chỉ nhận flow ID, phase, đích đã che, hạn dùng và metadata an toàn.

Lua dùng Redis TIME, atomically reserve một lượt đang code/verified. Request khác không dùng cùng proof. Backend call có deadline theo cấu hình và request, lease60giây; pending quá hạn trở thành unknown, không tự trở về ready. Publish muộn không vượt revision đã chuyển unknown. TTL không vượt expiry do backend trả và ceiling5phút cho mã/10phút cho proof. Không resurrect một row mất/hết hạn. Khi hoàn tất/known final rejection, proof bị bỏ; unknown không được replay. Cancel không vượt pending đang chạy; người dùng có thể đọc trạng thái và kết thúc có chủ ý sau lease. Mỗi purpose giữ tối đa một flow trên cùng context.

Web Locks dùng cùng tên lifecycle G1, ifAvailable; không xếp hàng giữ password/OTP để tự gửi khi tab khác xong. Không hỗ trợ Web Locks thì từ chối. Không queue offline, refresh, Push device hoặc dùng DevInbox trong product.

## Bằng chứng

Source cuối **251 file / 2.797 PASS / 0 skip**, Redis DB2 riêng,185.45giây. Nhóm G2 mới cộng36 ca so snapshot2761, gồm Redis crypto/CAS/context/purpose/tamper/single-use/unknown, HTTP CSRF/schema/Staff gate, G1 email-proof rotation, client lock/secret projection và UI pending/partial-save/cancel/unmount. Lint/typecheck/build và built-product52 assertions được kiểm trước xuất bản; build37/37. Không dùng local QA thay CI của commit mới.

HTTP thật qua Web3002 và backend8080 với **tài khoản Trader QA riêng**: đăng ký SMS→401 anonymous (không auto-login)→login; cross-context complete410; contact OTP đúng nhưng profile chưa đổi→lưu tên→confirm contact/fresh rowVersion; lệnh lặp409; cancel contact giữ email đã lưu. Email-password proof→G1 cookie mới/old-cookie401; recovery known/unknown cùng cấu trúc, sai rồi đúng OTP→reset→login bằng email verified. Header CSRF ngoại lai403, không trả verification/access/refresh tokens. Mật khẩu QA sau thử được đưa về demo mặc định; không đổi credential/contact của seed. Provider thực tế là **Fake Development**, chưa nghiệm thu SMS/email ngoài môi trường này.

Script được chia hai phase cách60giây để tôn trọng backend limit10 request code/phút; không retry mutation tự động. Lần đầu harness sai khi đòi anonymous session HTTP200 (contract là401), dừng sau khi tạo account QA; đã sửa kỳ vọng và chạy lại đầy đủ. Hai lượt script SMS tạo hai tài khoản QA được giữ, một tài khoản có contact/name/audit của luồng đầy đủ. Kiểm bổ sung đăng ký Email thật tạo tài khoản QA thứ ba và xác nhận login đi đúng /onboarding/contact của backend. Không bỏ gate hoặc xóa DB/lịch sử để làm sạch bằng chứng.

Browser: `/login`→`/register`→SMS QA→verify thật→đúng bước nhập mật khẩu/xác nhận; kết thúc lượt trước tạo tài khoản và kiểm trở về form. Chưa nhập mật khẩu mới qua browser. `/recover` mở đúng form/câu chung; browser trở về login trống, viewport override reset, tab giữ cho tester. CSS360/1024 không tràn ngang ở bước OTP/password. Ảnh thật nằm ở outputs workspace; screenshot bridge ở override bị scale/crop nên có ảnh mặc định rõ hơn, không chỉnh sửa ảnh. Contact partial-save được kiểm component fixtures và HTTP thật, không nhận là browser đã chạy ghi contact/password.

## Còn chờ

Staff email OR phone onboarding, account-create/reset secret-free/generated username, fixed-role codes, ngân hàng HTX, Manager license read và các nghiệp vụ SRS v2 chưa có runtime API giữ nguyên. Live refresh vẫn tắt. Không coi G2 là nghiệm thu toàn SRS hoặc các ticket To Do mới.
