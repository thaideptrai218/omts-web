# Hồ sơ, điều chỉnh lô thu hoạch và tiến trình làn

## Đã nối

- Bấm mã lô tại `/operations/harvest` để mở hồ sơ bằng `GET /api/harvest-lots/{id}`.
- Hiển thị bè/vùng, người ghi nhận, thời điểm, kg/lồng và các số liệu backend: kg hóa đơn, trả lại, đã bán, còn lại, hao hụt, chênh lệch; nêu số liệu chưa chốt khi lô còn bán.
- Điều chỉnh làn, làn đã thu hết, số lồng, kg ước tính, ảnh giữ lại/ảnh mới, lý do và rowVersion qua multipart PUT.
- Gỡ lô có lý do qua POST remove; cờ canCorrect/canRemove và quyền Edit/Delete kiểm soát hành động. Backend kiểm điều kiện chu kỳ/hoá đơn.
- Mở ảnh qua BFF theo phiên và quyền View, đọc lại hồ sơ để lấy chữ ký hiện hành rồi proxy tệp cùng backend origin. Không đưa signed URL nội bộ trực tiếp cho trình duyệt. Adapter tệp hiện hỗ trợ local-file provider như các màn giấy tờ hiện hữu.
- Giữ nháp khi lỗi; sau xung đột hoặc ghi chưa rõ kết quả có nút đọc hồ sơ hiện tại để đối chiếu, không tự gửi lại hay tự thay rowVersion.
- Trong hồ sơ chu kỳ: tiến trình làn theo ngày bằng `GET /api/rafts/{id}/progress?date=...`; chọn làn để xem các lần thả giống trong đúng cycleId đã chọn.
- Số lượng giống được trình bày là số lượng cả lần thả, không phân bổ giả thành số lượng từng làn.

## Contract và kiểm tra

- Điều chỉnh/gỡ: `origin/feature/OMTS-221-harvest-corrections`.
- Tiến trình bè/làn: `origin/feature/OMTS-220-seeding` và controller cycles.
- Rà soát cây controller của toàn bộ remote origin hiện có: chưa thấy SalesInvoice/CustomerPayment/SalesReturn controller để nối chuỗi bán hàng tiếp theo. Đây là kết quả trên refs local hiện có, không phải fetch mới từ GitHub trong đợt này.
- TypeScript và ESLint phần thay đổi đạt. Chưa chạy browser/CRUD live theo yêu cầu không test sâu; không thay backend runtime/DB hoặc merge các feature branch.
- Chưa commit/push.

## Tiếp theo

- API kết thúc chu kỳ, bán hàng/hóa đơn và thanh toán khách cần contract thực tế trước khi triển khai thao tác.
- Tiếp tục các nhóm độc lập trong backlog: nhật ký, loại công việc, bản đồ đồng bộ Mobile/Zalo và khách hàng/gộp hồ sơ theo phạm vi đã chốt.
