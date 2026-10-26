# Bỏ liên kết tài khoản nhân viên — triển khai và review

Ngày 26/10/2026. Repo `omts-web`, nhánh `feature/OMTS-132-web-foundation`. Phạm vi: hoàn thiện contract/domain, mock và UI bỏ liên kết; không bật API thật, không sửa backend/SRS/Jira.

## Kết quả theo từng tác vụ

| Tác vụ | Kết quả | Giới hạn |
| --- | --- | --- |
| EMP-API-01 | Tách input/result của `unlinkAccount`; phiên bản là chuỗi opaque, fixture dùng base64 | Chưa có full EmployeeSaved DTO mapper/HTTP response parser |
| EMP-API-02 | Mock lưu với accountId:null giữ link; unlink riêng, version check, no-op, MSG01/02/06/19 và not-found | Mock không phải DB, không mô phỏng audit log/grants/session backend |
| EMP-API-03 | Nút bỏ liên kết, xác nhận, pending, toast; giữ form và bản nháp; lần lưu sau dùng version mới | Chạy trên nguồn mock |
| EMP-API-04 | Giữ chưa triển khai | Chưa có employee BFF/HTTP route, CSRF/Owner guard cho DELETE hoặc query serialization |
| EMP-API-05 | Test component/repository/service/state, phản hồi muộn và tranh chấp phiên bản trong mock | Chưa nghiệm thu SQL race, release/QA hoặc API thật |

Nguồn contract là PR16 backend head `d96685d82aff5bd6ac8bbb723ffa3d103fb12eb3`. Kiểm lại bằng `gh pr view`: OPEN, draft, mergedAt:null. Lời nhắc nhóm và ticket hiện hành nằm trong [audit trước triển khai](BACKEND_JIRA_EMPLOYEE_UNLINK_AUDIT_2026-10-26.md): OMTS-203, parent OMTS-119, backend OMTS-199 và comment10034 của OMTS-214. Không tick Done ticket chỉ vì mock/test đã qua.

## Hành vi UI đã sửa

Owner mở hồ sơ có tài khoản sẽ thấy tài khoản đang liên kết cùng nút **Bỏ liên kết tài khoản**. Hộp xác nhận nêu đúng username đang lưu, không dùng tài khoản khác vừa chọn trong bản nháp. Hủy quay về form; xác nhận chỉ thực hiện unlink, không lưu các trường khác.

Khi thành công, callback riêng cập nhật nhân viên và danh sách tài khoản có thể liên kết, hiện toast và giữ editor mở. Editor dùng key là ID nhân viên thay cho recordVersion; `resetField` chỉ cập nhật baseline của ô tài khoản. Ghi chú/địa chỉ/tên đang nhập vẫn còn, kể cả bản nháp đang thiếu trường bắt buộc. Nếu đã chọn một tài khoản thay thế thì lựa chọn đó vẫn là bản nháp và chỉ được liên kết khi bấm Lưu.

Version mới được giữ trong hook và gửi nguyên chuỗi ở lần lưu tiếp theo. Bỏ liên kết không tạo một lần lưu hồ sơ ngầm, không xóa/khóa tài khoản, không đổi quyền hay tự tạo mật khẩu. Form không có thay đổi nào khác sẽ trở về trạng thái sạch sau unlink.

Pending khóa các trường, nút Lưu và khả năng đóng dialog; tracker chặn thao tác trùng ngay cả trước lần render kế tiếp. Khi component unmount, phản hồi muộn không được cập nhật workspace/toast. Điều này không có nghĩa request đã gửi được hủy ở server.

Lỗi quyền/phiên bản/not-found giữ bản nháp. MSG19 đi qua session-expiry channel hiện có. Mất phản hồi không được báo “dữ liệu chưa thay đổi”, không tự retry hoặc dùng PUT-null làm phương án dự phòng. Test mất phản hồi sau khi mock đã commit xác nhận lần save bằng version cũ bị chặn, không liên kết lại tài khoản.

## Kết quả tự review và lỗi đã sửa

**EMP-REV-01 — P2, Escape đóng cả hai dialog:** kiểm tra browser thật phát hiện Escape trong xác nhận đóng luôn editor và mất draft. React truyền synthetic cancel lên dialog cha dù ý định là đóng dialog trên cùng. Thêm test tái hiện trước sửa: không còn tìm thấy dialog Nguyễn Văn An. Sửa `Dialog.onCancel` bằng `stopPropagation` sau `preventDefault`; giữ nguyên việc cha tự xử lý Escape khi cha là dialog trên cùng. Test hồi quy dùng chính Experience/editor/ConfirmDialog, không thay Dialog bằng stub. Khi đóng xác nhận, hook đưa focus về ô tài khoản sau frame kế tiếp vì nút mở xác nhận bị disabled trong lúc modal mở; test kiểm cả điểm focus này.

**EMP-REV-02 — P3, mock có thể tái sử dụng version cũ:** chỉ kiểm version đang tồn tại trong workspace chưa đủ nếu fixture khởi tạo mang số lớn hơn bộ đếm. Sau vài lần lưu, version cũ có thể được cấp lại. Mock nay ghi nhớ toàn bộ version đã cấp bằng Set; test fixture `mock-employee-5` xác nhận không cấp lại version đó và stale unlink vẫn bị từ chối. Không khẳng định có lỗi này ở SQL/backend.

