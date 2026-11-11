# 05 — Kiểm kê `src/features/*`

Ký hiệu: Mock = có adapter mock; API = có adapter/contract API; T = số file test.

## Nhóm có cả mock và API (domain/repositories/services/schemas)
- **access** (T5): định nghĩa quyền hiệu lực cho nav; map response backend thành `EffectiveAccess` + `FunctionPermission`. File: `domain/access-types.ts`, `domain/backend-function-catalog.ts`, `api/map-permissions-response.ts`, `api/project-navigation-access.ts`, `lib/has-effective-permission.ts`.
- **auth** (T17, Mock+API): đăng nhập, phiên, onboarding Staff; chặn đa tab bằng BroadcastChannel `omts-auth-lifecycle-v1`; đổi mật khẩu tạm; xác minh liên hệ. File: `api/{api-auth-client,auth-contract.schemas,permissions-contract.schema}`, `components/{login-form,api-login-form,post-login-gate-panel,server-application-boundary}`.
- **account-management** (T7): Owner quản lý tài khoản nội bộ, gán grant vai–vùng; danh sách, wizard sửa (edit → preview), khóa/mở khóa, hiện credential một lần, xem trước quyền hiệu lực.
- **role-management** (T7, Mock+API chỉ đọc): ma trận quyền chức năng × hành động × data scope; tài khoản bị ảnh hưởng. `domain/fixed-role-policy.ts`.
- **employee-management** (T30): hồ sơ nhân viên thời vụ (làm việc theo vùng, ngân hàng, liên kết tài khoản, nghỉ việc, phục hồi); xung đột `rowVersion`; follow-up `review-lock`/`review-access`. **employee-api** (T1): directory, editor, diff khi xung đột, dialog follow-up.
- **farming-zones** (T8): vùng nuôi và giấy tờ pháp lý dùng chung nhiều vùng; tạo, đổi tên, ngừng/kích hoạt; giấy tờ có bản thay thế, trạng thái hạn.
- **rafts** (T8): bè nuôi; layout làn có phiên bản theo ngày; tình trạng làn theo ngày; ảnh JPEG/PNG; ngừng/kích hoạt. Không ngừng được khi còn chu kỳ mở (`open-cycle`) hoặc làn đang dùng (`lanes-in-use`).
- **cooperative-profile** (T5) + **cooperative-api** (T2): hồ sơ HTX, ngành nghề, preview tên/địa chỉ, logo/cover, chứng nhận; validate MST `10 số[-3 số]`, link https, năm thành lập. **cooperative-provisioning** (T3, mock; API hiện "không có quyền"): SysAdmin tạo HTX + Owner.
- **profile** (T13) + **personal-api** (T7): hồ sơ cá nhân, sửa tên có `rowVersion`, đổi liên hệ qua OTP, danh sách grant, thu hồi grant, tùy chọn thông báo.
- **notification-preferences** (T3): theo category (`ORDERS, WORK, DEADLINE_REMINDERS, WATER_ALERTS, TRACEABILITY_QR_SENT, SALES_NOTICES`) × channel (`InApp, Push, Email, Zalo`). InApp và Push bắt buộc, chỉ đọc; lý do không đủ điều kiện: `EMAIL_NOT_VERIFIED`, `ZALO_NOT_CONFIGURED`, `NO_PUSH_DEVICE`.
- **account-recovery** (T6), **account-security** (T4), **registration** (T5): mock; API dùng `verification-api`/`personal-api`.
- **verification** (T5, mock) + **verification-api** (T2): OTP email/SMS, đếm ngược gửi lại; `purpose ∈ registration|recovery|contact|password-email`, `channel ∈ Email|Sms`, phase `pending|code|verified|unknown|failed|done`; proof mã hóa trong Redis, gắn ngữ cảnh G1.
- **dashboard** (T3): xem [07](07-dashboard.md).

