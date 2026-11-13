# Đặc tả: hình học bè/làn, vòng đời làn (làn giữa hỏng) và kế hoạch thu hoạch theo đơn

Ngày: 12/11/2026. Trạng thái: ĐỀ XUẤT, chờ Owner chốt mục F. Đây là tài liệu đọc-chỉ (không sửa mã). Backend agent và Codex web agent làm đúng theo tài liệu này sau khi Owner trả lời mục F.
Probe GET `http://127.0.0.1:8082`: server đang chạy là bản cũ hơn develop (danh sách `purchase-requests` còn trả `requestedKg`), nên mọi khẳng định về hành vi lấy từ mã nguồn `D:\Đồ_án\omts-backend` (develop), không từ server live. Sản phẩm demo: Hàu béo, Hàu sống loại nhỏ, Hàu sữa, Hàu thịt tách vỏ (đã ngừng).

Quy ước: `file:dòng` là backend `D:\Đồ_án\omts-backend\src\...` nếu không ghi khác. "SRS" = SRS v8 `.hallmark/srs-v8/srs-v8-full.txt`.

---

## 0. Hiện trạng (bằng chứng) và phần còn thiếu

### 0.1 Raft/Lane hiện có

| Thực tế trong mã | Bằng chứng |
|---|---|
| Raft chỉ có `Code`, `Location`, `Latitude/Longitude`, `Size` (text tự do), `ConditionNotes`, `StatusId`. Không có chiều dài/rộng số, không có diện tích | `OMTS.Domain/Entities/Farming/Raft.cs:22-33` |
| `Size` bắt buộc, tối đa 100 ký tự; web ghép `"10 m x 24 m"` (dài x rộng) từ 2 ô số rồi đọc ngược bằng regex | `RaftValues.cs:12-17`; web `src/features/rafts-api/raft-size.ts:1-29`, `raft-size-fields.tsx` |
| Lane chỉ có `LaneNumber` và `StatusId` (InUse 2001 / Removed 2002). Không có chiều dài dây từng làn, không có điều kiện hỏng | `Lane.cs:14-20`; `StatusIds.cs:99-103` |
| Lane không bao giờ bị xóa. Chỉ thêm/bớt ở CUỐI bè; thêm thì khôi phục làn Removed theo thứ tự số trước, rồi tạo số mới. Tối đa 200 làn | `RaftLaneChange.cs:5-31`; SRS BR-FARM-04 (dòng 3412) |
| Đổi số làn bị chặn khi bè có chu kỳ Open (MSG-GEN-06) | `RaftService.cs:127-131`, `RaftStatusService.cs:61-65` |
| Trạng thái làn là DẪN XUẤT, không lưu: NotSeeded, Growing, BeingHarvested, Harvested; không có hỏng/mất giống | `LaneStateRules.cs:5-49`; SRS BR-FARM-03 |
| BR-CYCLE-07: đóng chu kỳ bình thường khi mọi làn đã thả giống đều Harvested; làn Growing còn lại là "đóng sớm" | `LaneStateRules.cs:54-58` |
| Không còn bảng RaftLayoutVersions/LaneSegments: migration `RaftsV2` đã DROP chúng. Lịch sử thay đổi làn chỉ nằm trong audit `Raft.LanesChanged` | `Migrations/20261105161142_RaftsV2.cs:22-28`; `RaftService.cs:162-172` |
| SRS v8 đã bỏ "Write off lane segment"; BR-CYCLE-07 nói rõ làn Growing khi đóng sớm "không có loss record" | SRS dòng 270, 3425 |
| Concurrency: `RowVersionGuard` + `unitOfWork.MarkChanged(raft)` khi đổi làn | `RaftService.cs:122-146` |

=> Use case (3) "làn giữa bị đứt" CHƯA được xử lý ở bất kỳ tầng nào: không thể gỡ làn giữa, không có trạng thái hỏng, không có cách ghi mất giống.

### 0.2 Luồng đơn-lồng-kế hoạch của OMTS-223 (đã merge develop)

Tài liệu: `docs/cage-order-harvest.md:7-12, 24-26`.

| Phần đã có | Bằng chứng |
|---|---|
| Thương lái gửi `PurchaseRequest` (1 sản phẩm, `RequestedCages` nguyên, `PickupDate`) | `PurchaseRequest.cs:12-26` |
| Kế hoạch ngày làm `WorkDayPlan`: 1 bè (`RaftId` bắt buộc), 1 job type, `WorkDate`, người phụ trách (Owner hoặc Manager), liên kết 1-1 với request | `WorkDayPlan.cs:11-26`; `WorkDayPlanConfiguration.cs:17` (`WithOne`) |
| Số lồng/ngày nhận/ngày lấy nằm ở cấp REQUEST: `PlannedCages`, `WorkDate`, `PlannedPickupDate`, `CagesPerEmployeePerDay`, `StaffingNote` | `PurchaseRequest.cs:44-48` |
| Kiểm tra khi tạo: `Cages ≤ RequestedCages`, `CagesPerEmployeePerDay > 0`, `PickupDate ≥ WorkDate`; request phải AwaitingResponse/AwaitingStaff; trùng plan -> AlreadyExists | `WorkDayPlanService.cs:113-126` |
| Sau khi đã mời nhân viên: không sửa plan | `WorkDayPlanService.cs:97-98` |
| Mời ca: `PurchaseShiftInvitation` theo request/nhân viên; 1 người chỉ cam kết 1 đơn/ngày (unique `ReservedWorkDate`); cần `ceil(cages/20)` người đồng ý rồi Owner `accept` | `PurchaseShiftInvitation.cs`; `PurchaseStaffingService.cs:73-109, 275-287` |
| API: `GET/POST/PUT /api/work-plans`, `GET work-plans/purchase/{id}`, `GET responsibles`, `POST {id}/response`, `GET {id}/employees`, `POST {id}/assignments` | `WorkDayPlansController.cs:14-43` |
| Lô thu hoạch bắt buộc `PurchaseRequestId`; MỘT chuyến = MỘT bè; MỘT request gom lô của NHIỀU bè ("a request gathers the lots of every raft it needs") | `HarvestLot.cs:14, 48-52`; `cage-order-harvest.md:10` |
| `harvest-lots` của bè trả `orders[]` (đơn mở, bè nào được lên kế hoạch xếp trước: `PlannedOnRaft`) | `HarvestLotReadService.cs:94-105` |
| Chỉ ghi lô cho request Accepted, chưa `harvest-done`, chưa Fulfilled | `PurchaseRequestRules.cs:68-77` |
| `harvest-done` (+ clear) -> cân cảng theo lô của request -> hóa đơn | `cage-order-harvest.md:11-12` |
| Slice còn lại ghi rõ: "multiple raft plans, per-raft remaining-stock estimates ... pending" | `cage-order-harvest.md:26` |

### 0.3 Điều quan trọng cho thiết kế

1. "1 lô = nhiều lồng từ nhiều vùng" ĐÃ đúng ở tầng ghi nhận: nhiều `HarvestLot` (mỗi chuyến 1 bè) cùng trỏ vào 1 `PurchaseRequest`. Truy xuất vẫn lô -> bè -> vùng; QR là QR của HÓA ĐƠN và liệt kê mọi lô của hóa đơn (BR-TRACE-02, dòng 3440), nên đã gom nguồn nhiều vùng. KHÔNG cần đổi mô hình lô; "lô" theo cách nói của Owner = "đợt thu của đơn".
2. Phần THIẾU nằm ở khâu LẬP KẾ HOẠCH: plan 1-1 với request và 1 bè; không gợi ý bè phù hợp; không chia số lồng theo bè; không gắn nhân viên theo bè; không theo dõi tiến độ theo bè; không có liên kết sản phẩm-giống để lọc "loại hàu khách yêu cầu" (`Product` chỉ có tên/giá, `Product.cs:12-26`; giống là `FarmingInputItem` nhóm Seed, `FarmingInputItem.cs`).
3. Không có dữ liệu số lồng/kg trên làn (xác nhận SRS BR-FARM-03: "never estimates the kg"; `FARMING_BACKEND_RULES_REVIEW_2026-11-11.md` mục 1). Mọi "sẵn có" phải dựa vào số LÀN và số NGÀY từ thả giống.
4. Không có dự đoán "bao nhiêu ngày thu xong" trong mã hiện tại. Cái gần nhất là `PlannedPickupDate ≥ WorkDate` (`WorkDayPlanService.cs:123`) và `CagesPerEmployeePerDay`. Spec này giữ `workDate` = ngày thu và mặc định `pickupDate = workDate` (cùng ngày), bỏ mọi hiển thị/ý niệm "thu xong sau N ngày".

---

## A. Mô hình bè (Raft)

### A.1 Hình học (chốt chính xác)

Theo Owner: 1 làn = 2 dây thẳng dài; khoảng giữa 2 dây là lối thuyền đi thu hàu. Khớp SRS BR-FARM-02 ("làn là khoảng giữa hai dây chính kề nhau", đánh số 1..N).

```
Nhìn từ trên xuống. Chiều dài (L) chạy dọc dây. Chiều rộng (W) chạy ngang qua tất cả các làn.

        <------------------- L (m) ------------------->
 Làn 1  ═══════════ dây ═══════════════════════════════   ^
        ·············· lối thuyền đi ····················   |
        ═══════════ dây ═══════════════════════════════   |
 Làn 2  ═══════════ dây ═══════════════════════════════   |  W (m)
        ·············· lối thuyền đi ····················   |
        ═══════════ dây ═══════════════════════════════   v
```

