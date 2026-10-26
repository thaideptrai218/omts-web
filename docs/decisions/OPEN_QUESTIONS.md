# OMTS Web — câu hỏi mở cần quyết định

## Ghi nhận26/10 — contract nhân viên và ticket mới

- **Contract nguồn nhóm; API còn chờ:** OMTS-214 ghi PM quyết định PUT accountId thiếu/null giữ link; bỏ liên kết dùng DELETE riêng, trả EmployeeSaved.employee.rowVersion. Lời nhắc D DT ở comment10034 yêu cầu phát hành cùng PR16. PR còn draft/chưa merge tại lượt kiểm, develop vẫn776fbc0 theo audit. Xem [audit và micro-plan](../reports/BACKEND_JIRA_EMPLOYEE_UNLINK_AUDIT_2026-10-26.md); tiến độ UI/mock mới ở dòng dưới.
- **Đã được Duy Thái cho phép triển khai26/10:** nút bỏ liên kết riêng, giữ draft và dùng version mới khi lưu. Đã ghép UI/service/mock theo [báo cáo](../reports/WEB_EMPLOYEE_ACCOUNT_UNLINK_REVIEW_2026-10-26.md); API thật vẫn tắt. Không biến một lần Lưu thành PUT+DELETE rồi báo thành công cho cả hai.
- **Nguồn tracking mới:** Nhân viên/HTX là OMTS-203 (backend199/QA204), ACS Web201;123 đã Done nhưng cần đọc deliverable.215 ghi chuyển mobile sang Zalo Mini App do Sơn phụ trách, cần audit lại repo/SRS khi quay lại mobile.
- **Không bị ghi đè:** quyết định frontend email OR phone, username tạo tự động, secret-free delivery, MSG06 chờ metadata và live refresh tắt. Các mô tả khác trong ticket mới cần xác nhận trước khi đổi phần liên quan; audit không tự phê duyệt chúng.

---

Tài liệu này ghi lại các điểm chưa thống nhất giữa SRS, Jira, Figma hoặc backend contract. Không triển khai một phương án như yêu cầu đã xác nhận cho tới khi trạng thái được chuyển từ `Open` sang `Decided` và có người xác nhận.

> Cập nhật23/10/2026: các mục WEB-API bên dưới là decision register cho lát API thật. WEB-AUTH-01/02 giữ lại lịch sử; phone-only trong nội dung cũ không thay quyết định frontend Staff email OR phone đã được Duy Thái chấp thuận ngày20/10. Chênh lệch với backend vẫn cần BA/backend alignment, không tự sửa SRS/Jira.

## WEB-AUTH-01 — Có cho phép đăng nhập bằng số điện thoại chưa xác minh không?

- **Trạng thái:** Decided — Phương án B
- **Ngày xác nhận:** 14/10/2026
- **Người xác nhận:** Duy Thái
- **Phạm vi:** UC02 / SCR-03 / BR-34
- **Ảnh hưởng code:** label và helper text của identifier; login request/response contract; mock service; validation; first-login tests; phone-verification gate.

### Bằng chứng đang mâu thuẫn

1. UC02 Normal Flow ghi identifier là `username, phone number or verified email`. Cách viết này chỉ yêu cầu email phải verified.
2. UC02 branch 3a cho phép Trader/Staff đăng nhập khi chưa có verified phone, sau đó chặn mọi chức năng khác và bắt thực hiện UC08.
3. Entity Account mô tả email chỉ dùng đăng nhập sau khi verified; số điện thoại nội bộ có thể do Cooperative Owner nhập và được người dùng xác minh ở lần đăng nhập đầu.
4. SCR-03 lại ghi `Username, verified phone number or email`, có thể được hiểu rằng số điện thoại cũng phải verified trước khi dùng làm identifier.

### Phương án A — Cho phép số điện thoại chưa verified làm identifier

Backend tìm account bằng username, phone number hoặc verified email. Sau khi password đúng, nếu Trader/Staff chưa verified phone thì session chỉ được dùng cho gate UC08; các chức năng khác chưa mở.

