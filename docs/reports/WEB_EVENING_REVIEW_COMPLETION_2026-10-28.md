# Hoàn thiện luồng Web trước buổi kiểm tra — 28/10/2026

Nền e9f1bdb, nhánh `feature/OMTS-132-web-foundation`. [Plan từng bước](../WEB_EVENING_REVIEW_PLAN_2026-10-28.md). Đọc lại Jira OMTS-201/118 và OMTS-203/119. Phạm vi là các luồng hiện có bằng mock; chưa phải nghiệm thu toàn bộ SRS hay tích hợp QA API.

## Những thay đổi người dùng có thể kiểm tra

- Hồ sơ cá nhân có Hủy thay đổi; tên tối đa200 ký tự theo OMTS-201 và ProfileService.cs backend953f597. Giữ nguyên nội dung sai để sửa, không tự cắt tên. Kết quả save chỉ tác động đúng tài khoản đang mở; trường được mở khóa rồi mới nhận focus lỗi.
- Email/SĐT hiện có chưa verified có nút Xác minh. Gửi OTP đúng liên hệ, xác minh rồi chờ Lưu thay đổi; không bắt đổi địa chỉ/số. Intent riêng chỉ nhận giá trị hiện có chưa verified. Luồng đổi sang giá trị mới vẫn từ chối giá trị cũ.
- Popup đổi liên hệ được dựng riêng theo lần mở/kind/currentValue. Kết quả cũ không bật lại OTP, phát MSG19 hoặc tác động lần mở mới. Không gửi sau unmount trong lúc validation.
- Đổi mật khẩu khóa đóng khi command bắt đầu, xóa các ô khi popup đóng, bỏ kết quả cũ và bắt lỗi kết nối thành feedback. Giữ bản nhập khi lỗi để sửa/thử thủ công, không log/store mật khẩu. Current-password proof và forced mode giữ nguyên.
- OTP không cho verify/resend đồng thời hoặc double submit trước render. Đóng popup bỏ state của form; phản hồi verify/resend cũ không gọi callback lên form mới. Số lượt/cooldown/TTL giữ nguyên.
- Hồ sơ HTX tải/retry theo workspace có key accountId; hết quyền sẽ bỏ workspace. MSG02 hiện trang từ chối quyền thay cho lỗi kết nối. Save có khóa đồng bộ và bỏ callback sau unmount; giữ nguyên preview và ngân hàng.
- Review chung các bản sửa P7 đang local: profile A/B/retry, draft thông báo theo lần mở, phản hồi save cũ, pending-close và focus native khi gỡ dialog. [Nhật ký P7 trước đó](WEB_PROFILE_NOTIFICATION_LIFECYCLE_REVIEW_2026-10-27.md) là bằng chứng của snapshot27/10, không phải số test source hôm nay.
- Kiểm browser tiếp phát hiện ô đăng nhập còn giá trị sau logout. Next Cache Components dùng Activity giữ state trang khi chuyển route. LoginForm nay xóa identifier/password sau kết quả được chấp nhận; khi bị từ chối vẫn giữ để sửa. LoginExperience xóa gate onboarding sau khi hoàn tất. Không đổi cache/session policy hoặc cấm password manager của browser.

## Hai quyết định mới

WEB-PROFILE-CONTACT-01: người dùng đồng ý xác minh liên hệ hiện có chưa verified. WEB-COOP-BANK-01: giữ khối ngân hàng HTX, chờ BA xác nhận dù OMTS-203 yêu cầu chuyển PAY-01. [Sổ quyết định](../decisions/OPEN_QUESTIONS.md) ghi rõ cả hai. Không sửa Jira/SRS/backend hoặc ngân hàng nhân viên.

## Lỗi đã tái hiện và sửa

