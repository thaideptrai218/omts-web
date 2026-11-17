# Mô hình Ươm → Chu kỳ nuôi → Thả giống (v2, 13/11/2026)

Nguồn: chủ dự án giải thích quy trình thực tế rạng sáng 13/11. **Thay thế** các quyết định cũ về "chuyển/phân bổ số mảnh ươm sang bè lúc hoàn tất ươm" và "thả giống đúng 100% phần đã chuyển" (FARMING_NURSERY_STEP_SPEC mục 3.3, 5.2, 10.7; NUR-15). Những phần khác của đặc tả ươm (vùng, ảnh 1-3, số sống sót ước tính, thông báo chủ, hao hụt ước tính) giữ nguyên.

## 1. Quy trình thực tế
1. **Ươm:** 1 vạn mảnh ươm ngoài biển (lấy từ lô giống trong kho). Ươm xong **không chuyển thẳng cho bè nào**; phần đã ươm xong nằm ở "kho ươm" ngoài biển, sẵn sàng thả dần.
2. **Bắt đầu chu kỳ nuôi** (mỗi bè một lần, **thủ công**, không tự mở): chọn bè trống, chọn **một đợt ươm đã hoàn tất** (đó là "loại giống đã ươm" của chu kỳ; chọn trong các đợt ươm đã ghi nhận, **không** lấy trực tiếp lô trong vật tư), nhập **sản lượng dự kiến tổng (kg)** do giống đó sinh ra, ngày bắt đầu, ảnh kế hoạch 1-3. Một chu kỳ chỉ một loại giống (một đợt ươm). Một đợt ươm có thể nuôi nhiều bè (mỗi bè một chu kỳ).
3. **Chỉ sửa đợt ươm của chu kỳ khi chưa thả làn nào.** Muốn đổi loại giống phải sửa trong chu kỳ nuôi, trước khi có bản ghi thả giống đầu tiên.
4. **Ghi nhận thả giống** (báo cáo theo ngày; phải có chu kỳ trước): loại giống **cố định theo chu kỳ, chỉ đọc**; nhập **số mảnh lấy hôm nay** (ví dụ 3.000, bị chặn theo số còn trong kho ươm), chọn làn (ví dụ làn 1-5; hôm sau 4.000 mảnh làn 6-12), **% từng làn** do người phụ trách ước lượng bằng mắt (độc lập với số mảnh), ảnh 1-3 bắt buộc. Làn đã 100% **không hiện lại** trong danh sách chọn ở lần thả sau (vẫn hiện ở sơ đồ tổng quan). Nhiều báo cáo cho tới khi dùng hết phần đã ươm.
5. **Hoàn tất thả giống:** nút hiện khi đã có ít nhất một lần thả; bấm khi bè thả xong (không cần đủ 100% làn).
6. **Đóng đợt ươm:** khi các bè thả xong mà đợt ươm còn dư, bấm "Đóng đợt ươm": số còn lại ghi là hao hụt (ước tính), đợt ươm kết thúc.

