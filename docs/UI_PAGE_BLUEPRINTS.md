# OMTS Web — blueprint UI/UX chi tiết theo từng trang

> Cập nhật: 14/10/2026
>
> Nguồn: Jira của D DT, SRS hiện tại và Figma `OMTS – Wireframe theo Use Case`
>
> Mục đích: mô tả đủ rõ để triển khai tuần tự; đây không phải bằng chứng code đã hoàn thành

## 1. Hướng thiết kế chung

Figma hiện tại là wireframe low-fidelity ở chiều rộng 390 px. Nó chỉ là tư liệu lịch sử để đối chiếu inventory màn hình hoặc luồng khi cần, không phải template hình thức và không phải điều kiện bắt buộc trước khi code. Giao diện Web được thiết kế mới từ Jira, SRS và nhu cầu sử dụng thực tế của Cooperative Owner, Zone Manager, Accountant, Staff và Trader không quen phần mềm phức tạp. Không pixel-copy màu sắc, tỷ lệ hoặc component từ wireframe.

### 1.1 Ngôn ngữ thị giác

- Màu chính: xanh teal đậm gợi biển và nuôi trồng, dùng cho hành động chính và focus.
- Màu phụ: xanh biển dịu cho thông tin; amber cho cảnh báo; đỏ chỉ dùng cho lỗi hoặc hành động nguy hiểm.
- Nền: trắng ngà/xám rất nhạt để card dễ tách khỏi nền mà không bị chói.
- Chữ: màu slate đậm, tương phản cao; cỡ mặc định 16 px, không dùng chữ 12 px cho nội dung quan trọng.
- Góc bo 10–14 px, border nhẹ và shadow nhỏ. Không dùng glassmorphism, gradient mạnh hoặc hiệu ứng gây mất tập trung.
- Icon luôn đi cùng nhãn chữ ở hành động quan trọng; không bắt người dùng đoán icon.
- Trạng thái luôn có chữ và biểu tượng, không truyền đạt chỉ bằng màu.

Token dự kiến được tạo ở micro-task A1.1 và có thể điều chỉnh sau khi render thật:

```text
primary       teal-700
primary-hover teal-800
accent        sky-600
surface       white
canvas        slate-50
text          slate-950
muted         slate-600
success       emerald-700
warning       amber-700
danger        rose-700
focus-ring    cyan-500
```

### 1.2 Quy tắc dành cho người dùng ít am hiểu công nghệ

- Mỗi trang chỉ có một hành động chính nổi bật.
- Nút chính cao tối thiểu 48 px; mọi touch target tối thiểu 44 × 44 px.
- Label luôn nằm trên input, không dùng placeholder thay label.
- Dùng từ quen thuộc: “Lưu thay đổi”, “Gửi lại mã”, “Thử lại”; tránh mã kỹ thuật và thuật ngữ backend.
- Lỗi đặt ngay dưới trường sai, nói rõ cần sửa gì. Thông báo tổng chỉ dùng khi lỗi không thuộc một trường cụ thể.
- Form dài chia thành nhóm có tiêu đề và mô tả ngắn; không trình bày một khối hàng chục trường.
- Thao tác nguy hiểm phải ghi rõ đối tượng và hậu quả trong dialog xác nhận.
- Không giấu chức năng quan trọng sau hover, menu ba chấm hoặc gesture.
- Desktop dùng table khi cần so sánh nhiều dòng; mobile chuyển thành card/list có label, không ép kéo ngang.
- Sau khi lưu, giữ người dùng ở ngữ cảnh hiện tại và báo kết quả rõ ràng.

### 1.3 Responsive baseline

- **360–639 px:** một cột, padding 16 px, action bar cuối form có thể sticky khi form dài.
- **640–1023 px:** form tối đa 640–720 px; list/filter có thể thành hai cột nếu vẫn dễ đọc.
- **Từ 1024 px:** sidebar + topbar cho khu vực đăng nhập; nội dung tối đa khoảng 1280 px; form không kéo dài toàn chiều ngang.
- Không tạo một bản desktop bị phóng to từ mobile. Desktop tận dụng vùng trống cho summary, help panel, preview và bảng dữ liệu.

