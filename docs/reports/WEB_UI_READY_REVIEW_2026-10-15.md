# Báo cáo kiểm tra OMTS Web — Foundation và SCR-02

> Ngày kiểm tra: 15/10/2026 (Asia/Saigon)
>
> Branch: `feature/OMTS-132-web-foundation`
>
> Phạm vi Jira: [OMTS-132](https://welterial.atlassian.net/browse/OMTS-132), [OMTS-150](https://welterial.atlassian.net/browse/OMTS-150)
>
> Trạng thái báo cáo: bằng chứng cho mốc UI ready; không phải biên bản Jira Done hoặc chấp thuận production

## 1. Kết luận điều hành

Branch đủ điều kiện để **push lên feature branch và mở cho nhóm review**. Phase A foundation và SCR-02 đã đạt mốc UI ready bằng mock data.

Branch **chưa đủ điều kiện merge để phát hành hoặc chuyển Jira Done**. Hai nguyên nhân chính là auth vẫn được compose trực tiếp với mock repository và chưa có QA API/session/permission contract được xác nhận.

| Mốc | Đánh giá | Lý do |
| --- | --- | --- |
| Push feature branch | Đạt | Code compile, test và build xanh; báo cáo nêu rõ blocker |
| UI ready bằng mock | Đạt | Luồng chính, responsive, keyboard và error state liên quan đã được kiểm tra |
| Sẵn sàng merge/release | Chưa đạt | Mock auth vẫn được dùng trong production composition; route bảo vệ chưa có server session |
| OMTS-132 Jira Done | Chưa đạt | Chưa chạy với QA API và chưa chốt auth/session/permission contracts |
| OMTS-150 Jira Done | Chưa đạt | Chưa nối `start/resend/verify` với QA API từ OMTS-149 |

## 2. Phạm vi đã triển khai

### 2.1 Phase A — Web foundation

- Next.js 16 App Router, TypeScript và Tailwind CSS.
- Semantic design tokens, typography, focus ring và responsive layouts.
- `AuthShell`, `AppShell`, mobile navigation và sidebar desktop có thể thu gọn.
- Form đăng nhập dùng React Hook Form + Zod.
- Auth domain, repository/service contract, mock adapter và frontend auth state.
- Effective permission abstraction theo permission + scope; không coi role là quyền toàn cục.
- Generic API client chuẩn hóa network error, invalid JSON và final 401 thành MSG19.
- Dialog, confirm dialog, toast và pausable timer dùng chung.
- Dashboard mẫu với navigation được lọc theo effective permission.

### 2.2 B1 — SCR-02 xác minh dùng chung

- Sáu verification purpose theo backend ticket OMTS-149, nhưng giữ tên domain độc lập với JSON API tương lai.
- Challenge chỉ đưa masked recipient tới dialog; địa chỉ thô không nằm trong model hiển thị.
- Input một trường, đúng sáu chữ số, hỗ trợ paste và `autocomplete="one-time-code"`.
- Mã hiệu lực 5 phút, gửi lại sau 60 giây, tối đa 3 lượt gửi và 5 lần nhập sai theo SRS UC08.
- Countdown dựa trên timestamp thật thay vì tự trừ biến đếm.
- Repository/service contract cho `start`, `resend`, `verify`.
- Mock adapter hỗ trợ đồng hồ điều khiển được, mã mới hủy mã cũ và delivery failure không phá challenge hiện tại.
- Dialog trả verification token qua callback; không log hoặc lưu token.
- UC03 có thể truyền MSG15 khi gửi thất bại; các UC khác mặc định MSG04.
- Route `/dev/verification` dùng một component cho UC01, UC02, UC03 và UC05; route trả 404 trong production.

## 3. Bằng chứng kiểm tra

### 3.1 Kiểm tra tự động

| Lệnh | Kết quả |
| --- | --- |
| `npm test -- --run` | Đạt — 7 test files, 35/35 tests |
| `npm run lint` | Đạt — không warning |
| `npm run typecheck` | Đạt — route types được tạo và TypeScript không lỗi |
| `npm run build` | Đạt — Next.js production build hoàn tất |
| `npm audit --omit=dev` | Đạt — 0 production vulnerabilities |
| `git diff --check` | Đạt — không whitespace error |
| Local common-secret pattern scan | Không tìm thấy API key, private key hoặc token theo các pattern phổ biến; vẫn cần GitHub secret scan |

Các test hiện có bao phủ permission scope, API client/error mapping, latest auth operation, pausable timer, verification domain policy, countdown và mock verification repository.

### 3.2 Kiểm tra production route

Sau `npm run build` và `npm run start`:

| Route | HTTP status | Ý nghĩa |
| --- | --- | --- |
| `/` | 200 | Public route hoạt động |
| `/login` | 200 | Auth route hoạt động |
| `/dashboard` | 200 | Finding: chưa có server-side route protection |
| `/dev/verification` | 404 | Development showcase không public trong production |

### 3.3 Kiểm tra UI đã thực hiện

- 360 × 800: không overflow ngang; verification dialog dùng full-screen sheet và cuộn nội bộ.
- 1024 × 800: verification dialog rộng 512 px và căn giữa.
- Focus mở đầu ở OTP input; Tab và Shift+Tab không thoát dialog.
- Reduced-motion: animation mở dialog chỉ sinh trong `prefers-reduced-motion: no-preference`.
- Invalid input, mã đúng, mã sai và success callback đã được thao tác bằng trình duyệt.
- Nội dung dialog chỉ hiển thị recipient đã mask.

## 4. Finding và rủi ro còn lại

### F-01 — Auth production composition vẫn dùng mock

**Mức độ:** Release blocker.

**Bằng chứng:** `src/features/auth/services/auth-service.instance.ts` import trực tiếp `mockAuthRepository`.

**Tác động:** QA/production có thể chạy với tài khoản demo nếu branch được deploy mà chưa thay composition boundary.

**Hành động:** chốt environment/composition rule và HTTP auth adapter sau khi backend contract được xác nhận. Không dùng điều kiện môi trường tự phát trước khi nhóm chốt.

### F-02 — Protected route mới chỉ được gate ở client

**Mức độ:** Release blocker.

**Bằng chứng:** request chưa đăng nhập tới `/dashboard` trả HTTP 200; `(app)` layout chỉ dùng `AuthProvider` phía client.

**Tác động:** frontend có thể che UI sau hydrate nhưng không phải security boundary, không được dùng để bảo vệ dữ liệu thật.

**Hành động:** chốt session/cookie/token contract rồi thêm server-aware route protection. Backend vẫn phải authorize mọi API.

### F-03 — QA API và payload quyền chưa có

**Mức độ:** Chặn Jira Done.

**Tác động:** chưa kiểm chứng refresh/session expiry, temporary-password gate, phone-verification gate và `/me/permissions` bằng dữ liệu thật.

**Hành động:** giữ domain contracts hiện tại, chỉ viết HTTP adapters khi OpenAPI/QA contract sẵn sàng.

### F-04 — Browser checks chưa được tự động hóa

**Mức độ:** Trung bình, không chặn push.

**Tác động:** focus trap, responsive layout và production showcase guard hiện dựa một phần vào kiểm tra thủ công; regression có thể lọt qua unit tests.

**Hành động:** thêm component/e2e tests khi nhóm chốt browser-test stack; trước mắt giữ checklist 360 px, 1024 px và keyboard cho mỗi màn.

### F-05 — Development showcase chưa trình diễn mọi lỗi start

**Mức độ:** Thấp, development-only.

**Tác động:** mock repository có delivery-failure branch và unit test, nhưng showcase hiện ưu tiên happy path; start failure không có control riêng để nhóm visual-review.

**Hành động:** chỉ bổ sung error scenario selector nếu nhóm cần review trực quan; không đưa control test vào màn production.

## 5. Kiểm tra an toàn dữ liệu phía client

- Không tìm thấy `localStorage` trong verification feature.
- Không tìm thấy `console.log`/`console.debug` trong verification feature.
- OTP và verification token không được ghi storage hoặc hiển thị trong success state.
- Mock credential chỉ hiển thị trong login prototype và phải biến mất khi F-01 được xử lý.
- Dev showcase bị chặn bằng 404 trong production.

## 6. Tự đánh giá báo cáo

| Tiêu chí | Điểm | Nhận xét |
| --- | ---: | --- |
| Truy vết yêu cầu | 4.5/5 | Phân biệt rõ OMTS-132, OMTS-150, OMTS-149 và mốc UI/Jira ready; chưa thể đối chiếu OpenAPI thật |
| Bằng chứng kiểm thử | 4.5/5 | Có lệnh, số test, production build/audit và HTTP status; visual checks chưa tự động hóa |
| Trung thực về giới hạn | 5/5 | Ghi rõ mock hard-wire, dashboard 200, thiếu QA API và không tuyên bố Jira Done |
| Khả năng tái kiểm tra | 4/5 | Các lệnh có thể chạy lại; ảnh visual không được commit vào repo |
| Khả năng hành động | 4.5/5 | Mỗi finding có tác động và hành động tiếp theo; một số hành động vẫn phụ thuộc backend/team decision |

**Tổng hợp: 4.5/5 — báo cáo đáng tin cậy cho code review của feature branch, nhưng chưa đủ làm acceptance report hoặc release sign-off.**

Điểm chưa thể tự xác nhận trong báo cáo này:

1. Không có kết quả CI từ GitHub tại thời điểm viết; local checks không thay thế CI.
2. Không có QA API để kiểm tra end-to-end.
3. Chưa có peer review của thành viên khác.
4. Chưa có contract chính thức cho session, refresh và effective permissions.

## 7. Khuyến nghị sau khi push

1. Để CI chạy lại lint/typecheck/build/secret scan trên commit đã push.
2. Không merge hoặc deploy branch cho đến khi F-01 và F-02 được xử lý.
3. Tiếp tục B2.1 ở mức domain/UI bằng mock; hoãn HTTP integration tại đúng gate đã ghi trong plan.
4. Khi OMTS-149/OpenAPI sẵn sàng, thực hiện B1.9 và mới đánh giá OMTS-150 Jira Done.