## 2. Đợt ươm (NurseryBatch) v2
- Trạng thái: 4001 Đang ươm, 4002 **Đã ươm xong** (sẵn sàng thả; trước đây "Đã hoàn tất"), 4003 Đã hủy, **4004 Đã đóng** (mới).
- **Hoàn tất ươm:** chỉ nhập số sống sót ước tính (≤ số vào), ngày hoàn tất, ảnh 1-3; **không có phân bổ/chia bè, không tạo chu kỳ, không nhập sản lượng dự kiến**. Số sống sót 0 cho phép (đợt đóng luôn, không còn gì để thả).
- Kho ươm: `survivors` (sống sót ước tính), `seeded` (tổng số mảnh đã thả từ đợt này qua mọi chu kỳ/bè, trừ bản ghi đã xóa), `remaining = survivors − seeded` (chỉ khi 4002).
- **Sửa số sống sót** (khi 4002): không được thấp hơn `seeded`; ghi cũ → mới + lý do (như cũ).
- **Đóng đợt ươm** (khi 4002 và `remaining > 0`): `POST /api/nursery-batches/{id}/close {reason?, rowVersion}`; ghi `closedOn`, `closeLossPieces = remaining` (ước tính), status 4004. Thông báo chủ nếu Quản lý vùng làm. Đóng rồi không thả thêm.
- **Xóa/hủy** chỉ khi 4001 (hoàn kho như cũ). Không xóa khi 4002 trở đi.
- **Bỏ:** `allocations`, endpoint chuyển phân bổ giữa bè, tạo chu kỳ lúc hoàn tất. Thay bằng `usage: [{cycleId, cycleCode?, raftId, raftCode, seeded, lastSeedingOn}]` (các bè/chu kỳ đang lấy giống từ đợt này).
- Danh sách/chi tiết thêm: `seeded`, `remaining`, `closedOn`, `closeLossPieces`, `usage`.
- `GET /api/nursery-batches/available?zoneId=` → các đợt 4002 có `remaining > 0` trong vùng (cho form bắt đầu chu kỳ).
- Hao hụt ước tính tổng của đợt: `quantityIn − survivors` (lúc ươm) + `closeLossPieces` (sau đóng); luôn ghi "ước tính".

## 3. Chu kỳ nuôi v2
- **Tạo thủ công** `POST /api/cultivation-cycles` (multipart): `raftId`, `startDate`, `nurseryBatchId` (**bắt buộc**), `targetYieldKg` (**bắt buộc**, > 0, sản lượng dự kiến tổng), `note?`, `photos` (1-3, ảnh kế hoạch bắt buộc). Điều kiện: bè đang sử dụng, chưa có chu kỳ mở; đợt ươm ở trạng thái 4002, cùng vùng với bè, `remaining > 0`. **Không** còn đường tạo bằng lô giống từ vật tư (đóng hẳn đường cũ; cấu hình `Cultivation:AllowManualStart` bỏ hoặc luôn bật nhưng bắt buộc `nurseryBatchId`). Không có ngày thu dự kiến.
- **Sửa chu kỳ** (`PUT`): `targetYieldKg`, ngày bắt đầu, ghi chú luôn sửa được khi chu kỳ mở; **`nurseryBatchId` chỉ sửa khi chưa có bản ghi thả giống nào** (409 `CYCLE_SEED_LOCKED` nếu đã có), đợt mới cũng phải 4002, cùng vùng, còn `remaining > 0`.
- Đọc chu kỳ thêm: `nurseryBatchId`, `nurseryCode`, `nurseryRemaining` (kho ươm còn lại của đợt), `nurserySeeded` (số đã thả riêng chu kỳ này), `seedLot` (lô giống gốc của đợt ươm, chỉ đọc).
- Hành trình (journey): bước "Ươm" hiển thị đợt ươm nguồn; "Kế hoạch" có sản lượng dự kiến.
- Chu kỳ cũ (dữ liệu demo cũ không qua ươm) vẫn đọc/thu hoạch/đóng được; **không** tạo mới theo đường cũ.

## 4. Ghi nhận thả giống v2
- `POST /api/seeding-records` (multipart; cùng đường hiện có): `cycleId`, `seedingDate`, `quantity` (**bắt buộc**, > 0), `lanes`/`lanePercents` (như hiện tại, % tùy chọn mặc định 100), `photos` 1-3, `note?`. **Không** gửi lô giống: lô lấy từ đợt ươm của chu kỳ.
- Chặn: `quantity > remaining` của đợt ươm → 409 `NURSERY_POOL_EXCEEDED` (nêu `remaining`), chu kỳ đã đóng/đã hoàn tất thả giống, làn đã 100% (400 `LanePercent`), thiếu ảnh (400 `Photos`).
- Sửa/xóa một bản ghi thả giống (khi chưa hoàn tất thả giống): trả/lấy lại số mảnh khỏi kho ươm theo chênh lệch; vẫn không vượt `remaining`.
- Bỏ: luật "thả đúng 100% phần đã chuyển" (NURSERY_SEEDING_MUST_USE_FULL_ALLOCATION, NURSERY_SEEDING_ALREADY_COMPLETE) và 409 `NURSERY_SEEDING_ABOVE_ALLOCATION` (thay bằng `NURSERY_POOL_EXCEEDED`).
- Số mảnh thả và % làn **độc lập**: hệ thống không bắt hai số khớp nhau.
- Đọc bảng thả giống: mỗi bản ghi có ngày, số mảnh, các làn, người ghi; đầu bảng có `nurseryRemaining`, `seededCount/laneCount`, `seedingCompletedOn`, danh sách làn còn có thể thả (làn < 100% theo lần thả).

