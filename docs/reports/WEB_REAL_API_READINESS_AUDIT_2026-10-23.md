# Audit Web trước ghép API thật — 23/10/2026

> **Historical snapshot:** cập nhật xử lý ngày24/10 ở [report W0–W1](WEB_API_W0_W1_SECURITY_SCHEMA_ERRORS_2026-10-24.md). Dependency đã vá, schemas và context-aware error transport đã có; một số findings khác vẫn mở. Các kết quả build fail/256 tests dưới đây là bằng chứng của ngày23/10, không phải trạng thái mới nhất.

## Kết luận

Web có UI và ranh giới service/repository để tái sử dụng, nhưng chưa nối login/refresh/profile/logout thật. Không cần viết lại giao diện; cần bổ sung adapter, session BFF và kiểm tra server trước khi bật dữ liệu thật. Duy Thái đã chấp thuận BFF trong phiên này; nơi lưu phiên vẫn mở. Kế hoạch chi tiết: [WEB_REAL_API_IMPLEMENTATION_PLAN](../WEB_REAL_API_IMPLEMENTATION_PLAN.md).

Audit chỉ thêm test mô tả hiện trạng và tài liệu. Không đổi runtime, dependency, backend, SRS, Jira hoặc Mobile. Không commit/push/merge trong phiên này.

## 1. Nguồn và cách kiểm tra

- Repo Web `D:\Đồ_án\omts-web`, nhánh `feature/OMTS-132-web-foundation`, baseline `5ae1b66`; working tree sạch lúc bắt đầu.
- Backend local worktree `D:\Đồ_án\omts-backend-local`, clean tại `48ae1e0438cec5d1123e7f7f6726377242855ce5`; `git ls-remote origin refs/heads/develop` trả cùng SHA. Không kết luận mọi nhánh/PR đều đã merge hoặc QA đang chạy SHA này.
- Đã đọc AGENTS/context/decision register/auth alignment plan, auth state/service/repository composition, HTTP client và tests, client route shell, profile domain/editor/service composition, access domain.
- Report 2 xác nhận Next.js Web. Report 3 UC02/05/07, BR-34/NFR-01 đối chiếu với quyết định frontend ngày20/10. SRS hiện có khác với đề xuất frontend, không tự sửa tài liệu nguồn.
- Jira `OMTS-132` đọc được, trạng thái trên Jira là Done; scope có refresh, permission guard, message catalog và quality gates. Source checkout này vẫn mock nên không dùng status ticket để khẳng định tích hợp đã xong. `OMTS-159`, `OMTS-171`, `OMTS-179` trả 404; không suy ra đã xóa hay hoàn thành, cần kiểm tra quyền/key khi bắt đầu implementation tương ứng.
- Không gọi Figma: đây là audit contract/session, không dựng lại màn hay đồng bộ thiết kế. Wireframe không quyết định storage/security.
- Đọc tài liệu Next.js cài tại repo: Route Handlers, cookies và các mục authentication/DAL/DTO/server authorization. Không áp dụng nguyên mẫu SPA client guard cho Next App Router.

### Runtime read-only trong phiên

`GET http://127.0.0.1:5280/health/ready` → 200, `Healthy`, không failing checks.
Swagger liệt kê login/refresh/logout, me, permissions, profile GET/PUT; đối chiếu source controller/service, không chỉ tên endpoint.
Anonymous HTTP GET `http://localhost:3000/dashboard` và `/account` → 200, có Next Flight payload. Source layout chỉ bọc `AppSessionShell` phía client. Đây là bằng chứng thiếu server authorization boundary, **không phải bằng chứng đã rò dữ liệu DB thật**: các màn hiện dùng mock và chưa nối backend. Sau ghép phải kiểm tra cả nội dung HTML/RSC/endpoint, không chỉ redirect sau hydration.

Không đăng nhập hay đổi mật khẩu Owner trong phiên audit này. Không gọi thành công refresh, không tạo Staff, không thử mutation hồ sơ thật. Các smoke từ phiên chuẩn bị backend trước không thay thế Web E2E lần này.

## 2. Findings và cách xử lý

### SEC-01 — P1: dependency bảo mật chặn build/release

`npm run build` đã compile, typecheck và prerender xong nhưng exit1 với `SecurityFatalError: Your version of Next.js is affected by a known security vulnerability`. Không báo build xanh và không retry chỉ để vượt thông báo.

`npm audit --json` exit1: 3 package findings, gồm `next` critical và `vitest`/`@vitest/mocker` moderate. Next cài 16.4.0; npm đề xuất 16.4.3 tại thời điểm kiểm tra. Advisory chính chủ có patch16.4.1 cho các vấn đề sau; cần đánh giá toàn bộ graph/lockfile sau nâng chứ không suy16.4.1 chữa mọi vấn đề hiện có:

