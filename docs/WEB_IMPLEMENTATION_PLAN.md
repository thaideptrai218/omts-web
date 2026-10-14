# OMTS Web — kế hoạch triển khai theo từng màn hình

> Cập nhật: 14/10/2026 (Asia/Saigon)  
> Phạm vi: các hạng mục Web đang giao cho D DT trên Jira  
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
4. Figma OMTS: bố cục, component và luồng nhìn thấy; Figma không thay đổi nghiệp vụ trong SRS.
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

Mỗi màn hình có một bài trong `docs/learning/`. Bài học được viết theo code thật vừa hoàn thành, gồm:

1. vấn đề màn hình giải quyết;
2. khái niệm nền từ đầu;
3. component và file trong OMTS;
4. luồng dữ liệu và luồng điều khiển;
5. lỗi thực tế, nguyên nhân gốc, cách chẩn đoán và cách sửa;
6. bằng chứng kiểm tra;
7. câu hỏi hội đồng và câu trả lời ngắn.

Trong lúc code, người học không bị yêu cầu trả lời kiến thức chưa được giải thích. Các câu hỏi bảo vệ được gom trong bài để đọc lại sau.

### 3.4 Git và Jira

- Tiếp tục `OMTS-132` trên branch hiện tại `feature/OMTS-132-web-foundation` và PR hiện tại.
- Sau khi foundation được review/merge, mỗi Jira màn hình dùng một branch/PR; toàn bộ micro-task của màn đó ở cùng branch.
- Chỉ giữ một branch triển khai chính đang hoạt động tại một thời điểm để giảm xung đột.
- Không commit sau từng thay đổi rất nhỏ. Commit khi một lát code có ý nghĩa và đã kiểm tra được.
- Chỉ chuyển ticket Jira khi checklist Jira ready của ticket đã đạt; không tick theo cảm giác hoặc theo việc page đã render.

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

- [ ] route group `(app)` và application shell tối thiểu;
- [ ] component nền cho field, button, dialog, toast và form feedback;
- [ ] message catalog có formatter `{code, params}`;
- [ ] service/repository contract và mock adapter, không gọi storage trong component;
- [ ] auth state ở mức frontend và trang mẫu được bảo vệ;
- [ ] menu mẫu ẩn/hiện theo effective permission và scope;
- [ ] API client boundary, xử lý 401 cuối cùng thành MSG19;
- [ ] form stack React Hook Form + Zod;
- [ ] kiểm tra bàn phím, focus, 360 px và 1024 px;
- [ ] lint, typecheck, build và test liên quan đều xanh.

Phần refresh token, cookie, `/me/permissions` và session bootstrap sẽ đi qua interface trước. HTTP adapter chỉ được chốt sau khi backend cung cấp contract. Đây là điểm còn hoãn, không cản việc dựng UI bằng mock nhưng có thể cản mốc Jira ready.

Bài học dự kiến: mở rộng `01-official-web-foundation.md`, sau đó thêm bài về data boundary, message catalog và permission scope.

### Chặng B — luồng xác thực cốt lõi

#### B1. OMTS-150 — SCR-02, component xác minh dùng chung

Đây là component dùng lại trong đăng ký, đăng nhập lần đầu, khôi phục và đổi thông tin liên hệ. Nó không được nhân bản thành bốn form OTP khác nhau.

- [ ] đọc lại frame Figma `2:29`, `2:83`, `2:164`, `2:180` trước khi code;
- [ ] hiển thị người nhận đã mask, không lộ toàn bộ email/số điện thoại;
- [ ] ô nhập đúng 6 chữ số, hỗ trợ paste và bàn phím;
- [ ] countdown gửi lại 60 giây và số lượt gửi còn lại;
- [ ] props tối thiểu: `purpose`, `recipient`, `onVerified(token)`;
- [ ] trạng thái MSG01, MSG04 và MSG16;
- [ ] mock các trường hợp đúng, sai, hết hạn, quá số lần và lỗi dịch vụ;
- [ ] kiểm chứng component được tái sử dụng được trong UC01, UC02, UC03 và UC05;
- [ ] tích hợp QA API trước khi chuyển Jira Done.

Bài học dự kiến: `04-shared-verification-flow.md` — controlled input, countdown, state machine nhỏ và chống submit lặp.

#### B2. OMTS-159 — SCR-03, đăng nhập và post-login gate

Quyết định `WEB-AUTH-01` đã chốt phương án B: identifier là username, số điện thoại đã xác minh hoặc email đã xác minh. Staff đăng nhập lần đầu bằng username và temporary password.

