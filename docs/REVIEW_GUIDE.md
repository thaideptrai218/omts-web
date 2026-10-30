# Reviewer quick start

## Real API workspace — local tester run

For the complete currently integrated tester scope, use **http://127.0.0.1:3003/login** (isolated Zalo backend QA, includes inbox and trader decisions). The comparison app on localhost3002 still uses develop8080, which lacks inbox/trader decisions and the new Sales/Workforce endpoints. The [role flow audit](reports/WEB_ROLE_FLOW_AUDIT_2026-10-30.md) records current checks, fixes and remaining contract limitations.

October31: QA8081 now runs backend98e232c on the copied database **OMTS_QA_98e232c**. The old database/image are retained. **Sản phẩm bán**, **Yêu cầu mua hàng** and **Phân công và chấm công** are connected for reads, with filters/reload, personal-vs-internal feeds and existing role/scope checks. Products/requests/assignments are currently empty; create/respond/cancel and workforce writes remain unavailable pending the two business decisions. This is a read slice, not acceptance of complete Sales/LABOR workflows. See [coverage and runtime notes](reports/WEB_SALES_WORKFORCE_READ_QA_2026-10-31.md).

The [October30 browser pass](reports/WEB_BROWSER_ROLE_QA_2026-10-30.md) now includes both Managers, Accountant and Trader; its matrix states actual checks and untested variants. The native-popup blocker was cleared. API confirmations use in-app dialogs: **Quay lại** keeps the draft; **Đồng ý** continues. Invoice/license/certificate links download directly. Reload older QA pages before checking. QA receipts026–029, payment references QA-BROWSER-M1/M2 and supplier QA browser Manager2 20261030 remain for tester comparison; see the report for exact final states.

The [Owner browser follow-up](reports/WEB_BROWSER_ADMIN_QA_2026-10-30.md) adds employee/account/role/cooperative and farm/file/cost/threshold checks. Employee validation now names each field needing correction and explains existing bank rules. `QA browser employee 20261030` remains Employed/unlinked; account qa.audit.1793323694230 stays Locked with revoked grants. Zone QABROWSER30, raft QA-BROWSER-B30 and item QA-MAT30 are discontinued; receipt030 is cancelled. Cooperative website/logo were restored. Use these QA records for comparison instead of editing seed records.

The [API failure/OTP pass](reports/WEB_BROWSER_FAILURE_OTP_QA_2026-10-30.md) verifies a real isolated upstream outage: drafts survive, writes stay blocked after a comparison GET, and explicit discard restores canonical data without replay. Recovery/registration wrong-code, reload, cross-purpose code rejection, resend/old-code rejection and cancellation passed with Fake providers. Expired-flow cancellation was fixed and replayed after natural TTL: End reconciles a missing row before returning to Start, without cancelling a newer flow or retrying a write. Password submission is a human handoff; do not mark it passed until saved and checked. Test credential changes only on a designated QA account, keeping seed credentials intact.

The repeatable read-only role check uses the existing local demo accounts and creates/revokes only its own login sessions. It expects the documented demo permissions. Set the local demo password in the terminal, then run:

```powershell
$env:OMTS_QA_PASSWORD='Demo@1234'
$env:OMTS_QA_WEB_ORIGIN='http://127.0.0.1:3003'
$env:OMTS_QA_BRANCH_API='1'
$env:OMTS_QA_SALES_WORKFORCE='1'
npm run test:api-roles
```

For develop comparison use `OMTS_QA_WEB_ORIGIN=http://localhost:3002` and `OMTS_QA_BRANCH_API=0`. Optional `OMTS_QA_REPORT` writes a JSON status report (use an ignored path under docs/learning). The script checks APIs, actor/zone boundaries, HTML entry and logout; it does not drive browser controls or write business records.

### Branch API QA — notifications (October 30)

The local QA app at **http://127.0.0.1:3003/login** uses backend branch `chore/cors-zalo-mini-app@dc00b2f` on port8081 with a separate demo database. Use the same demo usernames/password listed below. Host `127.0.0.1` separates its cookies from the existing `localhost:3002` app, which still uses develop953f597/8080. This QA deployment does not merge either branch.

Open **Thông báo** from the API menu. Check newest-first items, unread count, page navigation and explicit **Đánh dấu đã đọc** / **Đánh dấu tất cả đã đọc**; reload to verify persistence. Opening the dialog alone never marks a notification as read. Unknown mutation results remain blocked after Reload and are not replayed. Notification content is rendered as plain text; record references do not guess navigation targets. The new endpoint does not exist on develop8080 yet.

As **owner**, open **Yêu cầu thương lái** on the same QA app. Start with **Chờ duyệt**, search by name/phone, and review the exact person's phone/note in the confirmation panel. **Duyệt yêu cầu → Xác nhận duyệt** activates the account and links its customer profile. **Từ chối yêu cầu** requires a nonblank reason of at most1,000 characters; the trader can see that reason from the Mini App. Cancel before confirmation makes no write. Switch to **Đã từ chối** to verify persistence; rejected rows have no decision buttons. Two QA requests whose names begin `QA chờ duyệt` / `QA chờ từ chối` were retained for manual testing. These are ordinary pending requests; either action is available on both. Use them only on the separate8081 database.

