# Chọn làn và hoàn tất thu hoạch hàng loạt — 12/11/2026

| Phần | Thay đổi |
| --- | --- |
| `farming-management/lane-overview.tsx`, CSS, `lane-selection.ts` | Nút Chọn/Thoát, checkbox từng làn, chọn tất cả làn đủ điều kiện, Shift chọn/bỏ một dải theo các làn đang hiện. Thoát xóa lựa chọn. |
| `cultivation-api/seeding-lane-picker.tsx`, `harvest-lane-choices.tsx` | Checkbox của sơ đồ dùng chính giá trị form; giữ chọn dải và các thao tác cũ. |
| `cultivation-api/finish-harvest-overview.tsx` | Thanh số làn đã chọn, một hộp xác nhận dùng `compressLaneNumbers`, lỗi làn 409 ngay trong hộp, thông báo thành công. |
| `cultivation-api/harvest-lanes-board.tsx` | Sơ đồ chọn hàng loạt; giữ nguyên nút hoàn tất từng làn. |
| `cultivation-api/harvest-aware-lane-overview.tsx`, `rafts-api/raft-{lane-diagram,info-tab}.tsx`, `cycles-api/cycle-progress-tab.tsx` | Sơ đồ bè/tiến độ lấy điều kiện thu hoạch hiện tại từ repository. Ngày quá khứ và chu kỳ khác chu kỳ hiện tại không có thao tác hoàn tất. Bè truyền `rowVersion` thực; màn không có phiên bản bè bỏ trường tùy chọn này. |
| `cultivation-api/finish-harvest-{contracts,model,repository}.ts`, `server/operations/cultivation-records-plan.ts` | BFF POST action `finish-harvest` → POST `/api/rafts/{raftId}/finish-harvest`; body strict `{laneNumbers, rowVersion?}`, 1–200 số nguyên khác nhau trong 1..200, quyền Create theo vùng, giữ kiểm tra CSRF/session sẵn có. Kiểm tra kết quả 200 bao phủ đúng lựa chọn, không trùng `finished`/`alreadyFinished`. |
| `cultivation-api/farming-problem.ts` | Chỉ chuyển tiếp danh sách lỗi làn hợp lệ (`laneNumber`, `reasonCode`, `message`), từ mảng JSON hoặc thuộc tính `lanes`. |

Chỉ lỗi 404 chắc chắn mới chuyển sang endpoint từng làn tuần tự. Dừng ở lỗi đầu tiên; không tự gửi lại sau timeout/kết quả chưa rõ. Hộp xác nhận giữ số làn đã hoàn tất, đã hoàn tất từ trước và còn cần xử lý/đối chiếu; đóng hộp sẽ tải lại dữ liệu trước lần chọn tiếp theo. Một lỗi 409 của endpoint hàng loạt giữ nguyên toàn bộ trạng thái, hiển thị từng làn bị từ chối.

## Kiểm tra

- ESLint các thư mục thay đổi: đạt, không cảnh báo. Sau guard ngày quá khứ và truyền phiên bản bè, lint lại đúng bốn file vừa sửa: đạt.
- Chỉ chạy `finish-harvest-model.test.ts`: 5/5 test helper thuần đạt (chọn dải, body strict, phủ đủ kết quả, điều kiện làn, lọc lỗi 409).
- TypeScript một lần do tác vụ chính thực hiện, xem báo cáo cuối phiên.
- Không chạy browser, build, test batch, cài dependency hoặc thay đổi Git; không sửa `src/features/harvest-yield/**`.
- Chưa kiểm chứng trực quan kích thước 360/1024 px, checkbox Shift trong trình duyệt hay endpoint backend thực/nhánh 404. Backend mới đang được bổ sung theo yêu cầu.
