# Review thông tin cá nhân và tạo tài khoản từ hồ sơ nhân viên

Ngày28/10/2026, Asia/Saigon; nền `d1bcca514c24b5aca912cc305093e3cdf7734a2b`, nhánh `feature/OMTS-132-web-foundation`. Người dùng yêu cầu review, cập nhật báo cáo, commit/push cùng nhánh; không merge develop. API/refresh vẫn tắt; MSG06/tên MSG24 chờ backend, GitGuardian để sau.

## Phạm vi và nguồn

Đọc lại context, OMTS-203/199/119 (trạng thái To Do/Done/In Progress), decision WEB-EMP-ACCOUNT-01 và source hiện tại. Giữ quyết định lưu profile trước, tạo account sau; username tự sinh, Owner không xem mật khẩu, Owner chọn vùng–role. Không thêm bước/nghiệp vụ hoặc đổi contract backend. Fetch nhánh Web trước xuất bản cho `HEAD...FETCH_HEAD=0/0`, cả hai ởd1bcca5; không có code remote mới cần gộp.

Review gồm personal schema/SĐT/date-only, mapper/request không bật API, mock save/lỗi đúng field, create+link/version/grants, service allowlist và UI draft/preview/receipt/pending/unmount. Tái sử dụng bộ kiểm đã có cho duplicate/history/account state, thêm hồi quy cho finding thực tế dưới đây. Không gom source profile/notification/Dialog local khác.

## Finding P2 EMP-PERSON-ACCOUNT-REV-01 — đã sửa

**Vấn đề:** validation form chạy trước khi lệnh save bắt đầu. Nếu editor đã unmount, hoặc Owner mở popup Bỏ liên kết trong lúc validation chưa kết thúc, callback cũ vẫn gọi service.save. Tracker chỉ kiểm lệnh đã bắt đầu nên chưa ngăn callback này. Khi unmount, tracker bị invalidate rồi callback validation cũ có thể start một lượt mới; việc bỏ phản hồi muộn sau request không bảo vệ đoạn trước request.

**Tái hiện:** thêm test vào personal-validation và unlink UI, submit rồi unmount/mở unlink ngay trong cùng lượt `act`. Lệnh:

`npm test -- src/features/employee-management/components/employee-personal-validation.test.tsx src/features/employee-management/components/employee-unlink.test.tsx -t 'after unmount while form validation|discarded draft when validation|old profile save after opening'`

Trước sửa: **2 fail/1 pass/49 skip**. Hai lỗi đều `expected save to not be called at all, but actually been called 1 times`. Ca Hủy thay đổi đã pass trước sửa và giữ làm characterization/regression; không nói cả3 đã RED. Source repository/version kiểm trong test chứng minh không được tự ghi sau khi rời lượt chỉnh sửa. Log `.hallmark/employee-personal-review-red.log`.

**Cách sửa:** thêm validationAttempt ref cho save trong useEmployeeEditorActions. Callback chỉ được persist khi mã lượt còn đúng. Unmount, mở/đóng unlink, hủy nháp và việc profile bị chặn bởi action khác làm hết hiệu lực lượt validation cũ. Mutation tracker hiện có tiếp tục quản lý lệnh đã gửi. Không hủy/rollback một request đã được chấp nhận, không tự resend, không đổi rowVersion hoặc kiểm quyền.

**Kiểm sau sửa:** ba file personal-validation/unlink/account-creation **59/59 pass**,50,38 giây; log `.hallmark/employee-personal-review-green.log`. Có3 test review mới, gồm2 ca đã tái hiện lỗi và1 ca giữ hành vi discard đúng. Lưu bình thường, unlink/version mới, contact validation, account create/receipt và pending tiếp tục đạt trong bộ này.

## Các phần đã review và giới hạn

