# Backend mới ngày 27/10 — thay đổi nào dùng được cho OMTS Web?

Ngày kiểm tra: 27/10/2026, Asia/Saigon. Đây là audit source, GitHub CI và ticket; không phải kết quả chạy backend/DB mới trên máy.

## 1. Kết luận

**Đã pull backend thành công. PR15, PR16 và PR17 đã merge vào develop.** Điều kiện “PR16 chưa merge” trong báo cáo ngày26/10 đã hết hiệu lực. Web có thể tiếp tục chuẩn bị schema, mapper và cách gửi request bỏ liên kết nhân viên theo contract đã merge.

Tuy nhiên, chưa đủ bằng chứng để bật toàn bộ API thật: CI mới nhất có một integration test lỗi; refresh chưa hỗ trợ retry/idempotency; MSG06 chưa có metadata đã yêu cầu; chính sách vai trò và xác minh liên hệ vẫn khác quyết định frontend. Không đổi mock sang API chỉ vì Git đã pull xong.

Lượt này chỉ cập nhật báo cáo/plan. Không sửa source ứng dụng Web/backend, bật API/refresh, chạy migration/seed, reset Owner, đổi Jira hoặc commit/push/merge. Giữ nguyên phần P7 Web đang sửa từ lượt trước.

## 2. Đã pull ở đâu, phiên bản nào?

| Vị trí/nguồn | Trạng thái sau kiểm tra |
| --- | --- |
| `D:\Đồ_án\omts-backend` | Chuyển từ detached `48ae1e0` sang nhánh develop, pull fast-forward tới `953f5977f880d5ea7916d6e91482a0d0a5b2a95a`; working tree sạch |
| `D:\Đồ_án\omts-backend-local` | Giữ nguyên detached `48ae1e0438cec5d1123e7f7f6726377242855ce5`, sạch; chưa cập nhật bản chạy thử |
| `D:\Đồ_án\omts-web` | Giữ nhánh `feature/OMTS-132-web-foundation`, HEAD `b60e9e7`; giữ các thay đổi P7 chưa commit |
| Baseline của audit26/10 | Remote develop `776fbc0`; so với baseline này có ba commit merge mới |

Lệnh đã dùng ở repo backend: `git checkout --no-overwrite-ignore develop`, sau đó `git pull --ff-only origin develop`. Không sinh merge commit hoặc ghi đè thay đổi local. So với checkout cũ `48ae1e0`, bản vừa pull tiến thêm năm commit, gồm ENV API và Docker demo đã có từ trước ba PR mới.

