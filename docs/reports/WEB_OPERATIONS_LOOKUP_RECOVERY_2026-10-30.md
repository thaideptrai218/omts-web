# Hoàn thiện INP/ENV — tải lại danh mục lỗi, giữ nháp

Ngày30/10/2026. Chỉ QA3003/backend8081/RedisDB3; không merge. Backend fetch vẫn develop953f597/Zalo dc00b2f, không có module API mới. Dùng lại endpoint/permission hiện tại, không thêm mock fallback.

## Tái hiện

Manager1 mở Tạo phiếu nhập, nhập ghi chú chưa lưu. Kiểm đúng container API QA8081 theo ID/name/project/service/image rồi tạm dừng riêng container đó; SQL và API8080 giữ nguyên. Chọn vùng Ngọc Vừng làm lookup bè lỗi. Bật lại API ngay; form vẫn giữ ghi chú/vùng nhưng chỉ có Chưa chọn bè và không có nút thử lại lookup. Reload page hoặc đổi/đặt lại vùng không phải cách phục hồi phù hợp cho nháp đang nhập.

Container QA đã chạy lại. Restart làm trống Fake inbox trong bộ nhớ theo thiết kế, không reset database; không có lượt OTP đang được kiểm trong ca này. Không gửi lệnh Save/payment/measurement trong ca tái hiện.

## Các màn bổ sung

- Phiếu nhập: khi danh mục vùng/supplier/vật tư/bè của bộ lọc lỗi, Tải lại danh mục phiếu nhập chỉ đọc lại các danh mục lỗi. Bộ lọc giữ nguyên.
- Form phiếu: Tải lại danh sách bè giữ zoneId/status101 và toàn bộ dòng hàng/ghi chú. Không thay lựa chọn bằng một mặc định mới.
- Thanh toán: Tải lại công nợ theo phiếu đọc lại đúng supplier hiện tại, giữ số tiền/ngày/method/reference đang nhập.
- Đo nước: Tải lại danh sách vùng giúp chọn vùng sau lỗi danh mục ban đầu; không tự chọn vùng hoặc ghi phép đo.

Các nút do người dùng bấm, chỉ GET; disabled khi đang tải hoặc đang ghi. Không retry lệnh ghi, không reset mutation.blocked/uncertain, không đổi validation/quyền/scope/session hoặc offline queue.

Trong ca kế toán thật còn thấy GET công nợ mất mạng bị báo như một lượt ghi chưa rõ kết quả. Sửa OperationsRepository chỉ đánh dấu uncertain cho request ghi (có body), giữ nguyên tất cả trường hợp write401/5xx/network/invalid-success. GET401/5xx/network/invalid-success là lỗi đọc, có thể đọc lại có chủ ý; không phát lại tự động. Đây là cùng quy tắc đã dùng ở generic workspace trong báo cáo role-audit, không phải thay chính sách unknown-write.

## Kiểm tra

Trước sửa6test fail đúng vì thiếu các nút retry. Thêm7regression: lỗi riêng từng danh mục3ca, bè giữ zone/notes/quantity, payment giữ supplier/amount/reference, vùng nước ban đầu và lookup thành công không mở khóa một Save unknown. Thêm7outcome cases phân biệt read/write; trước sửa3read cases fail đúng uncertain=true. Nhóm operations/action-dialog6files46PASS, lint/typecheck PASS. Build cuối41routes và61built-product assertions PASS. Fixture được phân biệt với bằng chứng gián đoạn backend thật.

## Browser QA3003 sau sửa

- Manager1: API bè bị gián đoạn rồi phục hồi; bấm Tải lại danh sách bè nạp B1-01…B1-08. Supplier, ghi chú, vật tư, số lượng1 và đơn giá1.000 giữ nguyên. Chọn B1-01 được. Đóng → Đồng ý bỏ nháp; không Save.
- Kế toán, bản build cuối: nhập1.000 đồng, Chuyển khoản, mã `QA debt lookup giữ nháp`; API8081 bị gián đoạn đúng lúc chọn supplier QA browser Manager2. GET lỗi hiện câu lỗi thao tác thông thường, không còn câu unknown-write. API được bật lại ngay; giao diện vẫn chờ người dùng bấm tải lại. Bấm tải lại → PR-20261030-029 còn nợ2.000, chọn được phiếu, amount/method/reference nguyên vẹn. Đóng → Đồng ý, không ghi khoản tiền.
- CSS360 và1024 trên đúng tab19: dialog clientWidth/scrollWidth lần lượt328/328 và751/751; nút retry nằm trong dialog. Reset viewport sau kiểm tra. Ảnh native trước/sau phục hồi lưu trong output QA cục bộ; không đưa ảnh chứa dữ liệu QA vào Git.
- Manager2: chỉ có Minh Châu trong vùng đo nước, lịch sử29 bản ghi và biểu đồ tải thật. Form nhập pH8 → Đóng → Quay lại giữ8 → Đóng → Đồng ý bỏ nháp; không gửi phép đo.
- Owner: form phiếu nhập đọc đủ2 vùng, supplier và vật tư; form nguyên trạng đóng trực tiếp. Trader `thuonglai1`: URL thanh toán bị chặn, hồ sơ cá nhân vẫn đọc được. Đây là kiểm tra bổ sung, không thay ma trận đầy đủ ở các báo cáo role trước.

Mọi phiên kiểm thử đã logout. API8081 và cả Web3002/3003 chạy lại; SQL/DB8080 không thay đổi. Console cuối không có error/warn. Không tạo receipt/payment/measurement mới, không đổi credential/grants. Đổi mật khẩu cuối luồng recovery vẫn chưa kiểm theo lựa chọn trước của người dùng; các module thiếu API và hợp đồng đang chờ vẫn giữ trong project context. Chưa merge.