| Đại lượng | Định nghĩa | Lưu ở |
|---|---|---|
| `lengthM` (chiều dài bè) | Kích thước theo hướng dây; là độ dài dây TỐI ĐA của bè | `Rafts.LengthM` |
| `widthM` (chiều rộng bè) | Kích thước vuông góc với dây, bề ngang toàn bộ bè (gồm mọi làn và lối thuyền) | `Rafts.WidthM` |
| `areaM2` (diện tích) | `round(lengthM x widthM, 2)`. Là diện tích mặt bằng bè, KHÔNG phải tổng chiều dài dây | `Rafts.AreaM2` (cột tính) |
| `lineLengthM` của làn | Độ dài dây của làn đó. NULL = kế thừa `lengthM` của bè. Phải `1 ≤ lineLengthM ≤ lengthM` | `Lanes.LineLengthM` |
| Khoảng cách giữa 2 dây / bước làn | KHÔNG lưu (Owner không yêu cầu; YAGNI). Chỉ có cảnh báo mềm ở A.3 | - |

Các làn CÓ THỂ dài khác nhau (làn sửa lại ngắn hơn, làn thay thế dài hơn) nhưng không quá `lengthM`. Diện tích KHÔNG suy ra từ độ dài từng làn (nếu suy ra thì cần bước làn, ta không có). Hiển thị phụ, dẫn xuất, không lưu: `Tổng dây = 2 x Σ lineLengthM` của làn InUse (mét dây đã dùng, hữu ích khi mua dây; nhãn "tổng chiều dài dây (2 dây mỗi làn)").

### A.2 Ánh xạ cột và migration dữ liệu

| Trường mới | Kiểu | Ghi chú |
|---|---|---|
| `Rafts.LengthM` | `decimal(7,2) NULL` | NULL chỉ cho bè cũ chưa parse được; sau đó bắt buộc ở tầng service (create/edit) |
| `Rafts.WidthM` | `decimal(7,2) NULL` | như trên |
| `Rafts.AreaM2` | `decimal(12,2)` cột TÍNH `AS CONVERT(decimal(12,2), ROUND(LengthM*WidthM,2)) PERSISTED` | không cho client gửi; NULL khi một trong hai NULL |
| `Lanes.LineLengthM` | `decimal(7,2) NULL` | CK: `LineLengthM IS NULL OR LineLengthM > 0` |
| `Rafts.Size` | giữ nguyên | server GHI LẠI = `"{L} m x {W} m"` mỗi lần lưu có `lengthM/widthM` (dấu chấm thập phân, như `raft-size.ts:composeRaftSize`); các client/báo cáo cũ vẫn đọc được |

Migration `20261112xxxxxx_RaftGeometry` (sau `20261111160000_SeedingSessionOverPlanReason`):
1. Thêm cột. 2. Backfill bằng SQL: chỉ khi `Size` khớp chính xác mẫu web ghi `"<số> m x <số> m"` (so khớp `LIKE '%[0-9] m x [0-9]%' AND RIGHT(Size,2)=' m'`, tách bằng `CHARINDEX(' m x ', Size)`, `TRY_CAST(... AS decimal(7,2))`); `LengthM` = số đầu (dài), `WidthM` = số sau (rộng), đúng quy ước web ("length x width", `raft-size.ts:1-3`). 3. Không khớp / ngoài miền -> để NULL, KHÔNG đoán, `Size` giữ nguyên. 4. Down: bỏ cột, `Size` còn nguyên nên không mất dữ liệu.
UI cho bè có `LengthM IS NULL`: dải cảnh báo "Chưa có chiều dài/rộng số. Nhập để tính diện tích" và hiện `Size` cũ nguyên văn. Báo cáo sau migration: số bè backfill được / không được (log vào audit `Raft.GeometryBackfilled`, một dòng tổng).

### A.3 Validation

| Trường | Quy tắc | Mã lỗi |
|---|---|---|
| `code` | giữ nguyên (bắt buộc, duy nhất trong vùng). Owner nói "tên/mã": dùng `code` làm tên/mã, KHÔNG thêm cột `Name` (xem D5) | hiện có |
| `lengthM` | bắt buộc từ nay, `1.00 ≤ x ≤ 500.00`, tối đa 2 chữ số thập phân | 400 MSG-GEN-01 field "Length" |
| `widthM` | bắt buộc, `1.00 ≤ x ≤ 200.00`, 2 chữ số thập phân | field "Width" |
| `areaM2` | tính, `≤ 100 000`; client không gửi (gửi thì bỏ qua) | - |
| `laneCount` | `1..200` (giữ `RaftLaneChange.MaxLaneCount`) | hiện có |
| `lanes[].lineLengthM` | `1.00 ≤ x ≤ lengthM`; NULL = theo bè. Hạ `lengthM` thấp hơn một override hiện có -> 400 field "Length" kèm `details.lanes:[số làn]` | field "Line length" |
| Cảnh báo mềm (`warnings[]` cùng cơ chế `RAFT_FAR_FROM_ZONE`, `FARMING_API_CONTRACT_2026-11-11.md` mục 6) | `RAFT_NARROW_FOR_LANES` khi `widthM / laneCountInUse < 1.0` (mỗi làn chưa tới 1 m bề ngang); `RAFT_LANE_LENGTHS_DIFFER` khi các làn InUse không cùng độ dài | không chặn |
| Tương thích | request cũ chỉ có `size` (không `lengthM/widthM`): vẫn nhận, `LengthM/WidthM` parse theo mẫu hoặc giữ NULL; có `lengthM/widthM` thì `size` bị ghi đè | - |

### A.4 API (mở rộng, không đổi đường dẫn)

`POST /api/zones/{zoneId}/rafts` và `PUT /api/rafts/{id}` (`RaftsController.cs`, `SaveRaftRequest` `RaftDtos.cs:10-18`) thêm:
```json
{ "code": "KV01-B01", "lengthM": 24.0, "widthM": 10.0, "laneCount": 6,
  "laneLengths": [ { "laneNumber": 3, "lineLengthM": 18.5 } ],   // tùy chọn; chỉ làn có override; null = trả về bè
  "latitude": null, "longitude": null, "location": null, "conditionNotes": null, "size": null, "rowVersion": "..." }
```
`RaftView` / `RaftListItem` thêm: `lengthM`, `widthM`, `areaM2`, `totalLineLengthM`, và `lanes[]` mỗi phần tử thêm `lineLengthM` (đã hiệu lực, không NULL), `lineLengthOverridden`, `isDamaged`, `generation` (xem B). Audit: `Raft.Created` (After kèm hình học), `Raft.Updated` (diff có `LengthM/WidthM`), `Raft.LaneLengthChanged` {lane, before, after}. Đổi số làn dùng lại `Raft.LanesChanged`.
Khóa đồng thời: như hiện nay (`RowVersionGuard` trên raft); sửa `laneLengths` cũng `MarkChanged(raft)`.
Quy tắc đổi chiều dài/rộng khi chu kỳ đang mở: ĐƯỢC (không ảnh hưởng truy xuất), vì chỉ là mô tả vật lý; ghi audit.

### A.5 Giao diện tạo/sửa bè (web)

Vị trí: `src/features/rafts-api/raft-create-dialog.tsx`, `raft-form-fields.tsx`, thay `raft-size-fields.tsx` và `raft-size.ts` (giữ `parseRaftSize` cho dữ liệu cũ).

```
Thêm bè mới - Vùng KV01
Mã/tên bè *        [ KV01-B04          ]   (đề xuất mã sẵn như hiện nay)
Chiều dài bè *     [ 24 ] m     Dây dài tối đa mỗi làn
Chiều rộng bè *    [ 10 ] m     Bề ngang toàn bộ bè
Diện tích          240 m²       (tự tính = dài x rộng, chỉ đọc, aria-live polite)
Số làn *           [-]  6  [+]      Mỗi làn = 2 dây, giữa là lối thuyền
Độ dài dây từng làn  (Mặc định 24 m)  [ Sửa từng làn v ]
 ┌ Sơ đồ làn (nhìn từ trên) ────────────────────────────┐
 │ 1 ████████████████████████  24 m                      │
 │ 2 ████████████████████████  24 m                      │
 │ 3 ████████████████████       18,5 m  [sửa]            │
 │ ...                                                   │
 └ Tổng dây: 2 x 138,5 = 277 m ──────────────────────────┘
 ! Mỗi làn chỉ rộng 0,9 m: kiểm tra lại chiều rộng bè.     (cảnh báo mềm)
[Hủy]                                         [Lưu bè]
```
Quy tắc UI: ô số dùng `UnitField` có sẵn (`@/components/form/number-fields`), `decimals=2`, min/max như A.3 (thay `max=9999` cũ `raft-size-fields.tsx:20`). Diện tích tính ở client để xem trước, giá trị lưu do server tính. Bộ +/- đổi `laneCount` (nhập tay cũng được); khi giảm, nếu bớt làn cuối có bản ghi -> hộp thoại giải thích và dùng luồng B (không im lặng). Sơ đồ: thanh ngang cho mỗi làn, độ dài thanh tỷ lệ `lineLengthM / lengthM`, nhãn số làn 1..N bên trái, làn InUse đặc, Removed gạch chéo/xám, Damaged đỏ + biểu tượng và chữ "Hỏng" (không chỉ màu), làn override có chấm. Sửa độ dài từng làn: bấm [sửa] hoặc dòng "Sửa từng làn" mở bảng 2 cột (Làn, Dài m) có nút "Đặt lại theo bè". Mobile 360 px: sơ đồ cuộn dọc, bảng thay thanh khi < 480 px. Bàn phím: +/- là nút, `Enter` lưu, focus ring thấy rõ; tiêu đề vùng `role="group"` "Sơ đồ làn". Đơn vị luôn hiển thị `m` và `m²`, định dạng `vi-VN`.
Trang chi tiết bè (`raft-detail-panel.tsx`, `raft-info-tab.tsx`): hiển thị `Dài x Rộng = Diện tích`, số làn InUse/Removed/Damaged, cùng sơ đồ làn hôm nay (`GET /api/rafts/{id}/lanes/today`, `RaftsController.cs:43`).

---

## B. Vòng đời làn và ca "làn giữa bị đứt/hỏng"

### B.1 Nguyên tắc thiết kế (và lý do)

