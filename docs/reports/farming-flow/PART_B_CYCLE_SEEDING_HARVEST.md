# PHẦN B – Chuỗi sản xuất: Lô giống, Thả giống, Chu kỳ nuôi, Nhật ký, Vật tư, Thu hoạch, Sản lượng, Truy xuất (và Vật tư & Giống)

Ngày lập: 11/11/2026. Người đọc: Chủ hợp tác xã (cần xem logic nghiệp vụ có đúng không để quyết định sửa).
Phạm vi: các màn trong menu **Nuôi trồng** thuộc chuỗi sản xuất (Phần A viết riêng về Vùng nuôi, Bè nuôi, Làn, Nước). Báo cáo CHỈ MÔ TẢ, không sửa mã nguồn, không đổi dữ liệu.

---

## 0. Cách đọc báo cáo này

### 0.1 Ký hiệu

| Ký hiệu | Nghĩa |
|---|---|
| ✔ khớp SRS | Hệ thống làm đúng điều SRS v8 viết (kèm mã quy tắc, ví dụ BR-CYCLE-02) |
| ⚠ khác SRS | Hệ thống làm khác, hoặc SRS không nói rõ nhưng kết quả đáng bàn |
| ➕ ngoài SRS | Chức năng/quy tắc có trong hệ thống nhưng SRS v8 không có |
| (đang triển khai) | Thay đổi chủ đã duyệt D1..D10 (mục 0.4) đang được viết, CHƯA là hành vi hiện tại. Phần chính của báo cáo luôn mô tả hành vi HIỆN TẠI |
| `File.cs:dòng` | Nơi kiểm chứng trong mã (backend `D:\Đồ_án\omts-backend\src\OMTS.Application\Features\...`, web `D:\Đồ_án\omts-web\src\...`) |

SRS = `D:\Đồ_án\omts-web\.hallmark\srs-v8\srs-v8-full.txt`. Thuật ngữ kỹ thuật giữ tiếng Anh (Lane, Cycle, rowVersion, endpoint...) để chủ có thể đối chiếu với đội kỹ thuật.

### 0.2 Về "hành vi hiện tại" – 3 mức phiên bản (rất quan trọng khi đối chiếu số liệu)

1. **Mã backend nhánh `develop` (commit 6ff0df94)** = hành vi hiện tại mà báo cáo này mô tả. Số dòng trích dẫn là số dòng của file hiện có trên đĩa; với 12 file đang sửa dở (Harvest*, CycleSummaryReader, SeedingCompletionService...) báo cáo ghi rõ "HEAD" khi số dòng lấy từ bản đã commit.
2. **Cây làm việc backend đang sửa dở** (chưa commit): số lồng thập phân, giới hạn kg theo lồng, trần theo sản lượng mục tiêu, nút "thu xong làn", xác nhận khi hoàn tất thả giống mà 0 làn có giống... Tất cả ghi "(đang triển khai)".
3. **Máy demo `127.0.0.1:8082`** đang chạy một bản backend CŨ HƠN cả HEAD: chưa có sổ kho (`/api/input-issues` trả 404, danh mục vật tư không có `onHand`). Số liệu ví dụ ở mục 9 lấy từ máy demo; phần "Vật tư & Giống – sổ kho" lấy từ mã nguồn, chưa chạy thử được trên máy demo.

### 0.3 Sơ đồ chuỗi (dữ liệu chảy theo chiều mũi tên)

```
Danh mục Vật tư & Giống (item nhóm Giống / Vật tư / Khác)
        |
Phiếu nhập (Draft -> Completed)         <- mỗi dòng "Giống" của phiếu Completed = 1 LÔ GIỐNG  (mã PN000001-1)
        |                                  trả hàng NCC <= nhập - đã thả
        v
Vùng -> Bè (có N làn) -> CHU KỲ NUÔI (Open) --- kế hoạch (3 ước tính, tùy chọn)
                              |
                              +-- THẢ GIỐNG: nhiều "lần thả" (1 lô giống, >=1 làn, 1 tổng số lượng) -> làn thành "Đang nuôi"
                              |      "Hoàn tất thả giống" (1 lần/chu kỳ, báo Owner)
                              +-- NHẬT KÝ CHĂM SÓC (ngày + >=1 ảnh + ghi chú), báo Owner
                              +-- SỬ DỤNG VẬT TƯ (sửa chữa bè: ngày, lý do, vật tư, số lượng) - không phụ thuộc chu kỳ Open
                              +-- THU HOẠCH: mỗi chuyến = 1 LÔ THU HOẠCH (làn, lồng, kg ước tính, ảnh)
                              |      làn "Đang thu hoạch" -> "Đã thu hoạch" khi tick "thu hết"
                              |      mọi làn có giống đã thu hết -> nhắc đóng chu kỳ
                              +-- ĐÓNG CHU KỲ (đánh giá bắt buộc; đóng sớm cần Owner đồng ý) -> khóa dữ liệu
Lô thu hoạch (Open/Reopened/Closed) --bán--> Hóa đơn bán (kg, đơn giá) ; công bố nguồn gốc (QR)
        |
SẢN LƯỢNG NUÔI = tổng hợp theo Bè / Vùng / Chu kỳ (ước tính, đã bán, hao hụt, chênh lệch)
TRUY XUẤT LÔ  = từ lô thu hoạch lần ngược về lô giống, phiếu nhập, NCC ; xuôi tới hóa đơn, thương lái
```

### 0.4 Các thay đổi chủ đã duyệt (đang triển khai) – để khỏi nhầm với hiện tại

Nguồn: `D:\Đồ_án\omts-web\docs\reports\FARMING_BACKEND_RULES_REVIEW_2026-11-11.md`, mục 5, D1..D10 đã chỉnh:
số lồng thập phân; kg = lồng x kg/lồng (kg nhập tay chỉ được trong khoảng 0,2..2 lần); trần theo sản lượng mục tiêu: cảnh báo vượt +10% (cần xác nhận + lý do), từ chối vượt +50%; hành động "thu xong làn" riêng; sổ kho kiểm tra khi thả giống và khi dùng vật tư và liên kết mọi nơi; không có cân nặng/tỷ lệ hao hụt dạng dữ liệu nhập. Mã đã có trong cây làm việc nhưng chưa phát hành: `Harvest/HarvestQuantityRules.cs`, `Harvest/HarvestLaneFinishService.cs`, `Cultivation/Seeding/SeedingCompletionService.cs` (confirmEmpty), cột `OverPlanReason`, migration `20261111120000_HarvestLotFractionalCagesAndOverPlanReason`.

### 0.5 Phân quyền chung của chuỗi (hành vi hiện tại)

| Chức năng (mã quyền) | Chủ HTX (Owner) | Quản lý vùng (Zone Manager) / nhân viên có quyền theo vùng | Kế toán | Ghi chú |
|---|---|---|---|---|
| Chu kỳ, Thả giống, Sử dụng vật tư (`CULTIVATION_CYCLES`: View/Create/Edit/Delete) | Toàn quyền mọi vùng | Chỉ vùng được gán | Không | SRS CYCLE-01..03,05,06 ✔ |
| Nhật ký chăm sóc (`CULTIVATION_LOGS`) | Toàn quyền | Vùng được gán | Không | CYCLE-04 ✔ |
| Ghi nhận / sửa / gỡ lô thu hoạch (`HARVESTS`) | Toàn quyền | Vùng được gán; sửa/gỡ chỉ lô do mình ghi | Không | HARVEST-01 ✔ |
| Đóng lô, Sản lượng nuôi (`HARVEST_LOTS`: View/Edit/Export) | Toàn quyền | Vùng được gán | Không | HARVEST-02, 04 ✔ |
| Cài đặt thu hoạch (kg/lồng, ngày tự đóng lô) | Chỉ Owner | Không | Không | HARVEST-03 ✔ |
| Truy xuất lô (`LOT_TRACING` View/Export) | Có | Vùng được gán | Chỉ xem (R), không xuất | TRACE-02 ✔ (Kế toán R) |
| Công bố / sửa dữ liệu truy xuất (`PROVENANCE`) | Có | Vùng được gán (sửa cần Owner đồng ý tại chỗ) | Không | TRACE-01, 03 ✔ |
| Thu hồi công bố | Chỉ Owner | Chỉ xem (R) | Không | TRACE-04 ✔ |
| Phiếu nhập, danh mục Vật tư & Giống (`PURCHASE_RECEIPTS`, không theo vùng) | Có | Theo vai trò, không theo vùng | Xem | BR-FARM-08 ✔ |
| Xuất dùng (XD) / Xuất hủy (XH) | Owner toàn quyền | XD: vùng của mình; XH: chỉ Owner | Xem + xuất file | ➕ ngoài SRS |

Quy tắc chung: nhân viên có thể có nhiều cặp "vai trò – vùng" nên quyền được kiểm tra theo TỪNG vùng của bè (`ZoneAccessGuard.AllowsAsync`). Web ẩn/hiện nút theo `operationAllowed` (`src/features/operations/permissions.ts`), nhưng backend mới là nơi quyết định (403 "You do not have permission to perform this action. Nothing has been changed.").
"Sửa/gỡ chỉ do người ghi hoặc Owner" áp cho: lần thả giống, nhật ký, lô thu hoạch. Riêng bản ghi sử dụng vật tư: mọi quản lý vùng của vùng đều sửa được (không cần là người ghi) – `MaterialUsageEditService.cs:15`.

### 0.6 Thông báo của chuỗi (gửi Owner trừ khi Owner tự làm – quyết định PM OMTS-216)

| Mã | Khi nào | Gửi cho | Nội dung (rút gọn, tiếng Anh gốc của hệ thống) |
|---|---|---|---|
| MSG-CYCLE-02 | Hoàn tất thả giống | Owner | "Raft B1-01: seeding is finished; 3 of 3 lanes have seed. Please review the seeding sessions." |
| MSG-CYCLE-04 | Lưu nhật ký | Owner | "Raft B1-01: a cultivation log was recorded for the visit on 01/11/2026. Please review it." |
| MSG-HARVEST-01 | Ghi lô thu hoạch (không gửi lại khi sửa) | Owner | "Raft B1-01: the harvest of 11/11/2026 is recorded as lot DEMO-01-B1-01-20261111 (8 cages, about 400 kg)." |
| MSG-CYCLE-08 | Làn có giống cuối cùng được đánh dấu Đã thu hoạch (chỉ 1 lần cho tới khi bị rút lại) | Quản lý vùng của vùng, hoặc Owner nếu vùng không có quản lý; luôn đẩy | "Raft B1-01: every seeded lane is harvested. Please close its cultivation cycle." |
| MSG-CYCLE-06 | Đóng chu kỳ | Owner | Tóm tắt ngày đóng: bè, đóng sớm?, làn chưa thu, giống đã thả, kg đã thu, số ngày |
| MSG-HARVEST-05 | Ngày kiểm tra trước ngày lô bị tự đóng | Quản lý vùng/Owner | "Lot X (raft B1-01) will be closed automatically at the start of dd/MM/yyyy. Please sell it before then or close it yourself." |
| MSG-TRACE (rút công bố) | Owner rút công bố | Thương lái có hóa đơn (SMS + app) | Không nêu lý do |

Không thông báo khi: ghi lần thả giống (CYCLE-02.0), sử dụng vật tư, bắt đầu/sửa/hủy chu kỳ, sửa/gỡ lô, đóng lô bằng tay.

### 0.7 Trạng thái Làn (State machine dùng chung – tính khi xem, không lưu)

`Cultivation/Progress/LaneStateRules.cs:26-49` (✔ BR-FARM-03)

| Trạng thái (web) | Điều kiện (tính cho ngày D, trong chu kỳ đang Open tại D) |
|---|---|
| NotSeeded – "Chưa thả giống" | Chưa có lần thả nào ≤ D cho làn đó |
| Growing – "Đang nuôi" | Có ít nhất 1 lần thả ≤ D, chưa nằm trong lô thu hoạch nào ≤ D |
| BeingHarvested – "Đang thu hoạch" | Nằm trong ≥1 lô thu hoạch ≤ D nhưng chưa có lô nào đánh dấu "thu hết" |
| Harvested – "Đã thu hoạch" | Có lô thu hoạch ≤ D đánh dấu làn đó "thu hết" |
| (không có chu kỳ Open ở ngày D) | Mọi làn là NotSeeded |

Chuyển trạng thái: NotSeeded --(ghi lần thả)--> Growing --(ghi lô thu hoạch có làn)--> BeingHarvested --(tick "thu hết" trong lô)--> Harvested. Gỡ lô / sửa lô có thể kéo làn lùi lại (tính lại từ các lô còn lại). Không có hành động "thu xong làn" riêng ở HIỆN TẠI (xem mục 6, đang triển khai).

---

## 1. Vật tư & Giống, Phiếu nhập, Trả hàng, Xuất dùng/Xuất hủy – chỉ phần liên quan Nuôi trồng

### 1.1 Mục đích
Đây là "cửa vào" của chuỗi: (a) **Giống** mua về trên Phiếu nhập trở thành **Lô giống** để thả; (b) **Vật tư** (phao, dây...) là danh sách chọn khi ghi "Sử dụng vật tư" sửa bè; (c) sổ kho (movement ledger) theo dõi tồn từng mặt hàng và từng lô giống, kèm hai chứng từ Xuất dùng (XD, dùng ở vùng/bè) và Xuất hủy (XH, loại bỏ). Màn hình: menu "Vật tư & mua hàng" → Phiếu nhập; menu "Vật tư & Giống" → Danh mục (`/inputs/items`), Xuất dùng (`/inputs/uses`), Xuất hủy (`/inputs/disposals`).

### 1.2 Ai dùng, quyền
Owner toàn quyền. Quản lý vùng: Phiếu nhập/danh mục theo vai trò, không theo vùng (BR-FARM-08 ✔); Xuất dùng chỉ phiếu của vùng mình; Xuất hủy chỉ Owner viết (`InputIssueService.cs:24`). Kế toán xem và xuất file mọi phiếu.

