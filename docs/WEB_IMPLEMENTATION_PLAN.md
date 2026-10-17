# OMTS Web — kế hoạch triển khai theo từng màn hình

> Cập nhật: 15/10/2026 (Asia/Saigon)
>
> Phạm vi: các hạng mục Web đang giao cho D DT trên Jira
>
> Trạng thái: kế hoạch triển khai; chưa dùng tài liệu này làm bằng chứng rằng ticket đã hoàn thành

## 1. Mục tiêu của cách làm mới

Nhóm cần nhìn thấy các màn hình sớm để rà soát UI/UX. Vì vậy, mỗi Jira item sẽ được triển khai thành một lát dọc nhỏ: giao diện nhìn được, tương tác bằng mock, các trạng thái lỗi, kiểm tra responsive, rồi mới nối QA API khi contract đã sẵn sàng.

Mỗi màn có hai mốc riêng:

1. **UI ready:** màn chạy được bằng mock adapter, có trạng thái chính, dùng được ở 360 px và 1024 px, không vi phạm nghiệp vụ đã biết.
2. **Jira ready:** toàn bộ `Scope` và `Done when` của ticket đạt, gồm QA API nếu ticket yêu cầu, kiểm tra chất lượng xanh và có evidence.

Một màn đạt UI ready chưa tự động được chuyển Jira sang Done. Khi Jira ready, trạng thái ticket mới được cập nhật. Không tạo bảng hoặc nội dung quản lý mới trên Jira chỉ để phản ánh kế hoạch này.

## 2. Nguồn dùng để quyết định

Thứ tự ưu tiên khi có chênh lệch:

1. Jira hiện tại: phạm vi, dependency và `Done when`.
2. `Report3Finnal.md` và bản SRS DOCX: actor, use case, business rule, message và trường dữ liệu.
3. `Report2Finnal.md`: nền tảng kỹ thuật Next.js.
4. Figma OMTS: tư liệu wireframe tùy chọn để đối chiếu inventory/luồng khi cần; không phải template hình thức, không phải điều kiện bắt buộc trước khi code và không thay đổi nghiệp vụ trong SRS.
5. Code hiện tại: bằng chứng những gì đã triển khai, không phải nguồn để tự tạo nghiệp vụ mới.

Snapshot Jira ngày 14/10/2026 cho thấy D DT có 14 hạng mục Web: `OMTS-132` đang In Progress và 13 hạng mục còn lại đang To Do. Các mô tả ticket được đọc trực tiếp từ Jira trước khi lập kế hoạch này.

## 3. Nguyên tắc thực thi

### 3.1 Làm theo màn hình nhưng giữ ranh giới kiến trúc

Page và component chỉ hiển thị dữ liệu và phát sinh sự kiện người dùng. Chúng không đọc thẳng `localStorage` và không gọi HTTP trực tiếp.

```text
Page / Component
      ↓ gọi
Use-case service hoặc repository contract
      ↓ được thay thế bởi
Mock adapter             HTTP adapter
```

Mock adapter giúp hoàn thiện và review màn hình khi backend chưa chốt. HTTP adapter sẽ thay mock mà không buộc viết lại UI.

### 3.2 Trạng thái phải có trên mỗi màn

Không phải màn nào cũng cần toàn bộ trạng thái, nhưng phải rà soát các trạng thái có liên quan:

- initial loading: skeleton khi đang tải nội dung lần đầu;
- empty: chưa có dữ liệu;
- field validation: chỉ rõ trường và cách sửa;
- submitting: khóa thao tác trùng và hiển thị tiến trình tại nút/form;
- success: thông báo kết quả và cập nhật dữ liệu nhìn thấy;
- service error: giữ dữ liệu người dùng đã nhập nếu an toàn;
- forbidden: không có quyền hoặc không có scope vùng;
- conflict: dữ liệu đã bị người khác cập nhật;
- offline: chỉ dùng hành vi đã được SRS xác nhận;
- session expired: xóa trạng thái được bảo vệ và đưa về đăng nhập.

Skeleton chỉ dùng cho tải dữ liệu ban đầu. Khi lưu form, nút lưu chuyển sang pending/disabled thay vì thay toàn màn bằng skeleton.

### 3.3 Cách lưu bài học để đọc sau

Mỗi màn hình có một bài local trong `docs/learning/`. Thư mục này được `.gitignore`, không xuất hiện trong pull request của nhóm. Bài học được viết theo code thật vừa hoàn thành, gồm:

1. vấn đề màn hình giải quyết;
2. khái niệm nền từ đầu;
3. component và file trong OMTS;
4. luồng dữ liệu và luồng điều khiển;
5. lỗi thực tế, nguyên nhân gốc, cách chẩn đoán và cách sửa;
6. bằng chứng kiểm tra;
7. câu hỏi hội đồng và câu trả lời ngắn.

Trong lúc code, người học không bị yêu cầu trả lời kiến thức chưa được giải thích. Các câu hỏi bảo vệ được gom trong bài để đọc lại sau.

Chi tiết bố cục, responsive behavior, component breakdown và micro-step của từng trang nằm trong `docs/UI_PAGE_BLUEPRINTS.md`.

### 3.4 Git và Jira

- Tiếp tục `OMTS-132` trên branch hiện tại `feature/OMTS-132-web-foundation` và PR hiện tại.
- Sau khi foundation được review/merge, mỗi Jira màn hình dùng một branch/PR; toàn bộ micro-task của màn đó ở cùng branch.
- Chỉ giữ một branch triển khai chính đang hoạt động tại một thời điểm để giảm xung đột.
- Không commit sau từng thay đổi rất nhỏ. Commit khi một lát code có ý nghĩa và đã kiểm tra được.
- Chỉ chuyển ticket Jira khi checklist Jira ready của ticket đã đạt; không tick theo cảm giác hoặc theo việc page đã render.

### 3.5 Giới hạn phạm vi mỗi lượt làm việc

Kế hoạch này là bản đồ của toàn bộ phần Web, không phải phạm vi của một lần code.

- Mỗi lượt chỉ thực hiện **một micro-task đang active**.
- Không tự động chuyển sang micro-task tiếp theo trong cùng lượt sau khi vừa sửa một phần có rủi ro.
- Micro-task hiện tại phải được đọc lại code, chạy kiểm tra phù hợp và ghi phần kiến thức liên quan trước khi chuyển bước.
- Nếu phát hiện lỗi, ưu tiên hiểu nguyên nhân và sửa trong đúng phạm vi đang làm; không vừa sửa lỗi vừa mở thêm màn hình khác.
- Một màn hình được chia thành layout, component, state, mock interaction, accessibility và API integration. Các phần này được làm lần lượt khi màn đủ phức tạp.
- Commit có thể gom vài micro-task đã ổn định, nhưng việc gom commit không có nghĩa các micro-task được code cùng một lúc.

Micro-task kế tiếp luôn được đánh dấu trong plan. Sau khi hoàn thành, chỉ mục đó được tick và mục kế tiếp mới trở thành active.

## 4. Thứ tự triển khai đã chốt

Thứ tự dưới đây ưu tiên dependency kỹ thuật và tạo sớm một luồng đăng nhập hoàn chỉnh.

### Chặng A — nền tảng để các màn dùng chung

#### A1. OMTS-132 — Web foundation

Đã có:

- Next.js App Router + TypeScript + Tailwind;
- route group `(public)` và `(auth)`;
- root layout tiếng Việt;
- route `/login` dạng placeholder;
- lint, typecheck và build đã chạy thành công ở phiên bản hiện tại.

Còn phải làm:

- [x] **A1.1:** tạo semantic design tokens, typography, focus ring và nền trang; chưa làm form hoặc auth logic.
- [x] **A1.2:** tạo responsive AuthShell theo blueprint; chỉ layout và branding.
- [x] **A1.3:** thêm React Hook Form + Zod và component button/form field tối thiểu dùng cho auth.
- [x] **A1.4:** tạo message catalog tối thiểu và formatter `{code, params}`.
- [x] **A1.5:** tạo service/repository contract cùng mock adapter; component không gọi storage trực tiếp.
- [x] **A1.6:** tạo route group `(app)`, application shell và trang mẫu được bảo vệ.
- [x] **A1.7:** thêm auth state phía frontend cho trang mẫu.
- [x] **A1.8:** menu mẫu ẩn/hiện theo effective permission và scope.
- [x] **A1.9:** API client boundary và xử lý 401 cuối cùng thành MSG19.
- [x] **A1.10:** dialog, toast và confirm nền theo nhu cầu đã xuất hiện trong các bước trước.
- [x] **A1.11:** kiểm tra bàn phím, focus, 360 px, 1024 px, lint, typecheck, build và test liên quan.