| Nhóm | Trước sửa | Nguyên nhân và cách sửa |
| --- | --- | --- |
| IDENT / P2 | 3/3 test FAIL: gửi sau unmount, MSG19 từ form đã đóng, onStarted của lần mở cũ | RHF validation và service promise sống lâu hơn view. Session con chỉ tồn tại khi mở; capture scope trước validation và kiểm active sau await |
| PASSWORD / P2 | 4/4 FAIL: command sau unmount, success/expiry cũ, hai callback đóng tại handoff | Cũ giữ form trong Dialog đóng và không kiểm vòng đời. Unmount session khi đóng; khóa ref trước command; check scope; catch lỗi |
| PROFILE-SAVE / P2 | 4/4 FAIL: command sau unmount, cập nhật sidebar/toast cũ, expiry cũ, contact còn sửa khi save | Capture scope trước resolver, check sau await; khóa contact/name và binding accountId ở kết quả |
| OTP / P2 | 3/3 FAIL: callback sau đóng, resend khi verify, verify2 lần đồng bộ | Ref busy đặt trước service, cleanup scope theo request; disable resend theo busy; đóng bỏ content |
| PROFILE-NAME / P2 | Schema/UI chấp nhận201 ký tự; 2 test FAIL | Jira và backend cùng giới hạn200 nhưng schema/mock bỏ sót. Thêm kiểm tra ở hai boundary; giữ dữ liệu và proof khi bị từ chối |
| COOP-LOAD / P2 | 3/3 FAIL: workspace account cũ, retry expiry sau mất quyền, forbidden hiển thị load error | Key account + cleanup cho load/retry chung; forbidden riêng MSG02 |
| COOP-SAVE / P2 | 3/3 FAIL: success/expiry sau unmount, save2 lần ở handoff | Scope active và cờ saving đồng bộ; UI vẫn dùng state hiển thị pending; không rollback command đã gửi |
| FOCUS / P3 | 2 FAIL/11 PASS khi tăng assertion focus | setError.shouldFocus chạy khi input/fieldset vẫn disabled. Effect đợi isSubmitting=false rồi focus field lỗi |
| LOGIN-REUSE / P2 | Native logout quay lại form còn ô đã nhập; hồi quy sau sửa selector có1 FAIL/1 PASS | State trang được Activity giữ. Form reset sau accepted, gate được dọn sau complete;3 hồi quy cho accepted/rejected/completion đạt |

Log RED/GREEN đặt trong `.hallmark/evening-*.log` local. Tests dùng Promise điều khiển để tạo đúng interleaving, không dùng sleep để né race. Việc bỏ kết quả UI không bảo đảm backend đã hủy request hoặc rollback.

## Lỗi kiểm tra trong lúc thực hiện

`npm run lint` ban đầu cảnh báo `react-hooks/exhaustive-deps` ở cleanup `validation.current++`. Ref active của scope đã đủ vô hiệu hóa validation cũ; bỏ phép tăng thừa, không disable rule. `npm run typecheck` báo TS2322 tại Host test: useState suy luận contacts luôn khác null, trong khi PersonalProfile cho phép null. Khai báo `useState<PersonalProfile>` đúng domain, không ép kiểu để né lỗi.

Hồi quy LoginForm đầu tiên chưa chạy tới lỗi ứng dụng: getByLabelText exact không tính dấu bắt buộc trong label,2 setup FAIL, cold jsdom47,52s. Chuyển sang regex neo đầu để vẫn chỉ đúng password input; lượt RED thực có1 FAIL/1 PASS,2,61s. Typecheck sau đó bắt TS2769 vì `exact` của Playwright bị dùng nhầm trong Testing Library getByRole. Bỏ option không tồn tại; string `name` của Testing Library vẫn khớp chính xác. Không nới timeout hoặc giảm assertion.

Build snapshot đầu dùng junction node_modules ra ngoài root bị Turbopack từ chối: `Could not find the Next.js package`, kèm `Filesystem root used for resolution`. Package vẫn tồn tại; root hermetic không cho đi qua junction tới sibling repo. Lệnh gỡ junction bị kiểm tra tự động chặn trước thực thi. Giữ nguyên snapshot và tạo `.omts-web-evening-localdeps-20261028` mới, `npm ci` theo lockfile:455 packages,0 vulnerabilities. Build ở đó đạt; không đổi turbopack.root/config sản phẩm hoặc cài certificate.

So sánh source ban đầu dùng rglob lấy cả `.next`/next-env sinh tự động và CRLF nên báo chênh giả. Kiểm lại bằng danh sách Git tracked/untracked hợp lệ và chuẩn hóa newline:573 source/test files trước bản vá login khớp snapshot. Bảng kiểm cuối sẽ dùng phạm vi Git, không so artifact build theo đường dẫn máy.

## Kiểm chứng cuối

Hai lượt trước bản vá LOGIN-REUSE đều đạt2.299 PASS/31 Redis SKIP (138,18s và157,47s); lượt dùng dependency độc lập build18/18,24 HTTP assertions đạt. Đây là snapshot trước finding browser login, không phải kết quả cuối sau finding đó.

Lượt cuối có thêm ba hồi quy login chạy tuần tự trong `D:\Đồ_án\.omts-web-evening-localdeps-20261028`, sao từ HEAD và đúng working tree hiện tại; không copy `.env.local`, mật khẩu hay learning. Không build đè server3000 hoặc preview3105 đang chạy.