1. SỐ LÀN KHÔNG BAO GIỜ ĐỔI, KHÔNG ĐÁNH SỐ LẠI (giữ BR-FARM-04). Lý do: truy xuất đi qua `LaneId` (seeding `SeedingRecordLane`, lô `HarvestLotLane`, kế hoạch), nhãn vật lý trên bè và chứng từ in ra tham chiếu số làn; đánh số lại làm sai nghĩa mọi bản ghi cũ.
2. LÀN = VỊ TRÍ VẬT LÝ trên bè (bè + số). Khi làn bị dựng lại cùng chỗ (thay thế), vẫn là CÙNG `LaneId`, nhưng là "thế hệ" (`Generation`) mới. Bản ghi thả giống/lô lưu thế hệ lúc ghi, nên truy xuất không bao giờ nối nhầm hàu của làn cũ với làn mới.
3. Không gỡ im lặng làn đang có hàu: phải qua "báo hỏng" hoặc "ghi mất giống" có lý do.
4. Không ước lượng kg/số lồng mất (không có dữ liệu). Chỉ ghi SỰ KIỆN + lý do + ảnh; số lượng mất do Owner nhập chữ (ghi chú), hệ thống không tính.

### B.2 Hai trục trạng thái + sự kiện

Trục 1 (lưu, đã có): `Lane.StatusId` = InUse | Removed.
Trục 2 (dẫn xuất, đã có, theo chu kỳ): NotSeeded | Growing | BeingHarvested | Harvested.
Mới:
- `Lane.IsDamaged` (bool, lưu): làn đang hỏng/đứt, chưa sửa xong.
- Trạng thái dẫn xuất mới `WrittenOff` (mất giống, kết thúc trong chu kỳ): làn có sự kiện `WrittenOff` trong chu kỳ cho thế hệ hiện tại.
- Sự kiện (bảng `LaneIncidents`, B.7): `Damaged`, `Repaired`, `WrittenOff`, `Replaced`, `Retired`, `Restored`.
"Repairing" KHÔNG là trạng thái riêng: làn `IsDamaged=true` kèm ghi chú "đang sửa" (xem D4). "Replaced" là SỰ KIỆN (kết quả: làn bình thường, thế hệ mới, NotSeeded). "Retired" = `StatusId=Removed`.

```
                         báo hỏng                         sửa xong
 [Bình thường] ───────────────────────► [HỎNG IsDamaged] ───────────────► [Bình thường]
   │  (NotSeeded/Growing/                    │   (trạng thái dẫn xuất không đổi,
   │   BeingHarvested/Harvested)             │    nhưng chặn thả giống/thu hoạch/
   │                                         │    đưa vào kế hoạch)
   │                                         ├── ghi mất giống ──► [MẤT GIỐNG WrittenOff]*  (kết thúc trong chu kỳ)
   │                                         ├── thay thế ───────► [Bình thường, thế hệ+1, NotSeeded]**
   │                                         └── gỡ (Retire) ────► [ĐÃ GỠ Removed]
   │ thay thế (làn Growing/BeingHarvested, cả khi chưa báo hỏng) ─► ** (tự ghi mất giống + thế hệ+1)
   │ gỡ làn NotSeeded/Harvested/WrittenOff, không nằm trong kế hoạch mở ─► [ĐÃ GỠ]
   └ gỡ làn Growing/BeingHarvested: chỉ qua "gỡ và ghi mất giống" (có lý do)

 [ĐÃ GỠ] ── thêm làn (khôi phục theo thứ tự số nhỏ trước) ──► [Bình thường, thế hệ+1, NotSeeded]
 * WrittenOff không thả giống lại được trong chu kỳ đó (giống quy tắc BR-CYCLE-02 cho Harvested); tính là "đã kết thúc" khi đóng chu kỳ.
 ** Làn Harvested/NotSeeded khi thay thế: chỉ ghi sự kiện + tăng thế hệ; trạng thái dẫn xuất giữ nguyên (không thả giống lại được nếu đã Harvested trong chu kỳ).
```

### B.3 Bảng quyết định (ca nào, làm gì, hậu quả)

Người thực hiện: Owner và Zone Manager của vùng chứa bè (cùng quyền ghi thu hoạch: `FARMING_API_CONTRACT` mục 3). Gỡ làn (Retire): chỉ Owner (giữ nguyên quyền sửa bè: Cooperative Owner API filter, `RaftService.cs:13`). Thêm/đổi độ dài làn: Owner.

| # | Trạng thái dẫn xuất lúc đó | Có trong kế hoạch thu hoạch mở? | Hành động | Cho phép? | Kết quả / lưu ý |
|---|---|---|---|---|---|
| 1 | NotSeeded (chưa từng/ chưa thả trong chu kỳ) | Không | Gỡ (Retire) ở giữa hoặc cuối | Có, kể cả khi chu kỳ đang mở | Làn -> Removed, giữ số, không đánh số lại; ghi `Retired` + audit. Không cần lý do bắt buộc (khuyến khích). |
| 1b | NotSeeded | Có (làn nằm trong dòng kế hoạch) | Gỡ | Không | 409 `LANE_IN_OPEN_PLAN` kèm mã đơn; phải bỏ làn khỏi kế hoạch trước |
| 2 | Growing | Không | Báo hỏng | Có (lý do bắt buộc, ảnh tùy chọn tối đa 3) | `IsDamaged=true`; giữ nguyên Growing; chặn thu hoạch/thả thêm/đưa vào kế hoạch; thông báo Owner (và Quản lý vùng) |
| 2 | Growing, `IsDamaged` | - | Sửa xong | Có | `IsDamaged=false`, sự kiện `Repaired` nối `ResolvesIncidentId`; trở lại nguyên trạng thái trước |
| 2 | Growing/BeingHarvested, `IsDamaged` | - | Ghi mất giống (WrittenOff) | Có, lý do bắt buộc, hỏi xác nhận | Trạng thái dẫn xuất = WrittenOff (kết thúc). Seed đã thả vẫn nằm trong tổng "seed hung" của chu kỳ và phiếu xuất dùng đã tạo (không hoàn kho). Ghi nhận mất giống KHÔNG có số lượng/giá trị (không có dữ liệu per-lane) |
| 2 | Growing/BeingHarvested | - | Thay thế (dựng lại cùng chỗ) | Có, lý do bắt buộc | Tự ghi mất giống nếu còn giống; `Generation+1`; `IsDamaged=false`; trạng thái = NotSeeded; được thả giống lại kể cả sau khi đã "hoàn tất thả giống" (làn NotSeeded luôn được, BR-CYCLE-02). Các lô ĐÃ ghi của thế hệ cũ giữ nguyên |
| 2 | Growing | - | Gỡ (Retire) | Chỉ qua "gỡ và ghi mất giống" (`confirmWriteOff:true` + lý do) | Một giao dịch: WrittenOff rồi Removed. Thiếu cờ -> 409 `LANE_HAS_SEED` {state, seedLotCodes[]} |
| 2 | BeingHarvested (đã có lô, chưa đánh dấu xong) | Không | Báo hỏng | Có | Giữ các lô đã ghi (chúng là lịch sử, KHÔNG sửa); từ nay chặn lô mới trên làn. Phần hàu còn lại: Owner chọn "ghi mất giống" hoặc "đánh dấu thu xong" (endpoint `finish-harvest` hiện có) |
| 3 | Growing/BeingHarvested | Có (làn gắn dòng KH) | Báo hỏng / ghi mất giống / thay thế | Có (thực tế thắng) | Không chặn. Dòng KH bị gắn cờ `blocked` (dẫn xuất), thông báo Owner "đơn PR-x thiếu làn", Owner điều chỉnh KH (xem C.9 và D). Chỉ **gỡ** mới bị chặn (1b) |
| 4 | Harvested | Không | Báo hỏng/sửa/thay thế | Có (chỉ ghi sự kiện + thế hệ) | Trạng thái dẫn xuất giữ Harvested, không thả lại trong chu kỳ này. Dùng để ghi sửa chữa giữa 2 chu kỳ |
| 4 | Harvested hoặc WrittenOff | Không | Gỡ | Có | Removed, giữ lịch sử |
| 5 | bất kỳ | - | Chu kỳ đã đóng | Báo hỏng/sửa/thay thế/gỡ NotSeeded-Harvested-WrittenOff: có (không ảnh hưởng chu kỳ đã đóng); các bản ghi của chu kỳ đã khóa (BR-CYCLE-04) không đổi |
| 6 | - | - | Thêm làn | Có, kể cả khi có chu kỳ mở (nới BR-FARM-04, xem D1) | Khôi phục làn Removed số nhỏ nhất trước (kèm `Generation+1`, sự kiện `Restored`), rồi tạo số mới ở cuối |
| 7 | - | - | Thêm "ở giữa" | Không có khái niệm | Vị trí giữa chỉ có được bằng cách khôi phục một làn đã gỡ ở giữa (đúng số cũ, đúng chỗ cũ). Không chèn số mới vào giữa, không đánh số lại |

### B.4 Tác động lên chu kỳ, thu hoạch, truy xuất, kho, QR

