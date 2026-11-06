# Audit backend/Jira — bỏ liên kết tài khoản nhân viên

Ngày26/10/2026 (Asia/Saigon). Chỉ đọc Git/Jira/PR/source/tests và cập nhật ghi nhận. Không sửa source Web/backend, chạy mutation/seed/migration, comment/chuyển trạng thái Jira hoặc commit/push/merge. Giữ các thay đổi code từ phiên trước.

## 1. Kết luận và nguồn

Lời nhắc là [comment10034 của OMTS-214](https://welterial.atlassian.net/browse/OMTS-214?focusedCommentId=10034), tác giả pgb3122003, lúc02:04:54 ngày26/10 (UTC+7), gắn `@D DT` và trỏ [PR16](https://github.com/thaideptrai218/omts-backend/pull/16). Ticket đã ghi PM quyết định PUT thiếu accountId giữ link, unlink dùng endpoint riêng.

Source PR16 khớp lời nhắc. Web hiện vẫn mock và hiểu null khác backend mới: nếu ghép thẳng, Owner có thể tưởng đã bỏ link trong khi PUT thành công nhưng link vẫn còn. Đây là blocker tích hợp, chưa phải lỗi đã xảy ra trên employee API live của Web.

## 2. Phiên bản và phát hành

Sau git fetch origin:

| Nguồn | SHA | Trạng thái |
| --- | --- | --- |
| develop backend |776fbc0 |Chưa có DELETE unlink mới |
| PR16 / employees-farm |d96685d82aff5bd6ac8bbb723ffa3d103fb12eb3 |Open, draft, base develop, chưa merge |
| PR15 / accounts-platform |0f8d46a39ab40c4d42fae19c0df25c3db8ff02a2 |Open, draft, chưa merge |
| PR17 / env-demo |25386fdb91482f75510ec49740ae191acf74b88d |Open, draft, chưa merge |
| Checkout backend local |48ae1e0 |Giữ nguyên detached checkout, worktree clean |

Đọc các nhánh draft bằng git show/diff; fetch không thay checkout/backend đang chạy. Web và backend phải phát hành cùng release theo lời nhắc; không gọi DELETE mới trên QA cũ rồi fallback về PUT null.

## 3. Contract PR16 đã đọc

Đã đọc EmployeesController, EmployeeDtos, EmployeeService, RowVersionGuard, EmployeeAccountUnlinkTests, EmployeeUnlinkQaTests và SwaggerQaTests.

| Ý định/tình huống | Request/kết quả |
| --- | --- |
| Sửa hồ sơ, giữ account |PUT /api/employees/{id} với accountId thiếu hoặc null giữ link. Các field khác vẫn theo full-replacement contract, không trở thành partial PATCH |
| Gán hoặc đổi account |PUT với accountId mới; backend kiểm account hợp lệ/chưa thuộc hồ sơ khác, MSG24 vẫn có hiệu lực |
| Bỏ liên kết |DELETE /api/employees/{id}/account?rowVersion={encodedVersion};200 EmployeeSaved, chỉ Employee.AccountId=null |
| Không có quyền |Owner-only; non-Owner403 MSG02, anonymous401 |
| Version sai định dạng |400 MSG01 trên RowVersion, kể cả hồ sơ đã không còn link |
| Version cũ khi còn link |409 MSG06, giữ link |
| Đã không còn link |200, profile giữ nguyên, không audit thêm. No-op không mặc định sinh version mới |

Unlink không xóa/khóa Account, không thu hồi grants hoặc chủ động logout tài khoản đó. Account có thể được liên kết lại theo quy tắc hiện hữu. Có một Employee.Updated audit khi link thật sự bị gỡ; không yêu cầu thêm reason trong endpoint này.

Response có envelope, không phải204 hoặc EmployeeView ở top level:

```json
{
  "employee": {
    "id": "<employee-id>",
    "account": null,
    "rowVersion": "<version-from-server>"
  },
  "message": "Employee profile saved.",
  "temporaryPassword": null,
  "temporaryPasswordExpiresAt": null
}
```

Ví dụ lược các field không liên quan. Dùng response.employee.rowVersion ánh xạ sang domain recordVersion cho lần PUT kế tiếp, giữ nguyên chuỗi. Query version optional phía backend để tương thích client cũ; Web có version thì luôn gửi.

Version là opaque base64. `AAAAAAAA+/8=` phải encode một lần thành `AAAAAAAA%2B%2F8%3D`; dấu + raw trong query có thể thành dấu cách. Dùng encodeURIComponent khi ghép query, hoặc URLSearchParams nhận giá trị raw; không dùng cả hai rồi double encode.

Nguồn: [controller L61](https://github.com/thaideptrai218/omts-backend/blob/d96685d82aff5bd6ac8bbb723ffa3d103fb12eb3/src/OMTS.Api/Controllers/EmployeesController.cs#L61), [PUT L150](https://github.com/thaideptrai218/omts-backend/blob/d96685d82aff5bd6ac8bbb723ffa3d103fb12eb3/src/OMTS.Application/Features/Employees/EmployeeService.cs#L150), [unlink L226](https://github.com/thaideptrai218/omts-backend/blob/d96685d82aff5bd6ac8bbb723ffa3d103fb12eb3/src/OMTS.Application/Features/Employees/EmployeeService.cs#L226).

## 4. Đối chiếu Web hiện tại

| Vị trí | Chênh lệch |
| --- | --- |
| employee-editor.tsx:93 |Select rỗng thành accountId:null khi save |
| mock-employee-management-repository.ts:166 |Account không được chọn thì saved.account=null, tức null đang là unlink |
| employee-management-repository.ts:7 |Chỉ có load/save, chưa có operation unlink |
| employee-management.ts:SaveEmployeeResult |Chưa có outcome conflict MSG06 |
| employee-management-service.instance.ts |Luôn tạo mock repository; chưa có employee HTTP adapter được mount |
| server/backend/backend-endpoint.ts |Catalog chỉ auth/profile, chưa có DELETE/dynamic employee target |
| employee-management-experience.tsx:updateEmployee |onSaved cập nhật profile rồi đóng dialog; unlink cần xử lý riêng để không mất draft/version ngoài ý định |

Domain đã có recordVersion nhưng mock chưa kiểm version khi ghi. API mới không thể chỉ thay URL: OMTS-203 còn yêu cầu zones, bank details, end-date/buttons riêng, paging và inline account creation mà mock D5 cũ chưa đầy đủ.

## 5. Micro-plan pending trước khi sửa code

1. **EMP-API-01 — contract/schema:** ghi revision PR16; schema EmployeeSaved, map rowVersion→recordVersion; phân biệt giữ/gán/bỏ link. Test response200/account=null/opaque version.
2. **EMP-API-02 — repository/mock:** save-null khi edit giữ link; thêm unlink(employeeId,recordVersion) riêng; typed401/403/404/invalid-version/conflict/no-op. Test stale không xóa link, no-op không tăng version giả, Account/grants vẫn còn.
3. **EMP-API-03 — UI:** đề xuất nút “Bỏ liên kết tài khoản” riêng. Khi triển khai cần chốt cách xử lý draft chưa lưu; không ngầm tách Lưu thành PUT rồi DELETE và báo chúng như một transaction. Thành công cập nhật toàn bộ profile/version và linkable list; lỗi giữ nguyên link/draft.
4. **EMP-API-04 — BFF/HTTP:** catalog ID/query allowlist, encode version một lần, DELETE parse200 JSON, Owner guard+CSRF; không dùng PUT-null fallback khi QA chưa có endpoint.
5. **EMP-API-05 — race/release:** pending chặn thao tác trùng, bỏ response cũ khi đổi editor/session; test +/ /=, stale409, malformed400, repeated unlink và PUT kế tiếp dùng version mới. Nghiệm thu trên backend release chứa PR16 sau CI/review/QA.

Đây là kế hoạch, không phải công việc đã triển khai. Không đổi thứ tự ưu tiên auth đang làm hoặc tự sửa SRS/Jira. MSG06 giữ quyết định chờ backend trả structured user_name/time; không parse câu tiếng Anh, bịa metadata hoặc ghi đè form để bỏ qua conflict.

## 6. CI và tests đã kiểm được

PR15/16/17 đều có build-test FAILURE. Đã kiểm run40224290856 của PR16 có headSha đúng d96685d… và đọc [log job](https://github.com/thaideptrai218/omts-backend/actions/runs/40224290856/job/121268806331): setup .NET tải SDK8.0.427 nhận HTTP409 ba lần rồi exit1. Reportgenerator sau đó không tìm thấy coverage là lỗi dây chuyền. Log này không chứng minh test unlink fail.

PR16 docker-image/pr-title/gitleaks SUCCESS. Số801 tests pass trong mô tả PR là kết quả tác giả báo, không thay bằng chứng GitHub build-test còn đỏ và không phải test do agent chạy. Đã đọc test source cho null/omitted PUT, relink/MSG24, Owner-only, audit, raw-plus/encoded-plus, version cũ và SQL race. Chưa chạy các tests hoặc API mutation trong audit này. Chưa đọc log nguyên nhân PR15/17 nên không suy ba PR cùng một lỗi.

## 7. Cập nhật Jira/backend khác có ảnh hưởng

- Ticket Web hiện hành là **OMTS-203**, assignee D DT, To Do; backend OMTS-199 Done, QA OMTS-204 To Do. Key cũ185/186 trả404; không đủ chứng cứ nói deleted hay mất quyền, chỉ ghi không truy cập được. ACS Web hiện thuộc OMTS-201, In Progress.
- OMTS-123 đã Done. Cần đọc appendix/ma trận thực đã giao; trạng thái Done không tự chứng minh mapper snapshot cũ đã khớp catalog mới.
- OMTS-215 ghi PM quyết định25/10 chuyển mobile sang Zalo Mini App do Sơn phụ trách và không dùng Expo branch/key cũ. Cần audit repo mobile/SRS khi quay lại mobile; không tự sửa source mobile, actor hoặc backend wire SubjectType.Staff từ mô tả ticket này.
- PR15 bổ sung Owner recovery qua seed --reset-owner-password, push device theo session, upload quá cỡ400 MSG01 đúng field. Owner recovery là thao tác vận hành server, không phải nút reset Owner trong web.
- PR17 đọc thời gian thiếu offset là giờ Việt Nam, giữ offset response và có ENV demo30 ngày. Web nên gửi offset tường minh cho timestamp; ngày sinh DateOnly không tự chuyển thành timestamp.
- MSG69 vẫn chờ BA chọn wording/window. MSG06 ở develop/nhánh employee vẫn có tên/time trong text và currentRowVersion, chưa có structured params. Không gỡ blocker MSG06 hoặc bật refresh: các diff đã kiểm không bổ sung agreement idempotency refresh.
- Một số yêu cầu ticket mới (nhập username, hiển thị temporary password một lần, actor/channel) khác quyết định frontend trước. Chỉ ghi nhận; cần Duy Thái/BA xác nhận khi làm phần tương ứng, không âm thầm đảo quyết định đã chốt.

## 8. Giới hạn audit và thao tác công cụ

Backend checkout vẫn48ae1e0/clean; chỉ remote refs thay đổi sau fetch. Không checkout draft vào server đang chạy, chạy seed/reset Owner, sửa DB, gửi comment hoặc cập nhật trạng thái Jira. Chỉ ghi report/context/plan/decision notes.

getJiraIssue trả404 với key cũ nên dùng JQL tìm key hiện hành. fetch PR15 qua connector bị transport error, dùng gh đọc metadata. Lần gọi GitHub ban đầu thiếu repo_full_name/pr_number được sửa trước khi đọc kết quả; lỗi tham số không phải lỗi quyền repo. Lần apply_patch đầu có context không khớp trong decision register nên bị từ chối toàn bộ; kiểm tra file chưa tạo rồi áp lại theo từng phần. Không có source bị ghi dở.

Không chạy lại lint/build/test ứng dụng cho thay đổi tài liệu. Kiểm Markdown links/diff và source evidence riêng, không mượn test PASS từ phiên trước làm evidence của lượt audit.
