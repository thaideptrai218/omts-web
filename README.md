# omts-web

Web application for **OMTS — Oyster Management and Traceability System** for Trung Nam Aquaculture Cooperative (SEP490_G83):
management portal for Owner/Managers and the public Harvest Lot provenance page opened from QR codes.
Sibling repos: [omts-backend](https://github.com/thaideptrai218/omts-backend) · [omts-mobile](https://github.com/thaideptrai218/omts-mobile)

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · ESLint

## Getting started

Prerequisites: Node.js (version in `.nvmrc`), npm.

```bash
npm ci
cp .env.example .env.local   # then set NEXT_PUBLIC_API_BASE_URL
npm run dev                  # http://localhost:3000
```

| Script | Purpose |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types + `tsc --noEmit` |
| `npm run build` | Production build |
| `npm test` | Vitest unit/contract/render tests (no live backend required) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — branches, Jira keys, commit/PR rules, releases.

## Project guidance

- [Current project context](docs/PROJECT_CONTEXT.md)
- [Web implementation plan](docs/WEB_IMPLEMENTATION_PLAN.md)
- [Detailed UI page blueprints](docs/UI_PAGE_BLUEPRINTS.md)
- [Real API micro-task plan: login, session, profile, logout](docs/WEB_REAL_API_IMPLEMENTATION_PLAN.md)
- [Web API readiness audit — 23 October 2026](docs/reports/WEB_REAL_API_READINESS_AUDIT_2026-10-23.md)
- [Security, schemas and errors — 24 October 2026](docs/reports/WEB_API_W0_W1_SECURITY_SCHEMA_ERRORS_2026-10-24.md)
- [Profile and permission mapping — 24 October 2026](docs/reports/WEB_API_W1_3_W1_4_PROFILE_PERMISSION_MAPPING_2026-10-24.md)
- [Latest full W0–W1 review and remaining gates — 24 October 2026](docs/reports/WEB_W0_W1_FULL_REVIEW_2026-10-24.md)

Auth/profile currently use mock adapters; setting the API URL alone does not enable integration. The BFF direction is approved, but its session store is not yet chosen. The dependency security build blocker found on 23 October was patched on 24 October; server authorization and real-API verification are still pending.

Run `npm test` locally before handoff: the current CI workflow runs lint/typecheck/build but does not yet run Vitest. Its push trigger only covers `main`/`develop`, so a feature-branch push alone is not evidence of a GitHub CI pass.
