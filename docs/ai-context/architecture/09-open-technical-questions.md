# 09 — Câu hỏi kỹ thuật còn mở

1. **Rate limiting ở lớp Web**: không tìm thấy. Có chủ ý để backend/tường lửa nền tảng (vd Vercel WAF) xử lý không?
2. **Header bảo mật toàn app** (CSP, HSTS, frame-ancestors, Referrer-Policy): không có `headers()` trong `next.config.ts`, không có middleware/proxy. Có cấu hình trên Vercel không? Thư mục `.vercel` ở gốc repo chưa được kiểm.
3. **Header phản hồi `/api/auth/*`**: `api-auth-http.ts` đặt `no-store`, `Vary: Cookie`, nosniff trên một đối tượng `Headers` dùng chung; chưa kiểm bằng test xem có áp ở mọi nhánh không.
4. **Area chưa thấy plan server**: `sales-returns`, `payroll`, `payroll-payments`, `sales-report`, `price-trend-report`, `after-sales-report` có trong `operationAreas`/`operationModules` nhưng không có plan tương ứng ở `src/server/operations`. Chỉ mock hay quét sót?
5. **`login-http.ts`** ghi "Not mounted in src/app" — mã chết để dành cho route tương lai? `api-auth-http.ts` mới là đường được mount; `recover` trong `session-http.ts` cũng chỉ dùng một phần.
6. **Refresh token tắt có chủ ý** (README). Có bản ghi quyết định về thời điểm bật không? Xem `docs/decisions/WEB_LOGIN_CONCURRENCY_PROPOSAL.md`, `WEB_LOGIN_COORDINATION_PROTOCOL_PROPOSAL.md`.
7. **Cookie khi ngữ cảnh ledger hết hạn lúc flow xác minh đang `pending`**: xử lý thành `unknown` nhưng đường phục hồi cho người dùng chưa được lần theo.
8. **Tổng số endpoint backend được BFF proxy**: chỉ lấy mẫu từ các file plan; `new-module-plan.ts`, `purchasing-v2-plan.ts` còn nhiều path hơn đã liệt kê.
9. **CI chỉ chạy `test:session-pages`**. Nên đưa `test:boundary`, `test:serialization`, `test:cookies` thành cổng CI vì chúng đỡ cho các tuyên bố bảo mật?
10. **Số test là đếm tĩnh** (336 file, ~1.953 lệnh); chưa chạy nên chưa có số pass thật. Báo cáo gần nhất ghi vitest 3.214 passed (`WEB_SALES_PAYMENTS_LANDING_2026-11-09.md`) — hai số không cùng nguồn.
11. **Nhánh**: cây làm việc đang ở `experiment/wireframe-cycle-redesign-20261107`, không phải `develop`; kiểm kê này phản ánh nhánh đó.
