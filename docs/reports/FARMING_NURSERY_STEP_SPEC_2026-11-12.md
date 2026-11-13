# Đặc tả bước ươm giống (Nursery) và thay đổi SRS, API backend

Ngày: 12/11/2026. Người quyết: chủ dự án (đã trao đổi trực tiếp). Trạng thái: **đã chốt luồng, chờ PM xác nhận phần SRS**, chưa có mã.
File này để đồng đội đọc, góp ý và sửa trước khi làm. Phần bán hàng và đơn khách hàng (OMTS-223) **không bị chạm tới**.

## 1. Vì sao cần bước ươm

Thực tế hợp tác xã: mua mảnh hàu về, **ươm cho quen nước** rồi mới thả lên làn để nuôi. SRS v8 (dòng 446) ghi bước này "không được ghi nhận trong OMTS", nên hiện hệ thống nhảy thẳng từ kho sang thả giống. Hệ quả: không biết ươm hao hụt bao nhiêu, thả giống lấy thẳng từ kho nên số mảnh có thể lệch với thực tế.

## 2. Quyết định đã chốt (chủ dự án, 12/11)

| # | Quyết định |
|---|---|
| 1 | **Ươm là bước bắt buộc** trước thả giống, áp dụng cho các lần thả **mới**. Dữ liệu thả giống cũ giữ nguyên hợp lệ. |
| 2 | Giống ươm **lấy từ kho** (Vật tư & Giống), đơn vị **mảnh**. Kho **trừ khi bắt đầu ươm**. |
| 3 | **Nơi ươm chỉ cần xác định vùng**, không cần chọn bè. Trạng thái đợt ươm: **Đang ươm / Đã hoàn tất**. |
| 4 | **Không có "tỉ lệ sống dự kiến"** và không theo dõi cân nặng dự kiến. Khi **hoàn tất ươm** chủ nhập **số mảnh sống sót** (ước tính bằng mắt, không có cách đo). Hệ thống chỉ tính "hao hụt ươm = vào − sống sót" và ghi nhãn **ước tính**. |
| 5 | **Hoàn tất ươm phải chọn luôn bè nuôi** (cùng vùng) để bắt đầu chu kỳ nuôi. Không có "dư": **ươm bao nhiêu sống thì thả nuôi hết bấy nhiêu**. Có thể chia cho nhiều bè, tổng phân bổ **bằng đúng** số sống sót. |
| 6 | **Sản lượng dự kiến nhập ở bước kế hoạch nuôi** (lúc chọn bè nuôi khi hoàn tất ươm), không nhập ở ươm. |
| 7 | **Tổng kết chu kỳ có thêm phần ươm:** mảnh vào ươm, sống sót (ước tính), hao hụt ươm (ước tính). Tổng kết vẫn chủ yếu là phần nuôi. |
| 8 | **Chủ HTX và Quản lý vùng** đều ghi nhận được. Quản lý vùng ghi thì **thông báo cho chủ**. |
| 9 | Sửa số sống sót sau khi hoàn tất **được phép**, ghi rõ **số cũ → số mới**, người sửa, thời điểm, lý do. |
| 10 | **Không thêm ươm vào truy xuất công khai (QR).** |
| 11 | Nhập liệu **gọn**: nhập các trường tối thiểu rồi hiện **bảng xem lại cuối**, không cần form thiết lập đầy đủ. |
| 12 | Thả giống từ đợt ươm: **chặn cứng** nếu vượt số mảnh đã phân bổ cho chu kỳ đó. Không còn mức 110% và 150% so với kế hoạch cho thả giống thuộc đợt ươm. Cảnh báo mềm chủ yếu ở khâu **thu hoạch**. |
| 13 | Thu hoạch **không bị chặn** theo sản lượng dự kiến (đã làm). Có thể thêm cảnh báo mềm không chặn khi lệch nhiều. |

## 3. Luồng người dùng

