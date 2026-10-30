# Browser QA 3003 — 30/10/2026

Đợt này kiểm thao tác trên **http://127.0.0.1:3003**, backend QA Zalo8081 và RedisDB3 riêng. PR #3 tiếp tục draft, chưa merge. Báo cáo [role/API audit](WEB_ROLE_FLOW_AUDIT_2026-10-30.md) là bằng chứng HTTP riêng; không thay thế kiểm thử browser.

## Kết quả thực tế trên browser

| Tài khoản | Đã xác minh trong lượt này | Còn cần kiểm trên browser |
| --- | --- | --- |
| Owner | Login/menu/inbox/Trader rejection/supplier ở lượt trước; lượt tiếp kiểm dialog Quay lại/Escape/Đồng ý, bỏ nháp không lưu, ngừng dùng supplier QA; chứng nhận upload/download; giấy phép download/chuỗi thay thế; logout | Các form quản trị khác không chạy lại toàn bộ trong lượt này; xem bằng chứng HTTP riêng |
| Manager DEMO-01 | Login/menu; chỉ DEMO-01; vị trí vùng/bè, chi tiết vùng/bè chỉ đọc, sơ đồ theo ngày/đoạn làn; phiếu nháp→hoàn thành→trả một phần→copy→hủy; xuất phiếu; đo nước nháp→xác nhận→hiệu chỉnh v2→hủy; ngưỡng readonly/xuất; hồ sơ/preferences bỏ nháp/inbox; URL tài khoản bị chặn; logout | Không sửa các hồ sơ seed hoặc giả lập sửa từ tab cạnh tranh |
| Manager DEMO-02 | Login/menu/chỉ DEMO-02; supplier create/filter/detail/certificates read; input group filter/detail readonly; phiếu nháp/invoice upload/download/complete; OCR ảnh→nháp→xác nhận→hủy; chi tiết bè đúng số làn; hồ sơ bỏ nháp/inbox; URL thanh toán bị chặn; hủy phiếu có tiền giữ chưa phân bổ/copy/complete; logout | Không xác nhận độ chính xác OCR production: backend QA dùng Fake OCR |
| Kế toán | Login/menu; đọc phiếu không có sửa/hủy; công nợ/lịch sử/lọc supplier/chi tiết tiền; chặn vượt nợ, đối chiếu→ghi tiền, phân bổ tiền cũ vào phiếu cùng supplier; preferences save/reopen/restore, hồ sơ/inbox; URL đo nước bị chặn; logout | Không có endpoint hủy thanh toán độc lập để mở thêm thao tác |
| Thương lái | Login/menu chỉ hồ sơ/security/inbox; bỏ nháp hồ sơ hai nhánh; catalog Orders/QR đúng actor, Push/mandatory readonly; inbox rỗng; URL phiếu nhập/tài khoản bị chặn; logout | Không thêm màn bán hàng/đặt hàng khi chưa có API tương ứng |

Lý do từ chối rỗng giữ nút xác nhận disabled. Đã xác nhận lưu lý do `QA browser: kiểm tra luồng từ chối` cho `QA chờ từ chối 062bad05`. Hộp quyết định ở CSS360 vừa màn hình, không tràn ngang; CSS540 cũng vừa. Đây không phải bằng chứng responsive cho mọi màn.

Nhà cung cấp tạo qua UI: `QA browser supplier 1793324655590`, loại Other, số điện thoại giả0924655699. Sau lượt tiếp đã ngừng dùng bằng dialog mới. Ghi chú nháp không được lưu. Tên Owner được nhập thử rồi đưa lại `Nguyễn Văn Hải`; không gửi lệnh lưu tên.

## Lỗi thao tác và bản sửa

Đóng editor nhà cung cấp đang có nháp gọi `window.confirm`. Lượt đầu hộp native khiến điều khiển tab bị kẹt. Người dùng đã xác nhận đóng popup/tab cũ; lượt tiếp tạo tab mới trong cùng browser và thao tác lại được. Không coi các lượt bấm không đổi trạng thái trước đó là thành công.

Thay các `window.confirm`/`window.prompt` còn lại trong các màn API bằng `useActionDialog`, dùng Dialog hiện có trong ứng dụng. Áp dụng cho danh mục/tài khoản, phiếu nhập, thanh toán, đo nước/ngưỡng và file chứng nhận. Giữ nội dung, bước xác nhận, lý do, quyền, phiên bản và quy tắc không tự gửi lại lệnh. **Quay lại**, Escape hoặc đóng hộp xác nhận hủy quyết định, giữ editor/nháp; chỉ **Đồng ý** mới tiếp tục hành động. Khi editor unmount, quyết định chờ được hủy.

Bản sửa dialog đã kiểm lại thật: Quay lại và Escape giữ editor cùng nội dung nháp; Đồng ý đóng và mở lại xác nhận nháp không lưu. Phiếu complete/cancel/return, hủy số đo cũng qua dialog mới. Console đọc ở cuối các lượt Manager1/Manager2/Accountant/Trader/Owner không có error/warn; không suy ra ứng dụng không còn lỗi ở mọi đường chạy.

