# Hợp đồng API ươm giống (B1), ngày 12/11/2026

Nguồn: `FARMING_NURSERY_STEP_SPEC_2026-11-12.md` (mục 2-7, 10) cộng quyết định chủ dự án đợt cuối: **đợt ươm đã hoàn tất không hủy được** (chỉ "Đang ươm" mới sửa/hủy); Quản lý vùng ghi ươm hoặc sửa thì **thông báo chủ**; dùng quyền thả giống sẵn có (`CultivationCycles`) và mã thông báo chung.
Nhánh backend: `feature/OMTS-132-nursery`. Mọi đường dẫn có tiền tố `/api`. JSON camelCase, ngày `yyyy-MM-dd`, số là number, enum là chuỗi, `rowVersion` là chuỗi base64. Lỗi theo dạng problem hiện có (`status`, `code`, `message`, các trường chi tiết nằm ngang hàng, ví dụ `field`, `hint`, `reasonCode`).

## 0. V2 (13/11/2026): THAY THẾ phân bổ bè bằng kho ươm. ĐỌC MỤC NÀY TRƯỚC

Nguồn: `FARMING_NURSERY_MODEL_V2_2026-11-13.md`. Mục 0 **thay thế** mọi chỗ còn lại của tài liệu nói về `allocations`, tạo chu kỳ lúc hoàn tất ươm, chuyển phần chia (4.7, 4.9, 4.11, 3.4, 3.6, 3.7 và các đoạn 13/11 trong mục 5/6). Phần còn lại (bắt đầu ươm, sửa, hủy, lịch sử, lô giống, quyền) giữ nguyên. Mọi chuỗi tiếng Việt trong `message` dùng thẳng được.

### 0.1 Trạng thái và số liệu kho ươm

| `statusId` | `status` (danh mục) | `statusLabel` | Ý nghĩa |
|---|---|---|---|
| 4001 | `Nursing` | Đang ươm | còn sửa/hủy/hoàn tất |
| 4002 | `Completed` | **Đã ươm xong** (trước: Đã hoàn tất) | kho ươm sẵn sàng thả dần |
| 4003 | `Cancelled` | Đã hủy | |
| 4004 | `Closed` | **Đã đóng** (mới) | đã đóng, phần dư ghi là hao hụt |

Chuyển trạng thái: 4001 → 4002 (hoàn tất) hoặc 4003 (hủy); 4002 → 4004 (đóng đợt). Không có đường lui. Đợt 4002 **không** hủy/xóa được.
Số liệu (trên danh sách `items[]` và chi tiết, đều là số mảnh, `null` khi chưa áp dụng):
- `survivors`: sống sót ước tính (4002/4004).
- `seeded`: tổng số mảnh đã thả từ đợt này qua **mọi chu kỳ/bè** (trừ bản ghi đã xóa). `0` khi chưa thả; `null` khi 4001/4003.
- `remaining`: `survivors − seeded` khi **4002**; `0` khi 4004; `null` khi 4001/4003.
- `closedOn` (ngày), `closeLossPieces`: có khi 4004 (`closeLossPieces` = `remaining` lúc đóng, ước tính).
- `lossPieces` (hao hụt ước tính, luôn `estimated: true`) = `quantityIn − survivors + (closeLossPieces ?? 0)`; `lossPercent` = `lossPieces / quantityIn` (1 số thập phân). `null` khi 4001/4003.
- **Đã bỏ**: `allocations` (chi tiết), `allocationCount` (danh sách), cờ phân bổ. Thêm cờ `canClose` (chi tiết): 4002, `remaining > 0`, người gọi có quyền Edit trong vùng.
- Chi tiết thêm `usage` (các bè/chu kỳ đang lấy giống từ đợt này, bè nhiều nhất trước):
```json
"usage": [ { "cycleId": "…", "cycleStartDate": "2026-11-13", "cycleStatus": "Open", "raftId": "…", "raftCode": "B1-11", "seeded": 3000, "lastSeedingOn": "2026-11-13" } ]
```
  (`cycleCode` không có: chu kỳ không có mã nghiệp vụ; dùng `raftCode` + `cycleStartDate`.) Chỉ liệt kê chu kỳ có ít nhất một bản ghi thả từ đợt; `seeded` là phần riêng của chu kỳ đó.
- Danh sách: `GET /api/nursery-batches?status=` nhận thêm `closed`; `completed` = chỉ 4002. `summary`: `completedQuantityIn`/`completedCount` tính **cả 4002 và 4004** (đã ươm xong), thêm `closedCount`, `remaining` (tổng `remaining` các đợt 4002).

### 0.2 Hoàn tất ươm (không phân bổ, không tạo chu kỳ)
`POST /api/nursery-batches/{id}/complete` — `multipart/form-data`, quyền Create. Trường: `survivors` (0 → số vào), `completedOn` (mặc định hôm nay, không trước ngày bắt đầu, không sau hôm nay), `rowVersion` (bắt buộc), `photos` lặp 1-3. **Không** có `allocations`/`targetYieldKg` (trường gửi thừa bị bỏ qua).
200:
```json
{ "batch": { "id": "…", "code": "NU000002", "statusId": 4002, "status": "Completed", "statusLabel": "Đã ươm xong", "quantityIn": 10000, "survivors": 9500,
             "seeded": 0, "remaining": 9500, "lossPieces": 500, "lossPercent": 5.0, "estimated": true, "closedOn": null, "closeLossPieces": null,
             "usage": [], "canClose": true, "canCorrectSurvivors": true, "…": "các trường như chi tiết 4.3 trừ allocations" },
  "message": "Nursery batch saved.", "messageCode": "MSG-GEN-05" }
```
Lỗi: 400 `MSG-GEN-01` (`Survivors`, `Completed on`, `Photos`), 409 `NURSERY_NOT_NURSING`, 409 `MSG06`. `survivors = 0` được: đợt sang 4002 với `remaining = 0` (không có gì để thả; vẫn đóng được bằng cách… không cần đóng, `canClose = false`).

### 0.3 Sửa số sống sót (4002)
`POST /api/nursery-batches/{id}/survivors` JSON `{ "survivors": 9200, "reason": "Đếm lại", "rowVersion": "…" }` (`allocations` bị bỏ qua). Không nhỏ hơn `seeded` (409 `NURSERY_SURVIVORS_BELOW_SEEDED`, kèm `seeded`), không lớn hơn `quantityIn` (400 `Survivors`). Lịch sử ghi cũ → mới + lý do. 200 `NurseryBatchSaved`. Gửi đúng số cũ: 200, không ghi gì. Quản lý vùng sửa thì báo chủ.

### 0.4 Đóng đợt ươm
`POST /api/nursery-batches/{id}/close` JSON `{ "reason": "Hết nhu cầu thả" /* tùy chọn, ≤ 1000 */, "rowVersion": "…" }`, quyền Edit. Chỉ khi 4002 và `remaining > 0`. 200 `NurseryBatchSaved`: `statusId` 4004, `statusLabel` "Đã đóng", `closedOn` = hôm nay, `closeLossPieces` = `remaining` lúc đóng, `remaining` = 0. Quản lý vùng đóng thì **báo chủ** (`NURSERY_RECORDED`). Lỗi: 409 `NURSERY_NOT_COMPLETED` (không phải 4002), 409 `NURSERY_NOTHING_TO_CLOSE` (`remaining = 0`), 409 `MSG06`. Lịch sử có hành động `Closed` ("Đóng đợt ươm").

### 0.5 Bỏ chuyển phân bổ
`POST /api/nursery-batches/{id}/allocations` → **410 Gone** (`reasonCode: NURSERY_ALLOCATIONS_REMOVED`). Xóa khỏi web.

### 0.6 Đợt ươm sẵn sàng để chọn (form bắt đầu chu kỳ)
`GET /api/nursery-batches/available?zoneId={zoneId}` (quyền View; `zoneId` tùy chọn, không có thì mọi vùng được xem). Chỉ đợt **4002** có `remaining > 0`, mới hoàn tất trước:
```json
{ "batches": [ { "id": "…", "code": "NU000002", "zoneId": "…", "zoneCode": "DEMO-01", "seedLotCode": "PN000123-1", "itemName": "Hàu giống", "unit": "mảnh",
                 "quantityIn": 10000, "survivors": 9500, "seeded": 3000, "remaining": 6500, "completedOn": "2026-11-12" } ] }
```
Nhãn gợi ý: `"{code} · {itemName} · còn {remaining} mảnh đã ươm"`.

