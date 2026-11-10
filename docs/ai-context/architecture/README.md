# ARCHITECTURE — Kiến trúc kỹ thuật

Quét read-only ngày 09/11/2026 (nhánh `experiment/wireframe-cycle-redesign-20261107`). Không đọc `.env*`; biến môi trường chỉ ghi **tên**. Số test là đếm tĩnh, chưa chạy.

| File | Nội dung |
| --- | --- |
| [01-tech-stack.md](01-tech-stack.md) | Công nghệ và phiên bản |
| [02-directory-map.md](02-directory-map.md) | Cấu trúc thư mục |
| [03-data-source-switching.md](03-data-source-switching.md) | Mock ↔ API, mẫu repository |
| [04-bff-routes.md](04-bff-routes.md) | Từng route BFF → endpoint backend, quyền |
| [05-session-and-auth.md](05-session-and-auth.md) | Cookie, Redis, ledger đăng nhập, CSRF, OTP |
| [06-error-handling.md](06-error-handling.md) | Mã thông báo, ghi không chắc chắn, rowVersion |
| [07-scripts-ci-tests.md](07-scripts-ci-tests.md) | Script npm, CI, bố cục test, cách chạy local |
| [08-security-measures.md](08-security-measures.md) | Biện pháp bảo mật hiện có |
| [09-open-technical-questions.md](09-open-technical-questions.md) | Câu hỏi kỹ thuật còn mở |
