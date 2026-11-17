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
| `purchaseRequestId` | guid, **required when recording** | the Accepted purchase request the trip harvests for (list: `orders[]` of the harvest screen). Missing or unknown: `400 MSG-GEN-01 field:"Purchase request"`. A correction does not read it. |
| `confirmOverPlan`, `overPlanReason` | optional | **accepted and ignored** (owner decision 12/11/2026, section 2): a harvest is never asked about the plan; the web no longer sends them |
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

## 2. The cycle plan is NOT a cap for a harvest (owner decision 12/11/2026)

Owner: "the plan is only a plan; the harvest may be lower or higher than the plan (estimate 500 kg, harvested 700 kg): refusing it is WRONG". The plan exists so that the *spending* side (seed, materials) stays within stock and budget.

- Recording or correcting a harvest lot is **never** blocked, asked about or warned about because `sum(estimated kg of the cycle) > targetYieldKg`. The former `409 MSG-GEN-04` (> 110 %) and `400 field:"Estimated kg"` (> 150 %) for harvest lots are **removed**; `confirmOverPlan` / `overPlanReason` on a harvest are accepted and ignored. `overPlanReason` stays readable on lots saved earlier.
- Plain sanity limits stay: cages > 0 and <= 100000 with 2 decimals, an estimated kg sent by hand above 10x cages x kgPerCage is refused (section 1).
- The harvest screen reads the progress without clamping: `targetYieldKg`, `harvestedKg`, `remainingKg = target - harvested` (zero or negative when at or over plan), plus `targetPercent` (harvested / target x 100, 1 decimal, null without a target above 0) and `overTarget` (bool). Example 700 of 500 kg: `remainingKg: -200, targetPercent: 140.0, overTarget: true`.
- **Unchanged:** the SEEDING plan cap (110 % asks `409 MSG-GEN-04` with a reason, 150 % stops, section 16), the MATERIAL plan checks and the stock checks (`MSG-INPUT-01`).

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

## 3b. Finish harvest on many lanes (new, owner decision 12/11)

`POST /api/rafts/{raftId}/finish-harvest` - body `{ "laneNumbers": [1, 2, 3], "rowVersion": "..." }`. `laneNumbers`: 1 to 200 distinct integers >= 1. `rowVersion` (optional): the cycle version the screen read; a stale one answers the usual `409 MSG06` with `currentRowVersion`. Access as section 3.

`200`:
```json
{ "finished": [1, 2], "alreadyFinished": [3], "everySeededLaneHarvested": false, "cycleRowVersion": "...", "message": "Lane harvest saved.", "messageCode": "MSG-GEN-05" }
```
- All or nothing, one transaction. Each lane follows the rule of section 3. Lanes already Harvested go to `alreadyFinished` (idempotent, nothing written); a repeat call finishes nothing and answers `200`.
- `409 MSG-GEN-09` when any lane cannot be finished (nothing is changed), with every offending lane: `"lanes": [ { "laneNumber": 2, "reasonCode": "NotBeingHarvested", "message": "Làn 2 chưa có đợt thu hoạch nào để hoàn tất." } ]`. `reasonCode`: `NotBeingHarvested` (no harvest lot yet), `LaneNotFound` (no such lane on the raft). Also `409 MSG-GEN-09` for no Open cycle or a read-only raft.
- `400 MSG-GEN-01` (`field: "LaneNumbers"`) for an empty list, more than 200, duplicates or a number < 1. `403` / `404` as section 3.
- Audit: one `HarvestLot.LaneFinished` per lane finished plus one summary `Raft.HarvestLanesFinished` on the raft (`after.FinishedLanes`). The close reminder (MSG-CYCLE-08) is sent once when the last seeded lane is finished.

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
- `harvestedCages`, `harvestedKg`: all lots of the Open cycle. `targetYieldKg`, `remainingKg = target - harvestedKg` are null without a target or cycle (can be zero or negative when at or over plan). Since 12/11: `targetPercent` (nullable, can exceed 100) and `overTarget` (bool); `orders[]` lists the purchase requests a new trip can be recorded for (`id`, `code`, `customerName`, `productName`, `acceptedCages`, `harvestedCages`, `pickupDate`, `workDate`, `plannedOnRaft`; the one planned on this raft first).

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

