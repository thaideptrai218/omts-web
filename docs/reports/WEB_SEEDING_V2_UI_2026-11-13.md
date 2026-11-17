# Web: Ghi nhận thả giống theo mô hình V2 (N-C), 13/11/2026

Nguồn: FARMING_NURSERY_MODEL_V2_2026-11-13.md, mục 0.10 / 0.11 của FARMING_NURSERY_API_CONTRACT_2026-11-12.md. Tiếp quản từ Codex (dừng giữa chừng), hoàn thiện và kiểm chứng với backend 8082.

## Đã làm
- Form chu kỳ có đợt ươm: dòng chỉ đọc "Giống: NU… · tên giống · kho ươm còn X mảnh (ước tính)"; ô "Số mảnh lấy hôm nay" tự do, chặn client khi > kho còn ("Chỉ còn X mảnh trong kho ươm."), không gửi lô giống; 409 `NURSERY_POOL_EXCEEDED` hiện ở đúng ô kèm số còn lại; 409 `SEEDING_COMPLETED` có câu tiếng Việt.
- Chu kỳ cũ ("Không qua ươm") giữ form chọn lô, bảng theo lô, kế hoạch 110%/150%.
- Bộ chọn làn: dùng `seedableLaneNumbers` của backend (dự phòng: `canSeed` và `seededPercent < 100`); làn 100% ẩn (verified: sau khi thả làn 1-5, form chỉ còn 11 làn 6-16); làn của bản ghi đang sửa vẫn chọn được. % làn "(ước lượng)" độc lập số mảnh; giữ dải làn, "Bỏ các làn", bỏ tick, side panel, ảnh 1-3, nút ×.
- Bè chưa có chu kỳ: "Bè chưa có chu kỳ nuôi. Hãy bắt đầu chu kỳ nuôi trước" + liên kết `/farming/cycles?zoneId=..&raftId=..`; ẩn "Ghi nhận thả giống".
- Dải trên cùng: đợt ươm + kho còn, đã thả bởi chu kỳ (`nurserySeeded`), làn x/y, trạng thái hoàn tất. Bảng theo ngày: ngày, số mảnh, dải làn, người ghi, tổng đã thả (lũy kế) + dòng "Tổng cộng đã thả".
- "Đánh dấu hoàn tất thả giống": chỉ khi đã có bản ghi, MỘT hộp xác nhận duy nhất ("…và thông báo cho chủ hợp tác xã?").
- Sửa/xóa bản ghi: xác nhận xóa ghi "Số mảnh sẽ được hoàn lại kho ươm"; ẩn nút sửa/xóa và nút ghi nhận khi đã hoàn tất thả giống.
- Schema dung sai (`seeding-contracts.ts`): `nurseryRemaining/nurserySeeded/nurseryCode/seedLot`, `seedableLaneNumbers`, `remainingPercent`; thiếu/thừa trường không vỡ màn.
- Dọn: xóa `CyclePlanSummary` chết trong `lane-board.tsx`; bỏ test "xác nhận hoàn tất khi chưa thả" lỗi thời (file `seeding-stock-refusal.test.tsx` chỉ còn phần tồn kho); tách `seeding-record-details.tsx` khỏi panel.

## Tệp
Mới: `seeding-contracts.ts`, `seeding-lane-choices.ts`, `seeding-record-details.tsx`, `seeding-contracts.test.ts`, `seeding-complete-dialog.test.tsx`.
Sửa: `records-seeding-form.tsx`, `records-seeding-panel.tsx`, `records-complete-seeding-dialog.tsx`, `records-raft-panel.tsx`, `seeding-summary-strip.tsx`, `seeding-nursery-quantity-summary.tsx`, `seeding-lane-picker.tsx`, `record-lane-percent-fields.tsx`, `records-contracts.ts`, `contracts.ts`, `farming-problem(.test).ts`, `farming-error-text.ts`, `lane-board.tsx`, `seeding-from-nursery-form.test.tsx`, `seeding-stock-refusal.test.tsx`.
Không sửa BFF (`src/server/**`): luồng hiện có đã chuyển `quantity`.

## Kiểm chứng
- vitest (chỉ tệp đã đổi): seeding-from-nursery-form (5: dòng chỉ đọc + gửi quantity không seedLotId, chặn vượt kho client, ẩn làn 100%, 409 pool, form chu kỳ cũ), seeding-complete-dialog (một hộp, chặn khi chưa có bản ghi), seeding-contracts. Pass.
- eslint tệp đổi: sạch. `tsc --noEmit` một lần: 0 lỗi.
- Trình duyệt (puppeteer, backend 8082): B1-12 trống -> màn Thả giống hiện hướng dẫn + liên kết; bắt đầu chu kỳ bằng NU000008 (3.000 kg) qua form của N-B; thả 500 mảnh làn 1-5 -> kho NU000008 còn 5.500 (từ 6.000), bảng hiện "13/11/2026 | 500 | 1–5 | Nguyễn Văn Hải | 500". 1366 px và 360 px không tràn ngang. Không đụng NU000007.
- Dữ liệu tạo thêm: chu kỳ mới trên B1-12 (NU000008) với 1 lần thả 500 mảnh.

## Chưa làm / giả định
- Chưa thử trên trình duyệt: sửa/xóa bản ghi, hoàn tất thả giống, 409 `SEEDING_COMPLETED` (có test đơn vị/ánh xạ lỗi).
- Cột "Tổng đã thả" là lũy kế theo ngày + giờ ghi.
- Thông báo toast sau lưu không còn mã lô với chu kỳ có đợt ươm (dùng mã đợt ươm).