**Kết quả Chặng A:** foundation đã đạt mốc UI ready bằng mock. `OMTS-132` chưa được coi là Jira ready vì QA API, session/refresh contract và payload `/me/permissions` vẫn chưa được backend xác nhận.

**Code review ngày 15/10/2026:** các lệnh kiểm tra vẫn xanh nhưng chưa nên merge cho đến khi xử lý các finding trong `docs/learning/16-phase-a-code-review.md`.

- [x] **A-R1:** bảo toàn mọi dạng `HeadersInit`; chuẩn hóa lỗi mạng/JSON tại API boundary; giữ nguyên `AbortError`; bổ sung test hồi quy.
- [x] **A-R2:** xử lý lỗi login tại UI và ngăn session bootstrap cũ ghi đè thao tác auth mới hơn.
- [x] **A-R3:** sửa animation/token CSS và accessibility của form/toast.
- [ ] **A-R4 (chờ xác nhận):** chốt composition boundary để mock auth không thể được dùng âm thầm ở QA/production.

Finding mock auth hard-wire vẫn là release blocker. A-R4 cần xác nhận cơ chế môi trường và HTTP adapter trước khi áp dụng vì liên quan auth/deployment contract.

Verification tổng hợp sau A-R1–A-R3: 4 test files với 19/19 test đạt; lint, typecheck, production build, `git diff --check` và production dependency audit đều đạt.

Phần refresh token, cookie, `/me/permissions` và session bootstrap sẽ đi qua interface trước. HTTP adapter chỉ được chốt sau khi backend cung cấp contract. Đây là điểm còn hoãn, không cản việc dựng UI bằng mock nhưng có thể cản mốc Jira ready.

### Chặng B — luồng xác thực cốt lõi

#### B1. OMTS-150 — SCR-02, component xác minh dùng chung

Đây là component dùng lại trong đăng ký, đăng nhập lần đầu, khôi phục và đổi thông tin liên hệ. Nó không được nhân bản thành bốn form OTP khác nhau.

- [x] **B1.1:** đối chiếu Jira/SRS; tạo domain model trung lập cho sáu purpose, email/SMS, người nhận đã mask, challenge, token và policy UC08.
- [x] **B1.2:** dựng dialog/sheet shell và chỉ hiển thị người nhận đã mask; chưa thêm logic gửi hoặc xác minh.
- [x] **B1.3:** tạo ô nhập đúng 6 chữ số, hỗ trợ paste, bàn phím và vùng thông báo lỗi dùng cho MSG01.
- [x] **B1.4:** countdown gửi lại 60 giây, hạn 5 phút và số lượt gửi còn lại; thời gian được suy ra từ timestamp thay vì đếm trừ cục bộ.
- [x] **B1.5a:** tạo domain result, repository và service contract cho `start/resend/verify`.
- [x] **B1.5b:** tạo mock adapter có thời gian điều khiển được; mã mới hủy mã cũ, lỗi gửi không làm mất challenge hiện tại.
- [x] **B1.6:** nối state đúng/sai/hết hạn/quá số lần/lỗi dịch vụ với MSG04, MSG16 và `onVerified(token)`; caller sở hữu challenge và initial-send policy.
- [x] **B1.7:** dùng harness tạm để kiểm chứng cùng component được cấu hình lại cho UC01, UC02, UC03 và UC05, không nhân bản form OTP; harness đã bị xóa khỏi product source sau QA.
- [x] **B1.8:** kiểm tra keyboard, focus, reduced motion, 360 px, 1024 px, test/lint/typecheck/build.
- [ ] **B1.9 (deferred — chờ backend):** nối `start/resend/verify` với QA API sau khi backend contract sẵn sàng; chỉ khi đó mới xét Jira Done.

Figma OTP chỉ được mở khi cần làm rõ inventory/luồng; visual được thiết kế lại theo usability. B1.1 dùng purpose từ `OMTS-149`, nhưng HTTP adapter sau này vẫn phải map theo OpenAPI thật thay vì coi chuỗi domain là tên field API.

**Kết quả B1:** SCR-02 đã đạt UI ready bằng mock. B1.8 xác nhận 35/35 test, lint, typecheck, production build và `git diff --check` đều đạt; harness tạm từng xác nhận 360 px/1024 px và focus trap rồi đã được xóa khỏi product source. B1.9 được hoãn vì `OMTS-149`/QA API chưa sẵn sàng, nên `OMTS-150` chưa được coi là Jira ready.

#### B2. OMTS-159 — SCR-03, đăng nhập và post-login gate

Quyết định `WEB-AUTH-01` đã chốt phương án B: identifier là username, số điện thoại đã xác minh hoặc email đã xác minh. Staff đăng nhập lần đầu bằng username và temporary password.

- [x] **B2.1:** đối chiếu Jira `OMTS-159`, SRS UC02/SCR-03 và quyết định `WEB-AUTH-01`; Figma node `2:43` chỉ là tham khảo tùy chọn.
- [x] **B2.2:** bổ sung message catalog và mô hình kết quả đăng nhập trung lập cho bốn kết quả: từ chối, buộc đổi mật khẩu tạm, buộc xác minh điện thoại, hoặc được vào ứng dụng; chưa gắn tên field/route/token của backend.
- [ ] **B2.3:** hoàn thiện form đăng nhập theo hai lát nhỏ:
  - [x] **B2.3a:** helper identifier và hiện/ẩn password dùng được bằng bàn phím, không lưu password;
  - [ ] **B2.3b (deferred — chờ destination):** thêm link UC03 khi route `/recover` có page đích và lối truy xuất QR khi route UC40/SCR-24 được xác nhận; không tạo link dẫn tới 404 hoặc tự đặt URL.
- [x] **B2.4:** mock account được chia để không bật một demo gate chưa có UI:
  - [x] **B2.4a:** repository factory trả đủ MSG12/13/68/69, password gate, phone gate và access granted; mỗi scenario có test và gate không tạo session;
  - [x] **B2.4b (superseded):** không hiển thị credential/hướng dẫn mock trong product UI theo quy tắc giao diện chính thức; scenario chỉ được giữ trong mock/test và tài liệu local khi cần review.
- [ ] **B2.5:** điều phối gate đúng thứ tự mà không tự quyết auth/backend contract:
  - [x] **B2.5a:** thay trạng thái im lặng bằng gate landing panel; password/phone gate giữ anonymous state, không mở application shell, chuyển focus vào tiêu đề và cho phép quay lại đăng nhập;
  - [ ] **B2.5b (deferred — dependency):** nối forced password UI của `OMTS-167`; sau khi đổi thành công, backend quyết định còn phone gate hay được vào ứng dụng;
  - [ ] **B2.5c (deferred — dependency):** nhập/xác nhận số điện thoại, kiểm tra unique và dùng SCR-02 cho OTP theo `OMTS-158`/`OMTS-149`; không hard-code recipient/challenge vào login DTO.
- [x] **B2.6:** sau khi qua mọi gate, mở home và menu theo effective permission; không suy diễn quyền từ tên role.
- [x] **B2.7:** kiểm thử domain, component, keyboard/focus và responsive ở 360 px/1024 px; chạy lint, typecheck và build.
- [ ] **B2.8 (deferred — chờ backend):** map HTTP DTO và kiểm tra các gate bằng QA test account trước khi chuyển Jira Done.

Tên field response, thời điểm phát token và route đích thuộc `WEB-AUTH-02`, vẫn chờ backend. Frontend sẽ biểu diễn kết quả bằng kiểu domain trung lập, không coi tên field mock là API chính thức.

**Kết quả B2.1:** Jira và SCR-03 cùng yêu cầu identifier là username, verified phone hoặc verified email; quyết định `WEB-AUTH-01` giữ cách hiểu chặt này dù câu chữ ở UC02 Normal Flow còn thiếu từ “verified” trước phone. UC02 xác nhận thứ tự gate là temporary-password change (nhánh 2c) rồi mới phone verification (nhánh 3a). Tài khoản bị khóa/không còn zone–role hợp lệ, temporary password quá 24 giờ và khóa tạm 15 phút đều không được tạo/open session nghiệp vụ. Contract `WEB-AUTH-02` vẫn hoãn, nên B2.2 chỉ tạo mô hình domain của frontend, không tự quyết DTO, token timing hoặc URL đích.

**Kết quả B2.2:** `LoginResult` là discriminated union với `rejected`, `password-change-required`, `phone-verification-required` và `access-granted`. Chỉ `access-granted` mang authenticated session và được phép ghi vào auth state; hai gate không chứa session/token vì `WEB-AUTH-02` chưa chốt thời điểm phát thông tin này. Catalog đã có MSG13/67/68/69 và test khóa ý nghĩa copy hiện tại. Baseline tăng lên 9 test files, 43/43 tests; lint, typecheck, production build và `git diff --check` đạt ngày 16/10/2026. UI hiển thị gate vẫn thuộc B2.5; trước đó mock B2.4 không được bật gate cho luồng review chính.

