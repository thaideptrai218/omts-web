# Plan: Báo cáo kiểu KiotViet cho OMTS (web)

Tham chiếu: `docs/reports/kiotviet-bao-cao/tong-quan.md`, `docs/reports/kiotviet-bao-cao/bao-cao.md` (chỉ phần web, đã bỏ mobile/POS và "Kênh bán hàng").
Repo: web `D:\Đồ_án\omts-web`, backend `D:\Đồ_án\omts-backend` (Api → Application → Infrastructure → Domain).
Nhánh: tạo nhánh mới từ `develop` (vd `feature/OMTS-227-reports`), không làm chung nhánh harvest.

## Đối chiếu KiotViet → OMTS

| KiotViet | OMTS hiện có | Việc cần làm |
|---|---|---|
| Tổng quan | `/dashboard`: Owner thấy `OwnerOverview` **số mẫu cứng**; BE có `GET api/dashboard` (Owner) | Nối API thật, bổ sung so sánh hôm qua, biểu đồ, top 10, thông báo, hoạt động gần đây |
| Cuối ngày | Không có | BE mới `api/reports/end-of-day` + màn mới |
| Bán hàng | Màn `SalesPerformanceScreen` **chỉ khung**; BE `api/reports/sales-performance` **đã có** | Nối web với BE có sẵn |
| Hàng hóa | BE có sales-performance groupBy=product, price-trends, movements từng SP | BE mới tổng hợp xuất-nhập-tồn; màn mới. Bỏ "Hạn sử dụng" (hàu sống) |
| Khách hàng | BE sales-performance groupBy=customer (có công nợ) + `api/customer-debts` **chưa có màn** | Màn mới dùng BE có sẵn |
| Nhà cung cấp | Màn `supplier-debts` có; chưa có hàng nhập theo NCC | BE mới `api/reports/purchases`; màn mới. Bỏ VAT |
| Tài chính | Không có; có dữ liệu sổ quỹ, lương, xuất vật tư | BE mới `api/reports/financial` (KQKD) + màn mới |
| Kênh bán hàng | — | **Bỏ** (user chốt) |

Giữ nguyên các báo cáo đặc thù đã có: Xu hướng giá, Vấn đề sau bán, Sản lượng nuôi.

## Phases (làm theo thứ tự)

| # | Phase | BE | Trạng thái |
|---|---|---|---|
| 0 | [Quyết định cần chốt](phase-00-decisions.md) | — | **Chờ user** |
| 1 | [Nền tảng web: khung, bộ lọc, biểu đồ, menu](phase-01-web-foundation.md) | không | todo |
| 2 | [Báo cáo Bán hàng](phase-02-sales-report.md) | có sẵn | todo |
| 3 | [Báo cáo Khách hàng](phase-03-customer-report.md) | có sẵn | todo |
| 4 | [Tổng quan](phase-04-overview-dashboard.md) | mở rộng | todo |
| 5 | [Báo cáo Hàng hóa](phase-05-product-report.md) | mới (tồn) | todo |
| 6 | [Báo cáo Nhà cung cấp](phase-06-supplier-report.md) | mới | todo |
| 7 | [Báo cáo Cuối ngày](phase-07-end-of-day-report.md) | mới | todo |
| 8 | [Báo cáo Tài chính](phase-08-financial-report.md) | mới | todo |
| 9 | [Kiểm tra cuối](phase-09-verification.md) | — | todo |

Phase 2–3 chỉ cần web → làm trước để có kết quả sớm. Phase 4–8 cần sửa BE: viết BE trước, chạy API, rồi web.

## Quy ước chung (mọi phase)
- Web: theo `AGENTS.md`; báo cáo là `operationModules` key + nhánh trong `operation-screen.tsx`, BFF qua `src/server/operations/*-plan.ts` (zod `strictObject`), contract ở `src/features/<feature>/contracts.ts`.
- BE: theo mẫu `Application/Features/Reports/SalesPerformance/` (Service, Calculator, ExportService, Dtos) + `I<Name>Query` / `Infrastructure/Persistence/Queries/<Name>Query.cs`; lọc kỳ/vùng qua `ReportFilterResolver`; trả MSG-GEN-10 khi rỗng; xuất xlsx qua `ReportExportFile`.
- Ngày theo UTC+7 (`InvoiceDate` là DateOnly). Tiền VND, khối lượng kg.
- Không thêm dữ liệu giả trên màn; trạng thái loading (skeleton), rỗng, lỗi, không có quyền.
- Mỗi phase xong: `npm run lint`, `npm run typecheck`, vitest thư mục liên quan; BE `dotnet build`. Không viết test dài, không CI.
- Không `docker compose down -v`.

## Rủi ro chính
- Giá vốn không có sẵn → Lợi nhuận phụ thuộc quyết định phase 0.
- Thanh toán/sổ quỹ không có vùng → lọc theo vùng chỉ áp cho hóa đơn/lô.