### 1.4 Chuyển động và tương tác gọn

- Motion phải giải thích được thay đổi trạng thái: panel mở/đóng, đổi tab, accordion, dialog, toast hoặc phản hồi lưu dữ liệu.
- Thời lượng thông thường 160–240 ms; chuyển cảnh lớn tối đa khoảng 420 ms. Không dùng chuyển động liên tục chỉ để trang trông “sống”.
- Sidebar desktop có thể thu gọn; mobile navigation dùng drawer có nút “Menu” và nút “Đóng” rõ ràng.
- Tabs chỉ dùng khi các nhóm nội dung cùng cấp và người dùng cần chuyển qua lại thường xuyên; trên mobile phải giữ nhãn đọc được, không chỉ có icon.
- Filter nâng cao và trợ giúp phụ có thể dùng accordion để màn hình gọn, nhưng hành động chính và trạng thái quan trọng không được giấu.
- Dùng `prefers-reduced-motion` để tắt animation không thiết yếu cho người dùng nhạy cảm với chuyển động.
- Animation không được trì hoãn thao tác, che lỗi hoặc thay đổi thứ tự nghiệp vụ.

## 2. Khung dùng chung

### 2.1 AuthShell

**Mục đích:** dùng cho login, đăng ký và khôi phục tài khoản.

**Desktop:** hai vùng. Bên trái là brand panel xanh teal có tên OMTS, mô tả ngắn “Quản lý và truy xuất nuôi hàu”, họa tiết sóng/đường bè nhẹ. Bên phải là form card tối đa 460 px. Không dùng ảnh stock gây rối; chỉ thêm ảnh vùng nuôi nếu nhóm cung cấp asset thật.

**Mobile:** bỏ brand panel lớn, giữ logo/tên ngắn ở đầu trang; form chiếm toàn bộ chiều ngang với padding 16 px. Link truy xuất QR công khai được tách thành secondary action dễ thấy.

**Component:** `AuthShell`, `BrandMark`, `PageHeading`, `FormField`, `PasswordField`, `PrimaryButton`, `InlineAlert`.

### 2.2 AppShell

**Mục đích:** dùng cho Owner, Zone Manager, Accountant, Staff và SysAdmin sau khi qua các gate.

**Desktop:** sidebar nhóm theo công việc; topbar có tên người dùng, phạm vi đang xem và trạng thái kết nối khi cần. Menu chỉ hiển thị capability được backend cấp.

**Mobile web:** topbar ngắn, navigation mở bằng nút có nhãn “Menu”; các nhóm chức năng là danh sách lớn giống tinh thần Figma nhưng có icon + mô tả ngắn.

**Điểm chưa chốt:** zone switcher và effective-permission payload. Blueprint chỉ dành vị trí, chưa tự quyết dữ liệu hoặc quyền.

## 3. Trang xác thực

### 3.1 SCR-03 — Đăng nhập (`/login`, OMTS-159)

**Người dùng:** mọi account chưa đăng nhập.

**Thứ tự thông tin:**

1. Tiêu đề “Đăng nhập OMTS” và câu hướng dẫn ngắn.
2. Identifier với label “Tên đăng nhập, số điện thoại hoặc email”.
3. Helper: số điện thoại/email phải được xác minh; Staff lần đầu dùng username.
4. Password + nút hiện/ẩn có nhãn cho screen reader.
5. Nút “Đăng nhập”.
6. Link “Quên mật khẩu”.
7. Divider “Hoặc”, link đăng ký Trader và link truy xuất QR công khai.

**Nâng cấp so với Figma:** Figma node `2:43` ghi “Số điện thoại hoặc email”, thiếu username. SRS và quyết định WEB-AUTH-01 được ưu tiên. Button xám và border vuông trong wireframe được thay bằng primary teal, focus rõ và khoảng cách thoáng.

