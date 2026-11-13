# Web: bè, sự cố làn, đội thu và đơn giá — 12/11/2026

Nguồn ưu tiên: yêu cầu trực tiếp và `FARMING_RAFT_LANES_HARVEST_OWNER_DECISIONS_2026-11-12.md`; phần A/B/API còn phù hợp trong đặc tả. Không triển khai phần đơn hàng. Không sửa backend, payroll, employee-api hoặc auth.

## Kết quả

1. Bè: form tạo pop-up, sửa tại chỗ; mã đề xuất vẫn sửa được; số làn có đơn vị/stepper, dài/rộng/diện tích sống, dây từng làn và sơ đồ; giữ `size`. Khóa đổi số làn khi chưa đọc được chu kỳ hoặc có chu kỳ mở. Giữ số vật lý, chỉ thay cuối. Giữ override qua các lần gõ trung gian; lọc làn cuối khi gửi.
2. Sự cố: thao tác nằm trong dòng mở, lý do/xác nhận, tồn kho thật, một lệnh sửa kèm vật tư; ngừng làn có giống cảnh báo mất giống không số lượng. Lịch sử người/thời gian/lý do/vật tư/ảnh; ảnh lỗi gửi lại riêng, kết quả chưa chắc chắn cần đối chiếu. Chặn rời dòng/tab khi đang lưu, xác nhận bỏ nháp. 404 yên lặng. Trạng thái mới truyền qua màn thả/thu/tiến độ.
3. Thu hoạch: một bè/lô, giữ lồng lẻ và kg ước tính; chọn nhiều nhân viên, ưu tiên phân công hôm nay; chỉ gửi crew khi backend bộc lộ hỗ trợ. Hiện đội thu trong chi tiết/xem nhanh và giữ crew khi sửa phần khác của lô.
4. Đơn giá: đang xác minh ở lần cập nhật báo cáo cuối.

## Vùng mã

- `src/features/rafts-api/`: hình học/form/sơ đồ/khóa chu kỳ; incident contracts/repository/stock/form/history/board và kiểm thử.
- `src/features/cultivation-api/`: schema tùy chọn, chọn làn và chặn sự cố, đội thu/form/chi tiết, kiểm thử.
- `src/features/farming-api/`, `zones-api/`, `api-workspace/`, `farming-management/`, `history/`: projections, điểm vào editor, liên kết, guard và lịch sử dùng chung.
- `src/server/farming/`, `src/server/workspace/resource-http.ts`, `src/server/operations/cultivation-records-plan.test.ts`: hợp đồng/BFF và kiểm thử.
- `src/features/labor-api/`, BFF job-types, message catalog: phần đơn giá (cập nhật kết quả cuối).

## JSON backend cần khớp chính xác

Các trường đọc mới đều tùy chọn; trường có mặt vẫn phải đúng kiểu. Không dùng dữ liệu mẫu cho UI sản phẩm.

### Hình học

- Request giữ `size: "<L> m x <W> m"`, `laneCount`, các trường cũ; thêm `lengthM:number`, `widthM:number`, `laneLines?:[{laneNumber:number,lineLengthM:number|null}]`. **Dùng `laneLines` theo yêu cầu trực tiếp, không dùng `laneLengths` trong ví dụ spec.** `null` trả về kế thừa chiều dài bè. Không gửi `areaM2`.
- Response tùy chọn: `lengthM`, `widthM`, `areaM2`, `totalLineLengthM`; làn có `lineLengthM`, `lineLengthOverridden`, `isDamaged`, `generation`, `state`. Kích thước chưa có số đọc lại từ `size` khi đúng mẫu.
- Backend cũ được giả định chấp nhận/bỏ qua JSON bổ sung khi vẫn có `size`. Chưa kiểm chứng với runtime thật.

### Sự cố

