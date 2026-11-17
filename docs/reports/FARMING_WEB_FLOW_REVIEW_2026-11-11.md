# Farming (Nuôi trồng) web flow review - 2026-11-11

Scope: READ-ONLY audit of the web flow vùng -> bè -> thả giống -> chu kỳ -> kế hoạch -> thu hoạch -> sản lượng.
Files: `src/features/{zones-api,rafts-api,cycles-api,cultivation-api,harvest-yield,lot-tracing,farming-api}`, `src/server/{operations,farming}`.
Evidence: code (file:line, working tree at review time), headless screenshots of the live app (owner/Demo@1234), backend source `D:\Đồ_án\omts-backend` (read-only).
Screenshots (scratchpad, not committed): `...\scratchpad\shots\{harvest,harvest-open,harvest-form,cycles,cycle-open,cycle-plan,yield}.png`.
Companion report (backend rules, same day): `docs/reports/FARMING_BACKEND_RULES_REVIEW_2026-11-11.md`. This report = web/UX side; it cites that report's D1..D10 for backend items instead of repeating them.

NOTE: the working tree is changing while reviewed (another task is adding `farming-api/location-picker*.tsx`, a "Xác nhận làn đã thu xong" block in the harvest form, and moving "Bắt đầu chu kỳ nuôi" to the cycle header). Items below were checked against the tree as of the last read; section E reviews the picker as it exists now (uncommitted).

---

## 0. Diagnosis in one paragraph

The owner's five complaints share one root cause: **the web models "Nuôi trồng" as 4-5 unrelated raft lists** (Chu kỳ nuôi, Thả giống, Sử dụng vật tư, Thu hoạch, + Sản lượng nuôi elsewhere) that all reuse `RaftCycleWorkspace` (`cycles-api/raft-cycle-workspace.tsx`). Each list opens a panel with its own records; **nothing shows the cycle as one story with plan vs actual and a "next action"**. Plan values (`expectedSeedQuantity`, `expectedHarvestDate`, `targetYieldKg`) are displayed once in the "Kế hoạch" tab (`cycle-plan-tab.tsx:57-59`) and never compared to anything on the screens where the numbers are typed. The backend already returns the comparison (`GET /api/cultivation-cycles/{id}/summary`, `/close/preview`, `/close`: `seedHung`, `kgHarvested`, `targetYieldKg`, `notHarvestedLanes`...) but **the web wires none of these three endpoints** (grep `close|summary` in `src/server/operations/cultivation-plan.ts`: nothing) - so there is no "Tổng kết / Kết thúc chu kỳ" step at all, and an owner cannot close a cycle from the web.

Live evidence of the owner's "enter anything": demo cycle B1-01 has plan 250 giống / 8.500 kg (`cycle-plan.png`), seeded 5.000 con (`cycle-open.png`, "PN000001-1: 5.000 con"), harvest lots 180 + 400 kg; every number is accepted and none is flagged.

Other verified facts that shape the fixes:
- "Harvested lanes still shown" is partly a perception bug: the backend returns `canHarvest:false` for Harvested/NotSeeded lanes and the form already filters them (`records-harvest-form.tsx:87`; screenshot `harvest-form.png` shows only Làn 1 and Làn 3, lane 2 Harvested is hidden). **BeingHarvested lanes are meant to stay selectable** (BR-HARVEST-01, harvest over several days until marked finished). The user cannot tell "Đang thu" from "Đang nuôi" because the web contract drops the lane state: `cultivation-api/records-contracts.ts:14` keeps only `{laneNumber, canHarvest}`, although the backend sends `State` (`HarvestLaneView(Id, LaneNumber, StatusId, Status, State, CanHarvest)`).
- "Mark harvest done needs editing the lot": true by design today. The only ways to finish a lane are `finishedLaneNumbers` on a new lot (needs cages > 0) or a correction with reason (`harvest-detail.tsx:41`, owner/recorder only). No endpoint finishes a lane alone (backend report P1/D7).
- No "kế hoạch thu" exists anywhere: SRS v8 removed it, backend has no entity; the only trace is `cycles-api/cycle-work-plan-preview.tsx` (local-state mock, imported nowhere - dead code that also breaks Design §2 "Không dựng nút, cột, số liệu giả").
- Zero toasts in the whole group: `grep useToast` over the 7 feature folders = no hits (Design §1.10 mandatory).

---

## A. Proposed end-to-end flow: "Hành trình chu kỳ" (one page, one sequence)

Principle: **cycle = the unit of work**. Opening a raft row in `/farming/cycles` lands on a "Hành trình" tab (replaces "Tiến độ" as default; "Kế hoạch", "Lịch sử", "Nhật ký chăm sóc" stay). The other nav tabs (Thả giống, Sử dụng vật tư, Thu hoạch) stay as quick lists but deep-link into the same page with `?zoneId=&raftId=&step=` (Design §1.9 link rule: code in URL, no GUID).