| Phần | Kết luận trong phạm vi mock |
| --- | --- |
| Personal validation | Ngày sinh optional/không tương lai theo UTC+7; trim/độ dài đúng field; giữ chuỗi quá dài cho người dùng sửa |
| SĐT | Form giữ cách nhập hợp lệ; mock normalize lúc ghi/so trùng; mapper API không bị đổi payload vô ý |
| Account creation | Chỉ từ profile đã lưu/sạch; contact và quyền được chọn rõ; không có username/password/subject type từ UI |
| Create+link | Recheck employee/version trước publication; callback và publish cùng lượt đồng bộ mock; lỗi không tạo account mồ côi |
| UI async | Chống đóng/gửi lặp khi lệnh bắt đầu; discard late response/MSG19; kết quả mất phản hồi không tự retry hay báo chưa ghi |
| Receipt | Username + liên hệ che bớt, không có secret; giao nhận72h theo mock cũ, không SMS/email thật |
| API/Backend | Không mount adapter/route mới, không bật refresh; SQL transaction/QA/MSG06/tên MSG24 vẫn chưa nghiệm thu |

Callback mock một process không thay transaction backend hay bảo đảm nhiều worker. Source branch LAB chưa merge không thay contract develop. Không thay SRS/Jira hoặc đánh dấu toàn LAB-01 hoàn tất từ unit tests.

## Kiểm source cuối trước xuất bản

Đã kiểm source tách từ d1bcca5 cộng30 file liên quan tại `D:/Đồ_án/.omts-web-review-20261028`. Lint/typecheck/test/build/HTTP chạy tuần tự. Bản kiểm gồm personal validation, account creation và guard review mới; không gồm source profile/notification/Dialog khác.

| Kiểm tra cuối | Kết quả |
| --- | --- |
| Lint/typecheck | Đạt |
| Full Vitest | **2.249 pass/31 Redis skip**,181 file pass/4 skip;146,28 giây |
| Build | Đạt18/18 trang |
| HTTP built-product | Đạt24 assertions |
| Diff/check nguồn | 30/30 source blob staged trùng snapshot; diff-check và link tài liệu đạt |

Log cuối tại snapshot `.hallmark/employee-publication-{lint,types,tests,build,http}.log`. Tổng có89 test mới so d1bcca5:57 personal,29 account và3 review. Không dùng số2.246 của lần triển khai trước làm bằng chứng bản sửa mới. Redis thật, backend/SQL transaction và QA vẫn chưa được chứng minh bằng lượt kiểm này.

Đã review ảnh/native360/1024 và luồng profile→tạo account→receipt→reopen→account directory của source triển khai trước bản sửa; xem hai báo cáo module. Lượt này không đổi bố cục/CSS và không tuyên bố tái hiện race validation bằng thao tác tay trên browser. Ba ca mới dùng event/Promise có kiểm soát; native evidence trước vẫn chỉ chứng minh các đường UI đã ghi, không thay hồi quy race.

Tự đánh giá sau kiểm: P2 EMP-PERSON-ACCOUNT-REV-01 đã sửa; chưa thấy finding mới còn mở trong phạm vi đã kiểm. Không thêm test trùng hoặc đổi timeout/scanner/workflow để làm checks xanh.

Đã kiểm40 file chuẩn bị xuất bản, gồm30 source và10 tài liệu. Các đoạn P7/notification trong context/decision được stage theo phần để giữ ngoài commit; không stage docs/learning, ảnh/log, env, dependency hoặc workflow. Preview mock từ build mới được khởi chạy nền ẩn tại port3105, GET /login trả200; server3000 không bị stop/rebuild. HTTP này chỉ kiểm preview sẵn sàng, không thay native browser/race acceptance đã phân biệt ở trên.

## Tài liệu liên quan

- [Personal validation và backend pull](WEB_EMPLOYEE_PERSONAL_FORM_COMPLETION_2026-10-28.md).
- [Luồng tạo account theo quyết định đã chốt](WEB_EMPLOYEE_ACCOUNT_CREATION_2026-10-28.md).
- [Audit các branch backend](BACKEND_OTHER_BRANCHES_AUDIT_2026-10-28.md).
- [CI d1bcca5 và run cũ](WEB_CI_D1BCCA5_REVIEW_2026-10-28.md), chỉ áp dụng SHA đó.

Bài119, ảnh và log giữ local/ignore. Báo cáo/context/decision/reviewer guide đi cùng code; proposal notification, profile/notification/Dialog source local khác tiếp tục ngoài phạm vi commit. Không sửa scanner/history hoặc tự giải quyết incident GitGuardian. CI của commit mới phải đọc đúng SHA sau push, không gán kết quả local hoặc CI d1bcca5 cho SHA mới.
