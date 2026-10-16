# OMTS-159 — Báo cáo B2.2: login outcome và message catalog

> Ngày kiểm tra: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: domain model và message catalog; chưa triển khai giao diện post-login gate

## 1. Kết quả

B2.2 đã hoàn thành. Frontend hiện phân biệt bốn kết quả của thao tác đăng nhập:

- `rejected`: yêu cầu bị từ chối và có `AppMessage`;
- `password-change-required`: phải đổi temporary password;
- `phone-verification-required`: phải xác minh phone và dùng MSG67;
- `access-granted`: đã qua các gate và mang authenticated session để mở ứng dụng.

Tên `access-granted` cố ý khác `authenticated`. Kết quả login mô tả quyền đi tiếp sau toàn bộ gate, còn session dùng trạng thái `authenticated`. Cách đặt tên này ngăn code hiểu nhầm credentials hợp lệ là đủ để mở dashboard.

## 2. Thay đổi code

- Tách bốn nhánh có tên trong `auth-types.ts` và hợp nhất bằng `LoginResult`.
- Thêm type guard `grantsApplicationAccess`.
- `AuthProvider` chỉ ghi session khi type guard trả true.
- `LoginExperience` không chuyển `/dashboard` nếu nhận một gate chưa được xử lý.
- Mock happy path trả `access-granted`; hành vi demo hiện tại không đổi.
- Bổ sung MSG13, MSG67, MSG68 và MSG69 vào catalog.
- Thêm 8 unit tests: bốn outcome và bốn message.

## 3. Những gì chưa làm

- Chưa thêm UI hiện/ẩn password, link quên mật khẩu hoặc QR; thuộc B2.3.
- Chưa tạo mock account cho từng nhánh; thuộc B2.4.
- Chưa hiển thị/điều phối password và phone gate; thuộc B2.5.
- Chưa quyết định DTO, token timing, route hoặc payload permission; thuộc `WEB-AUTH-02`/B2.8.

Hai gate hiện được chặn khỏi application navigation nhưng chưa có UI đích. Vì mock hiện chưa trả gate nên người dùng không gặp trạng thái im lặng. B2.4 không được bật gate trong luồng review chính trước khi B2.5 hoàn thành.

## 4. Bằng chứng kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Test tập trung | 2 files, 8/8 tests đạt |
| Toàn bộ test | 9 files, 43/43 tests đạt |
| `npm run lint` | Đạt, không warning |
| `npm run typecheck` | Đạt |
| `npm run build` | Đạt với Next.js 16.4.0 |
| `git diff --check` | Đạt |

## 5. Lỗi thực tế

Lệnh tìm kiếm đầu tiên dùng một regex ghép nhiều điều kiện trong PowerShell và `rg` báo `regex parse error: unclosed group`. Nguyên nhân là chuỗi quote quanh `status === "authenticated"` bị shell xử lý làm biểu thức đến `rg` bị thiếu dấu đóng. Đây là lỗi lệnh kiểm tra, không phải lỗi source.

Cách khắc phục là bỏ regex phức tạp và chạy từng tìm kiếm bằng `rg -F`, tức tìm chuỗi cố định. Kết quả sau đó xác nhận tất cả vị trí sử dụng `LoginResult` và phép kiểm tra trạng thái trước khi sửa.

## 6. Tự review

Điểm tự đánh giá: **4,6/5**.

- Domain boundary rõ và không khóa frontend vào DTO chưa tồn tại.
- Type guard được dùng ở cả state lẫn component để không mở ứng dụng nhầm.
- Test bao phủ đủ bốn outcome và bốn message mới.
- Điểm trừ: gate UI chưa tồn tại, nên chưa thể kiểm thử hành trình người dùng. Đây là giới hạn đúng phạm vi B2.2 và được chặn trong plan.
- Copy tiếng Việt bám nghĩa SRS nhưng vẫn là bản frontend tạm thời cho tới khi catalog canonical được nhóm xác nhận.

Kết luận: đủ điều kiện chuyển sang B2.3; chưa đủ điều kiện gọi OMTS-159 là UI-ready hoặc Jira-ready.
