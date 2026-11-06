# Giấy tờ vùng, ảnh và sơ đồ bè API — 29/10/2026

Tiếp tục các màn API thật theo yêu cầu người dùng, sau INP/ENV. Nguồn: SRS v5.8 UC15/18, quyết định WEB-ZONE-01/02 và RAFT-DEC-01/02, Jira OMTS-119/210, backend develop953f597. Cùng nhánh feature/OMTS-132-web-foundation, PR3 draft; không merge hoặc đổi backend/Jira/SRS.

## Luồng được nối

- Hồ sơ vùng đã lưu → **Giấy tờ và gia hạn**: danh sách và dòng Thiếu hồ sơ từ backend, tra cứu theo ngày, tạo một giấy bao phủ nhiều vùng; PDF/JPEG/PNG tối đa10MB; sửa thông tin với rowVersion, giữ tệp nếu không chọn mới; gia hạn/thay thế tạo giấy mới và giữ giấy cũ; đi theo liên kết trước/sau, tải tệp nội bộ. Giấy đã có bản thay thế chỉ đọc. Lưu giấy độc lập với bản nháp thông tin vùng, không tự lưu hoặc bỏ bản nháp vùng.
- Hồ sơ bè đã lưu → **Ảnh và sơ đồ tình trạng bè**: ảnh riêng JPEG/PNG tối đa10MB, Owner cập nhật; lịch sử phiên bản sơ đồ, tra cứu tình trạng theo ngày, đoạn màu có nguồn thả/thu/ghi giảm, người ghi/xác nhận, lô giống, lý do; dự kiến thu hiển thị riêng. Không có chu kỳ thì hiện Chưa thả, không suy khối lượng từ chiều dài. Thông tin bè phải lưu/hủy trước khi mở chức năng này; khi đóng sau upload, rowVersion mới được đưa về form cha.
- Chi phí bè đọc endpoint INP `raft-material-costs`, kèm các phiếu làm căn cứ. Backend raft detail hiện trả0 cả khi không có phiếu; UI không dùng số0 này để kết luận đã biết chi phí. Danh sách phiếu trống → Chưa có số liệu chi phí; có phiếu tổng0 →0đ thật. Nếu không có View phiếu nhập trong vùng, hiện thiếu quyền xem chi phí; lỗi tải có nút tải lại.

Giấy tờ vẫn Owner-only theo API; quyền đọc giấy tờ cho Manager còn chờ backend alignment đã ghi trong quyết định trước. Staff đọc ảnh/sơ đồ bè qua kiểm vùng ở backend; không có nút upload. Không mở giấy tờ qua QR, không thêm quyền hoặc endpoint chu kỳ/thu hoạch giả.

## HTTP và ranh giới dữ liệu

`/api/operations/zone-licenses` và `/api/operations/raft-details` dùng repository chung; plan ánh xạ method/path/action cố định. Schema từ chối query lặp, field lạ, ID/ngày sai, thiếu version/tệp hoặc ngày hết hạn không sau hiệu lực. Upload tái sử dụng bộ đọc multipart đếm byte thực, tối đa một tệp và envelope12MB; CSRF kiểm trước khi đọc body, quyền/session kiểm trước upstream. Backend tiếp tục kiểm định dạng theo nội dung thật.

Bearer chỉ server; projection lược field ngoài DTO. URL ký đổi thành BFF path. Tải tệp luôn đọc bản ghi cha trước, chỉ chuyển tiếp `/api/files/local/` cùng backend origin, không bearer/redirect tới file; giới hạn byte, MIME, deadline, no-store/nosniff/sandbox. Recheck phiên sau JSON/file/upload;401 sau khi ghi được xem là chưa rõ kết quả. Không tự retry. MSG06 giữ nháp, tải/đối chiếu rồi người dùng chọn bản mới hoặc chủ động giữ nháp với version mới; tạo/gia hạn chưa rõ kết quả không tự mở lượt gửi lại. Đọc bản nghi đã lưu để đối chiếu giữ nguyên nháp cho đến lựa chọn rõ ràng.

## Kiểm thật và trạng thái dữ liệu QA

HTTP thật Owner đã kiểm:2 loại bắt buộc Missing; một giấy hai vùng; ảnh có byte thật và tệp sai nội dung bị400; sửa không đổi tệp; stale409MSG06; gia hạn; liên kết chuỗi; trạng thái trước/sau ngày bản mới hiệu lực; chặn sửa/thay tiếp giấy cũ. Bè QA: ảnh/file, layout v2, không chu kỳ và không nguồn giả; chi phí INP không có dòng trong khi raw raft detail0. Manager own-zone condition200, other-zone photo403, licenses403, upload403; Trader403, anonymous401. Hai vùng QA và bè QA đã ngừng dùng; giấy/tệp/lịch sử giữ để tester xem. Danh sách ID/log chỉ ở learning ignored. Không reset DB.

Môi trường Docker đầu lượt không chạy, khởi động gặp socket `dockerInference` bị Windows từ chối truy cập. Đã giữ dự phòng hai thư mục chỉ chứa socket runtime tại `%LOCALAPPDATA%/Docker/run.qa-backup-20261029-1525` và `%LOCALAPPDATA%/docker-secrets-engine.qa-backup-20261029-1525`, rồi chạy lại Docker và hai container SQL/Redis hiện có. Không thay settings, xóa volume hoặc chạy seed. Cách xử lý đối chiếu [báo cáo Docker #460](https://github.com/docker/desktop-feedback/issues/460); readiness backend200 sau phục hồi. Không dùng đây làm bằng chứng sửa lỗi Docker trên mọi máy.

Browser Owner đã kiểm bản nháp vùng vẫn còn sau mở/đóng giấy tờ; tạo giấy OTHER `QA-UI-FARM-29-10` bằng file chooser thật, một giấy hai vùng, trả link tải tệp; giấy cũ đã có bản thay thế không có nút sửa. Bản build cuối đã kiểm ảnh bè QA → upload thật → xem version/đoạn Chưa thả → đóng panel → sửa metadata và lưu thành công với version mới. Form giấy và lịch sử/đoạn làn dùng được ở360/1024 CSSpx; số đo DOM được kiểm vì WebView scale1.5 làm capability viewport dùng số pixel khác. Đã reset viewport và logout. Browser chỉ có bản đo không chu kỳ; các đoạn có nguồn thả/thu được kiểm bằng fixture, không dùng dữ liệu giả trong sản phẩm để lấy ảnh.

Kiểm cuối source: `npm run lint`, `npm run typecheck`, `npm run build`29/29 và `npm run test:session-pages`36 assertions đạt. Lượt full đầu:2.582 test đạt,9 bị skip vì suite chuẩn bị ESLint fixture thất bại; JSON reporter không có thông điệp gốc, chưa chứng minh nguyên nhân. Chạy riêng suite đó9/9 đạt; chạy lại toàn repo trên source không đổi với Redis thật DB2:233 file,2.591/2.591 PASS,0 skip. Không tăng timeout, xóa test hoặc sửa quality gate. Các báo cáo máy lưu learning ignored.35 test mới bao phủ quyền/upload/file/version/draft/uncertain và chi phí chưa biết-vs-zero. Không lấy local result làm CI hoặc nghiệm thu toàn SRS.

File Local được hỗ trợ; Azure/SAS vẫn cần allowlist riêng. Không thêm refresh/offline queue hoặc coi local HTTP là TLS/deployment nghiệm thu.
