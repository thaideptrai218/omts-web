# EMP-API-04a-E — field lỗi và ID hồ sơ trùng

Ngày28/10/2026, Asia/Saigon. Web giữ nhánh `feature/OMTS-132-web-foundation`, HEAD ban đầu `b60e9e7`; backend snapshot `953f597`. Chưa bật API/refresh thật, mount route, đổi service/UI hoặc env. Không commit/push/merge, đổi Jira/SRS/backend hoặc chạy seed/migration. Giữ các thay đổi local từ trước.

## 1. Kết quả và nguồn

Đã chuẩn bị projection giới hạn cho error metadata của **PUT hồ sơ và DELETE unlink**, mapper sang field key/ID có cấu trúc và ghép vào mutation adapter sau khi kiểm lại phiên. BackendTransportResult không còn làm rơi các metadata đã xác nhận, nhưng vẫn không chứa raw detail/hint/params/version trong lỗi.

Nguồn đọc: [OMTS-203](https://welterial.atlassian.net/browse/OMTS-203) To Do, dependency [OMTS-199](https://welterial.atlassian.net/browse/OMTS-199) Done, parent [OMTS-119](https://welterial.atlassian.net/browse/OMTS-119), UC10; AppError, ResultHttpExtensions, InvalidModelStateResponse, EmployeeInput/EmployeeService và StaffAccountService tại953f597. [Báo cáo GET04a](WEB_EMPLOYEE_GET_ADAPTER_REVIEW_2026-10-28.md) và [mutation03](WEB_EMPLOYEE_BFF_ADAPTER_REVIEW_2026-10-28.md) là baseline.

Chưa ghép DTO lỗi này vào form/workspace cũ: form hiện thiếu bank/zones và chưa có API source. **Không coi phần UI binding hoặc toàn UC10 đã hoàn tất.** MSG06 tiếp tục chờ metadata; không thêm fallback hoặc parse thông báo tiếng Anh.

## 2. Contract backend thực tế

| Tình huống | Metadata thực thấy trong source | Cách xử lý |
| --- | --- | --- |
|400 MSG01 từ AppError.Invalid |field là nhãn như Full name/Phone number/RowVersion |Chỉ nhận allowlist đã đối chiếu |
|400 MSG01 từ InvalidFields |field đầu tiên và fields chứa mọi field lỗi |Kiểm mảng có giới hạn, field khớp phần tử đầu; giữ thứ tự, deduplicate |
|400 MSG01 từ model binding |field giữ tên property JSON sau khi bỏ prefix $. |Map tường minh12 field DTO phẳng sang nhãn canonical |
|409 MSG03 trùng nhân viên |existingEmployeeId |Kiểm GUID và giữ đúng entity |
|409 MSG24 account đã thuộc hồ sơ khác |existingEmployeeId; tên chỉ nằm trong detail |Giữ ID, chưa tạo message có employee_name |
|MSG03 trùng tài khoản trong flow tạo account |existingId của Account |Không đổi thành Employee ID; flow này chưa có trong adapter PUT/DELETE |
|409 MSG06 |currentRowVersion và câu detail, thiếu metadata đã yêu cầu |Giữ nhánh contract-blocked cũ |

Metadata được ASP.NET serialize thành field top-level của ProblemDetails. Không đọc một bag extensions/params tùy ý, không cắt chuỗi detail để suy field/ID/tên.

## 3. Micro-task E1 — projection metadata có giới hạn

Thêm `src/features/employee-management/api/employee-problem-metadata.ts` và55 test. Metadata chỉ có ba kind: invalid-fields, duplicate-employee, account-already-linked. Field canonical là12 nhãn chính xác của EmployeeInput/EmployeeService; fields tối đa12, không rỗng, không có nhãn lạ. ID dùng GUID schema hiện có; không nhận URL, số hoặc alias existingId.

Map tường minh các field DTO phẳng fullName/phoneNumber/birthday/address/area/ward/otherInformation/notes/workingZoneIds/bankAccount/accountId/rowVersion. Không tự lowercase, cắt path hoặc đoán từ tên tương tự. Path lồng/index như bankAccount.accountNumber, workingZoneIds[0], field tổng Request hoặc request.FullName hiện chưa có mapping và bị chặn; không giả vờ đã hỗ trợ mọi lỗi JSON malformed.

Projection ràng buộc endpoint/status/code: field chỉ400 MSG01, duplicate/link chỉ409 MSG03/24 của employeeUpdate; unlink chỉ chấp nhận RowVersion. Auth, profile, GET và MSG06 không được mở rộng metadata exposure. Nếu metadata có cả existingEmployeeId và existingId thì không tự chọn một ID để dùng.

## 4. Micro-task E2 — giữ metadata qua bounded transport

`backend-response.ts` đọc body một lần trong giới hạn1MiB hiện có, lấy code đã biết rồi project metadata riêng cho operation đã cho phép. Thêm optional employeeProblem vào union lỗi nội bộ ở backend-result.ts; chỉ thêm property khi metadata hợp lệ. Các lỗi/endpoint cũ giữ shape không có property này.

Không đổi shared browser api-problem parser hoặc cho client nhận raw BackendTransportResult. Không có raw detail/title/hint/stack/params/headers/currentRowVersion/cause trong metadata. Diagnostic logger projection vẫn chỉ giữ event/endpoint/outcome/httpStatus, không có field/ID nhân viên.22 test response kiểm cả byte limit, wrong status, endpoint khác, malformed/unknown metadata và MSG06.

## 5. Micro-task E3 — field key và identity cho lớp UI tương lai

Thêm `map-employee-problem.ts` và20 test. Mapper kiểm metadata lại rồi chuyển nhãn sang target ổn định: Full name→fullName, Phone number→phone, Ward→wardCommune, Account→accountId. Không đưa chuỗi arbitrary từ server vào form.setError.

Bank account giữ thành target nhóm bankAccount; không tự gán lỗi lên cả ba ô con khi backend chỉ nói lỗi nhóm. Working zones và RowVersion trở thành workingZoneIds/recordVersion, không biến thành một input giả trong form hiện tại. DTO không có message, navigation URL hoặc thao tác tự mở hồ sơ.

MSG03 trả duplicate với existingEmployeeId; MSG24 trả account-already-linked với existingEmployeeId. Metadata thiếu/sai kind/GUID hoặc không khớp context trả contract-blocked/employee-error-metadata cho code đã biết. Không dùng câu dự phòng hoặc đánh dấu một field bất kỳ để làm việc có vẻ thành công.

## 6. Micro-task E4 — mutation adapter và HTTP fixture

Adapter chỉ chuyển error sau Owner/session gate, transport và recheck phiên; nếu logout/đổi phiên thì không trả field hoặc ID từ response cũ. MSG06 vẫn được xử lý trước mapper mới trên nhánh conflict-metadata.401/403/timeout và operation/code không được hỗ trợ giữ cơ chế diagnostic hiện có, không tự retry/refresh/clear cookie.

Thêm8 test adapter và7 test actual Node HTTP trên peer loopback tạm. HTTP kiểm field/multi-field, duplicate/link ID, generic account ID không được nhận làm employee ID, thiếu ID nhưng detail chứa tên, URL giả làm GUID và unlink RowVersion. Mỗi mutation chỉ gửi một lần; không tự GET tên người hoặc load hồ sơ trùng. Đây không phải .NET/QA.

## 7. Lỗi thực tế tìm được khi tự review

Ban đầu projector chỉ nhận nhãn nghiệp vụ. Đọc thêm InvalidModelStateResponse cho thấy lỗi parse JSON có thể trả field birthday. Thêm test hồi quy rồi chạy `npm test -- src/features/employee-management/api/employee-problem-metadata.test.ts`:1 fail/38 pass, expected invalid-fields/Birthday nhưng actual undefined.

Nguyên nhân là thiếu nhánh mapping tên field JSON, không phải backend không có metadata. Nếu giữ nguyên, transport sẽ bỏ thông tin lỗi hợp lệ và adapter coi là thiếu contract. Đã bổ sung alias tường minh12 field phẳng, giữ allowlist canonical sau transform; đổi ca test tên lạ từ fullName sang request.FullName vì fullName thực sự là alias hợp lệ.

Test hồi quy chạy lại đạt; nhóm5 file mới có112 test pass. Không nới thành nhận mọi path, không sửa expected thành undefined để lấy dấu xanh, không thay validation nghiệp vụ hoặc dữ liệu thật. Một số path lồng/Request vẫn chưa hỗ trợ được ghi rõ, không bị âm thầm cắt thành field khác.

## 8. Kiểm tra cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Metadata projection |55 pass |
| Canonical issue mapper |20 pass |
| Bounded HTTP response |22 pass |
| Adapter lifecycle/error |8 pass |
| Node HTTP fixture |7 pass |
| `npm run typecheck` |Đạt |
| `npm test` |2.039 pass/31 Redis skip;168 files pass/4 skip,103,80s |
| `npm run lint` |Đạt, không warning |
| `npm run test:boundary` |12 lượt Webpack/Turbopack đạt, giữ ranh giới server-only |
| `npm run build` |Đạt;18/18 pages, không thêm employee API route |
| `npm run test:serialization` |4 lượt Webpack/Turbopack đạt; DTO qua HTML/RSC, token props bị chặn; không có secret canary trong public artifacts/logs |
| Tài liệu/Git |282 link Markdown nội bộ không có link hỏng; diff/whitespace đạt; bài học108 được ignore; Web HEAD b60e9e7 và backend sạch tại953f597 |

31 Redis skip vì không cung cấp endpoint integration chuyên dụng, không tính là đã kiểm Redis lại. Không chạy backend thật, DB, QA hoặc GitHub CI. Full suite có cả các thay đổi local trước lượt này;112 ca mới là phạm vi EMP-API-04a-E.

## 9. Tự review và giới hạn cần giữ

Đã kiểm field/status/endpoint allowlist, cardinality, mismatch giữa field/fields, generic Account ID/Employee ID, metadata malformed, raw-error redaction, post-response session gate, mutation một lần và MSG06 không đổi. Chưa phát hiện thêm lỗi trong phạm vi đã kiểm; không coi đây là bằng chứng không còn lỗi.

- Chưa mount API/source thật hoặc bind DTO vào form cũ. UI thiếu bank/zones/version target phải được xử lý đúng khi nâng form; không silently bỏ field hoặc focus một input không có.
- MSG24 hiện có ID nhưng chưa có tên structured. Đề xuất BA/backend thống nhất bổ sung field tên riêng trước khi format đúng câu hiện hành; chưa tự chốt tên wire field, fetch thêm, fallback hoặc sửa catalog/SRS/Jira. Dữ liệu ID đã chuẩn bị không có nghĩa thông báo đã sẵn sàng đầy đủ.
- Tạo account inline và generic existingId không nằm trong hai endpoint đang chuẩn bị. Chưa phân biệt username/phone bằng cách parse câu tiếng Anh; cần contract riêng khi làm flow đó.
- Model-binding path lồng/index và whole-request errors chưa có UI mapping; giữ trạng thái không đủ metadata thay vì đoán. Chưa hỗ trợ field names mới chỉ vì backend tự đổi wording.
- MSG06, G1/session/runtime, frontend binding và QA theo revision/DB được phép vẫn mở. GET và các lỗi auth/profile không được đổi phạm vi vì metadata mutation này.

Plan/context cập nhật phần server projection/DTO hoàn thành; UI binding giữ pending. Bài học108 trong docs/learning được ignore theo yêu cầu lưu local. Không có nghiệp vụ mới đã bị agent tự quyết.
