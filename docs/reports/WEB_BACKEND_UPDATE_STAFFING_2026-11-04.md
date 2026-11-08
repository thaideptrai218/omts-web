# Backend update audit and Web staffing integration — 04/11/2026

## Git and scope

- Frontend redesign committed/pushed as `3eee97a` on `feature/OMTS-132-web-foundation`; no merge into develop.
- Fetched every backend branch and all 28 PR heads. Reviewed 49 refs (35 distinct commits). Backend local develop was clean and fast-forwarded from `953f597` to `9ee6c13`; the integration worktree/runtime source remains `946df70`.
- [Controller endpoint inventory](./BACKEND_ENDPOINTS_ALL_REFS_2026-11-04.csv) records method, route, controller, ref and full commit. It is a static extraction of HTTP attributes, not evidence of deployed endpoints or successful runtime authorization.

## Changes found

| Source | Change | Web handling |
| --- | --- | --- |
| develop `9ee6c13` | Previously reviewed legacy cleanup/message catalogue now upstream; SDS document updated | Existing message compatibility retained |
| Zalo branch `33ae741` / feature `b5a1d73` | Five new staffing APIs and `AWAITING_STAFF`; acceptance now requires sufficient staff confirmations | Full Web flow approved by user; implemented in this batch |
| audit-search `4efdf05` / PR26 | Owner-only audit search/facets/detail/open-record, unchanged since previous audit | Separate screen still pending; does not grant Manager audit access |
| cooperative profile `50c1399`, zones/licenses `66284c4` / PR24/28 | Certifications, next-code/resume and changed document rules, unchanged | Previously documented business alignment still pending |
| purchase receipts `708c1cc` / PR27 | Revised receipts contract and lossy migration, unchanged | Previously documented alignment still pending |
| historical LAB `c92787b` | Old payroll/rates/attendance/team APIs | Historical model conflicts with current cleanup; not treated as new current APIs |

No harvest, port weighing/handover, sale transaction/order, customer receipt or complete traceability controllers were found in the audited controller inventories. Purchase staffing does not complete that chain.

New APIs:

- `GET /api/purchase-requests/staffing-employees?day=YYYY-MM-DD` — Owner.
- `GET /api/purchase-requests/{id}/staffing` — Owner.
- `POST /api/purchase-requests/{id}/staffing` — Owner, parent rowVersion.
- `GET /api/me/purchase-shifts?from=YYYY-MM-DD&to=YYYY-MM-DD` — own linked employee, max 63 days.
- `POST /api/me/purchase-shifts/{id}/response` — own invitation, invitation rowVersion.

## Implemented Web flow

- Purchase request filters and details understand `AWAITING_STAFF`; all viewers see the safe staffing summary. Employee names and private replies are loaded only in the Owner section.
- Owner opens a request, sets a plan, sees required headcount and employee availability, confirms invitations and refreshes the parent version after sending. Existing plans lock quantities/dates/capacity/note; more people can be invited.
- Acceptance is unavailable until enough staff have agreed and the work date remains valid. The accepted cages/pickup date come from the frozen plan, including after conflict reconciliation. Rejection remains available with a reason.
- Staff opens `/operations/my-work`, filters the same date range and reads/responds to purchase shifts. Declining requires a reason. Closed/already answered invitations remain read-only.
- BFF routes use fixed server paths, strict input validation and existing Owner/Staff gates. No client-chosen employee/account identity, duplicate employee IDs, arbitrary URL or expanded scope is accepted.
- Unknown write results remain blocked with the draft retained. Read/reload never replays a write; explicit comparison is available. A successful invitation write followed by a failed parent read is shown as sent, with a separate read retry.

Decision: [approved purchase staffing rules](../decisions/WEB_PURCHASE_STAFFING_2026-11-04.md).

## Verification and runtime blockers

- Initial focused Web run: 63 tests passed; typecheck passed. Lint found one unnecessary effect dependency; the panel now remounts by parent rowVersion instead.
- Wider related run: 65 tests passed across five files. After the final acceptance payload/display adjustment, 40 focused staffing/sales/BFF-plan tests passed across three files. Final lint, typecheck, production build and `git diff --check` passed.
- `git merge-tree --write-tree integration Zalo` reported three content conflicts: `NotificationTypes.cs`, `StatusCatalogSeed.cs`, `OmtsDbContextModelSnapshot.cs`. This was a non-checkout preview; no merge/migration was applied.
- Created isolated detached review worktree `D:/Đồ_án/.omts-review-20261104-staffing` at `33ae741`. Backend staffing tests could not start: branch requires SDK 8.0.418, machine exposes only SDK 10.0.103. Docker Engine's Linux named pipe was absent, so container-based execution was also unavailable.
- No new live API or browser E2E claim: the new backend branch must first be integrated with the current QA schema and started. No production/QA database reset, migration, image replacement or secret change was performed.
- [Tester staffing runbook](../testing/PURCHASE_STAFFING_QA_2026-11-04.md) describes the main flow and conflict/privacy/failure cases, with the runtime prerequisite stated first.
- PR3 after the first push: build-test, pr-title and gitleaks succeeded; GitGuardian failed. The user previously assigned GitGuardian handling to the repository owner; this pass did not access/classify its dashboard findings.
