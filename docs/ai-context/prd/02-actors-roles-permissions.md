# 02 — Actor, vai trò, quyền

## Actor theo SRS hiện hành
| Actor | `subjectType` (API) | Việc chính trên Web |
| --- | --- | --- |
| System Administrator | `SystemAdministrator` | Danh sách tài khoản, khóa/mở khóa, nhật ký quản trị; (mock) khởi tạo HTX |
| Cooperative Owner (Chủ nhiệm HTX) | `CooperativeOwner` | Hồ sơ HTX, nhân sự, tài khoản, quyền, vùng, bè, duyệt Trader, nhật ký, duyệt yêu cầu mua |
| Staff (Nhân viên) | `Staff` | Quyền theo grant vùng–vai trò; nhãn "Quản lý vùng" hoặc "Kế toán" suy từ quyền |
| Zone Manager | (grant `ZONE_MANAGER`) | Vận hành vùng được gán |
| Accountant | (grant `ACCOUNTANT`) | Xử lý phiếu nhập, thanh toán, công nợ, toàn HTX |
| Trader (Thương lái) | `Trader` | Đăng ký, đơn mua của tôi, báo vấn đề chất lượng |
| QR Viewer | không đăng nhập | Trang `/origin/[qrToken]` công khai |

`actor-label.ts` còn nhãn `Employee`, `PublicViewer` nhưng không nằm trong enum đăng nhập.

Nhãn Staff (`workspaceRoleLabel`): có `WORK_ASSIGNMENTS`/`WATER_MEASUREMENTS`/`PURCHASE_RECEIPTS`/`PURCHASE_REQUESTS` → "Quản lý vùng"; có `SUPPLIER_PAYMENTS`/`CUSTOMER_DEBTS`/`PAYROLLS` → "Kế toán".

## Vai trò cố định (quyết định 27/10/2026)
- Chỉ ba vai: **Quản lý vùng (`ZONE_MANAGER`), Kế toán (`ACCOUNTANT`), Nhân viên**.
- Owner sửa quyền và ngừng/kích hoạt vai; **không** thêm, sao chép, đổi tên.
- `roleCode` trong grant chỉ nhận `ZONE_MANAGER|ACCOUNTANT`; grant legacy thiếu `dataScope` bị `invalid-permissions` (test `fixed-role-contract.test.ts`).
- Quyết định 03/11: mỗi HTX một Owner và một Kế toán hiệu lực; Kế toán toàn HTX; Manager gửi phiếu thẳng Kế toán.

## Quyền ở chế độ mock (`EffectivePermissionKey`, 13 khóa)
`access.accounts.manage`, `access.roles.manage`, `cooperative.employees.manage`, `cooperative.profile.manage`, `platform.cooperative.provision`, `workspace.overview.view`, `farming.zones.view`, `farming.zones.manage`, `farming.rafts.view`, `workforce.assign`, `purchase.receipts.view`, `purchase.receipts.submit`, `supplier.payments.manage`.

Scope: `global | all-zones | zones[zoneIds]`. `hasEffectivePermission(access, key, zoneId?)` — thiếu `zoneId` chỉ để hiện menu, không phải quyền đọc mọi vùng; scope `zones` rỗng là false.

## Quyền ở chế độ API (`FunctionPermission`)
Cấu trúc `{functionCode, action, scope(all-zones|zones), dataScope(OwnRecords|AssignedZone)}`.
`FunctionAction`: `View, Create, Edit, Delete, Export, Import, Approve, Publish`.

Catalog backend (`access/domain/backend-function-catalog.ts`, 28 mã; `*` = toàn HTX, không theo vùng):
- Nuôi trồng: `CULTIVATION_CYCLES`, `CULTIVATION_LOGS`, `WATER_MEASUREMENTS`, `HARVESTS`, `HARVEST_LOTS`, `LOT_TRACING`, `PROVENANCE` (có Publish).
- Mua hàng: `SUPPLIERS*`, `PURCHASE_RECEIPTS`, `SUPPLIER_PAYMENTS*`, `PURCHASE_REQUESTS`.
- Bán hàng: `SALES_RETURNS`, `SALES_INVOICES`, `SALES_REPORTS`, `CUSTOMERS*`, `CUSTOMER_PAYMENTS*`, `CUSTOMER_DEBTS*`, `QUALITY_CLAIMS`.
- Lao động: `LABOR_WORKERS`, `WORK_ASSIGNMENTS`, `ATTENDANCE`, `PAY_RULES*`, `PAYROLL*`.
- Dashboard (View): `DASHBOARD_DAILY_REVENUE`, `DASHBOARD_RECEIVABLES`, `DASHBOARD_OPEN_HARVEST_LOTS`, `DASHBOARD_WATER_ALERTS`, `DASHBOARD_PENDING_TASKS`.
- Lưu ý: catalog là "Snapshot 48ae1e0/PermissionFunctions.cs, không phải ma trận vai trò mặc định đã được BA duyệt"; không function nào gắn với `platform.cooperative.provision`.