### 3.1 Bắt đầu ươm (Chủ HTX, Quản lý vùng)
Màn **Ươm giống** (mục mới trong menu Nuôi trồng, đặt **trước** Chu kỳ nuôi). Nút "Bắt đầu ươm" mở form gọn:
1. Vùng ươm.
2. Lô giống (từ kho, hiện **tồn kho** và đơn vị mảnh).
3. Số mảnh đưa vào ươm (không vượt tồn kho).
4. Ngày bắt đầu ươm (mặc định hôm nay), ghi chú tùy chọn.

Bảng xem lại cuối (vùng, lô giống, nhà cung cấp, số mảnh, tồn kho trước và sau) rồi **Xác nhận**. Hệ thống tạo đợt ươm **Đang ươm**, trừ kho bằng một phiếu Xuất dùng liên kết, ghi nhật ký. Quản lý vùng ghi thì **thông báo cho chủ**.

### 3.2 Theo dõi ươm
Danh sách đợt ươm (mã, vùng, lô giống, số mảnh vào, ngày bắt đầu, số ngày ươm, trạng thái), lọc theo vùng, trạng thái, thời gian. Chi tiết mở tại chỗ: thông tin, lịch sử, ghi chú. Sửa, hủy khi còn **Đang ươm** (hủy hoàn lại kho, có lý do).

### 3.3 Hoàn tất ươm và bắt đầu chu kỳ nuôi
Nút "Hoàn tất ươm":
1. Nhập **số mảnh sống sót** (ước tính bằng mắt, không lớn hơn số vào).
2. Chọn **bè nuôi cùng vùng** (một hoặc nhiều bè không có chu kỳ đang mở) và **số mảnh cho từng bè**. Tổng phải **bằng đúng** số sống sót. Nút "Chia đều theo số làn" hỗ trợ nhập nhanh.
3. Với mỗi bè nhập **sản lượng dự kiến (kg)** (tùy chọn) và ngày thu dự kiến (tùy chọn, như hiện nay).
4. **Bảng xem lại cuối:** mảnh vào, sống sót (ước tính), hao hụt ươm và phần trăm (ước tính), phân bổ từng bè, sản lượng dự kiến từng bè. **Xác nhận.**

Hệ thống đóng đợt ươm (**Đã hoàn tất**), **tạo chu kỳ nuôi cho từng bè** với số mảnh thả dự kiến bằng phần phân bổ, rồi người dùng vào **Thả giống** để chọn làn (không cần chọn lô giống nữa vì nguồn là đợt ươm).

### 3.4 Thả giống (sau ươm)
Form thả giống cho chu kỳ từ ươm: chọn làn (lưới gọn, chọn nhanh), nhập số mảnh. Hiện "Còn X trên Y mảnh đã phân bổ". **Chặn cứng** khi vượt. Không trừ kho nữa (đã trừ lúc bắt đầu ươm).

### 3.5 Sửa số sống sót
Trong chi tiết đợt ươm đã hoàn tất: "Sửa số sống sót" với lý do. Hiện "9.500 → 9.200". Không được nhỏ hơn số đã thả. Nếu đã phân bổ cho bè thì việc giảm phải khớp lại phân bổ (xem mục 6, ngoại lệ).

### 3.6 Tổng kết chu kỳ
Thêm khối "Ươm": mã đợt ươm, mảnh vào, sống sót (ước tính), hao hụt (ước tính, phần trăm). Màn Sản lượng nuôi cũng hiện cột "mảnh vào ươm" và "hao hụt ươm" theo chu kỳ.

## 4. Thay đổi SRS cần cập nhật (cho PM)