**Kết quả B2.4a:** mock auth được chuyển thành repository factory có state cô lập và latency cấu hình được. Ba identifier đã xác minh (username/phone/email) đi tới `access-granted`; các scenario riêng trả MSG13/68/69, password gate và phone gate; identifier hoặc password sai luôn trả MSG12 chung. Gate/rejection không tạo session. Có 11 test mới; hướng dẫn credential chưa render trên UI cho tới khi B2.5 có màn đích.

**Kết quả B2.5a:** hai gate không còn làm form đứng im sau submit. UI chuyển sang panel bảo mật tương ứng, giữ URL `/login`, không mở dashboard và tự focus heading mới; người dùng có thể quay lại để dùng tài khoản khác. Bước này cố ý chưa có nút vượt gate: SRS yêu cầu UC02 nhập/xác nhận phone trước khi gọi UC08, còn Jira/backend chưa cung cấp recipient/challenge hay contract hoàn tất đổi mật khẩu. Baseline là 58/58 tests; lint, typecheck và production build đạt ngày 16/10/2026.

**Kết quả B2.6–B2.7:** nhánh `access-granted` mở `/dashboard`; application shell chỉ render navigation item khi effective permission cho phép. Product UI không còn khối hướng dẫn credential mock. Browser QA xác nhận login → dashboard → logout; full regression đạt 17 files, 91/91 tests cùng lint, typecheck, build và `git diff --check`. Dashboard foundation copy dành cho developer được thay bằng welcome state cho người dùng, không bịa dữ liệu tổng hợp khi chưa có contract.

#### B3. OMTS-167 — SCR-05 Security, đổi mật khẩu

- [x] **B3.1:** mô hình password policy, schema new password + confirmation và mode thường/forced; chưa quyết định API/session.
- [ ] **B3.2:** dựng form đổi mật khẩu theo các lát kiểm tra được:
  - [x] **B3.2a:** current-password form dùng chung cho standard/forced context, live rule checklist, field error/focus và pending state; không giữ showcase/panel chú thích trong product source;
  - [ ] **B3.2b (deferred — WEB-AUTH-02):** gắn forced form vào post-login gate và kiểm tra 360 px/1024 px trong hành trình thật sau khi contract session/next gate được xác nhận; không tạo submit thành công giả.
- [ ] **B3.3 (deferred — chờ recipient/challenge contract):** thêm lựa chọn chứng minh bằng email code và tái sử dụng SCR-02; không tạo luồng gửi mã nếu chưa biết email đã xác minh của account được cung cấp thế nào.
- [ ] **B3.4:** nối message và mock outcomes theo các lát nhỏ:
  - [x] **B3.4a:** thêm MSG17/MSG18, domain result, repository/service contract và mock đổi mật khẩu bằng mật khẩu hiện tại; mock kiểm tra session, password policy và chỉ giữ password trong memory;
  - [x] **B3.4b1:** nối typed result vào form; lỗi evidence/policy được đặt đúng field, còn success/session-expired đi qua callback cấp luồng và password được xóa khỏi form memory;
  - [ ] **B3.4b2 (deferred — WEB-AUTH-02, kết hợp B3.2b):** compose service với forced form trong post-login gate thật và xử lý bước tiếp theo sau success theo contract session/gate đã xác nhận.
- [ ] **B3.5 (deferred — chờ backend):** xử lý session sau đổi/reset theo contract đã xác nhận và kiểm tra QA API gồm forced mode trước Jira Done.

**Kết quả B3.1:** policy dùng chung giữ đúng SRS: ít nhất 8 ký tự, có chữ cái và chữ số; không tự thêm uppercase hoặc ký tự đặc biệt. Phép đếm dùng Unicode code point để emoji không bị tính thành hai ký tự; chữ tiếng Việt được nhận bằng Unicode letter. Schema không trim password, đặt mismatch vào `confirmPassword` và không tạo nhiều lỗi rule gây nhiễu khi field rỗng. Hai mode `standard`/`forced` mới là domain context, chưa quyết định cách chứng minh hoặc session. Baseline tăng lên 12 test files, 71/71 tests; lint, typecheck và production build đạt ngày 16/10/2026.

**Kết quả B3.2a:** form current-password dùng cùng component cho forced/standard mode, nhưng đổi label và hướng dẫn theo context. Ba password field có hiện/ẩn, autocomplete phù hợp, error focus và rule checklist đọc từ B3.1. Một harness tạm từng được dùng để xác nhận empty/mismatch focus, checklist live, pending button, reset theo context và AX redaction; sau review, harness cùng panel chú thích đã bị xóa khỏi source. Component chỉ được mount trong luồng production thật ở B3.2b. Baseline là 73/73 tests; lint, typecheck và production build đạt ngày 16/10/2026.

**Kết quả B3.4a:** tầng đổi mật khẩu bằng current password đã có domain result, repository interface, service và mock adapter độc lập với component. `confirmPassword` dừng ở UI; repository chỉ nhận current/new password. Mock ưu tiên kiểm tra session, ánh xạ MSG17/MSG18/MSG19, kiểm tra lại policy ở data boundary, cập nhật password trong memory sau success và không trả password trong result. Nhánh email-code vẫn hoãn vì chưa có account recipient/challenge contract; không có route hoặc màn showcase mới.

**Kết quả B3.4b1:** `ChangePasswordForm` gọi một function theo service contract, không biết mock/HTTP. Presenter thuần ánh xạ từng typed result: MSG17 vào `currentPassword`, MSG01 vào `newPassword`, MSG19 sang `onSessionExpired` và MSG18 sang `onChanged`. Domain union liên kết từng rejection reason với đúng message code để TypeScript bắt adapter trả sai cặp. Form reset password trước flow-level callback. Việc mount forced flow vẫn hoãn vì hành vi session/gate sau success thuộc `WEB-AUTH-02`.

#### B4. OMTS-179 — UC07, logout và dọn dữ liệu bảo vệ

Đây là hành vi xuyên ứng dụng, không phải một page độc lập.

- [x] **B4.1:** thêm logout action vào desktop sidebar/mobile drawer; xóa auth state local trước remote logout, chặn protected children khi loading/anonymous, về SCR-03 và xác nhận Back/direct `/dashboard` không hiển thị protected data;
- [x] **B4.2:** tạo protected-cache cleanup registry và gọi cùng local auth cleanup; hiện repo chưa có query cache nên không hard-code một thư viện cache giả;
- [x] **B4.3:** nối final 401/MSG19 vào cùng cleanup + redirect flow;
- [ ] **B4.4 (deferred — chờ contract):** khi logout mất mạng, lưu yêu cầu server-session invalidation để retry khi online theo UC07/MSG07;
- [ ] **B4.5 (deferred — chờ backend):** nối QA API và kiểm tra token/cookie/server session trước Jira Done.

**Kết quả B4.1:** logout đi qua `AuthProvider → AuthService → AuthRepository`. Provider dùng local-first cleanup: protected state bị chuyển anonymous trước khi chờ remote invalidation. `AppSessionShell` không render children khi loading/anonymous; trong lúc request logout còn chạy chỉ hiện trạng thái chuyển trang, sau đó `replace('/login')`. Browser QA xác nhận desktop, mobile drawer 360 px, Back và truy cập trực tiếp `/dashboard` sau logout không hiển thị dashboard. Next.js dev báo Instant Navigation Insight vì client auth guard cố ý không render page segment khi session chưa được xác định; production build vẫn đạt. Không tắt insight bằng `instant = false`, vì server-side protection vẫn là release blocker thật cần xử lý khi session contract được chốt.

**Kết quả B4.2:** registry dọn protected cache nhận cleanup theo key, chặn đăng ký trùng, hỗ trợ unregister và chạy best-effort toàn bộ cleanup thay vì dừng ở lỗi đầu tiên. Logout gọi registry sau khi auth state thành anonymous và trước remote invalidation. Chưa đăng ký cache giả hoặc phụ thuộc query library khi repo chưa có cache nghiệp vụ thật.

**Kết quả B4.3:** API client phát sự kiện MSG19 khi nhận final 401 nhưng vẫn reject `ApiError`. `AuthProvider` chỉ xử lý sự kiện khi trạng thái hiện tại là authenticated, vô hiệu hóa operation đang chạy, chuyển anonymous, gọi cùng protected-cache registry và hiển thị toast MSG19. `AppSessionShell` quan sát anonymous state để dừng render protected children và replace về `/login`. Nhiều 401 đồng thời không xử lý lặp vì status ref được đổi đồng bộ ở lần đầu.