## Cách gate
- Owner (API) nhận 4 khóa `access.accounts.manage`, `access.roles.manage`, `cooperative.employees.manage`, `cooperative.profile.manage` (all-zones) vì 4 endpoint đó có `RequireCooperativeOwner`.
- `workspace.overview.view` chỉ cấp khi có ít nhất một tile dashboard View; scope là hợp các zone của tile.
- `resourceAllowed` (`api-workspace/resources.ts`): Owner luôn được; `ownerOnly` (employees, accounts, roles) chặn Staff; `input-items` Staff chỉ View khi có View trên `PURCHASE_RECEIPTS`/`SUPPLIER_PAYMENTS`/`CULTIVATION_CYCLES`; `suppliers`/`customers` theo `functionCode`+action; `zones`/`rafts` Staff View mặc định (backend lọc vùng).
- `operationAllowed` (`operations/permissions.ts`): Owner được hầu hết; Trader chỉ `claim-reports`, `sales-products` (View), `purchase-requests` (View/Mine/Submit/CancelMine); Staff `OwnRecords` mà không có `AssignedZone` che phủ cùng scope bị từ chối (guard INP/ENV backend giới hạn vùng nhưng không lọc OwnRecords); `supplier-payments` cần grant `all-zones`; ngưỡng nước chỉ Owner; công bố/sửa truy xuất dùng `PROVENANCE`; log chu kỳ dùng `CULTIVATION_LOGS`.
- Nav API: `ApiWorkspaceShell` lọc theo `subjectType` + `FunctionPermission`. Nếu `financeWorkspace` (Staff có `SUPPLIER_PAYMENTS.Create` mà không có quyền ghi nuôi trồng) thì ẩn nhóm Nuôi trồng.

## Nav theo chế độ
- **Mock** (`components/layout/app-navigation.tsx`): Điều hành → Tổng quan HTX; Nuôi trồng → Vùng nuôi, Bè nuôi; Vật tư & mua hàng → Phiếu nhập và yêu cầu thanh toán, Thanh toán nhà cung cấp; Nhân sự & phân quyền → Phân công và chấm công, Nhân viên thời vụ, Tài khoản nhân viên nội bộ, Vai trò & quyền; Hợp tác xã → Hồ sơ hợp tác xã; Hệ thống → Khởi tạo hợp tác xã. Nhóm rỗng bị lọc.
- **API** (`api-workspace-shell.tsx`): SysAdmin → "Quản trị hệ thống"; Điều hành (Tổng quan, Owner: nhật ký/chứng nhận/yêu cầu thương lái, công nợ NCC/khách theo quyền); các nhóm nghiệp vụ Nuôi trồng, Vật tư & mua hàng, Nhân sự & phân quyền, Kinh doanh, Báo cáo; Tài khoản (Owner thêm hồ sơ HTX và tài khoản nhận tiền). Thanh ngữ cảnh "Các bước nuôi trồng": chu kỳ → thả giống → vật tư → thu hoạch → nước.

## Tài khoản demo mock (`shared/mocks/mock-identities.ts`)
`owner` (Ngô Nam Trung), `manager` (Nguyễn Văn An, Khu Đông), `trader` (Lê Quốc Hải), `sysadmin` (Trần Minh Quân); Staff `staff-verified` thêm `workforce.assign` scope `zone-east`. Mật khẩu demo: xem `README.md` (xem [`../progress/qa-accounts-and-data.md`](../progress/qa-accounts-and-data.md) về mâu thuẫn tài liệu).
