<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# OMTS Web working rules

## Project context

- Before starting a new task, read `docs/PROJECT_CONTEXT.md` and the relevant Jira issue, SRS use case, and Figma frame.
- The canonical repositories are `thaideptrai218/omts-web`, `thaideptrai218/omts-mobile`, and `thaideptrai218/omts-backend`. This repository contains Web only; do not create an Expo app inside it.
- Current SRS actors are System Administrator, Cooperative Owner, Staff, Zone Manager, Accountant, Trader, and QR Viewer. Do not introduce Household/Farmer actors from historical reports unless the current SRS and Jira explicitly add them again.
- Jira defines sprint scope and dependencies; the current SRS defines business rules; Figma illustrates layout and screen flow but does not override either source.

## Frontend and UX

- Build with Next.js App Router and TypeScript. Keep public, authentication, and protected application routes conceptually separated.
- Design Web first, but verify important flows at 360 px and 1024 px. Web-first does not mean desktop-only.
- Prioritize Vietnamese copy, accessibility, keyboard use, meaningful landmarks, visible focus, and clear loading, empty, error, offline, success, syncing, and permission-denied states.
- Components must not call mock storage or HTTP directly. Put data access behind service/repository contracts so mock and API adapters can share the same interface.
- Use skeletons for initial content loading. Use local pending/disabled/progress feedback for mutations; do not replace every loading state with a skeleton.

## Decisions that require confirmation

Ask the user before implementing a change that adds/removes a business step, changes actors or zone scope, changes a status transition, changes required fields/validation, changes public QR data, changes offline/conflict behavior, changes the Web/Mobile boundary, or resolves an open SRS question.

Session storage, refresh-token handling, SSR/CSR boundaries, route protection, permission payloads, and caching can affect security or backend contracts. Present the proposed design and obtain confirmation before choosing one.

## Access control

- Internal Staff accounts can receive multiple zone-role grants. Do not infer effective access from one role name.
- Build menus and UI gates from effective permissions and scope once the `/me/permissions` contract is confirmed.
- Frontend gates improve navigation and feedback; the backend remains responsible for authorization on every protected API.

## Learning and review workflow

- Work in small reviewable tasks. Before code, explain: what it is, why it is needed, how data/control flows, and likely defense questions.
- Explain new concepts from the underlying problem to the concrete OMTS code. Avoid definition-only summaries.
- Keep learning and defense notes locally in the ignored `docs/learning/` directory. Do not add those files to Git.
- When an error occurs, record the command, important output, root cause, cascading errors, diagnosis, fix, and evidence after the fix in the local learning notes.
- Do not ask the learner to answer a concept that has not been explained first.
- Run `npm run lint`, `npm run typecheck`, and `npm run build` before declaring a Web task complete.

## Git workflow

- Branch from `develop`; use Jira-linked `feature/OMTS-<n>-<slug>` or `fix/OMTS-<n>-<slug>` branches for implementation work.
- Keep related micro-tasks for one Jira work item or functional module on the same branch and PR. Micro-tasks are teaching/testing boundaries, not branch boundaries.
- Use `chore/<slug>` or `docs/<slug>` only when no Jira implementation issue applies.
- Push a branch and open a PR into `develop`; do not push directly to protected `develop` or `main`.