| Hạng mục | Quy tắc |
|---|---|
| Tổng chu kỳ (BR-CYCLE-06) | "Seed hung" vẫn là tổng các phiên (giống đã thực sự thả). "Kg harvested" không đổi. Bản tóm tắt thêm khối "Làn hỏng/mất giống/thay thế" (số làn, lý do, ngày) bên cạnh danh sách "làn chưa thu" khi đóng sớm |
| Đóng chu kỳ bình thường (BR-CYCLE-07) | `EverySeededLaneHarvested`: làn WrittenOff được tính là ĐÃ KẾT THÚC (cùng với Harvested), nếu không chu kỳ có làn mất giống sẽ luôn phải "đóng sớm". Sửa `LaneStateRules.EverySeededLaneHarvested`. Cần ít nhất 1 làn Harvested hoặc... giữ điều kiện "có ≥1 phiên thả giống" như hiện nay |
| Phiên thả giống (`SeedingRecord`) | Không xóa/sửa tự động. `SeedingRecordLane` lưu thêm `LaneGeneration`. Phiên cũ của thế hệ cũ vẫn nằm trong chu kỳ và tổng giống |
| Lô thu hoạch (`HarvestLot`) | Lô đã ghi KHÔNG đổi. `HarvestLotLane` lưu `LaneGeneration` lúc ghi. Lô đã bán/đã công bố vẫn truy xuất đúng |
| Truy xuất ngược (BR-TRACE-03) | Từ lô -> làn -> CHỈ các phiên thả giống cùng `LaneGeneration` với dòng làn đó trong lô, rồi tới phiếu nhập và nhà cung cấp. Giống đã chết ở thế hệ cũ không bao giờ xuất hiện ở lô thế hệ mới. BR-TRACE-01 kiểm tra "làn có phiên thả giống có seed lot" cũng theo cùng thế hệ |
| QR/hóa đơn | Không đổi. QR theo hóa đơn, liệt kê lô; lô không bị thay đổi nên không cần công bố lại |
| Kho/chi phí | Seed đã xuất dùng khi thả (phiếu `XD`) KHÔNG hoàn nhập; đây là hao hụt. Muốn ghi vật tư sửa dây thì dùng "Vật tư sửa chữa" (CYCLE-03, `POST /api/rafts/{id}/material-usages`); form báo hỏng/thay thế có link "Ghi vật tư đã dùng" mở form đó với `reason` điền sẵn. Chi phí vật tư theo BR-FARM-05 không đổi |
| Thông báo (Owner + Zone Manager có quyền ở vùng; dùng cùng hạ tầng như `PurchaseRequestNotifications.cs`) | `LANE_DAMAGED`, `LANE_WRITTEN_OFF`, `LANE_REPLACED` (một thông báo/sự kiện). Khi làn nằm trong dòng KH mở: thêm `HARVEST_PLAN_LANE_BLOCKED` tới người phụ trách kế hoạch và Owner |
| Audit | `Lane.Damaged`, `Lane.Repaired`, `Lane.WrittenOff`, `Lane.Replaced`, `Lane.Retired`, `Lane.Restored`, `Raft.LaneLengthChanged`; mỗi cái có Before/After {state, isDamaged, generation, status} và lý do |
| Lịch sử thay đổi bố cục (thay "layout version") | Không dựng lại bảng phiên bản (đã bị DROP ở RaftsV2). Lịch sử = `LaneIncidents` (sự kiện từng làn, có lý do/ảnh) + audit. API: `GET /api/rafts/{id}/lane-history?laneNumber=` trả mảng sự kiện theo thời gian; hiển thị ở tab "Lịch sử làn" |
| Đồng thời | Mọi lệnh làn nhận `rowVersion` của RAFT; nếu lệnh đổi trạng thái chu kỳ (ghi mất giống, thay thế, finish) thì nhận thêm `cycleRowVersion` và `MarkChanged(cycle)` như `finish-harvest` (`FARMING_BACKEND_RULES_REVIEW` P1). Sai phiên bản -> 409 MSG06 (stale) |

### B.5 API vòng đời làn (mới, bộ lệnh nhỏ; `Raft`-level controller mới `RaftLanesController.cs`, KHÔNG sửa `RaftsController` trừ lối route)

Tất cả body có `rowVersion` (raft), `reason`, tùy chọn `note` (≤ 500), `reasonCode` (`LineBroken`, `BuoyDamaged`, `Storm`, `MassMortality`, `Other`), ảnh gửi bằng `POST /api/rafts/{id}/lanes/{n}/incidents/{incidentId}/photos` (max 3, giống `RaftPhoto`), trả 201.

| Method + đường dẫn | Body chính | Trả | Lỗi |
|---|---|---|---|
| `POST /api/rafts/{raftId}/lanes/{n}/report-damage` | `{reason*, reasonCode, note, rowVersion}` | `LaneIncidentSaved {incident, lane, affectedPlans:[{requestCode, lineId}], message, messageCode}` | 404 làn/bè không tồn tại hoặc Removed; 409 MSG-GEN-09 bè/vùng không InUse; 409 `LANE_ALREADY_DAMAGED` (idempotent: trả 200 `changed:false`); 403 |
| `POST .../repair-done` | `{note, rowVersion}` | như trên | 409 `LANE_NOT_DAMAGED` |
| `POST .../write-off` | `{reason*, confirm:true*, rowVersion, cycleRowVersion}` | như trên, `state:"WrittenOff"` | 409 `LANE_NO_SEED` (không có giống để ghi mất); 409 MSG-GEN-09 không có chu kỳ mở; 409 `confirm_required` {seedLotCodes[]} |
| `POST .../replace` | `{reason*, lineLengthM?, rowVersion, cycleRowVersion}` | như trên, `generation` mới, `state:"NotSeeded"` | 409 MSG-GEN-09 |
| `POST .../retire` | `{reason, confirmWriteOff?, rowVersion, cycleRowVersion}` | `RaftSaved` (raft đã cập nhật) | 409 `LANE_HAS_SEED`; 409 `LANE_IN_OPEN_PLAN` {plans[]}; 409 `LANE_IS_ONLY_ONE` (không gỡ làn InUse cuối cùng; bè phải còn ≥ 1 làn InUse, khớp `laneCount ≥ 1`) |
| `PUT .../length` | `{lineLengthM|null, rowVersion}` | `RaftSaved` | 400 field "Line length" |
| `GET /api/rafts/{raftId}/lane-history?laneNumber=` | - | `{incidents:[{id, laneNumber, kind, generation, occurredAt, byAccount, byRole, reason, reasonCode, note, photos[], resolvesIncidentId}]}` | - |

`GET /api/rafts/{id}/lanes/today` (`RaftsController.cs:43`) và `GET /api/rafts/{raftId}/harvest-lots` (`lanes[]`) thêm: `isDamaged`, `generation`, `state` có giá trị `WrittenOff`, `lineLengthM`; `reasonCode` mới `LaneDamaged`, `LaneWrittenOff` (khi `canHarvest=false`); `HarvestLotsScreen.Lanes[].canHarvest=false` cho cả hai. Ghi lô/thả giống trên làn hỏng -> 400 field "Lanes" (cùng cách từ chối làn Harvested).
Quy tắc thả giống mới: `SeedingRules`: làn phải InUse, `!IsDamaged`, state NotSeeded hoặc (Growing và chưa hoàn tất); ngày thả `≥ Lane.GenerationStartedOn`.

### B.6 Thay đổi `RaftService.UpdateAsync` (laneCount)

- Thêm làn khi có chu kỳ mở: bỏ chặn (`RaftService.cs:127-131`) CHO THÊM; làn mới/khôi phục là NotSeeded nên vô hại. (D1.)
- Giảm `laneCount`: chỉ gỡ cuối; áp dụng đúng các điều kiện của B.3 cho từng làn bị gỡ; nếu có làn không đủ điều kiện -> 409 `LANE_NOT_REMOVABLE` {lanes:[{n, reason}]} (không gỡ phần nào). UI chuyển người dùng sang menu từng làn.
- Gỡ làn giữa chỉ qua `retire`.

### B.7 Dữ liệu (migration `20261112xxxxxx_LaneIncidents`)

| Bảng/cột | Mô tả |
|---|---|
| `Lanes.IsDamaged bit NOT NULL DEFAULT 0`, `Lanes.Generation int NOT NULL DEFAULT 0`, `Lanes.GenerationStartedOn date NULL` | |
| `SeedingRecordLanes.LaneGeneration int NOT NULL DEFAULT 0`; `HarvestLotLanes.LaneGeneration int NOT NULL DEFAULT 0` | backfill 0 (mọi dữ liệu cũ là thế hệ 0). Ghi mới luôn copy `Lane.Generation` (tại `SeedingSessionWriter`, `HarvestLotRecordingService`, và các chỗ sửa/trace-correction giữ nguyên thế hệ của dòng cũ) |
| `LaneIncidents` | `Id, LaneId FK, CycleId FK null, Kind tinyint (1 Damaged,2 Repaired,3 WrittenOff,4 Replaced,5 Retired,6 Restored), Generation int (thế hệ SAU sự kiện), OccurredAt datetimeoffset, OccurredOn date (UTC+7), ReasonCode tinyint null, Reason nvarchar(500) null, Note nvarchar(500) null, StateBefore nvarchar(20), RecordedByAccountId, ResolvesIncidentId null, RowVersion`. CK: Kind 1,3,4 yêu cầu `Reason` không rỗng. Index `(LaneId, OccurredAt)`, unique lọc `(LaneId, CycleId, Generation) WHERE Kind=3` (mỗi thế hệ chỉ ghi mất giống một lần) |
| `LaneIncidentPhotos` | `IncidentId, SortOrder, StoragePath` giống `RaftPhoto` (tối đa 3, cùng service lưu tệp) |
| `LaneStateRules.StatesOn(...)` | thêm tham số incidents; chỉ tính phiên/lô cùng `Lane.Generation` hiện hành; trả `WrittenOff` nếu có `Kind=3` cho (lane, cycle, generation hiện hành). Thêm unit test bảng chân trị cho mọi tổ hợp |
| Phục hồi dữ liệu tồn tại | migration không cần data fix (mặc định 0). Down: bỏ cột/bảng (mất lịch sử sự kiện; cảnh báo trong ghi chú migration) |

---

## C. Kế hoạch thu hoạch theo đơn (mở rộng luồng OMTS-223)

### C.1 Luồng nghiệp vụ (cùng ngày, không "ước lượng số ngày")

