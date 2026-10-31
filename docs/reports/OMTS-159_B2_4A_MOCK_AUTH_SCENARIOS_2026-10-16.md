# OMTS-159 — Báo cáo B2.4a: mock auth scenarios

> Ngày kiểm tra: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: mock repository và domain outcomes; chưa bật post-login gate UI

## 1. Kết quả

Mock auth không còn chỉ có một happy path `owner/demo123`. `createMockAuthRepository` tạo một repository độc lập, có session riêng và cho phép tắt latency trong unit test.

Scenario hiện có:

| Identifier mock | Kết quả domain |
| --- | --- |
| `owner` | `access-granted` bằng username |
| `0900000000` | `access-granted` bằng verified phone |
| `owner@omts.test` | `access-granted` bằng verified email |
| `account-blocked` | `rejected` với MSG13 |
| `temp-password-expired` | `rejected` với MSG68 |
| `temporarily-locked` | `rejected` với MSG69 |
| `staff-first-login` | `password-change-required` |
| `trader-needs-phone` | `phone-verification-required` với MSG67 |
| Identifier không tồn tại hoặc password sai | `rejected` với MSG12 |

Tất cả scenario hiện dùng password mock `demo123`. Đây là dữ liệu prototype trong source, không phải secret hoặc credential QA.

## 2. Quy tắc được bảo vệ

- Username, verified phone và verified email có thể cùng ánh xạ tới một account demo.
- MSG12 luôn chung chung, không tiết lộ identifier hay password sai.
- MSG13/68/69 không tạo session.
- Password/phone gate không tạo authenticated session.
- Chỉ `access-granted` cập nhật session của repository.
- Logout đưa session mock về anonymous.

## 3. Vì sao dùng repository factory?

Singleton state khiến test có thể ảnh hưởng lẫn nhau: test trước đăng nhập thành công để lại session cho test sau. Factory đặt `currentSession` trong closure của từng repository, nên mỗi test bắt đầu anonymous mà không cần reset biến module.

`latencyMs` mặc định vẫn là 450 ms để UI có pending state giống request thật. Unit test truyền 0 để không phải chờ giả lập.

## 4. Lỗi thực tế

### 4.1 Patch bị từ chối

Patch đầu tiên vừa `Delete File` vừa `Add File` cùng đường dẫn `mock-auth-repository.ts`. Công cụ trả `multiple operations target ...`. Patch bị từ chối trước khi ghi nên không có file dở dang. Cách sửa là dùng một `Update File` duy nhất.

### 4.2 TypeScript Map inference

Sau khi đổi object lookup sang `Map`, `npm run typecheck` báo TS2769 tại constructor. TypeScript suy luận value type từ tuple đầu tiên là riêng `access-granted`; các tuple `rejected` vì vậy bị coi là sai kiểu, dù biến đích khai báo `ReadonlyMap<string, LoginResult>`.

Sửa bằng cách đặt generic tại điểm khởi tạo: `new Map<string, LoginResult>(...)`. Sau sửa, typecheck và 11 test repository đều đạt. Không dùng `as` để ép lookup key.

## 5. Bằng chứng kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Test riêng mock repository | 1 file, 11/11 tests đạt |
| Toàn bộ test | 10 files, 54/54 tests đạt |
| Lint | Đạt, không warning |
| Typecheck | Đạt sau khi sửa Map generic |
| Production build | Đạt với Next.js 16.4.0 |
| `git diff --check` | Đạt |

## 6. Giới hạn và bước tiếp theo

Credential scenario chưa được hiển thị trong UI. Nếu hiển thị ngay, hai gate sẽ không có màn đích vì B2.5 chưa hoàn thành. B2.5 phải điều phối password gate và phone gate trước; B2.4b sau đó mới thêm dev-only help để nhóm review.

Factory này vẫn là mock được compose trực tiếp trong production build của branch. Blocker thay mock bằng QA/production adapter từ báo cáo foundation vẫn còn nguyên.

## 7. Tự review

Điểm tự đánh giá: **4,7/5**.

- Bao phủ đủ outcome của OMTS-159 và ba loại identifier đã xác nhận.
- Session test chứng minh gate/rejection không mở application state.
- Factory cô lập state và tránh test chậm.
- Không tạo backend DTO, token hoặc route giả.
- Điểm trừ: scenario chưa review được bằng UI và chưa mô hình hóa bước hoàn tất gate; hai phần này thuộc B2.5/B2.4b.

Kết luận: B2.4a đạt; OMTS-159 vẫn chưa UI-ready hoặc Jira-ready.