Ưu điểm: khớp UC02 Normal Flow và hỗ trợ trực tiếp first-login branch 3a. Việc biết số điện thoại không đủ đăng nhập vì người dùng vẫn cần password.

### Phương án B — Chỉ số điện thoại verified mới dùng để đăng nhập

Staff có số điện thoại chưa verified phải đăng nhập lần đầu bằng username và temporary password, sau đó xác minh phone. Số điện thoại chỉ trở thành identifier sau khi UC08 thành công.

Ưu điểm: khớp câu chữ hiện tại của SCR-03. Nhược điểm: UI/hướng dẫn first login phải nói rõ người dùng bắt buộc dùng username trước khi phone được verified.

### Khuyến nghị ban đầu của frontend

Ưu tiên **Phương án A** vì khớp Normal Flow và branch 3a rõ hơn. Dù chọn phương án nào, backend phải trả về next action rõ ràng sau khi credentials hợp lệ, ví dụ `CHANGE_TEMP_PASSWORD`, `VERIFY_PHONE` hoặc `ENTER_APP`; frontend không nên tự suy diễn từ tên role.

### Quyết định đã xác nhận

Chỉ `username`, số điện thoại đã xác minh hoặc email đã xác minh được dùng làm identifier đăng nhập.

Staff ở lần đăng nhập đầu dùng `username` và temporary password. Sau khi credentials hợp lệ, người dùng vẫn bị chặn ở gate xác minh số điện thoại theo UC02 branch 3a/UC08; chưa được mở các chức năng nghiệp vụ cho tới khi xác minh thành công.

Hệ quả frontend:

- Label/helper text phải nói rõ số điện thoại và email cần được xác minh.
- Không gửi một số điện thoại chưa xác minh như identifier đăng nhập trong mock/API contract.
- First-login test phải dùng username, sau đó đi tới phone-verification gate.
- Nếu backend hiện thực khác quyết định này, cần đưa chênh lệch trở lại nhóm/SRS trước khi đổi UI.

## WEB-AUTH-02 — Contract biểu diễn post-login gate

- **Trạng thái:** Deferred — chưa chặn route/layout foundation; phải xác nhận trước khi tích hợp login API thật.
- **Vấn đề:** UC02 yêu cầu ba kết quả sau khi credentials hợp lệ: buộc đổi temporary password, buộc xác minh phone, hoặc vào ứng dụng với permission scope.
- **Không được tự chốt:** tên field, token được phát trước hay sau gate, route đích, và payload `/me/permissions`.

## WEB-API-01 — Hướng session cho Web

