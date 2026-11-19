# Phase 8 – Báo cáo Tài chính (kết quả kinh doanh)

KiotViet: Doanh thu, Giá vốn, Chi phí → Lợi nhuận. OMTS theo D2: chi phí thực phát sinh trong kỳ, chưa phân bổ giá vốn theo kg.

## BE mới: `GET api/reports/financial`
- `Application/Features/Reports/Financial/` + `IFinancialReportQuery` + query EF. **Chỉ Chủ HTX** (attribute như `OperationsDashboardController`).
- Params: `from`, `to`, `unit` (month|quarter|year) → cột theo kỳ + cột tổng.
- Dòng (mỗi dòng có mã để web hiển thị nhãn):
  1. Doanh thu bán hàng (SalesInvoice Completed: Subtotal + OtherCharges)
  2. Giảm trừ: chiết khấu HĐ (DiscountAmount), giảm giá sau bán (PriceCutTotal), trả hàng (SalesReturn.Value), chiết khấu thanh toán (CustomerPayment.DiscountAmount)
  3. **Doanh thu thuần** = 1 − 2
  4. Chi phí sản xuất: giống + vật tư đã xuất dùng (InputIssue Kind=Use, Σ Value) ; hủy vật tư (Kind=Disposal)
  5. Chi phí nhân công: lương đã chốt theo tháng chi phí (PayrollLine.Net hoặc MainPay+Bonus−Deduction – chọn 1, ghi rõ)
  6. Chi phí khác: CashVoucher Category=OtherExpense
  7. Thu nhập khác: CashVoucher Category=OtherIncome
  8. **Lợi nhuận** = 3 − 4 − 5 − 6 + 7
- Không tính nhập mua (PurchaseReceipt) vào chi phí để tránh đếm 2 lần với xuất dùng; ghi chú trong DTO/MSG.
- Calculator thuần; `/export` xlsx.

## Web
1. Key `financial-report` (chỉ Owner thấy), màn `src/features/sales-reports/financial-report-screen.tsx`.
2. Bảng dọc kiểu KQKD: dòng chỉ tiêu, cột kỳ; dòng 3 và 8 in đậm; số âm đỏ.
3. Biểu đồ đường Doanh thu thuần vs Lợi nhuận theo kỳ.
4. Chú thích ngắn dưới bảng: "Chi phí tính theo phát sinh trong kỳ, chưa phân bổ giá vốn theo từng kg hàu".

## Xong khi
- Doanh thu thuần khớp báo cáo Bán hàng cùng kỳ; chi phí lương khớp bảng lương đã chốt.
- `dotnet build`; lint/typecheck/vitest pass.
