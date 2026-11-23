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

## Truy xuất – sửa ngày 19/11/2026
- Đã sửa trong mã, CHƯA biên dịch/chạy (phiên không có shell): gỡ `/api/origin/{token}`; BFF chuyển IP + secret; 404 thật qua `src/proxy.ts`; kg cân cảng ở trace nội bộ; lọc thả giống theo ngày thu hoạch; ảnh QR (bộ mã hóa tự viết `features/invoice-qr`) + nhãn in; tên HTX đọc từ `GET api/public/cooperative-brand`.
- Việc còn lại: build API (`docker compose -p omts up -d --build api`), đổi tên HTX trong DB, chạy lint/typecheck, quét thử QR bằng điện thoại.
- Dọn tiếp: xóa `PublicOriginService`, `IPublicOriginQuery`, `PublicOriginQuery`, `PublicOriginView` và test `PublicOriginTests.cs` (endpoint đã gỡ).

## Nhân sự + truy xuất – đợt 19/11/2026 (chưa commit)
- Plan: `plans/261119-1500-GH-227-hr-kiotviet-style/` (A, T, B, D đã làm; C chờ user chọn). Hợp đồng API: `reports/hr-backend-contracts.md`, `reports/hr-wave3-contracts.md`.
- Backend: EndsAt + migration `20261119150000_WorkAssignmentEndsAt`, ca qua đêm, lương gross trong báo cáo Tài chính, chặn hủy phiếu chi lương, Kế toán xem lương (View/Export), preview nghỉ việc + khóa tài khoản, xuất PDF/Excel bảng lương/phiếu lương/chi phí nhân công.
- Web: sửa chấm công, vào làm cả tổ, Staff, duyệt hàng loạt, chốt lương có lý do tiếng Việt, chi phí nhân công, thiết lập nhân sự, nghỉ việc an toàn, danh sách NV có giờ công + nợ lương, bảng lương kiểu KiotViet. Truy xuất: sơ đồ chuỗi, tra ngược từ lô giống, QR dùng bộ mã chung, tên HTX từ Cài đặt.
- Chưa kiểm: các thao tác ghi không hoàn tác (vào/ra hàng loạt, vào làm cả tổ, lưu sửa chấm công, duyệt hàng loạt, ca qua đêm) chỉ đọc code; 2 bài test giờ công mới chưa chạy; test tích hợp backend (quyền Kế toán, tài chính, crew minutes, dashboard) có thể vỡ.
- Sự cố: agent làm 2 phiếu thanh toán thử 1.000 đ trên dữ liệu demo rồi xóa bằng SQL (gồm audit); dãy số phiếu chi nhảy 2 số.
- Test web hỏng sẵn: `operations/workflow.test.tsx` (đóng hộp thanh toán NCC sau khi đổi giờ trả không hỏi xác nhận).

## Gop voi develop (PR #18, #19) - 19/11/2026
- Cuoi ngay: lay ban cua develop (PR #18: bang + giay, bon moi quan tam, loc ngay/gio hoac khoang) lam goc. Giu: `end-of-day-*`, `use-end-of-day-report.ts`, `report-page.tsx` (o tim kiem chi hien khi co `search`), `report-live.module.css`, `server/operations/end-of-day-report-plan.ts`. Bo `end-of-day-sections.tsx` (ban cu cua minh, khong con ai dung).
- Nut Tai xuong: mot component duy nhat o `components/ui/export-menu.tsx`; `sales-reports/export-menu.tsx` chi re-export (ma cua develop trung ban nay) de paper viewer cua develop khong phai doi import.
- Giu cua minh (develop chi co ban cu hon cua cung mot cong viec): cham cong/phan cong (sua cham cong, vao lam ca to, tab Staff, duyet hang loat, canh bao, ca qua dem), luong, chi phi nhan cong, thiet lap nhan su, `Idempotency-Key`, loi HR tieng Viet. Menu/quyen hop hai ben (`labor-costs`, `payroll-settings`, `hr-setup`).
- Sua test: `operations/workflow.test.tsx` "Thoi gian tra *" go ngay theo dang dd/MM/yyyy vi o thoi gian la bo chon ngay tieng Viet (khong con nhan chuoi ISO); logic nhap-chua-luu cua `PaymentEditor` khong doi.
- Lint: bo 5 bien khong dung trong test/harvest-plans.