| Chương | Thay đổi |
|---|---|
| Dòng 446 (mô tả quy trình) | Bỏ câu "this step is not recorded in OMTS"; thêm bước ươm bắt buộc. |
| Use case mới | **NURSERY-01** Bắt đầu ươm; **NURSERY-02** Theo dõi, sửa, hủy đợt ươm; **NURSERY-03** Hoàn tất ươm và bắt đầu chu kỳ nuôi; **NURSERY-04** Sửa số sống sót. |
| CYCLE-01 Start cultivation cycle | Chu kỳ mới bắt đầu từ NURSERY-03 (mang theo số mảnh phân bổ và sản lượng dự kiến). Chu kỳ cũ giữ nguyên. |
| CYCLE-02 Record seeding | Với chu kỳ từ ươm: nguồn là phân bổ của đợt ươm, bỏ chọn lô giống, bỏ so sánh 110/150% kế hoạch, giới hạn cứng theo phần còn lại. |
| CYCLE (tổng kết, close preview, summary) | Thêm khối ươm (vào, sống sót ước tính, hao hụt). |
| BR-CYCLE-07 ("no loss record") | Sửa: ghi số sống sót khi hoàn tất ươm (ước tính bằng mắt); hao hụt trong nuôi vẫn không ghi. |
| GBR-04 (thả giống không so lô giống còn lại) | Thay: thả giống thuộc đợt ươm bị giới hạn theo số mảnh phân bổ. |
| BR-PURCHASE-07 (không giữ tồn kho) | Đã thay trước đó bởi quyết định sổ kho; ghi thêm: kho trừ lúc bắt đầu ươm. |
| Business rule mới | **BR-NURSERY-01** nơi ươm chỉ là vùng; **BR-NURSERY-02** số mảnh vào không vượt tồn kho; **BR-NURSERY-03** một đợt ươm dùng một lô giống (xem câu hỏi mở); **BR-NURSERY-04** hoàn tất yêu cầu số sống sót ≤ số vào và tổng phân bổ **bằng** số sống sót, mọi bè cùng vùng và không có chu kỳ mở; **BR-NURSERY-05** sửa số sống sót ghi cũ → mới; **BR-NURSERY-06** Quản lý vùng ghi thì thông báo Chủ HTX; **BR-NURSERY-07** ươm bắt buộc cho thả giống mới. |
| Message | **MSG-NURSERY-01..** (mã chung tạm thời trong code, chờ đặt mã SRS): không đủ tồn kho, số sống sót vượt số vào, tổng phân bổ khác số sống sót, bè đang có chu kỳ mở, vượt phần còn lại khi thả giống, đợt ươm đã hoàn tất, đã thả không sửa nhỏ hơn. |
| Thực thể | **NurseryBatch** (mới); liên kết **SeedingRecord**, **CultivationCycle** với đợt ươm; **NurseryBatchRaftAllocation**; danh mục trạng thái đợt ươm (Đang ươm, Đã hoàn tất, Đã hủy). |
| Màn hình | **SCR-NURSERY-01** danh sách và chi tiết; **SCR-NURSERY-02** bắt đầu ươm (có bảng xem lại); **SCR-NURSERY-03** hoàn tất ươm (nhập sống sót, chọn bè, bảng xem lại). |
| Từ điển | Ươm (Nursery), Sống sót (Survivors, ước tính bằng mắt), Hao hụt ươm. |
| Truy xuất công khai | **Không đổi** (không thêm ươm vào QR). |

## 5. Thay đổi backend API (cho đồng đội đọc và sửa)

### 5.1 Dữ liệu (migration mới, không sửa migration đã áp dụng)

**NurseryBatches**
- `Id`, `CooperativeId`, `Code` (NU000001, theo dãy mã hiện có), `ZoneId`, `SeedLotId` (dòng phiếu nhập hạt giống) hoặc `InputItemId` + `PurchaseReceiptLineId`, `QuantityIn` (decimal 18,3, đơn vị mảnh), `StartDate`, `Note`
- `StatusId` (Đang ươm, Đã hoàn tất, Đã hủy), `CompletedOn`, `Survivors` (decimal, null khi chưa hoàn tất), `IssueId` (phiếu Xuất dùng liên kết), `CreatedBy`, `CompletedBy`, `RowVersion`, dấu thời gian.
- Ràng buộc: `QuantityIn` > 0; `Survivors` ≥ 0 và ≤ `QuantityIn`.

**NurseryBatchAllocations**: `NurseryBatchId`, `RaftId`, `CycleId`, `Quantity` (mảnh). Tổng theo đợt = `Survivors` khi hoàn tất.

**CultivationCycles**: thêm `NurseryBatchId` (null với chu kỳ cũ), `NurseryAllocatedQuantity`.

**SeedingRecords**: thêm `NurseryBatchId` (null với bản ghi cũ). Với chu kỳ từ ươm thì `SeedLotId` có thể null.

