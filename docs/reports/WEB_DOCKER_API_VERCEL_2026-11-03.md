# Docker, API runtime and Vercel verification — 03/11/2026

## Result

- Docker Engine is running again. Existing API/SQL environments on ports `8080`/`8081` were preserved; no database or volume was reset.
- A separate latest-contract environment was built from backend integration revision `946df70` as Docker Compose project `omts-latest-qa`:
  - API: `http://127.0.0.1:8082`;
  - SQL Server: `127.0.0.1:1436`;
  - containers: `omts-latest-qa-api-1`, `omts-latest-qa-sqlserver-1`, `omts-latest-qa-seed-1`;
  - database and file volumes are new and isolated from the previous QA data.
- Health check at `/health/ready` returns `Healthy`. Swagger exposes the approved input groups `Seed`, `Material`, `Other`.
- The isolated API Web runtime at `http://localhost:3002` now targets API `8082` and keeps sessions in the existing local Redis on port `6380`, under a new namespace. Owner login and the purchase-receipt screen were verified in the browser. Supplier, zone and all 15 input-item lookups load, and the former `invalid-response`/retry-catalogue warning is gone. The seeded receipt list contains 20 records.

## Vercel

- Production deployment: `dpl_2PkxxntBKH79o8NvatJ5LEMCS7sU`.
- Public stable URL: <https://omts-web.vercel.app>.
- The stable production domain returns HTTP `200`; browser verification reached the OMTS login page, logged in with the existing mock Owner account and rendered the dashboard.
- Vercel Authentication remains enabled for generated preview/deployment URLs (`all_except_custom_domains`). The production alias is public, so preview protection did not need to be weakened.
- Production currently uses `OMTS_DATA_SOURCE=mock`. This intentionally matches the local mock demo and avoids weakening the approved G1 session design. Switching Vercel to real API still requires a stable HTTPS backend and a hosted Redis endpoint with authentication/TLS; local Redis and the temporary Cloudflare tunnel are not production dependencies.

## Safety and remaining work

- The older `8080` and `8081` APIs and their databases remain available. The new runtime did not migrate the earlier QA database whose fixed-role migration preflight had found a risky grant.
- No backend or Web branch was merged into `develop`.
- Runtime verification was read-only after seed; no tester business record was created.
- If Docker restarts, start the exact `omts-latest-qa-sqlserver-1` and `omts-latest-qa-api-1` containers (the seed container is one-shot). Do not delete the project volumes if tester data needs to be retained.