The user approved this decision workflow on30October. A rejected trader can submit a new request from the Mini App; Web does not reactivate a rejected request. The current backend addresses requests by account ID without an exposed version/request-generation ID. Reload before reviewing an old open request; Web does not claim atomic protection against a rejection/resubmission between review and save. The backend's current status rules decide validity. See [approval coverage and limits](reports/WEB_TRADER_APPROVAL_API_2026-10-30.md).

After browser QA, `QA chờ từ chối 062bad05` is now under **Đã từ chối**, with reason `QA browser: kiểm tra luồng từ chối`; the other QA pending request was left for testers.

Contact/inbox browser follow-up: on QA3003, verified contact remains a draft until Save. Continue editing keeps it; explicit discard removes both the draft and its waiting-to-save notice. The dedicated Trader QA contact/password stayed unchanged and its Orders Email preference was restored. Owner's14 QA inbox messages are now all read after the individual/read-all tests. See [coverage and limits](reports/WEB_BROWSER_CONTACT_INBOX_QA_2026-10-30.md); password reset submission remains untested in browser at the user's request.

Draft safeguards now also detect a changed measurement time/input mode and payment supplier/date/method. Close → Quay lại retains these fields; Đồng ý discards. Returning every field to its opening value lets an untouched form close directly. No save command is sent by these discard checks. See [role edge-case QA](reports/WEB_BROWSER_ROLE_EDGE_QA_2026-10-30.md).

Receipt cancellation now uses the version explicitly adopted during conflict comparison; a GET alone still leaves writes blocked. The cancellation reason survives comparison and a fresh confirmation is required. Selected invoice files also trigger the existing discard dialog before Close; they are not uploaded automatically. QA receipt031 is Cancelled with no lines/money/upload. See [browser reconciliation evidence](reports/WEB_BROWSER_RECEIPT_RECONCILIATION_QA_2026-10-30.md).

Pending invoices survive draft Save and the refreshed editor, with names/count shown until explicitly uploaded or removed. **Lưu nháp** does not upload them; reload still loses local selection. Under the approved rule, complete/cancel require uploading or confirming **Bỏ chọn tệp** first. Both completion buttons and an already-open cancellation form follow this rule. Upload success clears the pending selection and enables the normal actions again. QA032finished this full flow and is now Cancelled with1line/1invoice; supplier debt remains PR029/2,000. See [tester evidence and360/1024 measurements](reports/WEB_RECEIPT_PENDING_INVOICES_2026-10-30.md).

The `/account` page explicitly opts out of the development instant-navigation validator because its authentication guard intentionally withholds the page while the session is unresolved. Authentication and private response rules remain active. Other route validation stays enabled. See [branch audit and local startup details](reports/WEB_BACKEND_BRANCH_INBOX_2026-10-30.md).

The API workspace now uses the running .NET backend and Redis. Start the backend's existing Docker demo environment on `127.0.0.1:8080`. Start a separate Redis instance on loopback (or edit the generated configuration to use your existing Redis):

```powershell
docker run --detach --name omts-web-session-redis --publish 127.0.0.1:6380:6379 redis:7.4.11-alpine
npm run setup:api
npm run build
npm run start:api
```

If that Redis container already exists, use `docker start omts-web-session-redis`. Open `http://localhost:3002/login`. `setup:api` preserves an existing `.env.api.local`, generates the session encryption key without printing it, and leaves `.env.local` alone. The local built-app launcher uses test mode for the HTTP loopback cookie profile; production deployments still require HTTPS. The launcher binds loopback and does not publish the site to the Internet.

Use the backend demo accounts documented in the backend README, including `owner`, `quanlyvung1`, `quanlyvung2`, `ketoan` and `thuonglai1`. These are not the frontend mock accounts. A password changed earlier remains changed. The session is bounded by the backend access-token expiry; automatic refresh remains disabled.

### Tài khoản kiểm thử API thật

Các tài khoản dưới đây đã có trong demo seed của backend; ngày 30/10/2026 đã kiểm tra đăng nhập thành công trên API local. **Mật khẩu chung: `Demo@1234`**. Đây chỉ là dữ liệu demo local, không dùng cho môi trường triển khai thật.

| Role / phạm vi | Tên đăng nhập | Màn nên kiểm tra |
| --- | --- | --- |
| Chủ hợp tác xã (Owner), mọi vùng | `owner` | Hồ sơ HTX, nhân viên, tài khoản/quyền, vùng/bè, nhà cung cấp, phiếu nhập, thanh toán, đo nước |
| Quản lý vùng, DEMO-01 | `quanlyvung1` | Phạm vi DEMO-01 và các chức năng được cấp |
| Quản lý vùng, DEMO-02 | `quanlyvung2` | Phạm vi DEMO-02 và các chức năng được cấp |
| Kế toán, mọi vùng | `ketoan` | Công nợ, thanh toán nhà cung cấp, đọc phiếu nhập |
| Thương lái | `thuonglai1` | Đăng nhập, hồ sơ cá nhân, thông báo; không vào vận hành HTX |