**InputIssues**: mục đích mới `Nursery` (giống như SourceKind hiện có cho thả giống và vật tư), `SourceRecordId` = đợt ươm.

### 5.2 Endpoint (Chủ HTX, Quản lý vùng trong vùng)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/nursery-batches?zoneId&status&from&to&search&page&pageSize&sortBy&sortDir` | Danh sách, tổng số mảnh vào, đang ươm, đã hoàn tất |
| GET | `/api/nursery-batches/{id}` | Chi tiết: vùng, lô giống, nhà cung cấp, số vào, tồn kho hiện tại của lô, sống sót, hao hụt, phân bổ, chu kỳ đã tạo, phiếu xuất liên kết |
| POST | `/api/zones/{zoneId}/nursery-batches` `{seedLotId, quantity, startDate, note?}` | Bắt đầu ươm; trừ kho bằng phiếu Xuất dùng liên kết; 409 `MSG-INPUT-01` kèm `onHand`, `balanceAfter` khi thiếu tồn |
| PUT | `/api/nursery-batches/{id}` `{quantity?, startDate?, note?, rowVersion}` | Sửa khi còn Đang ươm; số mảnh đổi thì phiếu xuất điều chỉnh |
| POST | `/api/nursery-batches/{id}/cancel` `{reason}` | Hủy khi còn Đang ươm; hoàn kho |
| POST | `/api/nursery-batches/{id}/complete` `{survivors, completedOn?, allocations:[{raftId, quantity, targetYieldKg?, expectedHarvestDate?}], rowVersion}` | Hoàn tất: một giao dịch đóng đợt, tạo chu kỳ cho mỗi bè, ghi phân bổ. 400 nếu tổng phân bổ khác `survivors`; 409 nếu bè có chu kỳ mở hoặc khác vùng; thông báo cho chủ nếu người gọi là Quản lý vùng |
| POST | `/api/nursery-batches/{id}/survivors` `{survivors, reason, rowVersion}` | Sửa số sống sót sau hoàn tất; ghi cũ → mới; không nhỏ hơn đã thả |
| GET | `/api/nursery-batches/{id}/history` | Lịch sử cùng khuôn với các điểm đọc lịch sử hiện có (`at`, `byName`, `byRole`, `action`, `reason`, `changes[{field,label,from,to}]`) |
| GET | `/api/nursery-batches/available?zoneId` | Đợt ươm đã hoàn tất còn phân bổ chưa thả, để màn thả giống dùng |

**Mở rộng endpoint hiện có (thêm trường, không phá tương thích):**
- Đọc chu kỳ, tiến độ làn, kế hoạch: `nurseryBatchId`, `nurseryCode`, `nurseryAllocated`, `nurserySeeded`, `nurseryRemaining`.
- `POST /api/cultivation-cycles/{id}/seeding-records`: với chu kỳ từ ươm không cần `seedLotId`; chặn 409 khi vượt phần còn lại (`MSG-NURSERY-xx`, `remaining`).
- Tóm tắt, xem trước đóng, đóng chu kỳ: khối `nursery { batchCode, quantityIn, survivors, lossPieces, lossPercent }` (ghi `estimated: true`).
- `GET /api/harvest-yield`: thêm `nurseryQuantityIn`, `nurserySurvivors`, `nurseryLossPercent` theo chu kỳ.
- Thả giống thuộc chu kỳ từ ươm **không tạo phiếu Xuất dùng** (đã trừ lúc ươm); chu kỳ cũ giữ hành vi hiện tại.
- Lịch sử, nhật ký kiểm toán: thêm `NurseryBatch.Created/Edited/Cancelled/Completed/SurvivorsCorrected`.