Steps (always the same 5, state = Xong / Đang làm / Chưa tới / Bị chặn):
1. **Kế hoạch** (start, planned seed/date/target) 2. **Thả giống** 3. **Chăm sóc** (nhật ký + vật tư) 4. **Thu hoạch** 5. **Tổng kết** (close).

Text mock-up (desktop, inside the opened row; 360 px: stepper becomes a vertical list, cards stack):

```
Bè B1-01 · 3 làn · Chu kỳ từ 02/10/2026 · Ngày 41/300            [Đang nuôi]
 (1 Kế hoạch ✓)──(2 Thả giống ✓)──(3 Chăm sóc ●)──(4 Thu hoạch ○)──(5 Tổng kết ○)
 ┌ Việc tiếp theo ───────────────────────────────────────────────────────────┐
 │ Làn 1 đang thu hoạch. Làn 2 đã thu xong. Làn 3 đang nuôi.                 │
 │ [ Ghi nhận chuyến thu ]   [ Hoàn tất thu hoạch làn 1 ]                    │
 └───────────────────────────────────────────────────────────────────────────┘
 ┌ So với kế hoạch ──────────────────┐ ┌ Làn ───────────────────────────────────┐
 │ Giống   5.000 / 250 con  ▓▓▓▓▓▓▓ 2000%⚠│ Làn 1 [Đang thu]  2 chuyến · 4 lồng │
 │ Sản lượng 580 / 8.500 kg ▓░░ 7%  │ │ Làn 2 [Đã thu xong] thu xong 11/11     │
 │ Ngày TH dự kiến 02/08/2027 (còn 264 ngày)│ Làn 3 [Đang nuôi]  thả 11/11/2026 │
 └───────────────────────────────────┘ └────────────────────────────────────────┘
 Thả giống  · 2 lần · 3/3 làn · [Đã hoàn tất 11/11]          (mở: bảng lần thả)
 Chăm sóc   · 4 nhật ký · 3 phiếu vật tư · gần nhất 09/11     (mở: nhật ký)
 Thu hoạch  · 3 lô · 580 kg (≈ 12 lồng) · 120 kg đã bán       (mở: bảng lô)
 Tổng kết   · chưa kết thúc: còn làn 1, 3 chưa thu xong       [ Kết thúc chu kỳ ] (chặn/ cảnh báo)
```

Rules per step (all derived, no new input from owner):
- Each step header shows: state chip, one-line "plan vs actual" with a `<progress>`/bar, and ONE primary button (the next action). Secondary actions sit in the footer left (Design §1.6).
- Over-plan: bar turns warning (cam) + text "Vượt kế hoạch 20x - kiểm tra số lượng đã nhập"; never red-blocking until backend D1 decides. Under-plan at close: "Đạt 7% mục tiêu".
- "Việc tiếp theo" is a pure function of (cycle, lane states, seedingCompletedOn): no cycle -> "Bắt đầu chu kỳ"; lanes NotSeeded -> "Ghi nhận thả giống"; all seeded & not completed -> "Hoàn tất thả giống"; lane BeingHarvested -> "Hoàn tất thu hoạch làn X"; all seeded lanes Harvested -> "Kết thúc chu kỳ".
- Data: all reads exist (`progress`, `seeding list`, `harvest list`, `summary`). Web-only except: wire `summary` + `close/preview` + `close` in `cultivation-plan.ts` + `cycles-api/repository.ts` (BFF, S) and the finish-lane action (backend, D7).

---

## B. Proposed harvest UX (lane list, rules, one-click finish)

Where: step "Thu hoạch" of the journey + the existing Thu hoạch nav list (same component).

```
Thu hoạch · Bè B1-01 · Chu kỳ 02/10/2026          Đã thu 580 kg / mục tiêu 8.500 kg (7%)
 Làn        Trạng thái         Thả ngày    Đã thu (lồng / kg)      Thao tác
 [ ] Làn 1  (Đang thu)          11/11      4 lồng · 180 kg   [✓ Thu xong]
 [ ] Làn 3  (Đang nuôi)         11/11      —                 
 —   Làn 2  (Đã thu xong 11/11) 11/11      8 lồng · 400 kg   (không chọn được)
 ───────────────────────────────────────────────────────────────────────────
 Chuyến mới: đã chọn Làn 1 · Số lồng [ 4 ] ↔ Khối lượng ước tính [ 200 ] kg  (50 kg/lồng, tự tính)
 Còn lại trong mục tiêu: 7.920 kg      [Ảnh]                [Bỏ qua] [Lưu chuyến thu]
```