### 0.7 Bắt đầu chu kỳ nuôi (thủ công, bắt buộc đợt ươm)
`POST /api/cultivation-cycles` — `multipart/form-data`, quyền Create trong vùng của bè (cũng nhận `POST /api/rafts/{raftId}/cultivation-cycles`, khi đó `raftId` lấy từ đường dẫn). Trường:
`raftId` (guid), `nurseryBatchId` (guid, **bắt buộc**), `targetYieldKg` (**bắt buộc**, > 0, 2 chữ số thập phân; sản lượng dự kiến tổng), `startDate` (`yyyy-MM-dd`, mặc định hôm nay; không sau hôm nay, sau ngày chốt chu kỳ trước của bè), `note` (≤ 1000, tùy chọn), `photos` lặp **1-3** (ảnh kế hoạch, JPEG/PNG ≤ 10 MB). Không còn `expectedSeedQuantity`/`expectedHarvestDate`.
201:
```json
{ "cycle": { "id": "…", "raftId": "…", "raftCode": "B1-11", "startDate": "2026-11-13", "targetYieldKg": 2000, "note": null,
             "statusId": 601, "status": "Open", "canEdit": true, "canCancel": true, "canChangeNursery": true, "rowVersion": "…",
             "nurseryBatchId": "…", "nurseryCode": "NU000002", "nurseryRemaining": 9500, "nurserySeeded": 0,
             "seedLot": { "id": "…", "code": "PN000123-1", "receiptId": "…", "receiptCode": "PN000123", "receivedDate": "2026-11-10", "itemId": "…", "itemCode": "GI000001", "itemName": "Hàu giống", "unit": "mảnh", "supplierId": "…", "supplierName": "Cơ sở giống A" },
             "planPhotos": [ { "id": "…", "sortOrder": 1, "url": "…" } ], "…": "các trường CycleView khác" },
  "previousCloseDate": null, "lanes": [ /* LaneView của bè */ ], "message": "Cultivation cycle saved.", "messageCode": "MSG-GEN-05" }
```
Lỗi: 400 `MSG-GEN-01` (`Nursery batch`, `Target yield`, `Start date`, `Note`, `Photos`, `Raft`); 404 (bè/đợt không thấy); 403; 409 `MSG-GEN-06` bè đang có chu kỳ mở (đường cũ, kèm `cycleId`); 409 `MSG-GEN-09` + `reasonCode`: `NURSERY_NOT_COMPLETED` (đợt không ở 4002), `NURSERY_RAFT_OTHER_ZONE`, `NURSERY_POOL_EMPTY` (`remaining = 0`), bè không dùng/ngừng; 409 `MSG06`; 502 `MSG-GEN-03` upload. Không có chu kỳ nào tạo ra ngoài đường này (đường chọn lô giống từ vật tư **đóng hẳn**; `CYCLE_REQUIRES_NURSERY` và cấu hình `Cultivation:AllowManualStart` đã bỏ).

### 0.8 Sửa chu kỳ
`PUT /api/cultivation-cycles/{id}` JSON (chu kỳ đang mở, bè/vùng đang dùng):
```json
{ "startDate": "2026-11-12", "targetYieldKg": 2200, "note": "Đổi kế hoạch", "nurseryBatchId": "…", "rowVersion": "…" }
```
Chu kỳ có đợt ươm: trường **bỏ trống/null = giữ nguyên** (gửi `note: ""` để xóa ghi chú); `targetYieldKg` > 0; `startDate` kiểm như bắt đầu và không sau ngày bản ghi đầu tiên của chu kỳ. `nurseryBatchId` **khác** đợt hiện tại chỉ được khi chu kỳ **chưa có bản ghi thả giống**: nếu đã có → 409 `MSG-GEN-09` `reasonCode: CYCLE_SEED_LOCKED`; đợt mới phải 4002, cùng vùng, `remaining > 0` (cùng mã lỗi mục 0.7). Gửi đúng đợt hiện tại là không đổi. 200 `{ "cycle": <CycleView>, "message", "messageCode" }`. Ảnh kế hoạch sửa ở `PUT /api/cultivation-cycles/{id}/plan-photos` như cũ (nay áp cho mọi chu kỳ; bỏ lỗi `PLAN_PHOTOS_FROM_NURSERY`).
Chu kỳ **cũ không qua ươm** (`nurseryBatchId = null`): đọc, thu hoạch, đóng, sửa như trước (sửa theo luật cũ: `expectedSeedQuantity`, `targetYieldKg`, `startDate`; có thể gán đợt ươm nếu chưa thả).

### 0.9 Đọc chu kỳ (mọi chỗ có `CycleView`: `GET /api/cultivation-cycles/{id}`, `GET /api/rafts/{raftId}/progress`, bắt đầu/sửa)
Trường mới/đổi: `note`, `nurseryBatchId`, `nurseryCode`, **`nurseryRemaining`** (kho ươm còn lại của đợt, **mọi bè**), **`nurserySeeded`** (đã thả **riêng chu kỳ này**), **`seedLot`** (`SeedLotRef` của lô giống gốc của đợt, chỉ đọc), `canChangeNursery` (đang mở và chưa có bản ghi thả), `planPhotos` (ảnh kế hoạch của chính chu kỳ; chu kỳ cũ không có ảnh kế hoạch mà có đợt thì hiện ảnh hoàn tất của đợt và `planPhotosFromNursery: true`). **Bỏ** `nurseryAllocated`. `expectedSeedQuantity` chỉ còn giá trị ở chu kỳ cũ (`null` chu kỳ mới). Không có `expectedHarvestDate`. `CycleListItem` có `nurseryBatchId`.

### 0.10 Thả giống (đường hiện có)
`POST /api/cultivation-cycles/{cycleId}/seeding-records` — `multipart/form-data`, quyền Create. Trường: `seedingDate` (`yyyy-MM-dd`; không trước ngày bắt đầu chu kỳ, không sau hôm nay), **`quantity`** (**bắt buộc**, > 0, tối đa 3 số thập phân; **số mảnh lấy hôm nay**, chọn tự do), `laneNumbers` (lặp; mỗi làn một phần), `lanePercents` (một trường JSON `{"1":60,"2":100}`, mặc định 100, cộng dồn ≤ 100 mỗi làn; **độc lập với `quantity`**), `photos` lặp **1-3**. **Không gửi `seedLotId`** (gửi cũng bỏ qua): lô lấy từ đợt ươm của chu kỳ. Không còn `quantity` bỏ trống/phải bằng phần còn lại.
Chặn thêm: `quantity > remaining` của **đợt ươm** (cộng mọi bè) → **409** `MSG-GEN-09`, `reasonCode: NURSERY_POOL_EXCEEDED`, `field: "Quantity"`, `remaining`, `quantity`, `seeded`, `survivors`, `message` tiếng Việt ("Kho ươm NU… chỉ còn X mảnh, không thể thả Y mảnh."); chu kỳ đã đóng 409 `MSG-GEN-09`; chu kỳ đã hoàn tất thả giống: làn không thả được (400 `Lanes`); làn đầy 100%: 400 `LanePercent` (`remainingPercent`); thiếu ảnh 400 `Photos`. Không động tới sổ kho (đã trừ lúc bắt đầu ươm). `issueId` luôn `null`.
201 `{ "record": <SeedingRecordView>, "offerMarkComplete": bool, "cycleRowVersion": "…", "message", "messageCode" }`; `record.seedLot` là lô của đợt ươm.
Sửa `PUT /api/seeding-records/{id}` (multipart, `reason` + `rowVersion` như cũ) và xóa `POST /api/seeding-records/{id}/remove`: với bản ghi từ ươm, **số mảnh của đợt được trả/lấy theo chênh lệch** (xóa trả cả bản ghi); `quantity` mới vẫn không vượt `remaining + số cũ của bản ghi` (409 `NURSERY_POOL_EXCEEDED`); **bị chặn (409 `MSG-GEN-09`, `reasonCode: SEEDING_COMPLETED`)** khi chu kỳ đã hoàn tất thả giống. Đợt ươm đã đóng (4004) không chặn sửa/xóa bản ghi cũ nhưng không cho tăng quá `remaining` (= 0) cộng số cũ.

