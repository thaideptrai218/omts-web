# Phase 1 — Sửa danh mục quyền web (ưu tiên cao, trước demo)

**Ưu tiên:** Cao · **Rủi ro:** Thấp · **Đụng:** web only · **Trạng thái:** Chờ

## Mục tiêu
Manager/Kế toán thấy đúng các màn backend đã cấp. Không đổi quyền backend.

## File
Sửa:
- `src/features/access/domain/backend-function-catalog.ts` — thêm HARVEST_PLANS (VCEDX), SALES_ORDERS (VCEDX), INPUT_ISSUES (VCEDX), INPUT_DISPOSALS (VX), PRODUCT_DISPOSALS (VCEDX), CASH_BOOK (VCEDX), CASH_BOOK_SETTINGS (VE); PURCHASE_REQUESTS bổ sung action đúng như backend `PermissionFunctions.cs:68-107`. Đánh dấu CoopWide theo backend.
- `src/shared/presentation/actor-label.ts:26` — `PAYROLLS` → `PAYROLL`.
- `src/features/api-workspace/api-workspace-shell.tsx` — gate `/employees`: LABOR_WORKERS View là đủ (bỏ yêu cầu PAYROLL); xem lại `financeWorkspace` để Kế toán không mất nhóm cần thiết.
- Các gate `holds(...)` liên quan (harvest-plans, inputs uses/disposals, sales orders/disposals, cash-book) — xác nhận chạy đúng sau khi catalog có mã.
- Mock: thêm fixture `ketoan` (ACCOUNTANT, tất cả vùng) vào `auth/repositories/mock-auth-fixtures.ts`, `shared/mocks/mock-identities.ts`.
- Kiểm `/audit`, `/cooperative/certifications` bọc `ApiPage` (nếu crash ở mock).

Test: `collect-function-permissions` test (thêm case mã mới cho Staff), test nhãn vai trò, test shell menu nếu có.

## Bước
1. Đối chiếu từng mã/action với `PermissionFunctions.cs` + `FixedRoles.cs` (bảng ở research §3).
2. Thêm mã vào catalog; thêm unit test: Staff có grant ZONE_MANAGER nhận HARVEST_PLANS View, SALES_ORDERS VCE.
3. Sửa nhãn PAYROLL, gate employees.
4. Fixture Kế toán.
5. `tsc`, eslint file đổi, vitest file liên quan.

## Thành công khi
- Đăng nhập `quanlyvung1`: thấy Kế hoạch thu hoạch (chỉ xem), Đơn hàng, Xuất dùng, Hủy SP, Nhân viên.
- Đăng nhập Kế toán: thấy Sổ quỹ + thiết lập sổ quỹ; nhãn "Kế toán".
- Owner không đổi gì.

## Rủi ro
- Menu hiện màn mà nút hành động chưa gate đúng → backend vẫn 403; kiểm nút Create/Edit dùng action, không chỉ View.
