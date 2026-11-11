# 06 — Xử lý lỗi

## Mã thông báo
- Catalog: `src/shared/messages/message-catalog.ts`, hai họ mã:
  - SRS `MSG01` … ~`MSG69` (MSG01 validation, MSG02 forbidden, MSG03 trùng, MSG04 gián đoạn dịch vụ, MSG06 xung đột có `{user_name}`/`{time}`, MSG11 đang dùng, MSG12 đăng nhập sai, MSG13 tài khoản bị khóa, MSG16 mã sai/hết hạn, MSG17 mật khẩu hiện tại sai, MSG19 phiên hết hạn, MSG61, MSG67–69).
  - Legacy `MSG-GEN-*`, `MSG-ACCOUNT-*`, `MSG-WATER-*`, `MSG-PURCHASE-*`, `MSG-LABOR-*`, cộng mã không đánh số `NO_VERIFIED_EMAIL`, `TOO_MANY_REQUESTS`.
- `backend-message-code.ts` ánh xạ mã legacy sang mã MSG ngữ nghĩa (vd `MSG-GEN-01` → `MSG01`, `MSG-GEN-08` → `MSG02`, `MSG-ACCOUNT-05` → `MSG12`); khi có cả hai thì mã mới thắng. `isSrsMessageCode` chỉ đúng với mã legacy đã ánh xạ; `knownBackendMessageCode` chỉ nhận thành viên catalog.
- `shared/http/map-api-error.ts` hạn chế mã cho phép theo status: 400 {MSG01, 16, 17, 20}, 403 {MSG02, 13, 67, 68}, 409 {MSG03, 06}, 423 {MSG69}. Mã thiếu tham số placeholder → rơi về `MSG04`; không bao giờ bịa tham số.
- `shared/http/api-problem.ts` chỉ đọc `code`, `legacyCode`, `params` có giới hạn, `currentRowVersion` từ body lỗi.
- `workspace-error.ts` sinh chữ tiếng Việt theo status: 401 phiên hết hạn (biến thể không chắc chắn nhắc đăng nhập lại và đối soát dữ liệu trước khi thử mới); 403 không có quyền; MSG06/409 "bản ghi đã đổi, tải lại; nháp được giữ"; MSG03/MSG11/MSG01 như trên; 502 lệch hợp đồng; 5xx hoặc status 0 backend không truy cập được.

## Đọc phản hồi backend (`src/server/backend/backend-response.ts`, `readBackendResponse`)
- 3xx hoặc content type không phải JSON → `invalid-response`. 204 chỉ là thành công với `logout`.
- Phản hồi không OK → `{status:"http-error", httpStatus, code?, retryAfterMs?}`. `code` chỉ lấy khi có trong `messageCatalog` (kiểm `code`, `title`, `legacyCode`, `extensions.legacyCode`); `retryAfterMs` từ header `Retry-After`; thêm projection tùy chọn `catalogueProblem`, `employeeProblem`, `invoiceConfirmation`.
- Giới hạn kích thước phản hồi 1 MiB (`MAX_RESPONSE_BYTES`). Hết thời gian transport → status `timeout` hoặc `unavailable`.
- Không chuyển tiếp chữ thông báo upstream; chữ cho trình duyệt sinh từ catalog tiếng Việt.

## Ghi không chắc chắn / không replay
- **Client** (`features/operations/repository.ts`, `workspace-repository.ts`): với thao tác ghi, `uncertain = body !== undefined && (status >= 500 || response.ok-nhưng-không-parse-được || status === 401)`; fetch ném lỗi cũng là không chắc chắn. 401 được coi không chắc chắn vì việc kiểm lại sau ghi của BFF có thể trả 401 sau khi backend đã ghi. UI phải tải lại và đối soát, không thử lại.
- **Server**: thao tác ghi lỗi có thể đã commit phía upstream; kết quả backend nói rõ "không phải chỉ thị thử lại hay bằng chứng ghi chưa xảy ra" (`backend-result.ts`). Ghi Redis có timeout không bao giờ replay (`redis-session-store.ts`); dọn dẹp đăng nhập không tuyên bố thu hồi thành công; không có retry refresh; transport không retry.
- Flow xác minh trả `{status:"error", uncertain:true}` 503 hoặc phase `unknown`, không retry.

## rowVersion / đồng thời lạc quan
- Row version backend là chuỗi base64 mờ (`employeeRowVersionSchema = z.base64().min(1)`).
- Cập nhật gửi `rowVersion` lấy từ bản ghi gốc (`api-resource-editor.tsx`: `body.rowVersion = original.current?.rowVersion`); handler resource cho phép `rowVersion` và `reason` trong body.
- Dùng ở: resource workspace, khóa/mở khóa tài khoản admin (`{reason,rowVersion}`), xóa chứng nhận (`?rowVersion=`), gỡ liên kết nhân viên (`recordVersion`), logo/cover HTX (query version URL phải bằng `record.rowVersion`).
- Xung đột hiện là MSG06 hoặc 409; UI giữ nháp và yêu cầu tải lại (`features/employee-api/employee-conflict-panel.tsx`). Metadata lỗi nhân viên chiếu bởi `employee-problem-metadata.ts`.
- Nơi backend không có version (gán nhân sự, chấm công), Web không tuyên bố bảo vệ nguyên tử.
