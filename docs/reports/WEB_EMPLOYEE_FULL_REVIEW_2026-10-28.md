# Review tổng thể phần nhân viên — 28/10/2026

Phạm vi: EMP-API-01a/01b, EMP-API-02, EMP-API-03, EMP-API-04a, EMP-API-04a-E và UI binding MSG01/MSG03. Nhánh `feature/OMTS-132-web-foundation`, HEAD trước review `b60e9e7`; contract backend theo snapshot `953f597`. Không đổi SRS/Jira/backend, không bật API hoặc refresh và không merge `develop`.

## Kết luận về phạm vi đã làm

Đã có lớp dữ liệu chuẩn bị cho đọc nhân viên, sửa hồ sơ cá nhân và bỏ liên kết tài khoản. Adapter BFF là factory chưa mount; giao diện sản phẩm vẫn dùng mock repository. Form tiếp nhận lỗi có cấu trúc đủ dữ liệu qua service contract và test giả lập. Không coi những phần này là đã chạy với .NET/QA hoặc hoàn thành toàn LAB-01/OMTS-203.

Đọc lại Jira [OMTS-203](https://welterial.atlassian.net/browse/OMTS-203), [OMTS-199](https://welterial.atlassian.net/browse/OMTS-199) và cha [OMTS-119](https://welterial.atlassian.net/browse/OMTS-119). Trạng thái lần lượt To Do, Done, In Progress tại lượt đọc; không thay trạng thái. Ticket có phạm vi lớn hơn lát hiện tại: vùng, ngân hàng, tạo tài khoản, nghỉ việc/quay lại và nghiệm thu QA vẫn phải theo dõi riêng.

## Rà soát từng lớp

| Lớp | Nội dung kiểm | Kết quả/giới hạn |
| --- | --- | --- |
| Schema response | List/detail/envelope/picker, enum, DateOnly, nullable, version | Tách read model đầy đủ khỏi model form mock; không bịa SĐT cho linked account |
| Mapper | Tên property, account status, vùng/ngân hàng, version và ID mong đợi | Giữ dữ liệu không chỉnh và kiểm ID; không chuyển thông báo tiếng Anh/credential vào UI |
| PUT/DELETE | Contract `accountId:null`, body/query, rowVersion | Null trong PUT không là unlink; DELETE riêng encode version đúng một lần, dùng version thành công cho lần lưu tiếp |
| GET | Search/status/zone/page, key trùng và giới hạn số | Không đổi default filter UI, không coi lỗi tải là danh sách rỗng |
| BFF | Server-only, CSRF mutation, Owner/application session, bearer | Kiểm lại phiên sau upstream; kết quả cũ/hủy bị loại, không retry/refresh/ghi cookie |
| Error metadata | Endpoint/status/code, field aliases/allowlist, Employee ID | Không nhận Account ID thay Employee ID, không parse detail/params hoặc metadata MSG06 |
| Form | Nhiều lỗi, nhóm/version, ARIA, focus, pending, duplicate ID | Giữ bản nháp; lỗi nhóm có tổng hợp; ID chưa có trong workspace không làm đóng editor |
| Kích hoạt | Route, service instance và cấu hình | Không có route API nhân viên mới; service vẫn mock; hai adapter chưa được nối runtime |

Các báo cáo chi tiết: [schema/mapper](WEB_EMPLOYEE_SCHEMA_MAPPER_REVIEW_2026-10-28.md), [request](WEB_EMPLOYEE_REQUEST_SERIALIZATION_REVIEW_2026-10-28.md), [BFF mutation](WEB_EMPLOYEE_BFF_ADAPTER_REVIEW_2026-10-28.md), [GET](WEB_EMPLOYEE_GET_ADAPTER_REVIEW_2026-10-28.md), [error metadata](WEB_EMPLOYEE_ERROR_METADATA_REVIEW_2026-10-28.md), [UI binding](WEB_EMPLOYEE_ERROR_UI_BINDING_REVIEW_2026-10-28.md).

## Phát hiện và việc còn mở

**EMP-FULL-REV-01 / P2 — mất focus sau unlink thành công, đã sửa.** Trên bản build tách từ index, mở Nguyễn Văn An, sửa ghi chú, xác nhận bỏ liên kết: account về rỗng và ghi chú còn nguyên, nhưng `document.activeElement` là nền trang (không có name), dù editor vẫn mở. Hủy bằng Escape lại trả đúng focus về `accountId`. Lịch focus cũ đặt ngay trong handler có thể chạy trước lúc popup native đóng hoặc form được bật lại.

Đã đưa cả focus sau hủy/thành công/thất bại vào một yêu cầu focus xử lý bằng effect sau commit, đợi `pending === null` và xác nhận đóng. Lịch cũ được hủy hoặc vô hiệu khi có lượt thao tác mới/unmount; lỗi structured vẫn ưu tiên ô lỗi/phần tổng hợp. Thêm test service trả chậm, form đang disabled và lịch frame sớm. Test kiểm outcome; jsdom không thay thế modal native, nên bằng chứng tái hiện chính là lần chạy browser trước sửa và lần kiểm lại sau build.

Các phần bị khóa không được tính là lỗi mới chỉ vì chưa ghép API. MSG06 thiếu người sửa/thời gian và MSG24 thiếu tên structured giữ trạng thái chờ backend. Không bổ sung fallback, lấy tên draft hoặc tự GET tên để lấp chỗ trống.

Form hiện chưa đủ vùng/ngân hàng; trạng thái nghỉ việc/quay lại của mock chưa là các hành động API riêng theo ticket; chưa ghép POST tạo hồ sơ/tài khoản và credential handover, phân trang/GET detail runtime, dirty-navigation, QA/DB/auth runtime. Đây là backlog triển khai đã biết, không đánh dấu hoàn thành hoặc tự đổi nghiệp vụ trong lượt review.

ID trùng chưa nằm trong workspace: giữ editor/bản nháp và báo chưa mở được; cần GET detail có kiểm quyền ở bước runtime sau. Path lỗi lồng/index chưa được mapper nhận; không coi đã hỗ trợ mọi lỗi model binding.

Các lỗi đã phát hiện và sửa trong các lát trước có test hồi quy: SĐT được backend hỗ trợ nhưng bị client từ chối, field JSON phẳng bị mất metadata, focus unlink bị tranh chấp, ID chưa có làm mất editor và thông báo mở thất bại bám sang lần lưu sau. Không che các lỗi này bằng đổi expected, bỏ test hoặc mở API.

## Kiểm chứng và phạm vi commit

Review tách thay đổi nhân viên khỏi các thay đổi hồ sơ/thông báo có từ trước. Xuất source từ index sang bản tạm, cài bằng `npm ci`, dùng `.env.example` với `OMTS_DATA_SOURCE=mock`; không dùng .env.local/node_modules/build có sẵn của máy chính. Đã đối chiếu hash toàn bộ source/scripts/fixture trong index với bản kiểm: khớp. Bài học 110 tại `docs/learning/` và log/ảnh tại `.hallmark/` giữ local theo Git ignore; không đưa secrets hoặc môi trường local vào commit.

| Kiểm tra | Kết quả |
| --- | --- |
| Cài dependencies từ lockfile | `npm ci` exit 0; có cảnh báo eslint deprecated, không đổi dependency ngoài phạm vi |
| Lint / Typecheck sau sửa focus | Đạt |
| Test binding/editor/unlink | 34 pass, gồm ca focus sau unlink thành công mới bổ sung |
| Toàn repo của source chuẩn bị commit, sau sửa | **2.044 pass / 31 Redis skip**, 169 file pass / 4 skip; 99,72 giây |
| Build sau sửa | Đạt, sinh 18/18 trang; không có employee API route mới |
| HTTP trên bản build sau sửa | 24 assertions đạt; không suy thành TLS/.NET/QA nghiệm thu |
| Ranh giới server/client | 12 ca đạt trên Webpack và Turbopack, có cả hai employee adapters và session helper |
| Serialization | 4 ca đạt; DTO an toàn ra HTML/RSC, token canary bị chặn; module server không đổi sau lượt này |

Số 2.057 trong báo cáo UI binding trước là lượt kiểm working tree có thêm 14 test hồ sơ/thông báo chưa commit. Lượt này thêm một test focus nhân viên và kiểm riêng source sẽ push, nên số cuối là 2.044; không có test bị xóa để lấy kết quả xanh. Các test Redis skip không được tính là đã nghiệm thu Redis/.NET/QA.

Bản tạm đặt trong `.hallmark/` bên dưới checkout nên Next cảnh báo nhiều lockfile và suy root về thư mục cha. Đã ghi rõ điều kiện này; không sửa config sản phẩm để che cảnh báo của môi trường review. Source tạm có dependencies riêng được cài từ lockfile; kết quả không được gọi là một máy/CI hoàn toàn độc lập. Bản tạm sẽ dọn sau khi lưu log.

Sau kiểm, log đã lưu ra `.hallmark/employee-review-evidence-20261028/`. Lệnh xóa bản tạm bị kiểm duyệt tự động chặn (`blocked by policy`); đã dùng phương án bảo toàn dữ liệu: dừng đúng server kiểm thử, đợi process kết thúc rồi chuyển bản tạm ra `D:/Đồ_án/.omts-web-review-20261028`, ngoài checkout. Không xóa dữ liệu hay đổi rule để né chặn; server người dùng ở cổng3000 giữ nguyên. Source tạm không còn nằm trong vùng quét test của repo.

**Browser native:** đã kiểm bản build tại origin loopback riêng, viewport 1280 px. Trước sửa, unlink thành công có focus ở nền. Sau sửa, `activeElement` là SELECT/name `accountId`, account rỗng, một dialog editor còn mở và bản nháp giữ nguyên. Lưu tiếp thành công, focus về đúng dòng nhân viên; mở lại thấy ghi chú đã lưu và account vẫn rỗng. Không tràn ngang trang: scrollWidth 1265 < innerWidth 1280. Ảnh local `.hallmark/employee-full-review-after.png` giữ vòng focus ở ô tài khoản và ghi chú chưa bị mất. Không coi lượt này đã kiểm lại 360/1024 px hoặc đã tái hiện các DTO lỗi mới trên API thật; chúng có component/HTTP fixture riêng.

Kết luận sau kiểm: một lỗi P2 mới đã sửa và có test bổ sung; không còn P1/P2 chưa xử lý được phát hiện trong lát code đã review. Backlog toàn LAB-01 và hai message chờ vẫn giữ mở. Commit chỉ chứa phần nhân viên cùng transport/fixture/tài liệu liên quan; không gom code hồ sơ, thông báo, tài khoản hoặc bản sửa Dialog dùng chung từ lượt khác.

Không sửa lịch sử Git, tắt scanner hoặc xử lý các incident GitGuardian trong lượt này. CI GitHub chỉ được gọi là đạt sau khi kiểm check của đúng SHA đã push; kết quả local không thay thế CI.

## Bổ sung sau push — CI đã hoàn tất

Đã push `e3c3013` lên nhánh hiện tại và [kiểm đúng SHA trên GitHub](WEB_CI_E3C3013_REVIEW_2026-10-28.md): build-test/Gitleaks/pr-title SUCCESS; log Linux xác nhận2.044 test pass/31 Redis skip, build18/18 và24 HTTP assertions. GitGuardian vẫn FAILURE với sáu incident lịch sử, không có dòng phát hiện trỏ vào e3c3013 trong check này. Không có lỗi code mới cần vá; không gọi toàn bộ CI xanh. PR vẫn draft, chưa merge develop; API và hai message chờ giữ nguyên.
