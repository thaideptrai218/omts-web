# Màn đọc Sales và Workforce — QA 31/10/2026

**Cập nhật sau phê duyệt:** hai câu hỏi đã được người dùng chốt; luồng ghi và màn cá nhân đã được nối/kiểm trong [báo cáo tiếp theo](WEB_SALES_WORKFORCE_WRITE_QA_2026-10-31.md). Các câu “chờ” và dữ liệu0 bên dưới là snapshot lát đọc trước đó.

## Backend mới, không merge

Fetch origin ngày31/10 tìm thấy nhánh `chore/cors-zalo-mini-app` từdc00b2f lên98e232c: workforce8a41040, cage purchase requests c8210f5, tổ chức source98e232c. develop vẫn953f597. Controller mới có sales-products, purchase-requests, workforce assignments/attendance/leave/settings. Chưa thấy endpoint mới cho cycle/harvest/sales invoices/customer debt/payroll trong các commit này. Không coi LAB cũ là hợp đồng LABORv2 mới.

Jira [OMTS-223](https://welterial.atlassian.net/browse/OMTS-223) còn mô tả kg, backend trả `quantityUnit=Cage` và integer cages; comment source nói có sửa theo người dùng nhưng không thay xác nhận trực tiếp trong chat này. [OMTS-227](https://welterial.atlassian.net/browse/OMTS-227) mô tả employee app/Mobile; backend mới lại có personal endpoints theo staff account. Đã hỏi hai lựa chọn về unit/workflow mua hàng và Web/Mobile; chưa có trả lời khi hoàn tất lát đọc này. Không thêm thao tác ghi hoặc phát hành QR trong lát này. Không cập nhật trạng thái Jira.

## Màn đã nối

- **Sản phẩm bán**: Owner/Trader đọc catalog thật, tìm mã/tên, tải lại giữ bộ lọc. Owner có tất cả sản phẩm, Trader chỉ available; không hiển thị giá/khối lượng giả vì response không có.
- **Yêu cầu mua hàng**: Trader chỉ `/api/me/purchase-requests`, Owner/Staff có quyền View đọc danh sách HTX. Lọc trạng thái, paging20, tải lại, đọc chi tiết có kiểm ID. Hiển thị số lồng theo dữ liệu API, ngày nhận, phản hồi, trả sau và hủy nếu có; không tự chuyển đơn vị sang kg. Chưa có nút gửi/hủy/Owner phản hồi.
- **Phân công và chấm công**: Owner/Staff được cấp WORK_ASSIGNMENTS hoặc ATTENDANCE View đọc phân công theo ngày. Hiển thị nhân viên/bè/công việc/check-in/out; thiếu attendance ghi Chưa ghi nhận. Chưa bật assign/move/change-crew/check-in/out/settings/leave/employee QR.
- Dashboard không còn báo “chưa được cấp chức năng nghiệp vụ” khi Trader đã có các module cá nhân mới.

Các route dùng chung Operations BFF/Redis/session hiện có. Query/action strict, không nhận arbitraryURL/accountId/customerId, không đổi G1/G2/cookie/refresh. Trader không gọi feed HTX/all-product; Staff OwnRecords không được mở rộng thành AssignedZone. Workforce kiểm từng zone response trước khi trả; request detail kiểm đúng ID. Recheck session sau upstream; schema chỉ chiếu fields cần cho Web; React hiển thị nội dung như text. Chưa cho phép bất kỳ POST của3module mới.

## Runtime và dữ liệu

Source98e232c export/build trong ignored `docs/learning/backend-zalo-98e232c`, không checkout/merge/sửa backend source. Database QA cũ `OMTS` trong SQL container omts-zalo-qa-sqlserver-1 được COPY_ONLY backup rồi RESTORE thành **OMTS_QA_98e232c**. Chỉ clone nhận3migration mới qua bootstrap không `--demo`: Default roles already exist; Cooperative already initialized. Không reset account/password/grants/fixtures. Bản OMTS gốc, image/compose dc00b2f và backup giữ để quay lại; không chạy Down hoặc phục hồi đè dữ liệu.

QA3003/API8081 hiện dùng image98e232c và clone trên; signed file key/volume giữ nguyên. Main3002/API8080 không đổi. Các record QA031/032, debt029 và file/audit trước đều có trong clone; không tạo business record trong lát đọc này. Products/PurchaseRequest/WorkAssignments/JobType đều0, vì không seed module mới hay tạo dữ liệu thay kiểm browser. Fake inbox có thể khác do restart API; không có OTP đang được chạy trong lát này.

## Kiểm tra và giới hạn

- 37 targeted tests PASS: strict query/personal route/Owner catalog, read-only POST refusal, OwnRecords/zone gate, response wrong-ID/out-of-zone/session replacement, UI status/search/reload/empty/attendance null. Lint/typecheck/build41routes và61built-product assertions PASS. CI source cuối ghi trong PR; không gắn kết quả full Redis của commit trước cho source này.
- 179 checks read-only cũ PASS sau nâng backend. Thêm `OMTS_QA_SALES_WORKFORCE=1` vào script test:api-roles: **204checks PASS** với5demo accounts +anonymous; sessions của script được revoke. Không có business mutation.
- Browser thật: Trader thấy2module Sales, own-list/statusACCEPTED/reload giữ lọc, product search/reload giữ hàu, workforce bị chặn. Manager1 workforce đổi ngày/tải lại và request feed đọc được; Manager2 workforce đọc được; Accountant không có menu mới và request URL bị chặn. Owner đọc catalog available/all và bảng phân công. Mỗi list thật hiện0bản ghi đúng database, không có dữ liệu mock.
- CSS360 trên đúng tab20: document360/main328/scroll328; CSS1024: document1014/main722/scroll722, không tràn main. Lượt đầu bridge ra CSS240/682 đã loại khỏi bằng chứng; không suy CSS từ tham số viewport. Reset viewport cuối. Chi tiết request có dữ liệu chỉ có fixture tests, chưa browser PASS do bảng rỗng.

Lát này chưa hoàn tất luồng gửi/phản hồi/hủy yêu cầu mua hay phân công/chấm công. Cần chốt câu hỏi theo [AGENTS.md](../../AGENTS.md): thay “status transition”, “Web/Mobile boundary” hoặc giải quyết câu hỏi SRS mở phải xác nhận. Các blocker cũ (Staff onboarding/create/reset, fixed-role writes/new grants, Manager license, atomic certificate deletion, HTX bank, credential-final browser test) vẫn giữ. PR#3 chưa merge.