## 5. Dữ liệu demo (seed)
- Vùng DEMO-01: ít nhất 2 đợt ươm **đã ươm xong (4002)** sẵn sàng thả (ví dụ NU… 9.500 và 6.000 mảnh sống sót, chưa thả), 1 đợt đang ươm (4001) để thử hoàn tất; 4-5 bè trống có làn; 3-4 đơn mua đã chấp nhận còn mở thu hoạch (800/1.500/2.000 kg và đơn 5 lồng cũ); chu kỳ cũ không qua ươm (nếu còn) giữ nguyên hoặc bỏ.
- Không để tồn kho âm; seed idempotent.

## 6. Giao diện (web)
- Menu/thanh: `0 Hành trình | 1 Ươm giống → 2 Thả giống → 3 Thu hoạch → 4 Sử dụng vật tư (tùy chọn) → 5 Theo dõi chất lượng nước`. **Bắt đầu chu kỳ nuôi** là nút trên màn Hành trình (và nút nhanh trong chi tiết bè), mở form 1 bước + xem lại: bè, đợt ươm (hiện "NU… · Hàu giống · còn X mảnh đã ươm"), sản lượng dự kiến kg, ngày bắt đầu, ảnh. Ở màn Thả giống chưa có chu kỳ thì hiện hướng dẫn "Hãy bắt đầu chu kỳ nuôi trước" kèm nút tới Hành trình.
- Hoàn tất ươm: 1 bước nhập (+ xem lại), không chọn bè. Chi tiết đợt ươm: khối "Kho ươm" (vào, sống sót ước tính, đã thả, còn lại, hao hụt ước tính), "Đang dùng cho các bè", nút Đóng đợt ươm, Sửa số sống sót, Xóa (chỉ khi đang ươm).
- Form Ghi nhận thả giống: đầu form dòng chỉ đọc "Giống: NU… · Hàu giống · kho ươm còn X mảnh"; ô số mảnh hôm nay (chặn > còn lại, nhãn rõ); chọn làn (làn 100% ẩn), bỏ tick từng làn, % làn, ảnh. Thiết kế đúng `docs/DESIGN_GUIDELINES.md` (khung quản lý, bộ chọn ngày thống nhất, pop-up có nút ×, ô số tự nhóm hàng nghìn).

## 7. Câu hỏi đã chốt với chủ (13/11)
1A đợt ươm cụ thể và chỉ từ giống đã ươm; 2 chỉ nhập sống sót ước tính (bỏ chuyển bè); 3A nút Đóng đợt ươm ghi phần dư là hao hụt; 4 sản lượng dự kiến thuộc chu kỳ nuôi (không ở báo cáo thả hằng ngày); 5 chu kỳ không tự mở, tạo thủ công bắt buộc có đợt ươm và sản lượng dự kiến, phải có chu kỳ mới có thả giống; 6 một chu kỳ một đợt ươm (không trộn), một đợt ươm nuôi được nhiều bè; 7 làn 100% ẩn ở lần thả sau; 8 số mảnh và % làn độc lập (% do người phụ trách ước lượng bằng mắt); 9 hoàn tất thả giống bấm tay; 10 sửa/xóa bản ghi thả hoàn kho ươm; 11 sửa sống sót không thấp hơn đã thả (tạm quyết, theo dõi); 12 không giới hạn mảnh theo ngày, chỉ chặn vượt kho ươm.
