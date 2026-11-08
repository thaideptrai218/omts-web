# Bấm dòng để xem hồ sơ — 08/11/2026

## Thay đổi

- Sử dụng vật tư: bấm bất kỳ ô dữ liệu nào để mở/thu thông tin ngay dưới dòng; bỏ cột Thao tác và nút Xem bản ghi. Mã vật tư là nút bàn phím. Chi tiết gồm ngày, bè, số lượng, nội dung sửa chữa, người/thời điểm ghi nhận; chỉnh sửa dùng form cũ theo canEdit/quyền Edit.
- Thả giống: tương tự, bỏ cột thao tác; xem lô giống, phiếu nhập, nhà cung cấp, làn, số lượng cả lần thả và người/thời điểm ghi nhận. Bản ghi khóa giải thích chỉ xem; thao tác chỉnh sửa/xóa vẫn dùng form cũ và quyền hiện hành.
- Các bảng danh mục API, nhân viên thời vụ, sản phẩm, yêu cầu mua, phép đo nước, lịch sử giao dịch NCC cũng nhận bấm dòng để mở hồ sơ hiện hữu. Những màn này giữ kiểu detail/editor hiện có; không tuyên bố tất cả đã đổi thành inline.
- Giữ nút/link thật trong dòng cho bàn phím và trình đọc màn hình. Thành phần OpenableTableRow chỉ bổ sung thao tác chuột/chạm, không thay native table bằng button.
- Không mở dòng khi bấm button/link/checkbox/input/select/label/details hoặc khi đang bôi đen văn bản trong dòng; không mở lúc đang đọc hồ sơ. Nút con chỉ thực hiện hành động của chính nó.
- Không đổi API, CRUD, routing, schema, phép tính, dữ liệu hoặc quyền. Xem không gửi thao tác ghi.

## Xác minh

13 targeted tests PASS: click row, tránh double-open với nút con/checkbox/link, giữ chọn văn bản, pending; vật tư mở inline không dialog/không write/không lộ sửa khi khóa; các regression directory và yêu cầu mua/workforce.
Browser Owner localhost3002/API8082: bấm nội dung Dây neo bị đứt mở đúng VT005 B1-01, số lượng2cái, người/thời điểm ghi nhận; không dialog. Bấm ô3.000con mở đúng lần thả02/10/2026, lôPN000001-1, các làn1,2,3. Không sửa dữ liệu thật.
CSS360: chi tiết vật tư/thả giống có mặt, scrollWidth360; CSS1024 trang không tràn. Ảnh `.hallmark/material-row-detail-20261108.jpg`; công cụ screenshot desktop vẫn có lỗi scale/crop đã ghi nhận ở đợt trước.
Lint/typecheck PASS. Production build kết quả bổ sung cuối báo cáo. Không commit/push/merge.

Kết quả cuối: production build PASS (61routes). Lint/typecheck và13targeted tests PASS. Browser giữ trang Sử dụng vật tư mở chi tiết dòng VT005; không commit/push/merge.
