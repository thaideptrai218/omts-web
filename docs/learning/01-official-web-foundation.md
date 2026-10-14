# Lesson 01 — Official OMTS Web foundation

## 1. Why the repository boundary matters

OMTS uses separate repositories for Web, Mobile, and Backend. This repository is not a monorepo container; its root is the Next.js application itself.

That changes how shared code is planned. Web cannot import a local `apps/mobile` or `packages/contracts` directory that exists only in another Git repository. Cross-application contracts must come from an explicit shared package, generated OpenAPI types, or another team-approved synchronization method.

Keeping separate repositories has benefits: each application can release and protect branches independently. The cost is that a cross-repository contract change requires coordination rather than one atomic commit.

## 2. Current Next.js structure

```text
src/app/
├─ layout.tsx
├─ page.tsx
└─ globals.css
```

`page.tsx` defines the UI for a URL. `layout.tsx` wraps pages below it and is suitable for shared document structure or lower-level providers. A layout should not automatically become a Client Component; interactive providers can be placed in a focused `use client` boundary.

The current root page is only scaffold content. It proves that the framework can render, not that an OMTS use case is implemented.

## 3. Planned route boundaries

The Web foundation plans three conceptual route groups:

```text
(public)  public pages such as QR provenance
(auth)    login and account-verification flows
(app)     authenticated application features
```

A directory in parentheses is a Next.js route group. It organizes source and layouts without adding its name to the URL. For example, `(auth)/login/page.tsx` maps to `/login`, not `/auth/login`.

The name `(app)` does not protect a route. Session and permission checks still need an approved design, and the backend must authorize protected API requests.

## 4. Why typecheck runs `next typegen`

The script is:

```text
next typegen && tsc --noEmit
```

Next.js generates route-aware types before TypeScript checks the project. This matters after adding or moving App Router files: a plain TypeScript run can otherwise read stale generated route metadata from `.next`.

`tsc --noEmit` then validates types without producing JavaScript. Lint, typecheck, and build still solve different problems and none replaces the others.

## 5. Quality flow

```text
source change
  → npm run lint
  → npm run typecheck
  → npm run build
  → push feature/chore branch
  → pull request into develop
  → CI + review
```

CI also runs a secret scan and validates the PR title. Passing local checks does not bypass repository rules.

### Diagnostic notes from the first clean install

`npm ci` completed but reported five high-severity findings in the full dependency tree and warned that the installed ESLint release is no longer supported upstream. Running `npm audit --omit=dev` then reported zero production vulnerabilities. This shows the current findings are in development tooling, not the production dependency set.

The suggested `npm audit fix --force` was not applied because a forced audit fix may introduce breaking dependency changes. Toolchain upgrades should be reviewed in a focused maintenance task with lint, typecheck, build, and CI verification.

The original `eslint` script also took roughly 96 seconds on the small scaffold because it started from the repository root. The script was narrowed to `eslint src --max-warnings=0`: it targets application source explicitly and prevents warnings from silently passing CI.

## 6. Defense questions

### Why use Next.js instead of describing the stack as only React?

React provides the component model. Next.js is the framework that supplies App Router, layouts, route-aware rendering, production build behavior, and conventions used by OMTS Web.

### Does moving a page into `(app)` secure it?

No. A route group is an organizational boundary. Real access control needs session and permission checks, while the backend remains the final authorization boundary.

### Why generate route types before TypeScript checking?

App Router structure affects generated types. Running `next typegen` synchronizes those types with current route files before `tsc --noEmit` validates source code.

## 7. Current evidence and limits

- The official repository and `develop` workflow are confirmed.
- The foundation scaffold exists.
- Auth, API, permission, and business screens are not implemented yet.
