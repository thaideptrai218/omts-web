# Backend và màn Web còn thiếu — 09/11/2026

Backend develop đã pull fast-forward 559640dc → 629e481d, working tree sạch. Fetch các remote branch. Không cập nhật container/migration/DB.

## API mới so với lần fetch ce151375

- #62: sản lượng theo bè/vùng/chu kỳ và xuất file.
- #63–64: công bố nguồn gốc, truy xuất lô ngược/xuôi và xuất file.
- #66: công nợ khách và sao kê; Web đã nối phần đọc, chưa xác minh dữ liệu thật vì runtime8082 trước đó404.
- #67: ghi nhận, xác nhận, hủy khoản thanh toán khách.
- #68: liên kết Zalo Mini App, vị trí Zalo và Owner duyệt thương lái.
- Branch origin-page 55533487: trang nguồn gốc công khai Việt/Anh, ảnh có URL một giờ; chưa vào develop.
- Branch trace-withdraw 2143bcaa: rút công bố và thông báo thương lái; chưa vào develop.
- Branch cors-zalo-mini-app 6f8adff5: thêm quản lý duyệt kế hoạch ngày; luồng số lồng/phân công vẫn riêng, chưa thay bằng kg/direct accept của develop.

## Ưu tiên màn cần làm/hoàn thiện

1. Thanh toán khách: danh sách khoản thu, ghi nhận/chi trả lại, xác nhận/hủy, chờ xác nhận. Có API develop, chưa nối đầy đủ.
2. Bán hàng: lập/hoàn tất/gửi lại hóa đơn và trạng thái gửi. Web hiện mới có dialog đọc hóa đơn từ công nợ. Chưa có endpoint danh sách hóa đơn trong controller đã đọc; không suy có list từ GET chi tiết.
3. Truy xuất lô, công bố nguồn gốc, hiệu chỉnh có lý do/Owner duyệt: có API develop, chưa có luồng Web hoàn chỉnh.
4. Báo cáo sản lượng: có API mới, cần màn lọc/tổng hợp/xuất.
5. Trang nguồn gốc công khai và rút công bố: nối sau khi chốt contract branch và quyền/dữ liệu công khai.
6. Đồng bộ duyệt thương lái #68; Web có màn cũ nhưng cần đối chiếu contract mới. Liên kết Zalo cần xác định ranh giới Web/Mini App trước.
7. Rà soát đóng lô, thiết lập thu hoạch, cấu hình nhân công so với develop mới; đã có màn/phần chức năng, không coi hoàn tất chỉ vì có source.
8. Backend local8082 chưa cập nhật: nguồn code có API không đồng nghĩa runtime chạy được. Cần tích hợp có kiểm soát để giữ luồng số lồng đã duyệt, tránh thay runtime trực tiếp làm mất luồng.

## CI Web

PR3 check CI run42184193418 thất bại hai assertion ngày: UI dd/MM/yyyy nhưng test kỳ vọng ISO. Sửa expectation, giữ dữ liệu ISO ở contract. GitGuardian riêng vẫn fail; finding lịch sử chủ repo đã nhận xử lý, không bỏ/bypass check.
