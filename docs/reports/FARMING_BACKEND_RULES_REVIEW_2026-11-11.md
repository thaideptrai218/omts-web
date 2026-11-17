# Farming backend rules review - 2026-11-11

Scope: zone, raft, lane, seed lot, seeding, cycle, cultivation log, material usage, harvest lot, yield, trace. READ-ONLY audit (no source edited, no data mutated, GET probes only on http://127.0.0.1:8082).
Backend: `D:\Đồ_án\omts-backend` (develop). SRS: `.hallmark/srs-v8/srs-v8-full.txt`. Paths below are relative to `src/OMTS.Application/Features/` unless stated.
Convention for new errors: `400 MSG-GEN-01` with `{field, hint}` = hard reject (`AppError.Invalid`); `409` with `details.confirmFlag` = soft warning the client re-sends with the flag (precedent: `CycleCloseService.cs:94-96,159` `ownerApproved`); `409 MSG-GEN-09` = wrong state.

## 0. Four facts that frame every finding

1. **The SRS v8 deliberately has no quantity model per lane.** BR-FARM-03: "The raft view never estimates the kg of oysters on a lane"; section "Out of scope" (line 3760): "seeding and harvest are recorded per whole lane ... the system estimates no kg per lane". GBR-04 (line 3408): "Seeding does not compare the quantity with what is left in the seed lot, because OMTS does not track the seed left over". BR-HARVEST-02 (line 3433): estimated kg "helps follow the harvest; it is not used for selling ... Sales are not limited by the estimated kg". So owner findings (1), (2), (4) ask for rules the SRS explicitly excludes -> **SRS change + owner approval** (AGENTS.md).
2. **Two units, no bridge.** Seed is counted in `con` (pieces; live: seed lot VT001 `unit:"con"`, 20 000 received). Harvest is `CageCount` (lồng) and `EstimatedKg`. `kgPerCage` is one cooperative-wide number (`Cooperative.AverageKgPerCage`, default 50). Nothing converts con <-> kg (no weight-per-piece, no mortality).
3. **Harvest planning does not exist in the backend and was removed from the SRS.** grep for WorkPlan/HarvestPlan/PlanTask in backend = 0 hits. SRS line 3861: "UC30 -> (removed) Plan harvest. Harvest planning is not part of this version"; line 3758: "No harvest planning ...". The web "Kế hoạch công việc theo chu kỳ" (`src/features/cycles-api/cycle-work-plan-preview.tsx`) is a local-state mock ("Bản mẫu", not saved). Only "plan" in the backend = three optional estimates on the cycle (BR-CYCLE-01).
4. **Lane state IS tracked and Harvested lanes ARE refused by the backend** (finding 3 is mostly a web/UX + data issue, see G3). The backend also post-dates the SRS with a stock ledger (Xuất dùng/Xuất hủy, `Purchasing/Issues/InputIssueService.cs`) that is **not wired to seeding or material usage** (SRS has 0 mentions; BR-PURCHASE-07 says "OMTS keeps no stock").

## 1. What the backend enforces today (per area)

| Area | Enforced (file:line) | SRS | Gap (invalid input accepted) |
|---|---|---|---|
| Zone | code/name/location required, lat+lng both required range -90..90 / -180..180, `Area > 0` (`Farming/Zones/FarmingZoneService.cs:277-281`, `Farming/FieldCheck.cs:47-66`); discontinue blocked while rafts In Use (`:183`) | FARM-02 | Coordinates range only: 0,0, sea, other country, lat/lng swapped inside range accepted; no area vs sum of raft sizes |
| Raft | code required/unique per zone, `Size` free text <=100, lat/lng optional pair, lanes 1..200 (`Farming/Rafts/RaftValues.cs:12-17`, `RaftLaneChange.cs`); lane change blocked with Open cycle (`RaftService.cs:127-131`) | FARM-04, BR-FARM-04 | `Size` is free text ("10 m x 24 m") so area/density unusable; coordinates unchecked vs zone (same as above) |
| Lane | state derived, never stored (`Cultivation/Progress/LaneStateRules.cs:26-49`); Harvested lane refused in new lot (`Harvest/HarvestLotFieldReader.cs:116`, `LaneStateRules.cs:51`) | BR-FARM-03, BR-HARVEST-01 | No quantity per lane (seeded, harvested, cages). Lane payload = number + state only |
| Seed lot | = Seed line of Completed receipt, not fully returned (`Cultivation/Seeding/SeedingSessionReader.cs:56-66`) | GBR-04 | Quantity not compared to remaining (SRS-intended). Live `/seed-lots` gives `quantityReceived`, `quantitySeeded` but not returns/stock |
| Seeding record | date in [cycle start, today] and >= lot receipt date, qty > 0 and <= 1e9 (`SeedingSessionReader.cs:35-38`, DB `CK_SeedingRecord_Quantity`); lanes In Use, Not seeded or (Growing and not completed) (`SeedingRules.cs:13`); one session = one lot, qty is the session TOTAL, lanes just listed (`Domain/.../SeedingRecordLane.cs`) | BR-CYCLE-02 | Qty may exceed lot remaining (GBR-04) and the cycle `ExpectedSeedQuantity`; no per-lane qty; re-hang (same lane in 2 sessions) double counts in `SeedHung` |
| Seeding complete | once per cycle, cycle Open (`Seeding/SeedingCompletionService.cs:84-100`) | CYCLE-02.1 | Allowed with **0 seeded lanes** (no check on `SeededCount`) |
| Cycle start/edit/cancel | 1 Open per raft (filtered unique idx), start <= today and > previous close, expected harvest date > start, `ExpectedSeedQuantity`, `TargetYieldKg` > 0 (`Cultivation/Cycles/CultivationCycleValues.cs:21-31`); cancel only with 0 records (`CultivationCycleService.cs:~125`, `CountRecordsAsync` = seeding+logs+lots) | BR-CYCLE-01 | No unit on `ExpectedSeedQuantity`; no plausibility between seed qty and target kg (live B1-01: expected 250, seeded 5000, target 8500 kg => 1.7 kg/con implied) |
| Cycle close | needs assessment; normal close = >=1 seeding and every seeded lane Harvested, else "early" (`Closing/CycleSummaryReader.cs:35,62`, `LaneStateRules.cs:54`); early close by Zone Manager needs client flag `ownerApproved` (`CycleCloseService.cs:94-96`) | BR-CYCLE-07 | Owner approval is client-asserted (by design, "face to face"); lots still Open for sale don't block close (SRS-intended) |
| Cultivation log | date in [start, today], >=1 photo, <=10 (`CultivationLogs/CultivationLogValues.cs`) | BR-CYCLE-05 | No gap vs SRS; no structured data (mortality/size/water) so nothing computable |
| Material usage | qty > 0 <= 1e9 3dp, date <= today, not in Closed cycle (`MaterialUsages/MaterialUsageValues.cs`, `MaterialUsageCycleGuard.cs`) | BR-CYCLE-03 | Not linked to stock issues (Xuất dùng) -> same repair can be recorded twice, once per module |
| Harvest lot create | lanes In Use, each once, Growing/BeingHarvested (`HarvestLotFieldReader.cs:104-117`); finished lanes subset of lanes (`:120-131`); `CageCount > 0` (`:47`, DB `CK_HarvestLot_CageCount`); `EstimatedKg` default cages x kgPerCage, any value > 0 and <= 1e9 (`:48-50`); Open cycle required (`HarvestLotRecordingService.cs:~191`); code/time server-side | BR-HARVEST-01..03 | **No upper bound** on cages (int) or kg; override of kg unrelated to cages; nothing vs seeded, plan, mortality, or already harvested |
| Mark lane finished | only as `finishedLaneNumbers` on create or on a correction (needs reason) (`HarvestLotCorrectionService.cs:~100`, `HarvestLotLaneFacts.cs:39-48`); a correction cannot finish a lane that is in a later lot | HARVEST-01 step 3 | **No stand-alone action**; finishing needs a new lot with cages > 0 or a corrected old lot with reason (finding 5) |
| Harvest lot correct/remove | creator or Owner, cycle Open, reason required, remove only if not on an invoice or awaiting-transfer sale (`HarvestLotCorrectionService.cs`, `HarvestLotRemovalService.cs:33-50`) | BR-HARVEST-05 | Re-runs the same (weak) field rules; a removal can drop a lane back from Harvested silently (reminder re-armed only) |
| Lot close/status | Open/Reopened/Closed; leftover >= 0, reason if > 0 (`HarvestLotStatusService.cs:58-80`) | BR-HARVEST-04 | Leftover kg not capped by `EstimatedKg - invoiced` (SRS: info only) |
| Yield | pure sum of lot figures (`HarvestYieldCalculator.cs`, `HarvestLotFigures.cs`); `Difference = Estimated - sold - lost` | BR-HARVEST-07 | No yield per seed (kg/con), no survival rate, no plan-vs-actual except cycle summary |
| Trace | backward by lane -> seeding -> lot -> receipt -> supplier (`Traceability/*`); correction re-checks "lane still has a seed lot" (`TraceSeedLotRules.cs`) | BR-TRACE-01/03 | Fine; per-lane quantity would also be missing in trace |

## 2. Gaps, proposed rules, priority

Priority order (1 = do first). Effort S <= 0.5 d, M ~ 1-3 d, L > 3 d (backend + migration + tests, web excluded unless stated).

### P1 - One decisive action "Thu xong làn" (finding 5) - Effort M - NO SRS conflict
- Today: finishing = `finishedLaneNumbers` on a new lot (needs cages > 0, `HarvestLotFieldReader.cs:47`) or a correction with reason (`CorrectHarvestLotRequest`). HARVEST-01 step 3 says "marks which of them are finished" but only inside the lot form.
- Rule: `POST /api/rafts/{raftId}/lanes/{laneNumber}/finish-harvest` body `{ rowVersion }` (cycle row version, same MarkChanged(cycle) pattern as `HarvestLotRecordingService.cs`). Also accept `laneNumbers[]` for "finish all Being harvested".
  - Preconditions: raft/zone editable, Open cycle, lane state == BeingHarvested today. Else `409 MSG-GEN-09` ("Lane 2 of raft B1-01 is Growing/Harvested" via `UserMessages.WrongStatus`).
  - Effect: set `HarvestLotLane.IsFinished = true` on the lane's **latest** lot row in the cycle (no migration, `LaneStateRules` unchanged). Audit `HarvestLot.LaneFinished` (before/after, no reason needed). If every seeded lane is now Harvested -> same `CloseReminderAsync` as `HarvestLotRecordingService.cs:~150`.
  - Undo: stay via lot correction (reason) - avoids an easy "un-finish".
- Alternative (cleaner, needs migration): table `LaneHarvestFinish(CycleId, LaneId, FinishedOn, ByAccountId)`; `LaneStateRules.StatesOn` reads it. Choose only if the lot row must stay untouched (a Closed/sold lot's row would otherwise change, no sale impact but row-version bump).
- Risk to data: none (flag already exists). Permission: `PermissionFunctions.Harvests` + `Edit/Create`.

### P2 - Lane picker is wrong on the web, plus missing lane facts (finding 3) - API S, web S
- Backend already: `HarvestLotsScreen.Lanes[].canHarvest` is false for Harvested/NotSeeded (live B1-01: lane 2 `Harvested canHarvest:false`; lane 1 `BeingHarvested canHarvest:true`; lane 3 `Growing canHarvest:true`) and a forced request returns `400 MSG-GEN-01 field "Lanes"` hint "Lanes 2 cannot be harvested now." (`HarvestLotFieldReader.cs:116`).
- BeingHarvested lanes ARE meant to stay selectable (BR-HARVEST-01: harvested over several days until marked finished). So "still appears" is correct per SRS; the real defect is that the user cannot tell them apart and has no way to finish them cheaply (P1).
- Web rule: render only `canHarvest` lanes as selectable; show Harvested/NotSeeded lanes disabled with reason; group "Đang thu" first; default-uncheck.
- API addition (S, no migration): on `HarvestLaneView` add `lotCount`, `lastHarvestDate`, `harvestedCages` (only if P4b per-lane cages is accepted; otherwise omit), `seedingDates[]`, `seedLotCodes[]` (data already in `LaneStateReader`/`SeedingReadService.LaneSeedLotsAsync`).

### P3 - Cap harvest by what was seeded (finding 1) - Effort M (+ settings) - NEEDS OWNER DECISION D1/D2/D3
- Today: nothing links harvest to seed. `CageCount > 0` and `EstimatedKg` in (0, 1e9] are the only checks; cages int is unbounded.
- Proposed rule at cycle level (derivable now, no per-lane data):
  - `SeedPieces = Σ SeedingRecord.Quantity` of the cycle (already `CycleSummary.SeedHung`, `CycleSummaryReader.cs:~45`; note re-hang double-counts, acceptable as upper bound).
  - `BudgetKg = SeedPieces x (1 - m) x w` where `w` = average harvest weight per piece in kg and `m` = expected mortality (0..0.95). `HarvestedKg = Σ EstimatedKg` of the cycle's lots (excluding the lot being corrected). `RemainingBudgetKg = max(0, BudgetKg - HarvestedKg)`.
  - New lot/correction with `EstimatedKg = e`: if `HarvestedKg + e <= BudgetKg x (1+tol_soft)` OK; if above -> `409` soft warning `details {confirmFlag:"confirmOverBudget", budgetKg, harvestedKg, newKg}` and require `Reason` (kept in audit); if above `BudgetKg x (1+tol_hard)` -> `400 MSG-GEN-01 field "Estimated kg"` hint "exceeds what was seeded". Suggested tol_soft=0.10, tol_hard=0.50 (owner to set).
  - Why soft first: the estimate is informational (BR-HARVEST-02), kg per cage is an average, and a wrongly recorded seed qty (live B1-01: 250 vs 5000) would otherwise lock the farm out of recording real harvest.
- Owner example: seeded 3000 con, `w`=0.05 kg, `m`=0.2 -> Budget = 120 kg; typing 5000 (kg) -> hard reject; 5000 cages -> kg 250 000 -> hard reject.
- Also add absolute sanity (S, independent of seed): `CageCount <= 100 000`, `EstimatedKg <= CageCount x kgPerCage x 2` and `>= x 0.2` else soft warning (kg field overridden far from cages x kgPerCage). Existing lots are not re-validated unless the correction changes those fields.
- API/DB: fields `AverageOysterWeightGrams` and `ExpectedMortalityPercent` (see P4). Seed-lot/lane totals need no migration. Error codes: new `MSG-HARVEST-06` (over budget, confirm) / reuse `MSG-GEN-01`.
- Per-lane variant (more precise, bigger): add nullable `SeedingRecordLane.Quantity` (split of the session total, defaulting to equal split) and `HarvestLotLane.Cages`; rule `harvestedOnLane <= seededOnLane x (1-m) x w`. Effort L, schema + web change; re-hang makes per-lane numbers ambiguous. Recommend only after cycle-level proves useful (D2).

### P4 - Auto-computation data: weight per piece, mortality, yield (finding 4) - Effort M
a) Source of average weight per piece (D3). Options: (i) cooperative setting `AverageOysterWeightGrams` next to `AverageKgPerCage` (`HarvestSettingsService.cs`, `Cooperative.cs:62`), copied onto the cycle at start (`CultivationCycle.AvgWeightGramsAtStart`) like `HarvestLot.KgPerCage` is copied; (ii) per seed item field `ExpectedHarvestWeightGrams` (`FarmingInputItem`, seed 3 cm vs 5 cm differ); (iii) per cycle plan field. Recommend (i)+cycle override (matches the existing KgPerCage pattern, 1 migration, back-fillable).
b) Computations the web/API should expose (read-only, no new input):
   - `ImpliedSurvivalPercent = KgHarvested / (SeedPieces x w)` on `CycleSummary` and per closed cycle; replaces a hand-typed "hao hụt".
   - `YieldKgPerThousandPieces = KgHarvested / SeedPieces x 1000`; `PlanVsActual` already exists, add `% of target`.
   - Form helper: `cages <- kg / kgPerCage`, `kg <- cages x kgPerCage` (already in `HarvestLotFieldReader.cs:48`; web should show it live, no backend work).
   - Optional: `pieces estimate = kg / w` shown on lot, never stored.
