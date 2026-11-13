# OMTS Web

Web frontend for **OMTS — Oyster Management and Traceability System**, built for **Trung Nam Aquaculture Cooperative** as part of the SEP490_G83 capstone project.

This repository contains the management portal built with **Next.js App Router and TypeScript**. It serves the Cooperative Owner and internal users according to their assigned permissions. User-facing UI text is Vietnamese.

The app runs in **mock mode** by default, with no backend, database or Docker needed (section 2). It can also run against the real API through a Next.js server (BFF), see section 7. Product rules that differ from SRS v8 are listed in [docs/SRS_DEVIATIONS.md](docs/SRS_DEVIATIONS.md); the documentation index is [docs/README.md](docs/README.md).

Team repositories: [Web](https://github.com/thaideptrai218/omts-web) · [Backend](https://github.com/thaideptrai218/omts-backend) · [Mobile](https://github.com/thaideptrai218/omts-mobile).

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

Check out the branch you want to run **before installing dependencies**, for example `git switch develop` or your feature branch.

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

API settings in [`.env.example`](.env.example) are commented out for reference. **You do not need to uncomment them to run the mock UI.** If you already have `.env.local`, review it rather than overwriting it. Do not commit local environment files or secrets.

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

Các tài khoản mock trên dùng chung **`Demo@1234`**. Đây là bộ tài khoản QA đơn giản, không phải credential backend production. 

For newly created mock staff accounts, use the generated username shown in the delivery receipt and the same **public mock password** `Demo@1234`. The first login requires a new password and one verified contact. In this review mode, OTP codes are `123456` for the initial send, then `654321` and `112233` after resends. No actual email or SMS is sent. These values are not backend credential-generation rules or production secrets.

Để kiểm tra nhanh, dùng **`owner / Demo@1234`**. Fixtures được định nghĩa trong [mock-auth-repository.ts](src/features/auth/repositories/mock-auth-repository.ts).

The Web login form accepts a phone number or a username with the password. An email address is refused (the form rejects any value containing `@`). In mock mode the demo usernames above and the phone number `0900000000` (Owner) also work.

The API runtime has separate seeded accounts. The Web login form accepts the phone number or the username of the seeded account, with its password. For local API testing at `http://localhost:3002/login`, every active account below uses `Demo@1234` unless its password was changed later:

| Username | Role and test scope |
| --- | --- |
| `owner` | Cooperative Owner, all zones |
| `quanlyvung1` | Zone Manager, DEMO-01 |
| `quanlyvung2` | Zone Manager, DEMO-02 |
| `ketoan` | Accountant, all zones |
| `sysadmin` | System Administrator in the isolated API runtime; account directory, detail, lock/unlock and administration history at `/system/accounts` |
| `thuonglai1` | Active Trader |
| `thuonglai2` | Locked Trader; login should be rejected |
| `nhanvien.doimk` | Staff; first-login password change |
| `nhanvien.chuaxacthuc` | Staff; phone verification required |
| `nhanvien.hethan` | Staff with revoked zone grant; access should be rejected |

The mock usernames `manager`, `manager2`, and `trader` do not identify the corresponding backend accounts. The backend seed preserves changed passwords. Never commit JWT keys, BFF secrets, or `.env` files.

The mock does not send real email or SMS. Mock data is separate from backend data; many changes exist only in the current browser session and may be lost on reload. Mock authentication also does not survive a page reload like a real server session.

## 4. Available screens

Sign in with the appropriate account and use the sidebar to navigate. Opening a URL directly does not bypass permission checks.

| Route | Screen | Who can open it |
| --- | --- | --- |
| `/login`, `/recover`, `/session/recover`, `/onboarding/*` | Sign in, password recovery, first-login onboarding | Signed-out users, or accounts in onboarding |
| `/` | Public landing page | Everyone |
| `/dashboard` | Dashboard with metrics and no-data states | Signed-in users, per permissions |
| `/cooperative/profile`, `/cooperative/certifications`, `/cooperative/receiving-bank-account` | Cooperative profile, certifications, receiving bank account | Owner |
| `/farming/zones`, `/farming/rafts`, `/farming/cycles` | Zones, rafts and cultivation cycles | Owner writes; permitted internal users read assigned zones |
| `/inputs/items`, `/inputs/uses`, `/inputs/disposals` | Input items, stock usage and disposal | Per permissions |
| `/operations/purchase-receipts`, `/operations/purchase-returns`, `/operations/purchase-requests/[id]`, `/operations/supplier-debts`, `/operations/cash-book` | Purchasing, supplier debts, cash book | Per permissions |
| `/employees` | Employee list, profile tabs and account creation | Owner |
| `/access/accounts`, `/access/roles` | Internal accounts and zone grants; roles and permissions | Owner |
| `/trader-requests` | Trader access requests | Owner |
| `/notifications`, `/account`, `/account/security`, `/account/devices` | Notifications, personal profile, security and devices | Signed-in users |
| `/audit` | Audit log | Owner |
| `/system/accounts`, `/system/cooperatives/new` | System account directory; cooperative provisioning | System Administrator |
| `/origin/{qrToken}` | Public provenance page opened from an invoice QR code | Anyone with the link |

## 5. Project structure

```text
src/
├── app/          Next.js routes/layouts: public, auth, app groups; BFF Route Handlers
├── components/   Shared UI: sidebar, dialogs, buttons, toasts, etc.
├── features/     Feature modules: auth, profile, employee-management, access, etc.
├── server/       Server configuration, BFF sessions and verification cookies, and backend transport
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
| `npm run dev:api` | Start the development server against the real API workspace (see section 7) |
| `npm run setup:api` | Generate the ignored `.env.api.local` for the API workspace |
| `npm run start:api` | Serve the production build against the real API workspace |
| `npm run test:api-roles` | Check the API role matrix (needs the API runtime) |

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


CI currently runs `npm ci → lint → typecheck → test → build → test:session-pages` for pull requests targeting `develop/main` and pushes to those branches. A feature-branch push alone does not prove CI has run.

</details>

## 7. Real API integration

The browser calls the Next.js server (the BFF), which calls the .NET backend. The BFF holds no session state, so no Redis or other database is needed. Sign-in cookies, refresh and session rules are listed in [docs/SRS_DEVIATIONS.md](docs/SRS_DEVIATIONS.md), section "Quy ước riêng của Web".

Use the [local tester guide](docs/REVIEW_GUIDE.md#real-api-workspace--local-tester-run) to start the backend and API workspace on `http://localhost:3002`. Supported management, purchasing and water screens use dedicated BFF adapters; existing mock screens stay separate. API mode requires the session/coordination configuration generated in the ignored `.env.api.local`, beyond the backend URL. Set `OMTS_BFF_SHARED_SECRET` (the same value as the API `BffClient:SharedSecret`) and `OMTS_WEB_CLIENT_IP_SOURCE` so the API sees the real client address and browser; see [`.env.example`](.env.example).

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
| Configuration/session unavailable after changing environment settings | Check `OMTS_DATA_SOURCE=mock` and leave unused API variables disabled. Restart the server after editing `.env.local`. |
| A build cannot download fonts | Check Internet/proxy connectivity: the layout uses `next/font/google`. Then retry the build. |

## 9. Further reading

- [Documentation index](docs/README.md): every document, report and decision.
- [SRS deviations](docs/SRS_DEVIATIONS.md): what differs from SRS v8 and what to update in the SRS.
- [Project context](docs/PROJECT_CONTEXT.md), [implementation plan](docs/WEB_REAL_API_IMPLEMENTATION_PLAN.md), [page blueprints](docs/UI_PAGE_BLUEPRINTS.md).
- [Open business questions and decisions](docs/decisions/OPEN_QUESTIONS.md).
- [Contribution, branching, and pull request guidelines](CONTRIBUTING.md).

Reports capture evidence at the time they were written. Check the current source and approved decisions; plans and passing mock tests do not prove a feature works against the backend or QA environment.
