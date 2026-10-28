# Form nhân viên — vùng làm việc và thông tin ngân hàng

Ngày 28/10/2026, Asia/Saigon. Nhánh `feature/OMTS-132-web-foundation`, HEAD bắt đầu `f844b58`. Tiếp tục EMP-API-04a-E-UI.2. Phần đầu ghi kết quả triển khai; phần review trước commit ở cuối ghi kiểm chứng của lượt xuất bản này. Giữ các thay đổi hồ sơ/thông báo/Dialog local có từ trước.

## Phạm vi và nguồn đối chiếu

Đọc lại OMTS-203 (LAB-01), dependency OMTS-199 và parent OMTS-119; backend local snapshot953f597, `EmployeeInput.Bank` và `EmployeeService` kiểm Working zones. Không sửa backend/Jira/SRS. Không bật API hoặc refresh, không đổi cookie/session/cache policy. MSG06 và tên MSG24 structured tiếp tục chờ; không parse detail hoặc bịa tham số.

Form thêm vùng làm việc và ba trường ngân hàng, lưu qua service/mock repository hiện có. Đây là hoàn thiện form và chuẩn bị mapper; chưa phải nghiệm thu .NET/QA hay toàn LAB-01. Tạo tài khoản, nghỉ việc/quay lại, danh sách có filter vùng/phân trang và API runtime vẫn ngoài lát này.

## Từng micro-task

1. **Model và schema.** Thêm `workingZoneIds` và `bankAccount` vào profile/input; workspace có danh mục vùng. Form luôn có object ba chuỗi để giữ phần đang gõ. Schema ngân hàng chấp nhận trống cả nhóm; nếu có dữ liệu thì báo từng ô thiếu, giới hạn tên100 và số tài khoản6–20 chữ số ASCII. Không đổi validation tên/SĐT/ngày sinh cũ trong lượt này.
2. **Chuẩn hóa đúng nơi.** Số tài khoản là chuỗi, không parse Number nên giữ số0 đầu. Tên chủ tài khoản hiển thị in hoa và được chuẩn hóa trước lưu. Cả nhóm trống chuyển thành null; không gửi một phần ngân hàng. `accountId:null` vẫn giữ liên kết đăng nhập theo contract riêng; không nhầm với null của bankAccount.
3. **Mock repository và mapper.** Profile lưu được nhiều vùng và ngân hàng; read/save/snapshot clone cả array/object lồng để caller không sửa dữ liệu lưu qua reference. Repository nhận cùng danh mục vùng với môi trường mock, từ chối ID lạ/vùng không In Use hoặc ID trùng. Mapper PUT dùng bank/zones đang chỉnh trong draft, giữ version mới nhất; không tiếp tục lấy giá trị cũ từ record rồi làm mất sửa đổi.
4. **UI.** `EmployeeWorkingZones` dùng checkbox có label lớn, chọn nhiều hoặc để trống, đếm số vùng. `EmployeeBankFields` tách nhóm ngân hàng, label và mô tả lỗi riêng; layout một cột ở màn hẹp, hai cột khi đủ chỗ. Không gọi mock storage/API trong component và không thêm panel dành cho developer.
5. **Binding lỗi nhóm.** MSG01/workingZoneIds và bankAccount nay có fieldset thực, error/description và focus nhóm. Backend chỉ nói Bank account thì không tự đánh sai cả ba input. Client biết ô nào bỏ trống nên báo được từng ô; recordVersion vẫn chỉ ở phần tổng hợp. Không mở hỗ trợ path nested/index từ backend ngoài hợp đồng đang chờ.
6. **Giữ bản nháp qua unlink.** Chỉ accountId nhận baseline/version thành công của thao tác bỏ liên kết; bank/zones/ghi chú đang gõ giữ nguyên. Test lưu tiếp bằng version trả về và mở lại kiểm dữ liệu.

## Quyết định đã chốt: vùng cũ đã ngừng sử dụng

Đã hỏi người dùng qua câu hỏi async WEB-EMP-ZONE-01 và nhận câu trả lời “Đồng ý cách xử lý đề xuất”: backend hiện từ chối PUT còn ID vùng đã ngừng; Jira chỉ nói chọn vùng In Use, chưa mô tả thao tác gỡ vùng cũ. Áp dụng giữ hiển thị, cho Owner bỏ chọn và yêu cầu xử lý trước lưu; không tự xóa, không cho thêm/chọn lại vùng ngừng.

Vùng ngừng đã gắn vẫn checked và được phép bỏ chọn. Bỏ xong thì mục biến khỏi picker, không chọn lại được; thêm vùng đang dùng không làm rơi ID cũ. Mock trả MSG01 nhóm khi còn ID không hợp lệ, giữ draft/version. Test xác nhận giữ nguyên bị từ chối rồi chủ động bỏ và chọn vùng hợp lệ thì lưu được, version mới và liên kết tài khoản giữ nguyên. ID thiếu trong danh mục cũng có thông báo/giữ giá trị, không tự xóa hoặc đoán tên; nạp lại catalog thật thuộc bước API runtime sau.

