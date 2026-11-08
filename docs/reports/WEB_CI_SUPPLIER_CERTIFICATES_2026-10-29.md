# CI PR3 và chứng nhận nhà cung cấp — 29/10/2026

Đã xác minh CI đúng `661abe9ed3d1576feda715838d851e6305d553a2`: [build-test](https://github.com/thaideptrai218/omts-web/actions/runs/40908746748), Gitleaks và PR title SUCCESS. Build37/37 và52 built-product assertions đạt trên CI. Không có lỗi build/test cần vá ở SHA này.

GitGuardian FAILURE:11 vị trí trong46 commits. Chi tiết có3 vị trí ở chính661abe9, thuộc hai file test G1/G2, là giá trị mật khẩu giả cố định. Đã thay ba literal hiện tại bằng giá trị sinh trong test, giữ nguyên assertion và không thêm allowlist/skip hoặc đổi scanner. Lịch sử commit vẫn chứa các dòng cũ nên không nhận là đã làm GitGuardian xanh; phần remediation lịch sử vẫn hoãn theo quyết định trước. Không in findings thô/credentials vào báo cáo.

Fetch backend origin: develop vẫn953f597, không có API mới đã merge. Tiếp tục một lát còn thiếu thật: chứng nhận trong hồ sơ nhà cung cấp. Không đổi backend/runtime/DB schema/Jira hoặc merge Web.

## Màn đã nối

Nhà cung cấp → Mở hồ sơ → Chứng nhận nhà cung cấp. Đọc danh sách, tải JPEG/PNG/PDF, tải lên nhiều tệp theo giới hạn backend10MB/tệp và10 chứng nhận tổng. Người có SUPPLIERS View được đọc, cần thêm Edit để tải lên; Owner giữ quyền theo subject, Trader không được truy cập. Lưu/hủy nháp metadata trước khi mở popup; không tự mất nháp khi tải tệp. Sau upload thành công, đóng popup chuyển metadata/version canonical về editor cha. GET/reload đơn thuần không báo đã lưu. Lỗi giữ tệp đang chọn, pending chặn đóng/submit lặp, unknown write không replay hoặc mở khóa khi GET thành công.

POST/GET `/api/supplier-documents`: fixed supplier path, strict query/GUID, CSRF cho upload, bounded multipart reader, DTO schema/ID match và kiểm lại cùng phiên. Response chỉ có URL proxy Web; không trả signed backend URL. Download đọc supplier trước, kiểm index + SHA256 đường dẫn tệp, chỉ category Local supplier-certificates cùng origin; redirect/URL ngoài/category khác bị chặn. Signed query có thể đổi mà fingerprint đường dẫn giữ nguyên. Index trỏ sang tệp khác trả409MSG06. Bytes10MB/content type/sandbox/attachment/private no-store và recheck sau fetch. Storage ngoài Local chưa được hỗ trợ; UI không dựng link giả.

**Xóa chưa bật:** backend DELETE chỉ nhận index, không nhận certificate ID hoặc version mong đợi. Check ở BFF rồi DELETE vẫn có khoảng đua: client khác xóa dòng trước làm index trỏ sang file khác trước khi backend đọc. Cần backend nhận ID/version/expected key và kiểm nguyên tử; không giải quyết bằng retry hoặc lock riêng Web vốn không phủ Mobile/direct API. Không thêm cảnh báo phát triển vào UI hoặc gọi việc thiếu xóa là đầy đủ SRS.

## Kiểm chứng

- Full253files/2.811 PASS/0skip, Redis DB2 riêng,202.04s. Sau thay literal fixture, chạy lại riêng15 test G1/G2 đạt. Nhóm chứng nhận14 ca server/component đạt: actor/CSRF/multipart/projection/file identity/session replacement/unknown write và trả version cho cha.
- Lint/typecheck/build38/38 đạt;52 built-product assertions đạt. Typecheck đầu bắt narrowing mất trong map callback; chụp origin đã validate trước callback rồi kiểm lại đạt.
- HTTP thật tạo supplier QA riêng, upload PDF, đọc bytes private, version tăng, stale fingerprint409; Manager đọc200, Trader403, anonymous401. Supplier QA sau thử được ngừng dùng, file/reference/audit còn; không sửa supplier seed. Không thử xóa qua endpoint có rủi ro index.
- Browser Owner mở đúng hồ sơ QA đã ngừng dùng và danh sách1/10 chứng nhận/link private. CSS360/1024 không tràn trang; ảnh ở outputs workspace. Browser chỉ kiểm read/UI, upload/bytes bằng HTTP thật và component tests. Viewport reset, logout về login trống. CUA binding cũ unavailable, đọc troubleshooting/reset kernel và lấy lại đúng browser2/tab2; không đổi browser.

Các phần còn chờ account-create/reset secret-free, Staff email OR phone, fixed roles, Manager license, bank HTX và SRS v2 chưa có API vẫn giữ nguyên. PR3 OPEN/DRAFT, chưa merge; kết quả CI661abe9 không tự là CI của commit bổ sung này.
