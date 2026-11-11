# Farming API contract - changes of 11/11/2026 (branch `feature/OMTS-132-farming-rules`, backend)

Scope: owner decisions of 11/11/2026 on zone, raft, seeding, harvest, yield and cycle close. Every path is under the API origin; JSON uses camelCase; errors follow the existing problem shape
`{ "code": "MSG-GEN-01", "detail": "...", "field": "...", "fields": [...], "hint": "...", ...extra }` (HTTP status 400 / 403 / 404 / 409). New fields are additive: old clients keep working,
except where a field changed type (cage count).

Units: kg are decimal with at most 2 decimals; cages are decimal with at most 2 decimals; seed is counted in the catalogue base unit of its seed item (`unit` of the seed lot, e.g. `con` in demo data,
`manh` when the catalogue says so): never hard-code a unit.

## 1. Harvest lot (cages are decimal)

`POST /api/rafts/{raftId}/harvest-lots` and `PUT /api/harvest-lots/{lotId}` (and the TRACE-03.2 `PUT /api/harvest-lots/{lotId}/trace-correction`) stay `multipart/form-data`.

| Form field | Type | Notes |
|---|---|---|
| `laneNumbers` (repeat) | int | as before |
| `finishedLaneNumbers` (repeat) | int | as before |
| `cageCount` | decimal, dot, max 2 decimals | **> 0 and <= 100000**. `0.5` is half a cage. `2,5` (comma) is refused. Was int. |
| `estimatedKg` | decimal, optional | **Estimated** kg (web label "ước tính"; never billed, never the weight confirmed at the port). Left out: server sets `round(cageCount x kgPerCage, 2)`. The `kgPerCage` used is the cooperative harvest setting read at record time and **copied onto the lot** (`kgPerCage` in the answer); later settings never change it (a correction uses the lot copy; verified). Sent: any value > 0 up to 10x `cageCount x kgPerCage` (and <= 1e9, 2 decimals); outside 0.2x..2x it is saved and a warning is returned (below). |
| `confirmOverPlan` | bool, optional | answer to the over-plan warning (section 2) |
| `overPlanReason` | text <= 1000, optional | required with `confirmOverPlan=true` |
| `reason`, `rowVersion`, `keepPhotoKeys`, `photos` | | correction only, as before |

Response `201` (record) / `200` (correct): `HarvestLotSaved { lot, everySeededLaneHarvested, cycleRowVersion, message, messageCode }`. In `lot` (and in every `lots[]` item of the screen):

```json
{ "cageCount": 0.5, "kgPerCage": 50.00, "estimatedKg": 25.00, "overPlanReason": null }
```
`overPlanReason` is on the lot detail (`GET /api/harvest-lots/{id}`, record, correct); null when the lot never went over plan. `cageCount` is now a JSON number with decimals in: lot detail, list item, trace lot, trace correction
views, yield, exports.

Errors (all nothing-saved):
- `400 MSG-GEN-01 field:"Number of cages"` hint "Enter more than 0 and at most 100000 cages, with at most 2 decimals (0.5 is half a cage)."
- `400 MSG-GEN-01 field:"Estimated kg"` hint "The estimated kg may be at most N kg (10 times ...)" only above 10x cages x kgPerCage (hard sanity ceiling). Outside 0.2x..2x but within 10x it is **saved** with a non-blocking warning in `HarvestLotSaved` (always present, maybe empty; also after a correction):
  `"warnings": [ { "code": "ESTIMATED_KG_FAR_FROM_CAGES", "message": "...", "details": { "workedKg": 100, "minKg": 20, "maxKg": 200 } } ]`
- Naming: the field is `estimatedKg` everywhere (lot, list item, yield `estimatedKg`; summary `kgHarvested` = sum of estimated kg). No older alias exists, so nothing was renamed. Purchase requests are untouched (kg, SALE-01).
- Corrections: a correction that changes neither cages nor kg is not judged again, so lots saved before the rule can still be corrected.

## 2. Cap against the cycle plan (target yield)

Plan = the cycle's own `targetYieldKg` (BR-CYCLE-01 estimate). `total = sum(**estimated** kg of the other lots of the cycle) + this lot` (estimate against estimate; the weight confirmed at the port is not involved). Implemented thresholds: warn/confirm when `total > 1.10 x target`; hard stop when `total > 1.50 x target`. No target (null) -> no cap.

| total vs target | result |
|---|---|
| <= 110 % | saved |
| > 110 % and <= 150 % (more than +10 % up to +50 % over plan; exactly 150 % is still confirmable) | `409`, code `MSG-GEN-04`, nothing saved. Client asks the user, then re-sends the same form with `confirmOverPlan=true` and `overPlanReason`. |
| > 150 % of target (= more than +50 % over plan) | `400 MSG-GEN-01 field:"Estimated kg"` hint "The cycle would have T kg, more than 150% of its target of X kg." (cannot be confirmed) |

