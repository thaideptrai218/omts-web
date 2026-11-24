# Nghiên cứu: phân quyền kiểu KiotViet so với OMTS (20/11/2026)

**Trạng thái:** CHỈ NGHIÊN CỨU, chưa sửa code. Chờ chủ dự án chọn hướng (mục 5). Nguồn KiotViet đã chuyển sang md kèm ảnh tại [`kiotviet-thiet-lap/`](kiotviet-thiet-lap/):
- `01-thiet-lap-cua-hang.md`: toàn bộ khu vực Thiết lập (Quản lý, Tiện ích, Cửa hàng, Dữ liệu, Thiết bị).
- `02-quan-ly-nguoi-dung.md`: tài khoản người dùng, vai trò, phân quyền (trang chính cho việc này).
- `03-phan-quyen-nguoi-dung-theo-nhom-hang.md`: giới hạn quyền theo nhóm hàng.
- `04-quan-ly-chi-nhanh.md`: chi nhánh (tương đương vùng nuôi của OMTS).

## 1. KiotViet làm thế nào

| Điểm | KiotViet |
|---|---|
| Màn hình | Thiết lập → Cửa hàng → **Quản lý người dùng**, hai tab: **Tài khoản người dùng** và **Quản lý vai trò**. Khung gợi ý bên phải |
| Tài khoản | Tạo: tên hiển thị, tên đăng nhập, mật khẩu, chi nhánh làm việc, vai trò; tùy chọn "xem thông tin chung" và "xem, sửa giao dịch và báo cáo cuối ngày của nhân viên khác"; **giới hạn thời gian truy cập** theo thứ trong tuần và khung giờ |
| Phân quyền | Nút **Phân quyền → Chỉnh sửa** trên một tài khoản: chọn **chi nhánh** → chọn **vai trò** → hệ thống hiện các quyền mặc định của vai trò, **tích hoặc bỏ tích từng quyền** để tùy chỉnh riêng cho người đó |
| Quy tắc | Một người dùng có thể có quyền trên **nhiều chi nhánh**; trên **một chi nhánh chỉ một vai trò**. Lưu quyền xong người dùng **bị đăng xuất** để áp dụng |
| Vai trò | **Tùy biến hoàn toàn**: tạo vai trò mới (đặt tên, tích quyền), sửa, xóa (chỉ khi không ai đang dùng). Có vai trò mặc định (Quản trị chi nhánh, Nhân viên thu ngân, Kế toán...) |
| Vòng đời | Ngừng hoạt động / Cho phép hoạt động / Xóa (giữ giao dịch cũ), Sao chép người dùng (giữ quyền và thời gian truy cập), Lọc theo tên, SĐT, email, chi nhánh, vai trò, trạng thái, tùy chỉnh cột |
| Phạm vi dữ liệu | Tùy chọn **theo nhóm hàng**: người dùng chỉ thấy hàng, giao dịch, đối tác, báo cáo thuộc nhóm được cấp; bật giới hạn thì tự bỏ các quyền nhạy cảm (giá, khuyến mại, báo cáo); giao dịch hiện khi 100% sản phẩm thuộc phạm vi |
| Kiểm soát | **Lịch sử thao tác** (ai làm gì, lọc, xuất file), khóa sổ theo chi nhánh, bảo mật 2FA |

## 2. OMTS hiện có (đã kiểm trong code và md)

- **Loại tài khoản** `SubjectType` ở `Accounts`: Chủ HTX (toàn quyền), Nhân viên, Thương lái. Quyền nhân viên nằm ở bảng **`AccessGrants`**: một dòng là (tài khoản, vai trò, vùng hoặc tất cả vùng, trạng thái Có hiệu lực / Đã thu hồi).
- **Vai trò cố định** (`FixedRoles.cs`): Quản lý vùng, Kế toán; ma trận quyền là **hằng số trong code, chỉ đọc**. Quyết định 27/10 và D1 (02/11): không tạo, sao chép, đổi tên vai trò. Nguồn: `docs/decisions/WEB_FIXED_ROLES_DECISION_2026-10-27.md`, `WEB_BACKEND_21_23_ALIGNMENT_PROPOSAL_2026-10-31.md`.
- **Phạm vi theo vùng** (BR-FARM-08): quyền của vai trò chỉ áp dụng trong các vùng của cặp vai trò–vùng; bản ghi không có vùng thì chỉ theo vai trò.
- **Kế toán:** chủ dự án chốt 19/11: chỉ **một** Kế toán và áp dụng **toàn HTX**.
- **Web:** màn Phân quyền chỉ có đọc lịch sử và thu hồi trong chế độ API thật. Đường **thêm** phân quyền mới được thêm ngày 19/11 (form "Thêm phân quyền", BFF `POST /api/account-grants/create`) sau lỗi gán vùng mới cho `quanlyvung1` lúc demo. Backend có sẵn `POST /api/accounts/{id}/grants`.
- **Đã có và dùng được:** nhật ký thao tác (`/api/audit-events`, chỉ Chủ HTX), phiên theo thiết bị, thu hồi phiên, ngừng hoạt động và kích hoạt lại tài khoản.

