# Áp dụng chọn lọc wireframe — 06/11/2026

## Hướng tham khảo

Đã đọc10ảnh người dùng gửi trong `D:/Đồ_án/review-images/01_Cong-khai-va-tai-khoan_Dang-nhap-dang-ky` và `02_Thuong-lai_Don-mua-khieu-nai-cong-no`. Tham khảo cấu trúc thông tin, không xem ghi chú trong ảnh là quyết định nghiệp vụ hoặc API mới. Giữ thương hiệu HTX Trung Nam, token và shell hiện hành; không sao chép thanh menu/màu xanh/khối placeholder của wireframe.

Các pattern chọn: bộ lọc cạnh kết quả; chi tiết mở trong ngữ cảnh; tách nội dung sửa được/chỉ xem; thông tin nghiệp vụ cạnh ảnh minh chứng; hành động và trạng thái gần nội dung liên quan. Không dùng cùng một bố cục cho mọi module.

## Đã triển khai

| Màn | Áp dụng |
| --- | --- |
| Phiếu nhập API V2 | `FilterWorkspace`: rail lọc mã/ngày/trạng thái bên trái ở desktop; tổng tiền và bảng bên phải; xóa lọc. Màn nhỏ chuyển bộ lọc lên trước bảng. Giữ phân trang/API server-side. |
| Thông báo | Rail trạng thái đọc; bảng dễ đối chiếu nội dung/thời gian/đã đọc; mở chi tiết ngay dưới dòng, giữ trang và bộ lọc. Không tự đánh dấu đã đọc hoặc tự mở hồ sơ. Backend vẫn recheck quyền cho hồ sơ liên quan. URL chi tiết cũ giữ hoạt động qua component nội dung chung. |
| Tài khoản API | Nhóm Hồ sơ/Đổi mật khẩu/Thông báo. Form sửa tên và liên hệ tách khỏi phần chỉ xem/vùng-quyền; bỏ hiển thị ID nội bộ. Chuyển nhóm trong trang giữ component mounted để không mất nháp. OTP/lưu từng phần/xung đột không đổi. |
| Tùy chọn thông báo | Với catalog Push mới: hiển thị inline trong tài khoản, bảng loại thông báo–công tắc–quy tắc. Mandatory khóa theo API, không cố định theo tên actor. Giữ notice khi lưu một phần và luồng đối chiếu. Adapter catalog cũ vẫn giữ UI tương thích. |
| Lô thu hoạch | `EvidenceGallery`: ảnh chính, thumbnail chọn ảnh, mở ảnh gốc; đặt cạnh form/số liệu lô trong dialog rộng. Chỉ dùng ảnh API; giữ riêng thao tác giữ/bỏ ảnh và rowVersion. Không đưa ảnh demo mới hoặc metric giả. |

## Để sau, không tự triển khai từ ảnh

- Đơn mua/hóa đơn/khách thanh toán/sao kê thương lái: có thể dùng filter rail + mở rộng dòng chi tiết, tổng nợ và các giao dịch theo thời gian khi API tương ứng có mặt trong runtime tích hợp. Không dựng số nợ/hóa đơn/QR minh họa thành dữ liệu thật.
- Khiếu nại chất lượng: form hai cột hồ sơ hóa đơn và ảnh mô tả là tham khảo thiết kế; điều kiện gửi, số ảnh, phạm vi khiếu nại phải theo SRS/contract được duyệt.
- Truy xuất công khai: thông tin HTX + từng lô + ảnh/vị trí, trạng thái công bố/rút. Chỉ public DTO được backend cấp, không tái dùng private DTO để đưa giá/số lượng/người mua ra ngoài.
- Ảnh/file hóa đơn trong wireframe không áp vào phiếu nhập mới: quyết định purchasing V2 đã bỏ nhận tệp hóa đơn. Không mở lại upload.
- Wireframe ghi kg không ghi đè quyết định Web mua theo số lồng/luồng đã chốt. Chưa thay đơn vị hay trạng thái nào ở đợt thiết kế này.

## Kiểm tra và giới hạn

-24test liên quan đạt, bao gồm mở chi tiết thông báo không tự ghi read, giữ trang2 sau acknowledgement thông thường, giữ nháp tên khi chuyển qua tùy chọn inline và khóa loại mandatory. Lint/typecheck/build đạt sau sửa typing trong test;63assertion built session pages đạt.
- Shared layouts có quy tắc desktop/tablet/mobile; chưa xác nhận render mới ở đủ360/1024/1440px. Browser QA3002 đã chuyển `/session/recover` vì hết phiên khi thử mở tài khoản, nên chưa nghiệm thu visual batch này. Cần đăng nhập lại để so sánh trực tiếp.
- Không sửa API contract/schema/quyền; không commit/push. Không coi các màn kinh doanh/công nợ/truy xuất trong wireframe là đã tích hợp.