Role **Nhân viên** mới chưa có mã role ổn định trong backend; **Quản trị hệ thống** và người xem QR cũng chưa có tài khoản demo tương ứng để đăng nhập Web. Không gán tạm quyền khác cho các role này. Nếu một mật khẩu seed đã được đổi trong DB dùng chung, seed không đặt lại mật khẩu; dùng thông tin mới của người đã đổi hoặc một môi trường demo riêng.

Current API workflows: login/session/logout; profile display-name save; cooperative profile save; zone, employee, supplier and farming-input list/detail/create/update; employee account linking/unlinking and employment actions; zone/supplier/input status actions; zone licenses and replacement chains; raft/lane forms, photos and dated condition diagrams; account list/detail/update/lock/unlock; role and permission read views. The purchasing and water screens below use real API data too. This is not completion of the full SRS. Staff requiring contact verification stays gated while the backend email-or-phone contract is pending. New account creation is withheld until the generated-username/secret-free delivery contract is available.

For the new personal/access slice, open **Hồ sơ cá nhân** (`/account`), inspect identity, contact verification and current grants, change the display name, then save or discard. Open **Tùy chọn thông báo** while keeping a name draft: toggle an optional eligible In-app cell, save and reopen to verify it. Restore the original value after QA. Mandatory In-app and all Push cells are locked; Email/Zalo follow backend eligibility. The server can return a notice after saving; that notice replaces the generic success text.

G2 was approved and is now connected. Use **Đăng ký thương lái** (`/register`) from login for Email/SMS → OTP → password → explicit account creation → login. **Quên mật khẩu** (`/recover`) always gives generic guidance; verify the code then save a new password and log in again. The backend demo uses Fake SMS/email inbox endpoints documented in its README; inspect those separately during local QA, never expect an OTP inbox inside the product. Observe the backend limits (including 10 code requests/minute per IP).

On a designated QA account, profile **Thêm/Đổi/Xác minh email or số điện thoại** requires the current password, then OTP. Verified contact stays pending until **Lưu thay đổi**. Cancel before Save leaves the saved contact untouched. When changing the name too, name saves first; a later contact failure reports the saved name and retains the contact draft for re-verification. It does not replay the name write. An ambiguous result stays blocked for comparison; a successful GET alone does not authorize a repeated write. Under **Đổi mật khẩu**, **Dùng mã xác minh email** uses a verified email and rotates the session through G1. Test password/contact mutations only on a dedicated QA account, not seed credentials. The completed HTTP QA account is documented in the local tester output; the [G2 report](reports/WEB_G2_VERIFICATION_API_2026-10-29.md) distinguishes real HTTP writes from browser and fixture coverage. Staff onboarding still awaits email-or-phone alignment; email-only Trader registration can still reach the backend's contact gate.

As Owner, open **Tài khoản → Mở hồ sơ → Xem phân quyền vùng**. Inspect dates/status/history; use a designated QA grant to test reason → explicit confirmation → retained Revoked row. Revocation changes access and has no undo; never use an original seed grant merely for a demo. Cancelling the confirmation preserves the row and account draft. **Vai trò và quyền → Mở hồ sơ** shows the function matrix, supported actions, scope and active use counts. Role writes and new grants remain pending contract alignment. A dedicated already-expired QA grant was revoked during verification; original seed rows and effective access were preserved. See [evidence and limits](reports/WEB_PERSONAL_NOTIFICATIONS_ACCESS_API_2026-10-29.md).

Backend PR19 is still draft and the local API remains develop953f597. Web accepts both error-code contracts and no longer requires the removed null raft-source fields. The [latest Jira audit](reports/WEB_JIRA_PR19_CONTRACT_UPDATE_2026-10-29.md) distinguishes deployed behavior from planned FARM/PURCHASE/WATER/LABOR redesigns; the old LAB ticket being Done does not mean the new LABOR API is available.

For a conflict or lost mutation response, the editor retains the draft and asks the tester to load the current server record for comparison. It does not automatically replay the write. Test create/edit/status transitions on records explicitly named for QA; do not reset the shared demo database.

Supplier certificates: open **Nhà cung cấp → Mở hồ sơ → Chứng nhận nhà cung cấp** after saving/discarding metadata drafts. Readers can download; SUPPLIERS Edit allows JPEG/PNG/PDF uploads (10MB per file, 10 certificates total). Confirmed uploads update the parent version on close. An ambiguous upload stays blocked for comparison and is never replayed by Reload. Use a QA supplier. Certificate deletion awaits a backend ID/version check; index alone can remove the wrong file after a concurrent list change. See [CI and certificate evidence](reports/WEB_CI_SUPPLIER_CERTIFICATES_2026-10-29.md).

