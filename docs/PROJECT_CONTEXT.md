# OMTS Web — current project context

> Update this summary when Jira, the current SRS, or an approved team decision changes. Planned work is not evidence that a feature has already been implemented.

## Product boundary

OMTS supports Trung Nam Aquaculture Cooperative in managing farming zones, rafts, oyster cultivation activities, sales, traceability, employees, attendance, payroll, and related costs.

Current actors are System Administrator, Cooperative Owner, Staff, Zone Manager, Accountant, Trader, and QR Viewer. The current SRS does not define Household, Household Member, or Farmer as actors/entities. Historical terminology must not be reintroduced into routes, permissions, mock data, or UI without an approved requirement change.

For internal Staff accounts, access can be represented by multiple zone-role grants. An account may therefore have different effective permissions in different farming zones. UI visibility must eventually use the confirmed effective-permission payload rather than assume one global role.

## Canonical repository topology

OMTS uses three official repositories:

- `thaideptrai218/omts-web`: Next.js Web portal and public QR provenance pages.
- `thaideptrai218/omts-mobile`: Expo/React Native field application.
- `thaideptrai218/omts-backend`: .NET backend API.

These repositories release independently. Shared contracts cannot be assumed to come from a local monorepo package; the team must choose an explicit API/OpenAPI or package synchronization mechanism.

## Source priority

1. Current Jira issue: sprint scope, owner, dependencies, and done criteria.
2. Current Report 3/SRS: actors, use cases, business rules, permissions, messages, and acceptance criteria.
3. Report 2: approved technology and project-management baseline.
4. OMTS Figma: visual structure and screen flow; it does not override business rules.
5. Historical reports/tracking: background only when they conflict with current sources.

## Confirmed Web foundation

- Next.js 16 App Router, React, TypeScript, Tailwind CSS, and ESLint.
- Default integration branch is `develop`; implementation changes go through reviewed pull requests.
- CI requires lint/typecheck, secret scan, and a Conventional Commit PR title.
- Important Web flows must work at 360 px and 1024 px.
- Public, authentication, and protected application routes should have explicit layout boundaries.
- Components should depend on service/repository contracts, not directly on mock storage or HTTP.

## Current code status

- The repository is a clean Next.js scaffold with only the root page and root layout.
- No authentication, session bootstrap, API client, refresh flow, permission gate, message catalog, or feature UI is implemented yet.
- The foundation must not be reported as complete solely because the framework scaffold builds.

## Current Web critical path

1. `OMTS-132`: Web foundation.
2. `OMTS-150`: UC08 verification gate.
3. `OMTS-159`: UC02 login and post-login gates.
4. `OMTS-179`: UC07 logout and protected-state cleanup.

## Decisions still requiring confirmation

- QA API base URL and current OpenAPI/response contracts.
- Web refresh-token mechanism and ownership between browser, Next.js, and backend.
- `/me/permissions` payload, including zone scope and all-zone access.
- Canonical Vietnamese/English message catalog.
- How contracts and semantic tokens are synchronized across separate Web and Mobile repositories.

Do not silently decide these items inside UI code because they affect security, backend integration, or business behavior.
