# Hoàn thiện nhật ký thăm bè và nhúng VietMap

## Nhật ký thăm bè

- Trong hồ sơ chu kỳ → tiến trình theo ngày → nhật ký thăm bè: thêm thao tác ghi mới, điều chỉnh và gỡ.
- Ghi mới gồm ngày thăm, ghi chú và 1–10 ảnh JPEG/PNG, tối đa 10 MB/ảnh; gửi cùng dữ liệu multipart.
- Điều chỉnh giữ/bỏ ảnh đã có và thêm ảnh mới, luôn giữ tổng 1–10 ảnh, yêu cầu lý do 1–1.000 ký tự. Ghi chú tối đa 2.000 ký tự.
- Gỡ dùng lý do, xác nhận trước và quyền Edit như `CultivationLogViews.MayCorrect` của backend. Không suy quyền Delete cho thao tác mà controller/service đang dùng Edit.
- Quyền riêng `CULTIVATION_LOGS Create/Edit/View`; cờ canCorrect quyết định thao tác trên bản ghi, backend kiểm vùng/người ghi/trạng thái chu kỳ.
- Contract không nhận rowVersion khi sửa/gỡ: gửi đúng last-save-wins hiện tại, nêu rõ trong xác nhận lưu điều chỉnh. Không tự thêm khóa phiên bản.
- Nháp/tệp giữ trong bộ nhớ khi lỗi; ghi chưa rõ kết quả khóa gửi lại, có đọc nhật ký hiện tại để đối chiếu.
- Ảnh trong kết quả lưu cũng được thay bằng URL BFF có kiểm phiên/quyền, như danh sách hiện hữu.

## VietMap Web

- Cài chính xác `@vietmap/vietmap-gl-js` 6.0.1 như Mobile ref `origin/feature/acs-zalo-linking`; không chép cấu hình/key của Mobile.
- Màn Vị trí vùng và bè hiện có nay thêm bản đồ nhúng, giữ danh sách/tìm kiếm/toạ độ/liên kết vị trí hiện hữu.
- Tọa độ `[longitude, latitude]`, chỉ dùng dữ liệu API hợp lệ; null không biến thành 0. Marker vùng/bè, tự khớp khung nhìn và cập nhật kích thước khi dialog đổi kích thước.
- Marker chọn hồ sơ; liên kết `/workspace/zones?recordId=...` hoặc `/workspace/rafts?recordId=...` đọc chi tiết thật và kiểm quyền. Hồ sơ bè từ liên kết đồng bộ vùng với bản ghi, không lấy nhầm vùng đầu danh sách.
- SDK chỉ tải phía client khi mở bản đồ; có trạng thái tải/chậm/lỗi quyền/quota, thử lại, không đưa URL chứa key vào thông báo.
- Style vệ tinh lai `hm`, cùng Mobile. Tham chiếu [SDK chính thức](https://maps.vietmap.vn/docs/sdk-web-gl/overview/) và [style VietMap](https://maps.vietmap.vn/docs/map-api/tilemap/).

## Cấu hình để bật nền bản đồ

Thêm vào môi trường Web, dùng key public dành riêng cho browser:

```dotenv
NEXT_PUBLIC_VIETMAP_API_KEY=<browser-map-key>
```

Với Next.js, cấu hình biến này trước build; build lại và khởi động lại Web sau khi đổi. Vercel cần cấu hình tại project/environment tương ứng rồi redeploy. Giới hạn domain/referrer và hạn mức tại VietMap; không đặt server credential vào biến public. `.env.example` đã có tên biến và hướng dẫn.

Đã kiểm tra sự hiện diện biến (không in giá trị): `.env.local` và `.env.api.local` hiện chưa có key. Vì thế UI local hiện fallback danh sách; chưa xác nhận tải tile/marker thực tế.

## Kiểm tra và phần còn lại

- TypeScript và ESLint các phần thay đổi đạt.
- Chưa browser/CRUD live và chưa xác nhận map tải thành công do thiếu key; không đổi backend/runtime/DB.
- Nhánh backend cần API logs `OMTS-220-logs` trên runtime integration. Map dùng `/api/zone-map` hiện hữu, không tạo endpoint backend mới.
- Bản đồ hiện mô tả tọa độ vùng/bè từ API. API map chưa trả hình học làn/trạng thái thu hoạch theo marker; không tự bịa vị trí làn hoặc số liệu cảnh báo.
- Mock local chưa dùng màn API bản đồ này; không tạo dữ liệu giả để thể hiện như API production.
- Không commit/push/merge.