### 0.11 Màn Thả giống: `GET /api/cultivation-cycles/{cycleId}/seeding-records`
Có sẵn (giữ): `lanes[]` (`laneNumber`, `canSeed`, `seededPercent`, `state`…), `records[]`, `laneCount`, `seededCount`, `notSeededLanes`, `seedingCompletedOn`, `canRecord`, `canMarkComplete`, `cycleRowVersion`. Thêm/đổi:
```json
{ "nurseryBatchId": "…", "nurseryCode": "NU000002", "nurseryRemaining": 6500, "nurserySeeded": 3000,
  "seedLot": { "id": "…", "code": "PN000123-1", "itemName": "Hàu giống", "unit": "mảnh", "…": "SeedLotRef" },
  "seedableLaneNumbers": [ 6, 7, 8, 9 ],
  "lanes": [ { "laneNumber": 1, "seededPercent": 100, "canSeed": true, "remainingPercent": 0, "…": "…" } ] }
```
- `seedableLaneNumbers`: làn **có thể chọn ở lần thả tiếp theo** = `canSeed` và `seededPercent < 100` (làn 100% **ẩn** khỏi danh sách chọn nhưng vẫn có trong `lanes[]` để vẽ sơ đồ tổng quan). `remainingPercent` = `100 − seededPercent`.
- `plannedSeedQuantity`/`percent` là `null` ở chu kỳ có đợt ươm; `nurseryAllocated` đã bỏ; chu kỳ chưa hoàn tất `canRecord = true` khi chưa hoàn tất thả giống.
- Dòng chỉ đọc đầu form: `"Giống: {nurseryCode} · {seedLot.itemName} · kho ươm còn {nurseryRemaining} mảnh"`.
- Hoàn tất thả giống (`POST …/seeding-complete`) như cũ: nút hiện khi `seededCount ≥ 1` hoặc đã có bản ghi; không cần 100% làn.

### 0.12 Tổng kết chu kỳ, xem trước chốt, `GET /api/harvest-yield`
Khối `nursery` (summary/close preview): `{ "batchId", "batchCode", "quantityIn", "survivors", "lossPieces", "lossPercent", "estimated": true }`. **Quyết định**: một đợt có thể nuôi nhiều bè nên số liệu hao hụt của đợt **chia theo tỉ lệ số mảnh đã thả của chu kỳ**: `share = seeded(cycle) / seeded(batch)`; `quantityIn` = `quantityIn(batch) × share`, `survivors` = `survivors(batch) × share`, `lossPieces` = hao hụt toàn đợt (gồm cả `closeLossPieces`) × `share`; `lossPercent` của **cả đợt**. Chu kỳ chưa thả gì: `share = 0` (các số 0). `harvest-yield`: `nurseryQuantityIn`/`nurserySurvivors`/`nurseryLossPieces`/`nurseryLossPercent` cộng các `nursery` của chu kỳ trong nhóm, như cũ. Đều là ước tính.

### 0.13 Mã `reasonCode` mới/đổi
`NURSERY_POOL_EXCEEDED` (409), `NURSERY_POOL_EMPTY` (409), `NURSERY_NOTHING_TO_CLOSE` (409), `NURSERY_ALLOCATIONS_REMOVED` (410), `CYCLE_SEED_LOCKED` (409), `SEEDING_COMPLETED` (409). **Bỏ**: `NURSERY_SEEDING_MUST_USE_FULL_ALLOCATION`, `NURSERY_SEEDING_ALREADY_COMPLETE`, `NURSERY_SEEDING_ABOVE_ALLOCATION`, `NURSERY_ALLOCATION_BELOW_SEEDED`, `NURSERY_ALLOCATION_FROZEN`, `NURSERY_CYCLE_STARTS_BEFORE_CLOSE`, `CYCLE_REQUIRES_NURSERY`, `PLAN_PHOTOS_FROM_NURSERY`. Giữ: `NURSERY_NOT_NURSING`, `NURSERY_NOT_COMPLETED`, `NURSERY_RAFT_OTHER_ZONE`, `NURSERY_SURVIVORS_BELOW_SEEDED`. Hành động lịch sử đợt ươm: `Created`, `Edited`, `Cancelled`, `Completed`, `SurvivorsCorrected`, **`Closed`** (bỏ `AllocationsChanged` ở sự kiện mới; sự kiện cũ vẫn đọc được).

### 0.14 Dữ liệu demo (DEMO-01) sau khi áp dụng V2
2 đợt ươm 4002 sẵn sàng thả (sống sót 9.500 và 6.000; hai lô giống khác nhau; chưa thả), 1 đợt 4001 đang ươm (3.500 mảnh), ≥ 5 bè trống đang dùng có làn (B1-08, B1-11 … B1-14, 12-24 làn), 4 đơn mua đã chấp nhận còn mở thu hoạch (800/1.500/2.000 kg và đơn 5 lồng). Chu kỳ demo cũ không qua ươm có thể còn; vẫn đọc được.

### 0.15 Loại hàu của chu kỳ (B6, 13/11/2026): chu kỳ mang SẢN PHẨM nuôi, thu hoạch phải khớp đơn mua
Quyết định chủ: chu kỳ nuôi một loại sản phẩm bán (danh mục Sản phẩm: "Hàu múp", "Hàu gầy 3cm"…); lô thu hoạch chỉ gắn được với đơn mua **cùng sản phẩm**. Lô giống (ví dụ "Hàu giống") **không phải** sản phẩm bán. Cột mới `CultivationCycles.ProductId` (FK `Products`, **nullable**: chu kỳ cũ = `null` = không kiểm khớp).

**Tạo chu kỳ** (`POST /api/cultivation-cycles` và `POST /api/rafts/{raftId}/cultivation-cycles`, multipart): thêm trường **`productId`** (guid, **bắt buộc**). Thiếu/không đọc được/không tồn tại, hoặc sản phẩm đã ngừng bán: **400** `MSG-GEN-01`, `field: "ProductId"`, `hint` tiếng Việt ("Chọn loại hàu mà chu kỳ này nuôi và bán." / "Sản phẩm … không còn được bán…"). Nguồn chọn: `GET /api/products` (Quản lý vùng chỉ thấy sản phẩm đang dùng; Owner thấy cả ngừng bán nên web lọc bỏ sản phẩm ngừng bán như màn đơn mua).

**Sửa chu kỳ** (`PUT /api/cultivation-cycles/{id}` JSON): thêm **`productId`** (guid, tùy chọn; bỏ trống/null = giữ nguyên):
```json
{ "startDate": "2026-11-12", "targetYieldKg": 2200, "note": "…", "nurseryBatchId": "…", "productId": "…", "rowVersion": "…" }
```
`productId` **khác** hiện tại chỉ được khi chu kỳ **chưa có bản ghi thả giống** (cùng luật đổi đợt ươm); đã có → **409** `MSG-GEN-09` `reasonCode: CYCLE_SEED_LOCKED`, `field: "ProductId"` (message tiếng Việt). Sản phẩm không có/ngừng bán: 400 `ProductId` như trên. Gửi đúng sản phẩm hiện tại: không đổi. Áp cho cả chu kỳ cũ không qua ươm (gán sản phẩm cho chu kỳ cũ khi chưa thả).

**Đọc chu kỳ** (`CycleView`: `GET /api/cultivation-cycles/{id}`, `GET /api/rafts/{raftId}/progress` → `cycle`, bắt đầu/sửa/đóng/hoàn tất thả giống): thêm
```json
{ "productId": "…" , "productName": "Hàu múp", "canChangeProduct": true }
```
`productId`/`productName` = `null` ở chu kỳ cũ (không rõ loại hàu: UI hiển thị "Chưa xác định loại hàu"). `canChangeProduct` = đúng điều kiện của `canChangeNursery` (đang mở và chưa có bản ghi thả giống).

**Thu hoạch**
- `GET /api/rafts/{raftId}/harvest-lots` (màn Thu hoạch; `orders[]` chỉ có khi người gọi được ghi): thêm ở **mức màn hình** `cycleProductId`, `cycleProductName` (`null` khi bè không có chu kỳ mở hoặc chu kỳ cũ chưa có sản phẩm). Mỗi phần tử `orders[]` thêm `productId`, `matchesCycleProduct` (`productName` đã có từ trước):
```json
{ "cycleProductId": "…", "cycleProductName": "Hàu múp",
  "orders": [ { "id": "…", "code": "YC-20261113-ABC", "customerName": "…", "productId": "…", "productName": "Hàu múp", "matchesCycleProduct": true, "…": "các trường cũ" },
              { "id": "…", "productId": "…", "productName": "Hàu gầy 3cm", "matchesCycleProduct": false, "…": "…" } ] }
```
`matchesCycleProduct` = `true` khi chu kỳ chưa có sản phẩm (`null`) **hoặc** `productId` của đơn = `cycleProductId`. Quy tắc chọn đơn (đã chấp nhận, chưa đánh dấu xong thu hoạch) **giữ nguyên**: server vẫn trả **mọi** đơn, **client lọc** theo `matchesCycleProduct` (khuyến nghị: chỉ liệt kê đơn khớp; nếu không còn đơn khớp hiển thị "Chưa có đơn mua loại {cycleProductName}").
- Ghi lô (`POST /api/rafts/{raftId}/harvest-lots`, multipart, trường `purchaseRequestId`): khi chu kỳ mở của bè **có** `ProductId` mà `request.ProductId` khác → **400** `MSG-GEN-09`, `reasonCode: "HARVEST_PRODUCT_MISMATCH"`, `field: "Purchase request"`, kèm `requestId`, `requestCode`, `requestProductName`, `cycleProductName`, `message` tiếng Việt: "Đơn mua YC-… đặt Hàu gầy 3cm nhưng bè đang nuôi Hàu múp. Chọn đơn mua khớp loại hàu đang nuôi." Chu kỳ chưa có sản phẩm: không kiểm. Sửa lô (`PUT /api/harvest-lots/{id}`) không đổi được đơn mua của lô nên không có kiểm này; sản phẩm của chu kỳ không đổi được sau khi đã thả giống (nên lô luôn khớp).
- Mã `reasonCode` mới: `HARVEST_PRODUCT_MISMATCH` (400). `CYCLE_SEED_LOCKED` nay cũng áp cho `productId`.

