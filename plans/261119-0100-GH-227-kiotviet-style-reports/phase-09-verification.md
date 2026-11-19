# Phase 9 – Kiểm tra cuối

1. BE: rebuild API (`docker compose -p omts up -d --build api`, **không** `-v`), gọi thử từng endpoint mới với tài khoản owner / Demo@1234.
2. Web: `npm run lint`, `npm run typecheck`, `npm run build`.
3. Mở từng màn ở 1024px và 360px: bộ lọc, biểu đồ, bảng cuộn ngang, xuất Excel tải được file, trạng thái rỗng/lỗi/không quyền (đăng nhập tài khoản không có `SALES_REPORTS`).
4. Đối chiếu số: Bán hàng ↔ danh sách hóa đơn; Khách hàng ↔ công nợ; Hàng hóa tồn ↔ biến động SP; Cuối ngày ↔ sổ quỹ; Tài chính ↔ Bán hàng + bảng lương.
5. Viết báo cáo ngắn `docs/reports/REPORTS_KIOTVIET_STYLE_<ngày>.md`: màn đã làm, endpoint mới, quyết định D1–D7 đã áp, câu hỏi còn mở.
6. Commit theo conventional commit `[OMTS-227]`, push, PR vào `develop` (BE + web) khi user yêu cầu.
