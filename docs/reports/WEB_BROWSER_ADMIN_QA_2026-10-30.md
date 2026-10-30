# Browser QA — các luồng quản trị còn thiếu, 30/10/2026

Tiếp nối [ma trận theo role](WEB_BROWSER_ROLE_QA_2026-10-30.md), lượt này kiểm bằng UI ở **127.0.0.1:3003**, backend QA8081/RedisDB3. PR #3 giữ draft, chưa merge. Không ghi nghiệp vụ vào DB8080.

## Đã chạy bằng browser

| Luồng | Kết quả xác minh |
| --- | --- |
| Nhân viên mới | Tạo `QA browser employee 20261030`, phone giả0926100031, DEMO-01, bộ ngân hàng giả QA Bank/0001234567/QA BROWSER EMPLOYEE; giữ số0 đầu |
| Liên kết tài khoản | Liên kết tài khoản QA đang Locked, sau đó unlink khi còn nháp ghi chú; nháp giữ nguyên và Save tiếp thành công với phiên bản mới. Không mở khóa/cấp grant |
| Tình trạng việc làm | Nghỉ việc với ngày30/10 → Đã nghỉ việc, ngày hiển thị đúng → Đi làm lại → Đang làm việc; không thay trạng thái tài khoản |
| Hồ sơ trùng | Tạo lại cùng tên/phone bị chặn; Đối chiếu đọc đúng hồ sơ, vẫn giữ nháp; chỉ khi bấm Mở hồ sơ này và bỏ nháp mới chuyển sang hồ sơ đã lưu |
| Xung đột hai tab | Hai tab đọc cùng phiên bản. A lưu ghi chú trước, B Save nhận MSG06; nháp B giữ, GET so sánh hiển thị A nhưng Save vẫn disabled. Chọn Đã đối chiếu/giữ nháp rồi Save lần nữa mới ghi B |
| Quản lý tài khoản | Đổi tên tài khoản `qa.audit.1793323694230` thành `QA browser account 20261030`; username/phone/status giữ nguyên. Dialog mở khóa yêu cầu lý do, Quay lại không ghi; Locked được giữ |
| Lịch sử quyền | Tài khoản QA chỉ có grant đã thu hồi; lọc Hiệu lực hiện rỗng. Không thu hồi seed grant hoặc khôi phục quyền để tạo ca test |
| Vai trò | Đọc ma trận Zone Manager và mở summary Tài khoản đang dùng; danh sách tài khoản và phạm vi hiển thị từ API; không mở role writes đang chờ contract |
| HTX | Hủy nháp → Tiếp tục sửa giữ website QA → Lưu hồ sơ mở preview → Xác nhận lưu → reload thấy giá trị đã lưu. Sau đó lưu lại website gốc `https://htx-vandon.example.com` |
| Logo HTX | Tải bản sao logo gốc qua browser; upload ảnh QA → xóa có xác nhận → trạng thái Chưa có logo → upload lại bản gốc. Download sau khôi phục có SHA256 trùng bản gốc |

Hồ sơ nhân viên QA cuối lượt đang làm việc, không liên kết tài khoản, ghi chú `QA concurrent tab B retained`. Tài khoản QA vẫn Locked và grant đã thu hồi. Các seed account/credential/contact/grant không đổi. Website/logo HTX đã hoàn nguyên; các phiên bản/audit QA vẫn được backend lưu.

## Lỗi được sửa trong lượt này

Nhập riêng tên ngân hàng rồi Save bị chặn đúng, nhưng danh sách lỗi hiện hai câu MSG01 giống nhau, không nêu trường nào thiếu. Bản sửa thêm nhãn trường vào lỗi local và hướng dẫn ngân hàng vào aria-describedby: trống cả nhóm hoặc nhập đủ; số6–20chữ số, giữ0đầu; tên ngân hàng/chủ tài khoản tối đa100ký tự. Đây là diễn giải schema hiện có, không đổi validation, endpoint hoặc nghiệp vụ.

Test hồi quy kiểm đúng hai trường thiếu, aria-invalid/description và focus ô số tài khoản; không phát lệnh ghi. Các lỗi server theo nhóm vẫn hiển thị theo contract, không đoán thành lỗi con.

