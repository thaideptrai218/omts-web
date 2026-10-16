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

- [ ] chọn đăng ký bằng email hoặc số điện thoại;
- [ ] password + confirmation + rule hint;
- [ ] MSG01 và MSG14 với link đăng nhập/khôi phục;
- [ ] tiếp tục dùng component SCR-02;
- [ ] xác minh thành công quay về SCR-03;
- [ ] QA API trước khi Jira Done.

#### C2. OMTS-163 — SCR-04, khôi phục tài khoản

- [ ] nhập identifier;
- [ ] luôn dùng phản hồi chung MSG15 để không làm lộ tài khoản tồn tại;
- [ ] dùng SCR-02 rồi nhập mật khẩu mới + confirmation;
- [ ] đổi phương thức nhận mã khi đủ điều kiện;
- [ ] hoàn tất quay về login;
- [ ] QA API trước khi Jira Done.

#### C3. OMTS-171 — SCR-05 Profile

- [ ] display name, email và phone có thể chỉnh sửa;
- [ ] username và roles chỉ đọc;
- [ ] email/phone mới chỉ thay thế giá trị cũ sau khi SCR-02 thành công;
- [ ] MSG62 cho email, MSG06 cho conflict và MSG10 khi lưu;
- [ ] mock tình huống record version cũ;
- [ ] QA API trước khi Jira Done.

#### C4. OMTS-175 — SCR-06, tùy chọn thông báo

- [ ] ma trận notification type × channel;
- [ ] mục bắt buộc hiển thị locked;
- [ ] channel chưa cấu hình/không đủ điều kiện hiển thị disabled kèm lý do;
- [ ] MSG21 và MSG23;
- [ ] focus/label cho từng checkbox trong ma trận;
- [ ] QA API trước khi Jira Done.

### Chặng D — màn hình quản trị và Cooperative

Thứ tự màn quản trị bám luồng AC-01: khởi tạo HTX → hoàn thiện hồ sơ → định nghĩa role → tạo account/access grants → liên kết hồ sơ nhân viên.

#### D1. OMTS-196 — SCR-56, SysAdmin khởi tạo HTX

- [ ] form cooperative name, Owner contact và evidence image;
- [ ] preview ảnh và validation loại/kích thước theo contract;
- [ ] one-time temporary password dialog, không lưu lại password;
- [ ] MSG03 và MSG55;
- [ ] actor boundary: SysAdmin chỉ khởi tạo Owner, không sửa dữ liệu nghiệp vụ HTX;
- [ ] QA API trước khi Jira Done.

#### D2. OMTS-183 — SCR-07, hồ sơ HTX và QR preview

- [ ] form theo SCR-07;
- [ ] business activities dạng bảng nhiều dòng;
- [ ] ngân hàng chọn từ danh sách;
- [ ] preview chỉ tên và địa chỉ sẽ xuất hiện ở trang truy xuất công khai;
- [ ] MSG01, MSG02 và MSG10;
- [ ] không để preview lộ tài chính, Trader hoặc dữ liệu ngoài SCR-24;
- [ ] QA API trước khi Jira Done.

#### D3. OMTS-193 — SCR-10, role và permission matrix

- [ ] danh sách role và trạng thái sử dụng;
- [ ] matrix function × Create/View/Edit/Delete/other;
- [ ] khi chọn quyền thay đổi dữ liệu, View tự được chọn và khóa theo BR-19;
- [ ] copy từ role khác;
- [ ] data scope theo catalog/backend contract;
- [ ] xác nhận MSG09 khi sửa role đang được dùng;
- [ ] MSG01, MSG03, MSG09 và MSG11;
- [ ] QA API trước khi Jira Done.

#### D4. OMTS-190 — SCR-09, account và AccessGrant

- [ ] danh sách/tìm kiếm account;
- [ ] form account;
- [ ] mỗi grant là một cặp `zone hoặc All zones + role`;
- [ ] một account có nhiều grant; không hiển thị nó như một global role;
- [ ] xem effective permissions trước khi xác nhận;
- [ ] one-time temporary password dialog;
- [ ] lock, unlock, reset và revoke có reason + MSG09;
- [ ] MSG01, MSG02, MSG03 và MSG09;
- [ ] QA API trước khi Jira Done.

Màn này phụ thuộc dữ liệu vùng nuôi và role. Khi UC15 chưa nằm trong phần việc Web hiện tại, mock chỉ cung cấp lựa chọn vùng đọc-only theo entity SRS; không tự xây thêm nghiệp vụ quản lý vùng.

#### D5. OMTS-186 — SCR-08, hồ sơ nhân viên

- [ ] danh sách và tìm theo tên/số điện thoại;
- [ ] form required/optional đúng SCR-08;
- [ ] account picker chỉ chứa internal account chưa liên kết;
- [ ] Employee và Account là hai entity riêng;
- [ ] trạng thái Employed/Left theo SRS, dùng đúng nhãn tiếng Việt sau khi chốt catalog;
- [ ] lock prompt khi chuyển trạng thái cần xử lý account;
- [ ] MSG01, MSG02, MSG03, MSG10 và MSG24;
- [ ] QA API trước khi Jira Done.

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