### 1.3 Luồng từng bước
**A. Mua giống thành Lô giống** (web: Phiếu nhập → "Thêm phiếu"; `src/features/purchase-documents/receipt-editor.tsx`)
1. Chọn NCC (đang In Use), ngày nhận (không sau hiện tại), thêm dòng "Hàng nhập": chọn vật tư nhóm Giống, Số lượng, Đơn giá (đồng), Mã lô nhà cung cấp (chỉ dòng Giống), Bè (tùy chọn, dòng Giống/Vật tư: "mua cho bè nào").
2. Lưu nháp (Draft 1701) hoặc "Hoàn tất" (Completed 1702). Chỉ khi **Completed** mỗi dòng Giống thành lô giống, mã = mã phiếu + số dòng (`DocumentCodes.cs:37`, ví dụ PN000001-1).
3. Hoàn tất: ghi công nợ NCC, ghi sổ kho dòng nhập (`InputStockLedger.PostReceiptAsync`), thông báo Owner (MSG-PURCHASE-01).
4. Hủy phiếu (Completed → Cancelled 1703) cần lý do; **bị chặn** nếu có lô giống đã thả ("Receipt PN000001 cannot be cancelled: seed lot PN000001-1 has already been seeded. The Cooperative Owner can correct it instead.") hoặc đã có trả hàng chưa hủy (`PurchaseReceiptCancellationService.cs:136-159`) ✔ BR-PURCHASE-09. Khi bị chặn, Owner chỉ được "sửa chữa" đơn giá, số lượng (không dưới đã thả + đã trả), mã lô NCC (✔).
5. Trả hàng NCC (Recorded 1901 / Cancelled 1902): mỗi dòng Giống chỉ trả tối đa `nhập − đã thả − đã trả` (cột "Returnable" của dòng phiếu) ✔ GBR-04/BR-PURCHASE-07. Trả ghi sổ kho (âm) theo đúng lô.
6. Lô giống đã trả hết thì biến mất khỏi danh sách chọn khi thả (`SeedLotRepository.cs:45`).

**B. Xuất dùng / Xuất hủy (➕ ngoài SRS)** (web `/inputs/uses`, `/inputs/disposals`; `src/features/input-issues/*`)
1. Xuất dùng (mã XD...): chọn Vùng, Bè của vùng, Loại xuất (hệ thống có sẵn "Thả giống", "Sửa chữa bè", "Dùng chung cho vùng"; Owner thêm được), Người nhận (nhân viên làm ở vùng, tùy chọn), Thời gian (không sau hiện tại), các dòng (mặt hàng, đơn vị, số lượng; dòng Giống có thể chọn **lô giống** hoặc bỏ trống để trừ phần "không thuộc lô"), Ghi chú. "Lưu nháp" hoặc "Hoàn thành".
2. Xuất hủy (XH): không có vùng/bè/người nhận, **bắt buộc Lý do**; chỉ Owner.
3. Hoàn thành: ghi sổ kho; nếu hợp tác xã **không cho phép tồn âm** và mặt hàng/lô sẽ âm: 409 "Không đủ {tên} để xuất: số lượng còn lại sẽ là {x} {đơn vị}." (MSG-INPUT-01, `InputStockLedger.cs` CheckNotNegativeAsync). Mặc định hiện tại `AllowNegativeInputQuantity = true` nên **không chặn** (`Cooperative.cs:71`).
4. Sửa phiếu Completed: hoàn tác dòng cũ bằng dòng đảo (reversal) rồi ghi dòng mới; Hủy phiếu (cần lý do) trả số lượng về kho. Xóa chỉ với phiếu nháp.
5. Xóa lô giống ở tab "Lô giống" của danh mục: phần còn lại của lô được **xuất hủy** tự động ("Xóa lô giống {mã}? Số còn lại của lô sẽ được xuất hủy").

### 1.4 Bảng trường
Mặt hàng (`FarmingInputItemDtos.cs`): 

| Trường | Kiểu | Bắt buộc | Giới hạn / validate | Mặc định / nguồn | Hiển thị |
|---|---|---|---|---|---|
| code | chuỗi | không (tự sinh) | 1–30 ký tự chữ-số, - _ . ; duy nhất | GI000001 (giống), VT000001 (vật tư), HK000001 (khác) (`InputItemUnitRules.cs:13`) ⚠ SRS ghi VT001... | Danh mục |
| name | chuỗi | có | không trùng tên | nhập tay | mọi nơi |
| group | Seed / Material / Other | có | **cố định khi đã dùng** (BR-PURCHASE-10 ✔) | chọn | Danh mục |
| unit / units[] | đơn vị cơ sở + đơn vị phụ (factor) | có | đơn vị đã dùng trong phiếu thì khóa | nhập | Phiếu, kho |
| minQuantity / maxQuantity | số | không | – | ➕ | cảnh báo tồn |
| costPrice, lastPurchasePrice | tiền | không | giá vốn theo cài đặt Cố định/Bình quân | ➕ | Danh mục |
| openingQuantity | số | không | tồn đầu kỳ | ➕ | Danh mục |
| onHand, stockValue | số | – | = Σ sổ kho; ×giá vốn | tính | Danh mục |
| status | In Use 101 / Discontinued 102 | – | ngừng thì không chọn được, vẫn xem | – | – |

Dòng phiếu nhập: item, quantity (>0, ≤1.000.000.000, **tối đa 2 chữ số thập phân**; `PurchaseReceiptValidator.cs:33,42`), unitPrice (≥0), discount, supplierLotCode (chỉ Giống, ≤100), raftId (tùy chọn; Giống/Vật tư), tối đa 200 dòng.
Phiếu Xuất: xem `InputIssueDtos.cs` (kind, code, issuedAt, zoneId, raftId, issueTypeId, receiverEmployeeId, reason, notes, lines[itemId, itemUnitId, quantity, seedLotLineId, note]); trạng thái 3801 Phiếu tạm / 3802 Hoàn thành / 3803 Đã hủy.

### 1.5 Quy tắc và tính toán