**Trạng thái đóng phạm vi khả thi của Chặng B:** các micro-task không phụ thuộc contract backend đã hoàn thành và được kiểm tra. Các mục còn mở đều ghi rõ `deferred` vì cần destination route, `WEB-AUTH-02`, phone/email challenge, offline invalidation hoặc QA session contract. Không mục deferred nào được tự suy đoán hoặc đánh dấu hoàn thành; các Jira item liên quan chưa đủ điều kiện Done.

### Chặng C — hoàn thiện các màn tài khoản

#### C1. OMTS-154 — SCR-01, đăng ký Trader

- [x] **C1.1:** đọc Jira/SRS và mô hình hai phương thức `email | phone`; ánh xạ tường minh sang kênh UC08 `email | sms`, không đoán kênh từ chuỗi identifier;
- [ ] **C1.2:** tạo schema theo hai lát để không tự chốt phone contract:
  - [x] **C1.2a:** chuyển password policy thành rule dùng chung; schema kiểm tra email/password/confirmation và bắt buộc nhận phone validator từ bên ngoài;
  - [ ] **C1.2b (deferred — chờ phone contract):** nối validator production sau khi nhóm chốt số nội địa, E.164 hoặc cả hai và quy tắc normalize;
- [ ] **C1.3:** dựng route và lựa chọn phương thức theo hai lát:
  - [x] **C1.3a:** tạo native radio group dạng segmented cards cho email/phone, hỗ trợ focus, disabled và layout 1→2 cột;
  - [ ] **C1.3b (deferred cùng C1.2b):** compose form và route `/register` sau khi có phone validator production; không đưa họ tên/ngày sinh/giới tính từ wireframe cũ vào baseline;
- [ ] **C1.4:** xây data boundary theo các lát:
  - [x] **C1.4a:** typed start/complete contract và service/repository boundary; start chỉ trả challenge hoặc MSG14/MSG04, complete bắt buộc nhận verification token;
  - [x] **C1.4b:** mock adapter phối hợp với shared verification service, bao phủ accepted, duplicate race, delivery failure và invalid token mà không lưu/log password;
- [ ] **C1.5:** tái sử dụng SCR-02 với purpose `registration`, recipient đã mask và channel từ C1.1;
- [ ] **C1.6:** dùng verification token để hoàn tất đăng ký, hiển thị success rồi quay về SCR-03; không tự đoán HTTP DTO hoặc token lifetime;
- [ ] **C1.7:** thêm link login/recovery trong MSG14 và link đăng ký từ login khi mọi destination đã tồn tại;
- [ ] **C1.8:** kiểm tra keyboard/focus, 360 px, 1024 px, test/lint/typecheck/build;
- [ ] **C1.9 (deferred — chờ backend):** map QA API và chỉ xét Jira Done khi normal/error flow đạt với API thật.

**Kết quả C1.1:** Jira `OMTS-154` và story `OMTS-137` xác nhận Trader chọn một trong hai phương thức email/phone; account chỉ được tạo sau UC08 và không nhận internal permission. Domain dùng union đóng `email | phone` và ánh xạ `phone` sang channel kỹ thuật `sms`; component sau này không tự suy đoán kênh từ nội dung người dùng nhập. SRS chưa xác định số điện thoại dùng định dạng nội địa hay E.164 nên C1.2 không được tự chốt regex.

**Kết quả C1.2a:** password policy được chuyển về `shared/security` để đăng ký và đổi mật khẩu cùng dùng một nguồn. Registration schema kiểm tra email bằng parser chuẩn, password theo SRS và confirmation tại đúng field. Nhánh phone không có regex mặc định: schema factory bắt buộc caller truyền `isValidPhoneNumber`, nên composition production không thể âm thầm bỏ qua quyết định C1.2b.

**Kết quả C1.3a:** lựa chọn email/phone dùng hai native radio cùng `name`, đặt trong `fieldset/legend`; giao diện card chỉ là lớp trình bày. Component controlled không tự chọn mặc định, không đoán channel và có thể khóa cả nhóm trong mutation pending. Chưa mount route hoặc tạo submit giả khi C1.2b còn mở.

**Kết quả C1.4a:** registration boundary tách hai operation `start` và `complete`. `start` không thể trả account/session, chỉ trả verification challenge hoặc typed MSG14/MSG04. `complete` bắt buộc có short-lived verification token cùng draft và mới có thể trả `registered`; MSG14 vẫn được giữ ở complete để xử lý race khi identifier vừa được đăng ký ở phiên khác. HTTP endpoint, reload behavior và token lifetime vẫn là decision pending, không được mã hóa vào contract frontend.

**Kết quả C1.4b:** mock registration và shared mock verification được compose qua một environment dùng chung. Proof chỉ được ghi nhận sau khi OTP đúng, bị ràng buộc với purpose/channel/identifier và bị tiêu thụ đúng một lần; UI không parse chuỗi token mock. Adapter bao phủ đăng ký thành công, identifier đã tồn tại từ đầu, duplicate race tại complete, lỗi gửi mã, proof giả và proof không khớp. Password chỉ đi qua input trong memory, không nằm trong challenge, token registry, identifier set hoặc callback mô phỏng conflict. Mock chưa áp TTL riêng cho proof, chưa normalize identifier và chưa định nghĩa HTTP endpoint vì đây vẫn là contract chờ backend/nhóm xác nhận.

#### C2. OMTS-163 — SCR-04, khôi phục tài khoản

- [x] **C2.1:** đọc `OMTS-163`, story `OMTS-139`, backend sibling `OMTS-162`, QA sibling `OMTS-165`, shared verification `OMTS-150` và SRS UC03/SCR-04/BR-31; khóa invariant chống account enumeration;
- [x] **C2.2:** tạo schema theo hai lát:
  - [x] **C2.2a:** identifier bắt buộc, email dùng parser chuẩn; phone không áp regex/normalization chưa được SRS xác nhận và sẽ do API kiểm tra khi tích hợp;
  - [x] **C2.2b:** new password + confirmation dùng shared password policy, không yêu cầu current password;
- [x] **C2.3:** định nghĩa recovery start/reset contract; start luôn có public outcome MSG15 không tiết lộ existing/unverified/locked/delivery-failed, reset cần recovery proof;
- [x] **C2.4:** dựng route `/recover` và step shell “Thông tin → Xác minh → Mật khẩu mới”; mỗi thời điểm chỉ có một nhiệm vụ chính;
- [x] **C2.5:** nhập identifier và luôn hiển thị MSG15; UI không suy ra eligibility từ response, timing hoặc trạng thái nút;
- [x] **C2.6:** tái sử dụng SCR-02 purpose `recovery`; chỉ mở bước mật khẩu khi có proof thành công;
- [x] **C2.7:** “Đổi cách nhận mã” quay lại nhập verified identifier khác và yêu cầu hủy request cũ; không liệt kê hoặc gợi ý liên hệ của account;
- [x] **C2.8:** đặt new password + confirmation; MSG01 giữ recovery proof khi proof còn hiệu lực, reset thành công quay về login;
- [x] **C2.9:** nối link “Quên mật khẩu” từ login sau khi `/recover` tồn tại; kiểm tra keyboard/focus, 360 px, 1024 px, test/lint/typecheck/build;
- [ ] **C2.10 (deferred — chờ backend):** map QA API và chỉ xét Jira Done khi response/timing không phân biệt existing, non-existing, unverified, locked và delivery failure.

**Kết quả C2.1:** Jira và SRS xác nhận UC03 dành cho Trader, Cooperative Owner và Staff đang anonymous; mã chỉ gửi tới đúng verified identifier người dùng nhập. MSG15 phải giống nhau cả khi account không tồn tại, identifier chưa verified, account bị khóa hoặc delivery lỗi. “Đổi cách nhận mã” nghĩa là người dùng tự nhập identifier khác và request cũ bị hủy, không phải backend trả danh sách contact để chọn. Contract còn thiếu cách backend trả public recovery handle/challenge mà vẫn cho UI hiển thị cùng bước/cooldown không làm lộ eligibility; frontend chưa tự đặt DTO, timing hoặc success copy. Phone syntax vẫn dùng quyết định chung đang deferred ở C1.2b.

**Kết quả C2.2b:** validation `newPassword + confirmPassword` được tách thành primitive dùng chung tại `shared/security`, còn recovery có schema mang tên theo use case và không chứa `currentPassword`. Account-security tiếp tục dùng cùng primitive nên rule 8 Unicode code points + letter + ASCII digit và field error không bị nhân bản. Password không trim/transform; confirmation chỉ tồn tại ở form validation, chưa đi vào recovery service contract.

