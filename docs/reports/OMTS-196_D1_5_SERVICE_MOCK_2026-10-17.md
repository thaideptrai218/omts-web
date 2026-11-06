# OMTS-196 — D1.5 Service and mock boundary

## Thiết kế

UI gọi `CooperativeProvisioningService`; service gọi `CooperativeProvisioningRepository`. Kết quả không dùng cờ `success` chung mà là union theo `status`: provisioned, duplicate Owner, verification failed, invalid input hoặc expired session.

Service trim ba field text trước khi chuyển qua repository và giữ nguyên các `File` object. Mock repository revalidate dữ liệu ở boundary, kiểm tra session trước khi xử lý, kiểm tra verification trước duplicate theo UC72, sau đó chỉ cho provisioning thành công một lần. Credential là fixture trả về từ repository và không được component sinh, lưu hoặc log.

## Kiểm thử

Unit tests bao phủ schema required/trim, MIME ảnh, service normalization, one-time success rồi MSG03, MSG55, MSG19 và repository revalidation. Policy dung lượng/số ảnh và multipart DTO chưa được dựng giả vì chưa có backend contract.
