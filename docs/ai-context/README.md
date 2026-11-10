# Bộ tài liệu ngữ cảnh cho AI (`docs/ai-context/`)

Sáu thư mục, mỗi thư mục một mục đích, bên trong tách thành nhiều file nhỏ theo chủ đề để dễ tìm và dễ đọc. AI và thành viên mới đọc theo thứ tự dưới đây trước khi làm việc.

| # | Thư mục | Trả lời câu hỏi | Số file |
| --- | --- | --- | --- |
| 1 | [prd/](prd/README.md) | Đang xây gì, cho ai: phạm vi, actor, route, thực thể, dashboard | 9 |
| 2 | [architecture/](architecture/README.md) | Công nghệ, cấu trúc thư mục, luồng dữ liệu, BFF, phiên, lỗi, CI, bảo mật | 10 |
| 3 | [design/](design/README.md) | Màu, font, component, khung giao diện, mẫu, thuật ngữ, thương hiệu | 9 |
| 4 | [rules/](rules/README.md) | Quy tắc viết code và điều AI tuyệt đối không được làm | 11 |
| 5 | [tasks/](tasks/README.md) | Quy trình từng bước nhỏ, backlog (chờ backend / web-only / cần quyết định) | 7 |
| 6 | [progress/](progress/README.md) | Đã xong, đang lỗi, bước tiếp theo, dòng thời gian, quyết định, Git, tài khoản QA | 7 |

## Thứ tự đọc gợi ý
1. `rules/10-ai-must-never.md` và `rules/09-decisions-requiring-confirmation.md` — biết giới hạn trước.
2. `prd/01-overview-and-scope.md` → `prd/02-actors-roles-permissions.md`.
3. `architecture/03-data-source-switching.md` → `architecture/04-bff-routes.md`.
4. `design/README.md` → `design/08-known-inconsistencies.md`.
5. `progress/01-current-state.md` → `tasks/` để chọn bước tiếp theo.

## Nguồn sự thật và cách giữ cho đúng
- Nguồn chính vẫn là [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md), [`../../AGENTS.md`](../../AGENTS.md), [`../../README.md`](../../README.md), `../decisions/` và code. Bộ này là bản tóm tắt có cấu trúc; khi mâu thuẫn, các nguồn đó thắng.
- Được quét từ source ngày **09/11/2026**, nhánh `experiment/wireframe-cycle-redesign-20261107`. Số test là đếm tĩnh, chưa chạy lại.
- Sau mỗi nhiệm vụ: cập nhật `progress/` và `tasks/`. Chỉ sửa `prd/`, `architecture/`, `design/`, `rules/` khi code hoặc quyết định thật sự đổi.
- Không chép mật khẩu, khóa, token vào đây. Biến môi trường chỉ ghi tên.
- Mỗi thư mục có phần câu hỏi/chỗ chưa nhất quán còn mở (`prd/08`, `architecture/09`, `design/08`, `progress/04`); đừng tự giải quyết mà chưa hỏi người dùng.
