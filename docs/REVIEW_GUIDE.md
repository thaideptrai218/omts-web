# Reviewer quick start

This guide covers the **mock-backed Web UI** on `feature/OMTS-132-web-foundation`. It is intended for a local code/UI review, not acceptance of the real backend integration. Interface labels are Vietnamese; this guide uses the labels you will see on screen.

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

To inspect the production build after checks, run `npm run start` and open the URL printed in the terminal.

## Review boundaries

- Most feature data and authentication are currently mocked. Many edits and mock sessions reset after a full page reload; there is no shared backend persistence for this review.
- Mock verification does not deliver real email or SMS. Start with the Owner account to inspect management screens without going through first-login onboarding.
- QR provenance, full operational modules, and a complete real-API authentication/profile/logout flow are not delivered by this snapshot. Live refresh remains disabled.
- Employee unlink UI/mock behavior follows the new backend contract, but the employee HTTP/BFF adapter is not enabled. Backend release readiness is tracked separately.
- Passing mock tests does not mark the corresponding Jira stories complete or prove backend/QA acceptance.

See the [README](../README.md) for environment troubleshooting, [project context](PROJECT_CONTEXT.md) for current status, and [open decisions](decisions/OPEN_QUESTIONS.md) for business/backend questions that remain unresolved.