**State cần render:** mặc định, invalid field, submitting, MSG12, MSG13, MSG68, MSG69 và lỗi dịch vụ. MSG12 vẫn chung chung để không làm lộ identifier hay password sai.

**Micro-step:**

- L1: layout tĩnh trong AuthShell;
- L2: input/password behavior và accessibility;
- L3: Zod validation + inline errors;
- L4: mock login outcomes;
- L5: post-login gate routing;
- L6: QA API và visual verification 360/1024.

### 3.2 SCR-02 — Xác minh email/số điện thoại (OMTS-150)

**Dạng hiển thị:** dialog trên desktop khi được gọi trong account area; full-page sheet trên màn hình nhỏ hoặc trong auth flow. Không nhân bản thành nhiều component OTP.

**Bố cục:**

1. Purpose-specific title, ví dụ “Xác minh số điện thoại”.
2. Destination đã mask trong info panel.
3. Sáu ô mã hoặc một input có giao diện sáu ô; hỗ trợ paste toàn mã.
4. Dòng “Mã có hiệu lực 5 phút” và số lượt còn lại nếu contract trả về.
5. Nút “Xác minh”.
6. “Gửi lại sau 00:60”, sau đó thành nút gửi lại.
7. Quay lại/hủy theo flow gọi.

**State:** initial send, entering, verifying, wrong/expired MSG16, service failure MSG04, resend cooldown, send limit, verified.

**Micro-step:** V1 shell + masked recipient; V2 OTP input; V3 countdown; V4 state model; V5 reuse demo; V6 QA API.

### 3.3 SCR-01 — Đăng ký Trader (`/register`, OMTS-154)

**Bố cục:** segmented choice “Email” / “Số điện thoại”, identifier, password, confirmation, rule checklist ngắn, nút “Tiếp tục xác minh”, link về login.

**Xung đột Figma đã xử lý:** frame `2:3` còn họ tên, ngày sinh và giới tính. Jira hiện tại và SCR-01 hiện tại chỉ bắt buộc identifier + password/confirmation; các trường profile tự khai phụ thuộc cấu hình. Vì vậy baseline không mang ba trường cũ vào form nếu chưa có yêu cầu mới.

**State:** field validation, password rules, MSG14 có hai hành động rõ “Đăng nhập” và “Khôi phục”, MSG04, chuyển sang SCR-02, success về login.

**Micro-step:** R1 choice control; R2 form; R3 password feedback; R4 mock duplicate/service error; R5 verification handoff; R6 QA API.

### 3.4 SCR-04 — Khôi phục tài khoản (`/recover`, OMTS-163)

**Pattern:** stepper ba bước nhưng mỗi lúc chỉ hiện một nhiệm vụ:

1. Nhập verified email/phone.
2. Xác minh mã được gửi tới identifier vừa nhập.
3. Đặt mật khẩu mới.

Stepper dùng nhãn “Thông tin → Xác minh → Mật khẩu mới”, không chỉ dùng số. MSG15 nằm trong info alert, luôn giống nhau để tránh lộ account tồn tại.

“Đổi cách nhận mã” không hiển thị danh sách email/số điện thoại gắn với account. Theo UC03 nhánh 3a, người dùng quay lại nhập một verified identifier khác; request cũ phải được backend hủy. Cách này không tiết lộ account có bao nhiêu phương thức liên hệ hoặc các giá trị đã che.

**Mobile:** mỗi bước là một page state, không nhồi tất cả trường. **Desktop:** vẫn dùng một card; progress nằm phía trên.

**Micro-step:** F1 source/anti-enumeration contract; F2 identifier schema + MSG15; F3 dùng SCR-02; F4 đổi identifier và hủy request cũ; F5 password reset; F6 back/refresh behavior; F7 QA API.

## 4. Tài khoản cá nhân

### 4.1 SCR-05 — Hồ sơ của tôi (`/account/profile`, OMTS-171)