**Lỗi tooling đã khắc phục:** test ban đầu dùng `fireEvent.cancel` không tồn tại; đổi thành phát Event cancel. React act warning được xử lý bằng wrapper act của Testing Library. Typecheck bắt tùy chọn exact không thuộc ByRoleOptions; dùng biểu thức tên nút có neo đầu/cuối. ESLint không chấp nhận callback đọc ref truyền vào handleSubmit trong render; chuyển việc gọi handleSubmit vào event submit. Không tắt rule hoặc bỏ typecheck để qua lỗi.

## Bằng chứng kiểm tra

- `npm test` sau bản sửa cuối: **126 files PASS, 4 files SKIP; 1.448 tests PASS, 31 Redis tests SKIP**. Không chạy live Redis trong lát employee này. Có 15 component cases đi qua editor thực cùng repository/service/state regression tests.
- `npm run lint`, `npm run typecheck`, `npm run build`: PASS, đã chạy tuần tự lại sau thay đổi focus cuối.
- `git diff --check`: PASS. `npm audit --omit=dev --audit-level=moderate`: 0 vulnerabilities; lần cài devDependencies cũng báo 0 vulnerabilities. Không coi audit dependency là chứng minh toàn bộ ứng dụng không có lỗi bảo mật.
- `git check-ignore` xác nhận bài89 ở learning được ignore. HEAD vẫn4555c32, không commit/push/merge.
- Browser bản production local/mock: mở danh sách, sửa Ghi chú, Hủy giữ draft; tái hiện Escape trước sửa và xác nhận trên bản build cuối chỉ còn một dialog, đúng bản nháp và focusedField=accountId. Unlink thành công vẫn giữ editor, chọn tài khoản rỗng và account cũ trở lại picker. Bấm Lưu nhận toast thành công; mở lại hồ sơ giữ đúng ghi chú đã nhập, account rỗng và nút Lưu disabled vì form sạch. Đây là cùng phiên mock, không phải persistence qua reload/server DB.
- Kích thước được đo bằng DOM: 360 CSS px, pageWidth349 (scrollbar), dialog contentWidth=clientWidth337; 1024 CSS px, pageWidth1024, dialog contentWidth=clientWidth756. Không tràn ngang ở hai kích thước đo này. Override IAB cần nhân theo tỉ lệ1,4 trên máy hiện tại; không lấy số yêu cầu viewport làm bằng chứng thay cho innerWidth thực. Screenshot của IAB có thể bị cắt theo vùng panel, nên không dùng ảnh cắt để suy chiều rộng viewport.

Các lần PASS trước khi sửa Escape không thay cho bằng chứng sau sửa. Không gọi local browser/mock evidence là QA hoặc thử API thật. Lần lưu sau dùng version mới được chứng minh bằng test component bắt input của service; DOM browser không được dùng để đọc ref hay state ẩn.

Ảnh tạm trong `.hallmark/employee-unlink-draft-360.png` và `employee-unlink-draft-1024.png` (ignored); ảnh bị giới hạn vùng panel như lưu ý trên. Viewport override đã reset sau test. Tab kết quả và server build local tại127.0.0.1:3000 được để lại để review, nguồn vẫn mock. Không tạo container/DB hoặc sửa trust store.

**Tự đánh giá:** hai finding của lát sửa đã được khắc phục; không còn finding P1/P2 mở được phát hiện trong phạm vi UI/mock này. Chưa thể coi employee API hoặc toàn OMTS-203 hoàn thành. Chưa chạy các fixtures bảo mật BFF không thay đổi trong lượt này; lint/typecheck/build và full unit/component suite là bằng chứng local, không phải GitHub CI.

Test DOM dùng jsdom và Testing Library mới thêm ở devDependencies. showModal/close được shim vì jsdom không có modal stack native; do đó test DOM không chứng minh được focus/backdrop/viewport thực. Auth/permission/toast được thay ở ranh giới test để kiểm tra luồng editor, không phải bằng chứng kiểm quyền server.

## Việc còn chờ trước API thật

1. PR16 merge, CI/review/release phù hợp và QA có endpoint DELETE. API không được bật tự động khi chỉ thấy PR đổi trạng thái.
2. Hoàn thiện mapper EmployeeSaved: đọc `employee.rowVersion`, không đọc field version ở root và không coi DELETE thành công là 204. Giữ các field mới như working zones/bank details khi tích hợp toàn bộ OMTS-203.
3. Query rowVersion phải encode đúng một lần. Ca `AAAAAAAA+/8=` hiện được test truyền nguyên chuỗi qua service; **chưa** phải test URL HTTP. Chưa thêm helper URL không dùng vào runtime.
4. BFF/HTTP employee adapter phải kiểm session, Owner, CSRF, response schema và lỗi, sau đó mới smoke trên backend được triển khai.
5. MSG06 API thật vẫn chờ structured user_name/time. Mock có metadata mô phỏng riêng; không dùng chúng để bù response backend, không parse câu tiếng Anh và không tự gỡ blocker đã chốt.

Giữ nguyên các chênh lệch rộng hơn của OMTS-203 đã ghi trong audit; không đổi luồng nghỉ việc/đi làm lại, bank details, tạo account hoặc username trong lượt sửa unlink này. Ghi chú học ở `docs/learning/89-bo-lien-ket-giu-ban-nhap-va-version.md`, chỉ lưu local theo gitignore. Không commit/push/merge trong yêu cầu này.
