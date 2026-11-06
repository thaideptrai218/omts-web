# Chặng B — UI-ready review

> Ngày kiểm tra: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: các micro-task auth có thể hoàn thành an toàn bằng frontend contract/mock hiện tại

## 1. Kết luận

Phạm vi khả thi của Chặng B đã hoàn thành. Foundation xác minh dùng chung, login, post-login gate landing, password policy/form/service boundary, logout, protected-cache cleanup và final-401 cleanup đều đã có code cùng test phù hợp.

Chặng B chưa thể gọi là hoàn tất nghiệp vụ hoặc Jira ready. Các bước forced password tiếp theo, phone verification, email-code proof, refresh/session, offline invalidation và QA API vẫn phụ thuộc contract chưa chốt. Những mục này tiếp tục để `deferred`, không được đánh dấu xong.

## 2. Trạng thái theo nhóm

| Nhóm | Đã hoàn thành | Còn bị chặn |
| --- | --- | --- |
| B1 — SCR-02 verification | Component/repository/mock/state/a11y UI ready | QA API `start/resend/verify` |
| B2 — SCR-03 login | Typed outcomes, mock scenarios, gate landing, access-granted dashboard, permission menu | recovery/public-QR destinations; forced/phone gates; HTTP DTO |
| B3 — SCR-05 security | password policy, current-password form, repository/service/mock và typed feedback | forced composition, email recipient/challenge, session sau đổi password, QA API |
| B4 — UC07 logout | local-first logout, cache registry, final-401 event, MSG19, protected redirect | offline retry contract, token/cookie/server session và QA API |

## 3. Product UI cleanup

Theo yêu cầu không đưa nội dung developer vào giao diện chính thức:

- xóa các showcase route/component trước đó;
- xóa khối credential mock khỏi login;
- thay dashboard “trang mẫu/application shell/service contract/permission-ready” bằng welcome state cho người dùng;
- không thêm route demo mới để kiểm tra B4.2/B4.3.

Mock scenarios vẫn tồn tại trong repository/test, không xuất hiện như hướng dẫn trên sản phẩm.

## 4. Browser QA

QA trực tiếp trên Edge với dev server local xác nhận:

- login page không còn “Thông tin đăng nhập bản mock”;
- account mock `owner` đi tới `/dashboard`;
- navigation có “Tổng quan” dựa trên effective permission;
- logout lập tức thay protected content bằng trạng thái chuyển trang rồi về `/login`;
- tab QA tạm đã được đóng và dev server đã dừng.

Responsive 360 px/mobile drawer, Back/direct dashboard và target logout đã được kiểm tra ở B4.1; thay đổi B4.2/B4.3 không sửa layout đó.

## 5. Lỗi/finding thực tế trong lượt QA

### Accessibility click không có geometry

Lệnh click trường identifier bằng accessibility index trả `coordinate input geometry is unavailable`. Nghĩa là Edge expose node nhưng automation không lấy được vùng click. Không sửa source để né lỗi công cụ; QA chuyển sang screenshot mới và tọa độ từ đúng snapshot, sau đó xác nhận field nhận `owner`.

### Refresh sau nhập mật khẩu không lấy được monitor

Sau `type_text`, bước chụp lại báo `no monitor found for window`. Vì action outcome chưa rõ, không nhập lặp ngay. Snapshot mới cho thấy password field có đúng bảy ký tự đã che, chứng minh input trước đã thành công.

### Password manager tự điền dữ liệu

Edge tự điền credential đã lưu khi mở localhost. QA không submit dữ liệu đó: identifier/password được chọn lại và thay bằng account mock `owner`/`demo123`; prompt lưu mật khẩu được chọn “Not now”. Báo cáo không lưu giá trị credential của trình duyệt.

### Next dev badge che logout

Badge Insight của Next dev overlay nằm trên nút cuối sidebar. Thu gọn badge rồi click lại xác nhận logout hoạt động. Đây là overlay development, không có trong production build. Warning Instant Navigation vẫn phản ánh server-session blocker đã ghi ở B4.1 và không bị tắt để che vấn đề.

### Dashboard còn lời chú thích kỹ thuật

QA thấy dashboard hiển thị “trang mẫu”, “service contract” và “Permission-ready”. Nguyên nhân là nội dung foundation từ Phase A chưa được chuyển thành product copy. Đã thay bằng welcome state trung lập; không tạo metric hoặc nghiệp vụ dashboard khi chưa có contract.

## 6. Quality gate cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Toàn bộ unit test | 17 files, 91/91 tests đạt |
| ESLint | Đạt, không warning |
| Next typegen + TypeScript | Đạt |
| Production build | Đạt, 6/6 static pages |
| Production routes | `/`, `/_not-found`, `/dashboard`, `/login`; không có `/dev/*` |
| `git diff --check` | Đạt |

## 7. Tự đánh giá

**4,5/5 cho phạm vi frontend mock có thể xác nhận.** Code đã giữ ranh giới UI/service, dọn nội dung developer khỏi sản phẩm và xử lý logout/401 theo cùng một cleanup flow. Điểm trừ chính là auth vẫn client-only, form đổi mật khẩu chưa được mount vào hành trình production và QA API chưa tích hợp. Vì vậy không chuyển các ticket Chặng B sang Done.

## 8. Final code review trước commit

Đã review lại toàn bộ diff từ commit `31dace8`, gồm auth state, post-login gate, password policy/form/service/mock, logout, protected-cache registry, final-401 channel, application shell, dashboard và tài liệu liên quan.

### Findings cần sửa ngay

Không phát hiện finding mức blocker, critical hoặc major mới trong phần code đã triển khai. Các cleanup quan trọng có thứ tự rõ ràng: auth state local bị xóa trước, protected cache được dọn theo kiểu best-effort, sau đó mới chờ remote logout. Final 401 chỉ ép logout khi provider đang authenticated, nên 401 ở request công khai hoặc login không tự tạo toast hết phiên.

### Rủi ro đã biết, chưa được phép tự chốt

1. `/dashboard` vẫn được prerender và bảo vệ bằng client state. Đây là release blocker cho dữ liệu thật; phải chọn cookie/token, session bootstrap và server-side authorization cùng backend trước khi sửa.
2. Logout khi mất mạng chưa có hàng đợi retry server invalidation. UC07 có yêu cầu liên quan offline nhưng chưa có contract lưu/retry và xử lý xung đột.
3. Forced password, phone verification và email-code proof mới dừng ở domain/component boundary. Không có đường tắt cho phép vào application shell.
4. Protected-cache registry hiện chưa có concrete cache đăng ký vì chưa có feature query cache. Registry là extension point, không phải bằng chứng dữ liệu server đã được xóa.

Các điểm này là phạm vi `deferred`, không phải lỗi bị bỏ quên và không được dùng để đánh dấu Jira Done.

### Bằng chứng chạy lại ngay trước commit

| Kiểm tra | Kết quả mới nhất |
| --- | --- |
| `npm test` | Đạt, 17 files và 91/91 tests |
| `npm run lint` | Đạt, 0 warning |
| `npm run typecheck` | Đạt, route typegen và TypeScript không lỗi |
| `npm run build` | Đạt, 6/6 static pages; route public gồm `/`, `/_not-found`, `/dashboard`, `/login` |
| `npm audit --omit=dev` | Đạt, 0 production vulnerability |
| `git diff --check` | Đạt |

### Kết luận commit

Diff đủ điều kiện commit lên branch feature để nhóm review phần frontend mock/UI. Không merge `develop`, không đóng Jira và không tuyên bố production-ready cho tới khi các contract backend ở trên được xác nhận và kiểm thử trên QA API.