**Demo (DEMO-01)**: các chu kỳ do dữ liệu demo tạo có sản phẩm; các đơn mua đã chấp nhận còn mở thu hoạch gồm 2 sản phẩm: "Hàu béo" (đơn 5, 20, 38, 50 lồng) và "Hàu sữa" (đơn 15 lồng, Nhà hàng Biển Xanh) để thử cảnh báo lệch. Chu kỳ demo đang mở: bè không có lô thu hoạch xen kẽ "Hàu béo"/"Hàu sữa" (ví dụ B1-04, B1-08, B2-02, B2-04 là "Hàu sữa"; B1-01..03, B1-05, B1-12, B2-01 là "Hàu béo"); bè có lô thu hoạch lấy sản phẩm của đơn đã thu hoạch ("Hàu béo").

---

## 1. Quyền và phạm vi (V1, còn đúng trừ chỗ mục 0 thay thế)

| Việc | Quyền (chức năng `CultivationCycles`, trong vùng của đợt ươm) |
|---|---|
| Đọc danh sách, chi tiết, lịch sử, lô giống, `available` | View |
| Bắt đầu ươm, hoàn tất ươm | Create |
| Sửa, hủy, sửa số sống sót, chuyển phần chia | Edit |

Chủ HTX mọi vùng; Quản lý vùng trong vùng của mình; Kế toán, nhân viên không. Không đủ quyền: 403 `MSG-GEN-08`. Không thấy bản ghi: 404.
Thông báo cho chủ (loại `NURSERY_RECORDED`, mã nội dung chung `MINI_APP_NOTIFICATION`, mở bản ghi `NurseryBatch`) khi **Quản lý vùng** bắt đầu, sửa, hủy, hoàn tất, sửa số sống sót hoặc chuyển phần chia. Chủ tự làm thì không báo chính mình.

## 2. Trạng thái

| `statusId` | `status` (tiếng Anh, danh mục) | `statusLabel` (tiếng Việt, dùng thẳng) |
|---|---|---|
| 4001 | `Nursing` | Đang ươm |
| 4002 | `Completed` | Đã hoàn tất |
| 4003 | `Cancelled` | Đã hủy |

Chỉ chuyển một chiều: Đang ươm → Đã hoàn tất, hoặc Đang ươm → Đã hủy. Không có đường lui.

## 3. Quy tắc nghiệp vụ chính (để UI dựng đúng)

1. Một đợt = **một lô giống** (`seedLotId`), **một vùng**, không chọn bè khi bắt đầu. Đơn vị **mảnh**, tối đa 2 chữ số thập phân.
2. Bắt đầu: số mảnh ≤ tồn kho của lô, **luôn chặn khi vượt, kể cả khi HTX bật cho phép tồn âm** (chủ chốt: không tồn âm cho ươm). Kho **trừ ngay** bằng một phiếu Xuất dùng (mục đích Nursery, vùng, không bè), mã `XD…` hiện ở `issueCode`. Hủy/sửa số mảnh thì phiếu xuất tự hoàn/điều chỉnh.
3. Ảnh bắt buộc **1 đến 3** (JPEG/PNG, mỗi ảnh ≤ 10 MB) lúc **bắt đầu** và lúc **hoàn tất**. Lỗi ảnh: 400 trường `Photos`, `hint` tiếng Việt. Ảnh bắt đầu sửa được khi còn Đang ươm (vẫn 1-3).
4. Hoàn tất: `survivors` (ước tính bằng mắt) từ 0 đến số mảnh vào; `allocations` (mỗi bè một lần, cùng vùng, bè đang dùng, **không có chu kỳ đang mở**, mỗi phần > 0), tổng phần chia **bằng đúng** `survivors`. `survivors = 0` thì `allocations` để trống và không tạo chu kỳ. Một giao dịch: đóng đợt, tạo **một chu kỳ cho mỗi bè** (`startDate` = `completedOn`, `expectedSeedQuantity` = `nurseryAllocated` = phần chia, `targetYieldKg` nhập ở đây, **không có ngày thu dự kiến**).
5. Hao hụt ươm = vào − sống sót, luôn kèm `estimated: true`; không có tỉ lệ dự kiến, không cảnh báo hao hụt cao.
6. Sau hoàn tất, trước/hoặc sau khi thả giống một phần: sửa số sống sót (cũ → mới, có lý do) và chuyển phần chia giữa các bè: dồn hết vào một bè hoặc chia nhiều bè; tổng luôn bằng số sống sót; mỗi bè **không được nhỏ hơn số đã thả**; bè đã có thả giống hoặc nhật ký không bị gỡ khỏi đợt; chu kỳ đã chốt thì phần chia **đóng băng**.
7. Thả giống từ đợt ươm (endpoint thả giống hiện có): **không cần `seedLotId`**, **chặn cứng** ở phần còn lại (409 `NURSERY_SEEDING_ABOVE_ALLOCATION`), không còn mức 110%/150% cho chu kỳ từ ươm, **không tạo phiếu Xuất dùng** (đã trừ lúc ươm). Chu kỳ cũ (không có `nurseryBatchId`) giữ nguyên hành vi cũ.
8. Không thêm ươm vào truy xuất công khai (QR). Chủ mã lô giống thả vẫn truy được tới phiếu nhập và nhà cung cấp (bản ghi thả giống mang lô của đợt ươm).

## 4. Endpoint

### 4.1 Lô giống để chọn khi bắt đầu ươm
`GET /api/nursery-batches/seed-lots?zoneId={zoneId}` (quyền Create của vùng, vì để bắt đầu ươm). 200:
```json
{
  "zoneId": "…",
  "lots": [
    { "id": "<receiptLineId, gửi làm seedLotId>", "code": "PN000123-1", "receiptId": "…", "receiptCode": "PN000123", "receivedDate": "2026-11-10",
      "itemId": "…", "itemCode": "GI000001", "itemName": "Giống hàu", "unit": "mảnh", "supplierId": "…", "supplierName": "Cơ sở giống A",
      "quantityReceived": 12000, "quantitySeeded": 0, "boughtForThisRaft": false, "quantityReturned": 0, "quantityConsumed": 1500, "onHand": 10500 }
  ],
  "message": null, "messageCode": null
}
```
Chỉ lô còn tồn kho (`onHand` > 0). Không có lô: `lots: []`, `message` = thông báo `MSG-CYCLE-03`.

### 4.2 Danh sách
`GET /api/nursery-batches?zoneId&status&from&to&search&page&pageSize&sortBy&sortDir`
- `status`: `all` (mặc định), `nursing`, `completed`, `cancelled`. `from`/`to` theo ngày bắt đầu. `search`: mã, ghi chú, mã phiếu nhập, nhà cung cấp, tên giống.
- `sortBy`: `code` (mặc định), `startDate`, `quantityIn`, `status`; `sortDir`: `asc`/`desc` (mặc định `desc`). `pageSize` tối đa 100.
- Không có `zoneId`: mọi vùng người gọi xem được.

