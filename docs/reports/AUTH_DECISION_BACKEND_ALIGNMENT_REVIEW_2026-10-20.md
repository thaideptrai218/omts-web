# OMTS — Review quyết định Auth/Onboarding với SRS, Jira và Backend

> Ngày review: 20/10/2026 (Asia/Saigon)
>
> Phạm vi: chỉ đọc và đối chiếu. Báo cáo này không sửa backend, frontend, SRS hoặc trạng thái Jira.
>
> Theo yêu cầu của Duy Thái, các điểm khác baseline chỉ được chuyển thành **đề xuất để BA/PM và Backend review**. Agent không tự cập nhật SRS hoặc Jira và không coi đề xuất là yêu cầu đã duyệt.
>
> Bổ sung ngày 20/10/2026: hướng đề xuất đã đổi từ “bỏ username” sang “giữ username nhưng Backend tự sinh từ họ tên nhân viên”; điều kiện contact được đề xuất là verified email **hoặc** verified phone. Đây vẫn là đầu vào chờ BA/PM và Backend xác nhận.

## 1. Kết luận ngắn

Bộ `DEC-AUTH-01` đến `DEC-AUTH-08` ban đầu đề xuất bỏ username. Hướng mới giữ username để tương thích Account hiện tại, nhưng Owner chỉ nhập họ tên nhân viên và Backend tự sinh username unique; Staff đổi mật khẩu và xác minh ít nhất một contact trước khi vào nghiệp vụ.

Tuy nhiên, bộ quyết định **chưa đủ để triển khai an toàn** và **chưa đồng bộ với nguồn chuẩn hiện hành**. Hiện có ba lớp sự thật khác nhau:

1. SRS và Jira vẫn yêu cầu username, số điện thoại bắt buộc cho Staff/Trader và mật khẩu tạm 24 giờ.
2. Backend commit ngày 19/10/2026 hiện thực đúng baseline SRS/Jira đó.
3. Đề xuất cập nhật giữ username tự sinh, xác minh ít nhất một contact, cân nhắc mật khẩu tạm 72 giờ và onboarding session riêng.

Vì vậy, không nên sửa frontend theo bộ DEC-AUTH ngay. Trước hết cần gửi một bản đề xuất rõ luồng cho BA/PM và Backend review. Việc có cập nhật SRS/Jira hay không, ai cập nhật và cập nhật khi nào thuộc trách nhiệm của người có thẩm quyền; không nằm trong phạm vi tự thực hiện của frontend agent.

## 2. Nguồn đã kiểm tra

- `D:\Đồ_án\nghiệp_vụ\01-tong-hop-quyet-dinh-va-de-xuat-auth.md`.
- `D:\Đồ_án\nghiệp_vụ\03-cau-hoi-quyet-dinh-nghiep-vu-cho-ba-pm.md`.
- `D:\Đồ_án\Report3Finnal.md`, đặc biệt E02 Account, UC02, UC04, UC05, UC08, UC11, BR-31, BR-32, BR-34, NFR-01, SCR-03, SCR-05 và SCR-09.
- Jira `OMTS-126`, `OMTS-127`, `OMTS-132`, `OMTS-159`, `OMTS-167`, `OMTS-188`, `OMTS-190` tại thời điểm review.
- Backend repository `thaideptrai218/omts-backend`:
  - `4e0b385` — Authentication core;
  - `14d7839` — Zone-scoped authorization và account-state gates;
  - nhánh refactor `feature/persistence-auth`, có cùng baseline nghiệp vụ.

Lưu ý quan trọng: `develop` của backend hiện mới ở scaffold `c84e710`. Auth/authz đang nằm trên các feature branch; chưa có bằng chứng chúng đã merge vào `develop`.

## 3. Ma trận đối chiếu quyết định

