# Phase 3 – Báo cáo Khách hàng (BE có sẵn)

KiotViet: "Hàng bán theo khách" và "Công nợ".

## BE có sẵn
- Hàng bán theo khách: `GET api/reports/sales-performance?groupBy=customer` (có thêm NetMoneyReceived, Receivable, OwedBack, NetDebt).
- Chi tiết hàng theo 1 khách: cùng endpoint `groupBy=product&customerIds=<id>`.
- Công nợ: `GET api/customer-debts`, `/{customerId}`, `/{customerId}/statement`, `/export`. Web đã có `src/features/customer-debts-api/` (contracts, repository, access) + BFF `src/server/workspace/customer-debts-http.ts` **nhưng chưa có màn**.

## Web
1. Key `customer-report`, màn `customer-report-screen.tsx` trong `src/features/sales-reports/` với 2 tab:
   - **Hàng bán theo khách**: lọc kỳ/vùng/khách; bảng Khách · Số HĐ · Kg · Doanh thu thuần · Đã thu · Còn nợ; biểu đồ cột top 10 khách theo doanh thu thuần; mở dòng → bảng sản phẩm của khách.
   - **Công nợ**: dùng `customer-debts-api` repository; bảng Khách · Nợ đầu kỳ · Phát sinh · Đã thu · Nợ cuối kỳ (theo field thực của DTO); bấm → sổ chi tiết (`statement`); xuất Excel.
2. Khách vãng lai (CustomerId null) gom 1 dòng "Khách lẻ".
3. Quyền: tab Công nợ cần `CUSTOMER_DEBTS` View; thiếu quyền thì ẩn tab.

## Xong khi
- Tổng "Còn nợ" khớp màn công nợ khách/hóa đơn.
- lint/typecheck/vitest pass.