200:
```json
{
  "items": [
    { "id": "…", "code": "NU000001", "zoneId": "…", "zoneCode": "KV01", "zoneName": "Vùng 1", "seedLotCode": "PN000123-1", "itemName": "Giống hàu", "unit": "mảnh",
      "supplierName": "Cơ sở giống A", "quantityIn": 10000, "startDate": "2026-11-01", "daysNursing": 12, "statusId": 4002, "status": "Completed", "statusLabel": "Đã hoàn tất",
      "completedOn": "2026-11-12", "survivors": 9500, "lossPieces": 500, "lossPercent": 5.0, "estimated": true, "allocationCount": 2, "rowVersion": "AAAAAAAB…" }
  ],
  "page": 1, "pageSize": 20, "total": 1,
  "summary": { "quantityIn": 10000, "nursingQuantityIn": 0, "completedQuantityIn": 10000, "survivors": 9500, "lossPieces": 500, "lossPercent": 5.0, "nursingCount": 0, "completedCount": 1 }
}
```
`summary` tính trên toàn bộ kết quả lọc (không chỉ trang), không tính đợt đã hủy vào số mảnh. `lossPieces`, `lossPercent` là `null` khi chưa hoàn tất; `summary.lossPercent` là `null` khi chưa có đợt hoàn tất. `daysNursing`: từ ngày bắt đầu đến ngày hoàn tất (hôm nay khi đang ươm), tính cả hai ngày.

### 4.3 Chi tiết
`GET /api/nursery-batches/{id}` → 200 `NurseryBatchView`:
```json
{
  "id": "…", "code": "NU000001", "zoneId": "…", "zoneCode": "KV01", "zoneName": "Vùng 1",
  "seedLot": { "id": "…", "code": "PN000123-1", "receiptId": "…", "receiptCode": "PN000123", "receivedDate": "2026-11-10", "itemId": "…", "itemCode": "GI000001", "itemName": "Giống hàu",
               "unit": "mảnh", "supplierId": "…", "supplierName": "Cơ sở giống A" },
  "seedLotOnHand": 500, "quantityIn": 10000, "unit": "mảnh", "startDate": "2026-11-01", "note": null, "daysNursing": 12,
  "statusId": 4002, "status": "Completed", "statusLabel": "Đã hoàn tất", "completedOn": "2026-11-12",
  "survivors": 9500, "lossPieces": 500, "lossPercent": 5.0, "estimated": true,
  "issueId": "…", "issueCode": "XD000045", "cancelReason": null, "cancelledAt": null,
  "recordedByAccountId": "…", "recordedByName": "Nguyễn Văn A", "createdAt": "2026-11-01T08:00:00+07:00",
  "startPhotos": [ { "id": "…", "url": "…" } ], "completionPhotos": [ { "id": "…", "url": "…" } ],
  "allocations": [
    { "id": "…", "raftId": "…", "raftCode": "B01", "cycleId": "…", "cycleStartDate": "2026-11-12", "cycleStatus": "Open", "quantity": 5000, "seeded": 2000, "remaining": 3000,
      "targetYieldKg": 800, "canChange": true }
  ],
  "canEdit": false, "canComplete": false, "canCorrectSurvivors": true, "rowVersion": "…"
}
```
- `seedLotOnHand`: tồn kho hiện tại của lô (đã trừ mọi phiếu xuất, trả hàng).
- `canEdit`: Đang ươm và người gọi có quyền (sửa, hủy). `canComplete`: Đang ươm và có quyền tạo. `canCorrectSurvivors`: Đã hoàn tất và có quyền sửa (sửa số sống sót, chuyển phần chia). Vùng ngừng sử dụng thì các cờ `false`.
- `allocations[].canChange`: chu kỳ của bè còn mở. `seeded`/`remaining` tính từ các lần thả giống của chu kỳ.
- `recordedByAccountId`/`recordedByName` có thể `null` với bản ghi hệ thống.

### 4.4 Bắt đầu ươm
`POST /api/zones/{zoneId}/nursery-batches` — `multipart/form-data`, quyền Create. Trường:
`seedLotId` (guid), `quantity` (số, dấu chấm), `startDate` (`yyyy-MM-dd`, mặc định hôm nay), `note` (tùy chọn, ≤ 1000), `photos` lặp **1-3** phần tệp (chỉ phần tên `photos`).
- 201 `NurseryBatchSaved`: `{ "batch": <NurseryBatchView>, "message": "Nursery batch saved.", "messageCode": "MSG-GEN-05" }`.
- 400 `MSG-GEN-01` kèm `field`/`fields` trong `Seed lot`, `Quantity`, `Start date`, `Note`, `Photos`.
- 409 `MSG-INPUT-01` thiếu tồn: `onHand`, `balanceAfter`, `seedLotLineId`, `itemId`, `field: "Quantity"`.
- 400 `MSG-GEN-09` (vùng ngừng sử dụng, trường `Zone`), 502 `MSG-GEN-03` (upload ảnh lỗi, không lưu gì), 409 `MSG06` (đụng bản ghi cùng lúc).

### 4.5 Sửa (chỉ khi Đang ươm)
`PUT /api/nursery-batches/{id}` — `multipart/form-data`, quyền Edit. Trường nào không gửi thì giữ nguyên:
`quantity`, `startDate`, `note` (gửi rỗng để xóa), `rowVersion` (bắt buộc), `keepPhotoIds` (lặp, id ảnh bắt đầu muốn giữ), `photos` (lặp, ảnh thêm).
- Ảnh chỉ đổi khi form có `photos` **hoặc** `keepPhotoIds`: khi đó đợt giữ đúng các ảnh trong `keepPhotoIds` và thêm các ảnh mới, tổng 1-3 (ảnh không nêu bị xóa). Không gửi cả hai thì ảnh không đổi.
- Đổi số mảnh hoặc ngày: phiếu Xuất dùng liên kết điều chỉnh theo; số mảnh mới không vượt tồn kho (409 `MSG-INPUT-01`, phần của chính đợt được tính lại).
- 200 `NurseryBatchSaved`. 409 `NURSERY_NOT_NURSING` nếu không còn Đang ươm. 409 `MSG06` kèm `currentRowVersion`.

### 4.6 Hủy (chỉ khi Đang ươm)
`POST /api/nursery-batches/{id}/cancel` JSON `{ "reason": "Nhập nhầm", "rowVersion": "…" }`, quyền Edit. `reason` bắt buộc (≤ 1000). Hoàn kho (phiếu xuất chuyển Đã hủy). 200 `NurseryBatchSaved` (`statusId` 4003, `cancelReason`, `cancelledAt`). **Đợt Đã hoàn tất: 409 `NURSERY_NOT_NURSING`** (không hủy).

### 4.7 Hoàn tất ươm (và tạo chu kỳ nuôi)
`POST /api/nursery-batches/{id}/complete` — `multipart/form-data`, quyền Create. Trường:
- `survivors` (số), `completedOn` (mặc định hôm nay; không trước ngày bắt đầu, không sau hôm nay), `rowVersion` (bắt buộc), `photos` lặp **1-3**.
- `allocations`: **một trường** chứa chuỗi JSON mảng, ví dụ:
```json
[ { "raftId": "…", "quantity": 4750, "targetYieldKg": 600 }, { "raftId": "…", "quantity": 4750 } ]
```
  (`targetYieldKg` tùy chọn, > 0, 2 chữ số thập phân; không có ngày thu dự kiến). Cho `survivors = 0`: không gửi hoặc gửi `[]`.
- 200 `NurseryBatchSaved`: đợt `Completed`, `allocations` có `cycleId` của từng chu kỳ vừa tạo (mỗi chu kỳ: `startDate` = `completedOn`, `expectedSeedQuantity` = phần chia). Thả giống tiếp ở màn Thả giống của từng chu kỳ.
- Lỗi:
  - 400 `MSG-GEN-01`: `field: "Survivors"` (âm, lớn hơn số vào, quá 2 số thập phân), `"Completed on"`, `"Allocations"` + `hint` (tổng khác `survivors`, bè trùng, phần ≤ 0, thiếu bè khi còn sống sót), `"Target yield"`, `"Photos"`.
  - 409 (`MSG-GEN-09`, kèm `reasonCode`): `NURSERY_RAFT_HAS_OPEN_CYCLE` (`raftId`, `raftCode`, `cycleId`), `NURSERY_RAFT_OTHER_ZONE`, `NURSERY_CYCLE_STARTS_BEFORE_CLOSE` (`previousCloseDate`: chu kỳ trước của bè chốt cùng hoặc sau ngày hoàn tất), `NURSERY_NOT_NURSING`; bè ngừng sử dụng: `MSG-GEN-09` thường.
  - 409 `MSG06`: có người sửa cùng lúc (cũng khi hai người cùng tạo chu kỳ cho một bè).
  - Tất cả hoặc không: lỗi thì không lưu gì, ảnh đã tải bị xóa.

