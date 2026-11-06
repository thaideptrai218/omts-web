# Điểm vào bắt đầu chu kỳ

- Bỏ các nút Mở chu kỳ · mã bè rải trên màn chưa chọn bè; thao tác bắt đầu chu kỳ chỉ xuất hiện sau khi chọn bè đủ điều kiện.
- Nhãn nút ghi rõ Bắt đầu chu kỳ nuôi cho bè [mã]. Không thay đổi điều kiện canStart, quyền Create hoặc API.
- Các khoản 2.000 đồng thanh toán và 1.000 đồng hoàn tiền có nguồn từ scripts/prepare-meeting-purchasing-demo.mjs, dữ liệu thử đã lưu qua API cho buổi họp. Frontend lấy amount từ API, không hard-code các giá trị này. Không sửa/xóa lịch sử giao dịch trong lượt này.
- Regression chọn bè/tiến độ: đạt. Không commit/push.
