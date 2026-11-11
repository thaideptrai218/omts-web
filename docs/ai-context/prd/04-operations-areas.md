# 04 — Các area của `/operations/[area]`

Nguồn: `operationModules` trong `features/operations/permissions.ts`.

| area | Tiêu đề | Gate (`functionCode` / ghi chú) | Màn hình |
| --- | --- | --- | --- |
| `job-types` | Loại công việc và đơn giá | `PAY_RULES` | `labor-api/job-types-screen` |
| `seeding` | Thả giống | `CULTIVATION_CYCLES` | `cultivation-api/records-screen` |
| `material-usages` | Sử dụng vật tư | `CULTIVATION_CYCLES` | như trên |
| `harvest` | Thu hoạch | `HARVESTS` | như trên |
| `cultivation-cycles` | Chu kỳ nuôi | `CULTIVATION_CYCLES` (nav trỏ `/farming/cycles`) | `cultivation-api/screen` |
| `purchase-receipts` | Phiếu nhập vật tư | `PURCHASE_RECEIPTS` | `operations/receipt-screen` hoặc `purchasing-v2` |
| `supplier-payments` | Thanh toán nhà cung cấp | `SUPPLIER_PAYMENTS` (chỉ grant all-zones) | `operations/payment-screen` hoặc v2 |
| `water` | Theo dõi chất lượng nước | `WATER_MEASUREMENTS` | `operations/water-screen` |
| `sales-products` | Danh mục sản phẩm hàu | Owner; Trader (View); Staff có `SALES_INVOICES.Create` (View) | `sales-api/products-screen` |
| `sales-invoices` | Lập hóa đơn bán | `SALES_INVOICES` | `sales-invoices/invoice-screen` |
| `sales-invoice-list` | Hóa đơn bán | `SALES_INVOICES` | `sales-invoice-list` |
| `customer-payments` | Thanh toán của khách | `CUSTOMER_PAYMENTS` (toàn HTX) | `customer-payments` |
| `lot-tracing` | Truy xuất lô hàng | `LOT_TRACING`; Publish/Correct dùng `PROVENANCE` | `lot-tracing` |
| `harvest-yield` | Sản lượng nuôi | `HARVEST_LOTS` | `harvest-yield` |
| `payroll-settings` | Thiết lập kỳ lương | Chỉ Owner | `payroll-settings` |
| `payroll` | Bảng lương | `PAYROLL` | `payroll` — **FRAME ONLY** |
| `payroll-payments` | Thanh toán lương | `PAYROLL` | `payroll` — **FRAME ONLY** |
| `claim-reports` | Báo vấn đề chất lượng | Chỉ Trader | `quality-claims/claim-report-screen` |
| `quality-claims` | Khiếu nại chất lượng | `QUALITY_CLAIMS` | `quality-claims` |
| `sales-returns` | Phiếu trả hàng bán | `SALES_RETURNS` | `sales-returns` — **FRAME ONLY** |
| `sales-report` | Hiệu quả bán hàng | `SALES_REPORTS` | `sales-reports` — **FRAME ONLY** |
| `price-trend-report` | Xu hướng giá | `SALES_REPORTS` | **FRAME ONLY** |
| `after-sales-report` | Vấn đề sau bán | `SALES_REPORTS` | **FRAME ONLY** |
| `purchase-requests` | Yêu cầu mua hàu | Trader (xem/gửi/hủy của mình); Owner; Staff `PURCHASE_REQUESTS.View` + `AssignedZone` | `operations/new-module-screens` |
| `workforce` | Phân công và chấm công | `WORK_ASSIGNMENTS`/`ATTENDANCE`, AssignedZone | `operations/workforce-screen` (mock: `workforce-demo`) |
| `my-work` | Công việc và nghỉ phép | Staff | `operations/my-work-screen` |

Ghi chú: `payroll`, `payroll-payments`, `sales-returns`, `sales-report`, `price-trend-report`, `after-sales-report` có trong `operationModules` nhưng chưa tìm thấy plan tương ứng trong `src/server/operations` — chưa rõ chỉ là mock hay do quét sót.