```
Thương lái gửi đơn (sản phẩm, N lồng, ngày lấy)        [có sẵn]
  └─► Owner mở "Kế hoạch thu hoạch" của đơn
        1. Chọn ngày thu (mặc định = ngày lấy, thường hôm nay)         [workDate; pickupDate = workDate]
        2. Hệ thống GỢI Ý bè phù hợp (xem C.4)                          [MỚI]
        3. Owner chọn các bè (nhiều vùng) + số lồng từ mỗi bè           [MỚI: nhiều dòng]
           Tổng số lồng các dòng phải = hoặc ≥ số lồng đơn (xem C.3)
        4. Chọn người phụ trách; mời nhân viên và gắn từng người vào 1 bè  [mở rộng]
        5. Nhân viên nhận/từ chối ca; đủ ceil(tổng lồng / 20) người -> Owner Accept đơn   [có sẵn]
        6. Thu hoạch: mỗi chuyến = 1 lô của 1 bè, gắn đơn              [có sẵn]; tiến độ từng bè và tổng [MỚI]
        7. Owner "Thu xong" (harvest-done) -> cân cảng -> hóa đơn + QR   [có sẵn]
```
Bỏ khỏi UI/ngữ nghĩa: "xong bao nhiêu lồng trong bao nhiêu ngày". `CagesPerEmployeePerDay` giữ nguyên là quy tắc nhân sự (mặc định 20, `PurchaseStaffingService`), chỉ dùng để tính số người cần, KHÔNG dùng suy ra thời gian.

### C.2 Mô hình dữ liệu: ĐỊNH NGHĨA lại "plan" theo hướng mở rộng, không viết lại

Giữ nguyên `WorkDayPlan` làm "tiêu đề kế hoạch" 1-1 với request (đã được `PurchaseStaffingService` gọi ở 8 chỗ qua `plans.ForPurchaseAsync`: dòng 38, 54, 64, 155, 168, 189, 229, 239; đổi sang 1-n sẽ vỡ hàng loạt và xung đột với đồng đội). Thêm bảng DÒNG kế hoạch:

| Bảng mới | Cột |
|---|---|
| `HarvestPlanLines` | `Id, WorkDayPlanId FK, PurchaseRequestId FK (copy để truy vấn), RaftId FK, PlannedCages int > 0, IsAdHoc bit (dòng tự thêm lúc thu, plannedCages=0 cho phép), Note nvarchar(300) null, CreatedAt/By, RowVersion`. Unique `(PurchaseRequestId, RaftId)`. CK `PlannedCages >= 0` |
| `HarvestPlanLineLanes` | `LineId, LaneId` (tùy chọn: "làn dự kiến", gợi ý chứ không giữ chỗ). PK `(LineId, LaneId)` |
| `PurchaseShiftInvitations.PlanLineId` | `uniqueidentifier NULL` FK -> `HarvestPlanLines`: nhân viên được mời làm ở bè nào. NULL = chưa gắn (đơn cũ) |
| `ProductSeedItems` | `ProductId, SeedItemId` (giống `FarmingInputItem` nhóm Seed), PK ghép; nhiều-nhiều |

Quy ước tương thích:
- `WorkDayPlan.RaftId` (bắt buộc) = bè của dòng có số lồng lớn nhất (hòa: dòng đầu theo thứ tự nhập). Là "bè chính" cho các màn cũ (`HarvestLotReadService.cs:102` dùng `WorkDayPlan.RaftId == raftId` để đặt `PlannedOnRaft`; ta đổi nó dùng dòng kế hoạch: `lines.Any(l => l.RaftId == raftId)`).
- `PurchaseRequest.PlannedCages` = tổng `PlannedCages` các dòng (server giữ đồng bộ trong cùng giao dịch). `WorkDate`, `PlannedPickupDate`, `CagesPerEmployeePerDay` giữ ở request như hiện nay.
- Plan cũ (1 bè): migration backfill 1 dòng `HarvestPlanLines` từ mỗi `WorkDayPlan` có `PurchaseRequestId` (RaftId, `PlannedCages = request.PlannedCages ?? 0`), và gắn `PlanLineId` cho các lời mời hiện có. Request chưa có kế hoạch giữ nguyên.
- Người phụ trách: giữ 1 người cho cả kế hoạch (`WorkDayPlan.ResponsibleAccountId`). Quản lý chỉ làm người phụ trách khi có quyền `WorkAssignments Create` ở TẤT CẢ vùng của các dòng (`WorkDayPlanService.cs:153` kiểm tra theo vùng của bè); kế hoạch trải nhiều vùng mà không có Quản lý nào đủ phạm vi -> chỉ Owner tự phụ trách (UI chỉ liệt kê các `responsibles` hợp lệ; `GET responsibles` nhận danh sách `raftIds`).

### C.3 Quy tắc số lồng

| Quy tắc | Giá trị |
|---|---|
| Mỗi dòng | `PlannedCages` nguyên `1..RequestedCages` (kế hoạch đếm lồng nguyên như đơn; lô thực tế vẫn thập phân 0,01) |
| Tổng | `Σ PlannedCages ≥ AcceptedCages ?? RequestedCages` -> hợp lệ. `<` -> vẫn lưu được ở trạng thái nháp nhưng không gửi mời (409 `PLAN_UNDER_COVERED` {required, planned}) vì Owner muốn "đủ số lồng yêu cầu". Dư ≤ 20% so với đơn: cảnh báo mềm `PLAN_OVER_COVERED` (không chặn; dư để dự phòng); dư > 20%: 400 |
| Số người | `ceil(tổng PlannedCages / CagesPerEmployeePerDay)` (giữ nguyên `PurchaseStaffingService`); cảnh báo mềm theo dòng: số người gắn dòng < `ceil(line / 20)` |
| Chọn bè | một bè chỉ một dòng/đơn; bè phải InUse, vùng InUse, có chu kỳ Open, ≥ 1 làn đủ điều kiện thu (Growing/BeingHarvested, không hỏng, không WrittenOff) |

### C.4 Gợi ý bè phù hợp (mới)

Endpoint: `GET /api/purchase-requests/{id}/harvest-suggestions?workDate=YYYY-MM-DD&zoneIds=&minDaysSinceSeeding=`. Quyền: Owner.
Lọc cứng: bè InUse, vùng InUse, chu kỳ Open, ≥ 1 làn `canHarvest` (không hỏng, không WrittenOff, state Growing/BeingHarvested), và làn đó không nằm trong dòng kế hoạch KHÁC có cùng `workDate` (làn không bị hai đơn giành cùng ngày; dùng `HarvestPlanLineLanes`).
Khớp loại hàu: nếu `Product` của đơn có `ProductSeedItems`, bè được giữ khi MỘT làn đủ điều kiện có phiên thả giống (cùng thế hệ) mà `SeedLotLine.item ∈ ProductSeedItems`; `matchBasis:"SEED_ITEM"`. Không có ánh xạ -> không lọc, `matchBasis:"NONE"` + dòng giải thích "Sản phẩm chưa gắn giống; hiển thị mọi bè đang nuôi." (không đoán). Ghi chú của khách (`PurchaseRequest.Note`, ví dụ "hàu to") hiển thị nguyên văn cạnh gợi ý, không phân tích.

Chỉ số trung thực (KHÔNG kg, KHÔNG số lồng còn lại ước lượng):
```json
{ "request": { "id": "...", "code": "PR-0012", "productName": "Hàu sữa", "requestedCages": 100, "workDate": "2026-11-13",
               "matchBasis": "SEED_ITEM", "productSeedItems": [ { "id": "...", "name": "Giống hàu sữa" } ] },
  "items": [ {
      "raftId": "...", "raftCode": "KV01-B01", "zone": { "id": "...", "code": "KV01", "name": "..." },
      "cycleId": "...", "cycleExpectedHarvestDate": "2026-11-20",
      "lanes": { "inUse": 6, "growing": 3, "beingHarvested": 1, "harvested": 1, "notSeeded": 1, "damaged": 0, "writtenOff": 0, "eligible": 4 },
      "eligibleLaneNumbers": [1,2,3,5],
      "daysSinceSeeding": { "min": 118, "max": 152, "oldestSeedingDate": "2026-06-14" },
      "seedItems": [ { "id": "...", "name": "Giống hàu sữa", "seedLotCodes": ["PN000001-1"] } ],
      "matchesProduct": true,
      "cyclesHarvestedCages": 6.00,
      "plannedElsewhere": { "cages": 20, "requests": ["PR-0010"] },
      "zoneWaterAlert": false,
      "warnings": [ ] } ],
  "note": "Hệ thống không biết số lồng còn trên mỗi làn. Số làn và số ngày nuôi là dữ liệu thật; số lồng do Owner quyết định." }
```
Giải thích từng chỉ số (đều có nguồn thật): làn theo `LaneStateRules`; `daysSinceSeeding` từ ngày các phiên thả giống cùng thế hệ; `cyclesHarvestedCages` = tổng `CageCount` lô của chu kỳ mở (đã có ở `HarvestLotsScreen.harvestedCages`); `plannedElsewhere` = tổng `PlannedCages` của các dòng khác (đơn mở, `workDate ≥ hôm nay`) - chỉ để Owner tự cân nhắc; `zoneWaterAlert` = cảnh báo nước hiện có của vùng (BR-WATER-04) làm "điều kiện". Sắp xếp mặc định: bè khớp giống trước, rồi `daysSinceSeeding.max` giảm dần, rồi số làn eligible giảm dần; không có điểm "sẵn sàng" tự chế. Bộ lọc `minDaysSinceSeeding` do người dùng nhập (không đặt ngưỡng cứng; xem D6).

### C.5 API kế hoạch (mở rộng `/api/work-plans`, thêm 1 route gợi ý + 1 route tiến độ)

`SaveWorkDayPlan` hiện: `(RaftId, JobTypeId, WorkDate, ResponsibleAccountId, ClientOperationId, PurchaseRequestId?, Cages?, CagesPerEmployeePerDay?, PickupDate?, Note?, RowVersion?)` (`SaveWorkDayPlan.cs`). Thêm trường tùy chọn `Lines`:

