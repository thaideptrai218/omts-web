# Phase 01: Nền tảng ảnh local và đơn mua demo (M0)

**Người làm:** Claude (backend). **Ưu tiên:** P1 (làm trước, nhỏ). **Trạng thái:** pending.
**Nhánh:** `feature/OMTS-132-nursery` (tạo từ `feature/OMTS-132-raft-lanes`).

## Context
- Backend đã có `IFileStorage`, `LocalFilesController`, `StorageOptions`, dịch vụ ảnh bìa hợp tác xã, ảnh bè (tối đa 3), ảnh lô thu hoạch, ảnh nhật ký chăm sóc. Xem `src/OMTS.Application/Common/Interfaces/Storage/IFileStorage.cs`, `src/OMTS.Api/Controllers/LocalFilesController.cs`, `HarvestLotForm.cs`, `RaftsController` (ảnh bè).
- Demo seeder: `src/OMTS.Infrastructure/Bootstrap/Demo/DemoPurchaseRequestStep.cs`, `DemoHarvestLotStep.cs`, `DemoSeedContext.cs`.
- Quy tắc đồng đội (develop): lô thu hoạch mới phải gắn một yêu cầu mua **đã được chấp nhận** còn mở thu hoạch (`docs/cage-order-harvest.md`).

## Yêu cầu
1. **Ảnh local tạm thời, sẵn sàng cloud:** mọi ảnh mới đi qua `IFileStorage` (không tự ghi đĩa); khóa lưu theo cấu trúc `cooperative/{coopId}/{entity}/{id}/{guid}.{ext}`; cấu hình `StorageOptions` chọn provider local/cloud; tài liệu ngắn cách đổi sang cloud sau (không làm cloud).
2. **Dịch vụ dùng chung `StepPhotoService`** (mới): nhận danh sách file multipart, kiểm tra **1 ≤ số ảnh ≤ 3**, JPEG/PNG, mỗi ảnh ≤ 10 MB, lưu qua `IFileStorage`, trả danh sách `{id, key, url}`; hỗ trợ **thêm/xóa khi sửa** mà vẫn trong 1-3; lỗi 400 trường `Photos` bằng tiếng Việt qua catalog thông báo hiện có.
3. **Demo seed đơn mua đã chấp nhận:** bổ sung vào `DemoPurchaseRequestStep` (hoặc bước demo kế) **một yêu cầu mua đã chấp nhận**, còn mở thu hoạch, gắn một bè demo có làn đang nuôi, đủ điều kiện nhận lô thu hoạch mới để chủ test; không giả mạo bằng cách sửa luật, chỉ tạo dữ liệu hợp lệ (đủ kế hoạch ca và duyệt nhân viên nếu luật yêu cầu: dùng đường tạo dữ liệu mà service đã chấp nhận). Idempotent (seed lặp không nhân đôi).
4. Seed không được làm tồn kho demo âm.

## Files
Sửa: `Application/Features/...` (dịch vụ ảnh), `DependencyInjection`, `Infrastructure/Bootstrap/Demo/DemoPurchaseRequestStep.cs`. Mới: `StepPhotoService`, test.

## Steps
1. Đọc các dịch vụ ảnh hiện có để tái sử dụng khuôn (ảnh bè, ảnh lô thu).
2. Viết `StepPhotoService` + DI + test lớp mới (đơn vị: kiểm tra 0, 1, 3, 4 ảnh, sai kiểu, quá cỡ).
3. Thêm seed yêu cầu mua đã chấp nhận, kiểm tra bằng GET `/api/purchase-requests` và ghi lô thu thử qua API (hoặc test in-memory).
4. Ghi tài liệu ngắn trong `docs/operations-reference.md` (backend): ảnh local, đổi cloud sau.

## Todo
- [ ] StepPhotoService + test
- [ ] Seed đơn mua đã chấp nhận (idempotent)
- [ ] Ghi chú cấu hình storage

## Thành công
- Gọi dịch vụ với 0 hoặc 4 ảnh bị 400 `Photos`; 1-3 ảnh lưu được và đọc lại qua URL.
- Trên backend demo có ít nhất một yêu cầu mua đã chấp nhận để ghi nhận thu hoạch.

## Rủi ro
Luật chấp nhận đơn của đồng đội cần nhân viên duyệt ca: tạo dữ liệu qua service để khỏi sai luật; nếu quá phức tạp, ghi rõ giả định và hỏi chủ trước khi sửa luật.

## Kiểm tra gọn
Một container test 3 GB, chỉ lớp mới; không SQL Server.
