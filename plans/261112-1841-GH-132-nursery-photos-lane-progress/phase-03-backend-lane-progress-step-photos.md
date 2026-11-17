# Phase 03: Backend % tiến độ làn, ảnh bắt buộc các bước, sự cố làn (B2)

**Người làm:** Claude (backend, cùng agent/nhánh với Phase 02, chạy sau). **Ưu tiên:** P1. **Phụ thuộc:** Phase 01, 02. **Trạng thái:** pending.

## Context
- Đặc tả mục 10.2, 10.3, 10.4, 10.6. Mã hiện có: `HarvestLotsController`, `HarvestLotForm`, `HarvestLotFieldReader`, `SeedingRecordService`, `SeedingRecordLane`, `LaneIncidents` (raft-lanes), `HarvestLanesFinishService`, `StepPhotoService` (Phase 01).

## Yêu cầu
1. **% từng làn:** cột `SeededPercent` (0-100) trên làn của phiên thả giống, `HarvestedPercent` trên làn của lô thu; mặc định 100 (thả/thu cả làn); cộng dồn theo làn **không vượt 100%** trong cùng chu kỳ (400 `LanePercent` nêu làn và phần còn lại); form thả giống và thu hoạch nhận **% từng làn** tùy chọn (`lanePercents`: `{laneNumber: percent}`); trạng thái làn suy ra từ %; **Hoàn tất thu hoạch** (một và nhiều làn) đặt `HarvestedPercent` = 100; `PUT /api/rafts/{raftId}/lanes/{n}/progress {seededPercent?, harvestedPercent?, reason, rowVersion}` chỉnh sau, ghi lịch sử cũ → mới (người, lúc, lý do); đọc làn trả `seededPercent`, `harvestedPercent`; migration backfill: làn đã thả = 100, làn đã thu xong = 100, làn đang thu một phần = null.
2. **Ảnh bắt buộc 1-3** (qua `StepPhotoService`) cho bản ghi **mới**: thả giống, thu hoạch (lô mới), kế hoạch nuôi (tạo chu kỳ không từ ươm), sự cố làn (báo hỏng bắt buộc 1-3 ảnh + ghi chú gồm khi nào/làn nào/hỏng thế nào); bản ghi cũ không ảnh vẫn hợp lệ; sửa bản ghi vẫn trong 1-3; nhật ký chăm sóc (ghi chú + ảnh tùy chọn tối đa 3) và sử dụng vật tư (tùy chọn) không đổi hành vi bắt buộc. Đọc trả `photos[{id,url}]`.
3. Khớp B1: bước hoàn tất ươm dùng ảnh bắt buộc đã làm ở Phase 02.
4. Cập nhật lịch sử/nhãn tiếng Việt cho trường % và ảnh (`RecordHistoryLabels`).
5. Hợp đồng API bổ sung vào `FARMING_NURSERY_API_CONTRACT_2026-11-12.md` (mục "% làn và ảnh").

## Files
Sửa: `SeedingRecordService`, `SeedingRecordLane`, `HarvestLotRecordingService`, `HarvestLotFieldReader`, `HarvestLanesFinishService`, `LaneIncident*`, DTO/đọc làn, `RecordHistoryLabels`. Mới: endpoint `LaneProgressController` hoặc bổ sung `RaftsController`, migration `LaneProgressPercent`, test.

## Steps
1. Migration + entity + backfill.
2. Quy tắc cộng dồn ≤ 100% ở thả giống và thu hoạch + chỉnh sau + lịch sử.
3. Ảnh bắt buộc cho thả giống/thu hoạch/kế hoạch/sự cố (chỉ bản ghi mới).
4. Hoàn tất làn đặt 100%; trạng thái làn suy ra.
5. Test: vượt 100% bị chặn; hoàn tất làn đặt 100; thiếu ảnh bị 400; bản ghi cũ không ảnh đọc được; chỉnh % có lịch sử.

## Todo
- [ ] Migration % làn
- [ ] Cộng dồn + chỉnh % + lịch sử
- [ ] Ảnh bắt buộc các bước
- [ ] Hợp đồng bổ sung + commit

## Thành công
Thả 60% làn rồi 40% làn: đủ 100%; thả thêm 10% bị 400; sửa % có "cũ → mới"; lô thu mới không ảnh bị 400 `Photos`; lô cũ vẫn đọc.

## Rủi ro
Thu hoạch gắn yêu cầu mua của đồng đội: chỉ thêm ảnh và %; test dùng yêu cầu mua đã chấp nhận demo (Phase 01).

## Kiểm tra gọn
Một container 3 GB, lớp Lane*, Harvest*, Seeding* mới/đổi; không SQL Server (một test migration up/down/up gọn nếu cần).
