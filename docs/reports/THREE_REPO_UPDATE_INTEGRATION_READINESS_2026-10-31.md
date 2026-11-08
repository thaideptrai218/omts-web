# Rà soát cập nhật ba repo và chuẩn bị tích hợp — 31/10/2026

Đây là snapshot audit trước triển khai. Kết quả hợp nhất, CI và runtime sau đó ở [báo cáo tích hợp](BACKEND_CONTRACT_INTEGRATION_QA_2026-10-31.md); các trạng thái “chưa áp/chưa đổi QA” bên dưới mô tả thời điểm audit.

Đã tải các nhánh remote, đọc thay đổi và kiểm tra khả năng tích hợp. Chưa merge, cherry-pick hoặc áp patch vào repo làm việc; chưa thay runtime QA 3003/API 8081, main 3002/API 8080 hay database. Lượt này chỉ thêm tài liệu rà soát trong Web và tạo bản đọc độc lập ngoài ba repo.

## 1. Code đã tải và phạm vi bảo toàn

| Repo | Checkout đang làm việc | Nhánh mới cần tích hợp | Kết quả |
| --- | --- | --- | --- |
| Web | feature/OMTS-132-web-foundation @ 12376d1 | PR #3 hiện tại | Fetch đủ remote branches; source ứng dụng giữ nguyên |
| Backend | develop @ 953f597 | chore/cors-zalo-mini-app @ 98e232c (#20); message-catalogue @ 7b67572 (#19); legacy-cleanup @ 0fa690b (#18) | Pull --ff-only báo Already up to date ở develop; thay đổi mới đang ở feature branches |
| Mobile | feature/OMTS-133-mobile-foundation @ 7a2beb4 | feature/zalo-mini-app @ 9cec84e (#3); feature/acs-zalo-linking @ 29626f6 (#4) | Pull --ff-only báo Already up to date ở nhánh cũ; giữ nguyên sửa đổi local, đọc nhánh mới bằng snapshot |

Repo gốc: D:\Đồ_án\omts-web, D:\Đồ_án\omts-backend, D:\Đồ_án\omts-mobile. Mobile vẫn có **55 dòng porcelain**: 32 đường dẫn tracked đang sửa và 23 mục untracked (26 file khi mở rộng thư mục). Danh sách tracked trước/sau giống nhau; không stash/reset/switch hoặc cài dependencies vào checkout Mobile cũ. Con số 55 không phải 55 file source độc lập.

Fetch refspec cũ của Web và Mobile chỉ tải một số nhánh. Đã chạy fetch tường minh với refs/heads/* để lấy toàn bộ remote branches, không đổi cấu hình fetch lâu dài. Vì thế chỉ pull develop sẽ bỏ sót phần mới.

Bản đọc riêng tại **D:\Đồ_án\.omts-review-20261031**:

- mobile-29626f6: code Mobile mới nhất, cài dependency và kiểm tra tại đây.
- backend-98e232c: nhánh tính năng Zalo/Sales/Workforce.
- backend-7b67572: nhánh message catalogue mới nhất.
- Các archive cùng revision và backend-reminder-test-7b67572.patch để tham khảo. Patch mới chỉ qua git apply --check, chưa áp dụng.

## 2. Nguồn và cách đánh giá tiến độ

Nguồn yêu cầu hiện hành: [Report-3 Software Requirement Specification V8](https://drive.google.com/file/d/1wXDOBumQUmn-XQvOMUg9ejerTbVZx6V7/view), metadata cập nhật 28/10/2026 09:21:41 UTC. Đọc nội dung qua Google Drive; không dùng bản Report3 v5.6 ngày 06/10 làm chuẩn hiện tại.

Catalog V8 có **80 UC nghiệp vụ**, thuộc FARM 6, CYCLE 6, WATER 4, HARVEST 4, TRACE 4, ORIGIN 1, ACCOUNT 10, PURCHASE 8, LABOR 16, SALE 11, DEBT 4, CLAIM 3, REPORT 3. Ngoài ra có 7 JOB và 11 API tích hợp, không cộng vào mẫu số 80. Tài liệu còn chứa screen/UC ID lịch sử và bảng chuyển đổi; cần dùng mã nghiệp vụ hiện hành khi đối chiếu.

[Ma trận từng UC, actor, API/client và phần thiếu](THREE_REPO_SRS_V8_MATRIX_2026-10-31.csv) có đủ 80 dòng. Đây là **inventory triển khai**, không phải 80 ca nghiệm thu:

- 38 UC có endpoint liên quan trực tiếp; nhiều UC mới chỉ làm một phần.
- 3 UC khác có phần nền: dashboard tổng hợp, loại việc chưa có đơn giá, theo dõi yêu cầu chưa có hóa đơn.
- 39 UC chưa thấy endpoint nghiệp vụ tương ứng trên nhánh active #20.
- Không quy đổi những số này thành “đã hoàn thành 47,5%”. Có route, model, quyền hoặc menu không chứng minh đủ main flow, alternative flow, tích hợp ngoài và acceptance criteria.

V8 có sáu actor nghiệp vụ: Owner, Zone Manager, Accountant, Employee, Trader, Public Viewer; Registered User là tổng quát hóa. Một số tài liệu Web cũ còn System Administrator/Staff. Đặc biệt Employee độc lập trong LABOR-03/06 khác phiên Staff liên kết hồ sơ mà code hiện dùng. Báo cáo ghi nhận khác biệt, không tự đổi quyền hay actor.

Jira OMTS-223 và OMTS-227 vẫn To Do, cập nhật 28/10, trong khi các lát code tương ứng đã tồn tại. Jira chưa phản ánh hết tiến độ; trạng thái ticket không đủ để kết luận có/chưa có tính năng. Không đổi Jira trong lượt này.

## 3. Thay đổi Backend

Nhánh #20 thêm Zalo link/login, yêu cầu tạo tài khoản Trader và Owner duyệt; SDK location; inbox; products và yêu cầu mua theo lồng; phân công, chấm công manual/QR, công việc cá nhân, nghỉ phép, thiết lập break/rounding và loại việc. Commit 98e232c sắp xếp lại thư mục controller/features/DTO.

[Inventory endpoint tại 98e232c](BACKEND_98E232C_ENDPOINTS_2026-10-31.csv): **174 khai báo HTTP action trên 30 controller**, gồm **8 action Development**. Đây là quét attribute source có ghép route/constants, không phải chạy Swagger hay kiểm 174 endpoint trên server.

| Nhóm controller | HTTP action |
| --- | ---: |
| Identity | 50 |
| Purchasing | 32 |
| Farming | 22 |
| WaterQuality | 17 |
| Workforce | 16 |
| Organization | 15 |
| Sales | 10 |
| Development | 8 |
| Notifications | 3 |
| Files | 1 |

Nhánh #19 đổi mã lỗi/title sang catalogue theo nhóm, giữ legacyCode một release; thêm messageCode/noticeCode; notification preferences dùng notice; raft condition bỏ harvestEventId/lotId luôn null. So với snapshot 56b4a2f đã đọc trước đây, 7b67572 chỉ thêm một commit sửa test reminder, không thêm API production mới.

Nhánh #18 dọn entity/scaffolding cũ và migration/model snapshot, không thêm workflow API. Nhánh LAB cũ c92787b/PR #13 đã đóng và bị thiết kế mới thay thế; không lấy controller payroll cũ để báo API payroll mới đã sẵn sàng.

## 4. Tiến độ theo nhóm chức năng

| Nhóm | Backend nhánh mới | Web PR #3 | Mobile PR #4 |
| --- | --- | --- | --- |
| Account/profile/inbox/prefs | API thật; Zalo và credential cùng tồn tại | Đã nối G1/G2, inbox/prefs; một số contract đang chờ | Zalo link/login/profile/inbox/prefs; chưa xác minh end-to-end trên điện thoại |
| Account/employee/HTX/quyền | Có account/employee/role/grant/profile API | Quản lý đã nối; create/reset Staff và grant mới còn blocker đã ghi nhận | Có màn gọi API quản trị; cần QA quyền/scope và đối chiếu quyết định Web |
| Vùng/bè/license/map | API thật | Đã có luồng API và QA; Manager license còn blocker | Có màn API/map/location; SDK/location cần Zalo device |
| Nhà cung cấp/vật tư/phiếu nhập/return | API thật | Đã nối và browser QA nhiều ca | Có màn gọi API; chưa có bằng chứng browser/device write tương đương Web |
| Nợ/thanh toán NCC | Record/list/allocate/debt có API | Đã nối, tester đã chạy pay/allocate | Có màn API; chưa đủ toàn bộ V8 |
| Đo nước/OCR/history/threshold | API thật; QA OCR/delivery có Fake provider | Đã nối và QA manual/OCR/correct/void | Có màn API, OCR tại hiện trường; camera/provider thật chưa nghiệm thu |
| Sản phẩm/yêu cầu mua | API catalogue/cages/response/cancel | Đã nối, QA 5 seed roles | Có API/màn tương ứng, chưa kiểm trên thiết bị |
| Phân công/chấm công/nghỉ phép | Có lát cơ bản, QR và settings | Đã nối manual + personal/leave; chưa có QR Web/sửa giờ | Có manual/QR/personal/leave/settings; camera/QR cần device QA |
| Chu kỳ/gieo/vật tư sử dụng/nhật ký | Chưa có workflow endpoint mới | Chưa có luồng API thật | Menu chưa có route thực hiện |
| Thu hoạch/lô/năng suất | Chưa có workflow endpoint mới | Chưa có luồng API thật | Chưa có luồng API thật |
| Truy xuất/QR công khai | Chưa có publish/trace/public provenance workflow | Chưa có luồng API thật | Trace lookup dùng SAMPLE_LOT, không phải API |
| Customer/invoice/thu tiền/công nợ khách/claim/report | Chưa có workflow endpoint mới | Chưa có luồng API thật | Placeholder/menu; chưa có luồng API thật |
| Đơn giá/lập-chốt-trả lương/phiếu lương | Chưa có workflow endpoint active | Chưa có luồng API thật | Chưa có luồng API thật |

Các phần **mới phát hiện chưa đủ V8**, dù có API/màn liên quan:

- PURCHASE-05 yêu cầu cả ghi tiền NCC hoàn lại và hủy payment sai. Controller hiện chỉ list/record/allocate; không thấy endpoint hai thao tác còn lại.
- LABOR-05/10 mới có nghỉ phép; chưa có yêu cầu sửa giờ vào/ra. LABOR-03/06 chưa có luồng cấp mã/đăng nhập Employee độc lập; LABOR-11 mới có loại việc, chưa có đơn giá giờ và ngày hiệu lực.
- SALE-11 có catalogue và trạng thái nhưng chưa có đơn giá bán theo V8. SALE-10 mới theo dõi request, chưa có invoice/provenance.
- ACCOUNT-10 chưa thấy API tìm audit tổng quát; audit ghi nội bộ và lịch sử grants không thay thế use case tìm kiếm.
- SRS V8 mô tả temporary password hiển thị một lần và Zone Manager quản lý nhân viên, khác các quyết định Web đã duyệt trước đây. Giữ nguyên quyết định hiện hành cho tới khi được chốt riêng.

## 5. Mobile đã đổi nền tảng

Nhánh feature/zalo-mini-app thay Expo bằng **Zalo Mini App / React 18 / Vite 5 / ZaUI / ZMP SDK / Jotai**. feature/acs-zalo-linking kế thừa nhánh này và có thêm 11 commit. Không thể ghép source framework/session của nhánh Zalo vào Next Web hoặc checkout Expo đang sửa rồi coi đó là cập nhật thông thường.

Code mới có 41 feature keys; 24 keys ánh xạ tới 20 route đích riêng biệt. 17 keys chưa có route chức năng và đi qua unavailable-page. Trong 24 key đã map, trace vẫn là dữ liệu mẫu; không dùng tỷ lệ map route làm tỷ lệ hoàn thành.

Đã đọc các module account, organization, farming, purchasing, water, sales, workforce, notifications, HTTP/session và navigation. Những chỗ cần sửa trước khi dùng chung backend đã hợp nhất:

1. src/features/account/pages/profile-page.tsx:68 so lỗi với MSG06; HTTP client chưa đọc legacyCode. Khi #19 đổi sang mã mới, UI conflict có thể không nhận đúng.
2. src/features/notifications/pages/preferences-page.tsx:90 nhận saved.notice nhưng thay bằng MESSAGES.MSG22 cố định. Cần hiển thị notice backend trả, tương thích noticeCode MSG-ACCOUNT-21.
3. src/features/traceability/components/trace-lookup.tsx dùng SAMPLE_LOT, chưa có API.
4. src/features/dashboard/pages/home-page.tsx:137 hiển thị role.stats mẫu cho Accountant.
5. HTTP client Mobile tự refresh rồi gọi lại request khi 401, kể cả method ghi; Web đã duyệt không refresh/replay tự động. Cần kiểm idempotency/kết quả chưa rõ cho Mobile trước phát hành; không sao chép cơ chế này vào Web.
6. docs/learning/08-device-white-screen.md ghi nhận vấn đề trắng màn hình/link Zalo trên thiết bị chưa được xác minh khắc phục. Build desktop thành công không đóng được vấn đề device.

## 6. Kiểm tra chất lượng đúng revision

| Repo/PR | Revision | Bằng chứng | Kết quả và giới hạn |
| --- | --- | --- | --- |
| Web #3 | 12376d1 | [CI 41148665559](https://github.com/thaideptrai218/omts-web/actions/runs/41148665559) | build-test PASS: 2901 test đạt, 48 Redis test skip; build 41 routes/61 built-product assertions. GitGuardian vẫn FAIL, chưa xử lý lịch sử theo quyết định trước |
| Backend #20 | 98e232c | [CI 41118188356](https://github.com/thaideptrai218/omts-backend/actions/runs/41118188356) | Domain 2/App 133/Integration 860 đạt, 1 integration FAIL; Docker image PASS |
| Backend #19 | 7b67572 | [CI 41150975046](https://github.com/thaideptrai218/omts-backend/actions/runs/41150975046) | 981 đạt/1 skip; build-test và Docker PASS; GitGuardian FAIL |
| Backend #18 | 0fa690b | [CI 40715569268](https://github.com/thaideptrai218/omts-backend/actions/runs/40715569268) | build-test/Docker/security checks PASS tại revision riêng, không chứng minh tổ hợp #18+#19+#20 |
| Mobile #4 | 29626f6 | [CI 41118055824](https://github.com/thaideptrai218/omts-mobile/actions/runs/41118055824) | npm ci/lint/typecheck PASS. Workflow tên build-test nhưng không chạy build/test |
| Mobile snapshot | 29626f6 | Local Node 24.13.1/npm 11.8.0, .nvmrc 24 | npm ci --no-audit --no-fund, lint, typecheck, build đều PASS. Chưa có test runner; chưa device QA. Build cảnh báo chunk >500 kB |

Lỗi Backend #20: DemoWaterSeedQaTests.Demo_zones_are_on_time_until_a_month_after_the_last_reading_then_reminded_once, expected 2 actual 0. Commit **7b67572** ở #19 sửa cách tính ngày test theo lần đo seed cuối thay vì today + 1 month; biên cuối tháng có thể trùng ngày. Patch 9 insertions/3 deletions qua **git apply --check** tại snapshot #20. Chưa áp patch và chưa chạy lại tổ hợp mới nên không báo #20 đã xanh.

Các kết quả Web và Backend là CI đã đọc đúng SHA; lượt này không chạy lại full suite Web/Backend vì không đổi application source. Mobile là kiểm tra local mới trong snapshot. Các bằng chứng browser Web trước đây ở [Sales/Workforce QA](WEB_SALES_WORKFORCE_WRITE_QA_2026-10-31.md) và các báo cáo role ngày30/10; không phải kiểm tra Mobile.

## 7. Phương án tích hợp đã chuẩn bị

### Bước A — Chốt đầu vào, giữ dữ liệu

Dùng backend #20 98e232c và Mobile #4 29626f6 làm baseline đọc tính năng; Web tiếp tục nhánh PR #3. Không hợp nhất hai client thành một codebase. Đồng bộ API contract, mã lỗi, quyền, trạng thái và test fixtures giữa ba repo. Checkout Mobile local cần được bảo toàn riêng trước khi chuyển nền tảng; không reset nội dung chưa commit.

### Bước B — Sửa CI Backend và hợp nhất thay đổi song song

- Đưa riêng test fix 7b67572 vào nhánh tích hợp Backend, chạy lại integration test reminder trước.
- #20 và #19 cùng xuất phát từ develop953f597; cả hai **chưa bao gồm #18**.
- Preview git merge-tree #20 với #19 có **14 đường dẫn conflict**. Nhóm chính: AuthController đổi vị trí; UserMessages; DTO monolithic bị tách; profile/password/notification services; verification throttle; purchase query; senders; water reminder test.
- Preview #20 với #18 có **4 đường dẫn conflict**: IRaftRepository, RaftDtos, OmtsDbContextModelSnapshot, MigrationTests.
- Khi giải conflict, chuyển thay đổi vào controller/DTO mới tương ứng, không khôi phục file cũ song song tạo endpoint/type trùng.
- Các preview là kiểm tra từng cặp; 14+4 không phải tổng conflict chắc chắn của lần merge ba nhánh. Clean text merge cũng chưa đủ chứng minh model/migration hợp lệ.
- Rà model snapshot/migration và chạy migration tests trên database sao chép có backup. Không chạy migration dọn dữ liệu lên QA đang dùng hoặc production trước khi xác minh dữ liệu giữ/xóa.

### Bước C — Đồng bộ client

- Web đã có compatibility catalogue/legacy và notice từ đợt29/10; giữ G1/G2, effective permissions, zone/OwnRecords, no automatic refresh/replay.
- Mobile cần sửa canonical/legacy error và notice như mục5; đọc messageCode/noticeCode theo contract mới.
- Giữ Web email hoặc phone, tạo Staff secret-free và các ràng buộc đã duyệt cho tới khi backend/BA giải quyết; không đổi theo API/SRS mới một cách âm thầm.
- Yêu cầu mua dùng **số lồng** theo [quyết định đã duyệt31/10](../decisions/WEB_SALES_WORKFORCE_SCOPE_2026-10-31.md), dù V8/Jira223 còn kg. Web có công việc cá nhân/nghỉ phép theo cùng quyết định.
- Không mở màn mock trong API mode cho những nghiệp vụ backend chưa có.

### Bước D — Kiểm chứng trước khi đề nghị merge

- Backend build/domain/application/integration/SQL migration tests và image build trên **revision tổ hợp mới**.
- Web lint/typecheck/test/build và QA role 3003: Owner, hai Manager khác vùng, Accountant, Trader, Staff liên kết và chưa liên kết.
- Mobile thêm build vào CI; test contract các phản hồi mới; Zalo thật trên thiết bị cho link/login, phone permission, map/location, camera/OCR, QR attendance và mất phiên/kết quả ghi chưa rõ.
- Kiểm các luồng chia sẻ dữ liệu: request Trader→Owner→Trader; assign Manager→personal Employee→leave Owner; receipt Manager→debt/payment Accountant; water Manager→inbox Owner.
- Ghi rõ provider thật hay Fake, sửa dữ liệu QA và đối chiếu API/database. Chỉ đề nghị merge sau khi có bằng chứng tại revision cuối và xử lý các check còn đỏ theo quy trình dự án.

## 8. Điểm bàn giao

Đã đủ thông tin để bắt đầu nhánh tích hợp có kiểm soát. **Chưa sẵn sàng merge thẳng**: Backend #20 còn CI đỏ, các nhánh song song có conflict/schema cần xử lý, Mobile chưa có Zalo device acceptance và còn compatibility/sample data cần sửa.

Không commit/push/merge trong lượt audit này. Báo cáo, CSV endpoint và CSV80UC được để local trong Web để review; learning logs/preview để ignored, các snapshot nằm ngoài repo. Không sửa SRS/Jira, role/grant, credential hay runtime QA.

