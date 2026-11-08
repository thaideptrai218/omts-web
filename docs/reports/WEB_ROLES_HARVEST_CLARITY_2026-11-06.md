# Vai trò và thiết lập thu hoạch

- Thu gọn ma trận API từ nhiều cột Có/Không/Không áp dụng thành chức năng, nhãn thao tác được phép và phạm vi. Nguồn quyền vẫn từ API, chỉ đọc.
- Bổ sung giải thích Nhân viên thông thường trên màn vai trò API và mock. Backend local StaffRole chỉ có ZoneManager/Accountant; Staff là loại tài khoản, không tạo role ID hoặc tự cấp quyền mới.
- Đổi tiêu đề dialog thiết lập thành Quy đổi lồng và tự đóng lô. Giải thích phạm vi toàn HTX và thao tác Ghi nhận chuyến thu hoạch để tạo lô. Thiết lập chỉ lưu kg/lồng cho lô mới và thời hạn tự đóng lô; không tạo chuyến hoặc sửa khối lượng lô cũ.
- Chưa kiểm tra render browser trong đợt này. Không commit/push.