c) Mortality: SRS has no loss record (BR-CYCLE-07 says "no loss record" for Growing lanes). A "Ghi nhận hao hụt" entity = SRS change (D4). Cheaper substitute: implied survival above.
d) Raft `Size` free text -> optional `AreaSquareMeters` (decimal) to compute density (pieces/m2) - S, low priority.

### P5 - Plan vs actual (finding 2) - Effort L - SRS CHANGE (D5)
- Facts: harvest plan removed from SRS (lines 3758, 3861); no entity; web page is a mock. Cycle estimates are only compared in the read-only summary (BR-CYCLE-06), never at write time.
- Options: A) keep SRS: treat `TargetYieldKg` + `ExpectedHarvestDate` as the plan, add soft warnings at harvest (`HarvestedKg + e > TargetYieldKg x 1.1` -> confirm + reason; harvest date > ExpectedHarvestDate + N days info). Effort S, no migration. B) real `HarvestPlan` (cycle, planned date, lane numbers, planned cages/kg, status Planned/Done/Cancelled) + optional `HarvestLot.PlanId`; rule `actual <= planned x (1+tol)` else confirm+reason; lanes of a lot must be within the plan's lanes unless confirmed. Effort L (entity, migration, endpoints, notifications, SRS UC30 restore). C) leave the preview mock (label stays "Bản mẫu").
- Recommend A now (defensible against current SRS), B only if the owner confirms planning as a real requirement.