Ngân hàng hiện nhập tên bằng text theo contract BankName; không tích hợp danh mục VietQR hoặc nhà cung cấp ngoài. Chưa có quyết định chọn danh mục ngân hàng riêng, nên không tự thêm dependency/network lookup.

## Lỗi thực tế và bằng chứng kiểm

Lệnh `npm run typecheck` đầu tiên sau khi mở rộng model báo TS2739/TS2345: fixture/giá trị khởi tạo/test workspace cũ thiếu workingZoneIds, bankAccount hoặc zones. Đây là chỗ chưa migrate cùng contract, không phải thiếu package. Đã cập nhật default form, dữ liệu mẫu, helper repository/service và test shared composition tường minh; không đổi thành optional hoặc ép any để compiler im lặng. Lượt typecheck kế tiếp đạt.

Các test summary cũ từng kiểm bank/zones không có control được cập nhật vì form nay có nhóm thực: bank/zones focus nhóm, version vẫn focus summary. Bổ sung ca riêng xác nhận không đoán lỗi ô con khi metadata chỉ là nhóm. Không bỏ các kiểm tra giữ draft/version trước đây.

Lần full test đầu có1 fail/2.093 pass/31 skip ở `redis-test-command.test.ts`, case invalid config. `spawnSync node.exe ETIMEDOUT` nghĩa subprocess quá15 giây, chưa trả kết quả để kiểm; không phải Redis được xác nhận lỗi hay form nhân viên lỗi. Agent đã khởi chạy build khi full test vẫn chạy, gây nghi ngờ tranh tài nguyên Windows. Sau khi build kết thúc, chạy riêng file này:4/4 pass,3,46 giây. Không tăng timeout/bỏ test hoặc sửa Redis; chạy lại full test tuần tự để kiểm giả thuyết và ghi bằng chứng cuối, không tính lần fail thành pass.

Chạy tuần tự trước khi bổ sung vùng ngừng đạt2.094 pass/31 skip,111,06 giây; sau quyết định vùng ngừng, lượt kế đạt2.095 pass/31 skip cùng lint/typecheck/build/HTTP. Tự review tiếp phát hiện mock chỉ giữ nhóm bank/zones nếu validation đồng thời có lỗi tên/SĐT. Test “does not drop an identity error…” chạy trên code đó fail: expected fields `[fullName, bankAccount]` nhưng actual chỉ `[bankAccount]`. Đã thu đủ các field có thể bind từ issues trước khi trả invalid-fields; không đổi validation hay đoán field lạ. File repository mới đạt8/8 sau sửa. Kết quả kiểm cuối phải theo source sau bản sửa này, không dùng các lượt trước làm bằng chứng thay.

## Tự review và kiểm chứng giao diện

Đã kiểm browser trên bản build, origin loopback riêng, chỉ dữ liệu hư cấu. 1024 px: trang scrollWidth1009, innerWidth1024; dialog scrollWidth/clientWidth cùng751. 360 px: trang scrollWidth345, innerWidth360; dialog scrollWidth/clientWidth cùng328. Không tràn ngang; nhóm input chuyển một/hai cột. Ảnh local `.hallmark/employee-zones-bank-1024.png`, `employee-zones-bank-360.png`, `employee-bank-validation-360.png`, `employee-bank-saved-360.png` được ignore.

Đã chọn hai vùng, nhập số00123456 và tên chủ tài khoản chữ thường; sau blur tên in hoa. Tại360 px, xóa số tài khoản rồi submit hiển thị lỗi cạnh ô, aria-invalid/description đúng và focus vào accountNumber, các dữ liệu khác giữ nguyên. Nhập lại số hợp lệ, lưu thành công và mở lại thấy hai vùng, số0 đầu và tên in hoa còn nguyên. Viewport đã reset và tab/server kiểm thử tạm đã đóng. Vùng ngừng được kiểm bằng component/repository test sau người dùng chốt; không tự đưa fixture vùng ngừng vào product hoặc sửa storage qua browser để giả lập.

Tự review xác nhận bank/zones không ghi AccessGrant, không tự tạo tài khoản hoặc thay account link; optional bank được kiểm theo nhóm, UI không gọi storage/network. Nhóm ngân hàng lỗi từ server không bị đổi thành ba lỗi con đoán mò. Unlink vẫn giữ bank/zones draft, save kế tiếp dùng version mới. Chưa nạp catalog thật/QA, chưa hỗ trợ error path backend lồng/index; MSG06 và tên MSG24 giữ chờ.

## Kết quả lượt triển khai trước review xuất bản

| Kiểm tra | Kết quả |
| --- | --- |
| Test mới |37 ca:17 schema ngân hàng,8 repository,2 mapper,8 luồng create/edit/clear/empty/legacy/unlink,2 binding nhóm |
| Full suite trên working tree sau sửa cuối |**2.096 pass/31 Redis skip**,172 file pass/4 skip;96,07 giây |
| Lint / typecheck |Đạt |
| Build sau sửa cuối |Đạt,18/18 trang; không thêm employee API route |
| HTTP regression sau build |24 assertions đạt |
| Browser |360/1024 px, không tràn ngang; nhập thiếu→focus lỗi→sửa→lưu/mở lại đúng bank/zones |
| Diff / dữ liệu học |git diff --check đạt; bài112 và ảnh/log Git ignore |

