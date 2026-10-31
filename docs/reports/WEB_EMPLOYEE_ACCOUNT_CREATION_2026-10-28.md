# Tạo tài khoản sau khi lưu hồ sơ nhân viên

> Review trước xuất bản: [báo cáo tổng thể](WEB_EMPLOYEE_PERSONAL_ACCOUNT_FULL_REVIEW_2026-10-28.md) bổ sung guard cho validation-save của profile và3 hồi quy. Các kết quả2.246 và câu giữ local bên dưới là snapshot triển khai trước yêu cầu commit/push. Review không đổi luồng tạo account, secret-free delivery hoặc các gate API/MSG06/tên MSG24.

Ngày28/10/2026, Asia/Saigon; nhánh `feature/OMTS-132-web-foundation`, nền d1bcca5 cùng phần personal validation local đã kiểm trước đó. Quyết định WEB-EMP-ACCOUNT-01 do Duy Thái xác nhận trực tiếp: **Lưu hồ sơ trước, tạo tài khoản sau**. Giữ username tự sinh và Chủ HTX không xem mật khẩu.

## Phạm vi được triển khai

Đọc lại OMTS-203, parent119/dependency199 từ lượt trước và schema/service backend953f597. Thay đổi này có chủ đích khác ticket về tạo employee+account cùng lần lưu; không sửa SRS/Jira/backend để che khác biệt. API/refresh vẫn tắt, MSG06 và tên MSG24 structured chờ backend. GitGuardian tiếp tục để sau. Không pull/chạy DB/backend runtime thêm trong lượt trả lời quyết định này; lần pull ngay trước vẫn953f597/Already up to date.

Hồ sơ mới được lưu trước. Khi mở hồ sơ sạch chưa liên kết, có nút Tạo tài khoản đăng nhập. Bản nháp đang sửa phải lưu hoặc hủy trước; không tự lưu cùng thao tác tạo account. Popup lấy tên/SĐT từ profile đã lưu; Owner sửa thông tin dành cho account nếu cần, chọn SMS/email, chọn vùng–vai trò và xem quyền trước khi xác nhận. Không có input username, mật khẩu, SubjectType hoặc verified flag. Vùng làm việc không tự trở thành grant; Owner phải chọn ít nhất một cặp hợp lệ.

Thành công cập nhật link/version trong danh sách nhân viên, account mới hiện trong nguồn tài khoản dùng chung; receipt chỉ có username, liên hệ che bớt và trạng thái gửi. Không trả secret tới React/storage. Receipt dùng cơ chế mock hiện có (72 giờ) của account management; lượt này không tự đổi thời hạn hoặc khẳng định SMS/email thật đã được gửi. Account mới chưa được xác minh; việc tạo/link không bỏ qua gate đăng nhập.

## Từng micro-task và lý do

**EMP-ACCOUNT-01 — Contract/schema/service.** Input tách employeeId/version và account draft. Service allowlist các trường liên hệ/kênh và grant, clone từng grant; không spread username/password/id/accountType do caller đưa vào. Contact schema dùng safeExtend của schema account để giữ quy tắc ít nhất một contact/kênh tương ứng, bổ sung độ dài và SĐT theo contract hiện hành. Workspace chỉ có creation options trong composition hỗ trợ; UI không gọi mock storage/HTTP trực tiếp.

**EMP-ACCOUNT-02 — Một lượt công bố mock.** Generic createLinkedAccount của mock account repository tái sử dụng validation, username và receipt đang có. Sau bước async chuẩn bị và validate, callback đồng bộ kiểm employee/version/account lần cuối và link; tiếp đó publish account ngay trong cùng lượt JavaScript, không có await ở giữa. Callback từ chối thì không thêm account. Employee helper không gọi save hồ sơ cá nhân và không dùng hai HTTP mutation để giả một transaction.

