# OMTS-167 — Báo cáo B3.4a: password service và mock boundary

> Ngày kiểm tra: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: đổi mật khẩu bằng mật khẩu hiện tại; chưa compose vào screen và chưa gọi QA API

## 1. Kết quả

Đã tạo một lát data boundary hoàn chỉnh cho UC04:

- domain input chỉ gồm `currentPassword` và `newPassword`;
- domain result phân biệt `changed` với ba rejection: current password sai, new password không hợp lệ và session hết hạn;
- repository interface không phụ thuộc mock hoặc HTTP;
- service là điểm gọi ổn định cho UI;
- mock adapter có latency, session state điều khiển được và password state cô lập theo từng instance;
- message catalog có MSG17 và MSG18 theo SRS.

Không có route, page showcase, context selector hay khối chú thích developer mới.

## 2. Quyết định kiến trúc

`confirmPassword` là dữ liệu kiểm tra thao tác gõ ở client, không phải bằng chứng nghiệp vụ. Vì vậy nó dừng tại schema/form và không đi vào repository. Backend chỉ cần kiểm tra bằng chứng hiện tại cùng mật khẩu mới.

Mock kiểm tra session trước current password. Điều này bám UC04 bước 4 và tránh trả MSG17 trong một session đã hết hạn, vì phản hồi đó có thể vô tình tiết lộ bằng chứng đăng nhập còn đúng hay không.

Sau success, mock cập nhật password trong memory của chính repository instance. Reload sẽ reset mock; không có password nào được ghi vào `localStorage`, URL, log hoặc result.

## 3. Các outcome đã mô hình

| Điều kiện | Result | Message |
| --- | --- | --- |
| Session hết hạn | `rejected/session-expired` | MSG19 |
| Current password sai | `rejected/invalid-current-password` | MSG17 |
| New password sai policy | `rejected/invalid-new-password` | MSG01 |
| Mọi kiểm tra đạt | `changed` | MSG18 |

MSG16 chưa nằm trong adapter này vì nó thuộc bước xác minh email bằng SCR-02. B3.3 vẫn chờ contract về email đã xác minh/challenge; bước này không giả lập recipient hoặc verification token trong password DTO.

## 4. Lỗi thực tế

Lệnh đọc source ban đầu dùng đường dẫn đoán `src/lib/messages/message-catalog.ts` và PowerShell báo `Cannot find path` vì catalog thật nằm ở `src/shared/messages/message-catalog.ts`.

Đây là lỗi thao tác đọc file, không phải lỗi build. Nguyên nhân là đoán cấu trúc thư mục thay vì tra cứu. Cách kiểm tra là chạy `rg --files src | rg "message|catalog"`; kết quả chỉ ra đúng file. Sau đó source và test hiện có được đọc trước khi thêm MSG17/MSG18, nhờ vậy thay đổi dùng đúng convention của repo.

## 5. Bằng chứng kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Test mục tiêu | 3 files, 17/17 tests đạt |
| Toàn bộ unit test | 13 files, 79/79 tests đạt |
| ESLint | Đạt, không warning |
| Next typegen + TypeScript | Đạt |
| Production build | Đạt, 6/6 static pages; route chỉ gồm `/`, `/_not-found`, `/dashboard`, `/login` |
| `git diff --check` | Đạt |

## 6. Tự review

Contract nhỏ và không rò chi tiết UI hoặc backend DTO. Mock cho phép kiểm tra state transition thật thay vì trả success cố định. Điểm còn thiếu có chủ ý là composition với forced gate và email-code proof; cả hai được giữ ngoài micro-task để không trộn UI orchestration với data boundary.

Kết luận: B3.4a đạt; `OMTS-167` vẫn chưa Jira ready vì chưa compose hành trình thật và chưa tích hợp QA API.
