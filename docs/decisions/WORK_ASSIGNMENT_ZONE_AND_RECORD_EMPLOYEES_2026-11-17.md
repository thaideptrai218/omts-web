# Ghi chú cho PM: phân công theo vùng và nhân viên trên bản ghi (17/11/2026)

Người quyết định: user (Duy Thái). Trạng thái: **chờ PM cập nhật SRS** (chưa sửa SRS).

## SRS hiện tại (Report3_v8)
- LABOR-02 / BR-LABOR-03: một phân công = nhân viên + **bè** + loại việc + ngày. Bè bắt buộc.
- BR-LABOR-07: chi phí nhân công chia theo bè.
- HARVEST-01, CYCLE-02 (thả giống) và ươm: không có nhân viên tham gia. SRS v8 không có use case ươm.

## Thay đổi đề xuất
1. Phân công: bè **tùy chọn**, thêm **vùng**; ươm chỉ cần chọn vùng.
2. Thêm loại việc **Ươm**.
3. Ghi ươm, thả giống, thu hoạch có thể chọn nhân viên làm (tùy chọn); lưu xong tự tạo phân công. Chấm công vẫn thủ công.
4. Mỗi bản ghi lưu danh sách nhân viên bằng bảng riêng theo bản ghi.

## SRS cần sửa (đề nghị)
- LABOR-02, BR-LABOR-03 (bè tùy chọn, có vùng), BR-LABOR-07 (chi phí khi không có bè), LABOR-04 (điểm danh theo vùng).
- Entity WorkAssignment (thêm Zone, Raft nullable).
- Use case ươm và nhân viên trên bản ghi ươm, thả giống, thu hoạch (tổ thu hoạch hiện chỉ ở SRS_DEVIATIONS của backend).
- Danh mục loại việc: thêm Ươm.

Kế hoạch: `plans/261117-1534-OMTS-227-record-employees-and-zone-assignments/plan.md`.