### 5.3 Quy tắc chi tiết
1. Một đợt ươm dùng **một lô giống** (câu hỏi mở số 1).
2. Số mảnh vào không vượt tồn kho của lô (nếu hợp tác xã không cho tồn âm; nếu cho thì chỉ cảnh báo).
3. Hoàn tất: `survivors` ≤ `QuantityIn`; mọi bè cùng `ZoneId` với đợt ươm; bè không có chu kỳ mở; mỗi bè không trùng; tổng phân bổ **bằng** `survivors`; mỗi phân bổ > 0.
4. Tạo chu kỳ trong cùng giao dịch hoàn tất; ngày bắt đầu chu kỳ = ngày hoàn tất ươm; `ExpectedSeedQuantity` = phân bổ; `TargetYieldKg` nhập tùy chọn.
5. Thả giống: tổng số mảnh đã thả của chu kỳ ≤ phân bổ; không so 110% và 150% kế hoạch.
6. Sửa số sống sót: không nhỏ hơn tổng đã thả; nếu đã tạo chu kỳ thì số phân bổ phải còn hợp lệ (nếu giảm sống sót thì yêu cầu chọn bè giảm phân bổ trong cùng yêu cầu: tham số `allocations` kèm theo).
7. Thông báo: ghi nhận bởi Quản lý vùng (bắt đầu, hoàn tất, sửa số sống sót) gửi cho chủ; mã thông báo tạm dùng mã chung (như thông báo làn hỏng) chờ mã SRS.
8. Quyền: Chủ HTX, Quản lý vùng trong vùng (xem, tạo, sửa); Kế toán, nhân viên không.
9. Dữ liệu cũ: chu kỳ và bản ghi thả giống cũ không có đợt ươm, giữ nguyên, **không** backfill.

### 5.4 Tác động tới phần đã có

| Phần | Tác động |
|---|---|
| Sổ kho (Xuất dùng) | Thêm mục đích `Nursery`; thả giống từ chu kỳ ươm không trừ kho nữa |
| Thả giống, chu kỳ | Mở rộng như mục 5.2; giữ nhánh cũ cho dữ liệu cũ |
| Trần thả giống theo kế hoạch (110% và 150%) | Giữ cho chu kỳ **cũ**; chu kỳ từ ươm dùng giới hạn cứng theo phân bổ |
| Thu hoạch | Không đổi (không chặn theo sản lượng dự kiến); tùy chọn thêm `warnings[]` không chặn khi lệch nhiều |
| Truy xuất công khai | Không đổi |
| Đơn khách, bán hàng, kế hoạch làm việc (OMTS-223) | Không đổi |

## 6. Ngoại lệ và rủi ro

| Tình huống | Xử lý đề xuất |
|---|---|
| Hoàn tất ươm nhưng bè được chọn vừa có chu kỳ mở | 409, chọn bè khác |
| Muốn bỏ đợt ươm giữa chừng | Hủy khi còn Đang ươm, hoàn kho; sau hoàn tất không hủy |
| Sống sót nhập nhầm | Sửa số sống sót (cũ → mới), nếu giảm dưới số đã thả thì chặn |
| Phân bổ cho nhiều bè rồi một bè không thả đủ | Chu kỳ đó phải hoàn tất thả giống thiếu (cho xác nhận như hiện nay) hoặc chủ chuyển phần còn lại bằng sửa phân bổ **trước khi thả** |
| Vùng chưa có bè | Không hoàn tất được; màn hiện nút "Tạo bè nuôi cho vùng này" |
| Thay đổi đợt ươm làm lệch sổ kho | Mọi thay đổi số mảnh đi qua phiếu xuất liên kết, có nhật ký |
| Bản ghi cũ trộn với mới | Tách rõ bằng `nurseryBatchId` null ở dữ liệu cũ; báo cáo ghi "không có ươm" |

## 7. Giao diện (Web)

- Menu Nuôi trồng, thứ tự: Vùng nuôi, Bè nuôi, **Ươm giống**, Chu kỳ nuôi, Thả giống, Thu hoạch, Sử dụng vật tư (tùy chọn), Sản lượng nuôi, Truy xuất lô, Theo dõi chất lượng nước.
- Hành trình chu kỳ: **Ươm → Kế hoạch → Thả giống → Thu hoạch → Tổng kết**, Chăm sóc và Vật tư là bước phụ.
- Màn Ươm giống theo khung quản lý chung (danh sách, bộ lọc, chi tiết mở tại chỗ). Tạo và hoàn tất là pop-up hai bước (nhập gọn, bảng xem lại).
- Mọi số mảnh ghi đơn vị **mảnh**; mọi số sống sót, hao hụt ghi nhãn **ước tính**.
- Thành phần dùng lại: ô nhập đơn vị, bộ chọn ngày thống nhất, sơ đồ làn, lịch sử, liên kết thực thể.

