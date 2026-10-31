# Web API — vá dependency, schema và xử lý lỗi

Ngày 24/10/2026, Asia/Saigon. Nhánh `feature/OMTS-132-web-foundation`, baseline commit `5ae1b66` cùng các tài liệu/test audit chưa commit từ phiên trước. Không tạo nhánh mới, không commit/push/merge. Mobile và backend không bị sửa.

## 1. Kết quả và giới hạn

Đã vá Next.js/Vitest, thêm wire schemas cho auth/permissions/profile, tách ProblemDetails parser và error mapper theo ngữ cảnh. Chưa thay mock composition, chưa tạo BFF runtime/session store, chưa bật live refresh hoặc ghép hồ sơ API thật.

W0.4 hoàn thành phần dependency/checks. W1.1 hoàn thành schema snapshot. W1.2 đã làm transport/error metadata và các mã không cần thiếu params; phần MSG06 chờ backend bổ sung thông tin theo quyết định Duy Thái ngày 24/10, không thêm câu dự phòng và không đánh dấu toàn bộ W1.2 hoàn tất.

## 2. Các micro-task đã làm

### W0.4 — Dependency security

`package.json` thay ba entry: Next16.4.0 →16.4.3, eslint-config-next16.4.0 →16.4.3, Vitest ^4.1.11 →^4.1.12. Lockfile resolve Vitest/mocker4.1.12, các package Next16.4.3; test toolchain có các patch đi kèm Vite8.3.4 →8.3.5, Rolldown1.2.14 →1.2.15, PostCSS8.5.30 →8.5.31 và platform bindings tương ứng. Không nâng major, không đổi React, không chạy `npm audit fix --force`.

Review tổng W0–W1 bổ sung: lockfile còn đổi dependency gián tiếp `@oxc-project/types` 0.154.0 →0.155.0 qua Vitest → Vite → Rolldown. Đây là thay đổi minor ở package type, không phải tất cả transitive changes đều là patch; không thêm dependency trực tiếp vào app. `npm ls` và checks đầy đủ đạt, không có kiểm thử tương thích riêng cho mọi package gián tiếp.

Đã kiểm tra Node24.13.1 đáp ứng engine của phiên bản được chọn, `npm ls` không báo invalid tree. `npm audit --json` exit0, zero vulnerabilities tại thời điểm kiểm tra. Đây là kết quả dependency audit, không phải chứng nhận ứng dụng an toàn tuyệt đối.

Nguồn primary đã đối chiếu: [Next Cache Components advisory](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr), [Vitest Windows advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-xp26-3454-mjgp). Không khai thác thử lỗ hổng và không expose dev server ra bên ngoài.

### W1.1a — Login, token và identity schemas

File `src/features/auth/api/auth-contract.schemas.ts` mô tả LoginRequest chỉ clientType Web, giới hạn request theo backend snapshot, AuthTokens đầy đủ hai gate flags, timestamp có offset, account/session GUID, `/me` identity riêng và RefreshRequest. Không trim password, không đọc nội dung JWT để cấp quyền, không gọi refresh.

Response object chấp nhận field thêm và chỉ trả các field schema nhận biết. Thiếu field thiết yếu, kiểu boolean sai, ngày sai hoặc actor chưa hỗ trợ thì reject. Request dùng strict schema, không gửi nhầm field ngoài contract. Generic `request<T>` vẫn không tự validate; adapter tương lai phải gọi schema. Chưa có adapter live để tự động áp schema vào mọi response.

### W1.1b — Permissions schema

File `src/features/auth/api/permissions-contract.schema.ts` giữ functions/actions và grants/permissions/dataScope tách biệt. Snapshot enum action gồm View/Create/Edit/Delete/Export/Import/Approve/Publish; DataScope OwnRecords/AssignedZone. Action/scope lạ bị từ chối, không tự mặc định thành all-zones.

Function code mới được giữ dạng dữ liệu, **không chuyển thành capability**. Schema không xác nhận một account có quyền: W1.4 còn phải map theo action và vùng, kiểm tra scope consistency và account identity. Không dùng role label hoặc scope tổng của function để cấp quyền edit rộng hơn grant.