```json
POST /api/work-plans        (PUT /api/work-plans/{id} giống, thay toàn bộ lines)
{ "purchaseRequestId": "...", "jobTypeId": "...", "workDate": "2026-11-13", "pickupDate": "2026-11-13",
  "responsibleAccountId": "...", "cagesPerEmployeePerDay": 20, "clientOperationId": "...", "note": null,
  "lines": [ { "raftId": "A", "cages": 60, "laneNumbers": [1,2] },
             { "raftId": "B", "cages": 40 } ],
  "rowVersion": "..." }
```
- Có `lines`: `raftId` và `cages` ở gốc bị bỏ qua, server đặt `RaftId` = bè chính, `Cages` = Σ. Không có `lines` (client cũ): tạo 1 dòng từ `raftId`/`cages` (tương thích ngược hoàn toàn; test cũ không đổi).
- `WorkDayPlanView` thêm `lines:[{ id, raftId, raftCode, zoneId, zoneCode, plannedCages, harvestedCages, lotCount, laneNumbers, employees:[{ employeeId, name, approved }], status }]`, `plannedCagesTotal`, `harvestedCagesTotal`, `remainingCages` (= max(0, yêu cầu − đã thu), chỉ số học trên lô thật).
- Sau khi đã mời nhân viên (hiện bị khóa hoàn toàn, `WorkDayPlanService.cs:97-98`): cho phép (a) dời số lồng giữa các dòng nếu tổng không đổi; (b) thêm dòng mới; (c) xóa dòng chưa có nhân viên và chưa có lô. Khác -> 409 `PLAN_LOCKED`. Đổi gì trên dòng đã có nhân viên -> thông báo họ.
- Gắn nhân viên: `POST /api/work-plans/{id}/assignments` nhận thêm `lines:[{ raftId, employeeIds }]` (tập hợp = `employeeIds` hiện tại; mỗi nhân viên đúng 1 dòng). Hợp lệ cũ (`employeeIds` phẳng) vẫn dùng được, `PlanLineId` để NULL.
- `GET /api/purchase-requests/{id}/harvest-suggestions` (C.4).
- Tiến độ nằm trong `PurchaseHarvestView` của `GET /api/purchase-requests/{id}` (detail Accepted): thêm `plan:{ lines[] như trên, plannedCagesTotal, harvestedCagesTotal }` cạnh `lots[]` hiện có. Không cần endpoint riêng.
- Ghi lô (`POST /api/rafts/{raftId}/harvest-lots`, giữ nguyên `purchaseRequestId`): nếu đơn có kế hoạch mà bè KHÔNG có dòng -> 409 `confirm_required` `RAFT_NOT_IN_PLAN` (cờ `confirmUnplannedRaft`), xác nhận thì tự tạo dòng `IsAdHoc=true, PlannedCages=0`. Cộng dồn lô vào dòng theo `(PurchaseRequestId, RaftId)` (không cần FK từ lô tới dòng). Vượt kế hoạch: tổng lô của dòng > `PlannedCages` -> cảnh báo mềm `LINE_OVER_PLAN` trong `warnings`; tổng đơn > `AcceptedCages` -> cảnh báo mềm `REQUEST_OVER_ACCEPTED` (hiện không có kiểm tra này trong `Features/Harvest`: grep `AcceptedCages` chỉ thấy DTO).

Lỗi/Cảnh báo mới (đều theo hình `problem` hiện có, mã chữ + `details`): `PLAN_UNDER_COVERED`, `PLAN_OVER_COVERED` (warning), `PLAN_LOCKED`, `PLAN_DUPLICATE_RAFT` (400), `RAFT_NOT_PLANNABLE` (400 + lý do: NoOpenCycle/NoEligibleLane/NotInUse/ZoneNotInUse), `LANE_IN_OPEN_PLAN`, `LANE_ALLOCATED_SAME_DAY` (409, làn nằm ở dòng của đơn khác cùng `workDate`), `RAFT_NOT_IN_PLAN`, `LINE_OVER_PLAN` (warning), `REQUEST_OVER_ACCEPTED` (warning). Tái dùng `AppError.Invalid`, `AppError.AlreadyExists` như `WorkDayPlanService.cs`.

Trạng thái: KHÔNG thêm trạng thái cho request/plan (giữ `S.AwaitingStaff`, `Accepted`...). Trạng thái dòng DẪN XUẤT: `NotStarted` (0 lô), `InProgress` (0 < đã thu < kế hoạch), `Done` (đã thu ≥ kế hoạch), `Blocked` (bè mất chu kỳ mở/không InUse hoặc mọi làn dự kiến hỏng/WrittenOff), `Closed` (đơn Cancelled/Declined hoặc `harvest-done`).

Thông báo mới (hạ tầng `Features/Notifications`): kế hoạch gửi -> nhân viên mời (đã có, nay kèm tên bè); dòng bị `Blocked` -> Owner + người phụ trách; đơn hủy khi đã thu một phần -> Owner + nhân viên + người phụ trách; nhân viên từ chối làm thiếu người -> người phụ trách (đã có một phần, `PurchaseStaffingService.cs:151`).
Quyền: Owner lập/sửa (như `SaveAsync`, `WorkDayPlanService.cs:76`); Quản lý/nhân viên xác nhận như hiện nay (`RespondAsync`, `EmployeesAsync`, `AssignAsync`); Quản lý vùng chỉ thấy dòng thuộc vùng mình (`WorkPlanAccessService.CanViewAsync` mở rộng theo dòng; Owner thấy tất cả).

### C.6 "1 lô = nhiều lồng từ nhiều vùng" mà không phá truy xuất

Khuyến nghị: GIỮ `HarvestLot` = một chuyến một bè (BR-HARVEST-03) và coi "đợt thu của đơn" là nhóm theo `PurchaseRequestId` (đã có `HarvestLot.PurchaseRequestId`). Lý do:
- Truy xuất cần lô -> bè -> làn -> giống; một lô chứa lồng của nhiều bè sẽ không còn gán được nguồn từng lồng và buộc phải ghi số lồng theo bè bên trong lô (phình schema, vỡ BR-HARVEST-03/05, mã lô `KV01-B01-20261026`).
- Hóa đơn/QR đã gom nhiều lô nhiều vùng (BR-TRACE-02), cân cảng đã theo lô của đơn (`cage-order-harvest.md:12`). Nên "một QR liệt kê mọi nguồn" ĐÃ đạt được ở mức hóa đơn.
- Chênh với SRS: KHÔNG chênh BR-HARVEST-03 (giữ). Chỉ bổ sung hiển thị: "Đợt thu của đơn" = tổng hợp (tổng lồng, số bè, số vùng, danh sách mã lô) trên màn đơn; thêm vào `docs/SRS_DEVIATIONS.md` như mở rộng của SALE/HARVEST (kế hoạch nhiều bè là việc mới không có trong SRS v8: UC "Plan harvest" đã bị bỏ, `SRS_DEVIATIONS.md` dòng FARM-03). Chênh thực sự với SRS là: (1) kế hoạch thu hoạch theo đơn có dòng bè; (2) liên kết sản phẩm-giống. Cần Owner xác nhận (D7).

### C.7 Màn hình web

Vị trí: trang chi tiết đơn `src/app/(app)/operations/purchase-requests/[id]/page.tsx` -> `PurchaseRequestDetailPage` trong `src/features/operations/new-module-screens.tsx` (đã có). Thêm feature mới `src/features/harvest-plan/` (file nhỏ, < 200 dòng/tệp): `harvest-plan-panel.tsx` (khung trong trang đơn), `harvest-plan-builder.tsx`, `harvest-plan-suggestions.tsx`, `harvest-plan-line-row.tsx`, `harvest-plan-progress.tsx`, `harvest-plan-contracts.ts`, `use-harvest-plan.ts`. Tên khác `cultivation-api/harvest-plan-summary.tsx` (đó là kế hoạch CHU KỲ: `TargetYieldKg`); đổi nhãn UI: "Kế hoạch chu kỳ" (kg mục tiêu) và "Kế hoạch thu cho đơn" để khỏi nhầm.

Danh sách đơn (đã có) thêm cột "Kế hoạch": `Chưa lập` / `3 bè - 100/100 lồng` / `Đã thu 60/100`.

Trình lập kế hoạch:
```
Đơn PR-0012  Hàu sữa  100 lồng  Lấy 13/11/2026  Khách: Nguyễn Thị Hương
Ghi chú của khách: "Xin lấy hàng sáng sớm ở cảng Cái Rồng"
Ngày thu [13/11/2026]   Người phụ trách [Owner v]   Công việc [Thu hoạch v]
─ Bè phù hợp (khớp giống: Giống hàu sữa) ──────────────────── [Lọc: vùng v] [Nuôi tối thiểu __ ngày]
 ☐ KV01-B01  KV01   4/6 làn thu được  nuôi 118-152 ngày  đã thu 6 lồng      Đang chờ: PR-0010 20 lồng
 ☑ KV02-B03  KV02   3/5 làn thu được  nuôi 130 ngày       ! cảnh báo nước    [Chọn]
 ☐ KV01-B02  KV01   không có làn thu được (1 hỏng)                              [Không chọn được]
 Hệ thống không biết số lồng còn trên mỗi làn: bạn quyết định số lồng.
─ Kế hoạch ─────────────────────────────────────────────────
 Bè        Số lồng      Làn dự kiến (tùy chọn)   Nhân viên              
 KV01-B01  [ 60 ]       1,2,3                    Lan, Hùng, Minh [Chọn]   [Xóa]
 KV02-B03  [ 40 ]       -                        Tuấn, Hoa [Chọn]         [Xóa]
 Tổng 100/100 lồng. Cần 5 người, đã chọn 5.                [Lưu kế hoạch]  [Gửi mời ca]
```
Tiến độ (sau khi Accepted, trong cùng panel):
```
Đã thu 70/100 lồng · còn 30            [Thu xong]
 KV01-B01  60 kế hoạch  ██████████  60 thu  Xong   3 lô (KV01-B01-20261113, -2, -3)
 KV02-B03  40 kế hoạch  ███▌░░░░░░  10 thu  Đang thu   [Ghi lô thu]  Nhân viên: Tuấn ✓, Hoa ✓
```
Tích hợp form ghi lô (`cultivation-api/records-harvest-form.tsx`, `harvest-lane-choices.tsx`): danh sách "đơn" hiện có (`orders[]`) hiện thêm "Kế hoạch bè này: 40 lồng, đã thu 10"; làn hỏng/mất giống hiện disabled với lý do theo `reasonCode` (LaneDamaged/LaneWrittenOff). Trạng thái UI bắt buộc: skeleton khi tải gợi ý, rỗng ("Không có bè phù hợp: kiểm tra chu kỳ/giống"), lỗi, đang lưu, offline, xung đột phiên bản (MSG06: nút "Tải lại"), từ chối quyền. Mobile 360 px: mỗi bè là thẻ, nút chọn ≥ 44 px, không bảng ngang. Ngôn ngữ: tiếng Việt; đơn vị "lồng". Không panel giải thích phát triển (quy tắc dự án `AGENTS.md`).

