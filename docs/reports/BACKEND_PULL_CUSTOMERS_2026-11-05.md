# Cập nhật backend và màn khách hàng — 05/11/2026

- Đã fetch các remote branch và pull fast-forward `develop` tại `D:/Đồ_án/omts-backend` lên `f8e42428`; worktree backend sạch trước pull. Không thay runtime hoặc migration database.
- Develop nay đã tích hợp customers/products/purchase requests kg, receiving bank account, audit search, zones/licenses, purchasing và water model mới. Nhận định báo cáo cũ rằng tất cả vẫn ở feature branch đã lỗi thời.
- Web thêm `/workspace/customers` qua resource/BFF hiện có: danh sách, tìm kiếm, phân trang, chi tiết, tạo, sửa; menu theo `CUSTOMERS` View/Create/Edit; Owner theo cơ chế hiện hành.
- Schema nhận `CustomerSaved.customer`; khóa số điện thoại liên kết trader, khóa sửa hồ sơ đã gộp; hiển thị công nợ và tài khoản liên kết từ API.
- Chưa nối merge-preview/merge, không có xóa customer trong API. Không mở thao tác gộp không thể hoàn tác ở đợt này.
- Chưa đồng bộ contract sản phẩm/yêu cầu mua kg; chu kỳ/vật tư/thả giống/thu hoạch vẫn cần đọc nhánh tương ứng. Không tuyên bố toàn bộ màn đã hoàn thành.
- Không chạy test theo yêu cầu người dùng. `npx tsc --noEmit` đã đạt sau khi thêm module; chưa kiểm CRUD live. Không commit/push/merge develop Web.