## 3. Khoảng cách (KiotViet có, OMTS chưa hoặc khác)

| # | KiotViet | OMTS | Mức khó | Ghi chú |
|---|---|---|---|---|
| G1 | Hai tab Tài khoản / Vai trò trong một màn | Phân quyền, tài khoản rải ở nhiều màn | Thấp (chỉ web) | Gom lại theo bố cục KiotViet |
| G2 | Chi nhánh → vai trò trong một form chỉnh sửa | Có form thêm riêng, mới làm | Thấp | Đã có API |
| G3 | Xem **ma trận quyền** của vai trò trước khi cấp | API trả ma trận, web chưa có màn "Vai trò" đẹp | Thấp | Chỉ đọc; đủ cho demo |
| G4 | Tích bỏ quyền riêng từng người | Không có; quyền chỉ theo vai trò | **Cao** | Cần bảng lưu ngoại lệ quyền, đổi `AccountAccess`, đổi SRS |
| G5 | Tạo, sửa, xóa vai trò tùy biến | Cố định 2 vai trò, ma trận trong code | **Rất cao** | Trái quyết định 27/10 và AC-02; cần lưu ma trận trong DB |
| G6 | Sao chép người dùng | Không có | Thấp–vừa | Web gọi tạo tài khoản + grant |
| G7 | Giới hạn thời gian truy cập theo thứ và giờ | Không có | Vừa | Cần cột và kiểm tra khi đăng nhập; chưa rõ nhu cầu |
| G8 | Lưu quyền xong tự đăng xuất người đó | Backend áp dụng ở lần gọi tiếp theo, web chưa nhắc rõ | Thấp | Đã thêm nhắc "tải lại hoặc đăng nhập lại" |
| G9 | Lọc nhiều tiêu chí, tùy chỉnh cột | Có một phần | Thấp | Dùng bộ kit màn quản lý |
| G10 | Giới hạn dữ liệu theo nhóm hàng | Tương đương: giới hạn theo **vùng** (đã có) | Không cần | Vùng đóng vai trò nhóm hàng |
| G11 | Tự bỏ quyền nhạy cảm khi giới hạn phạm vi | Ma trận đã tách theo vai trò | Không cần | |

## 4. Rủi ro và ràng buộc

- Đổi sang vai trò tùy biến (G5) **đảo ngược quyết định 27/10 và 02/11** của chủ dự án, đụng SRS (AC-02, BR-FARM-07), `FixedRoles`, migration, `/me/permissions`, menu web. AGENTS.md yêu cầu hỏi trước khi đổi quyền, vai trò và hợp đồng payload quyền.
- Tùy biến từng người (G4) làm quyền khó đoán và khó giải thích với thầy; phức tạp gấp đôi cho kiểm thử.
- Với một HTX nuôi hàu chỉ có Chủ, Quản lý vùng, Kế toán, một vai trò thêm có thể chưa cần.

## 5. Hướng đề xuất để chủ dự án chọn

| | Hướng | Làm gì | Đụng backend/SRS |
|---|---|---|---|
| **A (khuyến nghị)** | Giữ vai trò cố định, **đổi giao diện theo KiotViet** | Màn "Quản lý người dùng" hai tab: Tài khoản (lọc, tạo, chỉnh sửa, ngừng hoạt động, sao chép, khung Phân quyền theo vùng + vai trò) và Vai trò (xem ma trận chỉ đọc, ai đang dùng). Kế toán chỉ một và toàn HTX | Không, chỉ web (G1, G2, G3, G6, G8, G9) |
| B | A + cho Chủ HTX **chỉnh ma trận quyền** của 2 vai trò cố định (lưu DB) | Thêm bảng ma trận, API sửa, nhật ký, cache quyền | Có (backend, SRS) |
| C | Vai trò tùy biến như KiotViet (G4, G5) | Viết lại mô hình quyền | Lớn, trái quyết định cũ; **không nên làm trước buổi bảo vệ** |

## 6. Câu hỏi cho chủ dự án

1. Chọn A, B hay C? (Đề xuất A; B nếu thầy yêu cầu "chỉnh quyền được".)
2. Có cần giới hạn thời gian truy cập theo giờ (G7) không? Đề xuất: không, chưa có nhu cầu.
3. "Sao chép người dùng" (G6) có cần cho Quản lý vùng (cùng quyền, khác vùng) không?
4. Có giữ "một Kế toán duy nhất" bằng cách **chặn** khi thêm Kế toán thứ hai, hay chỉ **cảnh báo** như bạn đã nói về các quy tắc khác?
5. Phần "pasted text" bạn gửi kèm yêu cầu này **không hiện** với tôi (chỉ thấy nhãn `[Pasted text #24 +13 lines]`). Nếu bạn muốn tôi làm theo ghi chú đó, hãy dán lại.
