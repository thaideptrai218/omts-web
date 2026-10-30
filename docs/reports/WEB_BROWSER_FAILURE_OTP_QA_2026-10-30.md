# QA browser — upstream unavailable và OTP, 30/10/2026

Tiếp nối [role matrix](WEB_BROWSER_ROLE_QA_2026-10-30.md) và [Owner follow-up](WEB_BROWSER_ADMIN_QA_2026-10-30.md). Chạy bằng UI **127.0.0.1:3003** với backend QA8081; không merge hoặc ghi nghiệp vụ vào DB8080.

## Mất kết nối upstream thật

Đọc vật tư QA `QA-MAT30` có mô tả `QA browser material cost integration`, nhập nháp khác nhưng chưa lưu. Kiểm đúng container name/project/service/image rồi tạm dừng riêng `omts-zalo-qa-api-1`/port8081; SQL và API8080 giữ nguyên.

- Bấm Lưu một lần: Web báo chưa xác nhận được kết quả, giữ nguyên nháp và khóa Lưu.
- Bật lại đúng container; GET đối chiếu thành công và hiển thị mô tả cũ trên server. Nháp vẫn còn và Lưu vẫn disabled, không tự replay sau GET.
- Dùng dữ liệu mới mở xác nhận. Quay lại giữ nháp; Đồng ý bỏ nháp, lấy lại canonical cũ. Không gửi lại lệnh ghi đã lỗi.
- Đã đăng xuất Owner; API QA8081 hoạt động lại. Lần restart này làm trống bộ nhớ Fake inbox theo thiết kế backend, không reset database. Các OTP tiếp theo được yêu cầu sau khi API chạy lại.

Đây là upstream unavailable, không phải bằng chứng mất mạng browser, mất phản hồi sau commit hoặc mọi offline race. Chưa thêm retry/queue/refresh và không đổi chính sách session.

## Recovery và registration OTP qua Fake provider

Tài khoản recovery là Trader QA riêng `tr40783326`, đích SMS che `***700`; không thay credential/contact seed. Product chỉ dùng endpoint xác minh thật; mã test lấy riêng từ Dev Fake inbox mà README backend công bố. Không có tin nhắn rời máy trong môi trường này, không đưa DevInbox vào UI sản phẩm hoặc ghi rawOTP/proof vào report.

| Ca browser | Kết quả |
| --- | --- |
| Recovery start | Câu trả lời chung, đích che, hạn dùng/cooldown; không xác nhận tài khoản tồn tại |
| OTP sai | Hiện sai/hết hạn, ô OTP được xóa, vẫn ở bước nhập mã |
| Reload recovery đang code | Giữ cùng đích/hạn dùng, không tự gửi mã mới |
| Registration email chạy song song | Lượt riêng cùng context; OTP recovery không xác minh được registration |
| OTP email đúng | Registration chuyển verified rồi mới hiện form mật khẩu; kết thúc lượt trước khi tạo account, trở lại form nhập email |
| Resend recovery | Chỉ bấm được sau cooldown; Fake inbox nhận mã mới, deadline cập nhật |
| Mã cũ sau resend | Bị từ chối; không vào bước đổi mật khẩu |
| Mã mới hợp lệ | Recovery chuyển verified rồi mới hiện hai ô mật khẩu mới và nút Lưu |

Không coi ca mã chéo trên browser là chứng minh đầy đủ binding context/purpose chống tấn công; các kiểm tra server/CAS/context có bằng chứng tự động riêng.

## Bước cần người dùng thực hiện

Recovery đã được đưa đến bước nhập mật khẩu, hai ô còn trống. Quy tắc điều khiển browser yêu cầu người dùng tự nhập và gửi mật khẩu mới. Đã yêu cầu người dùng hoàn tất ở `/recover` và chỉ báo kết quả, không gửi mật khẩu trong chat. **Đang chờ kết quả**, không ghi nhận reset/login bằng credential mới là PASS. Proof có thời hạn; nếu hết hạn cần lượt xác minh mới có chủ ý.

Không thay mật khẩu qua CLI để thay thế bằng chứng browser. Không đổi credential seed hoặc mở khóa/cấp grant chỉ để tạo ca test. Các ca ghi thay đổi quyền và các biến thể contact/password còn lại vẫn được phân biệt với bằng chứng HTTP cũ.

## Bằng chứng và trạng thái mã nguồn

Không phát hiện lỗi sản phẩm mới trong các ca trên; chưa có thay đổi source cho các hành vi đã đúng. Head ứng dụng lúc kiểm là `e3ab215`. CI của head đó build-test/Gitleaks/title đạt; GitGuardian11 findings là check riêng đang unresolved. Backend fetch vẫn develop953f597/Zalo dc00b2f, không có API v2 mới để nối.

Ảnh task outputs: `qa-upstream-outage-draft-retained.png`, `qa-recovery-verified-pending-password.png`. Kiểm thử hồi quy G2 **4file/29PASS/0skip**, gồm UI/repository/HTTP và encrypted-flow integration với RedisDB2 thật; backend calls trong integration được fixture mô phỏng, không phải thêm29browser cases. Không sửa source nên không thay kết quả build của e3ab215 bằng một claim build mới.
