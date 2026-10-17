# OMTS-183 — D2.5 Form SCR-07

## Đã triển khai

Form gồm bốn nhóm: thông tin pháp lý, địa chỉ/liên hệ, hoạt động kinh doanh và tài khoản nhận chuyển khoản. Required/optional fields bám Jira/SRS. Ngân hàng là select từ catalog service; activity là danh sách nhiều dòng có add/remove.

Activity row dùng ID ổn định thay vì array index làm React key. Khi thêm dòng, focus chuyển vào input mới. Nút xóa có nhãn riêng cho screen reader và giữ ít nhất một dòng hiển thị.

Hủy thay đổi reset toàn bộ form về profile snapshot hiện hành. Client validation hiển thị lỗi cạnh control; repository vẫn revalidate vì dữ liệu từ browser không được coi là tin cậy.

## Lỗi phát hiện

Schema trả lỗi dòng đầu tại `businessActivities[0]`, trong khi UI ban đầu chỉ đọc lỗi cấp mảng. Kết quả là form bị chặn nhưng người dùng không thấy lý do. UI đã đọc cả array-level và item-level error; browser test xác nhận thông báo xuất hiện.
