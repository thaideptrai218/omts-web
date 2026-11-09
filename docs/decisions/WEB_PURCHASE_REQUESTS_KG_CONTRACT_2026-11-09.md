# Yêu cầu mua hàu: web theo hợp đồng kg của backend develop (09/11/2026)

## Xung đột

- `WEB_PURCHASE_STAFFING_2026-11-04.md` ghi quyết định cũ: yêu cầu mua tính theo lồng, Chủ HTX lập kế hoạch nhân lực, mời nhân viên, chỉ nhận đơn khi đủ người (trạng thái `AWAITING_STAFF`). Quyết định này dựa trên một nhánh backend chưa được merge.
- Backend develop (`PurchaseRequestsController`, `MePurchasesController`) tính theo kg, không có trạng thái chờ nhân viên và không có endpoint `/staffing`, `/staffing-employees`, `/api/me/purchase-shifts`.
- Người dùng đã chốt: web phải theo backend đã merge. Màn Chủ HTX/nhân viên trước đó nhận HTTP 502 `invalid-response` vì schema web theo lồng.

## Đã đổi

- Hợp đồng `PurchaseRequestView`: Customer (tên, SĐT, công nợ), sản phẩm, `requestedKg`, `pickupDate`, ghi chú, `statusId`/`status`, cờ `fulfilled`, `response`, `cancelReason`, `sendings` (kênh + trạng thái chuyển phát), `rowVersion`.
- Danh sách lọc theo `statusId` (3201 chờ phản hồi, 3202 đã chấp nhận, 3203 bị từ chối, 3204 đã hủy); "Đã hoàn thành" chỉ là cờ `fulfilled` của đơn đã chấp nhận.
- Chủ HTX trả lời một lần khi đơn còn "Chờ phản hồi": `POST /api/purchase-requests/{id}/accept` (kg chấp nhận <= kg yêu cầu, ngày lấy từ hôm nay, trả sau, ghi chú, `rowVersion`) hoặc `/decline` (lý do bắt buộc). Chủ HTX không hủy đơn; hủy là việc của thương lái qua `/api/me`.
- Nhân viên/quản lý vùng chỉ xem (quyền `PURCHASE_REQUESTS` View), không trả lời.

## Đã gỡ khỏi web

- Màn lập kế hoạch nhân lực, lời mời nhân viên, `StaffingSummary` (file `purchase-staffing.tsx` và test).
- Biểu mẫu thương lái gửi yêu cầu theo lồng cũ trong `sales-editors.tsx` (thương lái dùng `src/features/trader-purchases`).
- Phần "Lời mời ca" trong "Công việc và nghỉ phép" (`MyPurchaseShifts`).
- Khỏi whitelist BFF: `plan-staffing`, `staffing`, `staffing-employees`, `respond-shift`, `purchase-shifts`, `respond` kiểu cũ. Mọi route này nay bị từ chối.
- Mã nguồn cũ vẫn lấy lại được từ lịch sử git (commit trước thay đổi này).

## Khôi phục nhân lực

Chỉ khôi phục sau khi nhánh backend có staffing/shift được merge vào develop và chốt lại hợp đồng (đơn vị lồng hay kg, trạng thái chờ nhân viên). Khi đó phải xin xác nhận lại người dùng theo AGENTS.md vì đổi bước nghiệp vụ và trạng thái.

## Ghi chú còn mở

- `GET /api/me/workforce`, `/api/workforce/*`, `/api/me/leave-requests` không có trong controller develop (chỉ có `attendance-settings`); phần nghỉ phép/ngày công vẫn giữ nguyên nhưng cần đối chiếu riêng.