## 8. Câu hỏi mở

1. **Một đợt ươm có trộn nhiều lô giống không?** Khuyến nghị **một lô** để truy xuất nguồn từ phiếu nhập và nhà cung cấp không lẫn. Chủ dự án chưa trả lời mục này.
2. **Ngày thu dự kiến:** giữ trường tùy chọn như hiện nay trong kế hoạch từ ươm hay bỏ (chủ đã bỏ ước lượng ngày thu cho thu hoạch)?
3. **Số sống sót nhập một lần lúc hoàn tất**, không ghi hao hụt dần trong lúc ươm. Xác nhận.
4. **Cảnh báo khi hao hụt ươm cao:** hiện **không** cảnh báo (chủ bỏ tỉ lệ dự kiến). Xác nhận.
5. **Mã thông báo SRS** cho: bắt đầu ươm, hoàn tất ươm, sửa số sống sót.
6. **Quyền:** có cần mã chức năng riêng (NURSERY) hay dùng chung quyền thả giống?
7. **Chuyển phân bổ giữa các bè** sau hoàn tất nhưng trước khi thả giống: có cho không?

## 9. Gợi ý chia việc

1. **Backend (một đợt):** thực thể, migration, endpoint ươm, hoàn tất tạo chu kỳ, thả giống từ phân bổ, kho Xuất dùng mục đích Nursery, lịch sử, thông báo, đọc mở rộng chu kỳ, tóm tắt, sản lượng; cập nhật hợp đồng API.
2. **Web (hai đợt nhỏ):** (a) màn Ươm giống, bắt đầu ươm, hoàn tất ươm (nhập, bảng xem lại); (b) hành trình, thả giống từ phân bổ, tổng kết, sản lượng.
3. **Tài liệu:** cập nhật `docs/SRS_DEVIATIONS.md`, nhật ký chung (mục G), hợp đồng API.

Không chạm tới đơn khách, bán hàng, kế hoạch làm việc của đồng đội. Thu hoạch đã gắn yêu cầu mua theo `develop` giữ nguyên.

## 10. Bổ sung của chủ dự án (12/11, đợt 2): GHI ĐÈ các mục trước nếu mâu thuẫn

### 10.1 Câu hỏi mở đã được trả lời
| Câu hỏi (mục 8) | Trả lời |
|---|---|
| 1. Một đợt ươm trộn nhiều lô giống? | **Không.** Một đợt ươm chỉ một lô giống. |
| 2. Ngày thu dự kiến trong kế hoạch | **Bỏ ngày thu dự kiến** khỏi kế hoạch nuôi (chu kỳ): bỏ khỏi form, đọc và tổng kết (giữ cột cũ trong CSDL, không hiển thị). |
| 7. Chuyển phân bổ giữa các bè sau hoàn tất, trước thả giống | **Có.** Có thể dồn **hết vào một bè** hoặc **chia nhiều bè**; tổng vẫn bằng số sống sót. |

### 10.2 Ảnh kèm theo mỗi bước (mới)
- Mỗi bước thực hiện phải có **ít nhất 1 ảnh, tối đa 3 ảnh**: bắt đầu ươm, hoàn tất ươm, thả giống, thu hoạch. Với thả giống và thu hoạch, ảnh gắn với **kế hoạch nuôi** hoặc **kế hoạch thu hoạch** liên quan (xem câu hỏi 1 mục 10.5).
- Sự cố làn (báo hỏng): giữ **ghi chú bắt buộc** gồm khi nào, làn nào, hỏng như thế nào, và **thêm ảnh** (tối đa 3, xem câu hỏi 2 mục 10.5).
- API: các endpoint tạo và hoàn tất nhận ảnh dạng multipart như thu hoạch hiện nay (`photos` lặp, JPEG hoặc PNG, mỗi ảnh tối đa 10 MB), kiểm tra **1 ≤ số ảnh ≤ 3**. Thêm bảng `NurseryBatchPhotos`, `SeedingRecordPhotos`; thu hoạch dùng bảng ảnh lô thu hiện có (nâng thành bắt buộc cho lô mới). Đọc trả `photos[{id,url}]`. Thêm hoặc xóa ảnh khi sửa vẫn trong khoảng 1 đến 3. Lỗi 400 nêu rõ trường `Photos`.
- Bắt buộc ảnh chỉ áp dụng cho bản ghi **mới**; bản ghi cũ không có ảnh vẫn hợp lệ.