- [ ] lấy lại design context và screenshot Figma node `2:43` trước khi triển khai thật;
- [ ] form identifier + password, hiện/ẩn password dùng được bằng bàn phím;
- [ ] helper text nói rõ phone/email phải được xác minh;
- [ ] trạng thái MSG01, MSG12, MSG13, MSG68 và MSG69;
- [ ] link tới UC03 khôi phục tài khoản;
- [ ] sau credentials hợp lệ: đổi temporary password trước nếu bị bắt buộc;
- [ ] sau đổi password: đi qua phone verification gate nếu BR-34 yêu cầu;
- [ ] chỉ sau các gate mới mở application shell và menu theo quyền;
- [ ] mock account cho từng nhánh để nhóm review UI;
- [ ] kiểm tra các gate bằng QA test account trước khi chuyển Jira Done.

Tên field response, thời điểm phát token và route đích thuộc `WEB-AUTH-02`, vẫn chờ backend. Frontend sẽ biểu diễn kết quả bằng kiểu domain trung lập, không coi tên field mock là API chính thức.

Bài học dự kiến: `05-login-and-post-login-gates.md` — authentication khác authorization, gate theo trạng thái tài khoản và generic login error.

#### B3. OMTS-167 — SCR-05 Security, đổi mật khẩu

- [ ] security tab trong khu vực tài khoản;
- [ ] hai cách chứng minh: current password hoặc mã gửi email theo SRS;
- [ ] new password + confirmation và rule hint;
- [ ] forced-change mode không hiển thị navigation sang nghiệp vụ khác;
- [ ] MSG01, MSG16, MSG17, MSG18, MSG19;
- [ ] sau đổi/reset mật khẩu, xử lý session theo contract đã xác nhận;
- [ ] QA API gồm cả forced mode trước khi Jira Done.

Bài học dự kiến: `06-password-change-and-forced-mode.md` — form mode, route boundary và lý do frontend không tự quyết session revocation.

#### B4. OMTS-179 — UC07, logout và dọn dữ liệu bảo vệ

Đây là hành vi xuyên ứng dụng, không phải một page độc lập.

- [ ] gọi logout qua service;
- [ ] xóa auth state và protected query/cache;
- [ ] về SCR-03;
- [ ] MSG19 khi session hết hạn;
- [ ] nhấn Back sau logout không hiển thị protected data;
- [ ] kiểm tra lỗi mạng theo contract UC07 trước khi Jira Done.

Bài học dự kiến: `07-logout-and-protected-cache.md` — browser history khác application state, cache invalidation và server session.

### Chặng C — hoàn thiện các màn tài khoản

#### C1. OMTS-154 — SCR-01, đăng ký Trader

- [ ] chọn đăng ký bằng email hoặc số điện thoại;
- [ ] password + confirmation + rule hint;
- [ ] MSG01 và MSG14 với link đăng nhập/khôi phục;
- [ ] tiếp tục dùng component SCR-02;
- [ ] xác minh thành công quay về SCR-03;
- [ ] QA API trước khi Jira Done.

Bài học dự kiến: `08-trader-registration.md` — progressive form, validation phía client và uniqueness do server chịu trách nhiệm.

#### C2. OMTS-163 — SCR-04, khôi phục tài khoản

- [ ] nhập identifier;
- [ ] luôn dùng phản hồi chung MSG15 để không làm lộ tài khoản tồn tại;
- [ ] dùng SCR-02 rồi nhập mật khẩu mới + confirmation;
- [ ] đổi phương thức nhận mã khi đủ điều kiện;
- [ ] hoàn tất quay về login;
- [ ] QA API trước khi Jira Done.

Bài học dự kiến: `09-account-recovery.md` — account enumeration, generic response và multi-step flow.

#### C3. OMTS-171 — SCR-05 Profile

- [ ] display name, email và phone có thể chỉnh sửa;
- [ ] username và roles chỉ đọc;
- [ ] email/phone mới chỉ thay thế giá trị cũ sau khi SCR-02 thành công;
- [ ] MSG62 cho email, MSG06 cho conflict và MSG10 khi lưu;
- [ ] mock tình huống record version cũ;
- [ ] QA API trước khi Jira Done.

Bài học dự kiến: `10-profile-and-optimistic-concurrency.md` — editable/read-only fields, staged contact change và row-version conflict.

#### C4. OMTS-175 — SCR-06, tùy chọn thông báo