**Kết quả C2.3:** account-recovery boundary có hai operation `start` và `resetPassword`. `start` chỉ có một public outcome `verification-pending` chứa MSG15 và challenge bị khóa purpose `recovery`; type không có accountExists/verified/locked/delivery status. `resetPassword` chỉ nhận opaque verification token và new password, phân biệt typed MSG16 invalid proof với MSG01 invalid password; confirmation không qua service boundary. Đây là frontend domain contract, không phải giả định URL/HTTP DTO. API adapter chỉ được tích hợp khi backend cung cấp public challenge/handle không làm lộ eligibility và timing.

**Kết quả C2.4–C2.5:** `/recover` dùng stepper tuyến tính có semantic `nav/ol` và `aria-current="step"`; các bước không clickable nên không thể bỏ qua OTP. Form cho phép người dùng chủ động chọn email hoặc SMS, chỉ hiển thị contact đã mask từ chính định danh vừa nhập và luôn chuyển sang cùng MSG15. Email được kiểm tra cú pháp; phone chỉ bắt buộc có giá trị vì SRS chưa chốt dạng nội địa/E.164.

**Kết quả C2.6–C2.7:** logic OTP được tách thành `VerificationForm` và dùng lại ở dialog SCR-02 lẫn recovery page. Boundary xác minh có operation `cancel`; mock xóa request cũ trước khi flow quay lại bước nhập định danh. Nút đổi phương thức có pending state để chống thao tác lặp, không hiển thị danh sách contact của account.

**Kết quả C2.8–C2.9:** proof chỉ tồn tại trong React memory, không vào URL/localStorage. Password confirmation dừng ở form; service chỉ nhận proof + new password. Mock kiểm tra password trước khi consume proof, vì vậy MSG01 cho phép sửa lại mật khẩu mà không nhập OTP lần nữa; proof bị consume một lần khi reset thành công. `/login` đã có link khôi phục và success quay về login bằng `replace`. UI được kiểm tra tại 360/1024 px, keyboard semantics, focus, 128/128 tests, lint, typecheck và build. C2 đạt UI-ready bằng mock; C2.10/Jira Done vẫn chờ QA API và phone contract chính thức.

#### C3. OMTS-171 — SCR-05 Profile

- [x] **C3.1:** đọc `OMTS-171`, story `OMTS-141`, backend `OMTS-170`, mobile `OMTS-172`, QA `OMTS-173` và SRS UC05/UC08/SCR-05/BR-31–34; khóa state model và ranh giới proof/version;
- [x] **C3.2:** định nghĩa profile domain, schema và typed load/start-verification/save outcomes; bổ sung message catalog cần thiết;
- [x] **C3.3:** dựng mock profile environment dùng chung proof registry với SCR-02; bao phủ success, duplicate/current identifier, delivery failure, stale record version, session expired và MSG57;
- [x] **C3.4:** tạo route `/account`, loading skeleton, read-only username/role-scope và editable display name/email/phone;
- [x] **C3.5:** nối email/phone candidate với shared SCR-02; giá trị cũ còn hiệu lực cho đến khi proof và save đều thành công;
- [ ] **C3.6:** nối save, MSG10, conflict/reload và session expiry; kiểm tra keyboard/focus, 360 px, 1024 px, test/lint/typecheck/build;
- [ ] **C3.7 (deferred — chờ backend):** map QA API và chỉ xét Jira Done khi contract/version/proof cùng toàn bộ acceptance criteria chạy qua QA.

**Kết quả C3.1:** profile là màn authenticated dùng cho System Administrator, Cooperative Owner, Staff và Trader. Display name đi thẳng vào draft; email/phone mới là candidate cần proof UC08 gắn đúng purpose/channel/value và chỉ thay giá trị cũ sau save. Username cùng role/scope là read-only presentation; role text không thay effective-permission boundary. Save mang record version để phát hiện concurrent edit. Phone syntax, HTTP DTO và việc proof có được tái sử dụng sau conflict reload vẫn chưa được SRS/backend xác nhận nên chưa được tự mã hóa.

**Kết quả C3.2:** frontend domain contract biểu diễn current contact, verification state, record version và role/scope summary. Save input không chứa username/roles và chỉ chấp nhận email/phone change dưới dạng `{ value, token }`. Candidate schema kiểm tra required/different/current/email syntax; phone syntax được inject để chờ contract chính thức. Load/start/save dùng discriminated unions cho MSG01/04/06/10/16/19/57/62. Repository/service chưa phụ thuộc HTTP DTO. Targeted tests, typecheck và lint đều xanh sau khi sửa một lỗi TypeScript inference trong message test.

**Kết quả C3.3:** mock environment compose profile và shared verification qua proof registry dùng chung. Proof phải khớp purpose/channel/value, chỉ bị consume sau khi toàn bộ precondition của save đã qua và không thể dùng lại sau save thành công. Mock bao phủ duplicate/current identifier, delivery failure, invalid proof, atomic multi-change validation, stale version/MSG06, session expiry/MSG19 và optional MSG57. Recipient masking được tách thành shared verification utility để registration, recovery và profile nhất quán. Sáu test files với 21 tests, typecheck và lint đều xanh.

**Kết quả C3.4–C3.5:** route `/account` nằm trong authenticated app layout, có navigation/header entry, route-level loading fallback, service skeleton và retry. Username cùng role/scope là read-only; display name là validated form field; email/phone dùng candidate dialog rồi shared SCR-02. OTP success chỉ tạo `{value, token}` trong memory và current contact vẫn hiển thị cho đến khi save thành công. Save cập nhật profile/version, consume proof, phát MSG10 và đồng bộ display name lên header. Browser review đã đi qua email happy path, sửa focus candidate dialog, xác nhận 360/1024 px không overflow. C3.6 chưa hoàn thành vì behavior giữ/hủy proof sau MSG06 + reload cần Duy Thái xác nhận.

#### C4. OMTS-175 — SCR-06, tùy chọn thông báo

- [x] **C4.1:** đọc `OMTS-175`, story `OMTS-142`, backend sibling `OMTS-174`, mobile sibling `OMTS-176`, BA dependency `OMTS-124` và SRS UC06/SCR-06/MSG21–23; khóa phần đã xác nhận và catalog blocker;
- [x] **C4.2:** định nghĩa data-driven domain/repository/service contract cho notification type × channel; bổ sung MSG21/22/23 và không hard-code catalog trong component;
- [x] **C4.3:** tạo mock repository factory nhận catalog fixture từ ngoài; bao phủ editable save, mandatory lock, ineligible channel, push-denied partial save và session expiry;
- [ ] **C4.4 (blocked — chờ quyết định catalog):** chốt catalog type × eligible channel từ `OMTS-124`, bao gồm xung đột SMS trong BA task với bốn channel của SCR-06;
- [ ] **C4.5:** dựng route `/account/notifications`, loading/error/empty state và matrix responsive: table ở desktop, card theo notification type ở màn hẹp;
- [ ] **C4.6:** hiển thị mandatory item locked, channel không đủ điều kiện disabled kèm lý do nhìn thấy; nối save, MSG10/21/22/23 và MSG19;
- [ ] **C4.7:** kiểm tra label/focus cho từng checkbox, keyboard, 360 px, 1024 px, test/lint/typecheck/build;
- [ ] **C4.8 (deferred — chờ backend):** map QA API và chỉ xét Jira Done khi catalog/eligibility cùng normal/error flow chạy qua API thật.

**Kết quả C4.1:** UC06 áp dụng cho System Administrator, Cooperative Owner, Staff và Trader; việc lưu preference không tạo notification mới và không thay đổi permission. Ba notification bắt buộc đã được xác nhận là water alert, new order và QR sent. Eligibility do hệ thống cung cấp: email cần contact phù hợp, Zalo cần cấu hình/đủ điều kiện, push cần device permission; push bị từ chối vẫn phải lưu các channel hợp lệ khác. Catalog đầy đủ chưa phải nguồn đã duyệt vì `OMTS-124` còn To Do. BA task liệt kê thêm SMS trong eligible channels trong khi SCR-06 chỉ nêu in-app/push/email/Zalo, nên Web không tự thêm hoặc loại SMS.

**Kết quả C4.2:** contract không đóng enum notification type/channel theo dữ liệu chưa chốt. Load trả channel presentation và từng cell với trạng thái enabled/editable; cell locked bắt buộc mang MSG21, MSG22 hoặc MSG23 làm lý do. Save chỉ gửi các selection và nhận typed saved/invalid/session-expired outcome. UI tương lai render dữ liệu từ service thay vì suy đoán eligibility. MSG21/22/23 đã có frontend copy và test.

**Kết quả C4.3:** mock repository không chứa production catalog mặc định; caller phải truyền fixture, do đó test data không bị hiểu nhầm là quyết định BA. Mock preflight toàn bộ selection trước mutation, giữ mandatory cell bật, chặn MSG21/MSG23, bỏ qua push denied nhưng vẫn áp dụng cell hợp lệ và trả warning MSG22. Duplicate/unknown cell được coi là lỗi contract của caller thay vì chuyển thành message nghiệp vụ không có trong SRS. Targeted tests, typecheck, lint và diff check đều xanh sau khi tách MSG22/MSG23 thành hai discriminated-union member riêng.