### P6 - Coordinates by hand (finding 6) - Effort S
- Today: range check only (`FieldCheck.cs:60-65`), stored decimal(9,6).
- Rules: (a) reject `0,0`; (b) soft warning `MSG-FARM-0x` when point is outside Vietnam bbox lat 8..24.5, lng 102..110; (c) soft warning when raft point is > 5 km (owner to set) from its zone point (Haversine; zone coords are required so always available); (d) detect probable swap: `lat` in 100..110 and `lng` in 8..24 -> hard `400` field "Latitude" hint "looks swapped". Warning = `409` + `confirmFlag:"confirmFarAway"`.
- Web: pick on map (default center = zone point), "Dùng vị trí hiện tại", paste "21.07, 107.43" parser; backend rules above are the safety net. Existing data unaffected (check only on save).

### P7 - Cycle plan plausibility (cycle start/edit) - Effort S
- Add unit label to `ExpectedSeedQuantity` (same unit as seed items, "con") in API docs/response (`unit` field).
- Soft warning when `TargetYieldKg / ExpectedSeedQuantity` is outside [0.01, 0.30] kg per piece (bounds from `w`, D3), and when seeded > `ExpectedSeedQuantity x 1.2` at seeding save. Live example 250 / 8500 shows today's data would trip it - warn only, never block.