Lượt tiếp phát hiện link hóa đơn `target=_blank` không tạo download trên IAB. Đổi các link **tải** hóa đơn, giấy phép và chứng nhận sang `download`, không mở popup; giữ nguyên URL BFF/CSRF/session/file policy. Trước sửa không nhận download event, sau sửa nhận file hóa đơn, certificate và license thật. Ảnh xem trước và link Google Maps giữ hành vi riêng. Đồng thời sửa số làn trong chi tiết bè: nếu API không có laneCount, lấy từ danh sách lanes đã trả; B2-01 hiển thị4 thay vì “—”.

## Kiểm tra tự động sau sửa

- Full **264 file /2.872 test PASS, 0fail/0skip**, Redis integration dùng DB2 riêng; JSON cục bộ `docs/learning/browser-role-full-tests.json`.
- 37 test targeted PASS gồm hook quyết định, giữ nháp nhà cung cấp, operations, farming và chứng nhận. Bốn test mới kiểm chờ quyết định/hủy/trim lý do/unmount và đóng nháp không ghi dữ liệu.
- Lint, typecheck, build41routes PASS;61 built-product HTTP/style assertions PASS.

Các số2872/37 trên là snapshot sửa dialog trước lượt tiếp. Bản sửa download có21 targeted tests PASS (2 regression mới), lint/typecheck/build41routes/61built assertions PASS, sau đó replay browser thành công. Full suite mới **264file/2874PASS/0fail/0skip**, RedisDB2 thật, lưu tại `docs/learning/browser-role-resumed-tests.json`. Không đổi backend, seed credentials/grants, session/cookie/cache policy hoặc các nghiệp vụ đang chờ contract. Không ghi nghiệp vụ vào DB8080.

CI đầu04a628c bắt lỗi TypeScript trong test mới: `exact` là tùy chọn Playwright, không có trong Testing Library getByRole. File test được thêm sau lượt typecheck/build local nên bằng chứng local ở trên chưa bao phủ typecheck test này. Bỏ hai thuộc tính không hợp lệ (name string vốn khớp chính xác), chạy lại lint/typecheck và các test liên quan trước đẩy bản sửa; không đổi production code để né CI.

## Dữ liệu QA và giới hạn lượt tiếp

- Manager1: `PR-20261030-026` hoàn thành2.000, trả1.000 qua `PRT-20261030-005`, Kế toán trả1.000 (`QA-BROWSER-M1`), còn nợ0. Bản copy `PR-20261030-027` đã hủy. Phép đo9:24 DEMO-01 từv1→v2 đã hủy với lý do QA.
- Manager2: supplier `QA browser Manager2 20261030`/phone giả0926000030 đang dùng, có1 ảnh chứng nhận QA. Phiếu `PR-20261030-028` có1 hóa đơn QA, đã hủy và giữ1.000 chưa phân bổ. Copy `PR-20261030-029` hoàn thành3.000, nhận phân bổ khoản `QA-BROWSER-M2`1.000, chưa phân bổ0/còn nợ2.000. Phép đo OCR9:33 DEMO-02 đã hủy. Dữ liệu này giữ để tester đối chiếu; không phải giao dịch tài chính thật.
- File upload là ảnh màn hình QA, không phải chứng từ thật. Download qua browser thành công: receipt JPG, supplier certificate JPG (backend chuẩn hóa ảnh), zone license PNG, Excel phiếu và đo nước.
- Tên Manager2/Trader chỉ thử nháp rồi bỏ, không gửi Save; tùy chọn Kế toán đã đổi/lưu/mở lại rồi lưu về giá trị gốc. Các tài khoản seed không đổi password/contact/grants. Cuối lượt đã logout Owner và xác minh form Đăng nhập hiện lại.
- Kiểm responsive bằng **CSS width thực đọc từ DOM**: OCR và preferences Trader tại360 không tràn dialog; màn payment tại360 không tràn toàn trang; các luồng chính tại1024. API viewport của IAB có lúc chịu tỉ lệ1.5 nên tham số540/1536 mới ra CSS360/1024; không dùng tham số truyền vào làm bằng chứng kích thước.
- Browser không chạy lại thao tác đổi password/contact OTP, grant revoke, mọi conflict/offline race hoặc tất cả biến thể file. Bằng chứng HTTP/component trước vẫn có nhưng được phân biệt. Staff activation/create-reset, role writes/new grants, Manager license, certificate delete, HTX bank và API v2 tiếp tục chờ contract. Fetch backend trong lượt tiếp không có thay đổi ref: develop953f597, Zalo dc00b2f; không invent endpoint/màn mock.

Ảnh cục bộ trong task workspace `outputs/`: `qa-dialog-fixed-360.png`, `qa-supplier-discontinued.png`, `qa-manager1-receipt-cancel.png`, `qa-manager1-water-void.png`, `qa-manager2-ocr.png`, `qa-accountant-payment.png`, `qa-accountant-allocated.png`, `qa-trader-preferences-360.png`, `qa-certificate-download.png`. Các ảnh là bằng chứng từng thời điểm, không thay thế ma trận luồng.
