---
title: Employees on nursery/seeding/harvest records + zone-level work assignments
status: proposed (chờ user chốt tên bảng mục 3)
branches: BE `feature/OMTS-227-record-employees`, FE `feature/OMTS-227-record-employees` (từ develop, PR riêng)
---

# Mục tiêu
Ghi ươm / thả giống / thu hoạch có chọn nhân viên làm. Lưu xong thì **tự tạo phân công** (WorkAssignments). Chấm công vẫn làm tay.
Phân công không còn bắt buộc bè: cho phép gắn **vùng** (ươm không có bè) và thêm loại việc **Ươm**.

# Quyết định đã chốt (user 17/11/2026)
1. `WorkAssignments.RaftId` thành optional; thêm `ZoneId` (bắt buộc, lấy từ bè nếu có bè).
2. Thêm loại việc **Ươm** vào catalog JobTypes (cùng Thu hoạch, Treo giống).
3. Tên bảng theo "bản ghi", không dùng "Crew" (đề xuất, chờ xác nhận):
   `NurseryRecordEmployees`, `SeedingRecordEmployees`, `HarvestRecordEmployees` (đổi tên `HarvestLotCrew`).
   Mỗi bảng: khóa chính (RecordId, EmployeeId), không cột khác. Tùy chọn, chỉ ghi lại.
4. Lưu bản ghi có nhân viên -> tự tạo phân công: ươm = vùng + việc Ươm; thả giống = bè + Treo giống; thu hoạch = bè + Thu hoạch.
5. Chấm công không tự động.
6. Báo PM sửa SRS: `docs/decisions/WORK_ASSIGNMENT_ZONE_AND_RECORD_EMPLOYEES_2026-11-17.md`.

# Phases
| # | Việc | Repo | Trạng thái |
|---|------|------|-----------|
| P1 | Mô hình phân công: RaftId nullable + ZoneId, job type Ươm, migration, sửa AssignWork/Edit/Query/Payroll/Attendance (30 file dùng WorkAssignment, ~48 chỗ RaftId) | BE | todo |
| P2 | 3 bảng nhân viên theo bản ghi + service đọc/ghi giống HarvestCrewService + tự tạo phân công cùng giao dịch hoặc sau lưu (xem rủi ro) | BE | todo |
| P3 | Web: ô chọn nhân viên ở form ươm, thả giống (thu hoạch đã có); màn phân công hiện vùng khi không có bè; BFF allow-list | FE | todo |
| P4 | Docs: SRS_DEVIATIONS (BE), note PM (FE), contract addendum | both | note PM đã viết |

# Rủi ro
- Lương: BR-LABOR-07 chia chi phí theo bè. Phân công chỉ có vùng thì chi phí tính vào vùng (cần PM chốt hiển thị "chưa gắn bè").
- Điểm danh: `crew-start` và QR đang theo bè; cần biến thể theo vùng cho ươm.
- Phân công chỉ cho hôm nay trở đi; ghi bù ngày cũ thì không tạo phân công (báo rõ, không chặn lưu).
- Nhân viên đang ở bè khác cùng ngày: cần xác nhận chuyển (moveExisting), không tự chuyển.
- Migration cần .NET 8 SDK (máy chỉ có SDK 10) -> tạo qua Docker `mcr.microsoft.com/dotnet/sdk:8.0`.
- Đổi tên HarvestLotCrew là migration RenameTable trên DB đã có dữ liệu.

# Câu hỏi mở
1. Xác nhận tên bảng mục 3 (và đổi tên bảng thu hoạch cũ).
2. Tạo phân công trong cùng giao dịch với bản ghi (tất cả hoặc không) hay sau khi lưu (bản ghi vẫn lưu nếu phân công lỗi)?
3. Chi phí nhân công của việc Ươm hiển thị theo vùng thế nào?
