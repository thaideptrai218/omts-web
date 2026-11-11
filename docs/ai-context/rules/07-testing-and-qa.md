# 07 — Kiểm thử và QA

## Trước khi báo xong một nhiệm vụ Web
`npm run lint` → `npm run typecheck` → `npm test` → `npm run build`. Chạy tuần tự.
- Không chạy `dev` và `build` cùng lúc (cùng dùng `.next`).
- Windows: 1 worker Vitest, 2 worker Next build. Không bỏ qua test, không tăng timeout để cho qua.

## Script phụ
| Script | Ghi chú |
| --- | --- |
| `test:session-pages` | Chạy sau build |
| `test:boundary`, `test:serialization`, `test:cookies`, `test:cookies:serve` | Kiểm tra fixture cô lập |
| `test:redis` | Cần `OMTS_TEST_REDIS_URL` trên Redis riêng ≥ 6.2; không đặt thì fail. `npm test` bỏ qua suite Redis thật. **Không bao giờ trỏ vào Redis production** |
| `test:api-roles` | Kiểm tra vai trò chỉ đọc bằng tài khoản demo local; mật khẩu qua `OMTS_QA_PASSWORD` trong terminal. Dùng thêm `OMTS_QA_WEB_ORIGIN`, `OMTS_QA_BRANCH_API`, `OMTS_QA_SALES_WORKFORCE`, tùy chọn `OMTS_QA_REPORT` (đường dẫn bị ignore dưới `docs/learning`) |
| `setup:api`, `start:api`, `dev:api` | Khởi chạy API workspace |

## Kỷ luật bằng chứng
- Báo pass/fail/skip trung thực. Không tính lần chạy bị treo/thiếu tài nguyên là PASS.
- Không suy ra 360/1024 px từ viewport chưa thực sự kiểm.
- Kết quả local không phải CI của SHA mới; CI được xác minh theo đúng SHA (`docs/reports/WEB_CI_*`).
- Mock pass không chứng minh backend/QA pass.

## Vệ sinh dữ liệu QA
- Dùng bản ghi tên QA; không sửa thông tin đăng nhập, grant, liên hệ của seed.
- Không reset DB, không `docker compose down -v`, không xóa volume khi cần giữ bản ghi của tester.
- Khôi phục dữ liệu seed đã đổi; đăng xuất phiên test.
- Không ghi dữ liệu nghiệp vụ vào runtime chính cổng 8080.
- Thay đổi mật khẩu/liên hệ chỉ trên tài khoản QA chỉ định.
- Không chạy seed có cờ mật khẩu/đã xác minh lên dữ liệu dùng chung; không thu hồi grant seed để qua preflight migration.

## Runtime
| Runtime | API | SQL | Ghi chú |
| --- | --- | --- | --- |
| `omts` (develop/cũ) | 8080 | 1433 | |
| `omts-integration` (QA) | 8081 | 1435 | |
| `omts-latest-qa` | 8082 | 1436 | Contract mới nhất, tách biệt |

- Redis cổng 6380; DB họp `OMTS_MEETING_20261106` chạy trên 8082.
- Cổng Web: 3000 (mock), 3002 (API so sánh develop), 3003 (QA nhánh, 127.0.0.1).
- Vercel chỉ chạy mock.

## Nhà cung cấp giả
OTP dùng Fake provider của backend; OCR dùng Fake provider; proxy tệp chỉ hỗ trợ lưu trữ Local.

Tài khoản demo và bản ghi QA: xem [`../progress/qa-accounts-and-data.md`](../progress/qa-accounts-and-data.md).
