# Tham khảo nhân sự KiotViet — 10/11/2026

Nguồn: https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-nhan-vien/quan-ly-nhan-vien/ và 21 ảnh người dùng cung cấp.

## Áp dụng đợt đầu

- Danh sách nhân viên API: bấm dòng mở thông tin ngay dưới dòng; bấm lại để thu gọn. Nút truy cập bàn phím có aria-expanded và aria-controls.
- Hiện tên, tình trạng làm việc, liên hệ, vùng làm việc, tài khoản liên kết và tình trạng tài khoản từ dữ liệu danh sách hiện có.
- Nút Cập nhật hồ sơ tiếp tục mở editor hiện hữu, tải bản ghi qua API. Không đổi quyền, validation hoặc lệnh ghi.
- Giữ tìm kiếm trên bảng, bộ lọc bên trái và phân trang server. Màn mock chưa áp dụng đợt này.

## Đợt tiếp: lịch và chấm công trong ngày

Đọc tiếp https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-nhan-vien/quan-ly-cham-cong/ phần đặt lịch, xem theo nhân viên/ca và chi tiết chấm công.

- Thêm nút ngày trước/ngày sau/Hôm nay, vẫn truy vấn API theo một ngày và đặt lại trang khi đổi ngày.
- Bấm dòng phân công hoặc nút Xem chi tiết để mở ngay bên dưới: nhân viên, ngày, vùng, bè, công việc, giờ vào và ra, trạng thái hiện có.
- Không thay đổi các điều kiện quyền và xác nhận vào/ra/gỡ. Không bổ sung giờ theo ca, phép tính muộn/sớm, lịch lặp hay duyệt chỉnh công từ quy tắc KiotViet.
- Chỉ áp dụng màn API /operations/workforce; chưa có ma trận tuần/tháng.
- Lint, typecheck và build 65 trang đạt sau thay đổi. Chưa xác minh giao diện trong browser hoặc ghi chấm công thật.

## Các phần tiếp theo cần đối chiếu

1. Chia editor hiện tại thành nhóm thông tin cá nhân/công việc/ngân hàng/tài khoản; giữ toàn bộ trường và điều kiện hiện hành.
2. Chấm công: tách cách đọc lịch phân công và giờ vào/ra thực tế; trình bày trạng thái có chú giải. Chỉ tổng hợp dữ liệu đã tải đủ và đúng phạm vi quyền; không coi trang chưa tải là nghỉ làm.
3. Lịch tuần/tháng: cần kiểm tra API khoảng ngày và phân trang trước khi dựng ma trận nhân viên × ngày. API theo một ngày không được biến thành bảng tháng có dấu chấm giả.
4. Nghỉ phép: gom yêu cầu và kết quả đã có; chỉ đưa thao tác duyệt được backend cho phép.

## Chờ đối chiếu nghiệp vụ và backend

- BHXH, thuế TNCN, phòng ban/chức danh mới, hoa hồng, tạm ứng, thiết bị và duyệt chỉnh công: ảnh KiotViet không phải yêu cầu nghiệp vụ OMTS đã chốt.
- Import Excel cần API nhập hàng loạt và quy tắc xử lý lỗi; không tự POST từng người hoặc thêm giới hạn 500 từ KiotViet.
- Payroll có mã trong nhánh lab cũ; cần đối chiếu contract hiện hành, không coi là API develop đang sẵn sàng.

## Kiểm tra

- ESLint tệp thay đổi và typecheck đạt.
- Lint toàn repo và production build 65 trang đạt. Đã khởi động lại Web API 3002 bằng build mới.
- Chưa kiểm tra browser hoặc ghi CRUD trong đợt này.

## Câu hỏi còn mở

Phạm vi BHXH/thuế/tạm ứng có thuộc SRS hiện hành hay chỉ tham khảo cách trình bày? Chưa thêm các nghiệp vụ này.