- [Next Image Optimization advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw): RCE có điều kiện liên quan image processing trên glibc Linux. Không khẳng định máy Windows local đã bị khai thác.
- [Next Cache Components advisory](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr): có điều kiện `use cache` trả nhiều typed arrays. Repo bật Cache Components, chưa chứng minh có đường khai thác cụ thể; dependency vẫn cần vá trước release.
- [Vitest Windows advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-xp26-3454-mjgp): patch mocker4.1.12. Chưa tái hiện exploit; không đồng nhất test runner node của repo với browser mock server bị expose.

Giải pháp W0.4: task nâng patch dependency có review lockfile, chạy lại toàn bộ checks/audit và ghi evidence. Chưa sửa package/lockfile trong audit. Tránh public dev server/tunnel trong thời gian chờ.

### API-01 — P1: guard chỉ client, chưa đủ cho phiên thật

Nguồn: `src/app/(app)/layout.tsx`, `src/features/auth/components/app-session-shell.tsx`, `src/features/auth/state/auth-provider.tsx`.
Ẩn UI/redirect qua state React không bảo vệ mọi entry point Next. Giải pháp W2.4: server DAL, page và endpoint kiểm tra session/quyền trước dữ liệu. Layout/Proxy hỗ trợ điều hướng, backend vẫn authorize. Tách session cache theo người; không dùng shared static prerender cho private DTO. Chưa đóng finding.

### API-02 — P1: HTTP client làm mất ý nghĩa lỗi backend

Nguồn `src/shared/http/api-client.ts`: mọi401 → MSG19 + global expiry; các non-2xx khác → MSG04. Login401MSG12 sẽ bị diễn đạt sai; gate403, temporary-password-expired, lock423, conflict409 không phân biệt được. Generic `request<T>` chỉ ép kiểu JSON, không runtime-validate payload.

Đã thêm `src/shared/http/api-client.readiness.test.ts`: 1 test login401 + 4 trường hợp MSG67/68/69/06. **Đây là characterization tests** xác nhận hạn chế hiện hữu, không phải regression tests chứng minh lỗi đã chữa. W1.2 sẽ đổi kỳ vọng sang preserve code và chỉ phát expiry cho đúng protected-session context; W1.1 kiểm tra schema tại adapter. Không đổi runtime trong đợt audit.

### API-03 — P1: refresh rotation chưa đáp ứng quyết định retry

Nguồn backend `Features/Auth/AuthService.cs`: token cũ bị coi replay, concurrent rotation có thể revoke. Mất response sau khi server rotate khiến app không biết token mới; không thể gửi lại token cũ một cách mù quáng. Một Promise global không giải quyết nhiều Next process/tab hoặc crash.

Duy Thái đã chọn chờ hỗ trợ retry/idempotency cho Mobile; đề xuất áp dụng tương tự Web đang chờ trả lời. Live refresh chưa bật. W6 thiết kế/tests bằng fixture trước; backend phải chốt semantics rồi mới smoke. Không tăng TTL, không đổi sang forced-login cho ambiguous refresh mà chưa được duyệt.

### API-04 — P1: post-login gate chưa khớp toàn bộ actor

Backend phát token kèm hai cờ trước gate. `GET /api/me` qua gate được; permissions không được; profile qua phone gate được nhưng không qua forced password. Web union hiện có Staff onboarding và Trader phone gate, thiếu kết quả forced-password chung cho Owner bootstrap.

Backend/SRS phone-only cho Staff, cho phép nhập số khác và temporary password24h; frontend đã được chấp thuận email OR phone, Owner-declared contacts và72h. Đưa khác biệt cho BA/backend, không tự rollback quyết định người dùng và không sửa SRS/Jira. W3.3 phải tách phiên giới hạn khỏi phiên ứng dụng, không giả lập đủ quyền khi chưa tải permissions.

Owner local hiện cần đổi mật khẩu. Không tự đổi trong audit. Staff QA chờ nhóm backend theo quyết định trước. Thiếu fixture là thiếu evidence E2E, không có nghĩa phải dừng viết parser/mapper/tests.

### API-05 — P2: profile không thể thay adapter nguyên xi

`PersonalProfile.phone` Web bắt buộc trong khi ProfileView cho null. `ProfileEditor` gom verified email/phone candidates vào cùng Save. Backend PUT chỉ tên + rowVersion; contact xác nhận ở request riêng và có tác động Customer cho Trader. Không được tách ngầm thành nhiều mutation rồi vẫn báo “lưu tất cả” thành công.

