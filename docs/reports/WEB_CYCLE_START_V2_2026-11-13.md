# Web: Bắt đầu chu kỳ nuôi (mô hình ươm v2), 13/11/2026

Nguồn: `FARMING_NURSERY_MODEL_V2_2026-11-13.md` (1.2-1.3, 3, 6) và mục 0 của `FARMING_NURSERY_API_CONTRACT_2026-11-12.md` (B5; đã đọc lại sau khi viết code, khớp).

## Đã làm
- **Nút "Bắt đầu chu kỳ nuôi"** (`cycle-start-action.tsx`): trạng thái trống "Bè này chưa có chu kỳ nuôi" + nút (tab Tổng hợp, Kế hoạch); bè đã có chu kỳ đã đóng thì nút nằm ở đầu chi tiết bè. Ẩn khi bè ngừng sử dụng, đang có chu kỳ mở, backend `canStart=false` hoặc thiếu quyền Create (`canStartCycle` ở `cycle-model.ts`).
- **Form 2 bước** (`cycle-start-dialog.tsx`, `cycle-start-fields.tsx`, `cycle-start-model.ts`): bè + vùng chỉ đọc; "Đợt ươm (loại giống đã ươm)" chọn từ danh sách đợt đã ươm xong của vùng (nhãn `NU… · giống · còn X mảnh (ước tính)`; rỗng thì thông báo "Chưa có đợt ươm nào đã ươm xong trong vùng này" + link `/farming/nursery`); sản lượng dự kiến (UnitField kg, > 0, gợi ý "Tổng sản lượng giống này dự kiến thu về"); ngày bắt đầu (Field date, tối đa hôm nay); ghi chú; ảnh kế hoạch 1-3 bắt buộc. Bước 2 xem lại (bè, đợt ươm + còn lại, sản lượng, ngày, số ảnh) rồi "Xác nhận bắt đầu chu kỳ". Thành công: toast "Đã bắt đầu chu kỳ nuôi", URL `raftId/cycleId/tab=journey`, mở tab Tổng hợp. Lỗi backend đặt đúng ô (đợt ươm, sản lượng, ngày, ảnh); bè đã có chu kỳ mở (MSG-GEN-06) báo chung.
- **Kế hoạch tab** (`cycle-plan-tab.tsx`, `cycle-plan-fields.tsx`): sửa sản lượng dự kiến, ngày bắt đầu, ghi chú; chọn đổi đợt ươm CHỈ khi chưa thả (`isNurseryBatchLocked`: `canChangeNursery=false`, `nurserySeeded>0`, đã hoàn tất thả, hoặc có làn khác NotSeeded); khóa thì hiện chỉ đọc + "Đã thả giống, không đổi được đợt ươm". 409 `CYCLE_SEED_LOCKED` có thông báo riêng. Gửi `note: ""` để xóa ghi chú; `nurseryBatchId` chỉ gửi khi đổi thật. Bỏ ô "Lượng giống dự kiến".
- **Hiển thị đợt ươm**: Tổng hợp (bước Ươm: chip `NU… · giống`, "Đã thả: X mảnh", "Còn trong kho ươm: Y mảnh"), Kế hoạch (`NU… · giống · kho ươm còn Y mảnh`), tiêu đề chi tiết bè (nhãn "Đợt ươm NU…"), panel Kế hoạch ở Tiến độ làn (`cycle-plan-summary.tsx` thay `CyclePlanSummary` cũ của cultivation-api).
- **Dọn mô hình cũ**: bỏ "Chu kỳ mới được tạo khi hoàn tất ươm" (chi tiết, journey, danh sách trống), "Phân bổ từ ươm/Đã chuyển sang bè/Còn được thả", `nurseryAllocated`, nhãn "Sản lượng mục tiêu" thành "Sản lượng dự kiến"; giống dự kiến chỉ hiện ở chu kỳ cũ có giá trị. Không có ngày thu dự kiến. Xóa `cycle-editor.tsx` (không còn dùng). Ảnh kế hoạch sửa được cho mọi chu kỳ (bỏ nhánh `PLAN_PHOTOS_FROM_NURSERY`; chu kỳ cũ chỉ mượn ảnh của đợt ươm thì giữ chỉ đọc).
- **BFF** (`src/server/workspace`): bắt đầu = multipart `POST /api/cultivation-cycles` (`raftId` thêm từ `id`), schema mới `cycleStartInput`/`cycleEditInput` (strict: không `expectedSeedQuantity`); đọc đợt sẵn sàng qua `GET ?action=nursery-available&zoneId=` của chính BFF chu kỳ (quyền View của CULTIVATION_CYCLES) gọi `/api/nursery-batches/available`.

## Kiểm thử
vitest: cycles-api (18 file) + server/workspace: 20 file, 261 test đạt. Thêm: `cycle-start-model.test.ts`, `cycle-start-dialog.test.tsx` (rỗng, validation, xem lại + dạng multipart, lỗi đợt ươm), `cycle-start-screen.test.tsx` (nút hiện/ẩn, chọn chu kỳ mới vào URL, khóa/mở đợt ươm ở Kế hoạch), `cycles-start-bff.test.ts` (đường dẫn, multipart, quyền, lỗi); cập nhật `cycle-model.test.ts`, `cycle-journey.test.tsx`. ESLint sạch trên `cycles-api` và `server/workspace`. `tsc --noEmit`: không lỗi ở file của task; còn 6 lỗi ở `nursery-api/*.test.ts` (N-A đang sửa dở: `nursery-complete-dialog.test.tsx`, `nursery-completion-validation.test.ts`).

## Giả định / chưa làm
- Đọc danh sách đợt sẵn sàng qua BFF chu kỳ (không dùng route `/api/nursery?action=available`, vì BFF ươm hiện chưa có hành động này). Khi BFF ươm có, vẫn dùng được cách hiện tại.
- Chu kỳ cũ không qua ươm: không sửa được "lượng giống dự kiến" nữa (backend mục 0.8 vẫn nhận; YAGNI).
- Chưa làm "nút nhanh trong chi tiết bè" (màn Bè nuôi); chưa đụng `farming-workflow-nav*` và màn Thả giống (hướng dẫn "Hãy bắt đầu chu kỳ nuôi trước" thuộc N-C).
- `CyclePlanSummary` trong `cultivation-api/lane-board.tsx` không còn nơi dùng (N-C có thể xóa).
- Tên giống của chu kỳ lấy từ `seedLot.itemName` (hợp đồng mục 0.7/0.9); chưa kiểm với backend thật.

Câu hỏi còn mở: không.
