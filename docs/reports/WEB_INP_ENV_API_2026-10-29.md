# Phiếu nhập, thanh toán nhà cung cấp và đo nước — 29/10/2026

Thực hiện theo yêu cầu nối API thật để tester chạy xuyên suốt INP/ENV. Nguồn đối chiếu: backend develop953f597 đang chạy Docker8080; SRS v5.8 UC26; Jira206/207 (frontend scope),209/211 (INP/ENV contract) cùng các quyết định Web đã duyệt. Không sửa backend, migration/seed, grant hoặc Jira. Tiếp tục cùng nhánh feature/OMTS-132-web-foundation và PR#3 draft; không merge develop.

## Chức năng đã ghép

| Màn | Luồng chạy bằng API thật |
| --- | --- |
| `/operations/purchase-receipts` | Tìm/lọc/phân trang, tổng tiền từ backend; lưu nháp tối thiểu, sửa nháp, hoàn thành nguyên tử hoặc lưu-và-hoàn thành; hóa đơn JPEG/PNG/PDF; xem lô giống phát sinh; hủy có lý do và lựa chọn xử lý tiền; sao chép thành nháp; trả hàng và xem phiếu trả; chi phí vật tư bè; xuất Excel. |
| `/operations/supplier-payments` | Lịch sử/bộ lọc/tổng tiền; công nợ theo nhà cung cấp và phiếu; ghi khoản tiền sau bước đối chiếu trong form; không vượt nợ; giữ key chống trùng theo lượt ghi; phân bổ khoản tiền tách khỏi phiếu đã hủy vào phiếu hoàn thành cùng nhà cung cấp. Không có endpoint hủy riêng khoản tiền; xử lý qua hủy phiếu như backend. |
| `/operations/water` | Chọn vùng, lịch sử/trạng thái/phân trang, nhập tay hoặc ảnh/OCR lưu nháp, nhập tay kèm ảnh, xác nhận và cảnh báo; đọc lại ảnh khi có quyền; hiệu chỉnh thành version mới, hủy có lý do, lịch sử phiên bản và ảnh/OCR gốc; chỉ báo người đang sửa/heartbeat/stop; ngưỡng riêng vùng hoặc áp dụng mọi vùng đang dùng cho Owner; biểu đồ trung bình/min/max/số lần, kỳ thiếu dữ liệu; Excel. |

Menu và nút dùng function/action/scope thực, không suy quyền từ tên vai trò. Quản lý vùng dùng INP/ENV trong vùng được cấp; kế toán đọc phiếu và ghi thanh toán khi có SUPPLIER_PAYMENTS ở All zones; Trader bị từ chối. Owner sửa ngưỡng; các actor khác chỉ đọc khi có View nước. Quyền Export được kiểm riêng cùng View.

## BFF và dữ liệu

Repository client → `/api/operations/[area]` → kế hoạch endpoint cố định, kiểm schema/query/body/CSRF và G1 session hiện có. Bearer không đi ra browser. Không nhận URL hoặc HTTP method tùy ý. Recheck phiên sau đọc JSON hoặc binary; không cache nội dung riêng tư. File từ local storage được lấy sau khi backend đã kiểm quyền bản ghi cha, chỉ chấp nhận đường dẫn ký `/api/files/local/` cùng backend origin, không chuyển Authorization vào file request. Browser nhận đường dẫn BFF, không nhận chữ ký lưu trữ. Upload đếm byte stream thực, có hạn số tệp/kích thước/deadline; backend vẫn sniff định dạng thật. Export chỉ chuyển XLSX, tối đa32MB, tên tệp cố định; evidence chỉ JPEG/PNG/PDF với sandbox/nosniff.

MSG06 giữ bản nháp, không tự gửi lại. Người dùng tải bản mới để đối chiếu rồi chủ động chọn dùng bản mới hoặc giữ nháp với version đã đối chiếu. Kết quả ghi chưa rõ không tự retry; payment/water giữ payload và idempotency key của lượt đang chờ. OCR thất bại vẫn có Draft và ảnh, không tự xác nhận. Ngưỡng dùng khi xác nhận được hiển thị theo snapshot backend; đổi ngưỡng hiện tại không viết lại cảnh báo cũ. Thời gian nhập được gửi kèm +07:00.