Concrete rules:
1. **Lane list = state chips, not bare checkboxes.** Add `state`/`status` to `harvestList.lanes` (`records-contracts.ts:14`, web-only). Chips use `LaneBoard` labels (`cultivation-api/lane-board.tsx:3`): Chưa thả / Đang nuôi / Đang thu / Đã thu xong. Sort: Đang thu, Đang nuôi, then disabled rows (Đã thu xong, Chưa thả) with reason text "Đã thu xong ngày 11/11" (not hidden: the owner must see why a lane is missing).
2. **Only eligible lanes selectable** (`canHarvest`); default unchecked; header "Chọn tất cả làn đang thu" convenience.
3. **Per-lane "Thu xong" is a toggle in the same row** (Switch, `components/ui/switch.tsx`), visible only when the lane is selected, label "Làn này đã thu hết". It replaces the second LaneChoices block (`records-harvest-form.tsx:96-107`) that makes the user pick the same lane twice. This is the web-only interim.
4. **One-click "Hoàn tất thu hoạch" (target)**: a row action on lanes in state Đang thu (this is the "tick/check on the row" the owner wants). Click -> `useActionDialog().confirm("Hoàn tất thu hoạch làn 1? Làn sẽ chuyển sang Đã thu xong và không ghi nhận thêm chuyến thu cho làn này.")` -> `POST finish-harvest` -> toast "Đã hoàn tất thu hoạch làn 1." -> list refreshes, lane chip changes. Needs backend endpoint (backend report P1, D7). Until then the interim is rule 3. If every seeded lane is then Harvested, show the banner "Tất cả làn đã thu xong. [Kết thúc chu kỳ]".
5. **Planned / actual / remaining** in the header and as hint under the kg field: from `summary` (`kgHarvested`, `targetYieldKg`). Over target after this trip: inline warning (not a toast) "Cộng chuyến này sẽ là 8.900 kg, vượt mục tiêu 8.500 kg." Hard cap/confirm flag comes from backend D1-D3; the web only renders `409 details` when the backend supplies them.
6. **Auto-calc (web-only)**: cages <-> kg two-way. Typing cages fills kg = cages x `averageKgPerCage` (field marked "tự tính", editable; once the user edits kg manually stop overwriting). Typing kg alone shows "≈ 4 lồng" read-only. If |kg - cages x kgPerCage| > 50% show inline "Khối lượng lệch nhiều so với 50 kg/lồng." (backend D8 may later enforce). Today there is only a text hint (`records-harvest-form.tsx:34`, `:123`).
7. **Lot table (below)** keeps lot code/time/lanes/cages/kg but renames confusing columns: "Đã lập hóa đơn" -> "Đã bán", "Còn lại" -> "Còn để bán", drops "Đã thu hết: Chưa có" sub-line (now chips per lane), and **no "Sửa lô" button on the unopened row** (Design §1.5): put it in the opened row's footer.
8. States: skeleton on load, empty ("Chưa có chuyến thu hoạch. Chu kỳ chưa thả giống xong?"), error with retry, permission-denied note when `canRecordHarvest` false, local pending on Lưu.

---

## C. Redesign of "Sản lượng nuôi" (`harvest-yield/*`)