## Nhóm chỉ API
- **api-workspace** (T9): shell API, CRUD generic theo resource (`resources.ts`), singleton (profile, cooperative), `OwnerOverview`; danh sách có phân trang, tìm kiếm, lọc loại NCC/nhóm vật tư; editor có preview + confirm.
- **operations** (T10, 65 file): phiếu nhập (tạo/sửa nháp, hoàn thành, hủy có thể kèm thanh toán, trả một phần, copy, ảnh hóa đơn gắn `receiptId`, giải quyết xung đột, chi phí vật tư theo bè); nước (nhập tay/OCR, phiên bản, hiệu chỉnh/void, ngưỡng pH/độ mặn theo vùng, biểu đồ ngày/tháng, báo "đang có người sửa"); workforce (assign/move/crew, chấm công thủ công, giờ nghỉ và làm tròn, duyệt nghỉ phép); my-work; yêu cầu mua (Owner accept/decline).
- **purchasing-v2** (T1): hợp đồng phiếu nhập/thanh toán v2 bật bằng `NEXT_PUBLIC_OMTS_PURCHASING_CONTRACT=v2`; phiếu trả/hủy, in phiếu, hàng đợi chưa thanh toán; payment `kind ∈ Payment|PaidBack`, method `Cash|BankTransfer`.
- **debts-api** (T1), **customer-debts-api** (T2): sao kê công nợ NCC/khách (`openingDebt`, `closingDebt`, `debtToday`, `debtAgeDays`, entries; khách thêm `Invoice|Return|Payment|PaidBack`).
- **customer-lookup**: ô tìm khách (debounce 300ms). **customer-payments**: ghi nhận thanh toán (`Cash`/`OtherTransfer`/`VietQrInvoice`), panel chờ xác nhận, dialog 409. **sales-api**: danh mục sản phẩm hàu.
- **sales-invoices** (T6): lập hóa đơn theo lô thu hoạch, `PayNow`/`PayLater`; VietQR, QR tự dựng, polling "pending sale" (`Awaiting|Completed|PaymentChanged|Stopped`); giá `PriceList|DecidedByOwner`; gắn yêu cầu mua mở.
- **sales-invoice-list** (T3): tìm, xem, in, xuất, gửi lại. Sửa (SALE-07) và hủy (SALE-08, Owner) phụ thuộc nhánh backend `feature/OMTS-224-correct-cancel` chưa merge; thiếu `corrections` thì ẩn nút. `invoice-detail.tsx` có TODO(api): phiếu trả hàng (CLAIM-03) chưa có endpoint tạo.
- **sales-returns** (T1), **sales-reports** (T3), **payroll** (T1): **FRAME ONLY** ("no data source yet"). payroll có hơn 10 `TODO(api)` (gửi bảng lương cho Owner, payslip, chi phí nhân công theo bè/chu kỳ, chi tiền mặt, hủy phiếu chi). Trạng thái UI: `draft, pending, returned, final`.
- **payroll-settings** (T1): LABOR-16 — ngày bắt đầu kỳ lương 1–28, bật/tắt tự tạo bảng lương, xem trước 2 kỳ. **labor-api**: loại công việc, đơn giá theo giờ, lịch sử ngày hiệu lực.
- **cultivation-api** (T3) + **cycles-api** (T1): tiến độ bè/làn; thả giống (phiên, chọn lô giống, hoàn tất); vật tư theo lần sửa chữa; thu hoạch (lô, số lồng, kg/lồng, ước tính kg); hiệu chỉnh có lý do; cài `averageKgPerCage`, `daysBeforeAutoClose`; xem trước lô; kanban làn. Chu kỳ có `canStart/canEdit/canCancel`, `closedEarly`, `daysOfFarming`, `assessment`; nhật ký chu kỳ `log-*`; kế hoạch công việc.
- **farming-api** (T2): bè/giấy phép phía API; bản đồ Vietmap (`vietmap-view`, `global-zone-map`, `zone-map-dialog`); giấy phép `Valid|ExpiringSoon|Expired|NotYetEffective|Superseded|Missing`.
- **harvest-yield** (T1): sản lượng theo `Raft|Zone|Cycle`; lọc/sắp xếp/phân trang phía client; mặc định tháng hiện tại; cột `lotCount, estimatedKg, soldKg, lostKg, differenceKg`.
- **lot-tracing** (T2): tra lô, trace ngược/xuôi, công bố/rút công bố nguồn gốc, sửa dữ liệu truy xuất (`seeding-correction`, `log-correction`, `lot-correction`); origin `NotPublished|Published|Withdrawn`; lỗi `NoSeedingSession|SeedLotNotOnCompletedReceipt|NotPublisherOfZone`; Publish bị chặn bởi `NoRight|AlreadyPublished|NotOnSalesInvoice|OwnerOnly`.
- **origin-page** (T1): trang công khai Vi/En (lô, ảnh, timeline, khối HTX, trạng thái lỗi).
- **quality-claims** (T3): Trader báo (≤10 ảnh jpeg/png, ≤10MB/ảnh, mô tả ≤2000 ký tự); Owner phản hồi (chấp nhận có đề nghị `ReturnAllGoods|PriceCutWholeInvoice`, hoặc từ chối có lý do); Staff chỉ xem trong vùng. Trạng thái `3701` Chờ, `3702` Từ chối, `3703` Chấp nhận. Hạn chế: chưa có danh sách hóa đơn của Trader.
- **trader-purchases** (T2): "Đơn mua của tôi" (SCR-SALE-01) — đặt, hủy, xem phản hồi; trạng thái `3201` chờ, `3202` đã nhận, `3203` từ chối, `3204` hủy; "hoàn thành" là cờ `fulfilled`; đơn vị kg, tối đa 3 số lẻ.
- **trader-requests-api** (T1): Owner duyệt/từ chối đăng ký (`PENDING_APPROVAL | REJECTED | ACTIVE`).
- **supplier-api**, **inbox-api** (T4; chuông, danh sách, chi tiết, mở bản ghi có recheck backend), **audit-api** (T1), **certifications-api** (`Valid|ExpiringSoon|Expired`), **bank-api** (`bankBin` 6 số, `accountNumber ≤19`, `confirmAccount`, `rowVersion`), **admin-api** (khóa/mở khóa với `reason` + `rowVersion`), **water-overview** (T1; cảnh báo `High|Low`), **landing** (không test).

## Nhóm demo mock cục bộ
- **accounting-demo** (T1): màn mock cho `/operations/purchase-receipts` và `supplier-payments` khi chưa có backend (`demoAccountingService`).
- **workforce-demo** (T2): phân công, vào/ra, lọc theo quyền vùng từ danh mục mock; in-memory, reset khi tải lại, có nhãn "demo".

## Feature không có test
landing, bank-api, certifications-api, admin-api, labor-api, sales-api, customer-lookup, customer-payments.
