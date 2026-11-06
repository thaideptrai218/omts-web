# OMTS Web redesign — inventory and batch verification (03/11/2026)

## Route and component audit

| Route family | Data mode and implementation | Redesign status |
| --- | --- | --- |
| `/dashboard` | Mock dashboard and API workspace home | Representative phase: shared shell, heading, KPI hierarchy |
| `/farming/zones`, `/farming/rafts` | Mock directories, detail views and dialogs | Zones in representative phase; raft list already uses the shared management language |
| `/workspace/[resource]` | API zones, rafts, suppliers, input-items, accounts and roles; employees uses separate API screen | Batch 1: heading, filter panel, dense responsive table and status labels |
| `/employees`, `/access/accounts`, `/access/roles` | Mock management directories and detail workflows | Existing shared `ManagementHeading`, `StatusPill` and directory rows; employee mock verified visually |
| `/operations/[area]` | API receipts, payments, water, products, purchase requests, workforce and personal work; selected mock routes | Batch 2: shared operational heading, filters and table framing; workforce was in representative phase |
| `/account`, `/account/security`, `/cooperative/profile` | Mock and API profile/security forms | API personal profile in representative phase; cooperative heading and status in batch 3; remaining form detail polish pending |
| `/login`, `/register`, `/recover`, `/session/recover`, `/onboarding/*`, `/system/cooperatives/new` | Auth and provisioning flows | Provisioning heading aligned in batch 3; remaining auth form polish pending |

The application uses effective permissions and backend checks. Route names do not imply new actor types. Current repository actors include System Administrator, Cooperative Owner, Staff with zone grants, Accountant and Trader; the redesign does not introduce Attendant or Employee permissions.

## Batch 1 — API directories

- Added `DataGrid` with a dense desktop table and labeled record rows at mobile widths. The table keeps semantic headings for assistive technology.
- Applied the existing management heading and status visual language to API resource directories and the employee API directory. Search, filtering, paging, opening records, zone selection, create/edit gates and repository calls remain unchanged.
- Localized displayed status and catalogue group labels where the API supplies English enum values.
- `operations/ui.tsx` now reuses `DataGrid`, so other operational tables inherit the same density and surface treatment without changing their rows or actions.
- Corrected an old mock employee test assumption: the current fixture's accountant account is active. The test now creates a locked account within that one test to keep coverage of both statuses.

Checks: lint and typecheck passed; 24 focused tests passed; production build passed. The wider employee-management run initially had 535 pass / 1 stale assertion, which was resolved by the focused test change.

## Batch 2 — operational directories

- Introduced shared `OperationHeading` and `FilterPanel` presentation components. Applied them to receipts, supplier payments, water, personal work, products and purchase requests.
- Shared table framing now covers their lists, detail tables and comparison tables. Existing API contracts, state transitions, warnings and permission conditions remain in their respective features.
- On narrow screens, operational tables keep the identifying first column visible while the remaining columns scroll horizontally. API directories use labeled stacked rows instead.

Checks: lint and typecheck passed; 57 operations tests passed; production build passed.

## Visual QA and limits

- On local mock mode, inspected Owner employee and raft directories and workforce at 360, 1024 and 1440 CSS px using the in-app browser. No horizontal document overflow at the checked widths. Search/filter labels, row states, primary actions and sidebar remain visible.
- Also inspected the Owner account and role directories, their detail dialogs and the cooperative profile at narrow width. The shared heading, summaries and directory rows remain legible; account and role dialogs retain their existing actions.
- The browser runs at 150% scaling, so the viewport override was adjusted to reach the intended CSS widths. The override should be reset after this QA session.
- API browser runtime was unavailable on ports 3002/3003 and backend on 8082 at the time of this pass. API directories and operational pages passed static/build and component tests, but their live visual and role workflows need a running API stack before marking end-to-end QA complete.
- A final `docker ps` check could not connect to `dockerDesktopLinuxEngine`; the local API stack could not be started without the engine.
- Mock role/account dialogs still represent older local workflows in places (for example grant effective dates). This redesign did not change their business rules. Validate against the current API contract in a separate business-alignment task.

## Batch 3 — cooperative profile and provisioning