Rà soát bổ sung thấy backend AccountAccess/ZoneAccessGuard và INP/ENV services chưa áp dụng DataScope.OwnRecords. Web fail closed với action có phần OwnRecords chưa được AssignedZone cùng phạm vi bao phủ; không coi OwnRecords là quyền toàn vùng. Đây là giới hạn contract còn cần backend xử lý. Các vai trò demo Manager/Accountant đã kiểm dùng AssignedZone. Không tự sửa quyền hoặc backend để bỏ qua.

## Bằng chứng chạy thật

- INP: tạo nháp không dòng; sửa thêm giống/vật tư bè; stale version409MSG06; upload và đọc hóa đơn; hoàn thành tạo lô giống; trả một phần và đọc chi tiết phiếu trả; ghi thanh toán/chống trùng; chặn trả quá nợ400MSG45; kiểm công nợ theo phiếu; chặn hủy phiếu đã có trả hàng; chi phí bè sau trả; copy/cancel và Excel thực (ZIP/XLSX).
- Hủy phiếu giữ tiền → khoản chưa phân bổ → copy/complete phiếu mới → allocate → kiểm số còn nợ → hủy phiếu với cancelPayments=true phản ánh trạng thái khoản tiền.
- ENV: tạo vùng QA riêng và ngưỡng riêng; Draft → Confirmed vượt ngưỡng → đổi ngưỡng hiện tại → correction v2 vẫn dùng snapshot cũ → stale409MSG06 → void. OCR provider Fake đang cấu hình của backend trả Success; ảnh và với-photo thực qua storage/BFF; recognize-again, editing start/stop, history/chart/Excel. Sau void hết bản hiện tại, chart của vùng QA có count0.
- Manager xem nước vùng được cấp; đọc record nước vùng QA khác403, phiếu vùng khác403, thanh toán403. Accountant thanh toán200, nước403, sửa/hoàn thành phiếu403. Trader ba nghiệp vụ403; anonymous401.
- Browser Owner: tạo nháp tối thiểu, upload hóa đơn có link; chọn ảnh bằng file chooser native, OCR → xem/đối chiếu → xác nhận → hiệu chỉnh v2. Popup1024px hiển thị cả v1/v2 và ngưỡng cũ; màn lịch sử360px dùng được. Ảnh bằng chứng ở outputs của chat.
- Browser Accountant: menu không có Đo nước; phiếu nhập không có Tạo/Export khi thiếu action tương ứng. Ghi1.000 đồng vào phiếu QA qua panel đối chiếu → Đồng ý ghi nhận → thông báo thành công và đúng một dòng QA-UI-FINAL-29-10 trong lịch sử; số tổng tăng1.000 đồng. Khoản QA-UI-29-10 trước đó cũng đã được ghi thành công sau native confirm, không gửi lại khoản đó khi phục hồi tab.

Không reset DB demo: hai phiếu Completed QA có trả hàng/thanh toán được giữ để xem lịch sử; các phiếu của ca hủy/allocate đã Cancelled. Vùng ENV QA đã ngừng dùng, các bản đo hiện tại trong vùng đó đã void; có bản corrected giữ lịch sử. Browser tạo thêm một phiếu nháp có hóa đơn QA và phép đo OCR/hiệu chỉnh trong DEMO-01. Danh sách ID của từng lượt lưu trong learning ignored; không commit cookie/token/khóa.

## Giới hạn

Đây là tích hợp với backend local và Fake OCR provider, không phải bằng chứng OCR ngoài đời hoặc deployment TLS. File proxy hiện hỗ trợ Local storage của Docker demo; AzureBlob/SAS cần allowlist storage origin riêng trước khi triển khai. Không thêm hàng đợi offline, không tự refresh phiên; hết access token cần đăng nhập lại. Các endpoint phụ của module khác và các nghiệp vụ SRS chưa có API vẫn giữ phạm vi trước đó.

## Kiểm cuối

Full suite với `OMTS_TEST_REDIS_URL=redis://127.0.0.1:6380/2`:231 file,2.556/2.556 test PASS,0 skip. Có hồi quy draft tối thiểu, giữ nháp/rebase sau MSG06, không tự replay và giữ payload/key của payment, OCR lỗi vẫn chờ human confirm, version cũ không sửa/void, expiry401 sau commit, scope/OwnRecords, file authorization/SSRF, giới hạn byte/deadline và CSRF. Báo cáo máy lưu trong learning ignored. `npm run lint`, `npm run typecheck`, `npm run build`29/29 và `npm run test:session-pages`36 assertions chạy tuần tự trên source cuối đều PASS. Không dùng các kết quả local này để tự đánh GitHub CI xanh hoặc Jira Done.