- **Decided một phần, 23/10/2026, Duy Thái:** chọn BFF Next.js; browser giữ opaque SID trong HttpOnly cookie, token backend ở server.
- **Decided bổ sung, 24/10/2026, Duy Thái:** chọn B — **Redis runtime + RAM chỉ cho tests**. Deploy chưa chốt; không runtime RAM fallback, không tự bật refresh thật.
- **Decided bổ sung, 25/10/2026:** sau đề xuất trực tiếp, Duy Thái yêu cầu tiếp tục triển khai keyring nhiều phiên bản từ cấu hình server-only. Active key dùng cho dữ liệu mới; key cũ được giữ để đọc trong thời gian rotation. Không commit key và không sinh key ngẫu nhiên mỗi lần khởi động. Đây chưa phải quyết định secret manager, lịch rotate/retire hoặc nơi deploy production.
- **Open:** môi trường/provider deploy, Redis production/durability, production key lifecycle và session giới hạn/revoke/retry. Cookie C1A/CSRF C2A và expiry tạm C3A đã được Duy Thái chốt tại WEB-API-07; không đồng nghĩa đã triển khai hoặc chốt refresh/idle/production lifetime dài. W2.1b không chọn nơi cấp key hoặc lịch rotation production.
- Đọc W2 trong [plan API](../WEB_REAL_API_IMPLEMENTATION_PLAN.md). Không chuyển toàn bộ câu hỏi session thành “đã chốt” chỉ vì đồng ý BFF.
- [So sánh store/backend](../reports/WEB_W2_SESSION_STORE_PROPOSAL_BACKEND_AUDIT_2026-10-24.md) giữ bằng chứng trước khi chọn B; [W2.1a/c](../reports/WEB_W2_1A_1C_SESSION_CONTRACT_2026-10-24.md) có contract/RAM tests, [W2.1b](../reports/WEB_W2_1B_SID_TOKEN_PROTECTION_2026-10-24.md) có SID/cipher helpers và injected keys. [W2.1d](../reports/WEB_W2_1D_REDIS_ADAPTER_2026-10-24.md) đã có adapter/SDK/unit tests, **chưa runtime wiring/nghiệm thu Redis thật**: Docker Engine chưa kết nối được,7 integration cases SKIP. Revoke gặp tranh chấp không được báo đã thành công; unavailable có thể là write outcome chưa rõ, không auto retry/fallback. Các quyết định production ở trên vẫn mở.
- **Evidence mới W2.1e, không phải quyết định production:** [review/môi trường](../reports/WEB_W2_1E_CONTRACT_REDIS_READINESS_REVIEW_2026-10-24.md) đã thử start Docker Desktop; Engine/WSL vẫn không phản hồi.27 live cases chưa chạy;618 tests khác đạt. Restore snapshot cũ có thể làm mất tombstone, CAS/AES-GCM không tự nhận ra rollback lịch sử. Durability/failover/restore và key policy vẫn cần nhóm chốt trước production, không tự chọn AOF/fsync/provider. Refresh vẫn tắt.
- **Follow-up W2.2, bằng chứng thay snapshot bị chặn ở trên:** [config/Docker repair](../reports/WEB_W2_2_SERVER_CONFIG_DOCKER_REPAIR_2026-10-24.md) đã sửa startup bằng quarantine các directory chỉ chứa IPC socket lỗi; Engine29.4.3 hoạt động.27 live cases PASS trên Redis7.4.11/6.2.24, full713/713; containers test đã dọn, không reset dữ liệu. Production durability/restore/failover/key vẫn mở, không bị chốt bởi tmpfs fixture. Config/helper mới chưa wiring app hoặc bật API/refresh; HTTP production hiện cần HTTPS, topology nội bộ khác phải review trước deploy.
- **W2.2e, evidence không phải quyết định mới:** [DTO/serialization](../reports/WEB_W2_2E_DTO_SERIALIZATION_2026-10-24.md) chuẩn bị token custody/DTO/diagnostic và fixture JSON/RSC/log; không tạo phiên, không chọn cookie/CSRF/lifetime/key/deploy, logger hoặc public login/gate payload. Raw transport/plaintext escape hatch vẫn nhạy cảm; full handler/DAL preflight còn mở, app tiếp tục mock và refresh tắt.
- **W2.4c–d evidence:** [runtime/DAL report](../reports/WEB_W2_4C_D_RUNTIME_DAL_2026-10-25.md) có keyring/config/read-runtime factory, context DAL và function/action/zone guard. Chưa có Next process ownership, live route/layout, feature-record filtering hoặc live API; production secret/Redis/deploy và record ownership vẫn mở.
- **Cập nhật26/10:** Duy Thái yêu cầu tiếp tục đến hết sau đề xuất route riêng; triển khai `/onboarding/password` và `/onboarding/contact`, khôi phục bằng phase server khi reload/nhập sai URL. Anonymous về login; invalid cookie qua recovery POST có CSRF; hạ tầng unavailable giữ cookie và hiện retry. [Báo cáo route/runtime](../reports/WEB_W2_4_ROUTES_RUNTIME_REVIEW_2026-10-26.md) ghi rõ phần đã nối và phần W3 chưa hoạt động; không tự giải quyết Staff phone-only/email-OR-phone hoặc refresh.

## WEB-API-02 — Refresh-Web trong lúc backend chưa có retry/idempotency