- Aligned the API and mock cooperative profile headings and status presentation with the shared management components. Aligned the System Administrator provisioning heading with the same system.
- Kept the cooperative form fields, validation, logo actions, preview, review dialog and access boundaries unchanged.

Checks: lint and typecheck passed; 44 cooperative/provisioning tests passed; production build passed. Mock Owner cooperative profile was inspected at 360 CSS px, including its legal information, contact, business and bank sections; document width was 350 px within a 360 px viewport. API profile and provisioning require a live API/admin session for visual QA.

## Batch 4 — authentication shell and test reconciliation

- Removed decorative circles and a hardcoded cooperative name from the shared auth shell. Login, registration, recovery and onboarding continue using their existing forms and verification order.
- Inspected mock recovery at 360 CSS px: all three steps, channel selection, contact field and next action remain visible; document width was 345 px. This verifies the shell and first mock recovery step, not the API OTP completion path.
- A full repository test run found nine failures: two tests searched for a `textbox` after the API directory search became a semantic `searchbox`; seven tests relied on old mock usernames, a formerly locked accountant or a formerly unused accountant role. The production fixtures now correctly show `manager`/`ketoan`, an active accountant and an assigned accountant role. Tests now construct locked or unused cases locally when they need those scenarios.

The first full run had 2,944 passing tests, 48 skipped and nine failures before these test corrections. The six failing test files were rerun afterward: 26/26 tests passed. The final full run passed: 2,953 tests, 48 skipped across 278 files. No production permission or business rule was changed to satisfy stale expectations.

Final lint, typecheck, production build and `git diff --check` passed after the last UI and test changes.

## Next batch

Finish auth form rhythm and remaining detail layouts. Check long, empty, error and permission-denied states, plus live API roles when the QA runtime is available.

## Coastal Enterprise palette preview

- Applied the requested palette to shared tokens: navy `#10243A`, teal `#086F78`, canvas `#F5F7FA`, white surface `#FFFFFF`, and border `#D7E5E9`. Both navigation shells use the same white surface.
- Replaced the four separate dashboard KPI cards with one compact metric strip. The values still come from the existing dashboard view; no new metric or API was introduced.
- Renamed the primary workforce action to **Tạo phân công** in mock and API modes. The form, permissions, validation, and submit flow are unchanged.
- Local Owner visual QA: [`omts-dashboard-coastal-2026-11-03.png`](./omts-dashboard-coastal-2026-11-03.png), [`omts-workforce-coastal-2026-11-03.png`](./omts-workforce-coastal-2026-11-03.png), and [`omts-create-assignment-coastal-2026-11-03.png`](./omts-create-assignment-coastal-2026-11-03.png). Checked the default narrow viewport and a 1040 CSS px layout; no document overflow. The browser screenshot tool clipped the wide viewport, so only the narrow captures are retained as evidence.
- **Xuất báo cáo** and **Cần xử lý** remain labels for future data-backed contexts. This pass did not add an export action or fabricate an alert count. **Đang hoạt động** continues to describe existing account status data.

## Workforce screen redesign sample — 04/11/2026

- Rebuilt the existing `/operations/workforce` presentation in both mock and API modes using shared `WorkforceHero`, filter, list, empty-state and form-section components. The hero ties the selected business day to counts calculated from the currently visible assignments; it shows placeholders during loading or error, and adds no new production metrics.
- The list uses the same dense table on desktop and labeled rows at narrow widths. The empty state distinguishes no assignments from a filter with no match. The editor groups the existing fields into schedule/location and employees without changing validation, permissions, API calls or confirmation steps.
- Browser QA in local mock mode: Owner opened the form, selected Khu Đông/B1-01/Nguyễn Văn An, confirmed the assignment, saw the count move from 0 to 1 and the record appear. At 360 and 1024 CSS px, document width stayed within the viewport. This mock assignment is in memory and resets on reload.
- Evidence: [desktop empty state](./omts-workforce-redesign-desktop-2026-11-04.png), [mobile populated list](./omts-workforce-redesign-mobile-data-2026-11-04.png), [360 px editor](./omts-workforce-redesign-form-360-2026-11-04.png). Earlier 03/11 screenshots are the before sample.
- Focused workforce tests: 15 passed across three files; lint, typecheck, production build and `git diff --check` passed. API-mode visual and end-to-end role QA still require the API runtime.