| Quy tắc | Chi tiết | Cờ |
|---|---|---|
| Lô giống = dòng Giống của phiếu **Completed** (không nháp, không hủy), chưa trả hết | `SeedLotRepository.cs:22-46` | ✔ GBR-04 |
| Mã lô giống = mã phiếu + "-" + số dòng, không bao giờ cấp lại | `PurchaseReceiptEditService.cs:22` | ✔ GBR-04 |
| Phần giống đã thả = Σ số lượng mọi lần thả của lô (mọi bè, mọi chu kỳ) | `SeedLotRepository.cs:42` | ✔ |
| Còn trả được = nhập − đã thả − đã trả | `PurchaseReceiptDtos.cs:67` | ✔ |
| Sổ kho: mỗi chứng từ ghi dòng, **không sửa dòng cũ**, chỉ thêm dòng đảo | `InputStockLedger.cs` | ➕ (SRS BR-PURCHASE-07: "OMTS keeps no stock") |
| Tồn lô giống trên sổ = nhập − trả − xuất; **lần thả giống KHÔNG ghi sổ** | `InputIssueDtos.cs` ghi chú `InputSeedLotView`: "Seeding records do not post movements" | ⚠ xem câu hỏi 1.7 |
| Sử dụng vật tư (CYCLE-03) **không** trừ kho; Xuất dùng không tạo bản ghi sử dụng vật tư | grep: Cultivation/* và Harvest/* không gọi `InputStockLedger` | ⚠ trùng lặp 2 sổ |
| Giá vốn: Cố định (lấy giá phiếu đầu) hoặc Bình quân gia quyền (nhập/trả; tồn sàn 0) | `InputStockLedger.cs`, `InputCostRules.cs` | ➕ |
| Chi phí vật tư của bè = Σ(số lượng sử dụng × giá mua mới nhất của mặt hàng tại/ trước ngày dùng, đã trừ chiết khấu/đơn vị), làm tròn đồng | `RaftMaterialCostQuery.cs` | ⚠ SRS BR-FARM-05: tính theo dòng PHIẾU NHẬP ghi tên bè, trừ trả hàng; "sử dụng vật tư không có giá" |
| Giống ghi tên bè trên phiếu **không** là chi phí vật tư | SRS BR-FARM-05 | ✔ (hệ thống cũng không tính giống) |

### 1.6 Liên kết
Phiếu nhập ↔ Lô giống ↔ Thả giống ↔ Truy xuất (nhà cung cấp). Danh mục Vật tư (nhóm Material) ↔ Sử dụng vật tư. Xuất dùng ↔ Bè/Vùng (nhưng **không** ↔ Thả giống/Sử dụng vật tư/Chu kỳ). Chi phí vật tư bè hiện trong màn Bè (Phần A) và hộp thoại "Chi phí vật tư bè" ở Phiếu nhập. Khoảng trống: chưa có "chi phí giống đã thả", "chi phí cả chu kỳ", "lãi/lỗ chu kỳ".

### 1.7 Câu hỏi cho chủ
1. **Hai sổ cho một việc**: thả 5.000 con ghi ở "Thả giống" nhưng tồn lô trong "Vật tư & Giống" vẫn 20.000 (chỉ trừ khi ai đó tạo Xuất dùng loại "Thả giống"). Kỳ vọng của tôi: một lần thả tự trừ kho đúng lô (đúng hướng D6 "(đang triển khai)"). Chủ chọn: thả giống là nguồn sự thật duy nhất, hay vẫn cho Xuất dùng "Thả giống" nhập tay?
2. **Sử dụng vật tư vs Xuất dùng "Sửa chữa bè"**: cùng một việc sửa phao có thể ghi 2 lần ở 2 nơi. Kỳ vọng: sử dụng vật tư tự tạo phiếu xuất (hoặc chỉ còn một màn).
3. **Tồn âm**: mặc định cho phép tồn âm. Chủ có muốn chặn khi xuất quá tồn không (kết hợp D6)?
4. **Chi phí vật tư bè** hệ thống đang tính theo "số lượng sử dụng × giá mua gần nhất" – khác SRS (tính theo phiếu mua ghi tên bè). Chủ muốn cách nào? Số B1-01 hiện 3.255.000 đồng (xem mục 9).
5. **Một đơn vị cho mọi giống** (BR-PURCHASE-10/CYCLE-02 yêu cầu): mã chưa thấy chỗ ép. Nếu một giống tính "con", giống khác "kg", "Tổng giống đã thả" cộng lẫn đơn vị. Có cần khóa không?

---

## 2. Lô giống và Thả giống (Seeding)

### 2.1 Mục đích
Ghi lại **giống nào (lô nào, nhà cung cấp nào) thả lên những làn nào, tổng bao nhiêu, ngày nào** trong một chu kỳ, để (a) biết làn nào đang nuôi (Đang nuôi), (b) truy xuất nguồn giống khi bán hàng, (c) hoàn tất khâu thả giống thì báo Owner kiểm tra.

### 2.2 Ai dùng, quyền
Quản lý vùng của vùng và Owner (`CULTIVATION_CYCLES` Create/Edit; kiểm ở `SeedingRecordService.cs:AllowsAsync`). Sửa/xóa chỉ người đã ghi hoặc Owner (`SeedingViews.cs:26`). Kế toán: không.

### 2.3 Luồng từng bước
**Luồng 1 – Ghi nhận thả giống**
1. Menu Nuôi trồng → **Thả giống** (`/operations/seeding`) → chọn vùng → bấm vào hàng bè → tab **Thả giống** → khu "Các lần thả giống". Nếu bè chưa có chu kỳ: "Bè chưa có chu kỳ nuôi. Mở chu kỳ trước khi ghi nhận thả giống."
2. Bấm **Ghi nhận thả giống** (chỉ hiện khi chu kỳ đang mở, bè và vùng đang sử dụng, có quyền) → hộp thoại "Ghi nhận thả giống": Ngày thả giống (mặc định hôm nay), Lô giống (menu "mã · tên hàng · NCC · đơn vị"; lô mua cho bè này xếp trước, rồi lô mới nhận), Số lượng giống, Làn (ô tick: chỉ làn "thả được").
3. **Lưu thả giống** → hộp xác nhận "Ghi nhận lần thả giống này?" → `POST /api/cultivation-cycles/{cycleId}/seeding-records` `{seedingDate, seedLotId, laneNumbers[], quantity}`.
4. Backend (`SeedingRecordService.cs`, `SeedingSessionReader.cs`): kiểm quyền (403) → chu kỳ Open và bè/vùng In Use (409 "The cultivation cycle of raft B1-06 is Closed and cannot be used for this action.") → kiểm các trường (400 MSG-GEN-01 nêu **tất cả** trường sai, ví dụ "Seeding date is missing or invalid. Please check and enter it again.") → tạo lần thả + các dòng làn → đánh dấu dòng chu kỳ và dòng phiếu nhập của lô là "đã đổi" (để một lần trả hàng/đóng chu kỳ cùng lúc báo xung đột 409 MSG06 thay vì ghi chồng) → audit `SeedingRecord.Created`. **Không thông báo ai.**
5. Làn không hợp lệ: 400 trường "Lanes", gợi ý "Lanes 2 cannot be seeded now." (`SeedingSessionReader.cs:86`).
6. Không có lô giống nào: danh sách trống kèm MSG-CYCLE-03 "There is no seed lot to choose: no completed purchase receipt for seed exists yet. Please complete the purchase receipt for the seed first."

**Luồng 2 – Hoàn tất thả giống** (nút "Đánh dấu hoàn tất", chỉ hiện khi chưa hoàn tất)
1. Hộp thoại "Hoàn tất thả giống": "Đã thả giống x/y làn" và "Các làn chưa thả giống: ..." (lấy từ `GET .../seeding-complete/preview`, MSG-CYCLE-01).
2. **Xác nhận hoàn tất** → hộp xác nhận "Đánh dấu hoàn tất thả giống và thông báo cho chủ hợp tác xã?" → `POST .../seeding-complete {rowVersion}`.
3. Backend (`SeedingCompletionService.cs`): chu kỳ Open; **chỉ 1 lần/chu kỳ** (lần 2: 409 "The seeding of raft B1-01 is marked complete on 11/11/2026 and cannot be used for this action."); `SeedingCompletedOn = hôm nay`; audit `CultivationCycle.SeedingCompleted`; thông báo MSG-CYCLE-02 cho Owner (trừ khi chính Owner làm).
4. HIỆN TẠI cho hoàn tất cả khi **0 làn có giống** (HEAD: `SeedingCompletionService.cs:70-78` không kiểm `SeededCount`). (đang triển khai: 409 `confirmFlag: confirmEmpty`, câu hỏi "No lane of raft ... has seed yet. Finish the seeding anyway?").

**Luồng 3 – Sửa / xóa một lần thả** (mở dòng → "Chỉnh sửa lần thả giống" / "Xóa bản ghi thả giống")
1. Bắt buộc **Lý do** (≤1000 ký tự); gửi kèm `rowVersion`. Sửa: `PUT /api/seeding-records/{id}`; xóa: `POST /api/seeding-records/{id}/remove`.
2. Điều kiện (`SeedingRecordCorrectionService.cs:127`): chu kỳ Open; không làn nào của lần thả đã nằm trong lô thu hoạch (nếu có: 409 "The seeding session of raft B1-01 on 04/10/2026 is in a harvest lot and cannot be used for this action."); là người ghi hoặc Owner. Ngoài các điều kiện này → dùng màn **Truy xuất lô → Sửa dữ liệu truy xuất** (mục 8).
3. Xóa: số lượng của lần thả rời khỏi tổng lô giống; chu kỳ không còn bản ghi nào có thể hủy lại.

**Luồng 4 – Xem tiến độ**: tab "Tiến độ làn" (sơ đồ làn) và `GET /api/rafts/{id}/lanes/{n}/progress` (các lần thả + lô thu hoạch của làn).

### 2.4 Bảng trường
Lần thả giống (SeedingRecord)

| Trường | Kiểu | Bắt buộc | Giới hạn / validate (nơi kiểm) | Mặc định / nguồn | Hiển thị |
|---|---|---|---|---|---|
| seedingDate | ngày | có | ≥ ngày bắt đầu chu kỳ; ≥ ngày nhận phiếu của lô; ≤ hôm nay (`SeedingSessionReader.cs:36`). Web chỉ kiểm định dạng ngày (`records-contracts.ts:8`) | hôm nay (`businessToday`) | "Ngày thả" |
| seedLotId | guid | có | dòng Giống phiếu Completed, chưa trả hết (`SeedingSessionReader.cs:64`) | chọn từ `GET /api/rafts/{id}/seed-lots` | "Lô giống / nhà cung cấp" |
| quantity | số | có | > 0, ≤ 1.000.000.000, **tối đa 2 chữ số thập phân** (`SeedingSessionReader.cs:38` dùng `HasAllowedDecimals`); web cho nhập 3 chữ số (`step 0.001`, `records-seeding-form.tsx:129`) ⚠ chênh; DB cột 18,3 + CHECK >0 | – | "Số lượng" kèm đơn vị của lô (con) |
| laneNumbers | danh sách số | có (≥1) | không trùng; làn In Use; trạng thái Chưa thả, hoặc Đang nuôi **nếu chưa hoàn tất**; không bao giờ làn Đang/Đã thu hoạch (`SeedingRules.cs:13`) | các làn `canSeed` | "Làn" |
| reason | chuỗi | chỉ khi sửa/xóa | 1–1000 | – | nhật ký audit |
| rowVersion | chuỗi | khi sửa/xóa | đúng phiên bản đã đọc | – | – |
| (hệ thống) recordedBy, recordedAt, cycleId | – | – | – | người đăng nhập | "Người ghi nhận" |

Danh sách lô giống (`seed-lots`): id, code PN…-n, receiptCode, receivedDate, itemCode/Name, unit, supplier, **quantityReceived**, **quantitySeeded** (Σ các lần thả của lô – mọi bè), boughtForThisRaft. Chỉ để hiển thị, không giới hạn (GBR-04).

### 2.5 Quy tắc và tính toán

| # | Quy tắc | Cờ |
|---|---|---|
| S1 | Chỉ thả từ lô giống của phiếu nhập Completed chưa trả hết; lô của vật tư/NCC đã ngừng vẫn thả được | ✔ GBR-04 |
| S2 | **Không so số thả với số còn lại của lô** (có thể thả 99.999 từ lô 20.000) | ✔ GBR-04 (SRS cố ý: "OMTS does not track the seed left over") – (đang triển khai: sổ kho kiểm khi thả, D6) |
| S3 | Mỗi lần thả = 1 lô + ≥1 làn + **1 tổng số lượng cho cả lần**; không có số lượng theo làn; hai lô cùng ngày = hai lần thả | ✔ BR-CYCLE-02, BR-FARM-03 |
| S4 | Thả lại cho làn Đang nuôi (thay giống chết) chỉ **trước** khi hoàn tất; số lượng cộng dồn vào tổng giống đã thả | ✔ BR-CYCLE-02 |
| S5 | Sau hoàn tất chỉ thả cho làn còn Chưa thả (không thông báo lần nữa) | ✔ |
| S6 | Làn Đang thu hoạch / Đã thu hoạch không thả lại trong chu kỳ | ✔ |
| S7 | Hoàn tất 1 lần/chu kỳ; được phép khi còn làn chưa thả (câu hỏi liệt kê làn) | ✔ BR-CYCLE-02; **0 làn có giống vẫn được hoàn tất** ⚠ (đang triển khai D10) |
| S8 | Sửa/xóa: người ghi hoặc Owner, chu kỳ Open, không làn nào trong lô thu hoạch; sau đó chỉ sửa qua Truy xuất | ✔ BR-CYCLE-02 |
| S9 | **Tổng giống đã thả của chu kỳ** (SeedHung) = Σ quantity mọi lần thả; đơn vị = đơn vị của lô đầu tiên có đơn vị (`CycleSummaryReader.cs:43,44`) → lẫn đơn vị thì sai | ✔ BR-CYCLE-06 / ⚠ đơn vị |
| S10 | Ngày thả có thể lùi về ngày bắt đầu chu kỳ bất kỳ; làn thành "Đang nuôi" tính theo **ngày thả**, không phải ngày nhập | ✔ |
| S11 | Không có ngưỡng tối thiểu "thời gian nuôi" trước khi thu hoạch: thả hôm nay, thu hôm nay vẫn hợp lệ | ⚠ SRS không nói |

### 2.6 Liên kết
Phiếu nhập (mã PN) ← lô giống; Chu kỳ (kế hoạch "Lượng giống dự kiến" chỉ để so sánh ở tóm tắt, **không kiểm khi thả**); Thu hoạch (làn đang nuôi mới được thu); Truy xuất (lần thả hiện ở "Truy xuất ngược", số lượng **cả lần** hiện ở mọi làn của lần đó, kèm chữ "dây" cứng trong web `trace-backward-panel.tsx` dù đơn vị là con ⚠); Sổ kho (thả giống không ghi sổ). Khoảng trống: tab "Thả giống" không hiện số còn lại của lô, không cảnh báo thả quá kế hoạch hay quá lô.

### 2.7 Câu hỏi cho chủ
1. **Thả vượt lô**: hiện thả 15.000 con từ lô còn 3.000 vẫn lưu. SRS cố ý không kiểm, nhưng bạn muốn kiểm không (đang triển khai: cảnh báo/chặn theo sổ kho)? Kỳ vọng: cảnh báo khi vượt tồn lô, chặn khi âm nếu cài đặt "không cho tồn âm".
2. **Thả vượt kế hoạch**: kế hoạch bè B1-01 "lượng giống dự kiến 250" nhưng đã thả 5.000 (gấp 20 lần) – hệ thống im lặng. Kỳ vọng: cảnh báo mềm khi vượt kế hoạch >20%.
3. **Hoàn tất khi 0 làn có giống**: nên chặn hoặc xác nhận (đã duyệt D10, đang làm).
4. **Số lượng theo làn**: hiện không biết làn 2 có bao nhiêu con, làm sao tính tỷ lệ sống từng làn? SRS cố ý bỏ; nếu muốn so hao hụt thì cần số theo làn (thay đổi SRS).
5. **Một lần thả của 3 làn hiện số lượng đầy đủ ở từng làn** trong Truy xuất (3000 ở làn 1, 2, 3): dễ hiểu nhầm là mỗi làn 3000 (tổng 9000). Nên ghi "cả lần thả" rõ hơn.
6. **Đơn vị giống** (con/kg/dây): chốt một đơn vị và khóa; sửa chữ "dây" trong Truy xuất.
7. **Ngày thả** có thể ghi lùi tới ngày bắt đầu chu kỳ: có cần chặn lùi quá N ngày hay yêu cầu lý do?

---

## 3. Chu kỳ nuôi (Cultivation cycle)

### 3.1 Mục đích
Một "mùa nuôi" của một bè, từ lúc bắt đầu thả giống tới lúc đóng. Mọi lần thả, nhật ký, lô thu hoạch thuộc chu kỳ đang Open ở ngày của nó. Kèm 3 **ước tính kế hoạch** (tùy chọn) để so sánh khi đóng.

### 3.2 Ai dùng, quyền
Quản lý vùng của vùng và Owner (`CULTIVATION_CYCLES`; bắt đầu = Create, sửa/đóng = Edit, hủy = Delete). Đóng sớm: Quản lý vùng phải xác nhận "Owner đã đồng ý trực tiếp"; Owner tự đóng thì chỉ xác nhận.

### 3.3 Luồng từng bước
**Luồng 1 – Bắt đầu chu kỳ** (menu Nuôi trồng → **Chu kỳ nuôi** `/farming/cycles` → chọn vùng → bấm bè → nút **Bắt đầu chu kỳ nuôi** ở đầu khung chi tiết → hộp "Mở chu kỳ nuôi · {bè}")
1. Nhập Ngày bắt đầu (mặc định hôm nay, không quá hôm nay), Lượng giống dự kiến, Ngày thu hoạch dự kiến, Sản lượng mục tiêu (kg) (3 ô cuối tùy chọn) → **Lưu chu kỳ**.
2. `POST /api/rafts/{raftId}/cultivation-cycles` (`CultivationCycleService.cs:38`). Điều kiện: bè In Use và vùng In Use; **bè chưa có chu kỳ Open** (409 MSG-GEN-06: "Cannot proceed because 1 records are still in use: cultivation cycle started 02/10/2026. Please handle these records first."); ngày bắt đầu **sau ngày đóng của chu kỳ trước** (bè đóng chu kỳ hôm nay thì bắt đầu mới từ ngày mai; nút chỉ hiện khi `lastClose < hôm nay`). Tạo chu kỳ Open (601) với mọi làn "Chưa thả"; đánh dấu dòng bè "đã đổi" để tránh đua với đổi số làn; audit `CultivationCycle.Started`; **không thông báo**.
3. Có chỉ mục duy nhất lọc "một chu kỳ Open/bè" ở DB chống hai lần bấm đồng thời.

**Luồng 2 – Sửa kế hoạch** (tab **Kế hoạch** → **Chỉnh sửa** → **Lưu**; `PUT /api/cultivation-cycles/{id}` với `rowVersion`): sửa được ngày bắt đầu và 3 ước tính khi chu kỳ Open; ước tính gửi rỗng = xóa. Ngày bắt đầu mới không được sau ngày bản ghi đầu tiên (lần thả hoặc nhật ký đầu tiên) (`CultivationCycleValues.cs:29-32`). Audit `CultivationCycle.Updated` (chỉ trường đổi). Không thông báo.

**Luồng 3 – Hủy chu kỳ mở nhầm** (nút "Hủy chu kỳ mở nhầm" hiện khi `canCancel`): chỉ khi **không có lần thả, nhật ký, lô thu hoạch nào** (`CultivationCycleRepository.cs:44-47`); xóa hẳn, chỉ còn trong audit; nếu có: 409 MSG-GEN-06 "Cannot proceed because N records are still in use: records of the cultivation cycle started dd/MM/yyyy. Please handle these records first.". Không tính bản ghi sử dụng vật tư.

**Luồng 4 – Xem tiến độ / lịch sử** (tab **Tiến độ**, **Lịch sử**): chọn chu kỳ hoặc "Tra cứu theo ngày", sơ đồ làn, khung "Kế hoạch chu kỳ" và "Thực hiện thả giống" (x/y làn).

**Luồng 5 – Đóng chu kỳ (backend CÓ, WEB CHƯA CÓ MÀN HÌNH ⚠)**
1. `GET /api/cultivation-cycles/{id}/close/preview` (CYCLE-06 bước 1–4): trả bản tóm tắt (như đóng hôm nay), `isEarly`, `needsOwnerApproval`, câu hỏi MSG-CYCLE-07 (đóng sớm) và MSG-CYCLE-05 ("Close the cultivation cycle of raft B1-01? After closing, the cycle cannot be reopened and its records can no longer be changed."), `cycleRowVersion`.
2. `POST /api/cultivation-cycles/{id}/close {assessment, rowVersion, ownerApproved}`: **Đánh giá bắt buộc** (≤2000; thiếu → 400 "Assessment is missing or invalid..."); đóng sớm bởi Quản lý vùng mà thiếu `ownerApproved` → **409** MSG-CYCLE-07 với `confirmFlag: ownerApproved`, danh sách làn chưa thu, **chưa lưu gì**; sau đó: Status = Closed (602), CloseDate = hôm nay, lưu đánh giá, cờ `closedEarly`, audit `CultivationCycle.Closed` (kèm `OwnerApprovalConfirmed` và các số của ngày đóng), thông báo MSG-CYCLE-06 cho Owner. Không bao giờ mở lại. Phiên bản chu kỳ được kiểm: nếu có thao tác khác vừa đổi chu kỳ → 409 MSG06 (tóm tắt không bị lệch).
3. Hiện tại người dùng web **không đóng được chu kỳ** (không có nút/đoạn mã gọi `close`: `src/server/operations/cultivation-plan.ts` chỉ cho `start|edit|cancel`). Web chỉ **hiển thị** "Ngày đóng", "Đánh giá" nếu chu kỳ đã đóng từ nơi khác.

### 3.4 Bảng trường
| Trường | Kiểu | Bắt buộc | Giới hạn / validate | Mặc định / nguồn | Hiển thị |
|---|---|---|---|---|---|
| startDate | ngày | có (trống = hôm nay khi bắt đầu) | ≤ hôm nay; > ngày đóng chu kỳ trước; khi sửa ≤ bản ghi đầu tiên (`CultivationCycleValues.cs:29-32`); web: `validatePlan` "Ngày bắt đầu không được sau hôm nay" (`cycle-model.ts`) | hôm nay | "Ngày bắt đầu" |
| expectedSeedQuantity | số | không | > 0; làm tròn 3 chữ số (`FieldCheck.PositiveOptional`, KHÔNG báo lỗi khi dư chữ số, chỉ làm tròn); web zod `positive` | rỗng ("Chưa lập") | "Lượng giống dự kiến"; **không có đơn vị** |
| expectedHarvestDate | ngày | không | > ngày bắt đầu (`CultivationCycleValues.cs:23`) | rỗng | "Ngày thu hoạch dự kiến" |
| targetYieldKg | số | không | > 0; 2 chữ số thập phân | rỗng | "Sản lượng mục tiêu (kg)" |
| rowVersion | chuỗi | khi sửa/hủy/đóng | – | – | – |
| assessment | chuỗi | khi đóng | 1–2000 | – | "Đánh giá" |
| ownerApproved | bool | khi đóng sớm do Quản lý vùng | – | false | – |
| (hệ thống) status 601/602, closeDate, seedingCompletedOn, closedEarly, daysOfFarming | – | – | – | – | "Tình trạng", "Số ngày nuôi", "Thả giống hoàn tất" |

### 3.5 Quy tắc và tính toán

| # | Quy tắc / công thức | Cờ |
|---|---|---|
| C1 | Mỗi bè tối đa 1 chu kỳ Open; các chu kỳ không chồng nhau; bắt đầu sau ngày đóng trước | ✔ BR-CYCLE-01 |
| C2 | 3 ước tính là tùy chọn; ngày thu dự kiến > ngày bắt đầu; số lượng > 0 | ✔ BR-CYCLE-01 |
| C3 | **Không có kiểm tra "hợp lý" giữa kế hoạch và thực tế** khi thả/thu: kế hoạch chỉ để so sánh ở tóm tắt | ✔ (SRS: so sánh chỉ hiển thị, BR-CYCLE-06) – (đang triển khai: trần sản lượng mục tiêu khi thu hoạch, D1/D5 ⚠ SRS đổi) |
| C4 | Số ngày nuôi = (ngày cuối − ngày bắt đầu) + 1, tính cả hai đầu. Chu kỳ Open: ngày cuối = hôm nay. Đã đóng: ngày lô thu hoạch cuối, nếu không có lô thì ngày đóng (`CycleDaysOfFarming.cs`) | ✔ BR-CYCLE-06 |
| C5 | **Tóm tắt chu kỳ** (`CycleSummaryReader.cs:43-57`; không lưu, tính lại mỗi lần xem): Giống đã thả = Σ số lượng các lần thả; Kg đã thu = Σ kg ước tính các lô; Ngày thu cuối = ngày lô muộn nhất; so với 3 ước tính, thiếu ước tính thì "Chưa lập" | ✔ BR-CYCLE-06 |
| C6 | Đóng bình thường khi có ≥1 làn có giống và **mọi làn có giống đều Đã thu hoạch**; còn lại là **đóng sớm** (lý do: không có lần thả nào, hoặc còn làn Đang nuôi/Đang thu hoạch) | ✔ BR-CYCLE-07 |
| C7 | Đóng sớm: làn Đang nuôi kết thúc cùng chu kỳ "không có kg thu và không ghi hao hụt"; làn Đang thu hoạch thì kg đã ghi vẫn tính | ✔ BR-CYCLE-07 |
| C8 | Quản lý vùng đóng sớm: phải gửi `ownerApproved=true`; **hệ thống chỉ ghi lại lời xác nhận, không kiểm chứng** (Owner đồng ý "trực tiếp, ngoài hệ thống") | ✔ BR-CYCLE-07 / ⚠ kiểm soát lỏng |
| C9 | Đóng xong khóa: kế hoạch, lần thả, nhật ký, lô, đánh giá, sử dụng vật tư có ngày trong khoảng; chỉ sửa được bằng Truy xuất (mục 8) | ✔ BR-CYCLE-04 |
| C10 | Lô còn "Open" (chưa bán hết) **không chặn** đóng chu kỳ; lô vẫn bán tiếp | ✔ BR-HARVEST-04 ("selling and closing are still allowed") |
| C11 | Nhắc đóng chu kỳ (MSG-CYCLE-08) khi làn có giống cuối cùng thành Đã thu hoạch; bị rút lại nếu gỡ/sửa lô kéo làn lùi | ✔ BR-CYCLE-07 |
| C12 | "Kế hoạch công việc theo chu kỳ" trên web là **bản mẫu không lưu** (nhãn "Bản mẫu"); backend không có và SRS v8 đã bỏ (UC30 removed) | ✔ (SRS không có kế hoạch thu hoạch) |

### 3.6 Liên kết
Bè (chỉ In Use mới bắt đầu); Thả giống, Nhật ký, Thu hoạch (thuộc chu kỳ Open); Sử dụng vật tư (xếp vào chu kỳ theo ngày, không lưu khóa chu kỳ); Công việc nhân sự (BR-LABOR-07: phân công theo chu kỳ Open). Khoảng trống: chưa có màn đóng chu kỳ trên web; chưa có tóm tắt chu kỳ trên web (tóm tắt chỉ có API `summary`); không hiển thị chi phí/doanh thu của chu kỳ.

### 3.7 Câu hỏi cho chủ
1. **Web chưa có "Đóng chu kỳ"**: backend đã sẵn (preview, đóng sớm, thông báo). Chủ có muốn bổ sung màn đóng + tóm tắt không? (Hiện không thể đóng chu kỳ từ web → bè không bao giờ sang chu kỳ mới.)
2. **Kế hoạch thiếu đơn vị và thiếu ràng buộc hợp lý**: demo B1-01 có "lượng giống dự kiến 250" mà thả 5.000, "mục tiêu 8.500 kg" cho 5.000 con ⇒ 1,7 kg/con (hàu thương phẩm khoảng vài chục gam). Kỳ vọng: nhập đơn vị (con) và cảnh báo khi kg/con ngoài khoảng 0,01–0,30.
3. **Ước tính "ngày thu hoạch dự kiến"** (02/08/2027) mà thực tế thu ngày 11/11/2026 (sau 41 ngày nuôi): không cảnh báo. Có muốn cảnh báo khi thu sớm hơn dự kiến quá N ngày?
4. **Đóng sớm do Quản lý vùng** chỉ cần tick "Owner đồng ý": có muốn buộc Owner tự duyệt trong hệ thống (thay đổi SRS) hay giữ?
5. **Hủy chu kỳ** không tính "Sử dụng vật tư" đã ghi trong chu kỳ: hủy xong bản ghi vật tư chuyển sang nhóm "không có chu kỳ". Chấp nhận?
6. **Chu kỳ không ràng buộc với khoảng "mùa vụ"**: một bè có thể bắt đầu chu kỳ ngay hôm sau ngày đóng; chấp nhận?

---

## 4. Nhật ký chăm sóc (Cultivation log)

### 4.1 Mục đích
Ghi lại mỗi lần ra thăm bè: ngày, ảnh chụp bè (bắt buộc ít nhất 1 ảnh), ghi chú tự do. Là bằng chứng chăm sóc cho Owner xem; ảnh **chỉ nhân viên xem**, không bao giờ lên trang công khai (BR-FARM-09 ✔). Không chứa số đo nước (nước ghi ở màn Chất lượng nước).

### 4.2 Ai dùng, quyền
Quản lý vùng của vùng và Owner (`CULTIVATION_LOGS` Create/Edit/Delete). Sửa/gỡ: người ghi hoặc Owner, khi chu kỳ còn Open (`CultivationLogViews.MayCorrect`). Sau khi đóng chu kỳ: sửa ở Truy xuất lô (mục 8, TRACE-03.1).

### 4.3 Luồng từng bước
**Ghi nhật ký**: menu Nuôi trồng → Chu kỳ nuôi → bấm bè → tab **Nhật ký chăm sóc** → **Ghi nhật ký chăm sóc** (chỉ khi chu kỳ Open và có quyền) → hộp "Ghi nhật ký chăm sóc": Ngày chăm sóc (mặc định hôm nay), Nội dung chăm sóc, Ảnh chăm sóc (chọn nhiều ảnh) → **Lưu nhật ký**.
1. Web kiểm: 1–10 ảnh, JPEG/PNG, mỗi ảnh ≤10 MB ("Nhật ký cần từ 1 đến 10 ảnh.", "Chọn tối đa 10 ảnh JPEG/PNG, mỗi ảnh không quá 10 MB.") (`src/features/cycles-api/log-screen.tsx`).
2. `POST /api/cultivation-cycles/{cycleId}/cultivation-logs` (multipart: `visitDate`, `notes`, các tệp `photos`) (`CultivationLogService.cs`).
3. Backend: kiểm quyền → chu kỳ Open, bè In Use → kiểm trường → **tải ảnh lên trước**: nếu một ảnh lỗi thì **không lưu gì và không báo ai** (GFR-01) → đọc lại chu kỳ SAU khi tải ảnh (tải ảnh có thể mất vài phút ở ngoài biển) → lưu nhật ký + ảnh, đánh dấu dòng chu kỳ "đã đổi" → audit `CultivationLog.Created` → thông báo MSG-CYCLE-04 tới Owner (trừ khi Owner tự ghi). Kết quả: "Cultivation log saved."
**Sửa**: nút "Sửa" → thêm ô **Lý do sửa** (bắt buộc), tick "Giữ ảnh n" cho ảnh cũ muốn giữ (ảnh không tick và không gửi lại bị xóa) → `PUT /api/cultivation-logs/{id}`. **Gỡ**: "Gỡ nhật ký" → hỏi "Lý do gỡ nhật ký chăm sóc" → `POST /api/cultivation-logs/{id}/remove`. Nhật ký **không có rowVersion** (NFR-09 miễn cho nhật ký) nên hai người sửa cùng lúc: người sau ghi đè.

### 4.4 Bảng trường
| Trường | Kiểu | Bắt buộc | Giới hạn / validate | Mặc định / nguồn | Hiển thị |
|---|---|---|---|---|---|
| visitDate | ngày | có | ≥ ngày bắt đầu chu kỳ, ≤ hôm nay (`CultivationLogValues.cs:26`); web: `max=hôm nay` | hôm nay | "Ngày chăm sóc" |
| notes | chuỗi | không | ≤ 2000 (`CultivationLogValues.cs:12`) | – | "Nội dung" |
| photos | tệp | ≥ 1 | tối đa 10; JPEG/PNG; ≤10 MB/ảnh (`FileRules.Photos`); lỗi: "Attach at least one photo." / "A log holds at most 10 photos." | – | "Ảnh 1, 2..." (đường dẫn ký có hạn) |
| reason (sửa/gỡ) | chuỗi | có | 1–1000 | – | audit |
| keepPhotoKeys (sửa) | danh sách khóa | – | phải là ảnh của chính nhật ký này | tất cả ảnh cũ | – |
| (hệ thống) recordedBy, recordedAt | – | – | – | người đăng nhập | "Người ghi" |

### 4.5 Quy tắc và tính toán
| # | Quy tắc | Cờ |
|---|---|---|
| L1 | Mỗi nhật ký thuộc chu kỳ Open; không giới hạn số nhật ký | ✔ BR-CYCLE-05 |
| L2 | Ngày thăm không trước ngày bắt đầu chu kỳ, không quá hôm nay (có thể ghi sau chuyến đi) | ✔ BR-CYCLE-05 |
| L3 | Bắt buộc ≥1 ảnh, tối đa 10 | ✔ (SRS: ≥1 ảnh) |
| L4 | Không ghi ngoại tuyến; ảnh lỗi thì thử lại, giữ nguyên các mục khác | ✔ GFR-01 |
| L5 | Sửa/gỡ: người ghi hoặc Owner, chu kỳ Open, cần lý do | ✔ BR-CYCLE-05 |
| L6 | Không có dữ liệu có cấu trúc (hao hụt, kích cỡ, nước...) nên **không thể tính toán gì từ nhật ký** | ✔ (SRS cố ý) |
| L7 | Ghi nhật ký chặn **hủy chu kỳ** (đếm vào "bản ghi") | ✔ BR-CYCLE-01 |

### 4.6 Liên kết
Chu kỳ (ngày bắt đầu, khóa khi đóng); Truy xuất (sửa sau đóng; nhật ký không hiện ở trang công khai); Thông báo Owner; Màn Tiến độ liệt kê nhật ký của chu kỳ ("logs" trong `GET /api/rafts/{id}/progress`). Khoảng trống: không liên kết nhật ký với lần thả hay lô thu hoạch; không có báo cáo/tìm kiếm nhật ký.

### 4.7 Câu hỏi cho chủ
1. Nhật ký chỉ có ảnh và ghi chú: nếu muốn đánh giá hao hụt hay sức khỏe hàu theo thời gian thì cần thêm ô số liệu (ví dụ "tỷ lệ chết ước tính", "cỡ trung bình") – thay đổi SRS (D4 đã chọn không ghi hao hụt dạng dữ liệu).
2. **Hai người sửa cùng lúc** (không có phiên bản): chấp nhận ghi đè?
3. Một chu kỳ bắt buộc "ít nhất 1 nhật ký/tháng"? Hiện không nhắc (SRS: "thường hằng tháng", không ép).

---

## 5. Sử dụng vật tư (Material usage)

### 5.1 Mục đích
Ghi lại vật tư dùng để **sửa chữa bè** (phao, dây...): ngày, lý do sửa, từng vật tư và số lượng. Chỉ số lượng; chi phí tính riêng khi cần xem chi phí vật tư của bè.

### 5.2 Ai dùng, quyền
Quản lý vùng của vùng và Owner (`CULTIVATION_CYCLES` Create/Edit). Sửa: **bất kỳ** quản lý vùng của vùng (không cần là người ghi) (`MaterialUsageEditService.cs:15`) ✔ BR-CYCLE-03. **Không có xóa** (backend không có endpoint, web không có nút).

### 5.3 Luồng từng bước
**Ghi**: menu Nuôi trồng → **Sử dụng vật tư** (`/operations/material-usages`) → chọn vùng → bấm bè → khu danh sách nhóm theo chu kỳ ("Chu kỳ từ dd/mm/yyyy" hoặc "Ngoài chu kỳ nuôi"; nhãn "Theo dõi"/"Đã khóa") → nút **Ghi nhận vật tư** → hộp "Ghi nhận sử dụng vật tư": Ngày sử dụng, Nội dung sửa chữa / bảo dưỡng, các dòng (Vật tư, Số lượng) với nút "Thêm vật tư" → lưu → xác nhận "Lưu ghi nhận sử dụng vật tư?" → `POST /api/rafts/{raftId}/material-usages {usageDate, repairReason, items[{itemId, quantity}]}`.
Backend (`MaterialUsageService.cs`): quyền; bè và vùng In Use; kiểm trường (mọi trường sai được nêu: "Repair date", "Repair reason", "Items", "Line 2 item", "Line 2 quantity"); vật tư đã ngừng → 409 MSG-GEN-09; ngày không rơi vào chu kỳ **đã đóng** của bè (409 "The cultivation cycle of raft B1-01 from 02/10/2026 to 20/11/2026 is Closed and cannot be used for this action."); tạo **mỗi vật tư một bản ghi**; audit `MaterialUsage.Created`; không thông báo; **không cần chu kỳ đang mở**.
**Sửa** (mở dòng → sửa → ô **Lý do điều chỉnh** bắt buộc): `PUT /api/material-usages/{id} {raftId, usageDate, itemId, quantity, repairReason, reason, rowVersion}`; backend cho đổi cả **bè** (sửa nhầm bè sang bè khác In Use trong vùng mình có quyền) nhưng web luôn gửi bè cũ ⚠ (không có ô đổi bè).

### 5.4 Bảng trường
| Trường | Kiểu | Bắt buộc | Giới hạn / validate | Mặc định / nguồn | Hiển thị |
|---|---|---|---|---|---|
| usageDate | ngày | có | ≤ hôm nay; không trong chu kỳ đã đóng (`MaterialUsageValues.cs:34`, `MaterialUsageCycleGuard.cs`) | hôm nay | "Ngày" |
| repairReason | chuỗi | có | 1–500 ký tự (`MaterialUsage.cs:18`) | – | "Nội dung sửa chữa" |
| items[].itemId | guid | có, ≥1 dòng | vật tư nhóm **Material**, đang dùng, **không lặp** trong một lần sửa | danh sách chọn | "Vật tư" |
| items[].quantity | số | có | > 0, ≤ 1.000.000.000, **tối đa 3 chữ số thập phân** (`MaterialUsageValues.cs:28,42`) | – | "Số lượng" + đơn vị |
| reason (sửa) | chuỗi | có | 1–1000 | – | audit |
| rowVersion (sửa) | chuỗi | có | – | – | – |
| (hệ thống) cycleId | guid? | – | **tính khi đọc** từ ngày: chu kỳ của bè đang Open ở ngày đó; trống nếu không có | – | nhóm "Ngoài chu kỳ nuôi" |

### 5.5 Quy tắc và tính toán
| # | Quy tắc | Cờ |
|---|---|---|
| M1 | Chỉ vật tư nhóm Material; mỗi vật tư một dòng/lần sửa | ✔ BR-CYCLE-03, BR-PURCHASE-10 |
| M2 | Ngày ≤ hôm nay; **không** trong chu kỳ đã đóng của bè (cả ngày đóng); số lượng > 0 | ✔ BR-CYCLE-03/04 |
| M3 | Bản ghi thuộc chu kỳ Open ở ngày của nó, **không lưu**; ngày không có chu kỳ vào nhóm riêng | ✔ BR-CYCLE-03 |
| M4 | Sửa cần lý do; có thể chuyển sang bè khác (backend) | ✔ BR-CYCLE-03 |
| M5 | **Chi phí vật tư của bè** = Σ [số lượng × (đơn giá − chiết khấu) của dòng phiếu nhập Completed mới nhất của mặt hàng có ngày nhận ≤ ngày sử dụng], làm tròn đồng; mặt hàng chưa từng mua = 0 và đếm "unpricedCount" (`RaftMaterialCostQuery.cs`). Ví dụ B1-01: 4 phao × 380.000 + 1,5 cuộn × 650.000 + 2 phao × 380.000 = **3.255.000 đồng** | ⚠ SRS BR-FARM-05 viết cách khác (tính theo phiếu ghi tên bè, trừ trả hàng; sử dụng vật tư không có giá) |
| M6 | Không trừ kho, không kiểm tồn; không thông báo | ✔ SRS (BR-PURCHASE-07 "OMTS keeps no stock") / ⚠ so với sổ kho ➕ (mục 1) |
| M7 | Không giới hạn "ngày dùng không trước ngày nhập vật tư" | ⚠ SRS không nói |

### 5.6 Liên kết
Bè (chi phí vật tư hiện ở màn Bè, Phần A, và "Chi phí vật tư bè" ở Phiếu nhập); Chu kỳ (nhóm hiển thị, khóa khi đóng); Danh mục Vật tư; Sổ kho (không liên kết, xem mục 1). Khoảng trống: không biết bè nào dùng bao nhiêu **trên mỗi con/kg thu hoạch**; không xóa được bản ghi nhập nhầm (chỉ sửa).

### 5.7 Câu hỏi cho chủ
1. **Không xóa được** bản ghi nhập nhầm cả vật tư: kỳ vọng thêm "Gỡ bản ghi" có lý do (giống nhật ký/lô).
2. Có cho ghi vật tư **không cần chu kỳ** (đúng SRS) hay bắt buộc có chu kỳ Open?
3. Số lượng vật tư có kiểm so với tồn kho không (đang triển khai D6 "kiểm sổ kho khi dùng vật tư")? Nếu có, sửa chữa bằng vật tư "mượn" chưa nhập sẽ bị chặn khi cấu hình không cho âm.
4. Cách tính chi phí (mục M5) có đúng ý chủ không: giá "mới nhất tại ngày dùng" hay giá bình quân/giá vốn trong sổ kho?
5. Web chưa cho **chuyển bản ghi sang bè khác** dù backend và SRS cho phép.

---

## 6. Thu hoạch (Harvest lot)

### 6.1 Mục đích
Mỗi **chuyến thu hoạch** tạo một **lô thu hoạch** (mã duy nhất, công khai): bè, các làn, số lồng, kg ước tính, ảnh. Là đơn vị để bán, truy xuất và đo sản lượng. Cũng là nơi đánh dấu làn "đã thu hết".

### 6.2 Ai dùng, quyền
Ghi: quản lý vùng của vùng và Owner (`HARVESTS` Create). Sửa/gỡ: người ghi hoặc Owner (Edit/Delete). Đóng lô (HARVEST-02): mọi quản lý vùng của vùng hoặc Owner, **không Kế toán** (`HARVEST_LOTS` Edit). Cài đặt: chỉ Owner.

### 6.3 Luồng từng bước
**Luồng 1 – Ghi nhận chuyến thu hoạch**
1. Menu Nuôi trồng → **Thu hoạch** (`/operations/harvest`) → chọn vùng → bấm bè → tab **Thu hoạch** (khu "Các lô thu hoạch"; có ô lọc "Tìm mã lô", "Trạng thái lô") → nút **Ghi nhận thu hoạch** → hộp "Ghi nhận chuyến thu hoạch" (2 khối: "Phạm vi thu hoạch" và "Số lồng và ảnh").
2. Chọn **Làn thu hoạch** (chỉ làn `canHarvest`: In Use và Đang nuôi hoặc Đang thu hoạch); tick **"Làn đã thu hết hàu trong chuyến này"** cho những làn không còn hàu (trong số làn đã chọn; làn không tick vẫn Đang thu hoạch); nhập **Số lồng thu hoạch** (nguyên ≥1); **Ước tính kg** (để trống = số lồng × kg/lồng hiện hành; ô gợi ý "10 lồng ≈ 500 kg"); **Ảnh** (tùy chọn, ≤10, JPEG/PNG, ≤10 MB). Dòng ghi chú: "Thời điểm thu hoạch được hệ thống ghi khi lưu."
3. **Lưu chuyến thu hoạch** → xác nhận "Ghi nhận 8 lồng từ làn 1, 2; đã thu hết làn 2?" → `POST /api/rafts/{raftId}/harvest-lots` (multipart: `laneNumbers`, `finishedLaneNumbers`, `cageCount`, `estimatedKg`, `photos`).
4. Backend (`HarvestLotRecordingService.cs`): kiểm quyền → bè và vùng In Use, **bè phải có chu kỳ Open** (409 "Raft B1-06 is without an Open cycle and cannot be used for this action.") → kiểm trường (400 MSG-GEN-01: "Lanes cannot be harvested now" gợi ý "Lanes 2 cannot be harvested now." / "Finished lanes" / "Number of cages" / "Estimated kg" / "Photos") → tải ảnh trước (lỗi thì không lưu) → **đọc lại mọi thứ sau khi tải ảnh**: chu kỳ Open, trạng thái làn, kg/lồng, giờ thu hoạch, mã lô → tạo lô: mã lô, **ngày giờ thu hoạch = giờ máy chủ lúc lưu (UTC+7), người dùng không nhập được**, sao chép kg/lồng hiện hành vào lô, trạng thái **Open (2901)**, các dòng làn (cờ "thu hết"), ảnh → đánh dấu dòng chu kỳ "đã đổi" (hai lô cùng lúc: một bên báo MSG06 và phải gửi lại theo trạng thái làn mới) → audit `HarvestLot.Created` → thông báo MSG-HARVEST-01 cho Owner → nếu **mọi làn có giống đều Đã thu hoạch** và chưa nhắc: gửi MSG-CYCLE-08 nhắc đóng chu kỳ.
5. Hai lô trùng mã (cùng bè cùng ngày cùng giờ): bên thua tự lấy mã kế tiếp, tối đa 5 lần.

**Luồng 2 – Sửa lô** (mở dòng → "Mở hồ sơ lô"/"Sửa lô thu hoạch"): sửa làn, làn thu hết, số lồng, kg, ảnh; **Lý do điều chỉnh bắt buộc**; `PUT /api/harvest-lots/{id}` kèm `rowVersion` và `keepPhotoKeys`. Điều kiện: chu kỳ Open, bè/vùng In Use, người ghi hoặc Owner (Owner sửa được cả lô đã nằm trên hóa đơn). Không đổi: mã lô, ngày giờ thu hoạch, kg/lồng đã sao chép. Để trống kg: giữ kg cũ nếu số lồng không đổi; nếu đổi số lồng thì tính lại theo kg/lồng **của lô** (không dùng cài đặt mới). Làn đã được lô **sau** đánh dấu thu hết thì không đánh dấu thu hết ở lô này ("Lanes 2 are in a later harvest lot and cannot be marked finished in this one."). Sửa làm làn lùi lại Đã thu hoạch → rút cờ nhắc đóng chu kỳ; sửa làm làn cuối Đã thu hoạch → nhắc.
**Luồng 3 – Gỡ lô** (nút "Gỡ lô thu hoạch", cần lý do; xác nhận "Gỡ lô {mã} và các ảnh của lô? Lý do sẽ được lưu vào nhật ký."): `POST /api/harvest-lots/{id}/remove`. **Bị chặn nếu lô đã nằm trên bất kỳ hóa đơn bán nào** (409 "Harvest lot ... is on a sales invoice and cannot be used for this action.") hoặc đang trong đơn chờ chuyển khoản (VietQR). Lô gỡ chỉ còn trong audit; mã lô **không cấp lại**; trạng thái làn tính lại từ các lô còn lại.
**Luồng 4 – Cài đặt** (nút "Quy đổi & tự đóng lô", chỉ Owner): kg trung bình mỗi lồng (>0, ≤9.999.999,99, 2 chữ số thập phân; mặc định 50) và số ngày trước khi tự đóng lô (1–365, mặc định 3); khi **giảm** số ngày, hệ thống báo trước số lô sẽ bị đóng ở lần kiểm tra kế tiếp. Số kg/lồng mới chỉ áp dụng cho lô ghi sau đó.
**Luồng 5 – Đóng lô** (backend có `POST /api/harvest-lots/{id}/close`; **web chưa có nút** ⚠): đóng lô còn đang bán (Open/Reopened) với kg còn lại (≥0, 3 chữ số thập phân) và, nếu >0, lý do **Unsold** hoặc **Spoiled**. Cách khác để lô thành Closed: tick "bán cả lô" trên hóa đơn (kg còn lại 0), hoặc **tự đóng** hằng ngày khi quá N ngày (lý do "Time limit reached", kg còn lại = phần còn lại). Lô Closed được mở lại (Reopened) khi hủy hóa đơn đã đóng nó, bỏ tick, hoặc trả hàng bán cho vào lô lại.
**Luồng 6 – Thu xong làn riêng (đang triển khai)**: `POST /api/rafts/{id}/lanes/{n}/finish-harvest` đặt cờ "thu hết" lên dòng làn của lô mới nhất chứa làn đó, ghi audit `HarvestLot.LaneFinished`, nhắc đóng chu kỳ nếu là làn cuối. Hiện tại muốn "thu hết" một làn phải ghi một lô mới (cần số lồng >0) hoặc sửa lô cũ kèm lý do.

### 6.4 Bảng trường
| Trường | Kiểu | Bắt buộc | Giới hạn / validate (backend; web) | Mặc định / nguồn | Hiển thị |
|---|---|---|---|---|---|
| laneNumbers | danh sách số | có (≥1) | mỗi làn một lần; làn In Use; trạng thái Đang nuôi/Đang thu hoạch (`HarvestLotFieldReader.cs:136`); web chỉ liệt kê làn `canHarvest` (`records-harvest-form.tsx:87`) | – | "Làn thu hoạch" |
| finishedLaneNumbers | danh sách số | không | tập con của `laneNumbers`, không trùng (`HarvestLotFieldReader.cs:50`) | rỗng | "Đã thu hết: 2" |
| cageCount | **số nguyên** (HEAD) | có | > 0; **không có trần trên** (HEAD, `HarvestLotFieldReader.cs:47`); DB CHECK >0; web: nguyên dương (`records-contracts.ts:20`). (đang triển khai: thập phân 2 chữ số, ≤100.000) | – | "Số lồng thu hoạch" |
| estimatedKg | số | không | trống → lồng × kg/lồng; nhập tay: >0, ≤1.000.000.000, **2 chữ số thập phân** (HEAD `:48-51`), **không liên quan số lồng**. (đang triển khai: chỉ trong 0,2–2 lần lồng × kg/lồng) | lồng × `averageKgPerCage` hiện hành | "≈ 400 kg" |
| overPlanReason / confirmOverPlan | chuỗi/bool | không | (đang triển khai) khi tổng kg chu kỳ vượt 110% mục tiêu | – | – |
| photos | tệp | không | ≤10, JPEG/PNG, ≤10 MB/ảnh | – | "Ảnh chuyến thu hoạch" |
| reason (sửa/gỡ) | chuỗi | có khi sửa/gỡ | 1–1000 | – | audit |
| keepPhotoKeys, rowVersion (sửa) | – | có | – | – | – |
| (hệ thống) lotCode | chuỗi | – | `{mã bè}-{yyyyMMdd}` (thêm mã vùng phía trước nếu mã bè không bắt đầu bằng mã vùng); lô thứ 2 trở đi trong ngày thêm `-2`, `-3` (`HarvestLotCodes.cs`); duy nhất toàn HTX | ví dụ `DEMO-01-B1-01-20261111-2` | "Mã lô / thời điểm" |
| (hệ thống) harvestedAt, harvestDate | giờ | – | = giờ máy chủ UTC+7; **không đổi được, không nhập được, không ghi lùi** | – | "Thời điểm thu hoạch" |
| (hệ thống) kgPerCage | số | – | bản sao `averageKgPerCage` lúc ghi | 50 | "Quy đổi tại thời điểm ghi" |
| (hệ thống) status | Open 2901 / Reopened 2902 / Closed 2903 | – | – | Open | "Trạng thái" |
| (hệ thống) originState | NotPublished / Published / Withdrawn | – | xem mục 8 | NotPublished | – |

### 6.5 Quy tắc và tính toán
| # | Quy tắc / công thức | Cờ |
|---|---|---|
| H1 | Một lô = một chuyến của **một bè**; một bè có nhiều lô một ngày | ✔ BR-HARVEST-03 |
| H2 | Ngày giờ thu hoạch do hệ thống ghi; lô thuộc chu kỳ Open ngày đó; **không ghi bù được ngày đã qua** | ✔ BR-HARVEST-03 (bất tiện nếu quên ghi) |
| H3 | Chỉ chọn làn In Use đang Đang nuôi/Đang thu hoạch. **Làn Đang thu hoạch vẫn chọn được** cho đến khi tick thu hết | ✔ BR-HARVEST-01 |
| H4 | Một làn có thể ở nhiều lô; "thu hết" → Đã thu hoạch → không chọn lại | ✔ BR-HARVEST-01 |
| H5 | **Số lồng**: nguyên > 0, **không trần**; ví dụ 5.000 lồng = 250.000 kg vẫn lưu | ✔ SRS không nêu trần / ⚠ rủi ro gõ nhầm (đang triển khai D8: ≤100.000 và thập phân) |
| H6 | **kg ước tính** = lồng × kg/lồng (cài đặt hiện hành, sao chép vào lô) hoặc số nhập tay bất kỳ >0 | ✔ BR-HARVEST-02 (SRS: sửa được) / ⚠ kg có thể vênh xa số lồng; (đang triển khai: 0,2–2 lần) |
| H7 | **Không so kg/lồng thu với giống đã thả, kế hoạch hay lượng đã thu**: có thể thu nhiều hơn đã thả; (đang triển khai: trần theo mục tiêu: >110% cảnh báo + lý do; >150% từ chối) | ✔ SRS (không giới hạn) / ⚠ chủ đã duyệt thay đổi (D1) |
| H8 | **Không có số kg theo từng làn**: lô nhiều làn chỉ có tổng; thu hoạch không biết lấy bao nhiêu từ làn nào | ✔ BR-FARM-03 ("never estimates kg on a lane") |
| H9 | Gỡ lô chặn khi lô nằm trên hóa đơn hoặc đơn chờ chuyển khoản; sửa lô không chặn (Owner sửa cả lô đã bán) | ✔ BR-HARVEST-05 |
| H10 | Sau khi chu kỳ đóng: không sửa ở màn Thu hoạch; sửa ở Truy xuất lô (cần lý do, Quản lý vùng cần Owner đồng ý) | ✔ BR-CYCLE-04, TRACE-03 |
| H11 | Trạng thái lô: Open → Closed (4 cách ở 6.3 luồng 5) → có thể Reopened → Closed lại; Open/Reopened = "còn bán" (chọn được trên hóa đơn); Closed không chọn | ✔ BR-HARVEST-04 |
| H12 | Tự đóng hằng ngày: lô còn bán đóng khi `ngày tính từ + N + 1 ≤ hôm nay` với "ngày tính từ" = ngày thu hoặc ngày mở lại; ví dụ N=3, thu 26/10 → bán được hết 29/10, đóng đầu ngày 30/10; ngày 29/10 gửi MSG-HARVEST-05; kg còn lại = còn lại − phần đang chờ chuyển khoản (`HarvestLotAutoCloseRule.cs:12-15`) | ✔ BR-HARVEST-04/06, GFR-05 |
| H13 | **Phép tính của một lô** (`HarvestLotFigures.cs:21-29`): Đã lập hóa đơn = Σ kg dòng hóa đơn không hủy (hóa đơn sửa tính kg mới nhất); Đã bán = Hóa đơn − Trả lại; Còn lại = max(0, Ước tính − Hóa đơn + kg trả lại đã vào lại lô); Hao hụt = kg còn lại khi đóng + kg bỏ đi từ trả hàng; **Chênh lệch = Ước tính − Đã bán − Hao hụt**; chưa chốt khi lô còn bán | ✔ BR-HARVEST-07 |
| H14 | **Bán không bị giới hạn bởi kg ước tính** (hóa đơn có thể bán hơn ước tính; khi đó Còn lại = 0 và Chênh lệch âm) | ✔ BR-HARVEST-02 |
| H15 | Cài đặt kg/lồng chỉ áp cho lô mới; số "≈ lồng" ở danh sách kg dùng kg/lồng **riêng của từng lô**; riêng màn Sản lượng nuôi quy đổi bằng kg/lồng **hiện hành** | ✔ / ⚠ khác nhau nếu đã đổi cài đặt |
| H16 | Danh sách lô ở bè: lô còn bán xếp trước, rồi lô mới nhất; tổng số lồng/kg theo bộ lọc | – |

### 6.6 Liên kết
Chu kỳ (bắt buộc Open; MSG-CYCLE-08); Làn (trạng thái); Hóa đơn bán (chọn lô còn bán `GET /api/harvest-lots/for-sale`; kg bán không bị chặn bởi lô); Truy xuất (mọi lô); Sản lượng nuôi; Công bố nguồn gốc (QR). Khoảng trống: web không có đóng lô tay, không có "thu xong làn" (đang làm), không có chọn **ngày thu hoạch**; không có so sánh với giống đã thả.

### 6.7 Câu hỏi cho chủ (quan trọng nhất của báo cáo)
1. **Thu nhiều hơn đã thả** (H7): lô 8 lồng = 400 kg trong khi thả 5.000 con; không có đối chiếu nào. Kỳ vọng: cảnh báo khi tổng kg chu kỳ vượt mục tiêu (đã duyệt D1: +10% cảnh báo, +50% chặn). Hỏi thêm: so với **giống đã thả** có muốn thêm không (cần khối lượng/con và hao hụt – D3/D4 đã bỏ)?
2. **Làn Đang thu hoạch vẫn chọn được**: đúng SRS (thu nhiều ngày) nhưng người dùng không phân biệt được làn nào gần thu xong; (đang triển khai: nút "thu xong làn", nhóm "Đang thu" lên đầu, làn Đã thu hoạch/Chưa thả hiển thị xám kèm lý do).
3. **Không bắt buộc kế hoạch**: chu kỳ không có "mục tiêu" thì thu bao nhiêu cũng được. Có muốn bắt buộc nhập mục tiêu khi bắt đầu chu kỳ?
4. **Số lồng nguyên**: chuyến thu nửa lồng phải làm tròn (đang triển khai thập phân).
5. **kg nhập tay tự do**: 1 lồng nhưng kg = 100.000 vẫn lưu (đang triển khai: 0,2–2 lần).
6. **Không chọn được ngày thu hoạch** (chỉ giờ máy): quên ghi hôm qua thì không bù được; muốn cho ghi lùi tối đa mấy ngày (cần đổi SRS)?
7. **Không có đóng lô tay trên web** dù backend có: người dùng chỉ có tự đóng/bán cả lô.
8. **Lô đã bán vẫn sửa được** (Owner) → số lồng/kg đổi nhưng hóa đơn không đổi: chấp nhận? (SRS BR-HARVEST-05 cho phép).
9. **Một lô nhiều làn không có kg từng làn**: có chấp nhận mất khả năng so sánh năng suất từng làn không?

---

## 7. Sản lượng nuôi (Harvest yield – báo cáo)

### 7.1 Mục đích
Cho Owner/quản lý vùng thấy **đã thu bao nhiêu (ước tính), đã bán bao nhiêu, hao hụt bao nhiêu, còn lệch bao nhiêu** theo Bè, Vùng hoặc Chu kỳ trong một khoảng thời gian. Chỉ để theo dõi nuôi trồng, **không dùng để thanh toán** (BF-02.3). Không lưu số nào: tính lại mỗi lần xem, đọc dữ liệu, không ghi gì.

### 7.2 Ai dùng, quyền
`HARVEST_LOTS` View (xem), Export (xuất file): Owner mọi vùng; quản lý vùng trong vùng được gán; Kế toán không (§4.4 SRS ✔). Chọn vùng ngoài quyền → 403.

### 7.3 Luồng từng bước
1. Menu Nuôi trồng → **Sản lượng nuôi** (`/operations/harvest-yield`).
2. Cột lọc bên trái: **Thời gian thu hoạch** (mặc định "tháng này": mùng 1 đến cuối tháng), **Gộp theo** (Bè / Vùng nuôi / Chu kỳ; mặc định Bè), **Vùng nuôi** (tick nhiều vùng; không tick = tất cả vùng bạn được xem) → **Xem báo cáo** (`GET /api/harvest-yield?from&to&groupBy&zoneIds`).
3. Kiểm đầu vào: web "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc."; backend: `from > to` → 400 "From date is missing or invalid..."; khoảng **> 5 năm** → 400 "The period is at most 5 years."; `groupBy` khác raft/zone/cycle → 400 "Grouping ... Use raft, zone or cycle." (`HarvestYieldService.cs`).
4. Hiển thị: dải tổng (Số lô, Ước tính, Đã bán, Hao hụt, Chênh lệch; "≈ lồng" chỉ khi là Owner xem được kg/lồng) + bảng nhóm (sắp xếp, tìm nhóm, 20 dòng/trang); bấm tên nhóm xem từng lô (Mã lô, Ngày thu hoạch, Trạng thái lô, Ước tính, Đã bán, Hao hụt, Chênh lệch, Trạng thái số liệu); bấm lô nhảy sang màn Thu hoạch của bè.
5. Khi còn lô đang bán: thông báo MSG-HARVEST-04 "Some lots are still for sale, so their figures may still change." (web: "Một số lô vẫn đang được bán nên số liệu có thể còn thay đổi.").
6. **Xuất file** (nếu có quyền Export): `GET /api/harvest-yield/export`; không có dữ liệu vẫn xuất tiêu đề + hàng tổng 0. Không dữ liệu: MSG-GEN-10 "No data matches the filters you chose..." (kèm "period and zones").

### 7.4 Bảng trường
Bộ lọc

| Trường | Kiểu | Bắt buộc | Giới hạn | Mặc định | Hiển thị |
|---|---|---|---|---|---|
| from, to | ngày | không | from ≤ to; ≤ 5 năm; theo **ngày thu hoạch** của lô | tháng hiện tại | "Thời gian thu hoạch" |
| groupBy | Raft / Zone / Cycle | không | – | Raft | "Gộp theo" |
| zoneIds | danh sách vùng | không | trong vùng được phép | tất cả | "Vùng nuôi" |

Cột kết quả (mỗi nhóm và mỗi lô; `HarvestYieldDtos.cs`, `src/features/harvest-yield/contracts.ts`): lotCount, estimatedKg, soldKg, lostKg, differenceKg, notFinal; mỗi lô thêm invoicedKg, returnedKg, inPeriod, status.

### 7.5 Ý nghĩa và cách tính từng con số (`HarvestLotFigures.cs:21-29`, `HarvestYieldCalculator.cs`)

| Số | Của MỘT lô | Của nhóm / tổng |
|---|---|---|
| **Ước tính** (estimatedKg) | số lồng × kg/lồng (có thể bị sửa tay) – số nhập lúc thu hoạch | Σ ước tính các lô |
| **Đã lập hóa đơn** | Σ kg các dòng hóa đơn bán của lô; hóa đơn hủy không tính; hóa đơn sửa tính kg mới nhất | – (chỉ ở lô) |
| **Đã bán** | Đã lập hóa đơn − kg trả lại | Σ đã bán của các lô |
| **Hao hụt** | kg còn lại ghi khi đóng lô (người đóng nhập hoặc hệ thống tự điền khi tự đóng) + kg bỏ đi từ trả hàng | Σ hao hụt |
| **Chênh lệch** | **Ước tính − Đã bán − Hao hụt**. Dương: còn "lệch" chưa giải thích (chưa bán hết/chưa đóng/ước tính cao); 0: khớp; **âm: đã bán nhiều hơn ước tính** | Σ chênh lệch các lô |
| **Còn lại** (ở màn Thu hoạch, không ở báo cáo) | max(0, Ước tính − Đã lập hóa đơn + kg trả lại đã vào lại lô) | – |
| **Chưa chốt** (notFinal) | lô còn bán (Open/Reopened) | nhóm có ≥1 lô như vậy |

Quy tắc nhóm: mỗi lô thuộc một bè, vùng của lô = vùng của bè; **không chia kg một lô cho nhiều bè**. Nhóm Bè/Vùng: các lô có **ngày thu hoạch trong kỳ**. Nhóm **Chu kỳ**: lấy **mọi lô của mỗi chu kỳ có ít nhất một lô trong kỳ** (cờ `inPeriod` đánh dấu lô trong/ngoài kỳ) và các tổng dải trên cùng **cũng cộng cả lô ngoài kỳ** (`HarvestLotRepository.cs:112-125`, `HarvestYieldCalculator.cs`) ✔ BR-HARVEST-07.
Ví dụ demo B1-01 (chu kỳ 02/10/2026): 2 lô, Ước tính 400 + 180 = **580**; Đã bán 120 + 0 = **120**; Hao hụt **0**; Chênh lệch (400−120−0) + (180−0−0) = 280 + 180 = **460**; chưa chốt (cả hai lô đang Open).
Quy đổi "≈ lồng" của web (chỉ Owner): kg ÷ **kg/lồng hiện hành của HTX** (không phải của từng lô) (`yield-quantity.tsx`).

### 7.6 So khớp SRS

| Mục | Cờ |
|---|---|
| Công thức Đã bán, Còn lại, Hao hụt, Chênh lệch, chưa chốt | ✔ BR-HARVEST-07 |
| Nhóm theo chu kỳ lấy cả lô ngoài kỳ | ✔ BR-HARVEST-07 |
| **Trả hàng bán chưa nối**: `HarvestLotSalesQuery` chỉ trả `InvoicedKg`; kg trả lại/cho vào lô/bỏ đi luôn **0** (`SalesQueries.cs:33`; `NoSalesReturnsYetCheck` luôn false) nên "Đã trả", "Hao hụt do bỏ đi" không bao giờ phát sinh | ⚠ BR-HARVEST-07/CLAIM-03 chưa hiện thực |
| Không có so sánh với kế hoạch, giống đã thả, năng suất kg/con | ✔ (SRS không có) – (đang triển khai: báo cáo thêm số lồng thu, mục tiêu, còn lại so với mục tiêu, giống đã thả của nhóm) |
| Quy đổi lồng ở web dùng kg/lồng hiện hành thay vì của lô | ⚠ lệch nếu đã đổi cài đặt |

### 7.7 Liên kết
Đọc từ Lô thu hoạch, Chu kỳ, Hóa đơn bán (kg), Bè/Vùng. Bấm lô → màn Thu hoạch. Khoảng trống: không có kg/con, tỷ lệ sống, so kế hoạch, doanh thu/chi phí theo nhóm.

### 7.8 Câu hỏi cho chủ
1. **"Hao hụt" hiện chỉ là kg còn lại khi đóng lô**, chưa phải hao hụt nuôi (chết, rơi) và chưa gồm trả hàng. Có muốn đổi tên thành "Kg không bán được" hay thêm hao hụt nuôi thật (D4 chọn không nhập, chỉ suy ra)?
2. **Chênh lệch dương lớn là tốt hay xấu?** Hiện nghĩa là "ước tính cao hơn số đã bán + hao hụt". Có muốn đánh dấu ngưỡng (ví dụ lệch >10%)?
3. **Số "Ước tính" chỉ dựa trên số lồng đếm ngoài biển**: có cần đối chiếu với kg cân thực tế ở cảng (kg trên hóa đơn) để chốt sản lượng thật (kg thực = Σ hóa đơn)?
4. Cho **Quản lý vùng thấy "≈ lồng"** (hiện chỉ Owner vì lấy kg/lồng từ cài đặt Owner).
5. Trả hàng bán (CLAIM-03) chưa nối: có ưu tiên nối để Hao hụt/Còn lại đúng?

---

## 8. Truy xuất lô (Lot tracing, công bố, sửa dữ liệu truy xuất)

### 8.1 Mục đích
Từ **mã lô thu hoạch** (hoặc mã hóa đơn) lần **ngược** về bè, chu kỳ, từng làn, từng lần thả, lô giống, phiếu nhập, nhà cung cấp; lần **xuôi** tới hóa đơn và thương lái đã mua. Là nền cho trang nguồn gốc công khai (QR) và cho việc thu hồi khi có sự cố. Hệ thống **không bao giờ tự điền chỗ thiếu**, chỉ nêu rõ.

### 8.2 Ai dùng, quyền
Xem: Owner, quản lý vùng của vùng, **Kế toán chỉ xem** (`LOT_TRACING` View); **xuất file**: không Kế toán. Công bố, sửa dữ liệu truy xuất: `PROVENANCE` Publish/Edit (Owner, quản lý vùng); **thu hồi công bố: chỉ Owner**; công bố lại lô đã thu hồi: chỉ Owner. Thương lái và vai trò khác: 403.

### 8.3 Luồng từng bước
**Luồng 1 – Tìm và xem** (menu Nuôi trồng → **Truy xuất lô hàng** `/operations/lot-tracing`)
1. Bộ lọc "Tìm theo": **Mã lô thu hoạch** (ví dụ gợi ý trong ô: "B03-20261026") hoặc **Hóa đơn bán** (ví dụ "HD000123") → gõ mã (≤100 ký tự) → **Truy xuất** → `GET /api/harvest-lots/trace-search?lotCode=...|invoiceCode=...`.
2. Backend: mã lô **khớp phần đầu** (StartsWith; lô khớp đúng mã xếp đầu), mã hóa đơn **khớp đúng**; chỉ vùng được phép; tối đa **50 kết quả** (`LotTraceService.cs:26`); không nhập gì → 400 "Lot code is missing or invalid..."; không tìm thấy (kể cả lô vùng khác) → MSG-GEN-10 với danh sách rỗng ("Không tìm thấy lô nào khớp trong các vùng bạn được truy xuất.").
3. Bảng kết quả: Mã lô, Bè, Vùng, Ngày thu hoạch, Trạng thái lô, Nguồn gốc (Chưa công bố / Đã công bố / Đã thu hồi). Mở một dòng → `GET /api/harvest-lots/{id}/trace`.
4. **Đầu kết quả**: tên lô, "Trạng thái lô", "Công bố nguồn gốc", Thu hoạch (giờ), Số lồng, kg ước tính, kg trên hóa đơn, Công bố lúc / Thu hồi lúc; các nút theo quyền backend trả về (`canCorrect`, `canExport`, `canPublish`). Nếu lô chưa công bố nhưng đã có hóa đơn: nhắc "Khi công bố, trang nguồn gốc của mọi hóa đơn có mã QR bán lô này sẽ hiển thị thông tin nguồn gốc."
5. **Truy xuất ngược**: bảng Luống của lô | Ngày thả giống | Lô giống (tên · mã, số lượng của lần thả) | Phiếu nhập (mã, ngày nhận) | Nhà cung cấp | Ghi chú (nhãn đỏ "Phiếu nhập chưa hoàn thành"; dấu "Đã sửa ... bởi ...: lý do"). Làn không có lần thả: "Chưa có phiên thả giống trong chu kỳ này." Khung cảnh báo nêu mọi chỗ thiếu (MSG-TRACE-02): "Missing data in the trace of harvest lot X: ...".
6. **Truy xuất xuôi**: bảng Hóa đơn | Ngày | Thương lái (hoặc "Khách lẻ") + điện thoại | Sản phẩm | kg; dòng "Trả hàng" (kg âm) và tổng "kg của lô trên hóa đơn". Không tính hóa đơn hủy; hóa đơn sửa theo giá trị mới nhất. **Giá/thành tiền chỉ trả về khi người xem có quyền xem hóa đơn của vùng đó**; trang công khai không bao giờ hiện nhà cung cấp/thương lái/giá.
7. **Xuất file**: `GET .../trace/export` (cần `LOT_TRACING` Export).

**Luồng 2 – Công bố nguồn gốc** (nút "Công bố"/"Công bố lại" → xác nhận MSG-GEN-04 → `POST /api/harvest-lots/{id}/publish`)
- Điều kiện hiện nút (`LotPublishRules.cs`): có quyền Publish ở vùng; lô **Chưa công bố và đã nằm trên ít nhất một hóa đơn không hủy**; hoặc lô **Đã thu hồi** và người bấm là Owner. Lô đã công bố thì không công bố lại (409 "Harvest lot X is Published and cannot be used for this action.").
- Lô phải đủ thông tin nguồn gốc (BR-TRACE-01): **mọi làn của lô có ít nhất một lần thả mà lô giống thuộc phiếu nhập Completed (không hủy)**; thiếu → 409 MSG-TRACE-01 "Harvest lot X cannot be published yet: lane 2 has no seeding session; ..." và lô giữ nguyên Chưa công bố.
- Lô cũng được công bố tự động khi kết thúc một lần bán và hóa đơn có QR; một lô chỉ công bố **một lần**, mọi hóa đơn sau dùng chung (BR-TRACE-02 ✔, không có phiên bản công bố).
**Luồng 3 – Thu hồi** (Owner; `POST /api/harvest-lots/{id}/withdraw`; web có hộp thoại `withdraw-dialog.tsx` và danh sách thông báo đã gửi): bắt buộc lý do; trạng thái Đã thu hồi; mỗi thương lái có hóa đơn còn hiệu lực của lô nhận 1 thông báo (SMS + app nếu có tài khoản; không nêu lý do); số lỗi gửi được liệt kê để Owner gọi; số liệu bán/trả/sản lượng không đổi; lô vẫn chọn được trên hóa đơn mới (có cảnh báo).
**Luồng 4 – Sửa dữ liệu truy xuất** (nút "Sửa dữ liệu truy xuất của bè {mã}" → màn "Sửa dữ liệu truy xuất": "Sửa những bản ghi mà màn hình Nuôi trồng không còn cho sửa. Mỗi lần sửa cần có lý do...")
1. Chọn **chu kỳ** của bè (Open và Closed) → danh sách bản ghi cần sửa được: **lần thả** (chu kỳ Closed, hoặc có làn đã vào lô thu hoạch), **nhật ký** (chu kỳ Closed), **lô thu hoạch** (chu kỳ Closed) (`TraceCorrectionGuard.cs:38`).
2. Sửa cùng trường và **cùng luật** như màn gốc + **Lý do** bắt buộc; không bao giờ đổi ngày giờ thu hoạch/mã lô/kg/lồng đã sao chép; **không xóa** bản ghi. Với lô thu hoạch của chu kỳ đã đóng, trần theo mục tiêu (đang triển khai) **không áp** ("only fixes data").
3. Bước **xem trước** `POST .../trace-correction/preview`: trước/sau, trường đổi, các lô bị ảnh hưởng, lô đã công bố bị ảnh hưởng. Quản lý vùng phải xác nhận MSG-TRACE-04 "This correction changes the origin information of harvest lots X. Has the Cooperative Owner agreed in person that the data is wrong?" (gửi `ownerApproved=true`; thiếu → 409, chưa lưu); Owner chỉ xác nhận MSG-GEN-04.
4. Chặn nếu sau sửa có **làn của lô thu hoạch không còn lô giống nào**: 400 MSG-TRACE-03 "The correction is not saved: lane 2 of harvest lot X would have no seed lot. Please keep at least one seed lot for this lane." (Làn vốn đã thiếu từ trước không bị tính là do lần sửa này.)
5. Lưu `PUT .../trace-correction`: audit `SeedingRecord.TraceCorrected` / `CultivationLog.TraceCorrected` / `HarvestLot.TraceCorrected` kèm trước/sau, lý do, **danh sách lô đã công bố bị đổi** và việc Owner đã đồng ý; trang công khai tự hiện dữ liệu mới (không có phiên bản công bố; trạng thái công bố giữ nguyên) (BR-TRACE-05 ✔).

### 8.4 Bảng trường
Tìm kiếm: `lotCode` hoặc `invoiceCode` (≥1 trong 2; trim; ≤100 ký tự phía web), kết quả tối đa 50.
Kết quả truy xuất: xem luồng (hiển thị). Trạng thái công bố `originState`: NotPublished / Published / Withdrawn **tính từ thời điểm công bố và thu hồi** (Withdrawn khi thu hồi muộn hơn công bố).
Sửa dữ liệu: như màn gốc (lần thả: ngày, lô giống, làn, số lượng; nhật ký: ngày, ảnh, ghi chú; lô thu hoạch: làn, làn thu hết, số lồng, kg, ảnh) + `reason` (1–1000), `ownerApproved`, `rowVersion`.

### 8.5 Quy tắc
| # | Quy tắc | Cờ |
|---|---|---|
| T1 | Ngược: lô → các làn của lô → **mọi** lần thả của chu kỳ chứa làn đó (thả lại cũng hiện hết) → lô giống → phiếu nhập → NCC | ✔ BR-TRACE-03 |
| T2 | Đủ nguồn gốc khi mọi làn có lần thả với lô giống thuộc phiếu Completed; ở màn truy xuất, cả lô giống thuộc phiếu chưa hoàn thành cũng bị nêu (chặt hơn điều kiện công bố) | ✔ BR-TRACE-01/03 |
| T3 | Xuôi: mọi dòng hóa đơn của lô, thương lái | ✔ BR-TRACE-03 |
| T4 | **Trả hàng không hiện ở truy xuất xuôi** (luôn `[]`: "CLAIM-03 seam") | ⚠ BR-TRACE-03 yêu cầu hiển thị trả hàng |
| T5 | Công bố một lần; lô đã thu hồi chỉ Owner công bố lại; thu hồi chỉ Owner, chỉ lô Đã công bố, cần lý do | ✔ BR-TRACE-02/06 |
| T6 | Sửa truy xuất chỉ cho bản ghi màn Nuôi trồng đã khóa; không xóa; cần Owner đồng ý trực tiếp (Quản lý vùng xác nhận); không đổi ngày giờ thu hoạch | ✔ BR-TRACE-04 |
| T7 | Giữ ít nhất 1 lô giống cho mỗi làn của lô thu hoạch | ✔ BR-TRACE-01 |
| T8 | Truy xuất chỉ **hiển thị số lượng của lần thả (tổng cả lần)** ở từng làn, không chia | ✔ BR-FARM-03; ⚠ web ghi đơn vị cứng "dây" (`trace-backward-panel.tsx`) trong khi đơn vị là "con" |
| T9 | Giá/thành tiền chỉ hiện khi có quyền xem hóa đơn ở vùng của hóa đơn | ✔ BR-SALE-08 |

### 8.6 Liên kết
Thu hoạch (lô), Thả giống, Phiếu nhập, Nhà cung cấp, Hóa đơn bán (QR), Trang nguồn gốc công khai (Origin), Nhật ký chăm sóc (sửa). Khoảng trống: trả hàng chưa hiện; không có truy xuất theo lô giống (từ lô giống đi tìm các lô thu hoạch bị ảnh hưởng khi NCC giống có sự cố – "truy xuất xuôi từ lô giống"); chữ "Luống" (truy xuất) và "Làn" (nơi khác) lẫn lộn; ví dụ mã lô trong ô tìm kiếm không đúng định dạng thật (`DEMO-01-B1-01-20261111`).

### 8.7 Câu hỏi cho chủ
1. **Truy xuất từ lô giống đi tới các lô thu hoạch/hóa đơn** (khi NCC giống báo lỗi, cần biết bán cho ai): hiện chỉ đi từ lô thu hoạch ngược về. Có muốn thêm màn "Từ lô giống PN000001-1 → các bè → các lô thu hoạch → hóa đơn"?
2. **Lô bán bao lâu thì công bố?** Hiện chỉ công bố sau khi có hóa đơn; lô chưa bán không công bố được. Đúng ý chủ?
3. **Một lần thả 3 làn lưu "3000 con" cho cả 3 làn** → sai lệch khi đọc: nhân 3 sẽ ra 9000. Muốn ghi "cả lần thả (3 làn)"?
4. **Quản lý vùng tự xác nhận "Owner đã đồng ý"** khi sửa truy xuất: chấp nhận niềm tin hay bắt Owner tự duyệt trong hệ thống?
5. Chữ "Luống" → thống nhất "Làn".

---

## 9. Chuỗi dữ liệu từ đầu đến cuối – ví dụ thật từ máy demo (bè B1-01)

Lấy trực tiếp từ `127.0.0.1:8082` ngày 11/11/2026 (chỉ đọc, đăng nhập `owner`). Mã id viết tắt 8 ký tự đầu.

| # | Bước | Bản ghi | Số liệu từng màn hình hiển thị |
|---|---|---|---|
| 1 | Vùng | DEMO-01 "Vùng nuôi Ngọc Vừng" (`f1b6f468…`) | 8 bè đang sử dụng |
| 2 | Bè | B1-01 (`821c76a5…`), "10 m x 24 m", 3 làn đang dùng (làn 4 đã gỡ) | Chi phí vật tư bè **3.255.000 đ** |
| 3 | Phiếu nhập | **PN000001** (`5c2e34ee…`), 18/08/2026, NCC "Trại giống hàu Cái Rồng", Completed, tổng 25.500.000 đ, đã trả 25.500.000 đ | Dòng 1: VT001 Hàu giống Thái Bình Dương 3 cm, **20.000 con** x 900 = 18.000.000, mã lô NCC `LOT-HG-0801`, ghi cho bè B1-01. Dòng 2: VT002 5 cm, 5.000 con x 1.500 = 7.500.000 |
| 4 | Lô giống | **PN000001-1** (`8bb9b7d9…`) | Thả giống: nhận 20.000, **đã thả 5.000**. Phiếu nhập: còn trả được 15.000 |
| 5 | Chu kỳ | `d8e9c2e0…` bắt đầu 02/10/2026, Open | Kế hoạch: giống dự kiến **250**, thu dự kiến **02/08/2027**, mục tiêu **8.500 kg**; "Thả giống hoàn tất 11/11/2026"; số ngày nuôi **41** |
| 6 | Thả giống | `a11f1a21…` 04/10/2026, **2.000 con**, làn 1; `361b55cc…` 07/10/2026, **3.000 con**, làn 1-2-3 | Tổng giống đã thả **5.000 con**; làn 1 thả 2 lần; "Số lượng thuộc cả lần thả, không chia đều" |
| 7 | Nhật ký | `227135fd…` 01/11/2026 "Hàu bám tốt, dây treo chắc, không có hàu chết." + 1 ảnh | – |
| 8 | Sử dụng vật tư | 12/10: Phao HDPE 200 lít **4 cái** + Dây thừng 14 mm **1,5 cuộn** ("Phao bị vỡ do sóng lớn"); 22/10: phao **2 cái** ("Dây neo bị đứt") | Chi phí: 4 x 380.000 + 1,5 x 650.000 + 2 x 380.000 = 1.520.000 + 975.000 + 760.000 = **3.255.000 đ** |
| 9 | Thu hoạch (11/11/2026) | Lô **DEMO-01-B1-01-20261111** (`1c82d12b…`): làn 1, 2, chưa thu hết; **8 lồng**, 50 kg/lồng, **400 kg**; ảnh 1; đã **công bố** nguồn gốc. Lô **…-20261111-2** (`f53215d7…`): làn 2 **thu hết**; **4 lồng**, ước tính **180 kg** | Trạng thái làn: 1 = Đang thu hoạch, 2 = Đã thu hoạch, 3 = Đang nuôi. Lô 1: đã lập hóa đơn 120, còn lại **280**; lô 2: còn lại **180** |
| 10 | Tóm tắt chu kỳ (API) | – | Giống đã thả **5.000 con**; kg thu **580**; ngày thu cuối 11/11/2026; **đóng sớm** (lý do "làn chưa thu hoạch": 1 và 3); so kế hoạch: 250 / 02/08/2027 / 8.500 kg |
| 11 | Sản lượng nuôi (nhóm theo chu kỳ) | – | 2 lô; Ước tính **580**; Đã bán **120**; Hao hụt **0**; Chênh lệch **460** (= 280 + 180); chưa chốt |
| 12 | Hóa đơn bán | **HD000001** (`d3b173c2…`) 11/11/2026, khách "Vựa hải sản Bà Lan" | Hàu sữa **120 kg x 60.000 = 7.200.000 đ**, trả ngay (PT000001 tiền mặt, chờ xác nhận), đã gửi mã QR |
| 13 | Truy xuất lô `1c82d12b…` | – | Ngược: làn 1: 04/10 2.000 con + 07/10 3.000 con (PN000001-1); làn 2: 07/10 3.000 con. Xuôi: HD000001, 120 kg, 7.200.000 đ |

### Các điểm không nhất quán hoặc dễ gây hiểu nhầm lộ ra từ ví dụ

1. **Kế hoạch lệch xa thực tế mà hệ thống im lặng**: dự kiến 250 con, thả 5.000 (gấp 20 lần); mục tiêu 8.500 kg cho 5.000 con là 1,7 kg/con (hàu thương phẩm vài chục gam); đã thu 580 kg (6,8% mục tiêu) sau 41 ngày trong khi dự kiến thu tháng 8/2027.
2. **Làn 2 nằm trong hai lô** (lô 1 chưa thu hết, lô 2 thu hết): lô 1 ghi 8 lồng cho "làn 1, 2" nhưng không biết mỗi làn bao nhiêu; năng suất từng làn không tính được.
3. **Lô 2: 4 lồng nhưng 180 kg** (4 x 50 = 200): kg nhập tay thấp hơn 10% mà không lý do; **Chênh lệch** phản ánh luôn phần này.
4. **Hai sổ cho một lô giống**: Thả giống nói "đã thả 5.000/20.000", sổ kho Vật tư & Giống (theo mã nguồn) vẫn coi cả 20.000 là "còn lại" vì thả giống không ghi sổ. **Chi phí giống đã thả** (5.000 x 900 = 4.500.000 đ) không hiện ở đâu; chi phí vật tư bè chỉ tính vật tư sửa chữa.
5. **Truy xuất ngược cộng sai khi đọc nhanh**: lô này có làn 1 (hiện 2.000 và 3.000) và làn 2 (hiện 3.000) ⇒ cộng các dòng ra 8.000 trong khi thực thả 5.000 (số 3.000 của lần 07/10 lặp lại ở từng làn của lần đó); đơn vị ghi "dây" trong khi đơn vị là "con".
6. **Thu hoạch sau khi hoàn tất thả giống 0 ngày** (cả hai cùng 11/11/2026): hệ thống không đòi thời gian nuôi tối thiểu (ngày thả 04/10 → thu 11/11, 38 ngày).
7. **Chu kỳ đang "đóng sớm" nếu đóng hôm nay** nhưng người dùng web không có nút đóng chu kỳ; muốn đóng phải gọi API.
8. **"≈ lồng" khác nhau theo màn**: lô tính theo kg/lồng riêng của lô, màn Sản lượng (Owner) tính theo kg/lồng hiện hành; hóa đơn 120 kg ≈ 2,4 lồng, nhưng lồng chỉ là đơn vị đếm ngoài biển.
9. **Doanh thu không nối về chu kỳ**: 7,2 triệu từ lô này không hiện ở bất kỳ màn Nuôi trồng nào; không có "lãi/lỗ chu kỳ" (giống 4,5 triệu + vật tư 3,255 triệu so với doanh thu).

---

## 10. Tổng hợp câu hỏi cho chủ – theo mức ưu tiên

**Nhóm A – Cần chủ quyết (ảnh hưởng quy tắc nghiệp vụ lớn)**
1. **Thu hoạch có bị giới hạn không?** Hiện không giới hạn nào (số lồng, kg, so với mục tiêu, so với giống đã thả). Đã duyệt D1: cảnh báo >110% mục tiêu (cần lý do), chặn >150%. Còn câu hỏi: chu kỳ **không có mục tiêu** thì xử lý sao (bắt buộc nhập mục tiêu khi bắt đầu?); có thêm trần theo giống đã thả không?
2. **Thả giống vượt lô / kho** (GBR-04 cố ý không kiểm): có muốn kiểm tồn lô khi thả (D6) và chặn hay chỉ cảnh báo? Đồng nghĩa phải để thả giống **tự trừ kho** (hiện hai sổ tách rời).
3. **Sử dụng vật tư vs Xuất dùng "Sửa chữa bè"**: một nguồn sự thật hay hai? Có kiểm tồn khi dùng vật tư?
4. **Kế hoạch chu kỳ không bắt buộc, không có đơn vị, không kiểm hợp lý** (250 con vs 5.000; 1,7 kg/con). Muốn: đơn vị rõ + cảnh báo mềm; hay bỏ qua?
5. **Cách tính chi phí vật tư bè** (giá mua mới nhất tại ngày dùng) khác SRS (theo phiếu ghi tên bè): chọn cách nào? Có thêm "chi phí giống đã thả" và "lãi/lỗ chu kỳ" không?
6. **"Thu xong làn"**: đã duyệt hành động riêng (D7). Có cần nhắc/thông báo khi bấm không?

**Nhóm B – Khoảng trống chức năng (web chưa có dù backend có)**
7. Đóng chu kỳ (preview, đóng sớm, đánh giá, thông báo) – không có màn hình web.
8. Đóng lô tay (HARVEST-02) – không có nút web.
9. Chuyển bản ghi sử dụng vật tư sang bè khác; xóa bản ghi sử dụng vật tư nhập nhầm.
10. Truy xuất từ lô giống đi xuôi tới lô thu hoạch/hóa đơn.
11. Trả hàng bán (CLAIM-03) chưa nối vào số liệu lô, sản lượng và truy xuất.

**Nhóm C – Chi tiết dữ liệu**
12. Số lồng nguyên (đang chuyển thập phân); kg nhập tay tự do (đang chuyển 0,2–2 lần).
13. Ngày thu hoạch do hệ thống ghi (không bù được); ngày thả giống lùi không giới hạn.
14. Số lượng giống: web cho 3 chữ số, backend chỉ 2; đơn vị giống chưa ép thống nhất; chữ "dây"/"Luống" trong Truy xuất.
15. Hoàn tất thả giống khi 0 làn có giống (đang chuyển thành phải xác nhận).
16. "Hao hụt" trong Sản lượng nuôi thực chất là "kg không bán được lúc đóng lô", chưa phải hao hụt nuôi.
17. Đóng sớm và sửa truy xuất dựa trên xác nhận miệng "Owner đã đồng ý"; nhật ký không có phiên bản (ghi đè khi sửa đồng thời).

### Top quy tắc đáng ngờ nhất (để chủ ưu tiên xem)
1. Thu hoạch không bị chặn gì (có thể thu nhiều hơn mục tiêu/giống đã thả; số lồng và kg tự do).
2. Thả giống và Sử dụng vật tư không nối với kho (hai sổ, có thể ghi đôi hoặc thả quá tồn).
3. Kế hoạch chu kỳ không đơn vị/không kiểm hợp lý nên mất tác dụng cảnh báo.
4. Web thiếu Đóng chu kỳ và Đóng lô.
5. Trả hàng bán chưa nối: "Hao hụt", "Còn lại", Truy xuất xuôi thiếu dữ liệu.

---

## 11. Phụ lục – Endpoint theo module (backend, hành vi hiện tại)

| Module | Endpoint |
|---|---|
| Chu kỳ | `GET /api/zones/{z}/cultivation-cycles`; `POST /api/rafts/{r}/cultivation-cycles`; `GET /api/rafts/{r}/cultivation-cycles`; `GET /api/rafts/{r}/progress`; `GET/PUT /api/cultivation-cycles/{c}`; `POST .../cancel`; `GET .../summary`; `GET .../close/preview`; `POST .../close` |
| Thả giống | `GET /api/rafts/{r}/seed-lots`; `GET /api/rafts/{r}/lanes/{n}/progress`; `GET/POST /api/cultivation-cycles/{c}/seeding-records`; `GET .../seeding-complete/preview`; `POST .../seeding-complete`; `GET/PUT /api/seeding-records/{id}`; `POST .../remove` |
| Nhật ký | `GET/POST /api/cultivation-cycles/{c}/cultivation-logs`; `GET/PUT /api/cultivation-logs/{id}`; `POST .../remove` |
| Sử dụng vật tư | `GET/POST /api/rafts/{r}/material-usages`; `GET/PUT /api/material-usages/{id}` |
| Thu hoạch | `GET/POST /api/rafts/{r}/harvest-lots`; `GET/PUT /api/harvest-lots/{id}`; `POST .../remove`; `POST .../close`; `GET /api/harvest-lots/for-sale`(+`/count`); `GET/PUT /api/harvest-settings`; `GET /api/harvest-settings/auto-close-preview`; (đang triển khai) `POST /api/rafts/{r}/lanes/{n}/finish-harvest` |
| Sản lượng | `GET /api/harvest-yield`; `GET /api/harvest-yield/export` |
| Truy xuất | `GET /api/harvest-lots/trace-search`; `GET /api/harvest-lots/{id}/trace`(+`/export`); `POST /api/harvest-lots/{id}/publish`, `/withdraw`; sửa: `GET /api/rafts/{r}/trace-corrections`, `GET /api/cultivation-cycles/{c}/trace-corrections`, `POST/PUT /api/seeding-records/{id}/trace-correction(/preview)`, `.../cultivation-logs/{id}/...`, `.../harvest-lots/{id}/...` |
| Vật tư & Giống | `/api/farming-input-items`; `/api/purchase-receipts` (+returns); `/api/input-issues`; `/api/input-inventory-settings` |

Câu hỏi chưa giải quyết (cho đội kỹ thuật): (1) máy demo cần cập nhật bản backend mới để kiểm sổ kho trực tiếp; (2) ràng buộc "mọi vật tư giống dùng một đơn vị" chưa tìm thấy trong mã; (3) kiểm tra lại sau khi các thay đổi D1..D10 phát hành để cập nhật các mục "(đang triển khai)" thành hiện tại.
