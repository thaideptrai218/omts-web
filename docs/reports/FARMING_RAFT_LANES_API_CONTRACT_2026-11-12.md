# Raft geometry, lane incidents and harvest crew - API contract of 12/11/2026 (backend branch `feature/OMTS-132-raft-lanes`)

Scope: owner decisions of 12/11/2026 (`FARMING_RAFT_LANES_HARVEST_OWNER_DECISIONS_2026-11-12.md`), which override the spec `FARMING_RAFT_LANES_AND_HARVEST_PLAN_SPEC_2026-11-12.md` where they conflict.
Not in scope (the teammate owns it, OMTS-223): purchase requests, orders, work plans, harvest plans per order, port weighing. Every path is under the API origin; JSON is camelCase; errors keep the
problem shape `{ "code": "MSG-GEN-01", "detail": "...", "field": "...", "fields": [...], "hint": "...", ...extra }` (400 / 403 / 404 / 409). **Everything below is additive**: old clients keep working.

Units: lengths in metres (`m`), area in `m²`, at most 2 decimals. Lane number is fixed for good (traceability): no renumbering, no replace, no removal from the middle.

## 1. Raft geometry

### 1.1 Create / edit body (`POST /api/zones/{zoneId}/rafts`, `PUT /api/rafts/{raftId}`), Owner only, as before

```json
{ "code": "KV01-B01", "lengthM": 24.0, "widthM": 10.0, "laneCount": 6,
  "laneLengths": [ { "laneNumber": 3, "lineLengthM": 18.5 } ],
  "latitude": null, "longitude": null, "location": null, "conditionNotes": null, "size": null, "rowVersion": "..." }
```

| Field | Rule |
|---|---|
| `lengthM` | length along the lines, `1.00 <= x <= 500.00`, max 2 decimals. Required together with `widthM` |
| `widthM` | width across all lanes, `1.00 <= x <= 200.00`, max 2 decimals |
| `laneLengths[]` | optional. Sets the line length of the lanes it names and **leaves the others as they are**; `lineLengthM: null` puts a lane back to the length of the raft. `1.00 <= lineLengthM <= lengthM`; each lane once; the lane must be In Use |
| `size` | **legacy**. Ignored when `lengthM`/`widthM` are sent (the server writes `"{length} m x {width} m"`, dot decimal, no trailing zeros, e.g. `"24 m x 10 m"`, `"18.5 m x 9.25 m"`). A request with **neither** number is the older form: `size` is then required and, when it has exactly the form `<number> m x <number> m` (length first, in range), it is read back into the numbers; otherwise the numbers stay `null` and the text is kept as typed (never guessed) |
| `areaM2` | never sent (ignored): `round(lengthM x widthM, 2)` half up, worked out by the server |