- [ ] ma trận notification type × channel;
- [ ] mục bắt buộc hiển thị locked;
- [ ] channel chưa cấu hình/không đủ điều kiện hiển thị disabled kèm lý do;
- [ ] MSG21 và MSG23;
- [ ] focus/label cho từng checkbox trong ma trận;
- [ ] QA API trước khi Jira Done.

Bài học dự kiến: `11-notification-preference-matrix.md` — accessible table/form matrix và derived disabled state.

### Chặng D — màn hình quản trị và Cooperative

Thứ tự màn quản trị bám luồng AC-01: khởi tạo HTX → hoàn thiện hồ sơ → định nghĩa role → tạo account/access grants → liên kết hồ sơ nhân viên.

#### D1. OMTS-196 — SCR-56, SysAdmin khởi tạo HTX

- [ ] form cooperative name, Owner contact và evidence image;
- [ ] preview ảnh và validation loại/kích thước theo contract;
- [ ] one-time temporary password dialog, không lưu lại password;
- [ ] MSG03 và MSG55;
- [ ] actor boundary: SysAdmin chỉ khởi tạo Owner, không sửa dữ liệu nghiệp vụ HTX;
- [ ] QA API trước khi Jira Done.

Bài học dự kiến: `12-cooperative-initialization.md` — one-time secret display, file upload và actor boundary.

#### D2. OMTS-183 — SCR-07, hồ sơ HTX và QR preview

- [ ] form theo SCR-07;
- [ ] business activities dạng bảng nhiều dòng;
- [ ] ngân hàng chọn từ danh sách;
- [ ] preview chỉ tên và địa chỉ sẽ xuất hiện ở trang truy xuất công khai;
- [ ] MSG01, MSG02 và MSG10;
- [ ] không để preview lộ tài chính, Trader hoặc dữ liệu ngoài SCR-24;
- [ ] QA API trước khi Jira Done.

Bài học dự kiến: `13-cooperative-profile-and-public-preview.md` — dynamic rows, public/private projection và form composition.

#### D3. OMTS-193 — SCR-10, role và permission matrix

- [ ] danh sách role và trạng thái sử dụng;
- [ ] matrix function × Create/View/Edit/Delete/other;
- [ ] khi chọn quyền thay đổi dữ liệu, View tự được chọn và khóa theo BR-19;
- [ ] copy từ role khác;
- [ ] data scope theo catalog/backend contract;
- [ ] xác nhận MSG09 khi sửa role đang được dùng;
- [ ] MSG01, MSG03, MSG09 và MSG11;
- [ ] QA API trước khi Jira Done.

Bài học dự kiến: `14-role-permission-matrix.md` — permission implication, matrix accessibility và tác động của role dùng chung.

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

Bài học dự kiến: `15-accounts-and-zone-role-grants.md` — RBAC có scope, effective permission và thao tác nhạy cảm có confirmation.

#### D5. OMTS-186 — SCR-08, hồ sơ nhân viên

- [ ] danh sách và tìm theo tên/số điện thoại;
- [ ] form required/optional đúng SCR-08;
- [ ] account picker chỉ chứa internal account chưa liên kết;
- [ ] Employee và Account là hai entity riêng;
- [ ] trạng thái Employed/Left theo SRS, dùng đúng nhãn tiếng Việt sau khi chốt catalog;
- [ ] lock prompt khi chuyển trạng thái cần xử lý account;
- [ ] MSG01, MSG02, MSG03, MSG10 và MSG24;
- [ ] QA API trước khi Jira Done.

Bài học dự kiến: `16-employee-profile-and-account-link.md` — entity separation, picker eligibility và consistency khi liên kết một-một.

### Chặng E — Mobile sau Web

Chỉ bắt đầu `omts-mobile` sau khi luồng Web auth và các contract dùng chung đã được kiểm chứng đủ để tránh thiết kế hai phiên bản mâu thuẫn. Mobile vẫn dùng repo riêng và Jira riêng: `OMTS-133`, `OMTS-151`, `OMTS-155`, `OMTS-160`, `OMTS-164`, `OMTS-168`, `OMTS-172`, `OMTS-176`, `OMTS-180`.

Khi tới Mobile, logic nghiệp vụ được đối chiếu lại nhưng UI được viết bằng Expo/React Native; không sao chép DOM component từ Web.

## 5. Chu trình hoàn thành một màn

Mỗi màn được làm theo đúng một chu trình để vừa nhanh vừa có tài liệu học:

1. **Context:** đọc Jira item, UC/SCR/BR/MSG liên quan và Figma frame.
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
- [ ] Figma đã được dùng để tham khảo frame thật;
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