| Chủ đề | Bộ DEC-AUTH ngày 20/10 | SRS/Jira hiện hành | Backend commit | Đánh giá |
| --- | --- | --- | --- | --- |
| Login identifier | Giữ username; username do Backend tự sinh từ họ tên; verified email/phone có thể dùng sau | Username, verified phone hoặc verified email | Query theo username, verified phone, verified email | Tương thích hơn, cần thêm contract sinh/bàn giao username |
| First activation | Username tự sinh + mật khẩu tạm bắt đầu onboarding | Staff dùng username + temporary password; sau đó verify phone | Có thể tìm account bằng username | Phần đăng nhập tương thích; contact gate còn khác |
| Dữ liệu Owner nhập | Họ tên, ít nhất email hoặc phone, access rows; không nhập username thủ công | Display name, username, phone bắt buộc, access rows | Model bắt buộc username; phone có unique index | Cần Backend sinh username và BA duyệt phone/email |
| Điều kiện contact | Verify ít nhất email hoặc phone | Staff/Trader bắt buộc verified phone theo BR-34 | Gate kiểm tra `PhoneVerifiedAt` | Mâu thuẫn nghiệp vụ lớn |
| Mật khẩu tạm | Random, gửi trực tiếp, 72 giờ | 10 ký tự, hiển thị một lần cho operator, không gửi, 24 giờ | `TemporaryPasswordLifetime = 24h` | Mâu thuẫn trực tiếp |
| Trình tự gate | Một trang; đổi mật khẩu trước, verify một contact sau | Đổi mật khẩu tạm trước, rồi verify phone | Gate ưu tiên password trước phone | Trình tự tương thích; điều kiện contact còn khác |
| Login response | `nextAction` + checklist `onboarding` | Jira mô tả forced change hoặc phone gate | Hai boolean `MustChangePassword` và `PhoneVerificationRequired` | Contract khác nhau |
| Session onboarding | Token giới hạn 30 phút | NFR-01 access token 15 phút; chưa có session onboarding | Session chuẩn + access/refresh token chuẩn | Chưa có mô hình/contract |
| Account lifecycle | `PENDING_ACTIVATION` / `ONBOARDING_REQUIRED` / `ACTIVE` | Account chỉ có Active và Locked; các gate là điều kiện dẫn xuất | Chỉ có Active và Locked | Chưa quyết định persisted hay derived |

## 4. Những điểm tốt có thể giữ lại

### 4.1 Backend là nơi quyết định trạng thái nghiệp vụ

Ý tưởng dùng `nextAction` cùng checklist là tốt vì Web và Mobile không phải tự suy diễn rule từ role hay từ nhiều field rời rạc. Frontend chỉ ánh xạ một trạng thái nghiệp vụ sang route phù hợp với nền tảng.

### 4.2 Onboarding token không được có quyền nghiệp vụ

Ranh giới này đúng về bảo mật. Chỉ ẩn menu ở frontend không đủ; backend phải từ chối mọi API nghiệp vụ khi onboarding chưa hoàn tất.

### 4.3 Mật khẩu tạm riêng cho từng account

Không dùng một mật khẩu mặc định chung là quyết định đúng. Password phải được hash, không ghi log/audit và việc cấp lại phải vô hiệu hóa credential cũ.

### 4.4 Tách `fullName` khỏi login identifier

Tên hiển thị không nên là khóa đăng nhập và không cần unique. `accountId` mới là định danh nội bộ bất biến.

## 5. Các mâu thuẫn nội bộ trong chính bộ DEC-AUTH

### 5.1 “Mật khẩu tạm chỉ dùng một lần” nhưng lại cho đăng nhập lại

DEC-AUTH-05 gọi mật khẩu tạm là một lần, trong khi DEC-AUTH-08 cho phép đăng nhập lại bằng mật khẩu tạm nếu onboarding token hết hạn và người dùng chưa đổi mật khẩu. Hai câu này mô tả hai cơ chế khác nhau.

Cần chốt “một lần” có nghĩa là:

- chỉ có một temporary credential đang còn hiệu lực; hoặc
- credential bị vô hiệu ngay sau lần đăng nhập thành công đầu tiên.

Nếu chọn nghĩa thứ hai thì phải có cơ chế resume onboarding khác khi token hết hạn.

### 5.2 Đã đổi password nhưng contact vẫn chưa verified thì đăng nhập lại bằng gì?

DEC-AUTH-01 chỉ cho contact chưa verified đăng nhập khi đi cùng **mật khẩu tạm**. DEC-AUTH-08 lại nói người dùng đã đổi password có thể đăng nhập lại bằng **mật khẩu mới** để tiếp tục onboarding.

Sau khi đổi password, account vẫn chưa hoàn tất onboarding nhưng không còn temporary password. Theo câu chữ DEC-AUTH-01, contact chưa verified lúc này không được dùng để login, nên người dùng bị kẹt.

Rule phải được viết lại thành ngoại lệ cho account đang onboarding dùng contact đã được Owner khai báo cùng **credential hiện hành**, không chỉ riêng temporary password; hoặc hệ thống phải buộc verify contact trước khi đổi password.

**Đã được hướng đề xuất mới xử lý:** Staff đăng nhập lại bằng username tự sinh cùng mật khẩu hiện hành. Contact chưa verified không còn được dùng làm activation identifier, nên không cần ngoại lệ tìm Account bằng contact chưa verified.

### 5.3 Thứ tự checklist trong đề xuất cũ

