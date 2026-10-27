# EMP-API-01a/01b — schema và mapper nhân viên

Bắt đầu27/10, hoàn tất kiểm tra28/10/2026, Asia/Saigon. Nhánh `feature/OMTS-132-web-foundation`, HEAD khi bắt đầu `b60e9e7`. Backend dùng làm snapshot: `develop@953f5977f880d5ea7916d6e91482a0d0a5b2a95a`. Chưa bật API/refresh thật; chưa commit/push/merge.

## 1. Kết quả và phạm vi

Đã hoàn thành **EMP-API-01a** và phần mapper chuẩn bị của **EMP-API-01b**: kiểm JSON response, chuyển sang model giữ đủ dữ liệu, tạo giá trị form và dựng payload PUT cập nhật thông tin cá nhân. Những hàm mới chưa import vào repository/service instance, component hoặc Route Handler. Giao diện người dùng vẫn chạy mock như trước.

Nguồn đối chiếu: [audit backend27/10](BACKEND_DEVELOP_UPDATE_AUDIT_2026-10-27.md), Jira [OMTS-203](https://welterial.atlassian.net/browse/OMTS-203) và dependency [OMTS-199](https://welterial.atlassian.net/browse/OMTS-199), epic FARM [OMTS-119](https://welterial.atlassian.net/browse/OMTS-119), UC10 trong Report3Finnal.md; controller, EmployeeDtos, EmployeeInput, EmployeeService, PhoneNumbers, StatusCatalog và RowVersionGuard của backend. OMTS-203 vẫn To Do, OMTS-199 Done tại lượt đọc; không đổi Jira. Không cần đổi Figma vì không thay layout hoặc màn hình.

Phần code này không thêm trường bắt buộc vào form đang dùng, không thay cách nghỉ việc/đi làm lại, gán quyền, tạo account hoặc hiển thị lỗi MSG06. Chưa có quyết định nghiệp vụ mới cần người dùng chốt trong phạm vi đã làm.

## 2. Từng micro-task

### 01a.1 — Phân biệt danh sách, hồ sơ đầy đủ và kết quả lưu

Thêm `src/features/employee-management/api/employee-contract.schemas.ts`. Schema riêng cho list item, trang phân trang, hồ sơ đầy đủ, kết quả lưu update/unlink và picker tài khoản có thể liên kết. List item không có version/ngân hàng nên không thể được parse thành hồ sơ để sửa.

Field nullable phải xuất hiện với null khi không có dữ liệu; không tự default trường thiếu. Ngày giữ dạng DateOnly `YYYY-MM-DD`, kiểm ngày thực, không chuyển múi giờ. ID dùng GUID; version dùng schema base64 sẵn có, giữ nguyên nội dung, không decode hoặc tái tạo. Enum bám tên status catalog mà backend trả: Employed/Left và Active/Locked.

Response được phép có field bổ sung nhưng projection bỏ chúng ở từng cấp. `employeeSavedSchema` chỉ dành cho update/unlink, không trả raw success copy hoặc credential một lần ra model. **Luồng tạo account và bàn giao credential cần schema riêng**, chưa làm trong lát này.

### 01a.2 — Kiểm chứng response contract

Thêm fixture tổng hợp `employee-wire.fixtures.ts` và48 test trong `employee-contract.schemas.test.ts`. Có ca thiếu trường, nullable/empty, ngày nhuận/ngày sai, GUID/mock ID, enum lạ, page sai kiểu, bank thiếu field, version sai, bare detail thay envelope và field bổ sung ở account/bank/zone. Fixture chỉ được test import; không có credential cố định.

### 01b.1 — Model và mapper đọc

Thêm `domain/employee-record.ts` và `api/map-employee-response.ts`. Record đầy đủ giữ vùng làm việc, ngân hàng, ngày nghỉ việc, nullable personal fields và version; list record chỉ giữ đúng dữ liệu danh sách. Model này tách khỏi mock workspace cũ, chưa thay type/service của màn hình.

Mapper detail/save kiểm ID hồ sơ kỳ vọng, cho phép khác chữ hoa/thường của GUID nhưng từ chối hồ sơ khác. Mapper đổi `ward` thành `wardCommune`, `phoneNumber` thành `phone`, `rowVersion` thành `recordVersion` và trạng thái thành tên dùng trong Web. Không suy quyền/role từ status hay tài khoản liên kết. LinkedAccountView không có phone; picker linkable account có phone riêng, kể cả null. Không dùng phone của Employee để bù phone của Account.

Chín test mapper đọc kiểm các trường hợp trên, phân trang, null, response không đầy đủ và không giữ tham chiếu object con của input.

### 01b.2 — Mapper form và PUT giữ dữ liệu

Thêm `employee-update.schema.ts` và `map-employee-update.ts`. `employeeRecordToEditorValues` chỉ chuyển null thành ô trống ở lớp nhập liệu; record gốc vẫn giữ null. `mapEmployeeUpdate` lấy vùng/ngân hàng từ record đầy đủ và các trường được sửa từ draft; trường optional không thay đổi giữ nguyên null/empty gốc. Khi xóa nội dung optional đã có, payload gửi null theo ngữ nghĩa backend.

Schema request strict chỉ chấp nhận các field PUT personal-data và các giới hạn đã có trong EmployeeInput. Không gửi status/end date, object tạo account hoặc metadata của response. Kiểm phone theo các dạng PhoneNumbers.Normalize hỗ trợ, nhưng giữ chuỗi để server chuẩn hóa. Đây chưa phải toàn bộ validation nghiệp vụ: kiểm ngày sinh không ở tương lai, trùng hồ sơ, quyền, vùng/account có thể dùng và concurrency vẫn cần validation/form/backend phù hợp ở lát tích hợp.

Nếu draft đổi trạng thái, mapper trả `employment-action-required`; nếu xóa lựa chọn account khi còn link, trả `unlink-required`. Hai kết quả là tín hiệu nội bộ cho adapter tương lai, chưa phải popup/message mới và chưa tự gọi POST/DELETE. Gửi accountId null/thiếu ở PUT vẫn có nghĩa giữ link theo backend.

Hai mươi test mapper ghi kiểm sửa một trường giữ các phần còn lại, null/empty, phone thiếu và các định dạng backend hỗ trợ, sai field/limit, ngăn trộn thao tác, không mutate draft/record. Ca xuyên hàm mô phỏng draft chưa lưu → response unlink version mới → chỉ xóa link trong draft → PUT dùng version mới và giữ tên/ghi chú đang nhập. Đây là test hàm thuần, **không phải browser E2E hoặc gọi DELETE thật**.

## 3. Lỗi thực tế đã bắt và sửa

Lệnh `npm test -- src/features/employee-management/api/map-employee-update.test.ts` ban đầu có3 fail/17 pass. Các ca phone `84900000000`, `0900 000 000`, `(0900)-000.000` mong `ready` nhưng nhận `invalid-input`.

Nguyên nhân: regex request đầu tiên chỉ chấp nhận dạng0 hoặc+84 liền số. Đọc `PhoneNumbers.Normalize` cho thấy backend còn nhận84 và loại bỏ khoảng trắng/dấu chấm/gạch/ngoặc. Schema mới đã hẹp hơn contract thật, khiến mapper từ chối trước khi request có thể được tạo. Đây là lỗi mới trong phần chuẩn bị của lượt này; chưa xảy ra trên UI hoặc API live.

Đã thay phép kiểm bằng predicate kiểm dạng domestic sau khi loại dấu phân cách và quy đổi prefix giống backend, **không transform chuỗi output**. Giữ ba ca làm regression. Chạy lại toàn bộ api folder:77/77 pass; full suite cuối cũng pass. Không đổi expected sang invalid-input để che lỗi hoặc nới validation backend.

## 4. Kiểm tra cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Test riêng schema response |48 pass |
| Test mapper đọc |9 pass |
| Test mapper ghi sau sửa |20 pass |
| `npm test` |1.726 pass,31 Redis skip;152 files pass/4 skip,88,07s |
| `npm run lint` |Đạt, không warning |
| `npm run typecheck` |Đạt |
| `npm run build` |Đạt;18/18 pages sinh thành công |
| Rà import/source |Chỉ module chuẩn bị và test tham chiếu module mới; không nối service/component/route, không HTTP/storage/browser API |
| Tài liệu/Git |`git diff --check` đạt;236 link Markdown nội bộ không có link hỏng; file mới không có trailing whitespace; bài học103 được ignore; backend vẫn sạch tại953f597 |

31 Redis case skip do không cung cấp endpoint Redis integration chuyên dụng; không coi là Redis đã được kiểm lại. Không chạy .NET, migration, seed, backend mutation hoặc CI GitHub trong lượt này. Các sửa P7/profile/notification và audit tài liệu từ lượt trước vẫn được giữ; full suite bao gồm chúng nhưng chúng không phải code mới của EMP-API.

## 5. Tự review và phần còn lại

Tự review đã đối chiếu từng trường với DTO/service953f597, kiểm rằng list không được coi là detail, không fabricate phone/quyền, không mutate draft, không nhận nhầm ID, không trim/encode version và không đưa response metadata vào PUT. Lỗi phone đã có bằng chứng RED/GREEN. Chưa phát hiện thêm lỗi trong phạm vi đã kiểm; đây không phải nghiệm thu API/Jira.

Giới hạn cần giữ rõ:

- Chưa thay toàn bộ EmployeeManagementWorkspace/form cũ bằng model mới. UI ngân hàng/vùng, phân trang API, nghỉ việc/khôi phục và tạo account còn các lát riêng; không dùng mapper personal-data này làm adapter cho mọi thao tác.
- Schema không xác nhận deployment QA/runtime có cùng revision; phải kiểm contract trên môi trường được phép trước khi mở API. Additive response field được bỏ có thể cần xem lại khi backend thay đổi ý nghĩa PUT.
- Mapper chỉ dựng payload và giữ dữ liệu. Chưa có URL serializer/DELETE HTTP hoặc test encode version một lần: **EMP-API-02** là bước tiếp theo.
- MSG06 thiếu structured user/time, refresh idempotency, role/contact-gate alignment và backend CI vẫn là điều kiện còn mở theo audit27/10. Lượt này không kiểm lại trạng thái CI backend hoặc tự đóng các điều kiện đó.
- BFF/Owner/CSRF/session guards phải được ghép trước runtime; type/schema/mapper không cấp quyền và không thay backend authorization. Chưa thêm retry, optimistic save hoặc lưu bản nháp nhạy cảm xuống localStorage.

Plan và PROJECT_CONTEXT đã cập nhật phạm vi chuẩn bị hoàn thành. Bài học103 giải thích schema, mapper, snapshot đầy đủ, DateOnly, lỗi phone và câu hỏi bảo vệ trong `docs/learning/` được ignore; không đưa tài liệu học lên repo nhóm.