**Desktop:** account summary card ở đầu, tabs “Hồ sơ”, “Bảo mật”, “Thông báo”. Form hồ sơ tối đa 720 px. **Mobile:** tabs thành navigation list hoặc horizontal tabs có nhãn đầy đủ.

**Nhóm thông tin:**

- danh tính: username, role/scope chỉ đọc;
- thông tin hiển thị: display name;
- liên hệ: phone và email, mỗi dòng có badge “Đã xác minh/Chưa xác minh” cùng action;
- action cuối: “Lưu thay đổi”.

Phone/email mới được giữ ở pending state cho tới khi SCR-02 thành công. Conflict MSG06 mở alert có hai lựa chọn “Tải dữ liệu mới” và “Bỏ thay đổi”; không tự ghi đè.

**Micro-step:** P1 read-only summary; P2 editable form; P3 verification badge/action; P4 pending contact flow; P5 conflict; P6 QA API.

### 4.2 SCR-05 Security (`/account/security`, OMTS-167)

**Normal mode:** chọn current password hoặc mã email khi SRS/contract cho phép, rồi nhập password mới và confirmation.

**Forced mode:** cùng form component nhưng nằm trong gate shell, không có sidebar/menu nghiệp vụ; có banner giải thích vì sao phải đổi mật khẩu.

Password rule hiển thị theo checklist và chỉ đổi trạng thái khi người dùng nhập. Success MSG18 dẫn về bước kế tiếp do auth flow quyết định.

**Micro-step:** S1 normal layout; S2 forced shell; S3 proof method; S4 rules/validation; S5 mock outcomes; S6 QA API.

### 4.3 SCR-06 — Tùy chọn thông báo (`/account/notifications`, OMTS-175)

Figma `2:196` chia Category và Channel riêng; Jira yêu cầu matrix loại thông báo × kênh. Thiết kế cuối dùng card theo notification type trên mobile và table matrix trên desktop, cùng một data model.

Mỗi ô disabled phải có dòng lý do nhìn thấy hoặc tooltip có thể mở bằng keyboard. Mandatory item có icon khóa và nhãn “Bắt buộc”, không chỉ vô hiệu hóa checkbox.

**Micro-step:** N1 data model; N2 desktop matrix; N3 mobile cards; N4 locked/ineligible explanation; N5 save states; N6 QA API.

## 5. Điều hướng, home và logout

### 5.1 Protected home / menu (OMTS-132)

Home không phải dashboard giả với số liệu bịa. Baseline chỉ có lời chào, việc thường dùng và menu theo permission mock. Owner thấy nhóm quản trị HTX; Zone Manager thấy nhóm vận hành vùng; Accountant thấy nhóm tài chính được cấp.

Card chức năng dùng tên nghiệp vụ, mô tả một dòng và icon. Menu không hiển thị item bị cấm; truy cập URL trực tiếp vẫn phải qua backend authorization khi API thật có mặt.

### 5.2 Logout (OMTS-179)

Logout nằm cuối account menu, có icon + chữ, màu trung tính; dialog chỉ dùng nếu người dùng có form chưa lưu. Khi logout thành công, protected shell biến mất trước khi về login. Browser Back không được render dữ liệu bảo vệ từ cache.

## 6. Quản trị HTX và quyền

### 6.1 SCR-56 — Khởi tạo HTX (`/system/cooperatives/new`, OMTS-196)

**Người dùng:** System Administrator.

**Layout:** form hai section “Thông tin HTX ban đầu” và “Chủ HTX đầu tiên”; evidence upload là dropzone có nút chọn file rõ. Desktop có summary panel bên phải; mobile summary nằm trước nút xác nhận.

Sau success, temporary password hiển thị trong modal một lần, có nút copy và checkbox “Tôi đã lưu mật khẩu” trước khi đóng. Không lưu secret trong client storage.

**Micro-step:** I1 HTX fields; I2 Owner fields; I3 upload; I4 review step; I5 one-time secret; I6 QA API.