### 10.3 Thiết kế lại hiển thị làn (Web) và % tiến độ từng làn
- Hiển thị các làn thành **các cột đứng xếp ngang, kéo ngang để xem** (làn 1, 2, 3 … N từ trái sang phải), mỗi cột là một thanh cao đổ màu theo phần trăm.
- **Bấm vào một làn** mở khung nhỏ (popover) để **xem và chỉnh** **% đã thả nuôi** và **% đã thu hoạch** của làn đó (kèm người sửa, số cũ → số mới).
- **Màu rõ ràng, có chú giải:** xám nhạt = chưa thả; **xanh lá = đã nuôi** (phần đã thả, đổ theo %); **xanh dương đậm = đã thu hoạch** (phần đã thu, đổ theo %); cam = đang thu hoạch một phần; đỏ = hỏng; xám gạch = ngừng hoạt động. Phần màu của cột cao tương ứng %.
- Dữ liệu: mỗi bản ghi thả giống ghi `seededPercent` cho từng làn (mặc định 100); mỗi lần thu ghi `harvestedPercent` cho từng làn. Cộng dồn theo làn **không vượt 100%** trong cùng chu kỳ. Trạng thái làn suy ra từ % (0% chưa thả; giữa 0 và 100 là đang nuôi hoặc thu một phần; 100% thả đầy hoặc thu xong). "Hoàn tất thu hoạch" đặt `harvestedPercent` = 100. Chỉnh % ghi nhật ký (cũ → mới, lý do).
- Đây là mở rộng so với SRS (thả giống và thu hoạch ghi theo cả làn): ghi vào `SRS_DEVIATIONS.md`.
- Chế độ chọn và hoàn tất nhiều làn đã có vẫn dùng được trên thiết kế mới.

### 10.4 Việc backend cần làm thêm (tổng hợp)
1. Toàn bộ API ươm (mục 5), với **một lô giống mỗi đợt**, bỏ `expectedHarvestDate`, phân bổ chuyển được giữa các bè, ảnh 1 đến 3.
2. Ảnh bắt buộc 1 đến 3 cho: bắt đầu ươm, hoàn tất ươm, thả giống, thu hoạch (lô mới); ảnh sự cố làn tối đa 3.
3. % tiến độ từng làn: cột `SeededPercent` và `HarvestedPercent` trên bảng lô làn của thả giống và thu hoạch, endpoint chỉnh % `PUT /api/rafts/{raftId}/lanes/{n}/progress` với `{seededPercent?, harvestedPercent?, reason, rowVersion}`, đọc trả `seededPercent`, `harvestedPercent` mỗi làn, kèm lịch sử.
4. Bỏ `expectedHarvestDate` khỏi form và đọc kế hoạch chu kỳ.
5. Tài liệu: hợp đồng API mới và cập nhật `SRS_DEVIATIONS.md` (mục 3, 4 của file này và mục 10).

### 10.6 Chốt cuối của chủ dự án (12/11), GHI ĐÈ mục 10.5 bên dưới
1. Ảnh ở bước thả giống và thu hoạch là **ảnh chụp tại hiện trường**.
2. **Sự cố làn: bắt buộc ít nhất 1 ảnh, tối đa 3 ảnh.**
3. **Nhập % làn ngay trong form thả giống và form thu hoạch** (không kéo cột bằng tay vì dễ sai số). Bấm vào làn xem chi tiết rồi sửa tỷ lệ phần trăm hoàn thành. **Màu cột phải đậm, rõ, nổi bật** (bản màu nhạt hiện nay bị chê): dùng màu bão hòa và tương phản cao, có viền và nhãn %.
4. % thu hoạch **không liên kết** với số lồng (hai số nhập độc lập).
5. Ảnh **bắt buộc 1 đến 3** ở các bước quan trọng: **bắt đầu ươm, hoàn tất ươm, kế hoạch nuôi (tạo chu kỳ), thả giống, thu hoạch, sự cố làn**. **Nhật ký chăm sóc theo từng đợt chỉ tùy chọn** (ghi chú tùy chọn, ảnh tùy chọn tối đa 3). Sử dụng vật tư: tùy chọn.
6. Ảnh bước hoàn tất ươm dùng chung cho kế hoạch nuôi của các chu kỳ được tạo ở bước đó (mỗi chu kỳ tham chiếu bộ ảnh hoàn tất ươm); khi tạo chu kỳ riêng (không từ ươm, dữ liệu cũ) thì kế hoạch nuôi nhận ảnh riêng 1 đến 3.

