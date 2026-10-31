# Hồ sơ HTX trên API thật — 29/10/2026

Tiếp tục yêu cầu hoàn thiện các màn có API thật, cùng nhánh feature/OMTS-132-web-foundation và PR3 draft. Đã đọc AGENTS/context, SRS v5.8 UC09, Jira OMTS-203/201 và service/controller Cooperatives của backend develop953f597. Không sửa backend/SRS/Jira hoặc merge develop.

## Phạm vi và contract

`/cooperative/profile` ở API mode có màn riêng: đọc hồ sơ sơ bộ với trường nullable; sửa thông tin pháp lý/liên hệ và thêm/xóa/sửa ngành nghề; kiểm bắt buộc, mã số thuế, điện thoại, email, website, giới hạn trường/ngành nghề; xem trước tên/địa chỉ và xác nhận trước lưu. PUT backend trả `{ profile, message }` được đọc đúng, không nhận raw message làm nội dung UI. Sau lưu dùng rowVersion mới. Trạng thái hiển thị từ server; không tự đánh hoàn thiện ở client.

Logo có chọn ảnh PNG/JPEG/WebP tối đa2MB, tải/thay riêng, xác nhận xóa. Các trường đang nhập được giữ và version mới được dùng khi metadata không có cập nhật xen giữa. Nếu response logo phát hiện nội dung hồ sơ trên server khác bản gốc đang sửa, chặn lưu và hiện so sánh; không dùng version mới để âm thầm ghi đè bằng nháp cũ. API logo backend không nhận rowVersion; Web không thể biến thao tác này thành optimistic concurrency phía backend.

MSG06 giữ nháp, tải bản mới theo nút bấm, rồi chọn dùng bản đã lưu hoặc giữ nháp với version đã đối chiếu. Unknown write/401 sau commit vẫn khóa lượt ghi, kể cả đọc đối chiếu thành công; không replay/offline queue. Hủy nháp có xác nhận; pending khóa thao tác và chặn gửi hai lần. Có skeleton, lỗi, thử đọc lại và thông báo thành công riêng.

| BFF | Backend | Phạm vi |
| --- | --- | --- |
| GET/PUT `/api/cooperative/profile` | GET/PUT cùng path | Owner/application session |
| POST/DELETE `/api/cooperative/profile/logo` | POST/DELETE cùng path | Owner + CSRF; multipart field `file` |
| GET `/api/cooperative/profile/logo?version=...` | GET profile để xác thực cha, rồi GET đúng public logo file | Owner; version phải còn khớp; không nhận URL từ browser |

BFF dùng strict schema, giới hạn JSON16KB/multipart3MB và ảnh2MB; same-origin CSRF; server-only bearer; projection bỏ field lạ/publicPreview/raw message; kiểm lại cùng phiên trước trả dữ liệu/lỗi và sau đọc bytes ảnh. Target ảnh chỉ được dạng `/api/public/cooperative/logos/YYYY/MM/<32hex>.(png|jpg|webp)`; không URL ngoài, redirect, query, private category hoặc signed URL xuống browser. Browser chỉ nhận URL BFF; ảnh JPEG/PNG/WebP, no-store/nosniff, không tối ưu qua cache ảnh Next. Không thêm public Web route hoặc đổi payload QR: preview Web giữ tên và địa chỉ.

## Bằng chứng

- 42 ca mới: schema/repository, Owner/privacy/CSRF/session switch, save envelope, nullable sơ bộ, upload bounds/WebP, SSRF/category/version/file recheck; editor xác nhận/ngành nghề/preview, giữ nháp sau logo, cập nhật xen giữa, conflict/unknown write, pending/discard.
- Full239 file/2.669 PASS/0 skip, Redis DB2 thật,213,64s. Lint/typecheck/build30/30 và36 built-product assertions PASS trên source cuối. JSON/log ở learning ignored. Đây là kết quả local, không tự là CI/TLS/deployment.
- HTTP thật qua Web3002→backend8080: Owner GET/PUT và rowVersion, stale409MSG06; PNG upload→GET đúng bytes→DELETE; CSRF403; anonymous401; Manager/Accountant/Trader403 cho đọc profile/logo và ghi profile. Nội dung hồ sơ và ảnh logo ban đầu đã khôi phục trong finally, status vẫn Completed; audit/rowVersion và các tệp logo QA cũ vẫn tồn tại, không reset DB.
- Browser Owner: thêm ngành nghề QA→preview/confirm→lưu thật thành công, xóa dòng QA→confirm→lưu khôi phục; logo hiện tại tải được. DOM xác nhận360×800 và1024×768 CSSpx, không tràn ngang; viewport đã reset. Ảnh ở outputs của chat. Không nhận HTTP upload/delete là browser mutation. Hồ sơ sơ bộ được kiểm bằng fixture contract, không tạo lại HTX demo để ép chuyển trạng thái.

## Giới hạn còn giữ

WEB-COOP-BANK-01 vẫn chờ BA: không xóa schema/form/mock ngân hàng HTX, không tự tạo PAY-01. Backend profile chưa có ngân hàng và API mode không giả lập bằng dữ liệu mock, vì vậy lát này chưa nghiệm thu toàn bộ UC09. Chưa có endpoint lịch sử hồ sơ để dựng màn audit riêng. Vai trò vẫn chờ ba mã cố định và contract backend; không suy từ tên/GUID để mở ghi quyền. Staff email-or-phone activation và account-create secret-free vẫn chờ như trước. Không đánh Jira Done.