### 6.2 SCR-07 — Hồ sơ HTX (`/cooperative/profile`, OMTS-183)

**Layout desktop:** form chính 2/3 chiều rộng, panel “Xem trước trang truy xuất” 1/3 và sticky trong viewport. **Mobile:** preview thành accordion phía dưới.

Form chia nhóm pháp lý, địa chỉ/liên hệ, hoạt động kinh doanh, ngân hàng. Business activities là repeater row rõ “Thêm hoạt động”, không dùng bảng chật trên mobile.

QR preview chỉ chiếu name + address theo ticket/SRS. Các field tài chính vẫn trong form nhưng tuyệt đối không đi vào public projection.

**Micro-step:** C1 sections; C2 activity rows; C3 bank select; C4 public projection preview; C5 permission/error states; C6 QA API.

### 6.3 SCR-10 — Vai trò và quyền (`/access/roles`, OMTS-193)

**Desktop:** danh sách role bên trái, editor bên phải; permission matrix có sticky header và nhóm function. **Mobile:** chọn role trước, mỗi function là accordion với checkbox quyền.

Khi chọn Create/Edit/Delete/other, View tự bật và có giải thích “Quyền này cần quyền Xem”. Role đang dùng có badge số account/grant bị ảnh hưởng. Save role đang dùng mở impact dialog MSG09.

**Micro-step:** RP1 list; RP2 role details; RP3 desktop matrix; RP4 mobile accordion; RP5 implication rules; RP6 impact dialog; RP7 QA API.

### 6.4 SCR-09 — Tài khoản và quyền theo vùng (`/access/accounts`, OMTS-190)

**Desktop:** list/search phía trái hoặc page danh sách; account detail dùng tabs “Thông tin”, “Vùng và vai trò”, “Quyền hiệu lực”, “Lịch sử”. **Mobile:** list card → detail page.

Grant editor trình bày từng hàng như câu dễ đọc: “Tại [Vùng A] — giữ vai trò [Quản lý vùng]”. Không dùng một ô role toàn cục. “All zones” có giải thích phạm vi.

Lock/unlock/reset/revoke đặt trong danger zone, không trộn với Save. Temporary password modal hiển thị một lần.

**Micro-step:** A1 list/search; A2 account form; A3 grant rows; A4 effective preview; A5 sensitive actions; A6 one-time secret; A7 QA API.

### 6.5 SCR-08 — Hồ sơ nhân viên (`/employees`, OMTS-186)

**Desktop:** searchable table gồm tên, phone, trạng thái làm việc và account liên kết; form add/edit trong page hoặc drawer rộng. **Mobile:** employee cards, filter sheet và form full page.

Account picker chỉ hiển thị internal account chưa liên kết. UI ghi rõ “Hồ sơ nhân viên” và “Tài khoản đăng nhập” là hai phần khác nhau. Khi chuyển sang Left, dialog giải thích ảnh hưởng tới account theo contract thay vì tự động khóa âm thầm.

**Micro-step:** E1 list/search; E2 employee form; E3 account picker eligibility; E4 status transition dialog; E5 duplicate/conflict states; E6 QA API.

## 7. Cách kiểm chứng visual từng micro-step

Sau mỗi phần nhìn thấy:

1. render đúng route/component đang làm;
2. so với screenshot Figma về thứ tự và luồng, không buộc giữ phong cách xám của wireframe;
3. kiểm tra 360 px và 1024 px;
4. kiểm tra keyboard Tab, focus ring, label và error association;
5. kiểm tra text tiếng Việt dài không tràn;
6. chỉ sửa mismatch trong phạm vi micro-task hiện tại;
7. lưu screenshot evidence khi màn đạt UI ready.

Figma MCP đã trả design context và screenshot cho login node `2:43` trong lần rà soát ngày 14/10/2026. Lần đọc tiếp theo gặp giới hạn tool call của Figma Starter plan; các node còn lại phải được lấy lại khi bắt đầu đúng màn đó, không suy đoán pixel chi tiết từ metadata.