## Refinement batch — 04/11/2026

- Reworked the workforce sample after visual review: the oversized dark banner became a compact white workday header with a navy edge and a clear primary action. Removed decorative numbering and the repeated create action in the empty state. The day metrics remain derived from the filtered assignments; no new data was introduced.
- Applied the same restrained heading, status, button, table-header and navigation treatment across the shared mock/API components. The dashboard now presents its existing data in a compact metric strip and status rows; the farming summary uses a focused navy surface. Removed the empty finance placeholder from the mock dashboard.
- Changed the mock zone directory from a two-column card grid to a dense operational list with code, location, area, document status and usage status. Its narrow layout shows labeled record content without horizontal page scroll. The loading skeleton now matches the list shape.
- The routes that select mock/API content after `connection()` now explicitly opt out of Next.js instant-navigation validation. This removes the misleading dropped-segment development warning; it does not make those routes instant or alter session behavior.
- Local browser checks: Owner workforce and zone directory rendered, zone search `Nam` returned only Khu Nam, and its detail dialog opened. No document overflow at the checked 497 and 1024 CSS px widths. Evidence: [refined workforce](./omts-workforce-refined-mobile-2026-11-04.png), [zone list](./omts-zones-refined-mobile-2026-11-04.png), [dashboard](./omts-dashboard-enterprise-2026-11-04.png). The desktop screenshot API clipped the right side, so it is not presented as full visual evidence.
- Replaced the mock role card grid with a compact directory that compares role, description, active account count, granted function count and status. The existing role detail and permission editor still open from each row. Browser Owner: opened Quản lý vùng, search `Kế` returned one role; at 360 CSS px document width was 350 px. Evidence: [role directory](./omts-roles-refined-mobile-2026-11-04.png), [360 px role directory](./omts-roles-refined-360-2026-11-04.png).
- Lint, typecheck, production build, 64 targeted tests and `git diff --check` passed before the role-list refinement. A full run passed 2,953 tests with 48 skipped; because the role-list markup changed while this run was in progress, focused role checks and final lint/typecheck/build are repeated below. Live API-mode role and visual verification remains dependent on the QA runtime.
- Final checks after the role-list change: 93 focused tests passed across 20 files, lint/typecheck/build and `git diff --check` passed. No merge or deployment was performed. The next visual batch is the remaining form/detail polish; API roles, empty/error states and the 1440 px presentation still need live-browser verification.

## Oyster navigation and data-backed dashboard — 04/11/2026

- Replaced the generic brand mark with a code-native oyster and pearl SVG inspired by the supplied image. The mark appears in the navigation and auth shells. Individual sidebar destinations now use distinct semantic icons instead of repeated generic symbols.
- Narrowed the desktop sidebar to 15rem and gave both mock and API navigation the same navy surface, teal active state and subtle canvas gradient. Long Vietnamese labels wrap within the sidebar. The mock sidebar was visually checked after a full reload.
- Reorganized the dashboard into a farming operations feature, a compact task list, a metric strip and two current-state distribution bars. Counts and percentages come from the existing dashboard view. The loading state now follows the same dark/teal hierarchy instead of flashing four large white cards.
- The dashboard data model contains only current counts, with no historical series or activity feed. Temporal trends and a real activity timeline require a data source; this batch does not invent dates, growth rates or alert records. The locked-account attention strip appears only when the real locked count is positive.
- Local mock Owner visual QA: [dashboard](./omts-dashboard-oyster-2026-11-04.png), [dashboard distribution](./omts-dashboard-charts-2026-11-04.png) and [zone directory](./omts-zones-oyster-2026-11-04.png) at desktop width. Also inspected the employee directory and raft directory. The raft directory measured 345px document width inside a 360px viewport. The zone and dashboard directories were checked at 360px earlier in this batch with no horizontal overflow.
- API shell and navigation were compiled and typechecked, but live API role visuals were unavailable because the local API runtime on port 3002 did not respond. No API contract, route, permission or state transition was changed. No merge or deployment was performed.
- Final checks for this batch: 25 focused dashboard/layout tests, lint, typecheck, production build and `git diff --check` passed.