| Kiểm tra source cuối | Kết quả |
| --- | --- |
| npm ci theo lockfile trong snapshot độc lập |455 packages,0 vulnerabilities |
| npm run lint | PASS,0 warning |
| npm run typecheck | PASS |
| npm test | **2.302 PASS/31 Redis SKIP**,192 files PASS/4 SKIP,208,84s |
| npm run build | PASS,18/18 trang |
| npm run test:session-pages | PASS,24 HTTP assertions |
| Đối chiếu source/test với working tree |575 Git files khớp sau chuẩn hóa newline, package/config cũng khớp |
| Native login→logout trên build cuối | identifier/password đều length0; đúng URL /login |
| Phạm vi chuẩn bị xuất bản |43 files,35 source files khớp snapshot; staged diff/link checks đạt |

Thêm53 test so e9f1bdb:14 từ P7 local được review lại và39 của lượt hoàn thiện này. Redis skip vì không cấp dedicated OMTS_TEST_REDIS_URL; không gọi đây là kiểm Redis/QA. Log cuối `.hallmark/evening-final2-{lint,types,tests,build,http}.log` ở snapshot. Preview cuối PID9808 tại127.0.0.1:3106, process hidden với source mock; tab review được giữ, viewport override được reset. Không suy localhost là đã deploy để thầy mở từ máy khác.

Phạm vi xuất bản đã rà không có `.env`, dependency/workflow thay đổi, learning hoặc ảnh/log. Bài120 vẫn ignored local. Đây là bản cùng nhánh hiện tại để review; không merge develop, không sửa trạng thái Jira và chưa suy kết quả GitHub CI của commit mới.

## Browser và Hallmark

Đã đi bằng UI thật trên production preview3106: pham.cuong/demo123 → profile → gõ nháp/Hủy → Xác minh email hiện có → OTP123456 → chờ lưu → Save → verified. Logout rồi login bằng chính `cuong.pham@omts.test` thành công, vẫn đúng Phạm Quốc Cường/Khu Nam. Không có email/SMS thật. SĐT hiện có được kiểm tương tự bằng component/repository test, không tuyên bố đã lặp riêng trên browser.

Ở360px document345px, OTP dialog khoảng344,8px; ở1024px document1009px và password dialog512px. Không tràn ngang trong các màn này. Thông báo: bật Công việc/Email → Save → popup đóng → focus trở về Tùy chọn thông báo, khóa cuộn nền được gỡ → reopen vẫn checked. Password popup: nhập current mock rồi đóng/mở, cả3 ô có length0. Không thực hiện đổi mật khẩu bằng browser trong lượt này; service/UI test kiểm success/error/pending.

Ảnh local: `.hallmark/evening-current-email-pending-360.png`, `evening-current-email-otp-360.png`, `evening-security-empty-1024.png`. Full-page screenshot API từng trả Unable to capture screenshot; chuyển sang native getScreenshot, giữ đúng viewport và đo DOM để xác nhận kích thước, không tạo ảnh thay cho UI.

Sau bản vá LOGIN-REUSE đã reload bản build cuối, login Owner rồi logout: native AX không còn value cũ, read-only DOM chỉ đo length đều0. Ảnh `.hallmark/evening-login-clean-afterlogout-1024.png`. Browser xác nhận accepted/reset; rejected preservation và onboarding completion được kiểm bằng3 hồi quy. Không coi browser autofill/password manager là dữ liệu do app đã xóa được ở bên ngoài.

Hallmark audit giới hạn các component vừa chỉnh: nếu quét component rời sẽ báo thiếu focus vì không thấy globals.css. Có global focus-visible tại dòng91; kiểm cả context loại được finding này. Quét context còn2 FAIL do thiếu Hallmark stamp và overflow:hidden ở selector khóa cuộn popup,1 REFLEX thiếu active styling,3 WARN token/scrollbar. Đây là audit, không gọi nó PASS hoặc tự thay brand/scroll-lock để làm scanner xanh. Không áp quy tắc trang quảng bá lên trạng thái modal của ứng dụng; focus và scroll-lock được kiểm bằng test/native như trên.

## Những giới hạn còn thật sự mở

API/refresh thật vẫn tắt. MSG06 structured và tên MSG24 chờ backend; không có fallback mới. GitGuardian để sau theo yêu cầu. Catalog thông báo thật và hợp đồng tạo account/username/delivery vẫn cần BA/backend align. Web Trader registration chưa được chọn triển khai. Logo HTX chưa triển khai; đổi public projection và xác nhận rời trang có nháp chưa thực hiện trong lát này. Không coi luồng cũ là đã đạt đầy đủ OMTS-203 mới. Không thêm số thu chi/sản lượng giả, cron/cache hoặc thay quy tắc session để làm bản trình diễn.
