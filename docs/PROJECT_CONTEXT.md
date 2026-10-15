# OMTS Web — current project context

> Cập nhật: 16/10/2026 (Asia/Saigon)
>
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

The current Figma file is a low-fidelity wireframe and a reference for information order and flow, not a mandatory final visual design. The Web UI may improve layout, hierarchy, color, typography and interaction as long as it preserves confirmed behavior.

## Confirmed Web foundation

- Next.js 16 App Router, React, TypeScript, Tailwind CSS, and ESLint.
- Default integration branch is `develop`; implementation changes go through reviewed pull requests.
- CI requires lint/typecheck, secret scan, and a Conventional Commit PR title.
- Important Web flows must work at 360 px and 1024 px.
- Public, authentication, and protected application routes should have explicit layout boundaries.
- Components should depend on service/repository contracts, not directly on mock storage or HTTP.

## Current code status

- Phase A foundation UI is implemented on `feature/OMTS-132-web-foundation`: semantic tokens, responsive auth/application shells, login form, message catalog, mock auth repository, frontend auth state, permission-aware navigation boundary, generic API client, dialog/confirm/toast primitives, and a protected dashboard sample.
- Effective access is represented by a frontend domain abstraction and tested with all-zone/selected-zone cases. It is not the confirmed `/me/permissions` JSON contract.
- The API client maps a final 401 to MSG19 but does not choose token storage, credentials mode, refresh behavior, or backend response fields.
- Vitest covers permission scope and API response/error mapping. Browser checks cover login validation, success toast, protected-content gating, mobile-menu focus, and responsive behavior at 360 px and 1024 px.
- Phase A is UI ready with mock data. It is not Jira ready and must not be reported as complete against QA API until the open backend contracts are confirmed and integrated.
- SCR-02 shared verification UI for `OMTS-150` is implemented with a domain/service/repository boundary, controllable mock adapter, six-digit input, expiry/resend countdown, masked recipient, purpose-aware copy and UC03-specific MSG15 mapping. It is UI ready, not Jira ready, because the `OMTS-149`/QA API contract is still unavailable.
- `OMTS-159` B2.1 source review is complete. The confirmed frontend flow has four domain outcomes: rejected, forced temporary-password change, required phone verification, and permission to enter the application. When both gates apply, UC02 requires password change before phone verification. API field names, token timing and destination routes remain deferred under `WEB-AUTH-02`.
- The current production build still composes `AuthProvider` with `mockAuthRepository`; an unauthenticated HTTP request to `/dashboard` returns 200 and protection only occurs in client state. This is an explicit release blocker, not a completed security boundary.
- The current verification baseline is 7 Vitest files with 35/35 tests passing. Lint, typecheck, production build and `git diff --check` pass as of 16/10/2026; the latest production dependency audit remains the successful check from 15/10/2026.
- The screen-by-screen execution order and Jira completion gates are recorded in `docs/WEB_IMPLEMENTATION_PLAN.md`.

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
- `WEB-AUTH-01` đã chốt: chỉ username, verified phone hoặc verified email được dùng làm login identifier; Staff first login dùng username trước khi phone verification gate.
- `WEB-AUTH-02` được hoãn tới trước bước tích hợp API thật: cách login response biểu diễn temporary-password change hoặc phone-verification next action.
- UI có thể được review bằng mock adapter trước khi backend contract hoàn tất. Ticket chỉ được chuyển sang Done khi đạt đúng `Done when`, bao gồm QA API nếu ticket yêu cầu.

Do not silently decide these items inside UI code because they affect security, backend integration, or business behavior.