### 4.8 Sửa số sống sót (đã hoàn tất)
`POST /api/nursery-batches/{id}/survivors` JSON, quyền Edit:
```json
{ "survivors": 9200, "reason": "Đếm lại", "rowVersion": "…", "allocations": [ { "raftId": "…", "quantity": 9200 } ] }
```
- `reason` bắt buộc. `survivors` từ 0 đến số mảnh vào, **không nhỏ hơn tổng đã thả** (409 `NURSERY_SURVIVORS_BELOW_SEEDED` khi dưới số đã thả).
- `allocations` bỏ trống được khi đợt chỉ có **một bè** (phần của bè đó tự thành số mới); nhiều bè hoặc chưa có bè (trước đó sống sót 0) thì phải gửi phần chia mới có tổng bằng số mới (400 `Allocations` + `hint`). Quy tắc từng bè như mục 3.6.
- Lịch sử ghi `9500 → 9200`, người sửa, thời điểm, lý do. 200 `NurseryBatchSaved`.

### 4.9 Chuyển phần chia giữa các bè (đã hoàn tất)
`POST /api/nursery-batches/{id}/allocations` JSON, quyền Edit:
```json
{ "allocations": [ { "raftId": "…", "quantity": 9500, "targetYieldKg": 700 } ], "reason": "Dồn về một bè", "rowVersion": "…" }
```
- Gửi **toàn bộ** phần chia mới; tổng bằng `survivors` hiện tại. Bè đã có trong đợt: đổi số mảnh (không nhỏ hơn đã thả; bỏ `targetYieldKg` thì giữ), bè không còn trong danh sách bị **gỡ** cùng chu kỳ của nó (chỉ được khi chu kỳ mở, chưa thả giống, chưa có nhật ký; nếu không: 409 `NURSERY_ALLOCATION_BELOW_SEEDED`). Bè mới: tạo chu kỳ mới bắt đầu hôm nay (cùng các điều kiện bè như hoàn tất). Chu kỳ đã chốt: 409 `NURSERY_ALLOCATION_FROZEN`.
- 409 `NURSERY_NOT_COMPLETED` nếu đợt chưa hoàn tất hoặc đã hủy. 200 `NurseryBatchSaved`.

### 4.10 Lịch sử
`GET /api/nursery-batches/{id}/history` → 200 như các điểm lịch sử hiện có: `{ recordType: "NurseryBatch", recordId, recordCode, entries[{ eventId, at, byName, byRole, byRoleCode, action, actionCode, actionLabel, reason, note, changes[{ field, label, from, to, unit }] }] }`, sự kiện cũ nhất trước.
Hành động: `Created` (bắt đầu), `Edited`, `Cancelled`, `Completed`, `SurvivorsCorrected`, `AllocationsChanged`. Nhãn tiếng Việt cho trường: Số mảnh vào ươm, Ngày bắt đầu ươm, Lô giống, Ghi chú, Số mảnh sống sót (ước tính), Ngày hoàn tất ươm, Phân bổ cho bè, Trạng thái. 404 khi chưa có sự kiện nào; quyền như đọc đợt.

### 4.11 Đợt còn phần chưa thả (cho màn Thả giống)
`GET /api/nursery-batches/available?zoneId={optional}` (View). 200:
```json
{ "batches": [ { "id": "…", "code": "NU000001", "zoneId": "…", "zoneCode": "KV01", "seedLotCode": "PN000123-1", "itemName": "Giống hàu", "unit": "mảnh", "quantityIn": 10000,
  "survivors": 9500, "completedOn": "2026-11-12", "remaining": 7500,
  "allocations": [ { "allocationId": "…", "cycleId": "…", "raftId": "…", "raftCode": "B01", "allocated": 5000, "seeded": 2000, "remaining": 3000 } ] } ] }
```
Chỉ đợt Đã hoàn tất có ít nhất một chu kỳ **còn mở** với phần chưa thả > 0; `allocations` chỉ liệt kê các bè còn phần chưa thả; `remaining` là tổng các phần đó.

## 5. Mở rộng endpoint hiện có (thêm trường, không phá tương thích)

- **Chu kỳ** (`cycle` trong mọi câu trả lời có `CycleView`: `GET /api/cultivation-cycles/{id}`, tiến độ `GET /api/rafts/{raftId}/progress`, bắt đầu/sửa chu kỳ): thêm `nurseryBatchId`, `nurseryCode`, `nurseryAllocated`, `nurserySeeded`, `nurseryRemaining` (đều `null` với chu kỳ cũ). **Bỏ `expectedHarvestDate`** khỏi chu kỳ, bắt đầu/sửa chu kỳ, tổng kết và xem trước chốt (cột giữ trong CSDL, không trả, không nhận; trường gửi thừa bị bỏ qua).
- **Mục chu kỳ trong danh sách** (`CycleListItem`: danh sách chu kỳ của bè/vùng): thêm `nurseryBatchId`.
- **Màn Thả giống** `GET /api/cultivation-cycles/{id}/seeding-records` (kế hoạch): thêm `nurseryBatchId`, `nurseryCode`, `nurseryAllocated`, `nurserySeeded`, `nurseryRemaining`. Với chu kỳ từ ươm `plannedSeedQuantity` = phần chia, `percent` tính trên đó; nhóm `lots` vẫn liệt kê lô giống của đợt.
- **Thả giống** `POST /api/cultivation-cycles/{id}/seeding-records` (và sửa/hiệu chỉnh TRACE-03): với chu kỳ từ ươm **không gửi `seedLotId`** (gửi cũng bỏ qua, lô lấy từ đợt), 409 `NURSERY_SEEDING_ABOVE_ALLOCATION` khi vượt phần còn lại: `allocated`, `seeded`, `remaining`, `quantity`, `field: "Quantity"`. Không tạo phiếu Xuất dùng, `issueId` null. `confirmOverPlan`/`overPlanReason` bị bỏ qua cho chu kỳ này.
  **Cập nhật 13/11/2026 (chủ dự án): thả giống từ ươm phải đủ 100% phần đã chuyển, số lượng không chọn được.** Với chu kỳ có `nurseryBatchId`: `quantity` có thể **bỏ trống** (hệ thống đặt bằng `nurseryRemaining`) hoặc gửi đúng bằng số đó (sai số 0,001); gửi số khác thì **400** `MSG-GEN-09` `reasonCode: NURSERY_SEEDING_MUST_USE_FULL_ALLOCATION` kèm `allocated`, `seeded`, `remaining`, `quantity`, `field: "Quantity"`, `detail` tiếng Việt "Thả giống phải dùng đủ phần đã chuyển sang bè: còn X mảnh. Nếu số lượng thay đổi, hãy sửa số sống sót hoặc chuyển lại số mảnh giữa các bè trước."; khi `nurseryRemaining` = 0 thì **400** `NURSERY_SEEDING_ALREADY_COMPLETE` (đã thả hết, bất kể số gửi). Làn, % từng làn, ngày, ảnh 1 đến 3 giữ nguyên. Vì lần thả đầu lấy hết phần chia nên chu kỳ chỉ còn thả tiếp khi chủ nâng phần chia (chuyển giữa các bè hoặc nâng số sống sót): lần sau lấy đúng phần chênh. Sửa bản ghi (`PUT /api/seeding-records/{id}` và TRACE-03): số lượng luôn bằng phần chia trừ các bản ghi khác của chu kỳ; bỏ trống hoặc gửi đúng số đó thì lưu, gửi số khác thì 400 như trên (bản ghi nhận số mới khi phần chia đã được nâng). 409 `NURSERY_SEEDING_ABOVE_ALLOCATION` giữ lại như lớp chặn an toàn. Chu kỳ không có ươm: không đổi.
- **Tổng kết chu kỳ**, **xem trước chốt**, **đóng chu kỳ** (`summary`): khối `nursery`:
```json
"nursery": { "batchId": "…", "batchCode": "NU000001", "quantityIn": 5000, "survivors": 4750, "lossPieces": 250, "lossPercent": 5.0, "estimated": true }
```
  Chu kỳ chung đợt với nhiều bè: `quantityIn` chia theo tỉ lệ phần chia của bè (`survivors` là phần chia của bè); `lossPercent` là của cả đợt. `null` với chu kỳ cũ.
- **`GET /api/harvest-yield`**: mỗi nhóm thêm `nurseryQuantityIn`, `nurserySurvivors`, `nurseryLossPieces`, `nurseryLossPercent` (cộng các chu kỳ trong nhóm có ươm, `null` khi không có chu kỳ nào từ ươm; số là ước tính).

## 6. Mã lỗi `reasonCode` của ươm