Replay sau build: thiếu trường hiện đúng hai thông báo có nhãn và focus `bankAccount.accountNumber`; CSS360: dialog clientWidth/scrollWidth328/328, CSS1024:751/751, không tràn ngang. Nháp validation đã bỏ, không tạo thêm nhân viên. **13 test employee-api PASS**, lint/typecheck/build41routes và61 built-product assertions PASS. Test cũ ban đầu tìm nguyên câu không có nhãn nên fail; đã đổi assertion sang câu có tiền tố Vùng làm việc, không đổi production để né lỗi. Full suite2874 của lượt trước là bằng chứng lịch sử, không gắn thành kết quả full của source mới này.

## Bổ sung luồng vùng, bè, vật tư và ngưỡng

- Tạo vùng `QABROWSER30`/`QA browser farm 20261030`, bè `QA-BROWSER-B30` với2làn20m/18m. Upload ảnh QA, đóng dialog ảnh đồng bộ rowVersion cha; sửa làn1thành21m lưu thành công, layoutv2 và lịch sửv1 còn nguyên. Sơ đồ không có chu kỳ hiện Chưa thả.
- Giấy phép `QA-BROWSER-LIC-30`: tạo kèm ảnh QA, sửa cơ quan cấp không thay file; gia hạn/thay thế sang `QA-BROWSER-LIC-31`, điều hướng hai chiều giữ hồ sơ cũ. Bản31 cuối cùng hiệu lực01/11/2026–30/10/2031, tại30/10 hiển thị Chưa có hiệu lực.
- Tạo/sửa vật tư `QA-MAT30`/`QA browser raft material`, nhómRaftMaterial. Tạo phiếu bị chặn khi thiếu bè; chọn bè QA rồi hoàn thành `PR-20261030-030`2.000đ. Panel chi phí bè hiện đúng2.000 và phiếu căn cứ030. Hủy030 có lý do/xác nhận thì panel không còn số liệu chi phí.
- Ngừng/khôi phục vùng QA qua dialog; Owner lưu ngưỡng riêng pH7–9, độ mặn18–32 sau Quay lại giữ nháp rồi Đồng ý. Mở lại xác minh persistence; không áp dụng toàn bộ vùng. Cuối lượt vùng/bè/vật tư QA đều Discontinued, phiếu030Cancelled; ảnh/giấy phép/layout/ngưỡng/audit được giữ để tester đối chiếu.
- Phiên Owner hết hạn thật trong lúc chỉnh giấy phép: mutation401 bị khóa, không replay. Tab mới qua Tiếp tục→login, đọc lại canonical rồi mới lập lượt sửa mới. Form date do công cụ fill đổi DOMvalue nhưng chưa cập nhật Reactvalue attribute; thao tác ArrowUp/ArrowDown phát sự kiện nhập thật, sau đó canonical lưu đúng ngày. Đây là giới hạn harness đã đối chiếu, không sửa validation/date logic sản phẩm.
- Cuối lượt xác minh form Đăng nhập hiện lại sau logout; đóng hai tab QA tạm, viewport reset. Console tab replay validation và tab farm cuối không có error/warn; không coi là mọi đường chạy đều không lỗi.

## Giới hạn

Không coi các kết quả trên là mọi race/offline đã kiểm. Mở khóa, grant revoke và thay credential/contact OTP chưa được ghi lại bằng browser trong lượt này; không thay quyền seed chỉ để tạo dữ liệu. Bằng chứng HTTP/component trước được ghi riêng. Staff activation/create-reset, fixed roles/new grants, Manager license, certificate delete, HTX bank và APIv2 vẫn chờ contract.

Fetch backend trong lượt này vẫn develop953f597/Zalo dc00b2f. Không thêm màn dùng endpoint đoán hoặc fallback mock. Ảnh cục bộ task outputs: `qa-employee-unlink-saved.png`, `qa-employee-real-conflict.png`, `qa-cooperative-restored.png`, `qa-employee-validation-360.png`, `qa-employee-validation-1024.png`, `qa-license-future-dates.png`, `qa-raft-layout-v2.png`, `qa-raft-material-cost.png`, `qa-owner-threshold-persisted.png`.