Đây là tính nhất quán của mock một process, không phải atomic transaction SQL hay bảo đảm nhiều worker. Candidate bị từ chối có thể đã tiêu thụ số thứ tự nội bộ; khoảng trống ID/version không phải account mồ côi. Tất cả snapshot công khai chỉ chứa các bản ghi được commit. Adapter thật phải dùng endpoint/backend transaction và secret-free delivery đã align; không tái sử dụng callback mock như cơ chế mạng.

**EMP-ACCOUNT-03 — UI.** Dialog tạo account là sibling của dialog editor, có form riêng; không form lồng form hoặc control nằm trong fieldset disabled của form nền. Form nền/employment/unlink bị khóa khi child mở. Tái sử dụng AccessGrantEditor, EffectivePermissionPreview và CredentialDeliveryDialog; không mở rộng account editor cũ thành một form biết mọi workflow. Preview validation có generation guard sau unmount; mutation tracker/ref chặn submit lặp và Escape ở cả cha/con ngay khi service nhận lệnh. Phản hồi muộn sau unmount không tạo receipt/toast/MSG19.

**EMP-ACCOUNT-04 — Tests/review.** Có13 test repository,8 schema,1 service và7 UI mới, tổng29. Bao gồm create+link/version/grant, tranh chấp hai lệnh, profile sửa trong lúc chờ account, trùng contact, vùng/role sai, ngày grant sai, không quyền/hết phiên, missing version/id/đã có link; field allowlist và contact OR. UI kiểm draft gate/prefill/manual grants, preview/confirm/receipt, reopen link, cancel, duplicate giữ dữ liệu, Escape tức thời/gửi lặp, MSG19 muộn và response mất sau commit. Không tự retry create hoặc nối vào account trùng.

## Lỗi thực tế đã gặp

- Typecheck ban đầu báo TS2741 tại employee-management-service.test.ts: fake repository thiếu createLoginAccount mới bắt buộc. Bổ sung method fake rõ ràng; không làm contract optional hoặc dùng any. Lint/typecheck bước ghép UI sau đó đạt.
- Test cạnh tranh ban đầu **1 fail/20 pass** trong ba file: mong conflict nhưng nhận duplicate. Account đầu đã commit, nên account validator của lệnh thứ hai thấy SĐT trùng trước khi callback link chạy. Không có account thứ hai, nhưng lý do hiển thị chưa phản ánh version employee đã cũ. Helper nay recheck employee sau lỗi account (trừ auth/expiry), trả conflict/version làm lý do cần đối chiếu; không liên kết account trùng. Chạy lại **21/21** đạt, sau đó thêm4 ca ngày grant và các ca khác. Log RED/GREEN `.hallmark/employee-account-repository.log` / `employee-account-repository-green.log`.
- Một patch test mong import chưa có vi nhưng file đã import vi: apply_patch từ chối, không sửa một phần. Đọc lại dòng đầu rồi chỉ thêm test allowlist. Một lệnh rg dùng wildcard file Windows trả lỗi đường dẫn; dùng tên file/directory cùng -g khi cần. Đây là lỗi thao tác, không phải dependency hoặc source bị hỏng.
- Hallmark static đầu phát hiện1 FAIL (dấu gạch dài trong copy) và4 REFLEX về trạng thái active/disabled trên hai component mới. Đã sửa copy, thêm trạng thái cho radio/nút và disabled fieldset/AccessGrantEditor rõ ràng. Hai component sau sửa đều0 FAIL/0 REFLEX/0 WARN. Chạy lại kiểm source cuối sau thay đổi này; không lấy static pass làm browser acceptance.

## Kiểm chứng cuối và giới hạn

Đã kiểm source tách ở `D:/Đồ_án/.omts-web-review-20261028`: nền d1bcca5 cộng28 file liên quan, có personal validation local trước đó; không gồm profile/notification/Dialog local khác. Source cuối sau chỉnh state/copy có log `account-reviewed-*` và được so hash với thư mục chính.

