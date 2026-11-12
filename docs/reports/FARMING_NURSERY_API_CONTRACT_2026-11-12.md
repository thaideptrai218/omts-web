# Hợp đồng API ươm giống (B1), ngày 12/11/2026

Nguồn: `FARMING_NURSERY_STEP_SPEC_2026-11-12.md` (mục 2-7, 10) cộng quyết định chủ dự án đợt cuối: **đợt ươm đã hoàn tất không hủy được** (chỉ "Đang ươm" mới sửa/hủy); Quản lý vùng ghi ươm hoặc sửa thì **thông báo chủ**; dùng quyền thả giống sẵn có (`CultivationCycles`) và mã thông báo chung.
Nhánh backend: `feature/OMTS-132-nursery`. Mọi đường dẫn có tiền tố `/api`. JSON camelCase, ngày `yyyy-MM-dd`, số là number, enum là chuỗi, `rowVersion` là chuỗi base64. Lỗi theo dạng problem hiện có (`status`, `code`, `message`, các trường chi tiết nằm ngang hàng, ví dụ `field`, `hint`, `reasonCode`).

## 1. Quyền và phạm vi

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
| `NURSERY_SURVIVORS_BELOW_SEEDED` | 409 | số sống sót mới nhỏ hơn tổng đã thả |
| `NURSERY_ALLOCATION_BELOW_SEEDED` | 409 | phần chia nhỏ hơn đã thả, hoặc gỡ bè đã thả/đã có nhật ký |
| `NURSERY_ALLOCATION_FROZEN` | 409 | đổi/gỡ phần chia của chu kỳ đã chốt |

Mã thông báo lỗi chung `MSG-GEN-09` (tạm, chờ SRS đặt `MSG-NURSERY-xx`), `message` bằng tiếng Việt, có thể hiện thẳng.
Lỗi dùng lại: `MSG-GEN-01` (400 trường), `MSG-INPUT-01` (thiếu tồn), `MSG06` (đụng bản ghi, có `currentRowVersion`), `MSG-GEN-03` (502 upload), `MSG-GEN-08` (403), 404.

## 7. Gợi ý luồng UI

1. Mở **Bắt đầu ươm**: `GET /api/nursery-batches/seed-lots?zoneId` hiện lô và tồn kho; nhập số mảnh, ngày, ghi chú, 1-3 ảnh; bảng xem lại (tồn trước = `onHand`, sau = `onHand - quantity`); `POST /api/zones/{zoneId}/nursery-batches`.
2. **Hoàn tất ươm**: danh sách bè của vùng và bè nào đang có chu kỳ mở lấy từ `GET /api/zones/{zoneId}/cultivation-cycles` (màn chu kỳ theo vùng, cờ `canStart`); nhập sống sót, chia bè ("chia đều" làm phía web, nhớ phần dư làm tròn để tổng khớp đúng), sản lượng dự kiến từng bè, 1-3 ảnh; bảng xem lại; `POST …/complete`.
3. Màn thả giống chu kỳ từ ươm: hiện "Còn {nurseryRemaining} trên {nurseryAllocated} mảnh đã phân bổ"; bỏ chọn lô giống; bắt 409 `NURSERY_SEEDING_ABOVE_ALLOCATION`.

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