SRS, Jira `OMTS-127` và backend đều buộc đổi mật khẩu trước rồi mới verify phone. Nếu muốn ba phần độc lập trên một trang, backend không thể dùng gate nối tiếp hiện tại; nó cần permission scope dành cho từng onboarding operation và checklist được cập nhật sau mỗi mutation.

**Đã được hướng đề xuất mới xử lý:** vẫn dùng một trang để người dùng nhìn được tiến độ, nhưng bắt buộc đổi mật khẩu trước rồi mới mở thao tác xác minh contact. Phần còn cần BA xác nhận là “verified email hoặc phone” thay vì bắt buộc phone.

### 5.4 Hai tên trạng thái nhưng chưa rõ bản chất

`PENDING_ACTIVATION` và `ONBOARDING_REQUIRED` đang được dùng gần như account status, nhưng chưa rõ chúng là:

- status lưu trong bảng Account;
- session type;
- hay trạng thái dẫn xuất từ `mustChangePassword`, profile và contact verification.

Nếu thêm status lưu trữ, phải xác định transition với Locked, reset password, hết hạn và hoàn tất onboarding. Nếu là trạng thái dẫn xuất, không nên ghi chúng như status độc lập.

### 5.5 Phạm vi actor chưa đầy đủ

Tài liệu tập trung vào Staff nhưng backend contract phục vụ cả System Administrator, Cooperative Owner, Staff và Trader. Chưa có ma trận rõ cho:

- Cooperative Owner lần đầu còn phải hoàn tất hồ sơ HTX ở UC09;
- Trader đăng ký qua UC01 và liên kết customer profile bằng phone;
- System Administrator có cần onboarding hay không;
- Account hiện hữu giữ username cũ; cơ chế tự sinh chỉ áp dụng cho Account mới.

### 5.6 Nguồn của `fullName` chưa rõ

OMTS tách `Employee.FullName` và `Account.DisplayName`. Tài liệu mới yêu cầu Staff tự nhập tên trong onboarding nhưng chưa quyết định:

- copy từ Employee sang Account;
- Staff chỉ sửa Account display name;
- hay thay đổi luôn hồ sơ Employee.

Không được để màn onboarding vô tình sửa dữ liệu nhân sự do Cooperative Owner quản lý trong UC10.

**Đã được hướng đề xuất mới làm rõ:** Owner nhập `Employee.FullName`; Backend khởi tạo `Account.DisplayName` và sinh `Account.Username`. Staff không nhập lại hoặc sửa `Employee.FullName` trong onboarding.

## 6. Những xác nhận còn thiếu trước khi chốt contract

### Nhóm A — Bộ rule Duy Thái đã chọn, BA/PM cần phê duyệt

1. Bộ DEC-AUTH có chính thức thay SRS hiện tại không, và người nào có thẩm quyền phê duyệt revision.
2. Luồng chỉ áp dụng cho Staff do Cooperative Owner tạo; Trader và actor khác được review riêng.
3. Staff chỉ cần verified email hoặc verified phone.
4. Owner phải gán ít nhất một AccessGrant trước khi Account được tạo.
5. Owner nhập `Employee.FullName`; Backend khởi tạo `Account.DisplayName`, tự sinh username và không tự đổi username khi họ tên thay đổi.
6. Username/mật khẩu tạm được gửi trực tiếp cho Staff; Owner xem/copy username nhưng không thấy password.
7. Mật khẩu tạm hết hạn sau 72 giờ; cấp lại làm credential/session cũ mất hiệu lực.
8. Một trang onboarding nhưng bắt đổi mật khẩu trước, xác minh contact sau.
9. Staff không tự sửa contact trong onboarding; Owner sửa và challenge cũ bị hủy.
10. Mất toàn bộ AccessGrant thì không được nhận application session.

### Nhóm B — Backend/Security phải chốt contract

1. Lifecycle chính xác: persisted account status hay derived onboarding state.
2. Quy tắc normalize email và phone; phone nhận local VN, E.164 hay cả hai.
3. Unique constraint cho contact từ lúc Owner khai báo, tránh hai Account tranh chấp cùng contact khi xác minh.
4. `nextAction` enum, checklist schema, versioning và endpoint bootstrap lại trạng thái sau reload.
5. Session type (`ONBOARDING`/`APPLICATION`), access-token TTL, refresh policy và cơ chế nâng cấp session khi hoàn tất.
6. Web dùng HttpOnly cookie hay trả refresh token trong JSON; Mobile dùng bearer/secure storage như thế nào.
7. Mutation nào rotate token, mutation nào revoke toàn bộ session và cách chống request đồng thời.
8. Hoàn tất onboarding phải atomic ra sao để không có trạng thái checklist đủ nhưng application token chưa cấp, hoặc ngược lại.
9. Rate limit, audit và generic error cho login/activation/resend mà không làm lộ account.
10. Thuật toán sinh username cho Account mới, xử lý collision bằng unique constraint và giữ nguyên username của Account hiện có.