### W1.1c — Profile schema

File `src/features/profile/api/profile-contract.schemas.ts` chấp nhận email/phone null, giữ verified flags, grants và opaque rowVersion. Update response theo controller là `{profile,message}`; không tin annotation Swagger ProfileView hiện sai envelope.

PUT request schema chỉ tên và rowVersion, từ chối username/email/phone. Max200 được ghi ở wire schema theo backend hiện tại; **không đổi validation form**, không đổi policy contact/Customer hoặc tách nút Save thành nhiều request. Domain `PersonalProfile.phone` hiện vẫn chưa nullable; đó là W1.3, chưa đóng bằng schema wire.

### W1.2a — Parse lỗi và metadata

`api-problem.ts` đọc application/json và structured +json. Chỉ giữ code, primitive params có giới hạn và currentRowVersion; bỏ raw detail/stack/top-level field khác. Optional metadata sai kiểu bị bỏ mà không làm mất code hợp lệ. Body lỗi malformed/HTML không làm UI crash. AbortError được giữ để caller phân biệt hủy request.

Retry-After dạng giây hoặc HTTP-date chuẩn GMT chuyển thành milliseconds, có clock injection để test không phụ thuộc giờ thật; header sai hoặc số không an toàn bị bỏ. Đây chỉ là metadata, không sleep/retry tự động, không quyết định thời gian khóa tài khoản.

### W1.2b — Error policy theo request context

`map-api-error.ts` tách ngữ cảnh public/login/protected/profile/refresh khỏi parser. Request không khai báo mặc định public để tránh tự xóa session vì request anonymous. Adapter bảo vệ sau này bắt buộc khai báo protected/profile đúng nghĩa; không suy ngữ cảnh từ chuỗi URL.

- Login401MSG12 giữ MSG12, không phát global expiry.
- Final401 protected/profile phát MSG19, callback expiry được bảo vệ khỏi exception của observer.
- Refresh401 trả MSG19 cho caller nhưng không phát global expiry; coordinator/refresh policy còn chờ, không tự bật refresh hoặc chốt ambiguous-timeout UX.
- Các mã hợp lệ đi cùng status tương ứng được giữ: MSG01/16/17/20, MSG02/13/67/68, MSG03/06 khi có đủ params, MSG69.403 gate không bị đổi thành logout.
- Unknown code/status pair dùng MSG04 an toàn; wire code vẫn có trên `ApiError.problem` để adapter xử lý, không hiện raw detail. PASSWORD_CHANGE_REQUIRED chưa có UI/flow mới, không bị suy thành authenticated app session.
- Chỉ params dùng bởi template được đưa vào `appMessage`; không đưa toàn bộ params chưa biết lên UI.429 giữ Retry-After và code gốc, chưa tự thêm UI/policy countdown.

`errorContext` là option nội bộ, được tách khỏi RequestInit trước fetch. `ApiError` thêm problem/retryAfterMs; status HTTP lấy từ response, không tin status trong body. Không serialize nguyên Error ra browser hoặc ghi token vào log trong BFF tương lai.

### W1.2c — Tests và sửa điểm yếu khi tự review

Chuyển năm characterization tests của audit sang regression expectations: MSG12 đúng ngữ cảnh, MSG67/68/69 giữ nghĩa, MSG06 giữ code gốc trong metadata. Thiếu structured conflict params chưa được tự gán tên/thời gian.

Tự review phát hiện body-read có thể thất bại sau fetch thành công. Đã gom lỗi này vào ApiError với status response và cause, nhưng vẫn để AbortError đi qua. Observer `onUnauthorized` ném exception không còn thay thế lỗi401 gốc. Đã thêm test deferred stream failure/cancellation, observer failure, JSON content type, lỗi malformed, context không bị gửi lên mạng, không retry ngầm và params dư không bị dùng cho UI.

## 3. Quyết định còn mở