### P8 - Seeding vs seed lot remaining and the new stock ledger - Effort M - DECISION D6
- Today GBR-04 forbids the check; but the stock module (Xuất dùng of Seed lot, `InputIssueService.cs:509`, negative-stock check MSG-INPUT-01) is independent of seeding: seed can be "issued" from stock and also "seeded", or seeded beyond what is in stock.
- Options: (a) keep as is + soft warning on web using `quantityReceived - quantitySeeded` (already in `/seed-lots`); (b) seeding save also posts a Use issue for the lot (single source of truth, keeps SRS "seed left" untracked contradiction resolved); (c) seeding validates `qty <= lotStock` with confirm flag. Recommend (a) now, (b) as the real fix after D6.
- Same duplication for material usage (CYCLE-03) vs Xuất dùng of Material: decide whether CYCLE-03 becomes a view over issues.

### P9 - Small SRS-consistent hardening - Effort S each
- Seeding complete with 0 seeded lanes (`SeedingCompletionService.cs:84-100`): reject `409 MSG-GEN-09` "no seeding session recorded" (or confirm like MSG-CYCLE-01). Preview already knows `SeededCount`.
- Harvest lot date vs seeding: a lane's harvest date must be >= its first seeding date (today only "Growing" is checked, so same-day seed+harvest passes) - add warning `lastSeedingDate == today`.
- Early close approval is client-flag only (`CycleCloseService.cs:94`): record who/when in audit (already audited as `OwnerApprovalConfirmed`); nothing more unless owner wants a real approval workflow.
- Harvest-lot removal/correction that takes a lane out of Harvested: show in response `lanesReopened[]` so the web can tell the user (today only the reminder flag is re-armed).

