# Báo cáo kiểu KiotViet – ghi chú tạm (19/11/2026)

Plan chi tiết: `plans/261119-0100-GH-227-kiotviet-style-reports/`. Tham chiếu: `docs/reports/kiotviet-bao-cao/`.

## Đã làm
- Web: Tổng quan (số thật), Cuối ngày, Bán hàng, Hàng hóa, Khách hàng, Nhà cung cấp, Tài chính; biểu đồ `recharts@3.10.1` (cả Sản lượng nuôi).
- Backend: API `product-stock`, `purchases`, `end-of-day`, `financial`; `api/dashboard` thêm `today`/`yesterday`/`dueDebts`; Kế toán xem được báo cáo (REP-01).
- Xuất PDF + Excel kiểu KiotViet cho **Cuối ngày** (QuestPDF + Noto Sans nhúng; ClosedXML).

## Chưa làm / cần quyết
- Áp nút "Tải xuống" (PDF/Excel) cho 6 báo cáo còn lại (dùng `ReportDocument` + `export-menu.tsx`, xem cuối báo cáo của agent trong plan).
- Báo cáo Nuôi trồng (phase 10): nước, bè/luống hỏng, hao hụt, thăm bè; theo ngày/tuần/tháng. Hỏi: có thêm ô nhập "số hàu chết" (đổi nghiệp vụ, cần PM) không; chỉ xem trên web hay tự gửi định kỳ.
- Dòng lọc "Người tạo" trong PDF nên hiện tên người; chân trang nên là tên vùng khi lọc vùng?
- Kế toán chỉ phụ trách một vùng đang bị 403 ở báo cáo toàn HTX (dashboard, product-stock, financial): có cho xem số lọc theo vùng không?
- Chiết khấu thanh toán trong "giảm trừ" của Tài chính làm doanh thu thuần lệch Bán hàng khi có chiết khấu: giữ hay bỏ?
- Quyền: web Nhà cung cấp kiểm `SALES_REPORTS`, backend `SUPPLIER_PAYMENTS`.

## Chưa kiểm tra
- Giao diện bằng trình duyệt ở 360px/1024px, biểu đồ, nút Tải xuống, in Cuối ngày (đang lệch phải), mở xlsx bằng Excel thật.
- Test tích hợp backend của dashboard vỡ từ trước do luật "thu hoạch phải có kế hoạch" (MSG-HARVEST-06); chưa sửa.
- Chưa chạy `npm run build`.
