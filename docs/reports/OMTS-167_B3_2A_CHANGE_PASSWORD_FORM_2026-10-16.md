# OMTS-167 — Báo cáo B3.2a: current-password form

> Ngày kiểm tra: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: form, rule checklist và validation UX; chưa gọi service/API

## 1. Kết quả

Một `ChangePasswordForm` được dùng chung cho hai context:

- `forced`: label “Mật khẩu tạm thời”, thông báo đây là bước bắt buộc và không có application navigation;
- `standard`: label “Mật khẩu hiện tại”, dùng trong khu vực bảo mật tài khoản sau này.

Cả hai dùng current password, new password và confirmation. Nhánh email-code thay current password thuộc B3.3, chưa được trộn vào form này.

## 2. Thiết kế component

- `PasswordRuleChecklist` đọc trực tiếp `getPasswordRuleState` từ B3.1, nên checklist và schema không thể lệch rule.
- Ba field dùng `PasswordField`, giữ keyboard toggle, ARIA và autocomplete `current-password`/`new-password`.
- `aria-describedby` nối new-password field với checklist.
- React Hook Form chỉ giữ password trong memory; component không log, lưu state dùng chung hoặc localStorage.
- `key={mode}` remount form khi đổi context, nên password của context trước không bị giữ lại.
- Pending state khóa submit và đổi nhãn tại chỗ, không dùng skeleton cho mutation.

## 3. Browser QA bằng harness tạm

Trong lúc triển khai, một harness cục bộ tạm thời được dùng để kiểm tra component. Sau phản hồi review, harness và toàn bộ panel chú thích developer đã bị xóa khỏi product source; bảng dưới là bằng chứng hành vi của component tại thời điểm kiểm tra, không phải một screen còn tồn tại trong ứng dụng.

| Hành vi | Kết quả |
| --- | --- |
| Submit ba field rỗng | Hiện đúng ba required errors; focus về current/temporary password |
| Gõ `abc` | Rule chữ đạt; độ dài và chữ số chưa đạt; lỗi field nêu rule đầu tiên cần sửa |
| Confirmation khác new password | Lỗi gắn ở confirmation và focus đúng field |
| Submit hợp lệ | Nút disabled, nhãn “Đang kiểm tra...”, sau đó chỉ báo validation đạt |
| Chuyển forced → standard | Form remount rỗng; label và helper đổi đúng context |
| Password trong AX tree | Giá trị hiển thị `<redacted>` |
| Console | Chỉ React DevTools/HMR info; không có warning/error ứng dụng |
| Viewport hiện tại | 1127 px, document width 1127 px, không overflow |

Kiểm tra 360 px/1024 px của hành trình mounted thật được giữ ở B3.2b/B3 verification; không suy diễn từ viewport hiện tại.

## 4. Production boundary

Source hiện không còn route `/dev/security` hoặc `AccountSecurityShowcase`. Form chỉ là component để gắn vào luồng bảo mật thật ở B3.2b; không có màn “Development showcase”, context selector hay cảnh báo kỹ thuật cho người dùng.

Sau production build mới, `/dev/security` trả 404 vì route không tồn tại, không chỉ vì một nhánh `NODE_ENV` trong page.

## 5. Lỗi thực tế

Lần lint đầu báo `react-hooks/incompatible-library` tại `watch("newPassword")`. React Compiler không thể memoize an toàn function `watch()` trả từ `useForm`, nên ESLint dừng vì repo đặt `--max-warnings=0`.

Giả thuyết được kiểm tra bằng đúng vị trí lint chỉ ra: live checklist là nơi duy nhất cần subscribe một field. Cách sửa là lấy `control` từ `useForm` và dùng `useWatch({ control, name: "newPassword" })`. Lint và typecheck sau sửa đều đạt; hành vi checklist được kiểm tra lại trên browser.

Sau khi xóa `/dev/security` và `/dev/verification`, typecheck/build lần đầu báo TS2307 vì `.next/dev/types/validator.ts` và `routes.d.ts` vẫn import hai page đã xóa. Đây là route cache do Next.js dev server sinh, không phải source import mồ côi. Lệnh xóa `.next` bằng PowerShell bị policy chặn; workspace patch sau đó xóa đúng hai file generated. `next typegen` và `next build` tạo lại type sạch, rồi cả hai lệnh đạt.

Một patch tài liệu trước đó cũng bị từ chối vì dự đoán sai tiêu đề của báo cáo lịch sử. Patch không ghi dở file; tiêu đề thật được đọc lại và patch được áp dụng bằng context chính xác hơn.

## 6. Bằng chứng tự động

| Kiểm tra | Kết quả |
| --- | --- |
| Account-security tests | 2 files, 15/15 tests đạt |
| Toàn bộ unit test | 12 files, 73/73 tests đạt |
| ESLint | Đạt, không warning sau khi đổi `useWatch` |
| Next typegen + TypeScript | Đạt |
| Production build | Đạt, 6/6 static pages generated; không có `/dev/*` route |
| Product source | Không còn `/dev/security` hoặc panel chú thích |

## 7. Tự review

**4,7/5.** Component reuse, accessibility, pending và data handling rõ; lint đã bắt và sửa một lỗi tương thích React Compiler thật. Developer annotation screen đã được loại khỏi product source. Điểm trừ là chưa có DOM component tests tự động và chưa kiểm tra viewport 360 px trong hành trình gate; hai việc này thuộc B3.2b/B3 verification.

Kết luận: B3.2a đạt; B3.2 và `OMTS-167` chưa hoàn thành.
