# OMTS Web

Web frontend for **OMTS — Oyster Management and Traceability System**, built for **Trung Nam Aquaculture Cooperative** as part of the SEP490_G83 capstone project.

This repository contains the management portal built with **Next.js App Router and TypeScript**. It serves the Cooperative Owner and internal users according to their assigned permissions. Public QR-based provenance pages are part of the product scope but are not complete in the current version. User-facing UI text is Vietnamese.

Team repositories: [Web](https://github.com/thaideptrai218/omts-web) · [Backend](https://github.com/thaideptrai218/omts-backend) · [Mobile](https://github.com/thaideptrai218/omts-mobile).

## Current status

**Reviewing this project for the first time?** Follow the [reviewer quick start and screen checklist](docs/REVIEW_GUIDE.md).

For a presentation without development overlays, use `npm run build` followed by `npm run start`. Use `npm run dev` while editing code.

> Last updated: **November 3, 2026**. This README describes the source on the branch you are viewing, not every planned OMTS feature.

- **The UI can run with mock data** without a backend, database, Docker, or Redis.
- Mock review mode and the real API workspace use separate repository adapters. The API workspace now includes cooperative, employee, account, role and personal workflows as described below.
- Farming zones now have a searchable directory and profile dialogs. Owners can create, rename, edit and discontinue/reactivate zones, then add shared legal documents and replacement versions. Assigned internal users with View permission have read-only access. Renames keep stable zone IDs and update management pickers and role/scope labels from a shared source. Sample locations are not verified cooperative records.
- Rafts now have a directory, profile dialogs, dated lane diagrams and segment-source details. Owners can create/edit rafts and layouts, upload JPEG/PNG photos and discontinue/reactivate eligible rafts. Open cultivation cycles block layout changes and discontinuation; historical layouts are retained. Assigned readers stay within their zone/record scope. Missing material cost remains unknown until purchase receipts are available.
- Date fields use Vietnamese day/month/year entry and a Vietnamese picker while service values remain ISO dates. The desktop sidebar reserves layout space when it expands instead of covering page text.
- The navigation now uses a light sidebar, opens by default on desktop, and supports explicit collapse/pinning plus delayed hover and keyboard expansion. Account name, role and scope appear on separate lines. The mobile drawer releases its scroll lock when resizing to desktop. The dashboard prioritizes raft usage and presents permitted shortcuts as a list.
- The review build shares mock state between management screens: updated role permissions can be assigned, new accounts can be linked to employees, and dashboard counts update. Created staff accounts can complete first-login password/contact setup; account locking and password reset affect their mock login. Personal profile changes, password recovery, and notification settings can be demonstrated without a backend.
- The approved October 27 role policy is now **three fixed zone roles: Zone Manager, Accountant, and Staff**. Owners can edit permissions and discontinue/reactivate roles; they cannot add, copy, or rename roles. Staff initially has no business permissions. This policy is implemented in the product mock; backend/SRS alignment is tracked separately.
- Dashboard headings and permitted shortcuts render while metrics load. Management directories now include clearer rows, summaries and combined filters; editors continue to open in dialogs.
- A local API workspace supports real login → permissions/profile → logout through the Next.js BFF, management screens, purchase receipts, supplier payments and water measurement workflows. Employee profiles support account link/unlink, working zones, bank details and separate employment changes with account follow-up. Saved zone profiles support shared licenses and renewal history; saved raft profiles support photos, dated lane conditions and receipt-backed costs. Use `npm run setup:api`, `npm run build` and `npm run start:api`; the default review mode remains mock. Staff contact activation and new-account creation still await backend alignment. Live token refresh remains disabled.
- Personal API profiles show identity, verified contacts and current grants, with versioned display-name edits. Notification preferences use the backend account-type catalog; mandatory In-app cells are locked and Push is read-only. Owners can inspect role matrices, usage and grant history, then revoke an existing grant with a reason and confirmation. New grants and role edits await fixed-role alignment. Web supports the upcoming backend PR19 message codes alongside the current contract, including notification notice precedence and the removed null raft-source fields. See the [latest workflow evidence](docs/reports/WEB_PERSONAL_NOTIFICATIONS_ACCESS_API_2026-10-29.md) and [Jira/contract changes](docs/reports/WEB_JIRA_PR19_CONTRACT_UPDATE_2026-10-29.md); planned SRS changes are not deployed APIs.
- Approved G2 now connects real Trader registration, password recovery, contact verification/change and email-code password changes. Verification proofs stay encrypted in Redis and bind to the G1 context/session/purpose; browsers receive opaque flow IDs and safe metadata. Verified contacts wait for explicit profile Save. Independent name/contact writes report partial success truthfully and retain remaining drafts. Password changes reuse G1 session rotation. See [G2 validation and limits](docs/reports/WEB_G2_VERIFICATION_API_2026-10-29.md); Staff contact onboarding and other backend contract blockers remain open.
- The current UI work is on `feature/OMTS-132-web-foundation` and has not been merged into `develop`. Check out the correct branch to review the screens and configuration described below.
- In API mode, cooperative profiles now support editable industry rows, validation, name/address preview and confirmation, plus separate PNG/JPEG/WebP logo upload/removal. Drafts survive logo changes and conflicts. Receiving-bank integration still awaits the existing BA/backend decision; see the [tester flow and limitations](docs/reports/WEB_COOPERATIVE_API_2026-10-29.md).
- Docker/API verification is available without changing the older QA databases: the latest isolated runtime uses API `8082` and SQL Server `1436`, while the existing develop/QA runtimes remain on `8080`/`8081`. See the [Docker/API/Vercel runtime report](docs/reports/WEB_DOCKER_API_VERCEL_2026-11-03.md).
- The production Vercel alias is [omts-web.vercel.app](https://omts-web.vercel.app). It currently runs the safe mock mode; a real Vercel API deployment still requires a stable HTTPS backend and hosted Redis with TLS/authentication.

## 1. Prerequisites

| Tool | Requirement |
| --- | --- |
| Node.js | **24.x**, as specified in [`.nvmrc`](.nvmrc) and used by CI |
| npm | Use the version bundled with Node.js; this repository includes `package-lock.json` |
| Git | Required to clone the repository and switch branches |
| GitHub access | Your account must have access if the repository is private |

An Internet connection is required to install dependencies. Builds may also need to download Google Fonts through `next/font`.

Check your environment:

```bash
node --version
npm --version
git --version
```

## 2. Run the frontend locally

### Step 1 — Clone the repository and select a branch

```bash
git clone https://github.com/thaideptrai218/omts-web.git
cd omts-web
```

To review the current foundation work, switch to this branch **before installing dependencies**:

```bash
git switch feature/OMTS-132-web-foundation
```

If you already have a checkout, open a terminal in its `omts-web` directory instead of cloning again. Check `git branch --show-current` before running the app. Do not reset or overwrite uncommitted work just to switch branches.

### Step 2 — Install dependencies

```bash
npm ci
```

`npm ci` installs the dependency versions recorded in the lockfile so team members use the same dependency set. Run it again after pulling changes that update `package-lock.json`.

### Step 3 — Configure the local environment

If `.env.local` does not exist, copy the example file.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env.local
```

**macOS, Linux, or Git Bash:**

```bash
cp .env.example .env.local
```

Keep the active configuration set to:

```dotenv
OMTS_DATA_SOURCE=mock
```

API and Redis settings in [`.env.example`](.env.example) are commented out for reference. **You do not need to uncomment them to run the mock UI.** If you already have `.env.local`, review it rather than overwriting it. Do not commit local environment files or secrets.

### Step 4 — Start the development server

```bash
npm run dev
```

Keep the terminal running and open **[http://localhost:3000/login](http://localhost:3000/login)** in your browser. The first request may take longer while Next.js compiles the page.

If another application is using port 3000, choose a different port:

```bash
npm run dev -- --port 3001
```

Then open **[http://localhost:3001/login](http://localhost:3001/login)**. Always check the address printed in the terminal. Use `Ctrl+C` to stop the server you started.

## 3. Demo accounts

These accounts exist only in the **frontend mock**. They are not backend or QA credentials. The shared mock password is **`Demo@1234`**.

| Username | Review scenario |
| --- | --- |
| `owner` | Chủ HTX; tên hiển thị **Ngô Nam Trung**; toàn HTX, quản trị, nhân sự, vùng nuôi và mua hàng |
| `manager` | Quản lý vùng 1; thao tác trong vùng được phân công, điều hành và gửi yêu cầu thanh toán |
| `manager2` | Quản lý vùng 2; dùng để kiểm tra phân quyền theo vùng và dữ liệu tách biệt |
| `ketoan` | Kế toán; phạm vi toàn HTX, xử lý thanh toán và công nợ nhà cung cấp |
| `trader` | Thương lái; kiểm tra sản phẩm, yêu cầu mua hàng và các màn dành cho đối tác |
| `sysadmin` | System Administrator; chỉ dùng cho màn cấp HTX/provisioning |

Các tài khoản mock trên dùng chung **`Demo@1234`**. Đây là bộ tài khoản QA đơn giản, không phải credential backend production. Các fixture username cũ như `nguyen.an`, `pham.cuong`, `staff-verified` và `tran.binh` không còn là tài khoản hướng dẫn chính.

For newly created mock staff accounts, use the generated username shown in the delivery receipt and the same **public mock password** `Demo@1234`. The first login requires a new password and one verified contact. In this review mode, OTP codes are `123456` for the initial send, then `654321` and `112233` after resends. No actual email or SMS is sent. These values are not backend credential-generation rules or production secrets.

Để kiểm tra nhanh, dùng **`owner / Demo@1234`**. Fixtures được định nghĩa trong [mock-auth-repository.ts](src/features/auth/repositories/mock-auth-repository.ts).

The API runtime has separate seeded accounts. For local API testing at `http://localhost:3002/login`, every active account below uses `Demo@1234` unless its password was changed later:

| Username | Role and test scope |
| --- | --- |
| `owner` | Cooperative Owner, all zones |
| `quanlyvung1` | Zone Manager, DEMO-01 |
| `quanlyvung2` | Zone Manager, DEMO-02 |
| `ketoan` | Accountant, all zones |
| `sysadmin` | System Administrator in the isolated meeting API runtime; account directory, detail, lock/unlock and administration history at `/system/accounts` |
| `thuonglai1` | Active Trader |
| `thuonglai2` | Locked Trader; login should be rejected |
| `nhanvien.doimk` | Staff; first-login password change |
| `nhanvien.chuaxacthuc` | Staff; phone verification required |
| `nhanvien.hethan` | Staff with revoked zone grant; access should be rejected |

The mock usernames `manager`, `manager2`, and `trader` do not identify the corresponding backend accounts. The backend seed preserves changed passwords. Never commit JWT keys, Redis URLs, or `.env` files.

The mock does not send real email or SMS. Mock data is separate from backend data; many changes exist only in the current browser session and may be lost on reload. Mock authentication also does not survive a page reload like a real server session.

## 4. Available screens

Sign in with the appropriate account and use the sidebar to navigate. Opening a URL directly does not bypass permission checks.

| Route | Screen | Demo account |
| --- | --- | --- |
| `/login` | Sign in | Signed-out users |
| `/recover` | Password recovery | Signed-out users |
| `/dashboard` | Dashboard with sample metrics and no-data states | Owner / Staff |
| `/cooperative/profile` | Cooperative profile | Owner |
| `/farming/zones` | Zone directory, metadata, legal documents and renewal history | Owner writes; permitted internal users read assigned zones |
| `/employees` | Employee list/editor and account linking/unlinking | Owner |
| `/access/accounts` | Internal accounts, account status, and zone-based access grants | Owner |
| `/access/roles` | Roles and permissions | Owner |
| `/account` | Personal profile, change-password dialog, and notification-preferences dialog | Signed-in users, subject to each action's permissions and prerequisites |
| `/system/cooperatives/new` | Cooperative provisioning | Sysadmin |

This table lists existing UI screens, not use cases accepted against a real API. Income, expenses, rafts, and harvest metrics display the appropriate no-data state when their data sources are unavailable.

## 5. Project structure

```text
src/
├── app/          Next.js routes/layouts: public, auth, app groups; BFF Route Handlers
├── components/   Shared UI: sidebar, dialogs, buttons, toasts, etc.
├── features/     Feature modules: auth, profile, employee-management, access, etc.
├── server/       Server configuration, BFF sessions, Redis, and backend transport
└── shared/       Message catalog, HTTP helpers, and shared utilities
scripts/          Additional verification commands
tests/fixtures/   Isolated test applications/fixtures, not product screens
docs/             Project context, plans, decisions, and review reports
```

Within a feature, the UI calls a **service → repository interface → mock or API adapter**. Components do not modify mock storage or call the backend directly. Displayed role names do not replace permission and zone-scope checks.

## 6. Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with live updates |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Generate Next.js route types and check TypeScript |
| `npm test` | Run Vitest unit, contract, and component tests; no live backend required |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build **after a successful build** |

Before requesting a review, run these commands sequentially:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Do not run the development server and a build concurrently in the same checkout: both use the `.next` directory.

<details>
<summary>Additional BFF/session checks</summary>

These commands are intended for integration and security work. They are not required to open the mock UI.

| Command | Requirements / scope |
| --- | --- |
| `npm run test:session-pages` | Run after `npm run build`; checks HTTP behavior on the built app with fixture configuration, without calling the real backend |
| `npm run test:boundary` | Fixture builds must reject server-only imports in Client Components |
| `npm run test:serialization` | Checks that fixtures do not expose fake tokens in HTML/RSC/client artifacts and reject token serialization |
| `npm run test:cookies` | Runs isolated HTTP cookie checks; does not verify HTTPS behavior |
| `npm run test:cookies:serve` | Starts an isolated browser-check fixture with a fake SID, not a real account |
| `npm run test:redis` | Requires `OMTS_TEST_REDIS_URL` pointing to a dedicated test Redis instance, version >=6.2 |

`npm test` skips live Redis suites when `OMTS_TEST_REDIS_URL` is absent. The explicit `test:redis` command fails if configuration is missing; skipping is not treated as successful integration testing. Do not run these checks against production Redis.

CI currently runs `npm ci → lint → typecheck → test → build → test:session-pages` for pull requests targeting `develop/main` and pushes to those branches. A feature-branch push alone does not prove CI has run.

</details>

## 7. Real API integration

The agreed architecture is a **BFF (Backend for Frontend)**: the browser calls the Next.js server, which communicates with the .NET backend. The browser holds a SID in an HttpOnly cookie; access and refresh tokens are managed on the server. Redis is the selected runtime session store; in-memory storage is for tests only.

Use the [local tester guide](docs/REVIEW_GUIDE.md#real-api-workspace--local-tester-run) to start the backend, Redis and API workspace on `http://localhost:3002`. Supported management, purchasing and water screens use dedicated BFF adapters; existing mock screens stay separate. API mode requires the session/coordination configuration generated in the ignored `.env.api.local`, beyond the backend URL. Refresh remains disabled.

### Docker runtime commands (Windows PowerShell)

Start Docker Desktop first, then start the latest isolated API runtime:

```powershell
docker start omts-latest-qa-sqlserver-1
docker start omts-latest-qa-api-1
curl.exe http://127.0.0.1:8082/health/ready
```

Expected health response: `Healthy`.

Runtime ports:

| Runtime | API | SQL Server | Purpose |
| --- | ---: | ---: | --- |
| `omts` | `8080` | `1433` | Backend develop / legacy local environment |
| `omts-integration` | `8081` | `1435` | Existing QA integration environment |
| `omts-latest-qa` | `8082` | `1436` | Latest isolated backend contract used by Web API review |

Check container groups with:

```powershell
docker compose ls
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

The `omts-latest-qa` database and file volume are separate from the older QA data. Do not run `docker compose down -v`, remove volumes, or reset databases when tester records must be retained.

To run the Web against the real API, use the isolated API configuration and start:

```powershell
npm run start:api
```

The API Web runtime is normally opened at [http://localhost:3002/login](http://localhost:3002/login). The default `npm run dev` mock runtime remains at [http://localhost:3000/login](http://localhost:3000/login).

For scope and remaining contract gaps, read the [INP/ENV integration report](docs/reports/WEB_INP_ENV_API_2026-10-29.md), [real API implementation plan](docs/WEB_REAL_API_IMPLEMENTATION_PLAN.md), [open decisions](docs/decisions/OPEN_QUESTIONS.md), and [example configuration](.env.example). Backend URLs, encryption keys, and Redis configuration are server-only; do not expose them through `NEXT_PUBLIC_*` variables.

## 8. Troubleshooting

| Symptom | What to check |
| --- | --- |
| `package.json` cannot be found | Your terminal is not in `omts-web`. Change to the repository directory and retry. |
| Port 3000 is already in use | Run `npm run dev -- --port 3001` and open the address printed in the terminal. Do not stop unrelated applications. |
| PowerShell refuses to run `npm.ps1` | Use `npm.cmd ci`, `npm.cmd run dev`, or Command Prompt. You do not need to change the machine's execution policy. |
| Demo login is rejected | Check that the source is mock and try `owner / Demo@1234`. Backend accounts are not automatically available in the mock. |
| Configuration/session unavailable after changing environment settings | Check `OMTS_DATA_SOURCE=mock` and leave unused API/Redis variables disabled. Restart the server after editing `.env.local`. |
| A build cannot download fonts | Check Internet/proxy connectivity: the layout uses `next/font/google`. Then retry the build. |

## 9. Further reading

- [Project context and current status](docs/PROJECT_CONTEXT.md).
- [Web implementation plan](docs/WEB_IMPLEMENTATION_PLAN.md) and [detailed page blueprints](docs/UI_PAGE_BLUEPRINTS.md).
- [Real API implementation plan](docs/WEB_REAL_API_IMPLEMENTATION_PLAN.md).
- [Open business questions and decisions](docs/decisions/OPEN_QUESTIONS.md).
- [Review reports](docs/reports/).
- [Contribution, branching, and pull request guidelines](CONTRIBUTING.md).

Reports capture evidence at the time they were written. Check the current source and approved decisions; plans and passing mock tests do not prove a feature works against the backend or QA environment.
