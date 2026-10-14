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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — branches, Jira keys, commit/PR rules, releases.

## Project guidance

- [Current project context](docs/PROJECT_CONTEXT.md)
- [Learning and defense notes](docs/learning/README.md)