| Kiểm cuối | Kết quả |
| --- | --- |
| Lint/typecheck | Đạt |
| Full Vitest | **2.246 pass/31 Redis skip**,181 file pass/4 skip;116,93 giây |
| Build | Đạt18/18 trang |
| HTTP built-product | Đạt24 assertions |
| Hallmark static | Mỗi component form/dialog mới0 FAIL/0 REFLEX/0 WARN |

Tổng mới của lát account là29 test; số2.246 còn gồm57 test personal validation local trước đó. Redis skip không phải nghiệm thu Redis thật. Lượt kiểm trước chỉnh style cũng2.246 pass (117,52 giây); bảng trên thuộc source sau chỉnh, không trộn log hai lần. Không suy local pass thành CI của một commit mới.

## Kiểm trên trình duyệt và tự review

Preview production mock port3105: Owner mở Lê Thị Lan đã lưu, chọn Tạo tài khoản đăng nhập. Tên/SĐT có sẵn, không có username/password input; danh mục vùng/role ban đầu chưa chọn. Đã chọn **Khu Nam + Nhân viên**, thêm dòng rồi xem trước: chỉ hiển thị đúng scope đã chọn. Xác nhận tạo mở receipt có username tự sinh và số nhận che bớt, không có password. Đây là thông báo mô phỏng giao nhận, không có SMS thật.

Đóng receipt rồi mở lại Lan: profile giữ tên/ngày sinh/vùng, link mới được chọn, có nút Bỏ liên kết và Lưu thay đổi disabled. Sang Tài khoản nội bộ thấy account Lan mới, hoạt động, quyền đã lưu Khu Nam/Nhân viên đúng lựa chọn; không dùng nút Khóa/Reset hoặc sửa grant trong lúc kiểm. Các nhánh lỗi/concurrency kiểm bằng test, không nhận là đã tái hiện bằng browser thao tác tay.

Responsive: ở1024 document1009 px, child dialog751/751 client/scroll; ở360 document345, child328/328, không tràn ngang. Đã reset viewport và giữ tab review. Ảnh local trong `.hallmark/`: `employee-account-create-1024.png`, `employee-account-create-360.png`, `employee-account-receipt-360.png`, `employee-account-linked-1024.png`. Không restart/build server3000 của người dùng.

Lệnh `npm run start -- --hostname 127.0.0.1 --port 3105` có một lần tool trả kết quả sau1823,9 giây, trong khi Next ghi Ready155ms. Chưa xác định nguyên nhân khoảng chậm; không kết luận app mất30 phút khởi động hoặc sửa timeout/source khi chưa có bằng chứng. Process preview sau đó dùng được, native flow trên hoàn tất; không chạy lại build/test chỉ vì tool-startup chậm.

Tự review chưa thấy finding mới còn mở trong phạm vi mock đã kiểm. Giữ ranh giới: account creation riêng không sửa profile, không tự nhận một account trùng làm link, không auto-retry khi mất response, không cấp quyền từ working zones hoặc tự xác minh contact. Không coi callback đồng bộ mock là transaction backend; contract API/session/release gates còn mở.

Chưa commit/push/merge trong lượt này. Không đổi session/cookie/refresh/SSR/caching, không gửi credential thật, không tạo account QA hoặc đánh dấu Jira Done. Phần khác biệt BA/backend đã ghi trong decision/plan; chỉ owner người dùng được phép thao tác mock theo cổng có sẵn, không suy quyền quản trị từ role name.

Trong lúc kiểm browser, người dùng hỏi các branch backend. [Audit riêng10 live heads](BACKEND_OTHER_BRANCHES_AUDIT_2026-10-28.md) đã hoàn tất; không có head mới so snapshot trước. PR13 LAB chưa merge và thiếu unlink mới từ develop, nên không thay contract bằng source nhánh cũ hoặc bật API.