What the owner is asking when he opens it (and what today's screen answers):
| Question | Today |
|---|---|
| Chu kỳ/bè này thu được bao nhiêu so với mục tiêu? | not shown (no target) |
| Thả bao nhiêu giống, thu lại bao nhiêu (năng suất)? | not shown (no seed) |
| Bán được bao nhiêu, còn bao nhiêu chưa bán? | "Đã bán" ok; "Chênh lệch" is unclear |
| Hao hụt bao nhiêu? | "Hao hụt" ok but always 0 until lot close |
| Tháng này so với tháng trước? | no comparison |

Why it reads badly (screenshot `yield.png`): (1) five KPI tiles + a dashed yellow notice + two grey help paragraphs (`yield-totals-strip.tsx:19-22`) before any row; (2) "Chênh lệch = ước tính − đã bán − hao hụt" is accounting jargon - for an open lot it means "còn chưa bán", for a closed lot "hao hụt chưa giải thích" (`yield-logic.ts:45` text "Còn lệch X kg so với ước tính"); (3) cage-first display shows computed fractions ("≈ 11,6 lồng", "≈ 4 lồng" for 200 kg) while the real integer `cageCount` exists on every lot but is not in the yield DTO (`harvest-yield/contracts.ts:8-13`), so cage numbers are re-derived from kg and look odd; (4) every row is "Chưa chốt" so the status column is noise; (5) group label column mixes "B1-01 · DEMO-01"; (6) no unit/legend discipline: lồng and kg both lead.

Proposed screen (keeps ManagementLayout, filters in rail, list scrolls):
```
Sản lượng nuôi        [🔍 Tìm bè/chu kỳ]                              [Xuất file] [?]
Rail: Thời gian thu hoạch [Tháng này ▸]   Gộp theo [Bè|Vùng|Chu kỳ] (pills)   Vùng nuôi [select đa chọn ▾]
─ Tóm tắt kỳ 01/11–30/11 ───────────────────────────────────────────────────────
 Đã thu 3.260 kg   Đã bán 200 kg   Còn để bán 3.060 kg   Hao hụt 0 kg   Đạt mục tiêu 38% (3.260/8.500)
─ Bảng (sắp xếp được, hàng mở ra xem lô) ─────────────────────────────────────────
 Bè / Chu kỳ │ Thả giống │ Mục tiêu │ Đã thu (kg · lồng) │ % mục tiêu │ Đã bán │ Còn để bán │ Hao hụt │ Tình trạng
 B1-01 · 02/10 │ 5.000 con │ 8.500 kg │ 580 kg · 12 lồng │ ▓░░ 7%  │ 120 │ 460 │ 0 │ Đang bán
 B2-01 ...
 ▸ mở hàng: lô | ngày | lồng | kg thu | đã bán | còn | tình trạng lô (Đang bán/Đã chốt) | link "Xem lô"
```
Rules: kg leads, lồng secondary and integer (real `cageCount` summed); "Còn để bán" replaces "Chênh lệch" (formula `Estimated − sold − lost`, same number, plain name); when a lot is Closed and difference != 0 show "Chưa giải thích X kg" chip. Rename status column to "Tình trạng" with chips only when action needed (Đang bán = còn bán, Đã chốt). Remove the two help paragraphs (AGENTS: no explanation panels) -> one `?` tooltip on the column header. Notice about open lots becomes the "Đang bán" chip.
Filters: Gộp theo = 3 fixed -> pills (`§1.3`), Vùng = list that grows -> `select` multi (currently stacked checkboxes, `yield-filter-panel.tsx:33`). Apply-button flow can stay (date draft), or auto-apply on change (S).
Backend asks (small): add `cageCount`, `seedHung`/`seedUnit`, `targetYieldKg` to `HarvestYieldLot`/`HarvestYieldGroup` (backend S-M; otherwise web N+1 over `summary` per cycle, acceptable for <=20 groups as interim). "Yield per seed" and survival rate need decision D3/D4.
Web-only part: columns, naming, KPI tiles, bars, pills/select, remove paragraphs (M).

---

## D. Pop-ups, filters, calendars that violate DESIGN_GUIDELINES

| # | Where (file:line) | Violation | Rule quoted | Fix |
|---|---|---|---|---|
| D1 | `operations/ui.tsx:37-43` `Field type="date"` -> `components/form/vietnamese-date-input.tsx` + `vietnamese-date-chooser.tsx:22` (3 text boxes, `min-h-12`, text-sm) used by cycle plan/editor/progress, seeding+material forms, zone licenses, care log, lot-tracing dialogs | old date chooser instead of the shared calendar | §1.3 "(2) Tùy chỉnh mở lịch hai tháng..."; §1.9 Lịch "Chữ nhỏ gọn (12px)... Hover một ngày phải cho thấy kết quả"; the shared single-date calendar is `management-screen/date-picker-field.tsx` ("One date picked from the same calendar as the time filter") | make `Field type="date"` render `DatePickerField` (one change, ~10 screens). S-M, web-only |
| D2 | no `useToast` anywhere in the 7 folders; page-level `notice` paragraphs (`raft-cycle-workspace.tsx:46`, `cycle-logs-tab.tsx`, `lot-tracing/cycle-records-panel.tsx:30`) | success shown as inline text | §1.10 "Bắt buộc sau mỗi thao tác ghi thành công... Đã tạo phiếu chi TT000012." | `notify({tone:'success', title:'Đã ghi nhận thu hoạch DEMO-01-B1-01-20261111-2.'})` after every create/save/cancel/finish; inline `ErrorNotice` stays for errors. M (many call sites), web-only |
| D3 | Record forms use `EditorFrame` (`cultivation-api/records-shared.tsx:26-60`, `dismissible={false}`) with a full-width "Đóng" button under the submit, no `Bỏ qua`/`Lưu` footer; fields in flat lists | not the modal pattern | §1.8 "Modal, các trường chia nhóm thu gọn được, chân modal có `Bỏ qua` và `Lưu`"; "bắt buộc cho mọi form có quá ~5 trường" CollapsibleSection | footer = `Bỏ qua` (secondary) + `Lưu` (primary) right-aligned; harvest form groups: "Làn thu hoạch", "Số lượng", "Ảnh" (collapsible). S-M |
| D4 | `harvest-detail.tsx:22` Dialog xl "Lô thu hoạch" used to EDIT a lot; `lot-tracing/{seeding,log,lot}-correction-dialog.tsx` edit dialogs; `harvest-settings.tsx:13` dialog | editing in pop-ups | §1.12 "Chỉnh sửa bản ghi hiện có ngay trong dòng đã mở, theo từng subtab... Pop-up chỉ giữ cho tạo bản ghi, xác nhận đổi trạng thái/thao tác phá hủy và bí mật chỉ hiển thị một lần" | edit in the opened lot row (`HarvestLotPreview` already open): `Chỉnh sửa` -> fields in place, footer `Bỏ qua`/`Lưu`; lot-tracing corrections: in place of the table row detail; harvest settings -> a Settings location (Owner), not a button on every raft panel. M |
| D5 | `records-harvest-panel.tsx:75-86` header buttons (Tải lại, Quy đổi & tự đóng lô, Ghi nhận thu hoạch); `records-seeding-panel.tsx:42-50,62-66`; `:185-197` "Sửa lô" button inside each lot row; `cycle-logs-tab.tsx:39` Sửa/Gỡ on rows; `lot-tracing/cycle-records-panel.tsx:121` "Sửa" per row | actions on unopened rows and in panel headers | §1.5 "Tuyệt đối không đặt nút thao tác trên dòng chưa mở."; §1.6 "Mỗi subtab có bộ action riêng, đặt ở chân subtab đó. Bên trái: action phụ... Bên phải: action chính" | move Ghi nhận/Tải lại to `TabFooter` (right = primary, left = ghost); row actions only after the row is opened. S-M |
| D6 | `records-harvest-panel.tsx:110-135` search + `FilterChecks` "Trạng thái lô" stacked checkboxes inside the raft panel (screenshot `harvest-open.png`: 2 big checkbox rows beside a wide search box) | filters inside a detail panel, vertical checkbox list for 2-3 fixed options | §1.3 "ít và cố định thì pills xếp ngang"; §1.1 filters live in the left rail | pills "Tất cả/Đang mở/Đã đóng" on one line in the panel toolbar (or drop: 2-10 lots per raft rarely need filters). S |
| D7 | `records-shared.tsx:80` raw `<input type=checkbox>` in `LaneChoices`; `harvest-detail.tsx:41` raw checkboxes; `lot-tracing/photo-keeper.tsx:17`; browser-default file input "Choose Files No file chosen" (`harvest-form.png`) | unstyled controls | §1.9 "Ô tích và radio dùng chung cỡ 16px, màu chủ đạo... dùng class `omts-check`"; "Bật/tắt dùng `Switch`" | `LaneChoices` -> lane rows with `omts-check`; "Thu xong" -> `Switch`; file picker -> styled button + chip list with remove. S |
| D8 | `yield-filter-panel.tsx:27,33` radios (17px) + stacked zone checkboxes | list that grows rendered as checkboxes; fixed 3 options as vertical radios | §1.3 "trên 5 phương án hoặc danh sách có thể tăng trong tương lai thì dùng select; ít và cố định thì pills xếp ngang" | Gộp theo = pills; Vùng = multi-select `SelectBox`/checkbox dropdown. S |
| D9 | `cycle-progress-tab.tsx:26-29` toolbar: Select "Chu kỳ" + date field + button "Xem tiến độ"; `cultivation-api/progress.tsx`, `cultivation-progress.tsx` same pattern | extra apply step, calendar via D1, lays out as a form in the panel | §1.2 compactness; §1.3 date pattern | auto-apply on change; mốc nhanh (Hôm nay/Hôm qua) + DatePickerField; hide when cycle selected. S |
| D10 | `cycles-api/cycle-editor.tsx:16` "Mở chu kỳ" Dialog: 4 flat fields, no sections, no units, no hints | form > ~5 fields rule is borderline but plan numbers have no unit | §1.8 sections + `description` line | 2 sections: "Thời gian" (start, expected harvest date), "Kế hoạch" (giống dự kiến [con], sản lượng mục tiêu [kg]) with helper "Không bắt buộc. Dùng để so sánh khi thu hoạch." Creating is allowed as a modal (§1.12). S |
| D11 | `yield-table.tsx:21` text glyph `▸/▾`, sort `▲▼` | different expand/sort icons from the other lists | §1.9 "cột nút mở dòng căn giữa theo cùng một trục"; shared `SortableHeader`/`expandCell` | reuse `SortableHeader` + `InterfaceIcon chevron`. S |
| D12 | explanation paragraphs: `records-harvest-panel.tsx:249-252`, `records-harvest-form.tsx:130-133`, `yield-totals-strip.tsx:19-22`, `harvest-settings.tsx:13`, `cultivation-progress.tsx` subtitles | explanatory/developer-style copy in production UI | AGENTS "Treat implemented screens as production UI. Do not add developer explanation panels"; §1.2 "Không có câu mô tả" | delete; keep only field-level helper text and `?` tooltip. S |
| D13 | `zones-api/zone-map-tab.tsx`, `farming-api/vietmap-view.tsx:76` inline "Toàn cảnh" overlay | fine, but picker overlay inside a modal dialog must stay inside the dialog | §1.9 "trong `<dialog>` modal thì mở bên trong chính dialog đó" (select rule, same top-layer logic) | picker keeps overlay in place (already done). verify only |
| D14 | `cycle-work-plan-preview.tsx` (mock, unused) | fake plan UI | §2 "Không dựng nút, cột, số liệu giả cho chức năng chưa có dữ liệu thật." | delete file (decision D5 backend report). S |

Not violations (checked): zone/raft/cycles lists already use `ManagementLayout` rail + pagination + pills; time filter on yield uses `TimeRangeFilter`.

---

## E. Coordinate picker (zone / raft latitude, longitude)

State of the tree: committed code still has typed `Vĩ độ`/`Kinh độ` (`zones-api/zone-model.ts:67`, `rafts-api/raft-model.ts:64-68`). The working tree (uncommitted) already adds `farming-api/location-picker.tsx` + `location-picker-map.tsx` + `location-picker-model.ts` (+ test) and uses it in `zone-form-fields.tsx` / `raft-form-fields.tsx`: click/drag red marker, arrow-key nudge (Shift x10), "Dùng vị trí hiện tại của tôi", "Xóa vị trí", "Toàn cảnh" overlay, context pins (zone + sibling rafts), caption "Vĩ độ … · Kinh độ …" (read-only text). VietMap GL 6.0.1 + `NEXT_PUBLIC_VIETMAP_API_KEY` already in the project. Good base. What is still missing vs the owner's request ("pick on map, know the address, coordinates not typed"):

1. **Reverse address**: after a pick, call reverse geocoding and offer to fill `Vị trí` (zone: required text; raft: optional): chip "Điền địa chỉ: Xã X, huyện Y" with `Dùng`/`Bỏ`. Do it through a BFF route (e.g. `/api/zone-map/reverse?lat&lng`, rate-limited, key stays server-side) - there is already `src/app/api/zone-map`. VietMap reverse/autocomplete endpoints must be confirmed in VietMap docs before coding (not verified here). Failure is silent (user can type the text). Web-only + 1 BFF route, S-M.
2. **Search box on the map** ("Tìm địa danh/địa chỉ") -> fly to result, then click to place. Same BFF (autocomplete). M, optional.
3. **Read-only coordinates**: show as muted text with copy button under the map (exists as caption); never an input. Keep hidden `latitude`/`longitude` in the draft. Done mostly.
4. **Default center**: zone = last known zone/HTX centroid or current geolocation; raft = its zone pin, with the zone pin drawn and a live distance "Cách vùng 320 m". Warn (not block) when > 5 km (backend P6c) and for swapped/0,0 (backend P6a/d). Distance calc is web-only (haversine, pure function + test).
5. **No-key / map-failure fallback**: `location-picker-map.tsx:80` shows only "Bản đồ chưa được cấu hình nên chưa thể chọn vị trí." and `validateRaftDraft` (`raft-model.ts:64-68`) still REQUIRES lat/lng -> a missing/blocked VietMap key makes creating a raft impossible. Backend says raft coordinates are an optional pair (backend report table, "Raft": lat/lng optional pair). Make raft coordinates optional (remove required check + body null) and add a collapsed "Nhập tọa độ thủ công" disclosure as last resort (zone needs it: required by backend).
6. **Where it appears**: create dialog (Tọa độ/"Vị trí và tình trạng" section), edit-in-place (zone-info/raft-info), and the Bản đồ tab. Keep one component. In the create modal, map height <= 320 px so the footer `Bỏ qua`/`Lưu` stays visible at 1024x700.
7. a11y/states: loading skeleton, error with retry, keyboard nudge hint (exists), 360 px: map full width, buttons wrap.
Effort: S for items 3,5; S-M for 1; M for 2. Priority P1 (user-visible, blocks real data entry).

---

## F. Bulk-fix list (numbered; Pn = priority, 0 = blocks the owner's flow)

Format: Screen | Wrong | Rule | Proposed UX | Needs from backend | Web-only? | Effort | Pri.

**F1. Cycle page has no flow** | Four raft lists + tabs; no stepper/next action (`cycle-detail-panel.tsx:21`, `cycle-progress-tab.tsx:45` footer links only Thả giống + Vật tư, no Thu hoạch) | §1.6 subtabs per task; owner complaint | "Hành trình" tab per section A | none (all reads exist) | Web-only | L | P0

**F2. No "Tổng kết / Kết thúc chu kỳ"** | `summary`, `close/preview`, `close` unwired; owner cannot close | feature missing (SRS CYCLE-06) | step 5 of the journey: summary card (seedHung vs expected, kgHarvested vs target, lastHarvestDate vs expected, `notHarvestedLanes`) + confirm dialog with assessment text, early-close reason + owner-approval flag per `CycleClosePreview` | exists (`/summary`, `/close/preview`, `/close`, `ownerApproved`) | Web (BFF + UI) | L | P0

**F3. Plan never compared to actual** | `cycle-plan-tab.tsx:57-59` Facts only; `cycle-plan-tracking.tsx:11` tracks lane count only | §2 meaningful data; owner complaint | progress bars on step headers and in plan tab: giống thả/dự kiến, kg thu/mục tiêu, ngày dự kiến còn lại; warn over plan | `summary` exists; unit for `expectedSeedQuantity` missing (backend P7) | Web-only | M | P0

**F4. Harvest lane chooser lacks state** | `records-contracts.ts:14` drops `state`; `LaneChoices` (`records-shared.tsx:63-94`) = bare checkboxes | §1.9 controls; owner complaint | section B rule 1-2 | none (`State` already returned) | Web-only | S | P0

**F5. Finish harvest needs lot edit** | finish only via form block `records-harvest-form.tsx:96-107` or `harvest-detail.tsx:41` correction with reason | owner complaint; §1.6 primary action | per-row "Hoàn tất thu hoạch" + confirm + toast; interim: Switch in the lane row of the trip form | NEW endpoint finish-harvest (backend report P1/D7) | Interim web-only; target needs backend | M | P0

**F6. Nothing constrains harvest vs seed/plan** | `harvestValues` (`records-contracts.ts:20`) checks positivity only; backend also only `>0` | owner complaint | inline warning under kg ("vượt mục tiêu"), then render backend `409 confirmOverBudget` as confirm + reason; hard errors inline (§1.10) | backend D1-D3, D8 (budget needs g/piece + mortality) | Warn-only part web-only; enforcement needs backend | M | P0

**F7. Cages <-> kg not computed** | only a text hint `records-harvest-form.tsx:34,123` | owner complaint | two-way auto-fill (section B rule 6) | `averageKgPerCage` exists | Web-only | S | P0

**F8. Sản lượng nuôi unreadable** | `yield-totals-strip.tsx:19-22`, `yield-table.tsx:12`, `yield-logic.ts:45` | §2 clarity; AGENTS no explanation panels | section C | `cageCount`, `seedHung`, `targetYieldKg` on yield DTO (S-M backend); survival/yield per seed needs D3/D4 | Web part web-only (interim N+1 on `summary`) | M | P0

**F9. Lot table & totals confusing + row buttons** | `records-harvest-panel.tsx:139-146` "Đã lập hóa đơn/Còn lại", `:185-197` "Sửa lô" on row, `:219-245` totals strip | §1.5 no row actions | rename (Đã bán / Còn để bán), edit in opened row, totals as header KPIs | none | Web-only | S-M | P1

**F10. Edits in pop-ups** | `harvest-detail.tsx:22`, lot-tracing correction dialogs, `harvest-settings.tsx:13` | §1.12 | in-place edit in opened row; settings moved | none | Web-only | M | P1

**F11. Seeding form: lot picker without remaining, no unit, no plan compare** | `records-seeding-form.tsx:113-132`; `seedLots` contract already has `quantityReceived/quantitySeeded` (`records-contracts.ts:5`) but option label ignores them | §2 | option label "VT001 · Giống hàu · còn ~15.000 con (nhập 20.000, đã thả 5.000)"; unit suffix on quantity; hint "Đã thả 5.000 / dự kiến 250" | optional `stockOnHand` (backend P8) | Web-only | S | P1

**F12. Seeding complete is a buried banner + dialog** | `records-seeding-panel.tsx:56-67`, `records-complete-seeding-dialog.tsx` | §1.6 | step action "Hoàn tất thả giống" (confirm + toast); show unseeded lanes in the confirm | allow-0-lane check (backend P9) | Web-only | S | P1

**F13. Toasts missing** | see D2 | §1.10 | `useToast` after each write | none | Web-only | M | P1

**F14. Date input old chooser** | see D1 | §1.3/1.9 | swap to `DatePickerField` | none | Web-only | S-M | P1

**F15. Modal pattern (footer, sections)** | see D3, D10 | §1.8 | footer `Bỏ qua`/`Lưu`, `CollapsibleSection`s | none | Web-only | S-M | P1

**F16. Action buttons in headers/rows** | see D5 | §1.5, §1.6 | `TabFooter` | none | Web-only | S-M | P1

**F17. Controls not matching kit** | see D6-D8 | §1.3, §1.9 | pills/select/omts-check/Switch/file chips | none | Web-only | S | P2

**F18. Coordinates by map** | section E | owner complaint | extend WIP picker (reverse address, optional raft coords, fallback) | none (backend P6 warnings optional) | Web (+1 BFF) | M | P1

**F19. Raft coordinates still required** | `raft-model.ts:64-68` | backend: optional pair; blocks creation when map unavailable | optional | none | Web-only | S | P1

**F20. Dead/mock code** | `cycles-api/cycle-work-plan-preview.tsx` (unused), `cultivation-api/screen.tsx` + `progress.tsx` + `cultivation-progress.tsx`(legacy CyclesScreen UI; `CyclesScreen` real one is in `cycles-api`), `farming-api/license-screen.tsx`/`zone-map-dialog.tsx` (no importer found) | §2; AGENTS production UI | delete after confirming with grep + tests | none | Web-only | S | P2

**F21. Terminology/unit inconsistency** | lot-tracing says "Luống" and hard-codes "dây" (`lot-tracing/cycle-records-panel.tsx:49,52,66`) while the app says "làn" and seed unit is `con`/lot unit; harvest says "lồng" | consistency | one glossary: làn, lồng, con (use `seedLot.unit`), "Còn để bán"; apply across screens | none | Web-only | S | P1

**F22. "Ngày xem" progress toolbar** | D9 | §1.3 | auto-apply | none | Web-only | S | P2

**F23. Manual lot close not found in web** | backend has `POST /api/harvest-lots/{id}/close` + leftover kg; web has only auto-close settings (`cultivation-plan.ts` has no close action) | feature gap | "Chốt lô" in opened lot row: leftover kg + reason (confirm) - verify with owner whether sales module already covers it | exists | Web | M | P2 (verify)

**F24. Yield expand/sort glyphs, filters** | D8, D11 | §1.3/1.9 | reuse shared parts | none | Web-only | S | P2

**F25. Cycle start dialog hints/units** | D10 | §1.8 | helper text, units | `unit` for expectedSeedQuantity (backend P7) | Web-only | S | P2

**F26. Harvest link missing from cycle progress footer** | `cycle-progress-tab.tsx:45` | flow | covered by F1 | none | Web-only | S | P1

**F27. Nav/IA** | Chu kỳ/Thả giống/Vật tư/Thu hoạch are sibling tabs, Sản lượng nuôi/Truy xuất elsewhere (Báo cáo) | IA | keep, but each deep-links to the journey; add "Hành trình" as the cycle default | none | Web-only | S | P2

---

## G. Suggested delivery order (so the owner sees value early)
1. F4 + F7 + F5-interim (lane chips, auto-calc, Switch in lane row) - 1 day, web-only.
2. F2/F3 (wire summary/close) -> F1 journey page - 3-4 days.
3. F8 (yield redesign, interim N+1) - 1-2 days; backend adds cage/seed/target fields later.
4. D1/D2/D3/D5 platform fixes (date picker swap, toasts, modal footer, action placement) - 2 days, touches many files, do as one PR per rule.
5. F18/F19 picker completion - 1 day.
6. Backend-dependent: finish-lane endpoint, over-budget rules (backend report P1, P3).
Each of 1-5 is web-only and independent of backend decisions.

---

## H. Decisions needed from the owner (with recommendation)

1. **Is the cycle page ("Hành trình") the new home for farming work?** Recommend YES; keep the four nav tabs as shortcuts.
2. **Harvest vs seed: block or warn?** (backend D1/D2) Recommend warn with reason at +10% over, hard stop only at +50%; web shows warnings from day 1 using target kg.
3. **What is "5000" in your example - con, lồng, or kg?** Needed to pick the field the cap applies to. Recommend cap on kg using g/con + mortality set by the owner (D3).
4. **Is there a "kế hoạch thu" as a real thing?** SRS v8 removed it. Recommend: plan = the 3 cycle numbers (giống, ngày thu, mục tiêu kg) shown as bars; no separate harvest-plan entity; delete the mock.
5. **"Thu xong làn" as its own button** (backend D7). Recommend YES, flag on latest lot lane, undo only through lot correction.
6. **Close cycle in web: who may do it?** Recommend Owner direct; Zone Manager early close with owner-approval flag (as backend `CycleClosePreview.needsOwnerApproval`).
7. **Sản lượng nuôi: kg-first or lồng-first?** Recommend kg first (sales are by kg), lồng integer second.
8. **Raft coordinates optional?** Recommend yes (backend already optional); zone coordinates stay required.
9. **Address auto-fill from the map** uses a VietMap service (quota). Recommend yes via server proxy.
10. **Weight per oyster, expected mortality** (to compute yield/survival) - owner to give numbers or choose "implied survival only" (D4).

## Unresolved questions
1. Exact VietMap reverse/autocomplete endpoints, quota, key restrictions (not verified; read VietMap docs before coding).
2. Does the owner count harvest in whole lồng only? (decides rounding in yield and form helper).
3. Should `Hoàn tất thu hoạch` also notify (MSG-CYCLE-08 reminder) or stay silent? (backend report Q6).
4. Who sees over-plan warnings: Owner only or Zone Manager too?
5. Dead-code candidates in F20 need a final grep against tests before deletion (several have `*.test.tsx` neighbours).
6. Cycle plan unit for `expectedSeedQuantity` (con? dây?) - backend does not store one; shown units are assumptions until D3.
7. Was the "lane 1 shows after finishing" the owner saw really a BeingHarvested lane (correct by SRS) or a stale list after saving? (list reload happens via `remote.reload()` after save; could not reproduce a Harvested lane being offered in the live demo.)
