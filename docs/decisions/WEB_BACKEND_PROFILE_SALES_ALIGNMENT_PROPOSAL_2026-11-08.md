# Đề xuất đồng bộ hồ sơ HTX và luồng yêu cầu mua — 08/11/2026

Trạng thái: người dùng đã duyệt P1 trong chat ngày 08/11/2026: đồng bộ đầy đủ Hồ sơ HTX v2. P2 chốt giữ số lồng và luồng cũ, chờ backend; không chuyển sang kg. Không đổi cơ chế phiên hoặc tự chạy migration.

Nguồn kiểm chứng: fetch origin backend ngày 08/11; develop ce151375, CooperativeProfileController/CooperativeProfileDtos và PurchaseRequestDtos. Hồ sơ HTX v2 đã vào develop từ b826e772 (#24, 05/11), không phải endpoint mới xuất hiện hôm nay.

## P1 — Hồ sơ hợp tác xã v2

API có GET/PUT `/api/cooperative/profile`, POST/DELETE logo, POST/DELETE cover-photo. Owner được quản lý; GET trả cả certifications và publicPreview. Web đang bắt buộc status (backend mới không trả), chưa có shortName và còn yêu cầu legalRepresentative/businessLines.

Đề xuất đồng bộ form/BFF theo contract hiện hành:

- Bắt buộc tên đầy đủ, tên viết tắt (tối đa 20 ký tự), mã số thuế, địa chỉ và điện thoại.
- Người đại diện và ngành nghề chuyển thành không bắt buộc; thêm năm thành lập (1900 đến năm hiện tại), liên kết mạng xã hội, giới thiệu Việt/Anh theo giới hạn API.
- Không tự suy trạng thái Hoàn thiện/Sơ bộ khi field status đã bị bỏ.
- Đọc chứng nhận và xem trước theo publicPreview: phần công khai không có mã số thuế/người đại diện/ngành nghề/chứng nhận hết hạn. Không mở thêm dữ liệu công khai.
- Logo tối đa 2 MB; ảnh bìa tối đa 5 MB, PNG/JPEG/WebP; luồng upload/xóa riêng giữ dirty/conflict/rowVersion và không tự gửi lại khi chưa rõ kết quả. Phương án phân phối ảnh chỉ dùng URL allowlist cùng backend/proxy hiện hành, không nhận URL tùy ý từ browser.
- Chưa tự đổi runtime/migrate DB; xác nhận schema trước khi nối đầy đủ luồng ghi.

Đây là thay đổi validation/trường và khối dữ liệu công khai so với Web cũ, cần người dùng chốt theo AGENTS.md.

## P2 — Yêu cầu mua

Quyết định gần nhất trong chat: giữ số lồng và luồng lập kế hoạch/mời nhân viên trước chấp nhận. Backend develop hiện dùng RequestedKg/AcceptedKg và Owner accept/decline trực tiếp; nhánh chore/cors-zalo-mini-app/PR20 giữ luồng staffing cũ, chưa merge develop.

Hai phương án: giữ quyết định số lồng, ghi rõ chờ backend tương thích; hoặc duyệt chuyển Web sang kg và phản hồi trực tiếp theo develop. Chưa chuyển đơn vị, không quy đổi lồng sang kg tự động.

## Phần đã được yêu cầu, không phụ thuộc P1/P2

Đổi nhãn Nhân viên thời vụ; Chu kỳ nuôi nằm trong Nuôi trồng và bỏ mục trùng ở Điều hành; căn giữa Hồ sơ cá nhân ở cả mock/API. Các phần này không đổi quyền, nghiệp vụ hoặc API.
