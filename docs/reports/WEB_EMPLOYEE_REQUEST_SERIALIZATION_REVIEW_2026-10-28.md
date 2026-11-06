# EMP-API-02 — dựng request PUT/DELETE và encode version

Ngày28/10/2026, Asia/Saigon. Web giữ nhánh `feature/OMTS-132-web-foundation`, HEAD `b60e9e7` khi bắt đầu; backend snapshot `953f5977f880d5ea7916d6e91482a0d0a5b2a95a`. Đây là phần chuẩn bị thuần, chưa bật API/refresh thật hoặc nối HTTP. Chưa commit/push/merge.

## 1. Kết quả theo từng micro-task

### EMP-API-02a — Request PUT

Thêm `src/features/employee-management/api/employee-mutation-request.ts`. `prepareEmployeePutRequest` kiểm GUID và payload bằng schema đã có ở01b, rồi dựng method PUT, đường dẫn cố định `/api/employees/{id}`, Accept/Content-Type JSON và body đã stringify.

`rowVersion` ở body giữ nguyên chuỗi base64. Unicode, dấu nháy và xuống dòng được JSON xử lý; không dùng URL encoding cho body. Payload gửi `accountId: null` hoặc không có field này vẫn là PUT giữ liên kết, không sinh thêm DELETE. ID sai/URL/path injection và field không thuộc request bị từ chối bằng `invalid-input`, không trả một request dùng tạm.

Body là chuỗi snapshot tại lúc dựng; thay đổi ngân hàng/vùng/version trên object đầu vào sau đó không làm đổi request đã chuẩn bị. Request chưa có origin, Authorization, cookie, fetch, retry hoặc fallback. Future BFF adapter phải bổ sung session/Owner/CSRF/endpoint policy ở server trước khi gửi; không đưa descriptor này thành generic proxy nhận URL từ browser.

### EMP-API-02b — Request bỏ liên kết

`prepareEmployeeUnlinkRequest` nhận đúng `{employeeId,recordVersion}`. Version phải là base64 gốc, không trống; gọi `encodeURIComponent` một lần tại vị trí đưa nó vào query:

```text
Raw:   AAAAAAAA+/8=
Query: rowVersion=AAAAAAAA%2B%2F8%3D
```

Request là DELETE `/api/employees/{id}/account?...`, chỉ có Accept JSON, không có body hoặc Content-Type. Chuỗi đã chứa `%2B`/`%252B`, version thiếu/null, khoảng trắng hoặc query injection không được tự decode/trim để cứu request. Không fallback PUT null. Backend cho phép version optional vì tương thích client cũ; Web hiện đã có version bắt buộc trong luồng unlink từ trước và giữ nguyên yêu cầu đó.

### EMP-API-02c — Đọc success đúng contract

Thêm `map-employee-mutation-success.ts`: chỉ nhận HTTP200 rồi dùng mapper envelope/ID ở01b. DELETE phải trả hồ sơ không còn account; nếu vẫn còn link thì trả `invalid-response`. No-op đã không có link vẫn hợp lệ dù version không đổi; không tự yêu cầu version phải tăng.

HTTP201/202/204/206 hoặc lỗi HTTP không được coi là thành công ngay cả khi body trông giống EmployeeSaved. `unexpected-status` là kết quả nội bộ, **không phải cách hiển thị MSG06/401/403 mới**. Future transport vẫn phải đưa lỗi qua error handling chung; MSG06 metadata tiếp tục chờ backend. Không forward raw English copy hoặc temporary credential bằng success projection update/unlink này.

### EMP-API-02d — Test hồi quy và ca xuyên hàm

Thêm35 test request và21 test success, tổng56 test mới. Ca version kiểm cả chuỗi URL mong đợi độc lập, không có `%25`, và decode bằng URLSearchParams sau khi đi qua URL/Request. Bộ dữ liệu có dấu cộng, dấu gạch chéo, một/hai dấu bằng và các version khác nhau; kiểm query chỉ có đúng một rowVersion. Đây là Request/URL fixture trên máy, không có fetch hoặc socket gửi tới backend.