- **Chốt phạm vi hiện tại 24/10, Duy Thái:** chưa bật refresh thật khi làm W2.1. Thỏa thuận retry/idempotency và UX khi mất phản hồi vẫn mở; không suy rằng chọn Redis đã chốt policy refresh. Quyết định Mobile trước đó vẫn là chờ backend, không bật live refresh.
- Bằng chứng backend48ae1e0: rotation; replay/concurrent refresh có thể revoke. Không mặc định frontend single-flight đã giải quyết mất response.
- Chưa tự quyết ép đăng nhập lại khi kết quả refresh không xác định. W6 vẫn có thể viết tests/coordinator contract bằng fixture.

## WEB-API-03 — Hồ sơ lát API đầu

- **Open:** đề xuất GET hồ sơ + PUT tên trước; không tích hợp thay email/SĐT, Customer hay đơn hàng trong lát này. Đã hỏi, đang chờ xác nhận.
- Backend PUT tên và contact-confirm là hai commit khác nhau. Không âm thầm tách nút Lưu hiện tại thành nhiều mutation; không chạy contact/password mock trong phiên API.
- Cần chốt UI capability ở API mode, profile phone null, validation max200, MSG06 thiếu structured params và xử lý save mất response. Không bịa thông tin để khớp domain cũ.

## WEB-API-04 — Gate, QA account và logout khi lỗi mạng

- **Đã có:** frontend Staff email OR phone / Owner-declared contact; backend/SRS snapshot vẫn phone-only. Không mở lại câu hỏi OR để tự chọn khác; cần nhóm xử lý alignment. Owner forced-password cần domain/UI đúng actor, không dùng Staff shell để vượt gate.
- **Đã có:** chỉ bootstrap Owner; Staff QA do backend cung cấp. Không sửa verified trực tiếp; không tự đổi password Owner local trong audit.
- **Bằng chứng mới 24/10:** backend PR14 OPEN có demo seed Staff/Employee và các gate states, chưa merge develop/chưa chạy local. Có thể đề nghị nhóm cấp fixture từ đó hoặc chốt revision/DB demo riêng sau; không tự chạy seed gán password/verified flags, không coi fixture đã tồn tại và không đổi quyết định chỉ-bootstrap-Owner.
- **Open:** logout offline theo UC07, revoke intent phía BFF, cookie khi không tới được server, response logout cũ sau login mới. Đề xuất tombstone + bounded revocation debt; chưa chọn storage/queue hoặc cam kết đã revoke backend.
- Security dependency findings của audit23/10 đã được vá trong W0.4 ngày24/10; không bỏ qua các cổng session/authorization khi bật phiên thật.

### Cập nhật 24/10/2026 — dependency security

Duy Thái cho phép vá trên nhánh hiện tại. Next/eslint-config-next16.4.3, Vitest/mocker4.1.12 đã cài; audit0, build sau vá đạt. Không có nghĩa WEB-API-01 store, WEB-API-02 refresh hoặc WEB-API-03 phạm vi hồ sơ đã được chốt thêm. Không sửa Jira/SRS.

## WEB-API-05 — MSG06 không có structured người sửa/thời gian

- **Decided — chờ backend bổ sung đủ thông tin.** Duy Thái xác nhận ngày 24/10/2026; không áp dụng câu dự phòng đã đề xuất.
- **Dependency còn chờ:** backend trả structured params `user_name` và `time` cho MSG06; cần kiểm chứng contract/response và test trước khi ghép hiển thị conflict thật. Không parse detail tiếng Anh hoặc tự bịa tên/thời gian.
- Không thay catalog/UI. Parser hiện giữ `ApiError.problem.code/currentRowVersion`; appMessage vẫn fallback MSG04 nếu thiếu params, đây là giới hạn transport chưa ghép API, không phải UX conflict đã được chấp thuận. Có đủ params hợp lệ thì dùng MSG06 đầy đủ.
- Bằng chứng W2.2d: transport server mới chỉ chiếu status/known code/retry metadata, chưa chiếu free-form params/currentRowVersion và chưa render UI. Parser W1 ở trên không đổi. Khi backend bổ sung metadata, phải thêm schema/projection conflict riêng; không coi việc giữ code MSG06 là đã hỗ trợ đầy đủ hoặc dùng MSG04 làm quyết định UX mới. Xem [báo cáo transport](../reports/WEB_W2_2D_SERVER_TRANSPORT_2026-10-24.md).
- Không tự tải lại, ghi đè form hoặc đổi rowVersion. Quyết định này không chốt policy retry mutation. W1.2 phần conflict và W5.3 tiếp tục chờ dependency; phần độc lập không bị chặn.