Catalogue filters (October30): **Nhà cung cấp → Loại nhà cung cấp** filters Seed/Material/Other; **Danh mục vật tư → Nhóm vật tư** filters Seed/RaftMaterial/Other. Combine with search and status, move to another page, then change the category: paging returns to1. Clearing the category keeps search/status. Filtering runs on the backend before paging, so it finds matching rows beyond the current page. Both API environments3002/3003 support these filters; original actor permissions still apply.

### Purchasing and water tester flows (October 29)

- **Phiếu nhập** (`/operations/purchase-receipts`): select a supplier and zone, save an empty draft, add seed/material lines (a raft is required for raft materials), upload invoice images/PDF, then complete it. Check the seed-lot references and outstanding amount. Try a partial return, cancel/copy, both payment choices on cancellation, raft costs and Excel export. A completed receipt is corrected through cancel/copy; it cannot be edited in place.
- **Thanh toán nhà cung cấp** (`/operations/supplier-payments`): inspect supplier/receipt debts, record an amount in multiples of 1,000 VND after reviewing the confirmation panel, then reload the debt. An overpayment must fail. Cancel a QA receipt while keeping its payments, then allocate that unallocated money to a completed receipt of the same supplier. There is no independent payment-cancel endpoint.
- **Đo nước** (`/operations/water`): choose a zone, record manually or upload a JPEG/PNG meter photo for OCR, review the draft and confirm. Correct with a reason, inspect the version chain, void a mistaken reading and verify the chart. The Owner may change thresholds for one zone or all In Use zones. Past readings retain their threshold snapshot. Use status filters to find drafts, corrected or voided records, and test Excel export.

Use `quanlyvung1` to verify DEMO-01 scope and `ketoan` for payment access with read-only receipts. Trader has none of these business capabilities. Custom OwnRecords-only grants are refused by this Web integration because the current backend INP/ENV guards do not yet enforce creator scope; a covering AssignedZone grant remains valid. The local backend uses its Fake OCR provider. Signed evidence is read through the BFF and the file proxy currently supports the demo's Local storage provider.

### Zone files and raft condition tester flows (October 29)

Zone positions (October 30): open **Vùng nuôi → Vị trí vùng và bè** in API mode. Search by zone code/name or raft code, include discontinued zones, reload, and open a complete coordinate in Google Maps in a new tab. A missing coordinate has no map link; zero is a valid coordinate. Only In Use rafts appear. Backend scopes the returned zones: `quanlyvung1` sees DEMO-01 and `quanlyvung2` sees DEMO-02; Owner and Accountant see the zones their backend identity permits. Trader and anonymous requests are refused. This is a coordinate directory with external map links, not an embedded map.

As Owner, open a saved zone in `/workspace/zones`, then **Giấy tờ và gia hạn**. Check Missing rows, change **Ngày xem tình trạng**, and create a PDF/JPEG/PNG document (up to10MB) covering one or several zones. Reopen it, edit without selecting a new file to retain the old file, then **Gia hạn / thay thế** with a new number, dates and file. The earlier document stays in the chain and is read-only once replaced. Follow the previous/next links; compare validity before and after the replacement's effective date. A document save does not save or discard the parent zone's metadata draft. License access remains Owner-only under the current backend.

Open a saved raft in `/workspace/rafts`, then **Ảnh và sơ đồ tình trạng bè** after saving/discarding metadata changes. Upload a JPEG/PNG photo as Owner, close the panel and verify that a metadata save uses the new version. Read layout history and select a date. Select a colored lane portion to inspect the source, recorder/confirmer, seed lot or write-off reason. A raft without a cycle shows Not seeded. Material costs use completed purchase receipts as evidence: no receipts stays unknown, while a receipt with an actual zero cost shows0VND. Missing purchase-receipt View permission does not open cost access. Manager may read their zone's raft, but has no photo-upload or license controls.

QA records prefixed `QAFARM` and `QA-R` were created in the local demo, then discontinued; their license/photo/layout history remains available with the All status filter. Files are private BFF downloads; the Local storage limitation above also applies here. See [the API review](reports/WEB_FARM_FILES_CONDITION_API_2026-10-29.md) for exact coverage.

### Employee tester flows (October 29)

Open **Nhân viên** as Owner (`/workspace/employees` or `/employees` in API mode). The default is Employed; combine name/phone search, working-zone and employment filters. Create a QA-named profile, edit personal data, choose active working zones and enter all three bank fields or leave the group blank. Account numbers keep leading zeros. Existing stopped zones must be removed explicitly before saving.

Select an available login account and save. **Bỏ liên kết tài khoản** confirms separately; keep an unsaved note, unlink, then save the note using the new version. **Nghỉ việc** / **Đi làm lại** stay disabled until the metadata draft is saved/discarded. Confirm an end date no later than today. A returned follow-up opens that exact account for review; it does not lock/unlock or grant access automatically. If no seeded accounts are available, use a test profile already linked to an account or prepare a separate QA fixture; do not reset the database or change demo credentials.