### C.8 Xung đột/rủi ro với code của đồng đội và cách tránh

| Rủi ro | Cách tránh |
|---|---|
| Đổi `WorkDayPlan` 1-1 thành 1-n làm vỡ 8 chỗ trong `PurchaseStaffingService` | KHÔNG đổi quan hệ. Thêm bảng dòng. `ForPurchaseAsync` giữ nguyên |
| Sửa trực tiếp `WorkDayPlanService.SaveAsync` (216 dòng, nơi đồng đội đang làm) | Thêm service mới `HarvestPlanLineService` + `HarvestPlanSuggestionQuery` (file mới); trong `SaveAsync` chỉ thêm MỘT lời gọi sau khi tạo/đổi plan; DTO thêm tham số có giá trị mặc định ở CUỐI (`SaveWorkDayPlan(..., IReadOnlyList<HarvestPlanLineInput>? Lines = null)`) |
| `ModelSnapshot` và thứ tự migration | Mỗi lát một migration, timestamp sau `20261111160000`, rebase theo snapshot của develop trước khi merge; không hai nhánh cùng sinh migration một lúc (xem E) |
| `HarvestLotReadService.OrdersAsync` dùng `r.WorkDayPlan?.RaftId` | Đổi nhỏ sang dòng kế hoạch, giữ `HarvestOrderOption` thêm trường tùy chọn cuối (`PlannedCagesOnRaft`) |
| Hợp đồng web cũ (`harvest-lots` `orders[]`) | Chỉ thêm trường, không đổi/xóa |
| `PurchaseRequest.PlannedCages` hai nguồn | Chỉ server ghi, bằng Σ dòng, trong cùng giao dịch `MarkChanged(request)` |

### C.9 Hậu quả khi làn hỏng giữa kế hoạch

Xem bảng D. Quy tắc gốc: báo hỏng KHÔNG bị chặn bởi kế hoạch; kế hoạch thích nghi (dòng `Blocked`, thông báo, Owner chia lại số lồng sang bè khác ngay trong ngày).

---

## D. Bảng ca biên (edge cases)

| Ca | Quy tắc |
|---|---|
| Làn hỏng trong lúc kế hoạch mở | Cho báo hỏng. Dòng chứa làn: loại làn khỏi "eligible"; nếu hết làn eligible -> `Blocked`; thông báo Owner + người phụ trách; dòng vẫn giữ `PlannedCages` để thấy thiếu; Owner dời số lồng sang bè khác (cho phép dù đã mời, B.5 `PLAN_LOCKED` mục (a)). Ghi lô vào làn hỏng bị chặn |
| Bè bị ngừng (discontinue) khi có kế hoạch | Không xảy ra với bè có chu kỳ Open (SRS dòng 876, `RaftStatusService.cs:31-33`: 409). Bè không chu kỳ không thể nằm trong dòng (không eligible). Nếu có dòng cũ và Owner ngừng bè sau khi chu kỳ đóng: dòng `Blocked`, thông báo; không xóa dòng |
| Đóng chu kỳ (đặc biệt đóng sớm) khi bè nằm trong kế hoạch mở | Thêm xác nhận ở `cycle-close`: 409 `confirm_required` `OPEN_PLANS` {requests:[...]}, đóng xong dòng `Blocked`. Owner/người phụ trách được thông báo |
| Hủy đơn sau khi thu một phần | `AllowsCancel` (`PurchaseRequestRules.cs:80-82`) cho đơn Accepted. Lô đã thu giữ nguyên (đã là lịch sử, vẫn có thể bán qua hóa đơn khác vì bán không bị giới hạn bởi đơn, BR-HARVEST-02); dòng -> `Closed`; thông báo nhân viên/phụ trách. Chuyển phần dư cho thương lái khác: ngoài phạm vi, đã ghi "pending" ở `cage-order-harvest.md:26` |
| Thu vượt kế hoạch | Dòng: cảnh báo mềm `LINE_OVER_PLAN`; đơn: cảnh báo mềm `REQUEST_OVER_ACCEPTED`; không chặn vì cân cảng quyết định kg thật và nhu cầu có thể tăng (dùng lại tinh thần ngưỡng mềm 110%/cứng 150% của kg chu kỳ, `FARMING_API_CONTRACT` mục 2; ngưỡng mới cho lồng chờ Owner, D8) |
| Nhân viên từ chối | Như hiện nay: lời mời `Approved=false` + lý do; chưa đủ `ceil(tổng/20)` người thì Owner không accept được; Owner chọn người thay (`POST assignments` lại). Nhân viên từ chối được gỡ khỏi dòng; người thay gắn vào cùng dòng |
| Hai kế hoạch giành một làn | Làn nằm ở hai dòng khác nhau cùng `workDate`: 409 `LANE_ALLOCATED_SAME_DAY` (gợi ý chọn làn khác). Khác ngày: cho phép, chỉ cảnh báo `plannedElsewhere`. Cùng bè khác làn: cho phép |
| Thu xong sớm | Owner bấm "Thu xong" (`harvest-done`) khi đã thu đủ dù chưa đủ nhân viên/giờ; dòng chưa `Done` hiển thị "Chốt thu ít hơn kế hoạch" (không lỗi). Yêu cầu có ≥ 1 lô như hiện nay |
| Tồn loại hàu không đủ | Hệ thống không biết tồn theo lồng. Báo khi: không có bè khớp giống ("Không có bè khớp"), hoặc Σ làn eligible = 0. Không tính toán thiếu hụt theo kg/lồng. Owner được phép chọn bè không khớp bằng xác nhận `confirmSeedMismatch` (ghi audit) |
| Sản phẩm chưa gắn giống | `matchBasis:"NONE"`, không lọc, hiển thị rõ |
| Hai Owner/phiên cùng sửa kế hoạch | `rowVersion` của request (+ `RowVersion` dòng): 409 MSG06 |
| Nhân viên đã cam kết đơn khác cùng ngày | Giữ nguyên luật unique `ReservedWorkDate` (không đổi) |

---

## E. Tách việc, thứ tự, migration, kiểm thử

### E.1 Backend (thứ tự; B1, B2a, B3 có thể song song)

| Task | Nội dung | Vùng file | Migration | Phụ thuộc |
|---|---|---|---|---|
| B1 | Hình học bè: `LengthM/WidthM/AreaM2`, `Lanes.LineLengthM`, validate, `Size` ghi lại, view, cảnh báo, audit, backfill | `Domain/Entities/Farming/{Raft,Lane}.cs`, `Application/Features/Farming/Rafts/{RaftDtos,RaftValues,RaftService,RaftViews,RaftReadService}.cs`, `Infrastructure/Persistence/Configurations/Farming/*`, `Controllers/RaftsController.cs` (chỉ route `lane length`) | `RaftGeometry` | không |
| B2a | `LaneIncidents`, `Lane.IsDamaged/Generation`, `LaneGeneration` ở seeding/lot lane, `LaneStateRules` (WrittenOff, thế hệ), `EverySeededLaneHarvested`, trace theo thế hệ | `Domain`, `Application/Features/Cultivation/Progress/LaneStateRules.cs`, `Features/Cultivation/Seeding/*`, `Features/Harvest/HarvestLot*`, `Features/Traceability/*` | `LaneIncidents` | B1 chỉ về file chung `Lane.cs` -> làm B1 trước hoặc cùng người |
| B2b | `RaftLanesController` + `LaneIncidentService` (report-damage, repair-done, write-off, replace, retire, length, lane-history), ảnh sự cố, nới `RaftService` (thêm làn khi có chu kỳ, `LANE_NOT_REMOVABLE`), thông báo, audit | `Features/Farming/Rafts/Lanes/*` (thư mục mới), `Controllers/RaftLanesController.cs` | (dùng B2a) | B2a |
| B2c | Tóm tắt chu kỳ: khối làn hỏng/mất giống; xác nhận khi đóng chu kỳ có kế hoạch mở | `Features/Cultivation/Closing/*` | không | B2b, B4 để xác nhận kế hoạch |
| B3 | `ProductSeedItems` + API gắn giống vào sản phẩm (`GET/PUT /api/products/{id}/seed-items`) | `Features/Sales/Products/*` | `ProductSeedItems` | không |
| B4 | Dòng kế hoạch: `HarvestPlanLines`, `HarvestPlanLineLanes`, `PlanLineId`; `Lines` trong `SaveWorkDayPlan`; backfill dòng từ plan cũ; gợi ý; `PurchaseHarvestView.plan`; kiểm tra ghi lô (`RAFT_NOT_IN_PLAN`, cảnh báo vượt); nhân viên theo dòng; thông báo | file MỚI: `Features/Workforce/HarvestPlan/*`, `Features/Harvest/HarvestOrderPlanFacts.cs`; chỉnh nhỏ: `WorkDayPlanService.cs`, `WorkDayPlanView.cs`, `PurchaseStaffingService.cs` (chỉ phần gán dòng), `HarvestLotReadService.cs`, `PurchaseRequestViews.cs` | `HarvestPlanLines` | B2a (trạng thái làn), B3 (khớp giống) |
| B5 | Test hồi quy + tích hợp (E.3), cập nhật `docs/cage-order-harvest.md` (xóa dòng "Remaining slices" đã làm) và `FARMING_API_CONTRACT` | tests, docs | - | cuối |