**Quyết định cập nhật 24/10/2026:** Duy Thái chọn “Chờ backend bổ sung đủ thông tin”, không áp dụng câu dự phòng MSG06 đã đề xuất. Cần structured `user_name` và `time`, kiểm chứng contract/response trước khi ghép conflict thật. Không đổi catalog/UI. Hiện error giữ `problem.code = MSG06`, appMessage tạm MSG04 nếu thiếu params; đây chưa phải UX conflict hoàn chỉnh. Có params hợp lệ vẫn format MSG06 đầy đủ. Không parse detail tiếng Anh, tự reload hay ghi đè form.

BFF đã được duyệt từ23/10, store vẫn mở. Quyết định áp dụng chờ refresh retry/idempotency cho Web và lát profile read/name-only vẫn chưa có trả lời riêng; không dùng lời đồng ý vá dependency để tự chốt các mục đó. Staff QA vẫn chờ backend cấp; không tự đổi password/verified flag Owner.

## 4. Lỗi và cảnh báo thực tế

### npm install chậm và cảnh báo EPERM

`npm install` mất khoảng5 phút; log có các GET registry200 kéo dài29–89 giây. Đã kiểm tra tiến độ qua npm log, không mặc định process bị treo hoặc xóa lockfile/cài lại liên tục.

Cuối lệnh có warning EPERM khi unlink bản SWC cũ trong `node_modules/@next/.swc-win32-x64-msvc-mkkhfQwZ/next-swc.win32-x64-msvc.node`. Trên Windows, module native đang được process nạp có thể không xóa được. Đã thấy dev process port3000 có nạp module SWC; đây là bằng chứng phù hợp với khả năng file lock, không có handle-level trace chứng minh chính process đó giữ đúng file quarantine.

Cài đặt vẫn exit0; `npm ls` xác nhận tree mới và build bằng Next16.4.3 thành công. Không force-delete node_modules hoặc tắt các Node process khác. File cleanup warning có thể còn tới khi process cũ dừng; không coi đây là lỗi runtime đã chữa. Dev server đang mở từ trước chưa được restart trong task này; nên restart đúng server trước review giao diện bằng package mới. CLI tests/build sử dụng dependency mới đã kiểm chứng.

### Tra file sai extension/path

Lệnh đọc `vitest.config.ts` không tìm thấy vì repo dùng `vitest.config.mts`. Đọc PermissionAction tại Domain cũng sai vị trí; `rg --files` tìm thấy file ở Application/Features/Authorization/Models. Đây là lỗi tra cứu, không phải project thiếu file. Đã đọc file đúng, không tạo config/enum trùng để chữa.

## 5. Verification và tự đánh giá

Baseline từ audit:56 files/256 tests. Sau schema:59 files/293 tests. Sau schema/error và self-review:62 files/340 tests. Sáu test files mới, thêm84 cases; năm cases audit được đổi kỳ vọng, không dùng test xác nhận hành vi sai để báo đã sửa.

Quality gates đã chạy lại trên code cuối: `npm test`62 files/340 tests PASS; `npm run lint`, `npm run typecheck`, `npm run build` đều exit0; build xác nhận Next16.4.3. `npm audit --json` exit0, vulnerabilities trống. `git diff --check` và các link tài liệu đạt; learning notes vẫn ignored, `git ls-files docs/learning` không có entry. Readiness backend local kiểm tra lại trả200 Healthy; không thực hiện auth/profile mutation.

Không có browser E2E/API smoke thật trong đợt này, không đổi UI nên chưa làm responsive pass mới. SSR guard vẫn client-only; ứng dụng vẫn mock. Zero audit findings và unit tests xanh không đủ để báo Web/API/Jira hoàn thành. Jira OMTS-132 và parent OMTS-121 đọc lại được; ba key159/171/179 vẫn404. Không thay trạng thái Jira.

Tự review kết luận: phạm vi code đã làm đủ độc lập để tiếp tục W1.3/W1.4, nhưng phần conflict W1.2 chờ backend structured params theo quyết định đã chốt, và W2 chưa được phép chọn store. Rủi ro server session/caching/CSRF/token serialization/URL allowlist chưa được xử lý bằng các schema này. Không đưa client HTTP event channel dùng global vào server BFF cho nhiều người; BFF sẽ dùng transport server-only và parser/mapper thuần, không chia sẻ singleton auth state.