No new catalogue codes: the seeding over-plan uses `MSG-GEN-04` (confirmation; the harvest has none since 12/11), empty seeding `MSG-CYCLE-01`, refusals `MSG-GEN-01` / `MSG-GEN-09`.

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

---

# Part 3 - Merge with develop (#78, cage orders and port weighing)

Only types changed (cages are decimal wherever a harvest lot's cages are shown); no field was renamed.

- `POST /api/rafts/{raftId}/harvest-lots` (and the correction) now also take `purchaseRequestId` (develop: a new lot names one Accepted purchase request whose harvest is open) next to our `confirmOverPlan` / `overPlanReason`. Lot detail / list item carry `purchaseRequestId`, `purchaseRequestCode`, `overPlanReason`.
- `GET /api/rafts/{raftId}/harvest-lots`: `orders[]` (develop) and our lane facts / `harvestedCages` / `harvestedKg` / `targetYieldKg` / `remainingKg` are both present. `orders[].harvestedCages` is now a decimal (sum of the lots' cages); `acceptedCages` stays an integer.
- Purchase request detail `harvest.harvestedCages` and `harvest.lots[].cageCount` are decimal. The public origin page `harvestedCages` of a lot is decimal (`0.5`). `weighedCages` and port-weighing cage counts stay whole numbers (one weighed cage = one kg entry).
- Port weighing keeps its rule "weighed cages of a lot <= cages of the lot", compared as whole weighed cages against the decimal cage count (a lot of 2.5 cages can be weighed as at most 2 whole cages).
- Migrations are ordered after develop's `20261111135229_CageOrdersWorkPlansHarvestAndWeighing`: `20261111140000_HarvestLotFractionalCagesAndOverPlanReason`, `20261111150000_FarmingStockIssueLinks` (`InputIssues.SourceKind` is `nvarchar(50)`, default `None`, like every enum), `20261111160000_SeedingSessionOverPlanReason`.
- New cooperatives (bootstrap) start with `allowNegativeQuantity: false` (stock cannot go negative); existing cooperatives keep their value. The PURCHASE-06 / MSG-PURCHASE-09 text now says "seed lot X has already been used".

---

# Part 4 - Seeding against the plan, removals, history (12/11/2026)

## 16. Seeding session against the planned seed quantity

Plan = `expectedSeedQuantity` of the cycle (BR-CYCLE-01 estimate). `total = sum(quantity of the other sessions of the cycle) + this session`. Thresholds (the harvest no longer has them, section 2): `<= 110 %` saved; `> 110 %` and `<= 150 %` -> `409 MSG-GEN-04`, nothing saved; `> 150 %` -> `400 MSG-GEN-01 field:"Quantity"` (cannot be confirmed); no plan -> no cap.

`POST /api/cultivation-cycles/{id}/seeding-records` and `PUT /api/seeding-records/{id}` take two more optional fields: `confirmOverPlan` (bool, send `false` or leave out, not `null`) and `overPlanReason` (text <= 1000, required with `confirmOverPlan: true`, else `400 field:"Over plan reason"`).

409 body:
```json
{ "code": "MSG-GEN-04", "detail": "Are you sure you want to record this seeding, which takes the cycle to 115 seed, above its planned seed of 100? This action is recorded in the audit log.",
  "confirmFlag": "confirmOverPlan", "reasonField": "overPlanReason",
  "plannedSeedQuantity": 100, "seededQuantity": 110, "newQuantity": 5, "totalQuantity": 115, "overPlanPercent": 15.0 }
```
The reason is stored on the session (`overPlanReason` in `SeedingRecordView`) and in the `SeedingRecord.Created` / `SeedingRecord.Corrected` audit values. A correction is judged only when it raises the quantity (the session's own old quantity is left out of the total); TRACE-03.1 corrections skip the cap.

Reads: `GET /api/cultivation-cycles/{id}/seeding-records` adds `plannedSeedQuantity` (null without plan), `seededQuantity` (all sessions) and `percent` (`seeded / planned x 100`, 1 decimal, null without plan). The cycle summary (`/summary`, close preview and close) adds `seedPercent`.

On-hand stock cap (unchanged, hard when negative stock is disallowed): `409 MSG-INPUT-01` carries `onHand` and `balanceAfter`; `GET /api/rafts/{raftId}/seed-lots` returns `onHand` per lot for the picker. The plan question is asked before the stock check.

Demo data: the planned seed of the demo cycles is now about what the demo sessions hang (5,000 / 7,000 / 9,000), and the demo material repairs run after the receipts so stock never goes negative.

## 17. Removing a session or a material usage

- `POST /api/seeding-records/{id}/remove` `{ reason, rowVersion }` (existing): allowed while the cycle is Open and no lane of the session is in a harvest lot (Owner: any session; Zone Manager: own); reverses (cancels) the linked stock issue, so the seed returns to the lot. Otherwise `409 MSG-GEN-09` (lane in a harvest lot / cycle not Open); no reason -> `400 field:"Reason"`.
- **New** `POST /api/material-usages/{id}/remove` `{ reason, rowVersion }` -> `204`. Same people as the edit (Owner, Zone Manager of the raft's zone). `409 MSG-GEN-09` when a closed cycle holds the usage date or the raft is not In Use; `400 field:"Reason"` without a reason; `409` MSG06 on a stale `rowVersion`. The linked issue is cancelled and the quantity returns to the stock. Audit action `MaterialUsage.Removed` with the reason.
- Cultivation log removal (`POST /api/cultivation-logs/{id}/remove`) already exists and is unchanged.

## 18. History of a record

`GET /api/harvest-lots/{id}/history`, `/api/seeding-records/{id}/history`, `/api/material-usages/{id}/history`, `/api/cultivation-logs/{id}/history`, `/api/cultivation-cycles/{id}/history`. Read with View permission of the record's function (Harvests, Cultivation cycles, Cultivation logs) in the zone of its events; the Owner reads all; `404` when the record has no event; a **removed record keeps its history**.

```json
{ "recordType": "SeedingRecord", "recordId": "...", "recordCode": "B1-01",
  "entries": [ { "eventId": "...", "at": "2026-11-12T03:10:00+00:00", "byName": "Nguyen Van A", "byRole": "Chủ hợp tác xã", "byRoleCode": "CooperativeOwner",
                 "action": "Edited", "actionCode": "SeedingRecord.Corrected", "actionLabel": "Chỉnh sửa", "reason": "Counted again", "note": null,
                 "changes": [ { "field": "Quantity", "label": "Số lượng giống", "from": "10", "to": "12", "unit": null } ] } ] }
```
Oldest first. `action`: Created, Edited (Corrected/Updated), TraceCorrected, Removed, LaneFinished, Started, SeedingCompleted, Closed, Cancelled, Reopened, Published, Republished, Withdrawn. `byRole` is the role at the time of the event (Chủ hợp tác xã, Quản lý vùng, Kế toán, Nhân viên, Thương nhân; null for the system); `byRoleCode`: `CooperativeOwner`, `ZONE_MANAGER`, `ACCOUNTANT`, `Staff`, `Employee`, `Trader`. `changes` come from the audit snapshots: values as text (dates `dd/MM/yyyy`, times in Vietnam time, lists joined with `, `, flags `Có`/`Không`); unchanged fields are left out; `unit` is set for numbers with a fixed unit (`lồng`, `kg`, `kg/lồng`) and null otherwise (seed and material quantities use the item's catalogue unit, read it from the record). `note` names published lots affected by a traceability correction.
