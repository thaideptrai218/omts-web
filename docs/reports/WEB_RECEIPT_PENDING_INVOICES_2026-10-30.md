# Hoàn thiện màn phiếu nhập — giữ tệp qua Lưu nháp

Ngày30/10/2026. QA3003/backend8081/RedisDB3; không merge hoặc ghi nghiệp vụ8080. Backend fetch vẫn develop953f597 và Zalo dc00b2f, không có API nghiệp vụ mới để mở thêm module.

## Lỗi và thay đổi

Tái hiện Manager1 trên phiếu QA032không hàng/không tiền: chọn PNG, sửa ghi chú, Lưu nháp thành công; thông tin được lưu nhưng editor remount làm mất các File đang chờ. Nút Tải hóa đơn lên trở về disabled. Không upload tệp trong ca tái hiện.

Giữ danh sách File ở mức màn trong lần thay editor sau Save, gắn với đúng receiptId. Editor mới nhận lại các tệp chỉ khi ID khớp. Save nháp không tự upload; upload thành công xóa lựa chọn và dùng phiên bản mới. Đóng có xác nhận xóa cả vùng giữ tệp của màn; mở lại phiếu không mang lựa chọn cũ sang. Unknown/error giữ tệp trong editor đang bị chặn, GET không tự replay.

Màn hiển thị tên/số tệp chưa upload và nêu rõ Lưu nháp không lưu tệp lên server, reload mất lựa chọn. Bỏ chọn có xác nhận; Quay lại giữ tệp, Đồng ý xóa lựa chọn và reset file input. Không dùng localStorage/Redis cho tệp, không thay quyền/endpoint/file validation.

Người dùng đã duyệt [điều kiện hoàn thành/hủy](../decisions/WEB_RECEIPT_PENDING_INVOICES_PROPOSAL_2026-10-30.md): phải tải lên hoặc bỏ chọn tệp chờ trước khi chuyển trạng thái. Guard áp dụng Lưu và hoàn thành, Hoàn thành phiếu đã lưu, Hủy phiếu và form hủy đã mở trước khi chọn tệp. Có thông báo lý do/aria-describedby; Save nháp vẫn được phép. Không tự upload hoặc gộp hai endpoint. Xác nhận nhận trước khi thêm guard theo AGENTS.md; không đổi validation file/backend.

## Kiểm tra

Thêm6test tích hợp: giữ đúng File qua Save/editor remount và chỉ upload khi bấm riêng; đóng/bỏ rồi mở lại sạch lựa chọn; explicit Bỏ chọn reset input; upload unknown giữ tệp/GETkhôngbỏchặn; tất cả nút chuyển trạng thái bị chặn đến khi bỏ chọn/upload; form hủy mở trước vẫn chặn và giữ lý do sau bỏ chọn. Trước sửa3test đầu fail đúng mất tệp; sau thêm guard được duyệt, nhóm operations/action-dialog5files32PASS, lint/typecheck/build41routes và61built-product assertions PASS. Bản build cuối bao gồm guard đã duyệt; bản build giữ tệp trước đó không được gộp làm bằng chứng guard.

## Browser QA bản cuối

- Manager1 mở032, chọn PNG QA trước khi sửa metadata; thêm1đôi găng tay giá1.000, ghi chú rồi Save nháp. Editor mới giữ tên tệp và nút upload enabled; cả Lưu và hoàn thành/Hoàn thành phiếu đã lưu/Hủy disabled. Save nháp lần nữa vẫn giữ tệp, không tự upload.
- Bỏ chọn→Quay lại giữ tên tệp; Đồng ý bỏ chọn xóa panel và mở lại các nút chuyển trạng thái. Chọn lại rồi Save giữ được tệp lần nữa.
- Bấm Upload riêng: thành công, tệp chờ được xóa, link hóa đơn xuất hiện, completion/cancel enabled. Download nhận76.301bytes có SHA256 trùng PNG nguồn, chứng minh đúng File đã được giữ qua Save. Tên gợi ý download trong IAB là.jpg; chỉ nhận bằng chứng byte, không suy MIME live từ đuôi file của công cụ.
- Hoàn thành phiếu đã lưu → xác nhận → Completed; sau đó hủy có lý do → Cancelled, hóa đơn vẫn xem/tải được. Phiếu032giữ1dòng1.000và1hóađơn/audit. Chi tiết receipt giữ số liệu riêng1.000 theo API; không gọi đây là công nợ tổng hợp.
- Kế toán đọc supplier QA Manager2 sau hủy: tổng phải trả3.000/đã trả1.000/còn nợ2.000, chỉ PR029.032đã bị loại khỏi công nợ; baseline supplier không tăng sau cleanup. Không ghi thanh toán.
- Không sửa credential/contact/grants seed hay DB8080; các phiên cuối logout, console cuối không có error/warn. Để tab QA đăng nhập cho tester, reset viewport override.

## Responsive và ảnh

Tạo tab IAB hiển thị qua API documented, xác nhận browser selected18 trùng tab kiểm. Cap width360 ban đầu cho CSS240 do scale1.5; chỉnh theo đo thực tế, không coi240là360.

| CSS viewport đo từ DOM | Dialog client/scroll | Panel tệp client/scroll |
| --- | --- | --- |
| 360 | 339/339 | 298/298 |
| 1024 | 971/971 | 922/922 |

Không tràn ngang tại hai kích thước; dialog bỏ chọn và Quay lại giữ tệp đã chạy ở cả hai. Ảnh screenshot bridge bị scale nhỏ trong khung nên kích thước CSS chỉ lấy từ DOM, không suy từ pixels ảnh. Outputs: `qa-invoices-retained-360.png`, `qa-invoices-retained-1024.png`, `qa-invoices-flow-cancelled.png`. Các ca unknown/error trong6tests là fixture, không nhận đã tạo mất phản hồi thật sau upload trên browser.