## 3. Data the API lacks for web auto-compute

Exists today: `GET /api/cultivation-cycles/{id}/summary` -> `seedHung`, `seedUnit`, `kgHarvested`, `expectedSeedQuantity`, `targetYieldKg`, `notHarvestedLanes`, `closedEarly`; `GET /api/rafts/{id}/harvest-lots` -> `averageKgPerCage`, lanes + `canHarvest`, lots with cages/kg; `GET /api/rafts/{id}/seed-lots` -> `quantityReceived`, `quantitySeeded`, `boughtForThisRaft`; seeding-records -> per-session qty + lane numbers.
Missing (needed for the proposals):
1. `averageOysterWeightGrams` (setting + per-cycle copy) and `expectedMortalityPercent`.
2. Per cycle: `budgetKg`, `harvestedKg`, `remainingBudgetKg`, `impliedSurvivalPercent`, `percentOfTarget` (compute server-side so web and mobile agree).
3. Per lane: `seedingDates`, `seedLotCodes`, `lotCount`, `lastHarvestDate`; optional `seededQuantity` (equal-split estimate) and `harvestedCages` (needs P3 per-lane variant).
4. Seed lot: returns and stock on hand (`quantityReturned`, `stockOnHand`) so the web can warn.
5. Raft: numeric `areaSquareMeters`; zone: sum of raft area.
6. Zone/raft distance (`distanceFromZoneMeters`) in raft DTO or compute on web (needs zone coords in raft payload).
7. Server-side dry-run: `POST /api/rafts/{id}/harvest-lots/preview` returning `estimatedKg`, `budgetKg`, `warnings[]` so the web never reimplements rules.