| `reasonCode` | HTTP | Khi nào |
|---|---|---|
| `NURSERY_NOT_NURSING` | 409 | sửa/hủy/hoàn tất đợt không còn Đang ươm (kể cả hủy đợt đã hoàn tất) |
| `NURSERY_NOT_COMPLETED` | 409 | sửa số sống sót, chuyển phần chia khi đợt chưa hoàn tất hoặc đã hủy |
| `NURSERY_RAFT_HAS_OPEN_CYCLE` | 409 | bè được chọn đang có chu kỳ mở |
| `NURSERY_RAFT_OTHER_ZONE` | 409 | bè khác vùng với đợt |
| `NURSERY_CYCLE_STARTS_BEFORE_CLOSE` | 409 | chu kỳ trước của bè chốt cùng/sau ngày bắt đầu chu kỳ mới |
| `NURSERY_SEEDING_ABOVE_ALLOCATION` | 409 | thả giống vượt phần còn lại của chu kỳ từ ươm |
| `NURSERY_SEEDING_MUST_USE_FULL_ALLOCATION` | 400 | thả giống/sửa bản ghi thả của chu kỳ từ ươm gửi `quantity` khác phần còn lại (13/11) |
| `NURSERY_SEEDING_ALREADY_COMPLETE` | 400 | chu kỳ từ ươm đã thả hết phần chia, không còn gì để thả (13/11) |
| `NURSERY_SURVIVORS_BELOW_SEEDED` | 409 | số sống sót mới nhỏ hơn tổng đã thả |
| `NURSERY_ALLOCATION_BELOW_SEEDED` | 409 | phần chia nhỏ hơn đã thả, hoặc gỡ bè đã thả/đã có nhật ký |
| `NURSERY_ALLOCATION_FROZEN` | 409 | đổi/gỡ phần chia của chu kỳ đã chốt |

Mã thông báo lỗi chung `MSG-GEN-09` (tạm, chờ SRS đặt `MSG-NURSERY-xx`), `message` bằng tiếng Việt, có thể hiện thẳng.
Lỗi dùng lại: `MSG-GEN-01` (400 trường), `MSG-INPUT-01` (thiếu tồn), `MSG06` (đụng bản ghi, có `currentRowVersion`), `MSG-GEN-03` (502 upload), `MSG-GEN-08` (403), 404.

## 7. Gợi ý luồng UI

1. Mở **Bắt đầu ươm**: `GET /api/nursery-batches/seed-lots?zoneId` hiện lô và tồn kho; nhập số mảnh, ngày, ghi chú, 1-3 ảnh; bảng xem lại (tồn trước = `onHand`, sau = `onHand - quantity`); `POST /api/zones/{zoneId}/nursery-batches`.
2. **Hoàn tất ươm**: danh sách bè của vùng và bè nào đang có chu kỳ mở lấy từ `GET /api/zones/{zoneId}/cultivation-cycles` (màn chu kỳ theo vùng, cờ `canStart`); nhập sống sót, chia bè ("chia đều" làm phía web, nhớ phần dư làm tròn để tổng khớp đúng), sản lượng dự kiến từng bè, 1-3 ảnh; bảng xem lại; `POST …/complete`.
3. Màn thả giống chu kỳ từ ươm: hiện "Còn {nurseryRemaining} trên {nurseryAllocated} mảnh đã chuyển"; bỏ chọn lô giống **và bỏ ô nhập số lượng** (13/11): hiện dòng chỉ đọc "Số lượng thả: X mảnh · toàn bộ phần đã chuyển sang bè"; `nurseryRemaining` = 0 thì hiện "Đã thả hết phần đã chuyển sang bè" và khóa Lưu; bắt 400 `NURSERY_SEEDING_MUST_USE_FULL_ALLOCATION` và `NURSERY_SEEDING_ALREADY_COMPLETE` (web gửi `quantity` = phần còn lại).

## 8. % làn và ảnh bắt buộc các bước (B2), ngày 12/11/2026

Nguồn: đặc tả nursery mục 10.2-10.6 (ghi đè). Cùng nhánh `feature/OMTS-132-nursery`. Quy ước chung như đầu file (camelCase, `rowVersion` base64, lỗi problem có `status`, `code`, `message`, `field`, `hint`).

### 8.1 Mô hình % và đọc làn

- Mỗi làn trong **một chu kỳ** có hai số: `seededPercent` (0-100, phần đã thả nuôi) và `harvestedPercent` (0-100 hoặc `null` = "chưa ghi %": làn đã vào lô thu nhưng chưa ai nhập tỉ lệ; dữ liệu cũ đang thu một phần cũng là `null`). Thả giống/thu hoạch **cộng dồn** theo làn, **không vượt 100** trong cùng chu kỳ.
- Backfill dữ liệu cũ: làn đã thả = 100; làn đã thu xong (đã bấm hoàn tất) = 100; làn đang thu một phần = `null`.
- **Trạng thái làn suy ra từ %** (vẫn trả `state` như cũ): `harvestedPercent` = 100 hoặc có lô đánh dấu hoàn tất → `Harvested`; `harvestedPercent` > 0 (hoặc `null` nhưng làn nằm trong lô thu) → `BeingHarvested`; `seededPercent` > 0 → `Growing`; còn lại `NotSeeded`. Hỏng/ngừng hoạt động giữ cờ riêng như hiện nay.
- Các DTO làn đọc **thêm trường** (thêm cuối, không phá tương thích): `LaneDayView` (làn hôm nay của bè, tiến độ chu kỳ, kết quả sự cố làn), `SeedingLaneView` (màn Thả giống), `HarvestLaneView` (màn Thu hoạch, nguồn `facts.data.lanes` của web), và `GET /api/rafts/{raftId}/lanes/{n}/progress`:
```json
{ "seededPercent": 60, "harvestedPercent": null, "lastModifiedByName": "Nguyễn Văn A", "lastModifiedAt": "2026-11-12T09:30:00+07:00",
  "progressHistory": [ { "at": "…", "byName": "…", "reason": "Đếm lại", "oldSeededPercent": 40, "seededPercent": 60, "oldHarvestedPercent": null, "harvestedPercent": null } ] }
```
  `lastModified*` và `progressHistory` chỉ nói về các **lần chỉnh tay** (PUT mục 8.3), mới nhất trước; `null`/`[]` khi chưa ai chỉnh. Tên trường khớp `lane-progress-contracts.ts` của web (W1).
- **Lệch so với W1:** không có `lane.rowVersion` riêng. `rowVersion` gửi cho PUT là **`rowVersion` của chu kỳ đang mở** (`cycle.rowVersion` trên màn Thu hoạch/Thả giống/tiến độ), vì mọi bản ghi thả/thu và chỉnh % đều di chuyển hàng chu kỳ. Web dùng nhánh dự phòng "phiên bản chu kỳ đang mở" như đã viết.

### 8.2 % trong form thả giống và thu hoạch

Cả hai form nhận trường **`lanePercents`**: **một trường** chuỗi JSON đối tượng `{"<số làn>": phần trăm}`, ví dụ `{"1":60,"2":100}`. Phần trăm là số > 0 và ≤ 100, tối đa 2 chữ số thập phân; chỉ gồm làn có trong `laneNumbers`.
- **Thả giống**: làn không nêu = **100**. Cộng dồn đã thả + phần này **> 100** thì 400 (mục 8.5). Thả 60% rồi 40% = đủ 100; thêm 10% bị chặn.
- **Thu hoạch**: làn không nêu thì: nếu làn được đánh dấu **hoàn tất** trong lô, tổng làn thành 100; nếu không hoàn tất, `null` (chưa ghi %, như dữ liệu cũ). Có nêu: cộng dồn đã thu + phần này **> 100** thì 400. Làn hoàn tất trong lô luôn thành 100 dù phần nhập là bao nhiêu. % thu **không liên kết** số lồng (hai số độc lập).
- Sửa lô thu bỏ dấu "hoàn tất" của một làn mà không nêu % mới: phần % do lần hoàn tất đó tự gán bị xóa (về `null`, như lô không nêu % và không hoàn tất).
- **Hoàn tất thu hoạch** (`POST /api/rafts/{raftId}/lanes/{n}/finish-harvest` và `POST /api/rafts/{raftId}/finish-harvest`): đặt `harvestedPercent` = 100.
- Sửa thả giống / lô thu (PUT) nhận lại `lanePercents` (làn giữ nguyên mà không nêu thì giữ % cũ; làn mới mặc định như trên).
- Đọc lại phần từng làn của một bản ghi: `SeedingRecordView.lanePercents: [{ laneNumber, percent }]` và `HarvestLotView.lanePercents: [{ laneNumber, percent }]` (`percent` là `null` khi chưa ghi). Cờ `canSeed` của làn trên màn Thả giống vẫn theo trạng thái làn như trước; web nên coi làn có `seededPercent` = 100 là đã đầy (backend chặn bằng 400 `LanePercent`, `remainingPercent` 0).

