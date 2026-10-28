# OMTS Web

Web frontend for **OMTS — Oyster Management and Traceability System**, built for **Trung Nam Aquaculture Cooperative** as part of the SEP490_G83 capstone project.

This repository contains the management portal built with **Next.js App Router and TypeScript**. It serves the Cooperative Owner and internal users according to their assigned permissions. Public QR-based provenance pages are part of the product scope but are not complete in the current version. User-facing UI text is Vietnamese.

Team repositories: [Web](https://github.com/thaideptrai218/omts-web) · [Backend](https://github.com/thaideptrai218/omts-backend) · [Mobile](https://github.com/thaideptrai218/omts-mobile).

## Current status

**Reviewing this project for the first time?** Follow the [reviewer quick start and screen checklist](docs/REVIEW_GUIDE.md).

For a presentation without development overlays, use `npm run build` followed by `npm run start`. Use `npm run dev` while editing code.

> Last updated: **October 28, 2026**. This README describes the source on the branch you are viewing, not every planned OMTS feature.

- **The UI can run with mock data** without a backend, database, Docker, or Redis.
- Cooperative profile, employee, account, role, and personal profile screens currently use mock service/repository adapters.
- Farming zones now have a searchable directory and profile dialogs. Owners can create, rename, edit and discontinue/reactivate zones, then add shared legal documents and replacement versions. Assigned internal users with View permission have read-only access. Renames keep stable zone IDs and update management pickers and role/scope labels from a shared source. Sample locations are not verified cooperative records.
- Rafts now have a directory, profile dialogs, dated lane diagrams and segment-source details. Owners can create/edit rafts and layouts, upload JPEG/PNG photos and discontinue/reactivate eligible rafts. Open cultivation cycles block layout changes and discontinuation; historical layouts are retained. Assigned readers stay within their zone/record scope. Missing material cost remains unknown until purchase receipts are available.
- Date fields use Vietnamese day/month/year entry and a Vietnamese picker while service values remain ISO dates. The desktop sidebar reserves layout space when it expands instead of covering page text.
- The navigation now uses a light sidebar, opens by default on desktop, and supports explicit collapse/pinning plus delayed hover and keyboard expansion. Account name, role and scope appear on separate lines. The mobile drawer releases its scroll lock when resizing to desktop. The dashboard prioritizes raft usage and presents permitted shortcuts as a list.
- The review build shares mock state between management screens: updated role permissions can be assigned, new accounts can be linked to employees, and dashboard counts update. Created staff accounts can complete first-login password/contact setup; account locking and password reset affect their mock login. Personal profile changes, password recovery, and notification settings can be demonstrated without a backend.
- The approved October 27 role policy is now **three fixed zone roles: Zone Manager, Accountant, and Staff**. Owners can edit permissions and discontinue/reactivate roles; they cannot add, copy, or rename roles. Staff initially has no business permissions. This policy is implemented in the product mock; backend/SRS alignment is tracked separately.
- Dashboard headings and permitted shortcuts render while metrics load. Management directories now include clearer rows, summaries and combined filters; editors continue to open in dialogs.
- Real API integration through the Next.js BFF is in progress. Some session, authorization, and routing layers are implemented, but **a complete real-API login → profile → logout flow is not available yet**. Live token refresh remains disabled.
- The current UI work is on `feature/OMTS-132-web-foundation` and has not been merged into `develop`. Check out the correct branch to review the screens and configuration described below.

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

These accounts exist only in the **frontend mock**. They are not backend or QA credentials. The shared demo password is **`demo123`**.

| Username | Review scenario |
| --- | --- |
| `owner` | Cooperative Owner: dashboard, cooperative profile, employees, internal accounts, roles/permissions, farming zones and rafts |
| `staff-verified` | Verified Staff: restricted navigation and personal profile |
| `sysadmin` | System Administrator: cooperative provisioning |
| `staff-first-login` | First-login onboarding: change the temporary password and verify contact information; not intended for a quick management UI review |

You can also use **`nguyen.an`** (zone manager) or **`pham.cuong`** (zone manager in Khu Nam). `staff-verified` remains a review alias for `nguyen.an`. `tran.binh` is a locked fixture and should be rejected. These fixtures also use `demo123` initially.

For newly created mock staff accounts, use the generated username shown in the delivery receipt and the same **public mock password** `demo123`. The first login requires a new password and one verified contact. In this review mode, OTP codes are `123456` for the initial send, then `654321` and `112233` after resends. No actual email or SMS is sent. These values are not backend credential-generation rules or production secrets.

For a quick management UI review, use **`owner / demo123`**. Account fixtures are defined in [mock-auth-repository.ts](src/features/auth/repositories/mock-auth-repository.ts).

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

Setting `OMTS_DATA_SOURCE=api` does not automatically connect mock screens to the backend. API mode blocks screens that still depend on mocks while their adapters and flows remain unfinished. Do not enable real API access or refresh merely by supplying a backend URL.

Before integration, read the [real API implementation plan](docs/WEB_REAL_API_IMPLEMENTATION_PLAN.md), [open decisions](docs/decisions/OPEN_QUESTIONS.md), and [example configuration](.env.example). Backend URLs, encryption keys, and Redis configuration are server-only; do not expose them through `NEXT_PUBLIC_*` variables.

## 8. Troubleshooting

| Symptom | What to check |
| --- | --- |
| `package.json` cannot be found | Your terminal is not in `omts-web`. Change to the repository directory and retry. |
| Port 3000 is already in use | Run `npm run dev -- --port 3001` and open the address printed in the terminal. Do not stop unrelated applications. |
| PowerShell refuses to run `npm.ps1` | Use `npm.cmd ci`, `npm.cmd run dev`, or Command Prompt. You do not need to change the machine's execution policy. |
| Demo login is rejected | Check that the source is mock and try `owner / demo123`. Backend accounts are not automatically available in the mock. |
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
