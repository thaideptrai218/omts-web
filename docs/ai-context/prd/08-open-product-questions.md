# 08 — Câu hỏi sản phẩm còn mở

1. **Mật khẩu demo mock**: code mock có một mật khẩu, `PROJECT_CONTEXT` (03/11) ghi tài khoản `owner/manager/manager2/ketoan/trader` với mật khẩu ngắn hơn; fixture mock hiện chưa có `manager2` và `ketoan`. Cần xác nhận tài liệu hay code đúng.
2. **`PAYROLLS` và `PAYROLL`**: `actor-label.ts` dùng `PAYROLLS`, catalog và `permissions.ts` dùng `PAYROLL` → nhãn "Kế toán" có thể sai với tài khoản chỉ có `PAYROLL`. Lỗi hay có chủ ý?
3. **OwnerOverview toàn dữ liệu mẫu**, chưa nối `DASHBOARD_*`. Tile nào là MVP? Tên vùng mẫu (Ngọc Vừng, Minh Châu) có lệch với `zone-east` trong mock không?
4. **Frame-only**: payroll (LABOR-10/11), sales-returns (CLAIM-03), ba báo cáo (REPORT-01/02/03) chưa có endpoint; chưa biết backend dự kiến khi nào.
5. **Sửa/hủy hóa đơn** phụ thuộc nhánh `feature/OMTS-224-correct-cancel` chưa merge; MSG-SALE-20/21 chưa có trong catalog web.
6. **Chuỗi thu hoạch → cân → giao dịch** còn thiếu API; nhật ký hoạt động Manager chỉ ghi chú chờ backend.
7. **Mock thiếu route**: `/workspace/*`, `/operations/*` ngoài 3 area demo, `/operations/customer-debts` trả 404 ở mock. Mock đủ cho demo PRD hay chỉ Vercel mock?
8. **`purchasing-v2`**: cờ `NEXT_PUBLIC_OMTS_PURCHASING_CONTRACT=v2` mặc định tắt? v2 có thay hẳn v1 không?
9. **Vercel production** chạy mock vì thiếu backend HTTPS và Redis hosted; chưa rõ kế hoạch.
10. **`/system/cooperatives/new`**: nav API không có mục này, màn API báo "không có quyền". Provisioning HTX có thuộc phạm vi PRD không (hiện chỉ mock)?
11. **Yêu cầu mua**: kg (đã merge) vs số lồng + staffing (nhánh chưa merge) — xác nhận lại khi nhánh merge.
12. **`/` cho người đã đăng nhập**: có chuyển sang `/dashboard` không (đọc phiên ở trang công khai)?
13. **Thương lái thấy giá trên hóa đơn của mình không**; lương có cho trả từng phần không (B2/B3).
