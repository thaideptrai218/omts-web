# Rà soát backend mới và khoảng màn hình Web

Ngày: 04/11/2026  
Backend: `thaideptrai218/omts-backend`  
Web: `feature/OMTS-132-web-foundation`

## Kết quả cập nhật

Đã fetch toàn bộ remote branch. `origin/develop` đã lên `dec1de2` với PR #21 về fixed roles và ma trận quyền SRS 27/10. Các nhánh tính năng mới vẫn chưa nằm trên develop gồm:

- `feature/OMTS-220-cycles`: chu kỳ nuôi, tiến độ và trạng thái làn; thêm chứng nhận HTX, mã bè/làn trong ngày.
- `feature/OMTS-220-logs`: nhật ký chăm sóc theo chu kỳ, đọc/ghi/sửa/gỡ nhật ký và tệp ảnh.
- `feature/OMTS-219-water-model` và `feature/OMTS-219-water-correction`: mô hình phép đo nước, hiệu chỉnh/hủy và các quy tắc cảnh báo mới.
- `feature/OMTS-216-audit-search`: tìm kiếm nhật ký hệ thống, facets, chi tiết sự kiện và bản ghi liên quan.
- `feature/OMTS-217-rafts-v2`: mã bè tiếp theo, làn trong ngày, nhiều ảnh và resume.
- `feature/OMTS-218-payments-debts` / `feature/OMTS-218-returns`: công nợ, thanh toán, hoàn trả và cập nhật danh mục mua hàng.
- `feature/OMTS-216-account-rules`: quy tắc tài khoản, liên hệ tùy chọn, mã xác minh và mật khẩu tạm.

## Endpoint tạo khoảng trống màn Web

Các controller mới cần chuẩn bị sau khi backend chốt merge/contract:

- Chu kỳ nuôi: `GET/POST /api/zones/{zoneId}/cultivation-cycles`, `GET /api/rafts/{raftId}/cultivation-cycles`, `GET /api/rafts/{raftId}/progress`, `GET/PUT /api/cultivation-cycles/{cycleId}`, `POST .../cancel`.
- Nhật ký nuôi: `GET/POST /api/cultivation-cycles/{cycleId}/cultivation-logs`, `GET/PUT /api/cultivation-logs/{logId}`, `POST .../remove`.
- Nhật ký hệ thống: `GET /api/audit-events`, `/facets`, `/{id}`, `/{id}/record`.
- Chứng nhận HTX và hồ sơ/giấy phép mở rộng: cần bổ sung màn quản lý chứng nhận và phần tệp/giấy phép nếu contract được merge.
- Bè v2: màn quản lý ảnh, mã tiếp theo và tình trạng làn trong ngày.

## Thứ tự làm Web

1. Cập nhật contract/permission map theo `origin/develop@dec1de2` và PR backend đã merge.
2. Làm màn chu kỳ nuôi và tiến độ làn; chỉ mở thao tác khi endpoint và quyền đã có trên develop.
3. Làm nhật ký chăm sóc theo chu kỳ, sau đó màn nhật ký hệ thống cho Admin/Owner theo scope backend.
4. Đồng bộ water/rafts/purchasing khi các nhánh tương ứng được hợp nhất; không tự nối branch chưa merge vào API runtime.

Hiện frontend chưa tạo màn cho chu kỳ nuôi, nhật ký chăm sóc, nhật ký hệ thống và quản lý chứng nhận. Không tính chúng là đã hoàn thiện chỉ vì branch backend đã có mã.