### 10.7 Thả giống từ ươm phải đủ 100% phần đã chuyển (chủ dự án, 13/11), GHI ĐÈ mục 3.4, 5.3 mục 5 và quyết định 12 ở trên
Lời chủ: "ươm xong rồi và chọn bè rồi thì phần ghi nhận thả giống phải thả 100% số đã gửi ươm sang bè, nên số lượng giống từ ghi nhận thả giống không thể tự chọn được, bởi nếu giữ lại phần ươm còn thừa thì có khả năng thừa hoặc vứt bỏ".
1. Chu kỳ có `nurseryBatchId`: **số lượng thả không được chọn**, bằng đúng phần còn lại của phần chia (`nurseryRemaining`). Người dùng vẫn chọn làn (và % từng làn), ngày, ảnh 1 đến 3 và ghi chú.
2. Muốn thả số khác thì **trước đó** sửa số sống sót hoặc chuyển phần chia giữa các bè (các luồng này giữ nguyên), rồi mới thả.
3. API: có thể không gửi `quantity`; gửi khác phần còn lại thì 400 `NURSERY_SEEDING_MUST_USE_FULL_ALLOCATION`; không còn gì để thả thì 400 `NURSERY_SEEDING_ALREADY_COMPLETE`. Chi tiết trong hợp đồng API mục 5 và 6.
4. Sửa bản ghi thả giống của chu kỳ ươm (cả hiệu chỉnh TRACE-03): số lượng luôn bằng phần chia trừ các bản ghi khác của chu kỳ, không nhập tay; nếu chủ nâng phần chia sau khi thả thì sửa bản ghi sẽ lấy số mới.
5. Web: ô "Số lượng giống" thay bằng dòng chỉ đọc "Số lượng thả: X mảnh · toàn bộ phần đã chuyển sang bè (không chọn số lượng)"; hết phần thì hiện "Đã thả hết phần đã chuyển sang bè" và khóa nút Lưu. Chu kỳ không qua ươm giữ form cũ.
6. Câu hỏi cho PM: thả giống từ ươm bắt buộc đủ 100% phần đã chuyển, đúng với SRS (GBR-04, CYCLE-02) chưa? Xem `SRS_DEVIATIONS.md` NUR-15.

### 10.5 Câu hỏi mở còn lại (đã được trả lời ở 10.6)
1. "Step thả và thu cần ảnh kế hoạch nuôi hoặc kế hoạch thu hoạch": hiểu đúng là **ảnh phải kèm ở bước thả giống và thu hoạch** (ảnh chụp tại hiện trường)? Hay còn cần **ảnh đính kèm cho chính kế hoạch nuôi** (lúc tạo chu kỳ)?
2. Ảnh sự cố làn: **bắt buộc ít nhất 1 ảnh** hay vẫn **tùy chọn** (trước đây chủ chọn tùy chọn)?
3. % làn: một lần thả cho cả làn mặc định 100%; có nhập % ngay trong form thả giống (thả nửa làn), hay chỉ chỉnh sau trong popover làn?
4. % thu hoạch có **liên kết với số lồng** không? Đề xuất **không liên kết**: số lồng và % là hai số nhập độc lập.
5. Chăm sóc và vật tư: ảnh cũng bắt buộc 1 đến 3 hay giữ như hiện tại (nhật ký chăm sóc đã có ảnh)?