### 8.3 Chỉnh % sau: `PUT /api/rafts/{raftId}/lanes/{n}/progress`

JSON `{ "seededPercent"?: 0-100, "harvestedPercent"?: 0-100, "reason": "…", "rowVersion": "<cycle.rowVersion>" }`: ít nhất một %, `reason` bắt buộc (≤ 500). Quyền chức năng `CultivationCycles` **Edit** trong vùng của bè (Chủ HTX, Quản lý vùng). Chỉ chu kỳ **đang mở** trên bè đang dùng; làn đang dùng, chưa ngừng hoạt động và **đã có thả giống** trong chu kỳ (`state` khác `NotSeeded`).
- 200 (đối tượng làn phẳng, như W1 giả định):
```json
{ "laneNumber": 3, "seededPercent": 100, "harvestedPercent": 40, "state": "BeingHarvested", "rowVersion": "<rowVersion chu kỳ mới>",
  "lastModifiedByName": "…", "lastModifiedAt": "…", "progressHistory": [ … ], "changed": true, "cycleId": "…", "message": "Lane progress saved.", "messageCode": "MSG-GEN-05" }
```
  Gửi đúng giá trị đang có: 200 `changed: false`, không lưu, không ghi lịch sử.
- Lịch sử: mỗi lần chỉnh ghi **cũ → mới**, người, lúc, lý do vào `progressHistory` và nhật ký chung (nhãn tiếng Việt "Phần trăm đã thả", "Phần trăm đã thu"). Chỉnh tay **thắng** các bản ghi cũ hơn nó; bản ghi thả/thu tạo **sau** đó cộng thêm vào số đã chỉnh.
- Quản lý vùng chỉnh % thì **thông báo chủ** (loại `LANE_PROGRESS_CHANGED`, nội dung chung `MINI_APP_NOTIFICATION`, mở bè). Chủ tự chỉnh không báo chính mình.
- Lỗi: 400 `MSG-GEN-01` (`Seeded percent`, `Harvested percent`, `Reason`, thiếu cả hai %); 403 `MSG-GEN-08`; 404; 409 `MSG06` kèm `currentRowVersion`; 409 `MSG-GEN-09` + `reasonCode` `LANE_NOT_SEEDED` / `LANE_OUT_OF_SERVICE` (hoặc chu kỳ không mở, như các lệnh làn khác).

### 8.4 Ảnh bắt buộc 1-3 cho bản ghi MỚI

JPEG/PNG đọc từ nội dung, mỗi ảnh ≤ 10 MB, phần tên `photos` lặp. Thiếu hoặc quá 3 ảnh: 400 `MSG-GEN-01` `field: "Photos"` + `hint` tiếng Việt, **không lưu gì**, ảnh đã tải bị xóa. Upload lỗi: 502 `MSG-GEN-03`. Bản ghi **cũ không ảnh** vẫn đọc và sửa bình thường (sửa không bắt thêm ảnh nếu bản ghi chưa có ảnh); bản ghi có ảnh sửa xong phải còn **1-3**.

| Bước | Endpoint | Đổi so với trước |
|---|---|---|
| Thả giống | `POST /api/cultivation-cycles/{id}/seeding-records` | **JSON thành `multipart/form-data`** (bắt buộc ảnh) |
| Sửa thả giống | `PUT /api/seeding-records/{id}` | **JSON thành `multipart/form-data`**; thêm `keepPhotoIds` |
| Thu hoạch | `POST /api/rafts/{raftId}/harvest-lots` | đã multipart; ảnh nay **1-3 bắt buộc** (trước 0-10); thêm `lanePercents` |
| Sửa lô thu | `PUT /api/harvest-lots/{id}` | giữ `keepPhotoKeys` như cũ; ảnh còn **1-3** (lô cũ không ảnh được để 0) |
| Kế hoạch nuôi (tạo chu kỳ không từ ươm) | `POST /api/rafts/{raftId}/cultivation-cycles` | **JSON thành `multipart/form-data`** (bắt buộc ảnh) |
| Đổi ảnh kế hoạch | `PUT /api/cultivation-cycles/{id}/plan-photos` (mới) | `rowVersion`, `keepPhotoIds`, `photos`; tổng 1-3; chu kỳ **từ ươm**: 409 `PLAN_PHOTOS_FROM_NURSERY` |
| Báo hỏng làn | `POST /api/rafts/{raftId}/lanes/{n}/report-damage` | **JSON thành `multipart/form-data`**: `reason` (khi nào/làn nào/hỏng thế nào), `reasonCode?`, `rowVersion` (bè), `photos` 1-3 |

- Thả giống (multipart): `seedingDate` (`yyyy-MM-dd`), `seedLotId` (bỏ qua với chu kỳ từ ươm), `laneNumbers` (lặp), `quantity` (số, dấu chấm), `lanePercents`, `confirmOverPlan`, `overPlanReason`, `photos`. Sửa thêm: `reason`, `rowVersion`, `keepPhotoIds` (lặp, id ảnh giữ lại; có `keepPhotoIds` **hoặc** `photos` thì ảnh được thay đúng theo đó, không gửi cả hai thì ảnh giữ nguyên).
- Tạo chu kỳ (multipart): `startDate`, `expectedSeedQuantity`, `targetYieldKg` (tùy chọn như cũ), `photos`. Chu kỳ tạo từ ươm (bước hoàn tất ươm, mục 4.7) **không** nhận ảnh riêng: ảnh kế hoạch của chúng là bộ **ảnh hoàn tất ươm** dùng chung.
- Nhật ký chăm sóc: ảnh **tùy chọn, tối đa 3** (trước 10); sử dụng vật tư không đổi.
- Hậu quả cho web: form thả giống, tạo chu kỳ và báo hỏng phải gửi `FormData`; BFF chuyển tiếp multipart như đã làm với thu hoạch và ươm.

**Đọc ảnh** (mọi bản đọc): `photos: [ { "id": "…", "url": "…" } ]` (có thể thêm `sortOrder`; thu hoạch giữ thêm `key` cũ), url là liên kết ký sẵn có hạn. Trên: `SeedingRecordView.photos`, `HarvestLotView.photos`, `LaneIncidentView.photos`, và `CycleView.planPhotos` (`[]` khi chu kỳ cũ chưa có) kèm `planPhotosFromNursery: true` khi là bộ ảnh hoàn tất ươm.

### 8.5 Lỗi `LanePercent`

400 `MSG-GEN-01`:
```json
{ "status": 400, "code": "MSG-GEN-01", "field": "LanePercent", "laneNumber": 3, "remainingPercent": 40, "hint": "Làn 3 còn 40% có thể thả thêm." }
```
`remainingPercent` = 100 trừ phần đã cộng dồn của làn (tối thiểu 0); chỉ có khi `lanePercents` hợp lệ nhưng thả/thu **vượt 100**. `lanePercents` sai (không đọc được JSON, giá trị ≤ 0 hoặc > 100, làn không nằm trong `laneNumbers`) cũng là `LanePercent` nhưng không có `remainingPercent`. Với thu hoạch `hint` nói "đã thu".

### 8.7 Tạo chu kỳ mới chỉ qua ươm (B3, Q21)

`POST /api/rafts/{raftId}/cultivation-cycles` (tạo chu kỳ tay) nay trả **400** `MSG-GEN-09` kèm `reasonCode: "CYCLE_REQUIRES_NURSERY"`, `field: "Cycle"`, `hint` và `detail` "Chu kỳ mới được tạo khi hoàn tất ươm." (sau kiểm quyền và bè chỉ-đọc, không lưu gì, không tải ảnh). Chu kỳ mới chỉ sinh khi hoàn tất ươm (mục 4.7). Chu kỳ **đang chạy** không có `nurseryBatchId` vẫn đọc, sửa, thu hoạch, chốt và nhận phiên thả giống chọn lô giống như cũ. Web nên bỏ/ẩn nút "Bắt đầu chu kỳ" và dẫn tới màn Ươm giống. Dữ liệu demo có sẵn một đợt ươm "Đang ươm" ở vùng 1 để thử hoàn tất.

### 8.6 Ghi chú vận hành

- Thông báo mới `LANE_PROGRESS_CHANGED` (tùy chọn bật/tắt, không bắt buộc đẩy) hiện trong cài đặt thông báo của Chủ HTX.
- Demo: bản ghi thả/thu do bootstrap tạo vẫn có ảnh mẫu; dữ liệu cũ được backfill % như mục 8.1.
