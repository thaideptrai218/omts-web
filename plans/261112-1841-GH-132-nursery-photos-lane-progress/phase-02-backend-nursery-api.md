# Phase 02: Backend API ươm giống (B1)

**Người làm:** Claude (backend, nghĩ kỹ, một agent). **Ưu tiên:** P1. **Phụ thuộc:** Phase 01. **Trạng thái:** pending.

## Context
- Đặc tả: `docs/reports/FARMING_NURSERY_STEP_SPEC_2026-11-12.md` mục 2, 3, 5 (dữ liệu, endpoint, quy tắc), 10.1 đến 10.6.
- Mẫu khuôn: module Employee/Supplier/Harvest (service, controller, validator, audit, history `RecordHistoryLabels`, migration, test), `FarmingStockIssue` (Xuất dùng liên kết), `StepPhotoService` (Phase 01), cơ chế thông báo cho chủ khi Quản lý ghi (xem thông báo làn hỏng).

## Yêu cầu (tóm tắt, chi tiết trong đặc tả)
- Thực thể `NurseryBatch` (một lô giống mỗi đợt, vùng, số mảnh vào, ngày bắt đầu, trạng thái Đang ươm/Đã hoàn tất/Đã hủy, số sống sót, mã NU000001), `NurseryBatchAllocation` (bè, chu kỳ, số mảnh), `NurseryBatchPhoto`; `CultivationCycles.NurseryBatchId/NurseryAllocatedQuantity`; `SeedingRecords.NurseryBatchId`; mục đích Xuất dùng `Nursery`.
- Endpoint: danh sách, chi tiết, tạo (`POST /api/zones/{zoneId}/nursery-batches` + ảnh 1-3 multipart), sửa, hủy, **hoàn tất** (`{survivors, allocations[{raftId, quantity, targetYieldKg?}], photos 1-3}`; một giao dịch: đóng đợt, tạo chu kỳ cho mỗi bè, **không có ngày thu dự kiến**), sửa số sống sót (cũ → mới, lý do), chuyển phân bổ giữa bè trước khi thả, lịch sử, `available?zoneId`.
- Quy tắc: số vào ≤ tồn kho (kiểm bằng dịch vụ Xuất dùng hiện có, trừ kho khi bắt đầu); `survivors ≤ quantityIn`; tổng phân bổ **bằng** `survivors`; mọi bè cùng vùng, không có chu kỳ mở; ảnh 1-3 bắt buộc khi tạo và khi hoàn tất; Quản lý vùng ghi thì thông báo chủ; chu kỳ từ ươm: thả giống bị chặn cứng ở phần còn lại (sửa `SeedingRecordService`), không tạo Xuất dùng ở thả giống, không còn mức 110%/150% cho chu kỳ từ ươm; chu kỳ cũ giữ hành vi cũ.
- Mở rộng đọc: chu kỳ/tiến độ/kế hoạch có `nurseryBatchId`, `nurseryCode`, `nurseryAllocated/Seeded/Remaining`; tóm tắt, close preview, `harvest-yield` có khối ươm (`estimated:true`).
- Bỏ `expectedHarvestDate` khỏi form và đọc kế hoạch chu kỳ (giữ cột, không trả).
- Quyền: Chủ HTX, Quản lý vùng trong vùng; mã chức năng dùng chung quyền thả giống tạm.
- Migration mới (tên sau `20261112120000_HarvestLotCrew`), Up/Down, snapshot sinh lại.

## Files
Mới: `Domain/Entities/Farming/Nursery*`, `Application/Features/Cultivation/Nursery/*`, `Api/Controllers/NurseryBatchesController.cs`, cấu hình EF, migration, test `tests/OMTS.*/.../Nursery*`. Sửa: `SeedingRecordService`, đọc chu kỳ/tóm tắt/yield, DI, nhãn lịch sử.

## Steps
1. Mô hình + migration + cấu hình EF.
2. Dịch vụ tạo/sửa/hủy + Xuất dùng liên kết + ảnh + audit.
3. Hoàn tất (giao dịch tạo chu kỳ) + sửa sống sót + chuyển phân bổ.
4. Sửa thả giống cho chu kỳ từ ươm; mở rộng đọc/tóm tắt/yield.
5. Endpoint, quyền, thông báo, lịch sử.
6. Test: đơn vị công thức; integration in-memory (tạo, hoàn tất 1 và nhiều bè, vượt phân bổ bị chặn, thiếu ảnh, bè có chu kỳ mở, Quản lý vùng thông báo chủ). Một test SQL Server up/down/up **chỉ** cho migration.
7. Viết hợp đồng `docs/reports/FARMING_NURSERY_API_CONTRACT_2026-11-12.md` (JSON chính xác, mã lỗi) cho Codex dùng.

## Todo
- [ ] Migration + entity
- [ ] Endpoint ươm đầy đủ
- [ ] Hoàn tất tạo chu kỳ
- [ ] Thả giống từ phân bổ
- [ ] Hợp đồng API + commit

## Thành công
Hoàn tất một đợt 10.000 mảnh sống sót 9.500 chia 2 bè → 2 chu kỳ có `ExpectedSeedQuantity` đúng; thả giống vượt phần còn lại bị 409; kho giảm đúng lúc bắt đầu; lịch sử ghi cũ → mới.

## Rủi ro
Chạm `SeedingRecordService` và `HarvestLot` của đồng đội: sửa tối thiểu, giữ nhánh cũ; kiểm tra xung đột migration trước khi báo xong.

## Kiểm tra gọn
Một container 3 GB, chỉ các lớp Nursery*; không đợt test dài.
