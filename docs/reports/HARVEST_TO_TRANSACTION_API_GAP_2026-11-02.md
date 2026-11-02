# API từ thu hoạch đến giao dịch — rà soát 02/11/2026

Người dùng đã chốt trong chat: **chỉ nối API đã có, chờ nhóm backend bổ sung**. Không triển khai backend mới hoặc màn mock thay cho nghiệp vụ thiếu API.

Đã fetch toàn bộ remote và pull --ff-only. `develop` vẫn953f597; nhánh tích hợp vẫn946df70. Kiểm cây controller của22remote refs, không chỉ nhánh develop. Có entity lịch sử ở một số nhánh nhưng không có controller tương ứng, nên không tính entity thành API chạy được.

| Công đoạn | API tìm được | Tester hiện có thể làm |
|---|---|---|
| Sản phẩm bán | `/api/products` | Owner quản lý, Trader xem sản phẩm đang dùng |
| Gửi yêu cầu mua số lồng | `/api/me/purchase-requests` | Trader gửi và xem yêu cầu của mình |
| Owner phản hồi yêu cầu | `/api/purchase-requests/{id}/response` | Chấp nhận số lồng/ngày nhận/trả sau hoặc từ chối có lý do |
| Hủy yêu cầu | API cá nhân purchase requests | Trader hủy trạng thái cho phép, xem kết quả đã lưu |
| Ghi nhận/hoàn tất thu hoạch, lô | Chưa có controller/API nghiệp vụ | Chờ backend |
| Cân, giao/nhận hàng | Chưa có controller/API nghiệp vụ | Chờ backend |
| Giao dịch/hóa đơn bán, sửa/hủy/xuất | Chưa có controller/API nghiệp vụ | Chờ backend |
| Khách hàng thanh toán, công nợ/hoàn tiền | Chưa có controller/API nghiệp vụ | Chờ backend |
| Truy xuất/công bố gắn lô đã thu hoạch | Chưa có API hoàn chỉnh trong snapshot tích hợp | Chờ backend; không coi trang/permission/entity là luồng thật |

Luồng yêu cầu mua hiện tại **không** tạo giữ kho, giá, hóa đơn hay khoản thanh toán. Không thể nghiệm thu chuỗi thu hoạch→giao dịch bằng việc Owner chấp nhận một yêu cầu mua.

## Những nhánh mới

- PR27 / `feature/OMTS-218-purchase-receipts` /708c1cc: phiếu nhập v2, không gắn vùng ở đầu phiếu, bè theo từng dòng, mã PN, tổng tiền đến đồng; bỏ chiết khấu/trả ngay/ảnh hóa đơn; thêm xóa Draft, cancel-preview, Owner correct và GET copy. Migration lossy; payment/return P3/P4 vẫn làm tròn nghìn. Khác luồng đã duyệt trước, chưa tự áp hoặc chuyển DB QA.
- PR28 / `feature/OMTS-217-zones-licenses` /66284c4, xếp trên PR24: vùng/giấy phép/certification thay contract; một vùng mỗi giấy phép, bỏ Missing và loại giấy bắt buộc, đổi quy tắc nhắc hạn. Chưa tự áp vì thay điều kiện/validation và phạm vi đã chốt.
- PR24 hồ sơ HTX/certifications và PR26 audit-search là các API ngoài chuỗi thu hoạch→giao dịch. Đã nhận diện để đối chiếu riêng.

## Hồ sơ nhân viên của Manager

`EmployeesController` vẫn `[RequireCooperativeOwner]` ở cấp controller trong backend hiện có. Matrix fixed roles đã có LABOR_WORKERS, nhưng chưa có thực thi scope trên employee search/detail/create/update. Web giữ gate của endpoint, tránh mở nút rồi403 hoặc mở dữ liệu ngoài vùng. Theo lựa chọn chỉ nối API có thật, phần này chờ nhóm backend hoàn thiện quyền/scope trước khi mở Web cho Manager.

## Điều kiện để nghiệm thu chuỗi đầy đủ

Nhóm backend cần cung cấp controller/DTO/validation/trạng thái/permission và test dữ liệu cho các công đoạn còn thiếu. Web sẽ nối theo contract thật và quyết định đã chốt; không tự đặt route giả hoặc chuyển trạng thái kinh doanh bằng mock. Đây là báo cáo thiếu API, không phải cam kết những UC trên đã hoàn thành.
