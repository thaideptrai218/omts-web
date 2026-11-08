# Web API workspace — 29/10/2026

Người dùng yêu cầu tiếp tục các màn để tester làm việc, chỉ mở nghiệp vụ có API thật và đồng ý G1: cookie điều phối HttpOnly, Redis ledger/generation, Web Locks, chặn browser thiếu khả năng phối hợp. Các quyết định mới tiếp tục giữ email OR phone cho Staff (không đổi sang phone-only), chờ backend sửa tạo account sang username tự sinh/secret-free; MSG06 được phép dùng câu đã duyệt, giữ nháp và không tự gửi lại mutation.

## Phần đã ghép

API mode có form login thật, G1 bootstrap/login/logout/recovery, phiên SID với token mã hóa ở Redis, SSR guard và workspace context lấy `/me` + `/me/permissions`. Một lượt đang chờ được đặt nguyên tử bằng Lua; worker cũ không publish khi generation/attempt không khớp. Logout so revision và làm ledger/session không dùng được trước khi chờ upstream. Browser chờ Web Lock chỉ đọc lại phiên, không gửi credentials đã giữ. Response cookie cũ có thể gây yêu cầu đăng nhập lại, nhưng resolver không nhận SID không khớp ledger. Không bật refresh.

Các màn resource dùng repository client → BFF đường dẫn cố định → backend, CSRF cho ghi, bearer chỉ server, timeout/cancellation và recheck phiên sau response. Response được project qua schema, không chuyển raw account/token payload ra browser. Các route mock hiện hữu chọn thành phần API riêng ở API mode; không mount mock business UI dưới phiên thật.

Màn hiện có: vùng; nhà cung cấp; danh mục vật tư; nhân viên; bè/làn; tài khoản; vai trò/quyền; hồ sơ cá nhân; hồ sơ HTX. CRUD được làm theo lát, xem bảng trong REVIEW_GUIDE; danh sách chức năng không có nghĩa mọi endpoint phụ đã hoàn thành. Không có account-create hoặc Staff contact-verification mutation. Password flow cấp SID mới từ token response và đổi binding ledger, thu hồi BFF session cũ; dùng cùng đường kiểm identity/phase/permissions với login.

## Kiểm chứng thực tế và sửa lỗi

- Redis7.4.11 loopback6380: hai owners độc lập,20 reserve đồng thời chỉ một started; invalidate chặn publish cũ, unknown outcome không tự mở lại. Runtime ghép AES/session/ledger kiểm login/logout và đổi pass với backend fixture.
- Backend Docker8080 readiness200; HTTP BFF thật kiểm Owner login→session→7 resource reads→profile/HTX→logout→401. Kiểm create/update/discontinue vùng/supplier/item/bè và stale zone MSG06 bằng record QA trong DB demo local; không reset DB. Các bản ghi vùng/supplier/item/bè QA đã ngừng dùng; nhân viên QA đã tạo/sửa và gán vùng vẫn ở trạng thái đang làm việc.
- Kiểm HTTP thật Owner, quản lý vùng, kế toán và Trader: profile đúng tài khoản, danh mục vật tư theo quyền, quản lý chỉ có một vùng được cấp, detail vùng khác và danh sách nhân viên bị403; Trader bị403 các resource nghiệp vụ. Account cần đổi pass hoặc xác minh contact vào đúng gate, không đọc application API. Mỗi account logout xong GET session401.
- Browser IAB: Owner login qua form, điều hướng workspace, list vùng thật và popup dữ liệu đã kiểm. Phiên hết access expiry dẫn về recovery như thiết kế. Quản lý vùng login→chỉ một vùng DEMO-01, không có Owner admin links hoặc nút ghi. Màn list360px và popup1024px đã xem, viewport được khôi phục; logout trả form trống. Ảnh bằng chứng lưu ở workspace outputs của chat.
- Lỗi đã sửa: truyền nguyên Redis config chứa namespace vào strict connection schema làm runtime unavailable; bodyless bootstrap bị kèm maxBytes nên CSRF policy invalid; thêm test product handler. Dev API không thể chạy cùng dev server checkout đang mở, nên thêm launcher built-app riêng loopback3002 ở test mode; không hạ yêu cầu HTTPS của production.
- Backend Staff trả otherPermissions dạng EXPORT/PUBLISH thay vì Export/Publish làm schema từ chối phiên. Chỉ nhận thêm các spelling uppercase đã biết và normalize về FunctionAction; giữ từ chối giá trị lạ. HTTP thật các actor và các test schema/mapper đã đạt sau sửa.
- Danh mục trả mảng được tìm kiếm trước khi phân trang, không lặp toàn bộ danh sách ở trang sau; clamp trang cuối khi số bản ghi giảm. Có hồi quy tìm bản ghi ngoài trang đầu.
- Built-app cuối đã restart trên3002: Owner login thật, roles page1/page2 pageSize1 trả hai ID khác nhau, input-items page2/pageSize5 trả đúng5 dòng; logout signed-out. Không ghi thêm dữ liệu ở lượt xác nhận này.

## Kiểm cuối trên source của lượt này

- `OMTS_TEST_REDIS_URL=redis://127.0.0.1:6380/2 npx vitest run --reporter=json --outputFile=docs/learning/api-final-tests.json`: 2.519/2.519 test đạt, không skip, gồm integration Redis thật. Báo cáo máy ở thư mục learning ignored.
- `npm run lint`, `npm run typecheck`, `npm run build`: đạt; build28/28 trang. `npm run test:session-pages`:30 assertions HTTP/compiled UI đạt trên build cuối.
- Một lượt chạy full đồng thời với tác vụ khác timeout ca bounded stream; riêng file30/30 đạt, full tuần tự2.519/2.519 đạt. Một lượt smoke khởi động child Next thất bại khi đang chạy full; chạy lại tuần tự đạt30 assertions. Chưa chứng minh nguyên nhân gốc của hai timeout, không tăng timeout hoặc thay code để che lỗi.
- Đổi password được kiểm bằng backend fixture và Redis thật (mật khẩu hiện tại sai giữ binding, thành công cấp SID mới/thu hồi SID cũ). Không đổi password account demo dùng chung để lấy bằng chứng browser.

## Giới hạn còn lại

Không coi local HTTP là bằng chứng TLS/__Host-cookie deployment. Chưa có UI cho mọi route phụ; chưa tích hợp LAB chưa merge vào runtime, SRS bán hàng/thu hoạch/truy xuất chưa có endpoint. Staff email OR phone và account delivery còn chờ backend. Refresh, logout offline/revocation debt và đối chiếu QA deployment chưa hoàn thành. Phiên local hiện hết hạn theo access token và yêu cầu login lại. Không thay backend, seed/migration, SRS hoặc Jira. Công việc tiếp tục trên nhánh feature/OMTS-132-web-foundation và PR#3 dạng draft; không merge develop.
