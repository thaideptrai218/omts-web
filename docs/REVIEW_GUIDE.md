# Reviewer quick start

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