### Chặng D — màn hình quản trị và Cooperative

Thứ tự màn quản trị bám luồng AC-01: khởi tạo HTX → hoàn thiện hồ sơ → định nghĩa role → tạo account/access grants → liên kết hồ sơ nhân viên.

#### D1. OMTS-196 — SCR-56, SysAdmin khởi tạo HTX

- [x] **D1.1:** đọc `OMTS-196`, story `OMTS-148`, backend `OMTS-195`, QA `OMTS-197` và SRS UC72/SCR-56/BR-33/MSG03/MSG55; khóa actor boundary, postcondition và các field còn mâu thuẫn;
- [x] **D1.2:** bổ sung MSG03/MSG55 và component one-time Owner credential; secret chỉ ở React memory, có copy/fallback, không thể đóng vô ý và bị hủy sau acknowledge;
- [x] **D1.3:** tạo evidence image picker có drag/drop, preview, remove, duplicate guard và validation được inject; không tự đặt file type/size contract;
- [x] **D1.4:** giữ nguyên ba nhóm input của SCR-56: tên HTX + mã sơ bộ bắt buộc, identity/contact Owner là một text field bắt buộc và ít nhất một ảnh xác minh; không tự chia Owner thành các field chưa được chốt;
- [x] **D1.5:** tạo form schema + repository/service/mock với typed outcomes; frontend chỉ xác nhận MIME `image/*`, chưa đặt size/count hay HTTP upload DTO trước backend contract;
- [x] **D1.6:** dựng route `/system/cooperatives/new`, review/confirm flow, loading/error/success và chỉ hiện cho effective permission khởi tạo HTX;
- [x] **D1.7:** nối one-time credential response, MSG01/03/55/session expiry; kiểm tra keyboard/focus, 360 px, 1024 px, test/lint/typecheck/build;
- [ ] **D1.8 (deferred — chờ backend):** map QA API và chỉ xét Jira Done sau khi provisioning/audit boundary chạy với API thật.

**Kết quả D1.1:** UC72 là one-time platform-administration flow chỉ dành cho System Administrator. Thành công tạo Cooperative ở Preliminary và first Cooperative Owner account ở Active, phát mật khẩu tạm 10 ký tự hiển thị một lần/hiệu lực 24 giờ, ghi audit và không tự tạo zone, customer, order hoặc employee permission. BR-33 không cho SysAdmin dùng màn này để sửa profile hay business data của HTX. SRS ghi `preliminary code` và identity/contact là dữ liệu bắt buộc; D1.4 vì vậy giữ `preliminaryCode` cùng một trường text `ownerIdentityContact` trong form, nhưng không tự tách identity/contact thành họ tên, giấy tờ, điện thoại hoặc email. Tên field QA DTO và cấu trúc chi tiết vẫn để mở đến bước tích hợp backend.

**Kết quả D1.2:** MSG03/MSG55 đã có frontend copy và test. `OneTimeOwnerCredentialDialog` nhận account identifier cùng temporary password từ parent, không sinh credential ở browser, không ghi storage/log và chỉ đóng qua hành động acknowledge rõ ràng. Clipboard failure có hướng dẫn copy thủ công; nút copy nhận initial focus. Lỗi TS2322 do shared Button chưa expose ref được sửa bằng focus marker đã có sẵn của Dialog thay vì mở rộng shared API ngoài phạm vi.

**Kết quả D1.3:** evidence picker là controlled component nhận `File[]`, validator và callback. Nó hỗ trợ file chooser/drag-drop, preview, remove, chống chọn trùng và hiển thị lỗi theo file. Preview dùng object URL và revoke khi component unmount; `next/image` chạy `unoptimized` cho blob local để không gửi giấy tờ qua image optimizer. MIME/size/count không được hard-code vì Jira/backend chưa có contract.

**Kết quả D1.4:** form dùng đúng mức chi tiết của SCR-56. `cooperativeName` và `preliminaryCode` là hai text field bắt buộc; `ownerIdentityContact` giữ nguyên là một vùng text thay vì tự sáng tác họ tên/CCCD/điện thoại/email thành các trường có validation riêng. Ít nhất một ảnh là bắt buộc vì UC72 xác nhận căn cứ bằng ảnh tài liệu. Scope Jira được hiểu là bản tóm tắt; API integration vẫn phải xác nhận backend có nhận `preliminaryCode`.

**Kết quả D1.5:** domain kết quả là discriminated union gồm `provisioned`, `duplicate-owner`, `verification-failed`, `invalid-input` và `session-expired`. Service chuẩn hóa khoảng trắng nhưng giữ nguyên `File` object; repository mock revalidate input, mô phỏng one-time provisioning và không ghi secret ra storage/log. Policy hiện chỉ chấp nhận MIME ảnh; giới hạn dung lượng, số ảnh và multipart DTO được chuyển sang D1.8 vì backend chưa công bố contract.

**Kết quả D1.6:** route production `/system/cooperatives/new` có hai bước nhập → xác nhận, layout responsive, hướng dẫn bàn giao ngắn và không có development showcase. Menu chỉ hiện cho `platform.cooperative.provision`; mock `sysadmin` có global scope, còn Owner không có capability này. Route vẫn nằm sau app shell; server-side route protection tiếp tục là release blocker chung của foundation cho tới khi session contract được chốt.

**Kết quả D1.7:** submit thành công mở credential dialog không dismiss vô ý; acknowledge xóa credential khỏi React tree, reset form và thông báo kết quả. Browser review xác nhận validation ảnh, focus vào heading khi sang review, focus vào nút copy khi dialog mở, secret biến mất sau acknowledge và không overflow ở CSS viewport 360/1024 px. React Strict Mode từng làm timer focus bị cleanup; Dialog đã được sửa để luôn schedule focus khi `open=true`. Full test hiện 37 files/167 tests; lint, typecheck và production build đạt.

#### D2. OMTS-183 — SCR-07, hồ sơ HTX và QR preview

- [x] **D2.1:** đọc `OMTS-183`, story `OMTS-144`, backend `OMTS-182`, QA `OMTS-184` và SRS UC09/SCR-07; khóa actor, field, public projection và các điểm xung đột;
- [x] **D2.2:** định nghĩa domain/schema cho hồ sơ, ngành nghề nhiều dòng, receiving bank account, trạng thái Preliminary/Completed và record version;
- [x] **D2.3:** tạo repository/service/mock typed outcomes; bao phủ MSG01/02/03/06/10, bank catalog, duplicate tax ID, conflict và public projection privacy;
- [x] **D2.4:** dựng route `/cooperative/profile`, loading/error/forbidden state và permission-aware navigation;
- [x] **D2.5:** dựng form SCR-07 theo nhóm pháp lý, liên hệ, ngành nghề và tài khoản nhận chuyển khoản; hỗ trợ add/remove activity row;
- [x] **D2.6:** dựng bước preview/confirm chỉ chứa tên + địa chỉ, nối save/cancel/conflict/reload và Preliminary → Completed;
- [x] **D2.7:** kiểm tra keyboard/focus, 360 px, 1024 px, test/lint/typecheck/build và privacy scan;
- [ ] **D2.8 (deferred — chờ backend):** map QA API, xác nhận phone/tax/bank DTO và chỉ xét Jira Done khi audit/status transition chạy qua API thật.

**Kết quả D2.1:** Jira và SRS chính thống nhất UC09 chỉ cho Cooperative Owner sửa hồ sơ; form bắt buộc tên, mã số thuế duy nhất, địa chỉ văn phòng, điện thoại, người đại diện, ít nhất một ngành nghề và tài khoản nhận chuyển khoản; email/website là tùy chọn nhưng phải đúng định dạng khi có. Preview và public projection chỉ gồm tên + địa chỉ; thay đổi không sửa snapshot QR đã công bố. Tài liệu chức năng dẫn xuất `docs_v2` gợi ý Staff có `COOPERATIVE.Read` được xem chỉ đọc nhưng đồng thời tự ghi đây là xung đột với Permission Matrix/SRS. Web chưa cấp Staff access cho đến khi nhóm xác nhận.

**Kết quả D2.2:** frontend contract tách `CooperativeProfile`, `ReceivingBankAccount`, `BankOption` và `PublicCooperativeProjection`; kiểu public projection không có trường thuế, liên hệ hay ngân hàng nên giảm nguy cơ lộ dữ liệu ngay từ compile time. Schema kiểm tra required fields, email, HTTP(S) website, tax ID 10 chữ số hoặc `10 chữ số-3 chữ số` và tối thiểu một activity tối đa 255 ký tự theo tài liệu chức năng hiện hành. Phone mới kiểm tra required vì canonical Jira/SRS chưa chốt regex cho số liên hệ HTX.

