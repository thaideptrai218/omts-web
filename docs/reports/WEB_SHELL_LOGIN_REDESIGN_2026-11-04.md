# OMTS — application shell and login redesign

Scope: Sidebar, Login and application frame. Existing local changes are preserved. No merge or deployment.

## Design rationale

The previous dark sidebar and large brand heading competed with operational content. The new frame uses a quiet mineral surface and a separate white work area. Navigation uses smaller optical icon sizes, sentence-case section labels, consistent alignment and a restrained active surface. The expanded sidebar is 232px; the collapsed rail is 64px with centered icons, section separators and accessible destination names/tooltips. Existing pin, hover-intent and keyboard expansion remain intact.

The login removes the bordered form card and full-height solid banner. A single form column is paired with an original code-native oyster/pearl illustration, coastal contour lines and an editorial message. The artwork is decorative and contains no invented business data. On mobile the artwork is hidden and the form retains its full width and labels. Input validation, password visibility, pending state, recovery and API session coordination are unchanged.

The API workspace now uses the same `AppShell` as local mode, with its existing permission-filtered navigation supplied through a presentation slot. Inbox, trader requests and logout retain their handlers. API navigation gains the existing shared keyboard/mobile drawer behavior. The shared page heading is smaller and removes the repeated OMTS overline.

References reviewed: [Linear UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui), [Vercel Geist](https://vercel.com/geist/introduction), [Stripe Dashboard navigation](https://docs.stripe.com/dashboard/basics). These informed hierarchy, density and consistency; OMTS keeps its own oyster illustration, Vietnamese labels and operational structure.

## Browser evidence

- [Login desktop](./omts-login-studio-2026-11-04.png)
- [Login mobile validation](./omts-login-studio-mobile-2026-11-04.png)
- [Expanded application frame](./omts-shell-studio-expanded-2026-11-04.png)
- [Collapsed application frame](./omts-shell-studio-collapsed-2026-11-04.png)

Checked local mock Owner login, expanded/collapsed sidebar, 360px mobile drawer, selecting Vùng nuôi and automatic drawer close. Login checked at 360/1024/1440 CSS px; no horizontal document overflow. Empty submit keeps the existing Vietnamese validation and moves focus to the first invalid field. Owner login succeeded. Final console inspection showed no errors. Viewport overrides were reset afterward.

Live API browser role workflows were not run in this batch. Component regressions verify owner module access, trader administration exclusions, compact accessible link labels and mobile API navigation close. Existing permission predicates are retained.

## Verification

- Initial focused run: 23 passing layout/login/resource tests.
- Final focused run after shared-shell integration: 22 passing layout/dashboard/API-shell tests, including three new API navigation regressions.
- Lint, typecheck, production build and `git diff --check` passed.
- The first build caught a test-only TypeScript error: Testing Library does not accept Playwright's `exact` option. Replaced it with an anchored accessible-name regex; the next build passed.

Next visual batch: feature-level tables, forms and detail layouts against this frame, after review of the new shell/login direction. This report does not claim a complete redesign or live API E2E coverage across all roles.