Số full suite trên bao gồm các thay đổi local hồ sơ/thông báo có từ trước, không phải kết quả CI của HEAD f844b58. Lượt triển khai trước chưa commit/push/merge; các file local đó được giữ ngoài phạm vi xuất bản này. Các dữ liệu ngân hàng trong test là dữ liệu hư cấu, chỉ ở RAM/test; không lưu ngân hàng người dùng vào localStorage hay report log.

Không còn lỗi mới chưa xử lý được phát hiện trong phần đã kiểm. Các phần chưa làm không được gộp thành Done: nạp danh mục vùng thật, API route/client/session binding, QA/DB, nested/index error metadata, MSG06 và tên MSG24. Quyết định vùng ngừng đã được xác nhận và áp dụng, không còn để pending ở WEB-EMP-ZONE-01.

## Review trước commit — 28/10/2026

Đọc lại đường dữ liệu form → service → repository và mapper PUT, kiểm clone dữ liệu, số 0 đầu, ngân hàng trống/thiếu, vùng ngừng/ID lạ, lỗi đồng thời và bản nháp qua unlink. Không thêm rule hoặc thay quyết định vùng ngừng. Các kết quả full working tree phía trên là bằng chứng của lượt triển khai trước, có cả sửa đổi local khác; không dùng chúng thay cho kiểm bản source chuẩn bị commit.

### P3 EMP-WORK-REV-01 — Mất focus khi bỏ vùng đã ngừng

Thao tác bằng bàn phím: focus checkbox vùng đã ngừng rồi nhấn Space. React bỏ mục đó khỏi picker theo quy tắc đã chốt; checkbox đang focus bị unmount nên `document.activeElement` trở thành body. Người dùng mất vị trí thao tác trong popup, dù mảng ID và bản nháp vẫn đúng.

Test hồi quy mới trong `employee-unlink.test.tsx` tái hiện trước sửa bằng lệnh `npm test -- src/features/employee-management/components/employee-unlink.test.tsx -t 'keeps keyboard focus in the working-zone group'`: **1 fail/25 skip**, lỗi tại kỳ vọng activeElement là nhóm Vùng làm việc, thực tế là body. Đây là focus bị mất khi phần tử bị xóa, không phải lỗi submit hoặc backend.

Sửa tại onChange của `EmployeeWorkingZones`: khi bỏ chọn mục đã ngừng, focus fieldset trước khi cập nhật mảng ID. Fieldset vẫn tồn tại sau render, không cần timer hoặc effect khôi phục trễ. Chọn/bỏ vùng đang dùng không bị đổi focus. Test đồng thời kiểm mục đã biến mất, ghi chú nháp còn nguyên và chưa gọi save. Chạy lại toàn file: **26/26 pass**. Tổng ca mới của lát này thành **38** (37 triển khai + 1 hồi quy review).

### Kiểm bản source chuẩn bị commit

Đã kiểm bản sao lấy từ Git index ở thư mục kiểm thử riêng. Đối chiếu hash của toàn bộ 28 file source được stage với bản sao: khớp. Commit chỉ gồm module nhân viên, composition mock và tài liệu liên quan; các thay đổi local hồ sơ/thông báo/Dialog được giữ ngoài commit. Không đưa `.env.local`, ảnh/log hay `docs/learning/` lên repo.

| Kiểm tra trên source chuẩn bị commit | Kết quả |
| --- | --- |
| `npm run lint` | Đạt, không warning |
| `npm run typecheck` | Đạt |
| `npm test` | **2.083 pass / 31 skip**, 171 file pass / 4 skip, 112,52 giây |
| `npm run build` | Đạt, 18/18 trang; không thêm route nhân viên gọi API thật |
| `npm run test:session-pages` | Đạt 24 HTTP assertions trên bản build |
| `git diff --cached --check` | Đạt |

31 ca Redis tích hợp bị skip, không coi là đã nghiệm thu Redis thật. Số 2.083 thấp hơn working tree trước vì không chứa 14 ca hồ sơ/thông báo local, đồng thời có thêm 1 ca focus trong lượt review này. Không có sửa source sau bộ kiểm trên; chỉ hoàn thiện báo cáo/context/plan. Ảnh và số đo browser phía trên thuộc lượt triển khai trước; lượt review này dùng test component cho bản vá focus, không tuyên bố đã chạy lại browser native.

Tự đánh giá: đã sửa P3 EMP-WORK-REV-01, không phát hiện lỗi mới còn mở trong phạm vi đã kiểm. Phạm vi xuất bản là nhánh hiện tại `feature/OMTS-132-web-foundation`; PR #3 tiếp tục draft, không merge develop. Chưa bật API/refresh; MSG06, tên MSG24, runtime catalog/session và QA/DB vẫn chờ. Kết quả local không thay cho trạng thái CI của commit sau push; GitGuardian lịch sử tiếp tục để sau theo yêu cầu người dùng.