- `GET /api/rafts/{id}/lane-history?laneNumber=N` → `{incidents:[{id,laneNumber,kind,occurredAt,byAccount?,byRole?,reason?,note?,materials?,photos?}]}`. `occurredAt` là ISO datetime có offset; `byAccount` là chuỗi hiển thị. `materials:[{itemId,itemCode?,itemName?,unit,quantity}]`; `photos:[{id?,url?,sortOrder?}]`.
- `POST .../lanes/{N}/report-damage` nhận `{rowVersion,reason}`.
- `POST .../lanes/{N}/repair-done` nhận `{rowVersion,note?,materials:[{itemId,quantity}]}`. Backend phải kiểm kho, xuất dùng liên kết bè/làn, sửa cờ hỏng và ghi audit **trong cùng giao dịch**. Web không tạo phiếu xuất tách rời.
- `POST .../lanes/{N}/retire` được hiểu là **Ngừng hoạt động**, không có thao tác gỡ/thay thế trong UI. Nhận `{rowVersion,reason}`; khi còn giống thêm `{confirmWriteOff:true,cycleRowVersion}`. Backend phải ghi sự kiện mất giống không số lượng và coi làn kết thúc khi đóng chu kỳ. Giữ quyền Owner theo phần B của spec.
- Kết quả lệnh có ít nhất một trong `incident`, `raft`, `lane`; `incident` theo shape lịch sử. Upload ảnh cần `incident.id` của sự kiện vừa lưu, kể cả kết quả ngừng hoạt động. Nếu thiếu id, web không đoán và không ghi lại sự kiện.
- `POST .../lanes/{N}/incidents/{incidentId}/photos` nhận multipart `file`, trả 201 (body có thể rỗng). Ảnh lịch sử được BFF đổi thành proxy đã xác thực, chỉ lấy file trong backend origin theo helper hiện có.
- Bật action khi làn có `isDamaged:boolean` và history endpoint đọc thành công. 404 đọc/ghi mới là trạng thái yên lặng, không crash. Vùng/làn dùng lại status 101/2001, ngừng làn 2002; `WrittenOff`/giá trị số 4 biểu diễn mất giống.

### Đội thu

- `POST /api/rafts/{id}/harvest-lots`: thêm `crew?: GUID[]`; multipart lặp trường `crew` theo cách gửi mảng hiện có. Không có field này trong request của backend cũ.
- `GET` màn thu có `supportsCrew?:boolean`. Khi chưa có cờ, `crewOptions` hoặc `crew` trong lô trả về cũng bộc lộ hỗ trợ; `supportsCrew:false` ưu tiên tắt.
- `crewOptions?:[{employeeId:GUID,employeeName:string,assignedToRaftToday?:boolean}]`: tất cả nhân viên đang làm việc được phép chọn; nên trả trong response đã phân quyền thu hoạch, để tài khoản chỉ có quyền thu vẫn chọn đội được.
- Nếu thiếu `crewOptions`, dùng workforce `lookups?day=YYYY-MM-DD` và `assignments?day=...` hiện có. Lookup được giả định trả toàn bộ nhân viên đang làm việc. Thiếu assignments chỉ mất ưu tiên; thiếu lookup 404 hiện trạng thái yên lặng; 403 giữ lỗi quyền. Đường fallback này cần quyền workforce View; web không mở rộng auth.
- Lô/chi tiết có `crew?:GUID[]`, `crewMembers?:[{employeeId:GUID,employeeName:string,employeeCode?:string|null}]`. Có metadata thì hiện tên; chỉ có id thì vẫn có liên kết hồ sơ, không đoán tên.
- Màn nhân viên hiện chỉ hỗ trợ `recordId`; helper dùng tuyến hiện hữu này. Đây là khác biệt đã ghi nhận với quy tắc liên kết bằng code trong design guidelines. Không sửa employee-api để thêm xử lý code trong tác vụ này.

## Kiểm chứng và giới hạn

- Chỉ Vitest theo tệp/thư mục đã sửa, ESLint phần đã sửa và một lần `npx.cmd tsc --noEmit -p .`; kết quả tổng cuối sẽ cập nhật sau khi phần 4 xong.
- Không chạy build/full suite, không mở trình duyệt, không thêm dependency hoặc thực hiện lệnh Git đổi trạng thái.
- Chưa xác minh trực quan 360px/1024px, upload ảnh hay giao dịch trừ kho với backend thật. Kiểm thử jsdom/BFF không chứng minh backend đã triển khai.
- Workflow markdown tại `%USERPROFILE%/.Codex/rules/` được yêu cầu nhưng không tồn tại; chỉ có `default.rules`. Tiếp tục theo AGENTS và giới hạn trực tiếp của người dùng. Ghi chẩn đoán cục bộ trong `docs/learning/` (ignored).

## Câu hỏi mở

- Backend agent cần xác nhận/triển khai các shape bổ sung trên, đặc biệt `laneLines`, ngừng làn qua `retire`, sửa kho nguyên tử và `crewOptions`/`crewMembers`.
- Quy tắc quyền nghiệp vụ mới không được mở rộng ở Web; backend vẫn kiểm trên mọi lệnh.
