# Đợt tích hợp thả giống, vật tư và thu hoạch

## Màn và thao tác đã nối

| Route chế độ API | Phạm vi đã triển khai | Contract tham chiếu |
| --- | --- | --- |
| `/operations/seeding` | Chọn vùng/bè, xem chu kỳ gần nhất, danh sách lần thả, tổng giống theo lô, ghi mới, điều chỉnh có lý do/rowVersion, gỡ có lý do, preview và đánh dấu hoàn tất | `origin/feature/OMTS-220-seeding` |
| `/operations/material-usages` | Lịch sử theo chu kỳ/ngoài chu kỳ, nội dung sửa chữa, ghi nhiều dòng vật tư, điều chỉnh một bản ghi có lý do/rowVersion | `origin/feature/OMTS-220-materials` |
| `/operations/harvest` | Danh sách lô của chu kỳ đang mở, số lồng/kg ước tính/đã lập hóa đơn/còn lại, ghi chuyến thu hoạch, chọn làn và làn đã thu hết, gửi tối đa 10 ảnh JPEG/PNG cùng dữ liệu | `origin/feature/OMTS-221-harvest-lots` |
| Thiết lập thu hoạch trong màn Thu hoạch | Owner xem/sửa kg mỗi lồng và thời hạn tự đóng; gọi preview trước xác nhận, nêu số lô bị ảnh hưởng khi giảm ngày | `origin/feature/OMTS-221-harvest-lots` |

Menu Nuôi trồng và BFF cùng dùng quyền `CULTIVATION_CYCLES` hoặc `HARVESTS`, scope vùng hiệu lực. Backend tiếp tục kiểm quyền đối với ID thực tế. Cờ canRecord/canCorrect/canMarkComplete/canEdit/canRecordHarvest quyết định thao tác hiển thị theo trạng thái.

Tái sử dụng repository, session gateway, CSRF, bounded upload, xác nhận thao tác và bảo vệ bản nháp. Harvest dùng multipart theo controller; JSON adapter cũng chuyển array thành nhiều field, không nối làn bằng dấu phẩy. Tệp không đưa vào localStorage/Redis.

Sửa nhận diện `MSG-GEN-06` trong mutation guard dùng chung, bên cạnh `MSG06`: xung đột hoặc ghi chưa rõ kết quả khóa gửi lại, không tự replay.

## Kiểm tra và giới hạn

- `npx tsc --noEmit`: đạt.
- ESLint các feature cultivation và các BFF/permission/UI bị ảnh hưởng: đạt.
- Không chạy test sâu/browser/CRUD live trong đợt này theo yêu cầu tiết kiệm thời gian trước đó; chưa coi các luồng đã nghiệm thu API thực tế.
- Chưa ghép các feature branch backend hoặc thay runtime/DB. Chạy backend develop hiện tại riêng sẽ chưa có các controller nuôi trồng này.
- Bộ chọn bè hiện tái sử dụng API danh sách chu kỳ theo vùng. Actor cần quyền View chu kỳ tương ứng; cần kiểm lại với projection thực tế trên runtime integration.
- Không có nghiệp vụ kho nhập/xuất/tồn trong contract material-usage đã đọc: màn ghi nhận sử dụng không khẳng định là quản lý tồn kho.

## Còn lại trong nhóm này

- Sửa/gỡ lô thu hoạch, giữ/bỏ ảnh cũ và xem chi tiết lô theo contract `OMTS-221-harvest-corrections`.
- Xem tiến trình làn theo ngày và lịch sử chi tiết làn.
- Kết thúc chu kỳ: cần đối chiếu endpoint trên các nhánh mới, controller cycles đã đọc chưa có lệnh này.
- Điều chỉnh sử dụng vật tư sang bè khác: backend hỗ trợ, form hiện sửa trên bè đang chọn.
- Các nhóm sau: bán hàng/hóa đơn, thanh toán/công nợ, trả hàng, nhật ký; bản đồ đồng bộ Zalo Mini App, truy xuất và báo cáo theo backlog.

Không commit/push/merge trong đợt này.