## 7. Đánh giá backend commit hiện tại

### 7.1 Phần đang làm tốt theo baseline SRS/Jira cũ

- Password dùng salted one-way hash.
- Wrong identifier và wrong password trả cùng `MSG12` ở mức response.
- Có temporary lock sau 5 lần sai trong 15 phút.
- Access token 15 phút; refresh/session lifetime theo Web và Mobile.
- Refresh token được hash, rotate và phát hiện replay.
- Logout revoke server session; access token cũ bị kiểm tra lại session.
- Permission được tính từ nhiều zone-role grant và có test Zone A không mở Zone B.
- Gate password change và verified phone nằm ở backend, không chỉ ở menu frontend.

### 7.2 Khoảng trống so với DEC-AUTH mới

- Không có `PENDING_ACTIVATION`, checklist onboarding hoặc session type.
- Không login bằng contact chưa verified.
- Vẫn bắt buộc username ở entity, migration, index, JWT claim, test và `/api/me`.
- Mật khẩu tạm vẫn 24 giờ.
- Gate vẫn bắt buộc phone cho Staff/Trader.
- Response chỉ có hai boolean; không có `nextAction`.
- Chưa có API onboarding profile, contact verification, completion hoặc session upgrade.

### 7.3 Rủi ro kỹ thuật nên xử lý dù giữ baseline cũ

- `ClientType` do client gửi trong login request; Web client có thể tự khai là Mobile để nhận refresh/session lifetime dài hơn. Backend nên suy ra hoặc kiểm soát client type ở server.
- Unknown identifier trả về trước khi chạy password hash, trong khi wrong password chạy thuật toán hash tốn thời gian. Dù message giống nhau, khác biệt timing có thể hỗ trợ account enumeration; nên chạy dummy hash cho trường hợp không tìm thấy account.
- Chưa có normalization rõ trước query/unique index cho email và phone.
- Filtered unique index của email chỉ áp dụng khi verified. Cách này không dùng được nếu unverified email trở thành login identifier cho activation.
- Refresh token hiện trả trong JSON. Đây chưa phải bằng chứng rằng Web có contract an toàn với HttpOnly cookie.
- `OMTS-126` yêu cầu revoke-all khi password change/reset, nhưng các endpoint đó chưa có trên branch auth core; ticket vẫn `In Progress`, phù hợp với thực tế chưa hoàn thành.
- Các auth/authz commit chưa nằm trên `develop`; không nên xem code feature branch là QA baseline đã tích hợp.

## 8. Bằng chứng kiểm thử

Lệnh chạy tại commit `14d7839`:

```text
dotnet test OMTS.sln --no-restore
```

Không chạy được trên máy local vì repository khóa SDK `8.0.418` trong `global.json`, còn máy chỉ có SDK `10.0.103`:

```text
A compatible .NET SDK was not found.
Requested SDK version: 8.0.418
Installed SDKs: 10.0.103
```

Đây là lỗi môi trường, chưa phải lỗi code. Không được ghi “test pass local”. Bằng chứng thay thế hiện có là GitHub Actions `build-test` pass trên PR #3 và PR #4; tuy nhiên các auth/authz branch riêng chưa có PR tương ứng trong danh sách đã đọc.

## 9. Khuyến nghị quyết định

### Nếu ưu tiên hoàn thành Sprint nhanh và ít rủi ro

Giữ baseline SRS/Jira hiện tại: username cho internal account, phone bắt buộc cho Staff/Trader, password tạm 24 giờ, đổi password trước rồi verify phone. Frontend chỉ map đúng backend contract hiện hành sau khi branch được merge và QA API sẵn sàng.

### Nếu ưu tiên UX mới với username tự sinh

Có thể giữ username để giảm mức thay đổi ở entity, JWT và login. Tuy nhiên, việc tự sinh username và cho phép verified email **hoặc** phone vẫn là thay đổi nghiệp vụ/contract. Trước khi code cần:

1. sửa các mâu thuẫn nội bộ nêu ở mục 5;
2. chốt các decision gate ở mục 6;
3. cập nhật toàn bộ SRS/Jira liên quan;
4. thiết kế migration và OpenAPI;
5. backend triển khai và test contract trước khi frontend thay form Owner nhập username bằng kết quả username tự sinh.

Khuyến nghị của review: **không trộn hai baseline**. Hoặc giữ trọn baseline cũ cho Sprint 6, hoặc phê duyệt một revision mới và cập nhật đồng bộ. Không nên để frontend dùng UX mới trong khi backend và Jira vẫn dùng username/phone gate cũ.

