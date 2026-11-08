# Tham khảo wireframe nuôi trồng — 06/11/2026

## Đã chọn lọc áp dụng

- `/farming/cycles`: chọn vùng/bè ở rail trái, tiến độ ở khung phải, không rời danh sách bè. Bảng làn đổi sang sơ đồ có trạng thái chữ+màu; chọn làn đọc đúng các lần thả giống qua API làn/chu kỳ. Bên cạnh có kế hoạch chu kỳ. Các thao tác sửa/mở/hủy chu kỳ giữ quyền và xác nhận cũ.
- `/operations/cultivation-cycles`: cùng pattern chọn bè trái và overview bên phải, dùng dữ liệu API. Muốn sửa kế hoạch/lịch sử đi vào nội dung chi tiết riêng, giữ cơ chế bảo vệ nháp. Không đổi bè trong lúc đang sửa form.
- Thả giống, vật tư, thu hoạch: rail vùng/bè+tìm mã bè thay dropdown bè đơn thuần. Thả giống/thu hoạch có sơ đồ tiến trình theo ngày, chọn làn xem lịch sử lô giống ở bên cạnh. Không dựng trạng thái từ canSeed/canHarvest; trạng thái do progress API trả. Giữ nguyên đơn vị “làn” của contract; chưa tự đổi thành dây.
- Component `LaneBoard`: chung cho tên trạng thái hoặc enum số, active state, focus bàn phím và nhãn đọc; dùng trạng thái không chỉ màu. Không chia tổng lượng giống của một lần thả cho từng làn.
- Nhật ký nuôi ở component cultivation hiện hành: mở rộng dòng xem ảnh minh chứng, ghi chú, người ghi và giờ ngay trong bảng; ảnh lớn/thumbnail dùng EvidenceGallery. Form điều chỉnh vẫn giữ lý do và validation ảnh từ contract.
- Đo nước: filter vùng/ngày/trạng thái bên trái, xu hướng API phía trên lịch sử. Chi tiết/sửa số đo: ảnh gốc+ngưỡng đã dùng bên trái, trường số đo bên phải. Không thay ảnh gốc khi hiệu chỉnh. Không thêm nhiệt độ vì contract hiện chỉ pH/độ mặn; chart không dùng dữ liệu giả.

## Giới hạn giữ nguyên

- Chưa nối đóng sớm chu kỳ/đóng lô/báo cáo sản lượng chỉ dựa vào hình: cần đúng API và chuyển trạng thái được duyệt. Không thay nghiệp vụ theo ghi chú trong wireframe.
- Chỉ số kế hoạch và trạng thái lấy API; trường chưa lập hiển thị Chưa lập. Ảnh nhật ký không đưa ra trang truy xuất công khai.
- Sidebar vẫn có hai route chu kỳ lịch sử như trước; đợt này đồng bộ presentation, chưa thay routing/API/permissions.
- Khi lọc tới ngày khác, làn đang chọn được bỏ để không giữ thông tin của thời điểm trước. Request progress hủy khi rời lựa chọn như lượt sửa trước.

## Kiểm tra

-68test nhóm vận hành/cycle/map đạt; thêm1test LaneBoard xác nhận mapping enum số, trạng thái và chọn đúng làn đạt. Lint/typecheck/production build đạt sau sửa bố cục.
- Script built session pages lần đầu timeout chờ child Next khởi động; chạy lại cùng bản build đạt63assertion. Không đổi cơ chế phiên để làm test xanh.
- Chưa xác nhận visual đầy đủ360/1024/1440 hoặc browser ghi dữ liệu cho toàn bộ module. Không coi hình tham khảo là bằng chứng API đã đủ. Chưa commit/push.