Ca xuyên hàm đi từ hồ sơ đầy đủ → draft đang nhập → DELETE descriptor với V1 → success200 chứa V2 → dựng PUT với draft và V2. Tên/ghi chú đang nhập, ngân hàng/vùng và draft đầu vào được giữ; version trong body PUT không bị encode. Đây không phải browser E2E hay kiểm transaction trên .NET.

## 2. Nguồn và tự review

Đọc lại Jira [OMTS-203](https://welterial.atlassian.net/browse/OMTS-203) (To Do), dependency [OMTS-199](https://welterial.atlassian.net/browse/OMTS-199) (Done), parent [OMTS-119](https://welterial.atlassian.net/browse/OMTS-119) và follow-up [OMTS-214](https://welterial.atlassian.net/browse/OMTS-214). Đối chiếu [EmployeesController tại953f597](https://github.com/thaideptrai218/omts-backend/blob/953f5977f880d5ea7916d6e91482a0d0a5b2a95a/src/OMTS.Api/Controllers/EmployeesController.cs), EmployeeService.UnlinkAccountAsync và [báo cáo01a/01b](WEB_EMPLOYEE_SCHEMA_MAPPER_REVIEW_2026-10-28.md). Giữ UC10 và các quyết định đã xác nhận; không đổi SRS/Jira hoặc cần thêm layout Figma trong lát hàm thuần này.

Tự review tập trung vào điểm dễ sai: encode trước rồi encode lại; dấu cộng bị hiểu thành khoảng trắng; coi DELETE là204; dùng bare EmployeeView thay envelope; dùng version cũ sau unlink; gỡ link bằng PUT null; làm mất draft; nhận nhầm hồ sơ; gỡ account nhưng báo success khi response còn link. Các tình huống đã có test và kết quả đúng trong phạm vi fixture. Không phát hiện thêm lỗi mới trong phần đã rà; test đích chạy đạt ngay, không có lỗi thực tế mới cần ghi cách khắc phục.

Không thay backend endpoint allowlist/transport, Route Handler, service instance, component hoặc env. Các sửa P7/profile/notification và schema/mapper01 từ lượt trước được giữ. Không mở API thật để tạo bằng chứng, không chạy seed/migration, không cập nhật runtime backend hoặc kiểm lại GitHub CI/backend trong lượt này.

## 3. Kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Hai file test mới |56 pass |
| `npm test` |1.782 pass/31 skip;154 files pass/4 skip,94,68s |
| `npm run lint` |Đạt, không warning |
| `npm run typecheck` |Đạt |
| `npm run build` |Đạt;18/18 pages, không thêm employee API route |
| Tài liệu/Git |241 link Markdown nội bộ không có link hỏng; `git diff --check` đạt; file mới không có trailing whitespace; bài học104 được ignore |

31 ca Redis skip vì lượt này không cung cấp endpoint integration Redis chuyên dụng; không coi là đã thử Redis lại. Không chạy browser hoặc backend HTTP vì phần mới chưa được ghép UI/runtime. Toàn suite gồm các thay đổi local từ trước; riêng EMP-API-02 thêm56 ca.

## 4. Giới hạn và bước tiếp theo

EMP-API-02 hoàn thành phần serializer/success decoder và test fixture. **Chưa có employee HTTP/BFF runtime**, nên chưa chứng minh backend/QA nhận version giống fixture hoặc UI hoạt động trên API thật. Chưa thêm retry, queue, optimistic save, xử lý xung đột hoặc thay luồng quản trị. Không có xung đột nghiệp vụ mới cần chốt trong phạm vi này.

EMP-API-03…05 vẫn pending: ghép adapter trong server boundary đã duyệt, kiểm Owner/session/CSRF, response/error và runtime được chọn; MSG06/role/contact-gate/refresh cùng các điều kiện trong [audit27/10](BACKEND_DEVELOP_UPDATE_AUDIT_2026-10-27.md) không được tự đóng bằng test serialization. Việc chuẩn bị descriptor không mở rộng allowlist hoặc cấp quyền gọi endpoint.

Plan/context sẽ phản ánh phần chuẩn bị hoàn thành. Bài học104 trong `docs/learning/` được ignore, giải thích encode/query/JSON, version và các giới hạn; không đưa tài liệu học lên repo nhóm.