Thứ tự migration: `20261112100000_RaftGeometry`, `20261112110000_LaneIncidents`, `20261112120000_ProductSeedItems`, `20261112130000_HarvestPlanLines` (mỗi cái có Down). Mỗi migration kiểm tra trên SQL Server tách biệt (pattern test `RaftsV2SqlServerTests`), không áp vào DB chung.

### E.2 Web (Codex) - song song được sau khi có hợp đồng JSON ở trên

| Task | Nội dung | Vùng file | Cần backend |
|---|---|---|---|
| W1 | Form bè: dài/rộng/diện tích/+- làn/sơ đồ/độ dài từng làn, hiển thị bè | `src/features/rafts-api/{raft-create-dialog,raft-form-fields,raft-detail-panel,raft-info-tab}.tsx`; mới `raft-lane-layout-editor.tsx`, `raft-lane-diagram.tsx`, `raft-geometry.ts`; bỏ `raft-size-fields.tsx` (giữ `raft-size.ts` đọc dữ liệu cũ); contracts Zod trong `src/features/farming-api/contracts.ts` | B1 (làm với mock trước) |
| W2 | Menu từng làn: báo hỏng, sửa xong, ghi mất giống, thay thế, gỡ; hộp thoại có lý do + ảnh; tab "Lịch sử làn"; trạng thái WrittenOff/Damaged ở `lane-board.tsx`, `harvest-lane-choices.tsx`, `cycle-lane-detail.tsx`; xác nhận đóng chu kỳ khi có kế hoạch mở ở `cycle-close-panel.tsx` | `src/features/rafts-api/lane-incident-*.tsx`, `src/features/cultivation-api/{lane-board,harvest-lane-choices,harvest-lanes-board}.tsx`, `src/features/cycles-api/cycle-close-panel.tsx` | B2a, B2b |
| W3 | Gắn giống cho sản phẩm | `src/features/sales-api/products-screen.tsx` | B3 |
| W4 | Trình lập kế hoạch + tiến độ + cột kế hoạch + tích hợp form ghi lô | mới `src/features/harvest-plan/*`; sửa `src/features/operations/new-module-screens.tsx` (chỉ gắn panel), `cultivation-api/records-harvest-form.tsx` | B3, B4 |
| W5 | Tài liệu: `docs/SRS_DEVIATIONS.md` (các chênh ở D1, D2, D7), `docs/reports/` | docs | - |

Chạy `npm run lint`, `npm run typecheck`, `npm run build` trước khi báo xong (quy tắc `AGENTS.md`); kiểm tra 360 px và 1024 px.

### E.3 Danh sách test

Backend (unit): `LaneStateRules` với incidents/thế hệ (NotSeeded -> Growing -> WrittenOff -> Replaced -> NotSeeded -> Growing, và Harvested+Replaced giữ Harvested); `EverySeededLaneHarvested` có làn WrittenOff; `RaftGeometry` (diện tích làm tròn, lane override ≤ length, hạ length thấp hơn override, ranges); parser backfill `Size`; tổng dòng kế hoạch (under/over covered); trạng thái dẫn xuất dòng.
Tích hợp/SQL Server: tạo bè với hình học + idempotent `Size`; thêm làn khi chu kỳ mở; gỡ làn giữa NotSeeded; gỡ làn Growing không cờ -> 409, có `confirmWriteOff` -> WrittenOff+Removed; báo hỏng/sửa xong; thay thế rồi thả giống lại sau "hoàn tất thả giống"; truy xuất lô thế hệ mới không chứa seed lot thế hệ cũ; lô cũ không đổi; `rowVersion` stale; quyền Owner/Manager/nhân viên; 2 phiên báo hỏng song song; migration up/down/up trên DB cô lập với dữ liệu cũ (Size parse được và không); plan cũ 1 bè backfill thành 1 dòng và `PurchaseStaffingService` vẫn xanh; plan nhiều bè nhiều vùng; Quản lý chỉ có một vùng không thể làm người phụ trách kế hoạch hai vùng; `PLAN_LOCKED`; ghi lô vào bè không trong kế hoạch; hai đơn cùng làn cùng ngày; gợi ý loại bè hỏng/WrittenOff; khớp giống và `matchBasis:NONE`; hủy đơn sau thu một phần; đóng chu kỳ xác nhận kế hoạch mở. Hồi quy: toàn bộ test `WorkDayPlan*`, `PurchaseRequest*`, `HarvestLot*`, `RaftsV2SqlServerTests` hiện có phải xanh không sửa.
Web: Vitest cho `raft-geometry` (diện tích, ranges), sơ đồ làn, hộp thoại sự cố (lý do bắt buộc), builder (tổng lồng, chọn bè, cảnh báo), trạng thái rỗng/lỗi/xung đột/quyền; axe/keyboard cơ bản.

---

## F. Quyết định cần Owner (đánh số; mỗi cái kèm khuyến nghị)

| # | Câu hỏi | Lựa chọn | Khuyến nghị |
|---|---|---|---|
| D1 | BR-FARM-04 hiện: thêm/bớt làn chỉ ở cuối và chỉ khi KHÔNG có chu kỳ mở. Nới ra để (a) thêm làn khi chu kỳ mở, (b) gỡ làn bất kỳ vị trí nếu không còn giống/kế hoạch? | A. Giữ nguyên (không xử lý được làn giữa). B. Nới như B.3/B.6. | B. Cần thiết cho use case 3; chênh SRS ghi vào `SRS_DEVIATIONS.md` |
| D2 | Làn bị đứt/hỏng còn giống: có cho "ghi mất giống" (không số lượng) và coi là đã kết thúc khi đóng chu kỳ? SRS v8 BR-CYCLE-07 nói "no loss record". | A. Không ghi (chỉ báo hỏng, chu kỳ luôn đóng sớm). B. Ghi sự kiện mất giống không số lượng (đề xuất). C. Ghi cả số lượng/giá trị (cần dữ liệu per-lane, bị bác ở review 11/11). | B |
| D3 | Có cho đánh số lại làn không? | A. Không bao giờ (đề xuất). B. Chỉ bè chưa từng có chu kỳ nào. | A (truy xuất, nhãn vật lý) |
| D4 | Có cần trạng thái "Đang sửa" riêng? | A. Không, chỉ `IsDamaged` + ghi chú. B. Có trạng thái. | A (YAGNI) |
| D5 | Thêm cột tên riêng cho bè (ngoài mã)? | A. Chỉ `code` là tên/mã (đề xuất). B. Thêm `Name` tùy chọn. | A |
| D6 | Ngưỡng "đủ tuổi thu" (số ngày nuôi tối thiểu) theo sản phẩm/cài đặt chung? | A. Không ngưỡng cứng, chỉ hiển thị số ngày + bộ lọc tự nhập (đề xuất). B. Cài đặt chung `MinDaysToHarvest`. C. Theo sản phẩm. | A (không có dữ liệu để khẳng định; nếu Owner muốn B/C thì làm sau) |
| D7 | Chấp nhận "đợt thu của đơn" (nhiều lô nhiều bè, nhóm theo đơn) thay vì một lô gộp nhiều vùng? và thêm liên kết sản phẩm-giống? | A. Như C.6 (đề xuất). B. Đổi mô hình lô (không khuyến nghị: phá truy xuất). | A |
| D8 | Mức cảnh báo khi thu vượt kế hoạch/đơn (lồng) | A. Chỉ cảnh báo mềm, không chặn (đề xuất). B. Mềm >110%, chặn >150% như kg chu kỳ. | A (cân cảng quyết định kg thật) |
| D9 | "Chuyển giống sang làn khác" khi làn giữa hỏng (kéo dây giống sang làn trống)? | A. Không làm lần này; thả giống lại bằng phiên mới (đề xuất). B. Làm: làn đích kế thừa truy xuất làn nguồn. | A (cần thêm mô hình số lượng; làm sau nếu cần) |
| D10 | Kế hoạch có nên thiếu lồng được "gửi mời" (tổng dòng < đơn)? | A. Không (đề xuất, 409 `PLAN_UNDER_COVERED`). B. Cho gửi và cảnh báo. | A (Owner nói "thu sao cho đủ số lồng") |
| D11 | Bè dư lồng so với đơn tối đa bao nhiêu thì cảnh báo mềm? | 20% (đề xuất) hoặc con số khác | 20% |
| D12 | Chặn ghi lô vào bè không thuộc kế hoạch? | A. Cảnh báo + xác nhận, tự thêm dòng ad hoc (đề xuất). B. Chặn cứng. | A (thực tế hiện trường) |

Câu hỏi chưa giải quyết:
1. `Product` "Hàu béo/Hàu sữa/Hàu sống loại nhỏ" có thực sự tương ứng một giống cụ thể, hay cùng một giống thu ở nhiều cỡ? Nếu cùng giống, ánh xạ nhiều-nhiều vẫn đủ nhưng bộ lọc "khớp giống" không phân biệt được cỡ; cần Owner nói tiêu chí cỡ (ngày nuôi? cỡ tay?).
2. Một nhân viên có thể làm ở hai bè trong cùng đơn ngày đó không (đi tàu qua 2 bè)? Spec giả định mỗi người đúng một dòng.
3. Chính sách ảnh sự cố: bắt buộc hay tùy chọn khi ghi mất giống (đề xuất tùy chọn).
4. `CagesPerEmployeePerDay` mặc định 20 có phải cố định cho mọi bè/vùng không (hiện cấp request).
5. Hai nhánh (đồng đội OMTS-223 và nhánh này) hiện đã đồng bộ `20261111135229` đến `20261111160000`; cần xác nhận không còn migration chưa merge trước khi sinh `RaftGeometry`.
6. Server live 8082 chưa phản ánh develop (đang dùng `requestedKg`); cần backend cập nhật trước khi web thử với dữ liệu thật.