## WEB-API-06 — Catalog, record ownership và platform capability trước activation

- **Deferred trước live integration, chưa tự chốt:** OMTS-123 vẫn To Do; catalog26 functions trong mapper là snapshot backend48ae1e0, không phải BA-approved default role matrix.
- OwnRecords phải được giữ riêng với AssignedZone; chưa định nghĩa ownership theo createdBy/assignee/employee/account. Không viết record-level predicate giả định hoặc nâng quyền cho tiện demo. BA/backend cần xác nhận semantics theo entity trước feature API tương ứng.
- `platform.cooperative.provision` chưa có function/payload binding được xác nhận trong snapshot này. Projection để unmapped, không tự suy từ actor SysAdmin; mock menu hiện hành chưa đổi. Phải xác nhận API/permission source trước khi nối capability này vào phiên thật.
- `workspace.overview.view` trong projection chỉ mở trang; mỗi KPI/tile phải dùng function/action/dataScope và backend filtering riêng. Không dùng key mở trang để đọc mọi số liệu.
- Mapper/tests W1.4 không giải quyết các quyết định trên và không thay SRS/Jira.

## WEB-API-07 — W2.3 cookie, CSRF và lifetime

- **Decided — C1A + C2A + C3A**,24/10/2026, Duy Thái xác nhận trực tiếp. [Đề xuất gốc và các phương án không được chọn](../reports/WEB_W2_3_COOKIE_CSRF_LIFETIME_PROPOSAL_2026-10-24.md) được giữ để đối chiếu. Không đổi WEB-API-01/02 thành đã chốt toàn bộ.
- **C1A đã chốt:** session cookie, HttpOnly, Secure trên HTTPS, SameSite=Lax, host-only/Path=/, prefix __Host- ở HTTPS; tên riêng không prefix/Secure=false chỉ HTTP loopback dev được cấu hình rõ. Không chọn C1B persistent cookie. Cookie chỉ SID; không hứa browser close là logout.
- **C2A đã chốt:** exact configured Web Origin + custom-header bắt buộc + route media-type budget + Fetch Metadata bổ sung, same-origin BFF/CORS đóng. Không chọn C2B synchronizer-token store/preauth lifecycle. Guard độc lập a3 đã có; binding vào handler/CORS/browser/session thật còn pending. Không suy SameSite/Host hoặc Server Actions tự bảo vệ Route Handlers.
- **C3A đã chốt cho giai đoạn refresh tắt:** active BFF expiry không vượt min(access expiry, refresh expiry) thực từ backend; expiry đã biết thì MSG19/yêu cầu login tại lát tích hợp. Không chọn C3B trì hoãn policy ngắn. Helper độc lập a4 đã có, binding vào store/DAL/handler và MSG19 thật còn pending; không nhầm known expiry với refresh lost-response policy đang chờ.
- NFR-01 trong Report3Finnal.md và source BE48ae1e0 default là15 phút/7 ngày/30 ngày; không tự đổi thành idle30 phút hoặc absolute8 giờ. C3A không nghiệm thu đầy đủ long-refresh NFR; idle/long-lived/shared-device policy vẫn cần bàn riêng trước production.
- **W2.3a1 đã làm độc lập:** [config/report](../reports/WEB_W2_3A1_WEB_SESSION_CONFIG_2026-10-24.md), explicit Web origin + profile `https|http-loopback-dev`, fixed C1A attrs, redacted/frozen output.75 config tests +1 marker; full925 PASS/27 Redis SKIP. Chưa cookie helpers/handler/guard/expiry runtime; không cấp SID/cookie, sửa env local/DB/BE/Jira/SRS, bật API/refresh hoặc commit/push/merge.
- **W2.3a2 đã làm độc lập tiếp theo:** [cookie helpers/report](../reports/WEB_W2_3A2_COOKIE_HELPERS_2026-10-24.md), factory dùng lại config a1; raw header đọc trước parsed map để không mất duplicates, chỉ trả hash; issue/clear đúng tên/flags/scope và wrapper chống JSON/log vô tình.82 cookie tests +2 marker; full1009 PASS/27 Redis SKIP,4 compiler builds PASS. Không đổi C1A/C2A/C3A, không tạo session/handler/app wiring hoặc gán missing/invalid thành MSG19; CSRF/expiry/browser và logout race/revoke còn mở. Không có quyết định nghiệp vụ mới, API/refresh vẫn tắt.
- **W2.3a3 tiếp theo:** [CSRF guard/report](../reports/WEB_W2_3A3_CSRF_GUARD_2026-10-24.md), marker cụ thể X-OMTS-Request:web, exact serialized Origin, Sec-Fetch-Site nếu có phải same-origin; explicit server policy method/json-or-none/byte budget/deadline, không invent gate/permission.122 cases +2 marker, full1133 PASS/27 Redis SKIP;4 negative builds PASS. Invalid config/policy không được tiếp tục;403 CSRF không tự thành MSG13/MSG19. Chưa handler thật, CORS response/UX mapping, browser/proxy acceptance, expiry hoặc session/revoke/race integration; không phát sinh quyết định nghiệp vụ mới, API/refresh vẫn tắt.
- **W2.3a4 tiếp theo:** [expiry helper/report](../reports/WEB_W2_3A4_SESSION_EXPIRY_2026-10-24.md), derive min actual ISO expiries, conservative ms precision, explicit clock, stored absolute cap không được nới.85 cases +1 marker; full1219 PASS/27 Redis SKIP,6 negative builds PASS. Generic refresh-bounded store schema chưa đổi; record vượt C3A là invalid-input, không tự migrate/update TTL. Clock unavailable không thành expired/MSG19; không thêm idle/grace/skew/refresh policy. Chưa actual Redis/clock/deploy/handler/DAL/gate/revoke integration; không có quyết định nghiệp vụ mới.
- **W2.3a5 partial:** [Next/browser fixture/report](../reports/WEB_W2_3A5_NEXT_BROWSER_COOKIE_FIXTURE_2026-10-24.md),15 unit tests mới/full1234 PASS/27 Redis SKIP;48 wire assertions qua2 Next compilers và15 browser HTTP checks PASS. Không có HTTPS endpoint/certificate được cấp cho fixture nên Secure/__Host- enforcement vẫn chưa kiểm chứng; không tự cài cert/trust hoặc bypass warning. Fixture không chốt auth/DAL/MSG19 UX/gate/revoke/race, không nối API/refresh. a5 chưa đóng toàn bộ; cần điều kiện HTTPS hợp lệ cho phần còn lại, không có nghiệp vụ mới được tự phê duyệt.
- **W2.3a6,25/10 — evidence, không phải policy mới:** [review/report](../reports/WEB_W2_3A6_FULL_REVIEW_2026-10-25.md),20 regression cases mới; sửa lint mặc định bỏ sót authored cookie fixture, giữ ignore generated output hẹp. Full1254 PASS/27 Redis SKIP, lint/typecheck/build/audit0,48 wire assertions,6 negative boundary và4 token/DTO serialization builds PASS. Review phần chuẩn bị đã xong; W2.3 runtime/DAL/session/gate/race và W2.2e-e5 vẫn mở, API/refresh tắt. HTTPS giữ pending theo yêu cầu trực tiếp lần này, không đổi C1A để né kiểm chứng. Browser HTTP15 checks là evidence a5, không chạy mới trong a6; không sửa SRS/Jira/BE hoặc tự đóng các câu hỏi production/MSG06/Staff gate/refresh.