Backend profile PUT thực trả `{profile,message}`, nhưng annotation Swagger khai ProfileView. Nguồn: `MeProfileController.UpdateProfile`. Đây là drift documentation/runtime đã thấy từ code; chưa smoke PUT trong phiên này. Không dùng generated client không kiểm tra response envelope.

Tên backend max200, UI hiện chỉ trim/min1. MSG06 backend trả code/detail/currentRowVersion, không structured time/user_name mà domain Web yêu cầu. Không parse tiếng Anh hay bịa params. W1.3/W5 có nullable mapper, version opaque, tách đọc/lưu tên và câu hỏi message/validation/unknown mutation outcome trước khi sửa UI.

### API-06 — P1 trước live: logout chưa có revoke debt/cookie race contract

`performLocalFirstLogout` xóa state/cache trước, chờ tối đa1500ms rồi bỏ qua remote failure; request chưa chắc đã hủy. Cách này giải quyết UI treo nhưng không chứng minh upstream revoke. Với HttpOnly BFF, mất kết nối tới BFF cũng không cho JavaScript xóa cookie.

SRS UC07 có offline đánh dấu revoke khi online; hiện helper chưa có durable intent. W4 đề xuất BFF tombstone trước upstream await, revoke intent có policy và test late response/cookie/login mới. Không báo offline/logout server hoàn tất chỉ vì quay về login. Policy cần xác nhận, chưa triển khai.

### API-07 — P2: composition và danh tính còn gắn fixture

`auth-service.instance.ts` luôn tạo mock; `personal-profile-service.instance.ts` lookup fixture theo accountId; profile overview còn yêu cầu mock verification/security service. Account thật không có fixture sẽ không tải đúng hồ sơ nếu chỉ thay login. `.env.example` localhost5000 không phải backend local5280; hiện đổi env chưa đủ làm app gọi API.

Giải pháp W2/W3/W5: mode cấu hình rõ, backend env server-only, không API-error→mock fallback; không để nút thật gọi mock rồi toast thành công. Quyền wire function/action/zone khác domain keys; mapper cần review tường minh, không suy từ role. Function tổng hợp có thể gộp scope của nhiều action nên không dùng scope tổng để cấp edit rộng hơn grant. Đây là rủi ro mapping cần test, chưa khẳng định một lỗi phân quyền Web API đã xảy ra.

### API-08 — P2: response muộn cần test trước ghép mạng thật

AuthProvider có latest-operation cho login/getSession/logout nhưng `completeStaffOnboarding` cập nhật trực tiếp và `updateDisplayName` không kiểm tra accountId/generation. Khi ghép network, kết quả cũ có thể tác động session khác; đây là risk từ code inspection, chưa tái hiện browser E2E. W3.4/W4.2/W5.2 thêm test deferred response trước khi sửa, không coi audit là đã khắc phục.

## 3. Kết quả checks thực tế

| Kiểm tra | Kết quả trong phiên |
| --- | --- |
| Baseline `npm test` | 55 files /251 tests PASS |
| Sau thêm test `npm test` | 56 files /256 tests PASS |
| `npm run lint` | PASS, exit0 |
| `npm run typecheck` | PASS, exit0 |
| `npm run build` | FAIL, exit1 — SecurityFatalError sau compile/prerender |
| `npm audit --json` | FAIL, exit1 —1 critical +2 moderate package findings |
| Backend readiness | 200 Healthy |
| Web API E2E/login/refresh/update/logout | Chưa chạy trong phiên; không báo đạt |

Không test responsive bằng browser trong audit này vì không đổi UI. Vitest hiện node environment, không có component/browser E2E runner; plan có task bổ sung/kiểm tra browser riêng, không gọi unit test là E2E.

## 4. Tự đánh giá báo cáo và phạm vi còn thiếu

Đã phân biệt implementation, contract snapshot, giả thuyết/risk và quyết định chờ. BFF được duyệt nhưng store chưa chọn. Báo cáo đủ để bắt đầu W0.4/W1, chưa đủ để cho production/QA Done. Phát hiện dependency security khiến quality gate chưa đạt dù test/lint/typecheck xanh.

Giới hạn: chưa kiểm chứng account đã hoàn tất gate, PUT/profile conflict thật, refresh-success/lost-response trên Web, upstream outage/logout debt, production deployment store và trusted proxy. Chưa đọc được ba Jira key phụ, chưa có xác nhận BA/backend cho OR contact. Không tự nhắn cho nhóm, đổi ticket hay seed dữ liệu để lấp thiếu evidence.

Tiếp theo: xin xác nhận task vá dependency, làm parser/schema/mapper theo micro-task; chốt store trước runtime BFF, chốt hồ sơ lát đầu và refresh-Web trước bật. Khi một endpoint thay đổi, dừng lát liên quan và làm phần độc lập trong plan thay vì đứng chờ toàn bộ frontend.