Errors (400, MSG-GEN-01): `field` / `fields` name `Length`, `Width` (out of range, third decimal, only one side sent), `Line length` (out of range, lane not In Use, duplicate lane, no raft length).
Lowering `lengthM` below a line a lane keeps -> 400 `field: "Length"` with `lanes: [2, ...]` and a `hint`; nothing is saved.
BR-FARM-04 is **kept**: the number of lanes changes only at the end of the raft and only while no cycle is open (409 `MSG-GEN-06` otherwise, as before). The geometry and lane lengths can change while a cycle is open (audited).
A lane taken off the end loses its own line length (it has the raft's length again if it returns).

### 1.2 Reads (`GET /api/rafts/{id}`, `GET /api/zones/{zoneId}/rafts`, create/edit answers)

`RaftView` adds: `lengthM`, `widthM`, `areaM2` (all `null` for an old raft whose size text could not be read), `totalLineLengthM` (= 2 x sum of the effective line length of the lanes In Use; `null` when a length is unknown),
`damagedLaneCount`, `outOfServiceLaneCount` (lanes In Use). `lanes[]` adds `lineLengthM` (effective: own, else the raft's), `lineLengthOverridden`, `isDamaged`, `isOutOfService`, `outOfServiceOn` (date).
`RaftListItem` adds `lengthM`, `widthM`, `areaM2`, `damagedLaneCount`, `outOfServiceLaneCount`.

`warnings[]` of the save answers (soft, never block; same shape as `RAFT_FAR_FROM_ZONE`): `RAFT_NARROW_FOR_LANES` (`widthM / lanes In Use < 1`; `details.widthPerLaneM`, `details.laneCount`),
`RAFT_LANE_LENGTHS_DIFFER` (the lanes In Use do not all have the same effective line length).

Audit: `Raft.Created` (After has the geometry and `areaM2`), `Raft.Updated` (diff has `LengthM`, `WidthM`, `Size`), `Raft.LaneLengthChanged` {lanes: [{lane, length}]} before/after.

Migration `20261112100000_RaftGeometry`: adds the columns and backfills `LengthM`/`WidthM` from `Size` **only** when it is exactly `<number> m x <number> m` (length first, `.` decimal, at most 2 decimals, length 1-500, width 1-200); anything else stays `null`.

## 2. Lane states returned by the lane reads

Applies to `GET /api/rafts/{id}/lanes/today` (`lanes[]`), the progress view (`lanes[]`), the seeding screen (`lanes[]`) and the harvest screen (`lanes[]`):

| Field | Meaning |
|---|---|
| `state` | `NotSeeded` / `Growing` / `BeingHarvested` / `Harvested` as before, plus **`OutOfService`**: the lane had seed in the cycle (Growing or Being harvested) and was put out of service. A lane `Harvested` before keeps `Harvested`; a lane with no seed stays `NotSeeded` |
| `isDamaged` | damaged and not repaired. **The state is the one it had** (a damaged `Growing` lane still says `Growing`): use `isDamaged` |
| `isOutOfService` | out of service (true for a lane of any state, also `NotSeeded`): hide it from pickers |
| `reasonCode` | `LaneDamaged` or `LaneOutOfService` when a flag is why the lane cannot take seed or a harvest; else `null` (lane lists `lanes/today`, progress, seeding) |
| `lineLengthM` | effective line length |

Harvest screen (`GET /api/rafts/{raftId}/harvest-lots`) `lanes[]`: `canHarvest` is `false` for a damaged or out-of-service lane, `reasonCode` is `LaneDamaged` / `LaneOutOfService` (before `NoOpenCycle`, `ReadOnly`...), `reason` is the sentence;
adds `isDamaged`, `isOutOfService`, `lineLengthM`. Seeding screen: `canSeed` is `false` for them and `reasonCode` says why.
Recording a lot or a seeding session that names such a lane -> 400 `field: "Lanes"` (as for a Harvested lane). A lot that already holds a lane keeps it when the lane is reported damaged later: the lot can still be corrected (a correction cannot **add** a damaged lane).

## 3. Lane incidents (Owner and Zone Manager of the raft's zone)

Permission: Cultivation cycles / Edit in the raft's zone (reads: View). Raft In Use and zone In Use (409 `MSG-GEN-09` otherwise). A lane Removed -> 409 `MSG-GEN-09`; unknown raft/lane -> 404; no access -> 403.
Every body carries `rowVersion` = the **raft** `rowVersion` read last (stale -> 409 `MSG06`; required). Lane numbers are those of the raft, the lane must exist.
`reasonCode` (optional) is one of `LineBroken`, `BuoyDamaged`, `Storm`, `MassMortality`, `Other` (else 400 `field: "Reason code"`). `reason` is required, at most 500 characters (else 400 `field: "Reason"`). A photo is optional (section 3.4).

### 3.1 `POST /api/rafts/{raftId}/lanes/{n}/report-damage` - damaged

Body `{ "reason": "Line snapped in the storm", "reasonCode": "LineBroken", "rowVersion": "..." }`. Blocks seeding and harvest on the lane, **keeps its state**, notifies the Owner (type `LANE_DAMAGED`, not when the Owner did it).
Allowed in any state, also `BeingHarvested` (the lots already recorded stay; no new lot can add the lane; the Owner then finishes the lane with `finish-harvest` or puts it out of service).
Already damaged -> **200** with `changed: false` and the incident that damaged it (safe to repeat). Out of service -> 409 `MSG-GEN-09` with `reasonCode: "LaneOutOfService"`.

### 3.2 `POST /api/rafts/{raftId}/lanes/{n}/repair` (alias `/repair-done`) - repaired

```json
{ "reason": "optional, blank reads as Repaired", "materials": [ { "itemId": "...", "quantity": 4, "unit": "m" } ], "rowVersion": "..." }
```
`materials` is optional. Each item must be in the group Material (Vật tư), In Use, listed once, `quantity > 0` with at most 3 decimals, and `unit` (optional) must be the unit of the item (never converted).
Checks the **stock on hand** first: 409 `MSG-INPUT-01` (`balanceAfter`, `itemId`, `field: "Lines"`) when the cooperative does not allow a negative stock; **nothing is saved**.
On success, **in one save**: for each material a raft usage record (BR-CYCLE-03, so the raft material cost counts it) with its **Completed use issue (Xuất dùng, type "Sửa chữa bè") linked to the raft and the cycle**, one `LaneIncidentMaterial` row naming the usage and the issue, the audit rows, the flag cleared (the lane is exactly as before), the incident `Repaired` with `resolvesIncidentId` = the damage report.
Not damaged -> 409 `MSG-GEN-09` with `reasonCode: "LANE_NOT_DAMAGED"`; out of service -> 409 `MSG-GEN-09` `LaneOutOfService`. Field errors name `Line {n} item`, `Line {n} quantity`, `Line {n} unit`, `Materials`.
Not told to anybody. The usage record can also be seen and changed on the material usage screen (usual rules); its `repairReason` is `"Lane {n}: {reason}"`.

### 3.3 `POST /api/rafts/{raftId}/lanes/{n}/out-of-service` - out of service (ngừng hoạt động)

Body `{ "reason": "...", "reasonCode": "Other", "confirm": true, "rowVersion": "...", "cycleRowVersion": "..." }` (`cycleRowVersion` optional).
The lane is left out of every list of lanes to seed or harvest and its number is never reused; it comes back only through `restore-service` (3.3b), and nothing is deleted (history stays).
When seed hangs on the lane (`state` Growing or BeingHarvested) the first answer is **409 `MSG-GEN-04`** `{ "confirmFlag": "confirm", "laneNumber", "state", "seedLotCodes": ["PN000001-1"] }` and nothing is saved; send `confirm: true` to record the **loss event of that seed (no quantity)**.
A lane with no seed needs no confirmation. A damaged lane put out of service resolves its damage report. The raft row and (when a cycle is open) the cycle row are part of the save: a parallel lot/close answers `MSG06`.
Notifies the Owner (`LANE_OUT_OF_SERVICE`). When this makes every lane with seed Harvested or out of service, the usual close reminder (`MSG-CYCLE-08`) is sent once.
Already out of service -> **200** `changed: false`.

### 3.3b `POST /api/rafts/{raftId}/lanes/{n}/restore-service` - back in service (owner decision, after the cycle is done)

Body `{ "reason": "optional", "materials": [ { "itemId", "quantity", "unit" } ], "rowVersion": "..." }`. `materials` behave as in a repair: stock on hand checked first (409 `MSG-INPUT-01`, nothing saved), then in one save a usage record and a Completed Xuất dùng linked to the raft and the incident.
Allowed only when the lane is out of service **and no Open cycle still holds seed on it** (state `NotSeeded` in the Open cycle, or no Open cycle; a usage record is refused on the close day itself, BR-CYCLE-04).
During an open cycle that holds seed on the lane: 409 `MSG-GEN-09`, `reasonCode: "LANE_HOLDS_SEED"`, Vietnamese `detail` "Làn N chưa thể đưa vào hoạt động lại: chu kỳ đang mở vẫn còn giống trên làn này. Hãy đóng hoặc kết thúc chu kỳ trước." Not out of service: 409 `LANE_NOT_OUT_OF_SERVICE`.
It clears `isOutOfService` and `isDamaged`; the lane is `NotSeeded` for the next cycle. Incident `kind: "Restored"` (stored as text, no migration), audit `Lane.Restored`, history and lane reads updated. Answer: `LaneIncidentSaved`.
`repair`: `reason` is now optional (blank reads as `Repaired`); the stock check stays when materials are given.

### 3.4 `POST /api/rafts/{raftId}/lanes/{n}/incidents/{incidentId}/photos` - optional photo

Multipart, one field `file` (JPEG or PNG, <= 10 MB), one photo per request, at most 3 per incident (400 `field: "Photos"`; wrong file 400 `field: "Photo"`; storage failure 502 `MSG-GEN-03`). 201 with the updated `LaneIncidentView`.
The incident must belong to that lane and raft (404 otherwise).

### 3.5 Answer of 3.1-3.3: `LaneIncidentSaved`

```json
{ "incident": { "id": "...", "laneId": "...", "laneNumber": 3, "kind": "Damaged|Repaired|OutOfService", "occurredAt": "...", "occurredOn": "2026-11-12", "cycleId": null,
                "reasonCode": "LineBroken", "reason": "...", "stateBefore": "Growing", "hadSeed": false, "recordedByAccountId": "...", "recordedByName": "...",
                "resolvesIncidentId": null, "photos": [ { "id": "...", "sortOrder": 1, "url": "signed, expires" } ],
                "materials": [ { "itemId": "...", "itemCode": "...", "itemName": "...", "unit": "m", "quantity": 4, "issueId": "...", "issueCode": "XD000012" } ] },
  "lane": { "id": "...", "laneNumber": 3, "statusId": 2001, "status": "In use", "state": "Growing", "isDamaged": true, "isOutOfService": false, "lineLengthM": 24.0, "reasonCode": "LaneDamaged" },
  "changed": true, "raftRowVersion": "...", "cycleRowVersion": null, "everySeededLaneHarvested": false, "message": "Lane incident saved.", "messageCode": "MSG-GEN-05" }
```
`hadSeed: true` marks the loss event. Send the new `raftRowVersion` with the next lane command. `cycleRowVersion` is set when the command moved the cycle (out of service).

### 3.6 History (read, Cultivation cycles / View in the zone)

`GET /api/rafts/{raftId}/lanes/{n}/incidents` and `GET /api/rafts/{raftId}/lane-history?laneNumber=` (the lane filter is optional) -> `{ "raftId", "raftCode", "laneNumber": 3|null, "incidents": [LaneIncidentView, ...] }`, newest first.
Audit rows (record type `Lane`, code `{raft code}/{lane number}`, with the reason): `Lane.Damaged`, `Lane.Repaired`, `Lane.OutOfService`, `Lane.IncidentPhotoAdded`, plus `MaterialUsage.Created` and `InputIssue.Created` of a repair.

## 4. Cycle close, summary and the lane that is out of service

`EverySeededLaneHarvested` (answer of a lot, of `finish-harvest`, of 3.5) and the close rule BR-CYCLE-07: **true when at least one lane has seed and every lane with seed is `Harvested` or `OutOfService`**. A lane out of service is finished, not "not harvested":
`CycleSummary` (close preview `summary`, close answer, closed-cycle summary) adds `lostLanes: [{ laneNumber, date, reason, reasonCode }]` (the loss events of the cycle) and `damagedLanes: [laneNumber]` (open cycle: damaged now);
`notHarvestedLanes` lists only lanes Growing or Being harvested. The close preview `isEarly` is false when every lane with seed is Harvested or out of service.
No quantity or value is ever recorded for the lost seed (the system has none per lane); the seed already issued stays issued.

## 5. Harvest crew

`POST /api/rafts/{raftId}/harvest-lots` and `PUT /api/harvest-lots/{lotId}` stay multipart. New form fields:

| Field | Notes |
|---|---|
| `crew` (repeat) | one field per employee id (GUID). Optional |
| `replaceCrew` | `true` on a **correction** that sends no `crew` field: clears the crew (a form cannot send an empty list). Without `replaceCrew` and without `crew`, a correction leaves the crew as it is; with `crew` fields it **replaces** the crew |

Rules: each id must be an employee of the cooperative who still works here (not Left); an id sent twice counts once; at most 100; otherwise 400 `MSG-GEN-01` `field: "Crew"` and nothing is saved.
One employee may be on the lots of several rafts on the same day. No quota per person, no link to orders. Stored in `HarvestLotCrew` (migration `20261112120000_HarvestLotCrew`).
Returned as `crew: [{ id, code, name }]` (by name) in `HarvestLotView` (`GET /api/harvest-lots/{id}`, record and correct answers) and in each `lots[]` item of the harvest screen; empty list when none.
Audit: the lot snapshot names the crew (`Crew: ["NV000001 Name", ...]`) when there is one; a correction that changes it shows in `Before`/`After`.

`GET /api/rafts/{raftId}/crew-suggestions?date=YYYY-MM-DD` (date default today; Harvests / View in the zone) -> `{ "raftId", "raftCode", "date", "employees": [ { "id", "code", "name" } ] }`: the employees still working who are assigned to **that raft on that day** in the work assignments (LABOR-02), by name. Read only; any other employee can still be chosen.

## 6. Differences from the spec (and why)

| Spec | Done | Why |
|---|---|---|
| `WrittenOff` state, `retire`, `replace`, generations | `OutOfService` state + flag, no replace/generation | owner decision (2) |
| `AreaM2` persisted computed column | worked out in code, not stored | works in the in-memory test provider; no query needs it; equal value |
| `report-damage` `note` | not kept | the owner listed `reason` and an optional photo only |
| Photos with the incident body | separate `POST .../incidents/{id}/photos` after the incident (as the spec's own photo route) | JSON body cannot carry a file |
| `repair-done` with `note` | `repair` (alias `repair-done`) with `reason` and `materials` | the owner's stock-based repair |
| `LaneIncidents` unique write-off per generation | not needed (no generations) | |
| `affectedPlans` in the incident answer | not present | plans per order are the teammate's |
| `reasonCode` of `LANE_ALREADY_DAMAGED` as 409 | 200 `changed: false` | the spec also allows the idempotent answer; chosen for safe retries |
| `MSG-INPUT-01` for the repair carries `onHand` | carries `balanceAfter`, `itemId` (the ledger answer of an item with no lot) | the common ledger does not add `onHand` for an item with no lot |
| Message codes of the two notices | generic `MINI_APP_NOTIFICATION` text (types `LANE_DAMAGED`, `LANE_OUT_OF_SERVICE`) | no SRS message exists and the message catalogue only admits SRS or kept codes |