## 4. Risk to existing data / rollout
- All new rules are validated on write only; do not re-validate stored rows. Live demo already violates plausibility (B1-01 expected 250 vs seeded 5000 vs target 8500 kg) so every new check on plan/seed must be **warn, not block**, on existing cycles.
- Corrections of old lots: re-check only fields the correction changes (otherwise old over-estimates make every correction fail).
- Migrations are additive nullable columns (weight, mortality, area, optional `LaneHarvestFinish`); back-fill defaults from settings. No destructive change.
- Test impact: `tests/OMTS.Api.IntegrationTests/Cultivation/*` (CyclesQaTestsLaneStates, SeedingCompletionTests, harvest tests) assert current permissive behaviour; update alongside.

## 5. Decisions needed from the owner

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Harvest over seeded: block or warn? | (a) hard cap; (b) warn + reason, hard only above +50 %; (c) leave | (b); tolerances 10 % / 50 % (owner to tune) |
| D2 | Level of the cap | (a) cycle total only; (b) per lane (needs per-lane qty + cages) | (a) now, (b) later if needed |
| D3 | Where does average weight per piece come from | (a) cooperative setting + per-cycle copy; (b) per seed item; (c) typed per cycle | (a); owner states the value (g/piece) and expected mortality % |
| D4 | Record mortality (hao hụt) as data? | (a) new loss record per cycle/lane (SRS change); (b) derived "implied survival" only | (b) |
| D5 | Harvest/work plan | (a) use cycle estimates as the plan + soft warnings; (b) real HarvestPlan entity (restore UC30); (c) keep mock | (a) now; (b) only if planning is a required feature |
| D6 | Seeding vs stock ledger (Xuất dùng) | (a) independent + web warning; (b) seeding posts a stock issue; (c) seeding validates stock | (a) now, (b) as target |
| D7 | "Thu xong làn" action | (a) flag on latest lot lane (no migration); (b) new finish table | (a) |
| D8 | Cages / kg sanity limits | max cages (100 000?), kg within 0.2..2 x cages x kgPerCage | accept, owner may change numbers |
| D9 | Coordinate warnings | distance from zone (5 km?), Vietnam bbox, swap detection | accept; hard-reject only 0,0 and swapped |
| D10 | Seeding complete with 0 lanes seeded | block / confirm / allow | confirm (MSG-CYCLE-01 style) |

## Unresolved questions
1. Is "5000" in the owner's example kg, cages, or pieces? (cap formula and the field to validate differ.)
2. Real average harvest weight per oyster and normal mortality for this cooperative (needed for D3; none in SRS or data).
3. Should a lane partially re-hung (Growing, second session) count its first seed in `SeedPieces`? Today yes (double count).
4. Is the stock ledger (Xuất dùng) officially part of SRS v9? It contradicts BR-PURCHASE-07 / GBR-04 as written.
5. Should the Zone Manager see over-budget warnings or only the Owner (notification on confirm)?
6. Does owner want "finish lane" to also notify (MSG-CYCLE-08 reminder reuse) or stay silent?
