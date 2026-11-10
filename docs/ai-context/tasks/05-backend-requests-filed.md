# 05 — Yêu cầu Web đã gửi backend

Nguồn: `docs/reports/BACKEND_API_REQUESTS_FROM_WEB_2026-11-09.md` và các `TODO(api)` trong `src/features/**`.

## A. Cần để hoàn thiện luồng đã dựng
- **A1** `GET /api/me/sales-invoices` (+ `/{id}`) không lộ giá nội bộ.
- **A2** merge `OMTS-224-correct-cancel`.
- **A3** merge `OMTS-225-claim-submit-respond`.
- **A4** workforce và nghỉ phép trên `develop`.
- **A5** `PublicBaseUrl` backend = origin Web (QR dẫn tới `/origin/{token}`).
- **A6** mã thông báo MSG-SALE-13/14/20/21 và MSG-CLAIM-03 trong catalog dùng chung.

## B. Màn đã có khung nhưng chưa có API
- **B1** trả hàng bán (SCR-CLAIM-03).
- **B2** bảng lương (LABOR-10).
- **B3** chi lương (LABOR-11).
- **B4** báo cáo bán hàng REPORT-01/02/03 và số liệu tổng hợp dashboard (doanh thu, công nợ phải thu, cảnh báo nước, việc chờ).

## C. Việc nhỏ
- Tên tệp in/xuất qua `Content-Disposition`.
- Mã trạng thái vùng ổn định.
- Lỗi 400 nêu tên trường.

## Khác
- Nhật ký hoạt động Manager `GET /api/zones/{zoneId}/activity` (đề xuất, chưa công bố).
- Hợp đồng đánh dấu thu hoạch (OMTS-221).
- Endpoint danh sách hóa đơn bán (SALE-05): chỉ có `GET /{id}`.
- Xóa chứng nhận nguyên tử theo ID/version.
- Sự kiện và thông báo để Owner nhận phiếu nhập.
- Nhánh chưa vào develop: origin page (`OMTS-222-origin-page`), rút công bố (`trace-withdraw`), VietQR webhook (`OMTS-224-vietqr-webhook`).
- Chặn Add/Copy vai trò cho vai cố định; rủi ro di chuyển grant.

## Câu hỏi chưa được trả lời
- Trader có thấy giá trên hóa đơn của mình không?
- Lương có cho trả từng phần nhiều lần không?
- Thứ tự merge OMTS-224 và OMTS-225, vốn xung đột cột migration `ExpiredReminderSentAt`?