**Kết quả D2.3:** service chuẩn hóa text trước repository boundary. Mock nhận bank catalog qua dependency thay vì đóng danh sách production trong component, revalidate bank ID và form, giữ `recordVersion`, chỉ chuyển Preliminary → Completed sau save hợp lệ, không mutate state khi lỗi và trả typed MSG01/02/03/06/10. Test xác nhận public projection đúng hai field và không có bank/tax data. D2.1–D2.3 đạt 32 targeted tests, typecheck, lint và diff check.

**Kết quả D2.4:** route production `/cooperative/profile` nằm trong authenticated app layout, có route-level skeleton và client loading/error/retry/forbidden states. Menu `Hồ sơ HTX` chỉ hiện cho capability tạm `cooperative.profile.manage`; mock Owner có capability còn SysAdmin không có. Đây là presentation guard; backend `OMTS-182` vẫn phải thực thi Owner-only.

**Kết quả D2.5:** form được chia thành bốn nhóm dễ quét: pháp lý, địa chỉ/liên hệ, hoạt động kinh doanh và tài khoản nhận chuyển khoản. Activity rows có key ổn định, add/remove bằng bàn phím, focus vào dòng vừa thêm và không cho xóa dòng cuối cùng. Bank là select do service cấp; component không chứa production catalog. Validation chỉ ra đúng field và Hủy đưa form về snapshot đã lưu.

**Kết quả D2.6:** flow có hai bước không thể nhảy cóc: nhập hồ sơ → xem trước công khai. Preview nhận object riêng chỉ có tên + địa chỉ; browser DOM check xác nhận không chứa tax ID/số tài khoản. Confirm save xử lý MSG01/02/03/06/10/session expiry, chuyển Preliminary → Completed và dùng pending state tại nút. Server field error quay về form và focus đúng control; conflict có hành động tải bản mới nhất.

**Kết quả D2.7:** browser review đi qua validation, activity add/remove, preview focus, happy-path save, duplicate-tax MSG03 và error focus. Lỗi tràn ngang ở 360 px do grid min-content và mặc định `fieldset min-width` đã được sửa bằng `min-w-0`; form/preview sau sửa không overflow tại CSS viewport 360 px và form đạt ở 1024 px. Full regression đạt 40 test files/184 tests; lint, typecheck, production build và diff check xanh. Scan không có `localStorage`, `sessionStorage` hay console logging trong feature. Next 16 dev-only instant-navigation validator vẫn cảnh báo cho protected routes do client auth shell; không tự đổi cache/navigation contract trong D2.

#### D3. OMTS-193 — SCR-10, role và permission matrix

- [x] **D3.1:** đối chiếu `OMTS-193`, story `OMTS-147`, backend `OMTS-192`, BA dependency `OMTS-123` và SRS UC12/SCR-10/BR-19;
- [x] **D3.2:** định nghĩa contract data-driven cho role, feature catalog, supported action, data scope, impact account/zone và record version;
- [x] **D3.3:** tách implication rule của View, schema role và validation matrix; reject unsupported/duplicate/unknown permission rows;
- [x] **D3.4:** tạo repository/service/mock với create/edit/copy, duplicate name, conflict, impact confirmation và discontinue-blocked;
- [x] **D3.5:** dựng route `/access/roles`, permission-aware navigation, role list/status/filter và create/copy/read-only discontinued states;
- [x] **D3.6:** dựng matrix responsive function × Create/View/Edit/Delete/other + scope; accordion/card cho 360–1280 px và bảng ở desktop rất rộng;
- [x] **D3.7:** nối MSG01/03/06/09/11/session expiry, save confirmation cho role đang dùng và discontinue không xóa lịch sử;
- [x] **D3.8:** kiểm tra browser flow, keyboard/focus, 360 px, 1024 px, test/lint/typecheck/build và privacy scan;
- [ ] **D3.9 (deferred — chờ BA/backend):** thay mock catalog bằng catalog chính thức từ `OMTS-123`, map QA API `OMTS-192` và chỉ xét Jira Done khi audit/immediate-effect chạy qua API thật.

**Kết quả D3.1:** canonical Jira/SRS xác nhận chỉ Cooperative Owner quản lý role; role gồm tên duy nhất, mô tả, trạng thái In Use/Discontinued và một permission row cho mỗi function. Create/Edit/Delete/other bắt buộc có View; copy tạo role mới; sửa role đang dùng phải hiển thị số account/zone và xác nhận; discontinue bị chặn khi còn effective grant. `OMTS-123` vẫn To Do nên danh mục function/action/data scope chưa phải baseline được phê duyệt.

**Kết quả D3.2–D3.3:** frontend contract coi catalog là dữ liệu do service cấp, không đóng enum function trong component. Mỗi feature tự công bố supported actions và scope options; `requiredWhenGranted` quyết định có bắt buộc chọn scope hay không. Hàm thuần tự bật/khóa View, bỏ scope khi row hết quyền và validation boundary từ chối action/scope không hỗ trợ, thiếu row, row trùng hoặc feature lạ.

**Kết quả D3.4:** mock adapter được inject catalog/roles và không lưu vào browser storage. Save role đang dùng lần đầu trả typed `impact-confirmation-required`; chỉ request có xác nhận mới mutate. Duplicate trả MSG03 cùng role id để UI mở bản hiện có; stale version trả MSG06. Discontinue giữ record, đổi status và dùng MSG11 kèm account/zone nếu còn holder. Đây là mô phỏng UI, không chứng minh immediate-effect/audit của backend.

**Kết quả D3.5–D3.7:** route production `/access/roles` chỉ xuất hiện với capability tạm `access.roles.manage`; mock Owner có capability còn SysAdmin không có. Màn gồm list/filter trạng thái, metadata editor, copy draft, discontinued read-only và matrix data-driven. Ở 360–1280 px mỗi function là accordion dễ đọc; từ 1536 px dùng bảng so sánh. Impact dialog ưu tiên focus hành động an toàn, liệt kê account/username/zone và chỉ áp dụng sau xác nhận MSG09.

**Kết quả D3.8:** browser review xác nhận copy/save, View implication, scope validation focus, MSG09 impact confirmation, MSG11 discontinue block và discontinue role rảnh. Không overflow toàn trang tại CSS viewport 360/1024 px. Review phát hiện và sửa semantic button bị ghi đè bởi `role=listitem`, Save không đổi vẫn bấm được, badge impact sai ở copy mode, bảng xuất hiện quá sớm gây internal horizontal scroll, và scope còn sót khi bỏ custom action cuối. Full verification đạt 44 test files/202 tests; lint, typecheck, production build và diff check xanh. Next 16 dev-only instant-navigation warning vẫn thuộc protected client-auth/cache foundation và không được tự đổi trong D3.

#### D4. OMTS-190 — SCR-09, account và AccessGrant

- [x] **D4.1:** đối chiếu `OMTS-190`, story `OMTS-146`, backend `OMTS-188/189`, QA `OMTS-191` và SRS UC11/SCR-09/BR-01/19/31–34;
- [x] **D4.2:** định nghĩa contract cho Account, AccessGrant, zone/role catalog, one-time credential và typed mutation outcomes;
- [x] **D4.3:** tạo schema, effective-permission union rule, repository/service/mock và test create/duplicate/invalid grant/lock/revoke/reset;
- [x] **D4.4:** dựng route `/access/accounts`, permission-aware navigation, danh sách/tìm kiếm và form account responsive;
- [x] **D4.5:** dựng grant editor với `zone hoặc All zones + role`, effective dates, nhiều grant và lịch sử revoked không bị xóa;
- [x] **D4.6:** bắt buộc xem effective permissions theo từng zone trước khi xác nhận save; không trình bày account như có một global role;
- [x] **D4.7:** nối one-time temporary password, MSG01/02/03/09, lock/unlock/revoke có reason và reset có confirmation;
- [x] **D4.8:** review browser create/duplicate/revoke/lock/unlock/reset, keyboard/focus, 360 px, 1024 px, test/lint/typecheck/build và privacy scan;
- [ ] **D4.9 (deferred — chờ backend):** map QA API `OMTS-188/189`, kiểm chứng audit/session revocation/cache invalidation và chỉ xét Jira Done khi chạy qua QA API.

Màn này phụ thuộc dữ liệu vùng nuôi và role. Khi UC15 chưa nằm trong phần việc Web hiện tại, mock chỉ cung cấp lựa chọn vùng đọc-only theo entity SRS; không tự xây thêm nghiệp vụ quản lý vùng.