Try a stale version: load the current profile, compare personal/bank/zone/account/status data, then explicitly choose the saved record or keep the draft with the reviewed version. An ambiguous write is not retried automatically. Duplicate employee IDs can be opened for comparison only after a click, retaining the current draft. The approved MSG24 fallback says **Tài khoản này đã được liên kết với hồ sơ nhân viên khác**; press **Mở hồ sơ đang liên kết** to load that profile for comparison. A failed comparison read retains the button for a manual retry. The backend still lacks the structured employee name. See [employee API coverage](reports/WEB_EMPLOYEE_API_WORKFLOWS_2026-10-29.md).

### Cooperative profile tester flows (October 29)

As Owner, open **Hồ sơ hợp tác xã** (`/cooperative/profile`). Edit legal/contact fields and add/remove industry rows. Invalid required data stays in the form; Save opens a name/address preview and requires confirmation. Check that the response updates both the saved fields and version. A preliminary profile may contain blank fields; the backend marks it Completed only after a valid full save.

Select a PNG/JPEG/WebP logo up to2MB, then upload/replace. Logo changes save separately and retain unsaved text. Remove requires confirmation. If a concurrent text update is observed in a logo response, compare it before saving the old text draft. A stale profile write preserves the draft; explicitly load and compare before adopting the saved record or continuing with the reviewed version. An ambiguous write remains blocked even after a successful GET; it is never automatically replayed. Manager, Accountant and Trader cannot read or change this profile/logo.

Receiving-bank fields still await WEB-COOP-BANK-01/backend alignment; the existing mock bank form is retained and no fake bank data is added to API mode. This is not full UC09 acceptance. The original local demo profile and logo were restored after QA; audit, rowVersions and old logo files remain. See [cooperative API coverage](reports/WEB_COOPERATIVE_API_2026-10-29.md).

## Mock UI review

This guide covers the **mock-backed Web UI** on `feature/OMTS-132-web-foundation`. It is intended for a local code/UI review, not acceptance of the real backend integration. Interface labels are Vietnamese; this guide uses the labels you will see on screen.

Updated **October 28, 2026**: management and authentication mock flows share state. Employee account creation, profile/contact verification, password-dialog handling and notification lifecycles have additional regression coverage. Use the walkthrough below to demonstrate actions across screens, rather than inspecting isolated forms.

## Download and run

Use Node.js **24.x** and npm. Clone the review branch rather than the default `develop` branch:

```bash
git clone --single-branch --branch feature/OMTS-132-web-foundation https://github.com/thaideptrai218/omts-web.git
cd omts-web
npm ci
```

Create `.env.local` from the committed example:

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

```bash
# macOS / Linux / Git Bash
cp .env.example .env.local
```

Run only the copy command for your shell. Keep `OMTS_DATA_SOURCE=mock`. For a presentation/review without development overlays, build and serve the frontend:

```bash
npm run build
npm run start
```

