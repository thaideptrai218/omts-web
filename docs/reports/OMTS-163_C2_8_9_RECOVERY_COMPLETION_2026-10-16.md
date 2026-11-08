# OMTS-163 — C2.8–C2.9 Password reset and route integration

## Kết quả

Đã thêm form mật khẩu mới dùng chung password policy với account security. Confirmation chỉ phục vụ validation phía form và không đi qua service. Proof xác minh chỉ giữ trong React state; không lưu URL, cookie, `localStorage` hay log.

Mock kiểm tra password policy trước khi consume proof. Vì vậy nếu backend trả MSG01, người dùng sửa mật khẩu ngay khi proof còn hạn. Khi reset thành công, proof bị consume một lần, toast success xuất hiện và router `replace("/login")`. Login có link tới `/recover`.

Browser test đã đi qua nhập email, challenge có contact mask, OTP đúng và bước mật khẩu mới. Không submit mật khẩu cuối qua browser; OTP sai/attempt counter, reset thành công, proof reuse và invalid password được chứng minh bằng test của verification repository và mock recovery environment.

## Visual và accessibility review

- 360 px: một cột, target nút tối thiểu 48 px, không overflow.
- 1024 px: AuthShell hai cột, card recovery dễ quét mắt.
- Mỗi chuyển bước focus heading hiện tại.
- Phát hiện heading focus có viền browser giống input; giữ `tabIndex=-1` và focus nhưng thêm `outline-none` riêng cho heading. Input/button vẫn giữ focus ring toàn cục.
- Stepper không chỉ dùng màu; screen reader nhận “bước hiện tại/đã hoàn thành/chưa thực hiện”.

## Bằng chứng

- 28 test files, 128/128 tests xanh.
- `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check` xanh.
- Production build liệt kê route `/recover` là static page.

## Tự đánh giá

C2 đạt UI-ready bằng mock. Chưa Jira-ready vì `OMTS-163` yêu cầu QA API. Reload giữa flow sẽ quay về bước đầu thay vì lưu proof nhạy cảm; cơ chế resume chỉ được thêm nếu backend cung cấp contract an toàn.