| PR | Kết quả kiểm tra GitHub | Nội dung chính |
| --- | --- | --- |
| [15](https://github.com/thaideptrai218/omts-backend/pull/15) | Merged, `14e58ac`, 13:11 ngày27/10 UTC+7 | Khôi phục Owner bằng CLI; push gắn phiên; lỗi upload quá lớn |
| [16](https://github.com/thaideptrai218/omts-backend/pull/16) | Merged, `c2e29bd`, 13:14 | DELETE bỏ liên kết nhân viên; sửa FARM/status/file |
| [17](https://github.com/thaideptrai218/omts-backend/pull/17) | Merged, `953f597`, 13:29 | Giờ Việt Nam cho thời điểm thiếu offset; nhắc đo nước; dữ liệu ENV mẫu |
| [13](https://github.com/thaideptrai218/omts-backend/pull/13) | Vẫn Open tại lượt kiểm | Lao động/chấm công/lương; không coi là đã có trên develop |

Jira đọc lại: [OMTS-214](https://welterial.atlassian.net/browse/OMTS-214) vẫn In Progress; [OMTS-203](https://welterial.atlassian.net/browse/OMTS-203), Web HTX/nhân viên, vẫn To Do. Không đổi trạng thái hoặc coi merge backend là nghiệm thu Web.

## 3. Bỏ liên kết tài khoản nhân viên: có thể chuẩn bị tích hợp

Đã đọc [EmployeesController](https://github.com/thaideptrai218/omts-backend/blob/953f5977f880d5ea7916d6e91482a0d0a5b2a95a/src/OMTS.Api/Controllers/EmployeesController.cs), [DTO](https://github.com/thaideptrai218/omts-backend/blob/953f5977f880d5ea7916d6e91482a0d0a5b2a95a/src/OMTS.Application/Features/Employees/EmployeeDtos.cs), service và hai bộ test unlink.

- `PUT /api/employees/{id}`: thiếu `accountId` hoặc gửi null đều **giữ liên kết**. Không fallback bỏ liên kết bằng PUT null.
- Bỏ liên kết dùng `DELETE /api/employees/{id}/account?rowVersion=<encodedVersion>`. Chỉ Owner; trả **200 với `{employee,message,...}`**, không phải204.
- Dùng `response.employee.rowVersion` cho lần lưu tiếp theo, giữ nguyên chuỗi version. Encode query đúng một lần; không decode/biến version thành thời gian.
- Version sai định dạng: MSG01. Version cũ khi vẫn còn link: MSG06. Nếu đã không có link, có thể trả200 no-op mà không sinh version mới.
- Bỏ liên kết chỉ xóa quan hệ Employee–Account; không khóa/xóa tài khoản, thu hồi quyền hoặc logout người đó.

Web đã có UI/service/mock giữ bản nháp và version sau unlink. **Chưa có employee wire schema, DTO mapper hoặc HTTP/BFF adapter hoàn chỉnh.** Đây là phần có thể triển khai tiếp độc lập với API đang tắt.

Có hai điểm cần xử lý trước khi nối form:

1. `EmployeeView` thật có `workingZones`, `bankAccount`, `employmentEndDate` và nhiều field nullable. `EmployeeService.UpdateAsync` tính các vùng cần xóa/thêm từ danh sách gửi lên; `Apply` gán lại thông tin ngân hàng. Vì vậy, đây không phải PATCH chỉ sửa một ô. Mapper bỏ sót trường có thể xóa dữ liệu hoặc bị validation từ chối. Cần đọc đầy đủ hồ sơ và giữ các trường chưa chỉnh; nếu không biểu diễn được an toàn thì chưa mở lưu thật. Việc đổi vùng/ngân hàng hoặc thêm UI cho nghiệp vụ chưa rõ phải hỏi riêng.
2. `LinkedAccountView` không có SĐT, trong khi model mock đang có `phone` bắt buộc. Không lấy SĐT của nhân viên hoặc bịa chuỗi để lấp chỗ trống; phải điều chỉnh read-model/nullability hoặc tách dữ liệu theo đúng nguồn. Tạo/nghỉ việc/khôi phục cũng có request riêng; không ép mọi thao tác vào PUT hồ sơ.

## 4. Thay đổi auth, push và upload

PR15 chưa thay hình dạng request/response chính của login, refresh và hồ sơ. Không cần viết lại schema auth chỉ vì có PR mới. Hồ sơ PUT vẫn thực trả envelope `{profile,message}` dù Swagger annotation còn ghi ProfileView.

Khôi phục Owner nay có CLI `seed --reset-owner-password`: dùng cấu hình bootstrap, đặt mật khẩu tạm có hạn và yêu cầu đổi, thu hồi phiên cũ. Đây là công cụ quản trị hệ thống, **không phải lý do thêm nút reset Owner trên SCR-09**. Chưa chạy lệnh này.

Push device được gắn `LoginSessionId`; logout chấm dứt khả năng nhận push của phiên tương ứng. Đổi mật khẩu giữ thiết bị hiện hành theo phiên mới và thu hồi các phiên khác. Cần migration `AddPushDeviceLoginSession` trong DB được chọn trước khi thử runtime mới; chỉ pull source không cập nhật DB. Mobile đang tạm dừng nên chưa ghép đăng ký thiết bị.

Upload quá lớn được filter xử lý thành **400 MSG01 kèm field** trong các tình huống filter nhận diện; không mặc định luôn là413. Body quá lớn vượt khả năng đọc bỏ có thể bị ngắt kết nối. Khi làm upload Web, test cả lỗi field và lỗi mạng, không giả định mọi lần đều có JSON.

## 5. Giờ Việt Nam, dữ liệu demo và dashboard

[BusinessTimeJsonConverter](https://github.com/thaideptrai218/omts-backend/blob/953f5977f880d5ea7916d6e91482a0d0a5b2a95a/src/OMTS.Api/Common/BusinessTimeJsonConverter.cs) hiểu thời điểm không có offset là UTC+7; chuỗi có `Z` hoặc offset rõ giữ ý nghĩa đó. Ví dụ `08:00+07:00` cùng thời điểm với `01:00Z`. Khi làm đo nước, phải tránh lấy giờ nhập địa phương rồi gắn thêm `Z`, hoặc đổi UTC xong lại cộng bảy giờ. DateOnly và token-expiry có offset là các trường khác; không nới schema auth theo quy tắc của ô nhập đo nước.

Job nhắc quá hạn đo nước có catch-up lúc khởi động sau mốc06:00 giờ Việt Nam. **Đây không phải job tổng hợp KPI thu/chi dashboard.** Có API biểu đồ đo nước theo vùng; chưa thấy endpoint tổng quan HTX đủ thu/chi, sản lượng và các KPI Web đã đề xuất. Không tự coi cron ENV là lời giải cho dashboard.

Demo seed có Owner/Staff/Trader, vùng/bè/nhân viên và dữ liệu đầu vào; PR17 bổ sung60 số đo nước trong30 ngày cho hai vùng. Như vậy backend **có cơ chế tạo dữ liệu mẫu**, nhưng chưa chứng minh DB local/QA hiện đã có dữ liệu đó. Tên HTX/người dùng trong demo khác fixture Web là khác bộ dữ liệu mẫu, không phải yêu cầu đổi tên cá nhân thành tên HTX.

Compose seed dùng `seed --bootstrap --demo`, có thể chạy migration và tạo nhiều dữ liệu hơn quyết định “chỉ bootstrap Owner”. API Docker mặc định lắng nghe8080 trên mọi interface; các dev inbox cho phép truy cập không đăng nhập trong Development. Vì vậy không tự chạy Compose seed hoặc đưa inbox lên LAN. Nếu cần test thật, tách bước chọn DB thử riêng và giới hạn loopback; chưa sửa firewall/certificate/trust store.

## 6. Các điểm vẫn phải chờ hoặc đối chiếu

| Điểm | Source mới vẫn thể hiện | Hướng xử lý Web |
| --- | --- | --- |
| Refresh | Chỉ nhận refreshToken; token rotation và xử lý reuse, chưa có retry/idempotency | Giữ refresh thật tắt theo quyết định đã chốt |
| MSG06 | [RowVersionGuard](https://github.com/thaideptrai218/omts-backend/blob/953f5977f880d5ea7916d6e91482a0d0a5b2a95a/src/OMTS.Application/Common/Concurrency/RowVersionGuard.cs) chỉ có `currentRowVersion` trong details, thiếu user/time riêng | Chờ backend; không tách tên/giờ từ câu tiếng Anh, không tự dùng câu dự phòng |
| Vai trò cố định | [DefaultRoles](https://github.com/thaideptrai218/omts-backend/blob/953f5977f880d5ea7916d6e91482a0d0a5b2a95a/src/OMTS.Application/Features/Authorization/DefaultRoles.cs) chỉ có Quản lý vùng/Kế toán; API còn Create/Copy/đổi tên | Giữ quyết định ba vai trò của Duy Thái; cần BA/backend đồng bộ, không bật adapter role live |
| Staff xác minh | BuildTokens và account gate vẫn kiểm điện thoại | Chưa khớp frontend email **hoặc** điện thoại; không tự chuyển sang phone-only |
| Catalog thông báo | Staff backend có Orders/Work/DeadlineReminders/WaterAlerts; fixture Web hiện không có Orders | Đề xuất BA/backend xác nhận nhóm theo actor/quyền trước khi map; chưa tự thêm mục trên UI |
| Kênh thông báo | Backend có khóa InApp/Push bắt buộc và trạng thái eligible; Web chưa biểu diễn giống toàn bộ quy tắc | Cần đối chiếu payload và chính sách, không chỉ copy các boolean mock |
| Thông báo lưu tùy chọn | Response có `notice` dạng câu tiếng Anh, không phải mã MSG22 riêng | Không parse câu để suy code; chốt trường phân biệt khi viết adapter |
| MSG69 | Vẫn còn trao đổi BA về thời hạn xác minh | Không đổi thời hạn khóa đăng nhập hoặc toàn catalog thành một giờ |

Đây không phải các quyết định mới cần người dùng chọn lại ngay: vai trò, email OR phone, MSG06 và refresh đã có quyết định. Phần cần nhóm làm là sửa/đồng bộ contract theo quyết định hoặc phản hồi rõ điểm không thể đáp ứng. Catalog/kênh thông báo là mục cần xác nhận thêm trước khi nối API tùy chọn thông báo.

## 7. CI mới nhất chưa xanh

[CI develop953f597, run40461433077](https://github.com/thaideptrai218/omts-backend/actions/runs/40461433077): Docker image thành công; build .NET không có lỗi; bước test thất bại. Domain2 và Application129 test đạt. API integration795 đạt, **1 lỗi**, không skip. [Secret scan40461433113](https://github.com/thaideptrai218/omts-backend/actions/runs/40461433113) thành công. CI của commit liền trước `c2e29bd` thành công; không dùng kết quả đó thay cho commit953.

Lệnh CI gây lỗi là bước `dotnet test`. Lỗi:

```text
StaffAccountTests.Duplicates_and_missing_rows_are_refused
StaffAccountTests.cs:82
Expected: MSG03
Actual:   MSG01
```

MSG03 ở đây là kỳ vọng từ chối username trùng; MSG01 cho biết request bị kiểm tra là không hợp lệ trước đó. Khác biệt này không chứng minh code kiểm tra trùng đã hỏng, và không phải lỗi tải SDK.

**Giả thuyết có bằng chứng từ source, chưa tái hiện đầu vào CI:** test tạo tài khoản có sẵn bằng `AddAccountAsync(NewCode(), ...)`; `NewCode()` lấy10 ký tự đầu GUID dạng hex nên có thể toàn chữ số. [UsernameGenerator](https://github.com/thaideptrai218/omts-backend/blob/953f5977f880d5ea7916d6e91482a0d0a5b2a95a/src/OMTS.Application/Features/Accounts/UsernameGenerator.cs) yêu cầu ít nhất một chữ cái. Factory chèn trực tiếp dữ liệu test; request POST thật lại kiểm định dạng trước khi tìm trùng. Vì vậy có khả năng request trả MSG01 trước khi đến nhánh MSG03. Log CI không ghi username gây lỗi, nên chưa kết luận đây là nguyên nhân duy nhất.

Đề xuất backend-dev: dùng username fixture chắc chắn hợp lệ, chẳng hạn thêm tiền tố chữ trước `NewCode()` ở setup này; giữ test username toàn số là không hợp lệ riêng. Sau đó chạy lại test đích và toàn integration suite. Không sửa validation thật hoặc mapper MSG01 của Web chỉ để test xanh. Chưa sửa backend hoặc chạy .NET/DB trong lượt audit; chưa có bằng chứng sau khắc phục.

## 8. Micro-plan tiếp theo

Giữ API/refresh tắt. Đây là đề xuất thứ tự chuẩn bị, không đánh dấu các mục dưới là đã triển khai:

1. **EMP-API-01a — Chốt snapshot dữ liệu bằng schema thuần.** Bám `953f597`: tách list/detail/save envelope, nullable bank/account/phone, DateOnly và opaque version. Test trường thiết yếu thiếu/sai kiểu, danh sách rỗng, nullable và field bổ sung. Không gọi HTTP.
2. **EMP-API-01b — Mapper và bảo toàn dữ liệu form.** Đối chiếu model mock với detail thật; không bịa SĐT tài khoản liên kết. Test sửa một trường vẫn giữ ngân hàng/vùng/thông tin khác; unlink xong vẫn giữ draft nhưng sử dụng version server mới. Nếu cần đổi luồng hoặc trường nghiệp vụ thì hỏi trước.
3. **EMP-API-02 — Request serialization.** Test PUT null/thiếu không mang nghĩa unlink; DELETE encode version một lần và parse200 envelope. Không fallback endpoint cũ, không tự retry mutation; chưa mount route live.
4. **Chuẩn bị runtime riêng.** Nhóm backend xử lý CI và các lệch contract; xác nhận DB/seed được phép dùng. Source `omts-backend` mới không đồng nghĩa bản runtime `omts-backend-local` hoặc QA đã mới. Chưa chạy seed và chưa cần tạo Staff khi nhóm chưa cung cấp.
5. **Sau các điều kiện đó mới nối lát thật qua BFF.** Hoàn thiện login/session/read/logout theo plan W3–W7 và G1 trước; refresh vẫn chờ hỗ trợ đã yêu cầu. Employee mutation chỉ bật khi xử lý MSG06 và kiểm được Owner/phiên/version trên runtime đã chọn. Không kéo toàn bộ FARM/ENV/INP vào cùng lượt.

## 9. Tự review và giới hạn bằng chứng

Đã phân biệt merge PR, checkout local, CI và DB đang chạy; không dùng mô tả “848 test pass” trong PR17 thay kết quả CI mới. Đã đọc controller/service/DTO/test thay vì chỉ tin Swagger hoặc tên commit. Báo cáo cũ giữ để tra lịch sử, các điều kiện “PR16 chưa merge” được ghi rõ là đã thay đổi.

Lượt này không sửa application code và không chạy lại npm suite/.NET suite. Số test Web trong báo cáo P7 là bằng chứng của lượt P7, không phải kết quả mới của audit backend. `git diff --check` đạt; kiểm258 liên kết Markdown nội bộ trong các tài liệu liên quan, không có link hỏng; báo cáo mới không có trailing whitespace; bài học102 được Git ignore. Kiểm lại backend chính sạch tại953f597, bản runtime riêng sạch tại48ae1e0. Chưa kiểm chứng runtime953, migration, seed, health, dữ liệu QA hoặc endpoint bằng request thật.
