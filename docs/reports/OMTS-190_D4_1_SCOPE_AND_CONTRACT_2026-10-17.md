# OMTS-190 — D4.1 Scope and contract

## Nguồn đã đối chiếu

- [OMTS-190](https://welterial.atlassian.net/browse/OMTS-190): Web SCR-09, Done when chạy với QA API.
- [OMTS-146](https://welterial.atlassian.net/browse/OMTS-146): story UC11 và acceptance criteria đầy đủ.
- [OMTS-188](https://welterial.atlassian.net/browse/OMTS-188): account API, temporary password, lock/unlock.
- [OMTS-189](https://welterial.atlassian.net/browse/OMTS-189): grant API, history và effective-permission preview.
- [OMTS-191](https://welterial.atlassian.net/browse/OMTS-191): QA cases.
- SRS v5.8: UC11, SCR-09, Account, AccessGrant, BR-01/19/31–34 và MSG01/02/03/09.

## Phạm vi đã khóa

Chỉ Cooperative Owner dùng UC11. Account không có một role toàn cục. Một account nhận một hoặc nhiều `AccessGrant`; mỗi grant là một cặp role với một farming zone cụ thể hoặc All zones. Effective permissions của một zone là hợp action từ các role áp dụng tại zone đó.

Account nội bộ có display name, username, phone bắt buộc và email tùy chọn. Phone do Owner nhập nhưng chưa verified; người dùng xác minh ở first login. Khi Owner đổi phone, trạng thái verified phải trở về false. Account có Active/Locked; lock giữ dữ liệu/grant và backend phải thu hồi session.

AccessGrant có Effective/Revoked. Revoke ghi reason, timestamp và giữ record. Re-grant về sau phải tạo grant mới, không phục hồi thầm record cũ.

## Điểm chưa tự quyết

Backend `OMTS-188/189` đều To Do nên chưa có QA DTO. Mock zone/role chỉ là dữ liệu phát triển. Câu ngắn của `OMTS-190` có thể hiểu reset cũng cần reason, nhưng UC11/SCR-09 chỉ bắt reason cho lock, unlock và revoke. D4 mock theo SRS chi tiết: reset có MSG09 confirmation nhưng không có reason; cần BA/backend xác nhận trước tích hợp.

## Defense Q&A

**Tại sao role không nằm trực tiếp trên Account?**

Vì cùng một người có thể là Quản lý vùng ở Khu Đông và Kế toán ở Khu Nam. Role chỉ có ý nghĩa thông qua AccessGrant và phạm vi zone của grant đó.

**Tại sao revoked grant không bị xóa?**

BR-19 yêu cầu lịch sử cấp/thu hồi. Xóa record làm mất người cấp, thời điểm và lý do, khiến audit không còn đáng tin.