409 body:
```json
{ "code": "MSG-GEN-04", "detail": "Are you sure you want to record this harvest, which takes the cycle to 1200 kg, above its target yield of 1000 kg? This action is recorded in the audit log.",
  "confirmFlag": "confirmOverPlan", "reasonField": "overPlanReason",
  "targetYieldKg": 1000, "harvestedKg": 800, "newKg": 400, "totalKg": 1200, "overPlanPercent": 20.0 }
```
Confirmed without a reason (blank / > 1000 chars): `400 MSG-GEN-01 field:"Over plan reason"`. The reason is stored on the lot (`overPlanReason`) and in the `HarvestLot.Created` / `HarvestLot.Corrected` audit values.
A correction is judged only when it raises `estimatedKg` (the corrected lot leaves its own kg out of the total). TRACE-03.2 corrections of a Closed cycle skip the cap (they fix data).
No per-lane cage capacity exists in the data model, so there is no per-lane cap.

## 3. Finish harvest on a lane (new)

`POST /api/rafts/{raftId}/lanes/{laneNumber}/finish-harvest` - no body. Access: same as recording a harvest (Cooperative Owner, Zone Manager of the raft's zone).

`200`:
```json
{ "laneNumber": 1, "state": "Harvested", "changed": true, "lotCode": "KV01-B01-20261111", "everySeededLaneHarvested": false,
  "cycleRowVersion": "...", "message": "Lane harvest saved.", "messageCode": "MSG-GEN-05" }
```
- Marks the lane row of the **latest lot of the cycle that includes the lane** as finished (no lot field edited; the lot version moves). Audit action `HarvestLot.LaneFinished` (before/after `{Lane, IsFinished}`).
- Idempotent: a lane already Harvested answers `200` with `changed:false` and writes nothing.
- When it was the last seeded lane: `everySeededLaneHarvested:true` and the Owner/Zone Manager close reminder (MSG-CYCLE-08) is sent once (same as recording the lot that finishes the last lane).
- `409 MSG-GEN-09`: lane is Growing / Not seeded (no harvest lot to finish) or the raft has no Open cycle or is read-only. `404`: unknown raft or lane number (or Removed lane). `403`: no access to the zone.
- Undo stays a lot correction with a reason.

## 4. Harvest lots screen - lane facts and cycle progress

`GET /api/rafts/{raftId}/harvest-lots` - existing fields kept; additive:

```json
{ "lanes": [ { "id": "...", "laneNumber": 1, "state": "BeingHarvested", "canHarvest": true,
               "reason": null, "reasonCode": null, "canFinish": true, "lotCount": 2, "lastHarvestDate": "2026-11-11",
               "seedLotCodes": ["PN000001-1"], "harvestedCages": 4.00 },
             { "laneNumber": 2, "state": "Harvested", "canHarvest": false, "reason": "The lane is already harvested.", "reasonCode": "AlreadyHarvested", "canFinish": false, "...": "..." } ],
  "harvestedCages": 6.00, "harvestedKg": 300.00, "targetYieldKg": 1000.00, "remainingKg": 700.00 }
```
- `state`: `NotSeeded | Growing | BeingHarvested | Harvested`. BeingHarvested stays selectable (BR-HARVEST-01); Harvested is refused by the write (400 field "Lanes").
- `reasonCode` (when `canHarvest` is false): `LaneRemoved | NoOpenCycle | ReadOnly | NoPermission | NotSeeded | AlreadyHarvested`; `reason` is an English sentence (translate by code).
- `lanes[].harvestedCages`: each lot of the lane contributes `lot.cageCount / number of lanes of that lot` (a trip is recorded for several lanes together, so this is an apportionment). Use the cycle totals for exact numbers.
- `harvestedCages`, `harvestedKg`: all lots of the Open cycle. `targetYieldKg`, `remainingKg = target - harvestedKg` are null without a target or cycle (can be negative when over plan).

## 5. Seeding - finish with no seeded lane

`POST /api/cultivation-cycles/{cycleId}/seeding-complete` body `{ "rowVersion": "...", "confirmEmpty": false }`.
When no lane In Use has seed: `409`, code `MSG-CYCLE-01`, `confirmFlag:"confirmEmpty"`, `laneNumbers:[...]`, nothing saved. Re-send with `"confirmEmpty": true`. With at least one seeded lane the flag is ignored.
`GET .../seeding-complete/preview` returns the MSG-CYCLE-01 text for an empty seeding ("No lane of raft X has seed yet. Finish the seeding anyway? ...").

Seed lots: `GET /api/rafts/{raftId}/seed-lots` already returns `unit` = the **catalogue base unit of the seed item** (`FarmingInputItem.Unit`), also in seeding records, lane progress and the cycle summary (`seedUnit`).

## 6. Zone / raft pins

`POST|PUT /api/zones[/{id}]`, `POST /api/zones/{zoneId}/rafts`, `PUT /api/rafts/{id}` (and raft photo saves) - request unchanged. Zone latitude/longitude stay **required**; raft pin stays **optional** (both or none; verified).

New hard refusals (`400 MSG-GEN-01`, `field:"Latitude"`, `fields:["Latitude","Longitude"]`, plus `hint`):
- `(0, 0)`: "(0, 0) is not a place on the farm."
- swapped pair: the given pair is outside Vietnam bbox (lat 8..24.5, lng 102..110) but the pair the other way round is inside it ("Latitude and longitude look swapped...").

Non-blocking `warnings` array in the saved answer (`FarmingZoneSaved`, `RaftSaved`; always present, maybe empty):
```json
{ "zone": {...}, "message": "...", "messageCode": "MSG-GEN-05",
  "warnings": [ { "code": "COORDINATES_OUTSIDE_VIETNAM", "message": "The pin is outside Vietnam. Check the position on the map.", "details": null } ] }
{ "raft": {...}, "warnings": [ { "code": "RAFT_FAR_FROM_ZONE", "message": "...", "details": { "distanceKm": 6.67, "limitKm": 5.0 } } ] }
```
`COORDINATES_OUTSIDE_VIETNAM` for a zone pin outside the bbox; `RAFT_FAR_FROM_ZONE` when the raft pin is more than 5 km (haversine) from its zone pin. Existing stored data is never re-validated.

## 7. Yield ("San luong nuoi") - `GET /api/harvest-yield?groupBy=raft|zone|cycle` and export

Existing fields kept. Additive:

| Where | Field | Meaning |
|---|---|---|
| `groups[]` | `harvestedCages` | sum of the lots' cages |
| | `harvestedKg` | sum of the lots' estimated kg (equals `estimatedKg`) |
| | `targetYieldKg` | sum of the targets of the distinct cycles of the group; null when none has a target |
| | `remainingKg` | `targetYieldKg - kg of ALL lots of those cycles` (not only the period); null without target |
| | `seedQuantity`, `seedUnit` | seed hung in those cycles; unit = catalogue unit; `seedUnit` null when the cycles mix units |
| | `soldKg` (existing) | invoiced minus returned |
| | `availableKg` | remaining kg of lots still for sale (not closed) |
| `groups[].lots[]` | `cageCount`, `remainingKg` | per lot |
| `totals` | `harvestedCages` | |

Export `.xlsx`: a `Cages` column is appended to the Groups and Lots sheets.

## 8. Cycle summary / close (verified consistent)

`GET /api/cultivation-cycles/{id}/summary`, `GET .../close/preview` (`summary` inside) and `POST .../close` (`summary` inside) all come from one reader and return the same figures. New in `CycleSummary`:
`harvestedCages` (decimal), `remainingKg` (= `targetYieldKg - kgHarvested`, null without target). Existing: `seedHung`, `seedUnit`, `kgHarvested`, `targetYieldKg`, `expectedSeedQuantity`, `expectedHarvestDate`, `lastHarvestDate`, `closedEarly`, `earlyReason`, `notHarvestedLanes`.

Closing: the Owner closes directly (`needsOwnerApproval:false`). A Zone Manager closing early gets `needsOwnerApproval:true` in the preview and must send `ownerApproved:true` in the close body, else `409 MSG-CYCLE-07` with `confirmFlag:"ownerApproved"`.

## 9. Message codes used

No new catalogue codes: over-plan uses `MSG-GEN-04` (confirmation), empty seeding `MSG-CYCLE-01`, refusals `MSG-GEN-01` / `MSG-GEN-09`.

## 10. Migration

`20261111140000_HarvestLotFractionalCagesAndOverPlanReason`: `HarvestLots.CageCount` int -> decimal(9,2) (data kept; check `CageCount > 0` re-created), `HarvestLots.OverPlanReason` nvarchar(1000) null. Down rounds cages to whole numbers (min 1).

---

# Part 2 - Stock is the single source of quantity on hand (second backend step, same branch)

Owner decision: "check the stock, everything must be linked and referenced". Seeding and material usage now go **through the stock ledger** (the Xuất dùng / Xuất hủy module). Seed unit = the catalogue base unit of the seed item (`unit`).

## 11. Linked issues (one fact, linked both ways)

- `POST /api/cultivation-cycles/{id}/seeding-records` (CYCLE-02), `POST /api/rafts/{raftId}/material-usages` (CYCLE-03): the same save also creates a **Completed use issue** (code `XD......`, type "Thả giống" for seeding, "Sửa chữa bè" for material usage, zone + raft of the record) and writes the movement rows. One issue per seeding session; **one issue per material usage record** (a repair with 3 items = 3 records = 3 issues).
- Record -> issue: `SeedingRecordView.issueId`, `issueCode`; `MaterialUsageView.issueId`, `issueCode` (null on legacy rows, see section 15).
- Issue -> record: `InputIssue.sourceKind` (`None | Seeding | MaterialUsage`), `sourceRecordId`, `cycleId` (null for a usage dated outside any cycle) stored on the issue; exposed on the stock movement view (section 13) and in the `details` of the refusal below.
- Correcting a seeding session (`PUT /api/seeding-records/{id}`, also TRACE-03.1) or editing a material usage (`PUT /api/material-usages/{id}`) **reverses and rewrites** the issue rows (date, lot, quantity, raft). Removing a seeding session **cancels** its issue (quantity returns to the lot). Material usage has no remove endpoint.
- The issue is owned by the record. On the Xuất dùng screens `PUT /api/input-issues/{id}`, `POST .../cancel`, `DELETE ...` answer `409 MSG-GEN-09` ("Input issue XD000007 is posted by a seeding session; change it on that record ...") with `sourceKind`, `sourceRecordId`, `cycleId` in the body.
- **No duplicate path**: a manual `POST /api/input-issues` (kind Use) with a Seed or Material item on a raft that has an **Open cycle** answers `400 MSG-GEN-01`, `field:"Lines"`, hint "Raft X has an Open cycle: record seed on its Seeding screen and materials on its Material usage screen, which post the issue." A raft with no Open cycle, and Xuất hủy (disposal), keep working as before and reduce stock; disposals are listed per item in `GET /api/farming-input-items/{id}/movements`.

## 12. On-hand check (MSG-INPUT-01)

When the cooperative does **not** allow a negative stock (`PUT /api/input-inventory-settings` with `allowNegativeQuantity:false`; **the default is still true**, see open questions), a seeding session or material usage above the stock answers `409`, code `MSG-INPUT-01`, nothing saved:
```json
{ "code": "MSG-INPUT-01", "detail": "Không đủ <item> lô PN000001-1 để xuất: số lượng còn lại sẽ là -1 kg.", "field": "Quantity",
  "itemId": "...", "seedLotLineId": "...", "onHand": 100, "balanceAfter": -1 }
```
Seed is checked per seed lot (`onHand` = received - returned - consumed); materials per item (ledger balance; body has `itemId`, `balanceAfter`). A correction may reuse the quantity the session already holds.

## 13. Read DTOs with on-hand and references (fields added, nothing removed)

- `GET /api/rafts/{raftId}/seed-lots` -> `lots[]` adds `quantityReturned`, `quantityConsumed` (seeding + manual issues + disposals, net of cancellations) and `onHand` = `quantityReceived - quantityReturned - quantityConsumed`; `unit` is the catalogue base unit; `quantitySeeded` unchanged (sum of sessions). Existing ids/codes: `id`, `code`, `receiptId`, `receiptCode`, `supplierId`, `supplierName`, `itemId`, `itemCode`, `itemName`.
- `GET /api/farming-input-items/{id}/movements` -> `items[]` adds, for issues posted by a farming record: `sourceKind` (`Seeding|MaterialUsage`), `sourceRecordId`, `cycleId`, `raftId`, `zoneId` (null otherwise). Existing: `documentId`, `documentCode`, `seedLotLineId`, `seedLotCode`, `partyName`.
- Seeding record: `seedLot` ref (receipt and supplier ids and names), `issueId`, `issueCode`. Material usage: `cycleId`, `raftId`, `issueId`, `issueCode`.
- Harvest lot detail already carries `cycleId`, `raftId`, `zoneId`, lane numbers; lane facts of the harvest screen carry `seedLotCodes` (section 4).

## 14. Purchase return and receipt cancel (PURCHASE-02 / PURCHASE-06)

The "seeded" quantity of a seed lot is replaced by the **real consumed quantity** (net use and disposal issues of the lot on the ledger, plus legacy sessions): returnable = `received - returned - consumed` = on hand of the lot (`MSG-PURCHASE-03` with the limit, as before); a receipt with consumed seed cannot be cancelled (`MSG-PURCHASE-09`, text unchanged: "seed lot X has already been used"). Codes and messages unchanged. Not done: the same on-hand limit for returns of non-seed (material) lines.

## 15. Legacy rows and migration

Migration `20261111150000_FarmingStockIssueLinks`: `InputIssues.CycleId/SourceKind/SourceRecordId`, `SeedingRecords.IssueId`, `MaterialUsages.IssueId` (+ indexes, FKs). **Rows recorded before are not back-filled** (the ledger would have to be written back in time at costs that were never recorded): their `issueId` is null (legacy). A legacy seeding session is still counted as consumed from the session itself, so it is never counted twice and stays editable; a legacy material usage never left the stock and stays so.
