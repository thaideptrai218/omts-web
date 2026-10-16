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
- `OMTS-159` B2.2 models those outcomes as a discriminated union. Only `access-granted` carries an authenticated session; gate outcomes do not assume a token or backend response shape. MSG13, MSG67, MSG68 and MSG69 now have provisional Vietnamese frontend copy backed by unit tests; canonical bilingual wording remains an integration question.
- `OMTS-159` B2.3a adds a reusable accessible password field. The visibility toggle works by pointer and keyboard, preserves the input value, has a 48 × 44 px target, and has been browser-checked without horizontal overflow at 360 px and 1024 px. The recovery link now opens the implemented `/recover` flow; the separate UC40 public traceability destination remains unconfirmed, so no route for it is invented.
- `OMTS-159` B2.4a replaces the one-case auth mock with an isolated repository factory covering verified username/phone/email access, MSG12/13/68/69, password change and phone verification outcomes. Gate and rejection scenarios remain anonymous. Scenario credentials are not exposed in the login UI until B2.5 renders valid destinations.
- `OMTS-159` B2.5a replaces the silent post-login return with a blocking gate landing panel. Password-change and phone-verification outcomes keep auth state anonymous, stay on `/login`, focus the new gate heading and offer only a return to login; they do not invent a route, verification recipient, token or completion API. The actual forced-change and phone entry/OTP steps remain dependent on `OMTS-167`, `OMTS-158` and the deferred auth contract.
- `OMTS-159` B2.6–B2.7 confirm that access-granted login opens `/dashboard` and navigation remains filtered by effective permission. Mock credentials are no longer exposed in product UI. The dashboard no longer contains foundation/developer annotations; it uses a neutral user-facing welcome state until real dashboard data requirements exist.
- `OMTS-167` B3.1 defines the confirmed password policy once for both future rule hints and Zod validation: at least 8 Unicode code points, at least one Unicode letter and one ASCII digit. The schema validates new password/confirmation without trimming, reports errors on the responsible field and distinguishes `standard` from `forced` mode without deciding proof/session behavior.
- `OMTS-167` B3.2a adds a current-password change form shared by `standard` and `forced` contexts. It uses three accessible password fields, a live rule checklist driven by the B3.1 policy, field-focused validation and local pending feedback. No developer annotation/showcase screen is kept in the product source; the form will be mounted directly into the real security flow once its service/mock boundary exists.
- `OMTS-167` B3.4a adds the current-password data boundary: MSG17/MSG18, typed outcomes, repository/service contract and an isolated in-memory mock. Confirmation stays in the form; only current/new password cross the repository boundary. Session expiry is checked before password evidence, and the mock rechecks the confirmed password policy. Email-code proof remains deferred until the verified-email recipient/challenge contract is known.
- `OMTS-167` B3.4b1 connects typed outcomes to the production form without choosing navigation: MSG17/MSG01 become focused field errors, while MSG18/MSG19 are passed to required flow-level callbacks after passwords are cleared from form memory. Mounting the forced flow remains blocked by the unconfirmed post-change session/next-gate behavior in `WEB-AUTH-02`.
- `OMTS-179` B4.1 adds production logout controls to the desktop sidebar and mobile drawer. Logout clears frontend auth state before awaiting repository invalidation, protected children are not rendered while auth is loading/anonymous, and the client replaces the route with `/login`. Browser QA confirms Back and a direct `/dashboard` visit after logout expose no protected UI. B4.2 adds a library-neutral protected-cache cleanup registry and invokes it between local auth cleanup and remote invalidation; concrete feature caches register only when they exist. B4.3 publishes final-401/MSG19 events from the API boundary; an authenticated provider consumes the event once, clears local auth/protected cache, shows MSG19 and lets the protected shell redirect. Offline server invalidation retry and QA token/cookie behavior remain deferred.
- `OMTS-154` C1.1 starts the Trader registration slice with an explicit `email | phone` domain choice mapped to UC08 channels `email | sms`. C1.2a moves the confirmed password policy to `shared/security` and adds a schema factory that validates email/password/confirmation while requiring an injected phone validator. Registration does not infer a channel from identifier text, does not add historical profile fields and does not create an account before verification. Exact phone-number format remains open because the current SRS does not choose domestic or E.164 syntax.
- `OMTS-154` C1.3a adds the controlled email/phone selector as a native radio group styled as responsive cards. It remains unmounted until the production phone validator is confirmed, so there is no incomplete `/register` submit flow or development showcase route.
- `OMTS-154` C1.4a defines two-phase registration contracts. `start` can only return a verification challenge or MSG14/MSG04; `complete` requires the original in-memory draft plus a short-lived UC08 token before it can return `registered`. Endpoint shape, reload recovery and token lifetime are recorded as pending decisions rather than assumed HTTP behavior.
- `OMTS-154` C1.4b adds an in-memory mock composition for registration and shared verification. A proof is issued only after a correct OTP, bound to registration purpose/channel/identifier and consumed once; accepted, delivery failure, initial duplicate, completion race and invalid/mismatched proof paths are covered without storing or logging the password. Independent proof TTL, identifier normalization and HTTP mapping remain deferred decisions.
- `OMTS-163` C2.1 source review confirms that recovery is an anonymous three-stage flow for Trader, Cooperative Owner and Staff. MSG15 and visible frontend behavior must not reveal whether an identifier exists, is verified, belongs to a locked account or encountered a delivery failure. Changing delivery method means entering another verified identifier and cancelling the old request; the UI must not enumerate account contacts. The backend shape for an indistinguishable public recovery handle/challenge is still missing, so no DTO or timing behavior has been invented.
- `OMTS-163` C2.2b adds a recovery-specific new-password schema without a current-password field. The underlying new-password/confirmation validator now lives in `shared/security` and remains shared with account-security, preventing policy drift while keeping recovery independent from authenticated password-change services. Password values are neither trimmed nor transformed.
- `OMTS-163` C2.3 defines the recovery domain/service/repository boundary without HTTP field names. `start` exposes only one MSG15 `verification-pending` outcome and a challenge narrowed to purpose `recovery`; it has no account-existence, eligibility, lock or delivery flags. `resetPassword` accepts only an opaque verification token and the new password, with typed MSG16 invalid-proof and MSG01 invalid-password outcomes. The backend must still confirm how a real or dummy public challenge is represented without observable enumeration differences.
- `OMTS-163` C2.4–C2.9 is UI-ready at `/recover`. The production-facing page uses a non-clickable accessible three-step progress indicator, explicit email/SMS entry, invariant MSG15, the shared SCR-02 verification form, request cancellation when changing identifier, and a recovery-only new-password form. Challenge/proof/password state stays in memory. The mock keeps a valid proof after MSG01, consumes it once on successful reset, and invalidates the old request when the user changes delivery identifier. Login now links to recovery. Exact phone syntax and the QA API remain integration blockers, so Jira is not Done.
- Developer showcase routes/components for SCR-02 and SCR-05 have been removed. Production source now keeps reusable components and mounts them only through real user flows; developer explanation panels and context selectors are not product UI.
- The current production build still composes `AuthProvider` with `mockAuthRepository`; an unauthenticated HTTP request to `/dashboard` returns 200 and protection only occurs in client state. This is an explicit release blocker, not a completed security boundary.
- The current verification baseline is 28 Vitest files with 128/128 tests passing. Lint, typecheck, production build and `git diff --check` pass as of 16/10/2026. Browser review confirms `/recover` has no horizontal overflow at 360 px or 1024 px and its step transitions move screen-reader focus to the current heading. The latest production dependency audit remains the successful check from 16/10/2026.
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