Open [http://localhost:3000/login](http://localhost:3000/login). If that port is occupied, run `npm run start -- --port 3001` and open the URL printed in the terminal. No backend, database, Redis, or Docker is required for this review.

For coding with live updates, use `npm run dev` instead of `npm run start`. Next.js development tools may show an Instant Navigation diagnostic for session-gated pages; that diagnostic is tracked separately and is not displayed by the production server. Do not run dev and build concurrently in one checkout.

## Suggested review sequence

### Navigation and dashboard refresh (October 28)

The desktop sidebar opens with readable labels. **Thu gọn menu** switches to an icon rail; move the pointer into it to preview labels, or tab into a link. **Giữ menu mở** pins the preview. A brief pointer crossing does not expand it, and leaving has a short closing delay. The sidebar reserves a layout column instead of covering the directory. The account block shows the actual person's name, role and scope on separate lines.

At a narrow width, use **Menu** to open the matching light drawer. Check Escape, closing, navigation and resizing back to desktop: the drawer should close and the page should scroll normally. Dashboard raft counts appear first, and **Truy cập nhanh** contains only permitted destinations. Use the same data/flows described below; this visual update does not enable backend APIs.

### Raft walkthrough (October 28)

Open **Bè nuôi** (`/farming/rafts`) as `owner`, or use **Xem bè trong vùng** in a zone profile. Combine code/location search, zone and usage-status filters, then press **Lọc danh sách**. The initial six rafts are synthetic frontend scenarios, not production records. Zone names come from the shared zone registry.

Open **B1-01** to inspect an open cycle. Its lane diagram has seeded, harvested and written-off portions plus a separate planned-harvest overlay. Select a colored portion or its text label to inspect its date, source record and recorder. Change **Ngày xem sơ đồ** using Vietnamese day/month/year input; selecting a closed cycle moves the viewing date to its closing day. No oyster weight is inferred from lane length or color.

Use **Thêm bè nuôi** to select an active zone, enter code, coordinates, size and at least one lane with length and markers A/B. Save first, then attach a JPEG/PNG photo of at most 10 MiB. Photos are stored in memory in this review build. A duplicate code is rejected within the same zone; errors preserve the draft. Closing an edited draft requires confirmation. Material cost displays **Chưa có số liệu chi phí** until purchase-receipt data exists.

On **B1-01**, **Chỉnh sửa** permits metadata changes but keeps the layout locked while its cycle is open. **Ngừng sử dụng** is disabled with a reason. On **B1-02**, the cycle is closed: edit a lane length and save to create another layout version, then inspect the earlier diagram by date. Removing a lane with recorded historical segments is rejected. A raft with no open cycle can be discontinued and reactivated with confirmation; a stopped zone blocks creation/reactivation. Metadata drafts must be saved or discarded before returning to status actions.

Return to the Owner dashboard to inspect the raft/usage/open-cycle totals from the same mock registry. Sign in as `nguyen.an / demo123` to verify that only assigned-zone rafts are visible and create/edit/status/photo-upload controls are absent. Changing a URL filter does not grant access to other zones. Role permissions for farming zones and rafts expose View only; Owner write authority is checked separately.

This is the raft/lane-management slice. Cultivation-cycle creation, seeding/harvest entry, purchase receipts, inventory, finance and real backend integration remain separate work. A browser reload resets the mock registry and attachments.

### Farming-zone walkthrough (October 28)

Open **Vùng nuôi** (`/farming/zones`) as `owner`. Search by name/code/location and filter usage status, then open a card. Rename a sample zone, save, close the dialog and inspect the employee/account zone pickers: the new name is shared while existing assignments keep their IDs. `DEMO-*` codes and locations are sample data; rename them for a presentation rather than treating them as confirmed cooperative records.

Use **Thêm vùng nuôi** to save code, name, location, coordinates, area and water-measurement point first. Legal documents are added afterwards inside the saved zone's dialog. Missing mandatory document types remain visible; creating a zone alone never marks its legal records complete. Attach a PDF/JPEG/PNG of at most 10 MiB and select all covered zones. **Gia hạn / thay thế** creates a new record, keeps the old file/dates and changes the old record to superseded only from the replacement's effective date. **Xem hiệu lực tại ngày** can inspect both sides of that date. Attachments stay in memory; this is not a cloud upload or a real reminder service.

**Ngừng sử dụng vùng** and **Sử dụng lại vùng** require confirmation and retain history. Discontinuation is blocked by active rafts from the shared raft registry, with the blocking codes shown inside the confirmation popup. Save or discard metadata changes before changing usage status. A document save does not save or discard a metadata draft. The raft shortcut is unavailable until a metadata draft is saved or discarded.

Sign out and sign in as `nguyen.an / demo123`: only the assigned zone is readable, with no create/edit/status/document-write actions. A role name alone does not grant access. The disabled `tran.binh` fixture remains blocked. Other operational functions (cultivation entry, finance, payroll, orders and public QR) are still separate planned slices, not complete role workflows.

All date-entry controls display **ngày/tháng/năm** and accept Vietnamese date input. ISO values remain inside service requests. Expand the sidebar by pointer or keyboard focus: it should move the content column rather than cover it. On a narrow screen, use the Menu drawer.

Management and attachment changes are in-memory mock state and reset on a full page reload/server restart. Use client-side navigation during the walkthrough. Real API/refresh, MSG06 metadata and the structured MSG24 employee name remain gated.

Use **`owner` / `demo123`** first. These are public mock credentials, not a backend account.

| Step | Screen / action | Expected behavior |
| --- | --- | --- |
| 1 | Sign in and open the dashboard | The sidebar shows the user's name and role. Available sample metrics are displayed; unavailable operational metrics have no-data states. |
| 2 | Open **Nhân viên** (`/employees`), then an employee | The editor opens in a dialog. Search and edit fields are usable; a successful save updates the list and shows a toast. |
| 3 | In a linked employee, edit **Ghi chú** without saving, then select **Bỏ liên kết tài khoản** | Confirmation names the persisted account. **Hủy** or Escape closes only the confirmation and preserves the draft. |
| 4 | Confirm **Bỏ liên kết**, then select **Lưu thay đổi** | Unlink keeps the editor and draft open. Save succeeds with the returned version; reopening the profile shows the saved notes and no linked account. Unlink does not delete or lock the account. |
| 5 | Open **Tài khoản nội bộ** and **Vai trò & quyền** | Selecting a record opens a dialog. Search, filters, and permission information can be reviewed without a permanent details panel. |
| 6 | Open **Hồ sơ hợp tác xã** | Review the editable fields, validation, and public-information preview. This is the cooperative profile, separate from the signed-in person's profile. |
| 7 | Open the user card / **Hồ sơ cá nhân** (`/account`) | Review personal profile editing and the account settings available to this user. |
| 8 | Select **Đăng xuất** | The app returns to sign-in without remaining indefinitely in a loading state. |
| 9 | Sign in as `staff-verified` / `demo123` | Owner-only navigation is unavailable. Protected routes do not expose Owner data. A full URL navigation reloads the mock session and returns to sign-in; permission-denied UI applies when the session remains active. |
| 10 | Optionally sign in as `sysadmin` / `demo123` | Cooperative provisioning is available at `/system/cooperatives/new`. |

Repeat important interactions at narrow and desktop widths. Check text wrapping, keyboard navigation, visible focus, dialog dismissal, pending buttons, and validation errors. Reference viewport widths are **360 px** and **1024 px**.

## End-to-end presentation walkthrough

This sequence stays within one running browser tab. A full reload resets mock sessions and data; use the sidebar and the app's **Đăng xuất** action between accounts.

1. Sign in as **owner / demo123**. On the dashboard, the heading and permitted shortcuts appear while metrics load. Open **Vai trò & quyền**: there are three fixed roles, **Quản lý vùng**, **Kế toán**, and **Nhân viên**. Add/copy controls are absent and names are read-only. Open **Nhân viên**, edit its description or configure business permissions, then save. Initially this role has no business permissions. Search/group filters in the permission editor keep selections made outside the filter; write actions retain View. You may also discontinue and reactivate this role while no account holds it.
2. Open **Tài khoản nội bộ** and create an internal account with a synthetic full name, a unique email/phone, and at least one zone-role grant. The updated fixed role from step 1 is available. The system generates the username; note it from the receipt. This is a simulated delivery receipt, not a real email/SMS.
3. Open **Nhân viên**, create an employee, and link the new account from the picker. It disappears from the picker for other employees. **Bỏ liên kết tài khoản** has its own confirmation; unlink preserves the editor draft and supplies the version for the next save.
4. Return to the dashboard. Employee and active-account counts reflect the new records; the in-use-role count changes with role status and does not grow by creating custom roles. Workforce and account-status charts use available mock counts. Operating income, expenses, raft and harvest figures remain a no-data summary because those modules are not delivered by this snapshot.
5. Log out. Sign in with the generated username and **demo123**, the public mock temporary password. Set a password for the presentation with at least 8 characters, letters and digits. Verify either email or phone; the initial mock OTP is **123456**. After a resend use **654321**, then **112233**. The app grants access only after the required steps.
6. In **Hồ sơ cá nhân**, check the generated username, assigned role/zone, and verified-contact badge. Only the contact actually verified is marked verified. Save a new display name; verify and save a contact change if needed. A new contact is not a login alias before verified save; the old alias is retired after replacement.
7. Open **Tùy chọn thông báo** from the profile. Required in-app cells stay locked on, unavailable channels explain why, and Email is unavailable until verified. Change an editable cell and save. Reopen to see the saved preference; close an unsaved draft to discard it. Category/channel defaults are mock fixtures pending the final backend/BA catalog.
8. Open **Đổi mật khẩu**. Use the password from step 5 as the current password. After success, log out and sign in with the new password; the old password should fail. Forgotten-password recovery at `/recover` follows the mock OTP flow and updates the same credential source. Use only a verified contact.
9. Sign back in as Owner. Lock the new internal account with a reason; its next login is rejected. Unlock it to restore access. Resetting its password simulates delivery of the public temporary password **demo123** and requires a password change at the next login. An already verified contact is not forced through verification again; an unverified account still requires verification.
10. Try discontinuing the role while the new account holds a grant. The app blocks the operation and lists the affected account. Existing grant history is preserved; reactivating a role never restores revoked grants. The three-role policy is a newly approved requirement; the backend still needs corresponding enforcement before API activation.

The employee directory combines search, employment status, working-zone and account-link filters. It starts with employed staff; clear filters to include departed employees. Search settles after 300 ms. Pagination appears above 20 matching employees; the small seeded directory does not need multiple pages. Working-zone labels and account status are separate from employment status. The account directory combines search, zone, role and account status; a grant covering all zones still matches a selected zone. Account editors cannot be dismissed while a confirmed save/status mutation is pending; after it finishes, dismissal is available again.

### Employee employment changes (mock)

1. Open an employee and edit **Ghi chú**. **Nghỉ việc** is disabled until the draft is saved or discarded with **Hủy thay đổi**. This differs from account unlink, which preserves an unsaved draft.
2. Select **Nghỉ việc**. The confirmation defaults to today's Vietnamese business date (UTC+7) and rejects future dates. Cancel first to verify that nothing changed, then reopen and confirm if demonstrating the mock transition. Cancelling while form validation is still pending prevents that old confirmation from sending a command; once a command has started, dismissal stays disabled until its result is handled.
3. The employee moves out of the default Employed filter. Select **Đã nghỉ** and reopen the profile to see the saved end date. The login account is not locked automatically. If a reminder is shown, **Mở tài khoản nội bộ** opens that specific account for review without modifying it.
4. Select **Đi làm lại** and confirm. The end date is cleared, while account status and access grants stay unchanged. An account review reminder is separate from any unlock or permission action.

These actions use the shared mock repository. Labor-record blockers, concurrent versions and pending/cancellation races are covered by automated fixtures; the demo does not include a real labor-history dataset. Real API/QA acceptance and structured MSG06/MSG24 integration remain open.

### Employee personal-data validation (mock)

The editor explains the supported phone formats and text limits. Birthday remains optional and cannot be later than today's Vietnamese business date. Invalid fields retain their entered values and receive inline errors/focus; text is not silently truncated. Correct the values and save, then reopen the employee to inspect the result. The mock normalizes supported +84/84 phone input to the domestic form and uses the normalized number when checking for an existing person with the same name. Account status, zone access and employment status do not change as a side effect.

### Create an account from a saved employee (mock)

1. Save a new employee first, or open **Lê Thị Lan**, who has no linked account. Save or discard any personal-data draft before selecting **Tạo tài khoản đăng nhập**.
2. Check the prefilled display name and phone, optionally enter email, and select the delivery channel. These fields belong to the new account; editing them does not save personal-profile changes.
3. In **Phân quyền theo vùng**, select a zone and role, then add the grant. At least one valid grant is required; working zones do not automatically grant access.
4. Select **Xem quyền trước khi tạo**, inspect the scope, then confirm. Cancel before confirmation to check that nothing was created.
5. The receipt shows the generated username and a masked recipient. No password is shown. After acknowledging it, reopen the employee to inspect the linked account or open the account directory to review its grants.

This uses the existing in-memory credential-delivery simulation, including its 72-hour setup receipt. No real SMS/email or backend transaction is performed. A lost response is not automatically retried. The real API remains gated while the backend username/credential-delivery contract differs from the approved frontend workflow.

For a shorter presentation, use the seeded accounts `nguyen.an` or `pham.cuong` with `demo123` to show role/scope labels and Owner-only menu restrictions without creating a new account. `staff-first-login` is a separate first-login scenario; `staff-needs-contact-verification` starts at the contact step. Web Trader registration remains deferred by the user's decision on October 27; there is no `/register` route to demonstrate.

## Profile and security checks for the October 28 review

- In **Hồ sơ cá nhân**, edit the display name and use **Hủy thay đổi** to discard the draft. Names are limited to 200 characters; an overlong value stays visible with an error instead of being truncated. Save updates the personal name in the sidebar.
- To demonstrate an existing unverified contact without changing a password, sign in as **pham.cuong / demo123** and open the profile. This seeded account has a verified phone and an unverified email, which offers **Xác minh email**. After OTP, the card says **Đã xác minh, chờ lưu**. Select **Lưu thay đổi** to apply verification. The first mock OTP is **123456**; no real message is delivered. A newly created account with both contacts can also demonstrate verifying one during onboarding and the other later from its profile.
- Changing to a new email/phone uses a separate form. Closing it clears the draft. A late response must not reopen OTP or affect another opening. Verification of the current contact does not bypass validation for a replacement contact.
- Open **Đổi mật khẩu**, close it and reopen: password fields are empty. During a submitted change, dismissal is blocked. Incorrect-current-password errors return focus to the current-password field after the form unlocks; connection failures keep the inputs available for a manual retry.
- **Tùy chọn thông báo** discards an unsaved draft when closed, keeps pending saves from accidental dismissal and restores focus to the opening control. Reopen to inspect the saved values.
- The cooperative receiving-bank section is intentionally retained pending BA confirmation. The current Jira request to move it to PAY-01 has not been applied. Logo upload/removal and a full real-API cooperative-profile release are not delivered by this snapshot.

## Automated checks

Stop the development server before building in the same checkout. Run these sequentially:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:session-pages
```

The last command tests the built app's session/API-mode guards with fixture configuration. It does not authenticate against the actual backend. Live Redis suites skip when `OMTS_TEST_REDIS_URL` is absent; the UI review does not need that variable.

Windows uses one Vitest worker and two Next.js static-build workers to reduce contention when loading Next/ESLint and generating pages. Other platforms retain four Vitest workers and Next's normal build-worker selection. No test is skipped and no timeout is increased. The earlier timeout observations remain documented; limiting workers does not prove all sources of tool-startup latency have been eliminated.

To inspect the production build after checks, run `npm run start` and open the URL printed in the terminal.

## Review boundaries

- Most feature data and authentication are currently mocked. Many edits and mock sessions reset after a full page reload; there is no shared backend persistence for this review.
- Mock verification does not deliver real email or SMS. Start with the Owner account to inspect management screens without going through first-login onboarding.
- QR provenance, full operational modules, and a complete real-API authentication/profile/logout flow are not delivered by this snapshot. Live refresh remains disabled.
- Employee unlink UI/mock behavior follows the new backend contract, but the employee HTTP/BFF adapter is not enabled. Backend release readiness is tracked separately.
- Passing mock tests does not mark the corresponding Jira stories complete or prove backend/QA acceptance.

See the [README](../README.md) for environment troubleshooting, [project context](PROJECT_CONTEXT.md) for current status, and [open decisions](decisions/OPEN_QUESTIONS.md) for business/backend questions that remain unresolved.

When a receipt catalog/raft list, supplier receipt debt, or water zone lookup fails, use its new **Tải lại…** button after the connection returns. It performs only a read and retains current filters, amount, method, reference and receipt lines. It does not unlock or replay an uncertain Save. Read failures now use the normal operation-error message; uncertain writes keep the reconciliation warning. See [lookup recovery QA](reports/WEB_OPERATIONS_LOOKUP_RECOVERY_2026-10-30.md).
