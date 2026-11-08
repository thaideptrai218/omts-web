# Backend integration và QA Web — 31/10/2026

Đã hợp nhất #18/#19/#20 trên nhánh riêng, đồng bộ Mobile và chuyển API QA sang database sao chép. Không merge vào develop. Đây là kết quả triển khai sau [báo cáo audit](THREE_REPO_UPDATE_INTEGRATION_READINESS_2026-10-31.md).

## Revision và phạm vi

| Thành phần | Nhánh/revision | Review |
| --- | --- | --- |
| Backend | feature/OMTS-216-backend-integration @ a28a9bf | [Draft PR #25](https://github.com/thaideptrai218/omts-backend/pull/25) |
| Mobile | feature/OMTS-216-contract-integration @ 1e602db | [Draft PR #5](https://github.com/thaideptrai218/omts-mobile/pull/5) |
| Web | source ứng dụng 12376d1; lượt này thêm tài liệu kiểm chứng | [Draft PR #3](https://github.com/thaideptrai218/omts-web/pull/3) |

Hai worktree tích hợp tại D:\Đồ_án\omts-backend-integration và D:\Đồ_án\omts-mobile-integration. Công cụ worktree của app không nhận sourceRoot ngoài workspace của chat; dùng git worktree gốc để tách checkout. Backend develop953f597 và Mobile Expo7a2beb4 giữ nguyên. Mobile gốc vẫn55mục porcelain/32tracked đang sửa, không stash/reset/switch. Các tài liệu local của Web được giữ và cập nhật trong cùng PR.

Đợt này chỉ ghép các nhánh trong báo cáo #18/#19/#20. Fetch phát hiện thêm #21 fixed roles, #22 purchasing catalogue và #23 notifications v2; các nhánh đó đổi quyền/required fields/kênh thông báo so với quyết định Web đã duyệt, nên chưa áp vào runtime tích hợp này.

## Sửa Backend

- Giải 14 đường dẫn conflict của message catalogue và4đường dẫn cleanup trong worktree riêng.
- Giữ controller đã chuyển nhóm và DTO từng file; chuyển messageCode/noticeCode/confirmMessageCode vào đúng type, xóa các định nghĩa monolithic cũ để không tạo type/route trùng.
- Giữ Zalo/link/trader approval/location, Sales và Workforce từ#20. Các lỗi trạng thái dùng MSG-GEN-09 kèm MSG61; đăng nhập dùng catalogue ACCOUNT, giữ legacyCode.
- Các mã Zalo kỹ thuật và lỗi provider MSG04 được khai báo compatibility rõ trong MessageCodes.Legacy vì SRS chưa có mã thay thế. Không gán lỗi kết nối Zalo thành lỗi upload/OTP.
- Bỏ harvestEventId/lotId luôn-null ở đúng DTO bè đã tách file.
- Mang test fix7b67572 về biên cuối tháng; không thay đổi lịch reminder production.
- Cập nhật test Zalo/trader để kiểm code/title mới và legacyCode, không chỉ thay expected bằng mã bất kỳ.
- Snapshot EF giữ entity mới của#20, bỏ scaffold legacy của#18; regression HasPendingModelChanges xác nhận snapshot khớp model.

Phát hiện phụ thuộc ngữ nghĩa Git không báo: Workforce#20 đọc LaborSettlements để chặn sửa kỳ lương đã khóa, trong khi#18xóa bảng. Migration cleanup hiện **THROW51001 nếu còn non-Draft settlement**, transaction không xóa hàng khóa. Workforce SQL cũng từ chối ghi nếu migration guarded cleanup chưa được áp. Sau cleanup thành công không còn legacy lock; chưa có writer payrollv2 nên implementation hiện trả không có lock. Khi thêm payrollv2 phải thay implementation này bằng lock của model mới. Không được dùng bản tích hợp để bỏ qua/ghi đè payroll legacy có dữ liệu khóa.

Có test SQL tạo fixture legacy đã khóa, xác nhận repository từ chối database chưa migrate, migration bị chặn và hàng vẫn còn. Không đổi payroll/status/business workflow cho người dùng.

Một test SMTP chỉ đạt khi chạy riêng nhưng hết hạn5giây khi chạy cùng các fixture nặng. Đưa nhóm review SMTP vào collection không chạy song song; giữ timeout và assertion protocol/masking nguyên vẹn. CI đầy đủ tại revision cuối đạt.

## Đồng bộ frontend

Web đã có adapter compatibility từ đợt29/10; không cần thêm endpoint giả hoặc đổi G1/G2. Đã kiểm chứng thực tế với backend hợp nhất: lỗi code/title mới được hiển thị tiếng Việt, notification preferences nhận notice/messageCode/noticeCode, response bè không còn hai trường null vẫn được parse. Giữ effective permissions, phạm vi vùng, no automatic refresh/replay, OTP chờ Save và các quyết định account đang chờ backend.

Mobile sửa:

- ApiError giữ code canonical, isApiError nhận alias legacyCode; errorText dùng alias để dịch catalogue cũ trong giai đoạn chuyển tiếp.
- Tùy chọn thông báo hiển thị chính saved.notice; lần lưu sau không có notice sẽ xóa notice cũ.
- DTO profile/preferences nhận messageCode/noticeCode.
- Thêm5test contract chạy bằng Node; CI thêm contract tests và build sau lint/typecheck.

**Đính chính mức rủi ro audit:** MSG06 thực tế được#19giữ nguyên vì SRS chưa có mã thay; riêng so sánh MSG06 không tự hỏng ở revision này. Vấn đề đã sửa là hỗ trợ tổng thể các mã canonical kèm legacyCode và dịch lỗi. Không đổi refresh/replay Mobile; Zalo device/camera/QR/login SDK vẫn cần acceptance riêng.

## QA runtime và bảo toàn dữ liệu

- Web tester: http://127.0.0.1:3003; Web application build đang chạy giữ source đã nối API.
- API QA8081: container **omts-integration-api-qa**, image **omts-api:integration-a28a9bf**.
- Database: **OMTS_QA_INTEGRATION_20261031** trên SQL QA hiện hữu; files volume **omts-integration-qa-files**.
- Đã backup COPY_ONLY/CHECKSUM và restore từ OMTS_QA_98e232c, sao chép file volume. Migration trên clone dùng seed --bootstrap **không --demo**, không reset mật khẩu.
- Trước smoke writes: password hash/MustChangePassword khác biệt0; Accounts16, Employees11, AccessGrants8, Zones9, Rafts23, Receipts32, SupplierPayments26, WaterMeasurements72, Products1, PurchaseRequest4, WorkAssignments3, AttendanceRecords2, AttendanceJobPeriod2, LeaveRequest3, JobType2, AttendanceSettings2 đều khớp nguồn.
- Database/files/image/container QA cũ được giữ. Main API8080/DB và Web3002 không đổi cấu hình hoặc dữ liệu nghiệp vụ.
- Backend Developer delivery/OCR vẫn Fake như môi trường QA trước; không tuyên bố đã kiểm provider production.

Rollback API: docker stop omts-integration-api-qa rồi docker start omts-zalo-qa-api-1. Không chạy Down hoặc xóa volume. Rollback dùng dataset QA cũ nên không chứa các thao tác ghi sau khi chuyển sang clone tích hợp; dữ liệu mới vẫn còn trong clone để đối chiếu.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Backend focused SQL/Zalo/contracts/SMTP/model | 21/21 PASS local |
| Backend CI a28a9bf | [run41159362923](https://github.com/thaideptrai218/omts-backend/actions/runs/41159362923): Domain2 + Application144 + Integration907 PASS,1SKIP; tổng1053PASS/1SKIP |
| Backend Docker image/Gitleaks/title | PASS tại cùng revision |
| Backend GitGuardian | FAIL:2phát hiện trong lịch sử test AccountMessageCodeQaTests tại04ca422e và mergecommitf752693; HEAD đã dùng NewPassword sinh khi chạy. Chưa đóng incident/viết lại lịch sử hoặc bỏ scanner |
| Mobile CI 1e602db | [run41159322722](https://github.com/thaideptrai218/omts-mobile/actions/runs/41159322722): lint/typecheck/5contract tests/build PASS; Gitleaks/title/GitGuardian PASS |
| Web local standalone source | lint/typecheck/build PASS,41routes; 78targeted contract/function tests PASS bằng pool threads |
| Web BFF/live API role matrix | **224/224 PASS**: Owner, Manager1, Manager2, Accountant, Trader, anonymous/CSRF, scope/denial/HTML; script sessions revoked |
| QA new catalogue | API8081/8082 invalid login401 trả code=title MSG-ACCOUNT-05, legacyCode MSG12; browser hiện thông báo tiếng Việt |
| QA mutations sau migration | PASS luồng bên dưới; chỉ clone tích hợp |

Lượt local full suite Backend bị chậm/OOM do tài nguyên Docker và lượt full Web Windows bị treo worker đã dừng, **không tính PASS**. Không đổi TTL/token/deadline để làm test xanh. Chuyển kiểm chứng full Backend sang CI SQL/Azurite; Web full CI theo revision PR#3 được ghi riêng sau khi push tài liệu. Failed copy/build attempt ở thư mục riêng đã được thay bằng source copy chỉ từ git ls-files và dependency cài độc lập; app/runtime gốc không bị đụng. Learning logs và file tạm ở docs/learning ignored.

## Smoke writes trên clone QA

- Owner tạo một sản phẩm QA-INT31-*; Trader gửi2lồng ngày12/11; Owner chấp nhận1lồng; Trader hủy, trạng thái Cancelled vẫn giữ acceptedCages1. Sản phẩm kiểm tra đã ngừng dùng sau ca.
- Request mới **YC-20261031-A01ADB66E33D**, Cancelled; request chờ cũ **YC-20261031-F4C2BF613C68**,4lồng ngày5/11 giữ nguyên để tester dùng.
- Cả hai Manager phân công đúng vùng cho hồ sơ của mình ngày12/11 rồi gỡ, không tạo attendance giả hoặc dời phân công cũ. Mỗi Manager gửi nghỉ13/11 rồi hủy, không để nghỉ mới có hiệu lực.
- Không ghi thanh toán mới, không sửa credential/grant/contact, không thực hiện mutation tài chính thật.
- Evidence chi tiết/ID và HTTP logs được giữ local; có thêm audit/history QA cho các lượt thực hiện.

Browser: đăng nhập sai cho thông báo đúng, Owner login/menu/request list/tải lại thấy request mới và pending cũ. Đây là smoke sau tích hợp, không thay báo cáo browser toàn bộ biến thể trước đây. Password recovery final handoff vẫn chưa được người dùng hoàn tất; không đánh PASS ca đó.

Các phần chưa có API mới (cycles/harvest/invoice/customer finance/payroll) và các contract Staff/email-or-phone/create/reset đang chờ vẫn giữ trạng thái chưa hoàn thành. Đợt này không mở màn mock cho tester và không đánh toàn bộ SRS Done.

