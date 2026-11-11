# 01 — Quy trình mỗi task

## Trước khi code
1. Đọc `README.md`, `docs/PROJECT_CONTEXT.md` (mục mới nhất ở trên cùng), quyết định liên quan trong `docs/decisions/`, use case SRS.
2. Xác nhận task không chạm danh sách "bắt buộc hỏi" ([`../rules/09-decisions-requiring-confirmation.md`](../rules/09-decisions-requiring-confirmation.md)). Nếu chạm → hỏi người dùng, chờ duyệt.
3. Xác định backend đã có endpoint chưa (so với `docs/reports/BACKEND_API_REQUESTS_FROM_WEB_2026-11-09.md`). Chưa có → không bịa API; chỉ ghi `TODO(api)` và yêu cầu backend.
4. Giải thích cho người dùng: là gì, vì sao, luồng dữ liệu, câu hỏi bảo vệ.
5. Đọc tài liệu Next.js trong `node_modules/next/dist/docs/` nếu đụng API Next.

## Khi code
- Nhánh `feature/OMTS-<n>-<slug>` hoặc `fix/...` từ `develop` (một Jira/module = một nhánh + một PR).
- Dữ liệu qua service → repository interface → adapter mock/API.
- Chữ giao diện tiếng Việt; trạng thái đủ loading/empty/error/denied; số chưa biết là `null`.
- File < ~200 dòng; tên kebab-case; sửa file có sẵn.
- Ghi không chắc chắn: giữ nháp, chặn gửi lại, không replay.

## Kiểm chứng (bắt buộc, tuần tự)
```
npm run lint
npm run typecheck
npm test
npm run build
```
Cộng `npm run test:session-pages` sau build nếu đụng phiên/route; `test:boundary`, `test:serialization`, `test:cookies` nếu đụng ranh giới server/cookie. Không chạy `dev` và `build` cùng lúc. Báo pass/fail/skip trung thực.

Kiểm tay ở 360 px và 1024 px cho luồng quan trọng; ghi rõ cái nào **chưa** kiểm.

## Sau khi code
- Cập nhật `docs/reports/` (bằng chứng), `docs/PROJECT_CONTEXT.md` (mục mới trên cùng) nếu thay đổi trạng thái dự án.
- Cập nhật [`../progress/`](../progress/README.md) và tick backlog ở các file cùng thư mục này.
- Commit conventional kèm khóa Jira: `type(scope): imperative summary [OMTS-n]`; không nhắc AI; không commit bí mật.
- PR vào `develop`; điều kiện merge: 1 review + `build-test`, `gitleaks`, `pr-title`.
- Ghi chú học tập (nếu có) chỉ vào `docs/learning/` (ignore).

## Checklist hoàn thành
- [ ] Đúng quyết định đã duyệt và SRS
- [ ] Không bịa API/số liệu
- [ ] lint, typecheck, test, build qua
- [ ] Đã kiểm 360/1024 px (hoặc ghi rõ chưa kiểm)
- [ ] Không có bí mật trong diff
- [ ] Báo cáo/progress đã cập nhật
