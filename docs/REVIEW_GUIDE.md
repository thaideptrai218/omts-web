# Reviewer quick start

This guide covers the **mock-backed Web UI** on `feature/OMTS-132-web-foundation`. It is intended for a local code/UI review, not acceptance of the real backend integration. Interface labels are Vietnamese; this guide uses the labels you will see on screen.

Updated **October 27, 2026**: the management and authentication mock flows now share state. Use the walkthrough below to demonstrate actions across screens, rather than inspecting isolated forms.

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

The employee directory combines search, employment status and account-link filters. The account directory combines search, zone, role and account status; a grant covering all zones still matches a selected zone. Clear filters to restore the full list. Account editors cannot be dismissed while a confirmed save/status mutation is pending; after it finishes, dismissal is available again.

For a shorter presentation, use the seeded accounts `nguyen.an` or `pham.cuong` with `demo123` to show role/scope labels and Owner-only menu restrictions without creating a new account. `staff-first-login` is a separate first-login scenario; `staff-needs-contact-verification` starts at the contact step. Web Trader registration remains deferred by the user's decision on October 27; there is no `/register` route to demonstrate.

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
