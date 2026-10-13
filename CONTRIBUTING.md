# Contributing to OMTS

OMTS is split into three repositories that follow the same rules:
[omts-backend](https://github.com/thaideptrai218/omts-backend) ·
[omts-web](https://github.com/thaideptrai218/omts-web) ·
[omts-mobile](https://github.com/thaideptrai218/omts-mobile).
Work is planned in **Jira (project key `OMTS`)**; code and reviews live on GitHub.

## Branches

| Branch | Purpose | Merges into |
|---|---|---|
| `main` | Released, demo-ready code. Every release is tagged `vX.Y.Z`. | — |
| `develop` | Integration branch (default branch). | `main` via release PR |
| `feature/OMTS-<n>-<slug>` | New functionality for Jira issue `OMTS-<n>` | `develop` |
| `fix/OMTS-<n>-<slug>` | Bug fix found during development/testing | `develop` |
| `chore/<slug>`, `docs/<slug>` | Tooling, config, docs without a Jira issue | `develop` |
| `hotfix/OMTS-<n>-<slug>` | Urgent fix on a released version (branch from `main`) | `main`, then `develop` |

Direct pushes to `main` and `develop` are blocked. Every change goes through a pull request.

## Daily workflow

1. In Jira, move your issue (e.g. `OMTS-12`) to **In Progress**.
2. Create the branch from the latest `develop`:
   ```bash
   git switch develop && git pull
   git switch -c feature/OMTS-12-raft-registration
   ```
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/) and include the Jira key:
   ```bash
   git commit -m "feat(raft): add raft registration endpoint OMTS-12"
   ```
4. Push and open a PR into `develop`:
   ```bash
   git push -u origin HEAD
   gh pr create --base develop --title "feat(raft): add raft registration API [OMTS-12]" --fill
   ```
5. A PR can be merged when **all** of these pass:
   - 1 approving review from a teammate
   - `build-test` (CI), `gitleaks` (secret scan), `pr-title` (Conventional Commits title)
6. Merge with **Squash and merge**. The branch is deleted automatically. Move the Jira issue to **Done** (or let Jira automation do it).

### Commit / PR title types

`feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `build` · `ci` · `chore` · `revert`
Format: `type(optional-scope): short imperative summary [OMTS-<n>]`

## Releases (end of each iteration)

1. Open a PR `develop → main` titled `chore(release): vX.Y.Z` and merge it with **Create a merge commit**
   (not squash, so `develop` and `main` keep a shared history).
2. Tag `main`; the `release` workflow publishes a GitHub Release with generated notes:
   ```bash
   git switch main && git pull
   git tag -a v1.0.0 -m "Software Package Version 1"
   git push origin v1.0.0
   ```

| Tag | Milestone | Due |
|---|---|---|
| `v1.0.0` | Software Package Version 1 (Iteration 1) | 24/10/2026 |
| `v2.0.0` | Software Package Version 2 (Iteration 2) | 07/11/2026 |
| `v3.0.0` | Software Package Version 3 (Iteration 3) | 21/11/2026 |
| `v4.0.0` | Final Software Package | 05/12/2026 |

## Secrets and configuration

Never commit credentials, connection strings, OTP secrets or `.env` files. The `gitleaks` check blocks PRs that contain secrets.
See the README of each repository for where local configuration lives (`dotnet user-secrets`, `.env.local`).

## Jira ↔ GitHub

With the *GitHub for Jira* app connected, any branch, commit or PR that contains `OMTS-<n>` appears in that Jira issue's **Development** panel.
Optional Smart Commits: `git commit -m "fix(sale): reject over-allocation OMTS-34 #comment validated qty #time 1h"`.
