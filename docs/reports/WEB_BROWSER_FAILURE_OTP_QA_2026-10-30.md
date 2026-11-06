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

Recovery đã được đưa đến bước nhập mật khẩu, hai ô còn trống. Quy tắc điều khiển browser yêu cầu người dùng tự nhập và gửi mật khẩu mới. Đã yêu cầu người dùng hoàn tất ở `/recover` và chỉ báo kết quả, không gửi mật khẩu trong chat. Lượt đầu hết hạn trước khi hoàn tất; lỗi kết thúc lượt được sửa bên dưới. **Chưa ghi nhận reset/login bằng credential mới là PASS**; bước mật khẩu vẫn cần người dùng thao tác trên lượt còn hạn.

Không thay mật khẩu qua CLI để thay thế bằng chứng browser. Không đổi credential seed hoặc mở khóa/cấp grant chỉ để tạo ca test. Các ca ghi thay đổi quyền và các biến thể contact/password còn lại vẫn được phân biệt với bằng chứng HTTP cũ.

Lượt tiếp người dùng xác nhận **“Chưa đổi, tiếp tục kiểm tra các màn khác”**. Giữ ca credential mới là chưa chạy; không tiếp tục tạo lượt recovery/handoff lặp lại. Các ca contact-cancel và thông báo sau đó ở [báo cáo tiếp theo](WEB_BROWSER_CONTACT_INBOX_QA_2026-10-30.md).

## Lỗi tìm được khi kết thúc lượt đã hết hạn

Sau handoff, người dùng thấy form bắt đầu. Đọc đúng tab mới sau đó cho thấy cùng lượt đã verified, nhưng ngay sau đó proof hết hạn thật. Không kết luận có lỗi cách ly cookie chỉ từ trạng thái trang được sao chép lúc đầu.

Ở màn expired, bấm Kết thúc gọi cancel; Redis row đã mất do TTL nên server trả MSG16/410 với uncertain=false. UI cũ chỉ xử lý cancelled và giữ nguyên màn expired, khiến người dùng không bắt đầu lại được nếu không reload. Đã tái hiện thật và lưu ảnh trước sửa.

Bản sửa chỉ ở VerificationPanel: sau cancel nhận đúng MSG16 không mơ hồ, đọc đối chiếu purpose hiện tại. Chỉ khi read xác nhận empty mới rời màn cũ, xóa input tạm và về form bắt đầu/đóng dialog. Nếu có lượt mới thì hiển thị lượt mới, không cancel nó và không mang input mật khẩu/OTP cũ sang. Nếu cancel hoặc read chưa rõ kết quả, vẫn giữ trạng thái bị chặn. Không đổi server TTL/binding/CAS/schema, không tự start/resend/verify/complete hoặc retry lệnh ghi.

Thêm4 regression: expired cancel→known empty, newer flow không bị cancel/không giữ mật khẩu nháp cũ, uncertain cancel không tự bỏ chặn, reconciliation read lỗi không tự thoát. Nhóm G2 **33 tests PASS**; full **264file/2879PASS/0fail/0skip** vớiRedisDB2, lint/typecheck/build41routes và61built assertions PASS. JSON full tại `docs/learning/otp-expired-cancel-full-tests.json`. Browser bản sửa cuối giữ lượt code đến13:49:28 hết hạn tự nhiên, bấm Kết thúc trở về form bắt đầu ngay mà không reload. Không rút ngắn TTL hay sửa clock/Redis QA để làm nhanh ca này.

## Bằng chứng và trạng thái mã nguồn

Các ca đầu chạy trên `e3ab215`; lỗi expired-cancel được phát hiện sau đó và sửa như mục trên. CI e3ab215 và commit docs d4fad03 đã đạt build-test/Gitleaks/title; GitGuardian11 findings là check riêng đang unresolved. Backend fetch vẫn develop953f597/Zalo dc00b2f, không có API v2 mới để nối.

Ảnh task outputs: `qa-upstream-outage-draft-retained.png`, `qa-recovery-verified-pending-password.png`, `qa-user-recovery-tab-verified.png`, `qa-otp-expired-cancel-stuck-before-fix.png`, `qa-otp-expired-cancel-fixed.png`. Snapshot trước sửa **4file/29PASS/0skip**, sau sửa **4file/33PASS/0skip**, gồm UI/repository/HTTP và encrypted-flow integration với RedisDB2 thật; backend calls trong integration được fixture mô phỏng, không phải thêm33browser cases.
