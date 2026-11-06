# Thả giống và bố cục nuôi trồng — 06/11/2026

- Dùng bộ nhập/chọn ngày tiếng Việt hiện hữu cho Field type=date của các màn vận hành; giá trị gửi API vẫn ISO. Ngày trên bảng thả giống, vật tư và tiến trình làn hiển thị dd/MM/yyyy.
- Thông báo kiểm tra thả giống chỉ rõ trường sai thay vì một câu chung; sửa/xóa vẫn có lý do, xác nhận và rowVersion.
- Nút bản ghi đủ điều kiện ghi rõ Xem / chỉnh sửa, nút xóa ghi rõ Xóa bản ghi thả giống. Khi API khóa bản ghi, form giải thích trạng thái khóa.
- Backend runtime meeting có CanCorrect cho Owner kể cả bản ghi do nhân viên tạo. Điều kiện còn lại: chu kỳ mở, bè đang dùng, chưa có làn thuộc lô thu hoạch. Không bỏ điều kiện này ở frontend.
- Thu nhỏ ô làn, ô ngày; hai cột tiến trình căn đầu, tránh kéo giãn chiều cao. Danh sách bè bên trái cuộn riêng trên desktop; mobile giữ luồng cuộn trang.
- Chưa kiểm chứng thao tác lưu/xóa trực tiếp trên browser trong lượt này; không coi thông báo validation của người dùng là bằng chứng thiếu dữ liệu hoặc lỗi backend.
- Kiểm thử bộ nhập ngày và bảng làn: 4/4 đạt. Typecheck đạt; lint/build ghi nhận theo kết quả chạy cuối lượt.

Không commit/push/merge.