**Kết quả D4.1–D4.3:** account nội bộ có display name, username, phone bắt buộc, email tùy chọn, trạng thái Active/Locked và nhiều AccessGrant. Mỗi grant là một record riêng có role, vùng cụ thể hoặc All zones, effective from/to, status Effective/Revoked và lịch sử thu hồi. Hàm preview hợp action của mọi role có hiệu lực theo từng zone; All zones được áp vào mỗi zone đang dùng. Mock từ chối zone/role Discontinued, cặp grant trùng, username/phone trùng và sửa/khóa tài khoản Owner. Temporary password dài 10 ký tự được sinh bằng Web Crypto trong memory, không đóng secret cố định trong fixture.

**Kết quả D4.4–D4.6:** route production `/access/accounts` chỉ xuất hiện với capability tạm `access.accounts.manage`; mock Owner có capability, SysAdmin không có. Màn có search theo tên/username/phone, trạng thái account, protected Owner summary, form account và grant editor. Grant đã lưu chỉ có hành động Thu hồi; grant revoked vẫn hiển thị reason/timestamp. Form không gọi save trực tiếp: người dùng phải qua bước preview union permission theo từng zone rồi mới xác nhận.

**Kết quả D4.7:** create và reset trả one-time credential qua dialog không dismiss vô ý, có clipboard fallback và xóa secret khỏi React tree sau acknowledge. Lock/unlock/revoke đều yêu cầu reason và dùng MSG09 confirmation; reset dùng MSG09 confirmation nhưng không yêu cầu reason theo flow chi tiết UC11/SCR-09. Câu tóm tắt `OMTS-190` có thể được đọc là reset cũng cần reason, nên điểm này phải xác nhận với backend/BA trước QA integration thay vì tự đổi SRS.

**Kết quả D4.8:** browser review trên production build xác nhận create → preview → save → one-time credential; duplicate mở được account hiện có; revoke thiếu reason bị chặn và sau xác nhận grant vẫn còn trong history; lock/unlock giữ grant đã revoke; reset chỉ trả credential sau confirmation. Production page không overflow ở viewport 360 px và 1024 px. Dev mode từng báo document rộng 451 px ở 360 px do Next DevTools Shadow DOM; đo app root và production build xác nhận đây không phải overflow của D4.

#### D5. OMTS-186 — SCR-08, hồ sơ nhân viên

- [x] **D5.1:** đối chiếu `OMTS-186`, story `OMTS-145`, backend `OMTS-185`, QA `OMTS-187` và SRS UC10/SCR-08/Employee/status catalog;
- [x] **D5.2:** định nghĩa contract riêng cho Employee và account summary, schema required/optional, repository/service/mock và typed outcomes;
- [x] **D5.3:** danh sách + tìm theo tên/số điện thoại, form đúng trường SCR-08 và trạng thái Employed/Left;
- [x] **D5.4:** account picker chỉ chứa internal account chưa liên kết, nhưng vẫn giữ account hiện tại khi sửa;
- [x] **D5.5:** duplicate full name + phone mở được hồ sơ cũ; account race trả MSG24 và chỉ rõ hồ sơ đang dùng;
- [x] **D5.6:** chuyển Left/Employed chỉ nhắc sang UC11 khóa/mở/cấp lại quyền, không tự thay đổi Account;
- [x] **D5.7:** route `/employees`, Owner capability, loading/empty/error/permission denied/success và responsive UI;
- [x] **D5.8:** unit/integration tests, production build, browser review 360/1024 px và self-review;
- [ ] **D5.9:** tích hợp QA API, audit và chạy `OMTS-187` trước khi Jira Done.

**Kết quả D5.1–D5.2:** Employee được giữ tách biệt khỏi Account; account chỉ là liên kết tùy chọn và không mang role/permission vào hồ sơ nhân viên. Mock repository lọc account nội bộ chưa liên kết nhưng vẫn kiểm tra lại lúc save để chặn race bằng MSG24. Duplicate được xác định theo cặp full name + phone và trả `existingEmployeeId` để UI mở bản ghi hiện có. Hồ sơ mới luôn bắt đầu ở Employed theo status catalog.

**Kết quả D5.3–D5.7:** route production `/employees` chỉ hiện với capability tạm `cooperative.employees.manage`. Màn có tìm kiếm, trạng thái tiếng Việt `Đang làm việc/Đã nghỉ`, các trường bắt buộc/tùy chọn đúng SCR-08, account picker, feedback theo field và toast sau save. Khi đổi trạng thái, UI chỉ hiện follow-up có thể để sau hoặc mở `/access/accounts`; không tự khóa/mở account và không tự cấp lại AccessGrant.

**Kết quả D5.8:** production browser review xác nhận create + link account, account bị rút khỏi picker, duplicate mở hồ sơ cũ, hai chiều status đều hiện đúng follow-up và toàn trang không overflow ở CSS viewport 360/1024 px. Review phát hiện rồi sửa success feedback bị mất khi editor remount. Full verification đạt 51 test files/231 tests; lint, typecheck, production build và diff/privacy scan xanh.

**Điểm chờ tích hợp:** UC56/57 dùng “ngày nghỉ” để chặn công việc/chấm công nhưng E03 và SCR-08 hiện không khai báo trường ngày nghỉ; D5 không tự thêm trường. Chuẩn định dạng số điện thoại và HTTP DTO của `OMTS-185` cũng chưa được chốt, nên client hiện chỉ yêu cầu giá trị không rỗng giống D4.

### Chặng E — Mobile sau Web

Chỉ bắt đầu `omts-mobile` sau khi luồng Web auth và các contract dùng chung đã được kiểm chứng đủ để tránh thiết kế hai phiên bản mâu thuẫn. Mobile vẫn dùng repo riêng và Jira riêng: `OMTS-133`, `OMTS-151`, `OMTS-155`, `OMTS-160`, `OMTS-164`, `OMTS-168`, `OMTS-172`, `OMTS-176`, `OMTS-180`.

Khi tới Mobile, logic nghiệp vụ được đối chiếu lại nhưng UI được viết bằng Expo/React Native; không sao chép DOM component từ Web.

## 5. Chu trình hoàn thành một màn

Mỗi màn được làm theo đúng một chu trình để vừa nhanh vừa có tài liệu học:

1. **Context:** đọc Jira item và UC/SCR/BR/MSG liên quan; chỉ mở Figma khi cần đối chiếu inventory hoặc luồng.
2. **Design:** chốt component breakdown, data contract và state model trong phạm vi đã xác nhận.
3. **Static UI:** dựng layout, responsive, keyboard và accessibility.
4. **Living UI:** nối mock adapter, loading, validation, success và error cases.
5. **Verification:** chạy lint/typecheck/build, test phù hợp và kiểm tra 360/1024 px.
6. **Learning note:** ghi lại khái niệm, code flow, lỗi thực tế và Defense Q&A.
7. **API gate:** nối QA API khi contract sẵn sàng và kiểm tra `Done when`.
8. **Jira:** chỉ chuyển trạng thái khi toàn bộ điều kiện của ticket đạt.

## 6. Checklist chung trước khi chuyển Jira Done

- [ ] đúng scope và `Done when` của Jira hiện tại;
- [ ] đúng actor, field, message và business rule trong SRS;
- [ ] visual được tự review theo usability, accessibility và responsive; không phụ thuộc việc đã mở Figma;
- [ ] không tự thêm/bớt bước nghiệp vụ;
- [ ] mock và HTTP adapter dùng cùng frontend contract;
- [ ] không lưu password, temporary password, OTP hoặc token trong `localStorage`;
- [ ] trạng thái loading/error/empty/forbidden/offline liên quan đã xử lý;
- [ ] không overflow ở 360 px và dùng tốt ở 1024 px;
- [ ] keyboard, focus, label và thông báo lỗi có thể tiếp cận;
- [ ] lint, typecheck, build và test liên quan xanh;
- [ ] QA API đạt nếu ticket ghi “works against the QA API”;
- [ ] có learning note và evidence ngắn để review.

## 7. Các điểm được hoãn nhưng phải chặn đúng lúc

Những điểm sau không chặn dựng màn bằng mock, nhưng phải được xác nhận trước HTTP integration hoặc Jira Done tương ứng:

- QA API base URL và OpenAPI hiện hành;
- refresh token Web dùng cookie hay bearer contract khác;
- login response biểu diễn forced password/phone verification gate thế nào;
- thời điểm backend phát session/token trong chuỗi post-login gate;
- payload `/me/permissions`, effective permissions và `All zones`;
- data scope catalog của UC12;
- hành vi server-session khi logout gặp mất mạng;
- canonical message translation nếu backend và SRS khác nhau.

Nếu code hoặc API thực tế mâu thuẫn với SRS/Jira, dừng phần phụ thuộc, ghi rõ bằng chứng và hỏi Duy Thái trước khi đổi luồng nghiệp vụ.
