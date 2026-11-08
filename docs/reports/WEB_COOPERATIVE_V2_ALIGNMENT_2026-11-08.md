# Đồng bộ Hồ sơ hợp tác xã v2 — 08/11/2026

## Quyết định và phạm vi

Người dùng duyệt P1 trong chat: đồng bộ đầy đủ Hồ sơ HTX v2. P2 giữ số lồng/staffing cũ, chờ backend. Không chuyển yêu cầu mua sang kg.

Đối chiếu remote develop backend ce151375, CooperativeProfileDtos/Controller, CooperativeProfileInput và CooperativePublicFiles. Runtime QA8082 thực tế đã có profile v2; Web cũ không đọc được do yêu cầu status. Không thay runtime, migration hoặc DB.

## Đã triển khai

- Wire schema đọc được v2 không có status, shortName, yearEstablished, socialLink, introductionVi/En, coverPhotoUrl, asOf, certifications và publicPreview; strip trường ngoài schema. Giữ đọc legacy nullable fields, không bịa trạng thái khi API không trả.
- Tên đầy đủ/tên viết tắt/mã số thuế/địa chỉ/điện thoại bắt buộc. ShortName tối đa20; năm1900–năm hiện tại; giới thiệu mỗi ngôn ngữ4000; social link HTTPS. Người đại diện và ngành nghề có thể để trống theo API.
- Form thêm các trường mới, ảnh bìa và chứng nhận chỉ đọc kèm đường dẫn tới màn quản lý chứng nhận đã có.
- Xem trước dùng các trường công khai đã duyệt: tên, tên tắt, năm, địa chỉ/liên hệ/liên kết, logo/ảnh bìa/giới thiệu và chứng nhận chưa hết hạn. Không có mã số thuế, người đại diện hoặc ngành nghề. Chuyển Việt/Anh, giới thiệu Anh trống thì dùng Việt. Không tạo public endpoint mới.
- BFF `/api/cooperative/profile/cover-photo` GET/POST/DELETE gọi đúng backend; upload field file, PNG/JPEG/WebP, tối đa5MB; logo vẫn2MB. Body JSON tăng từ16KB lên64KB để chứa hai giới thiệu tối đa4000 ký tự Unicode và các trường còn lại, vẫn bounded/CSRF.
- Chỉ Owner và application session; kiểm phiên trước/sau; URL ảnh chỉ đúng danh mục/định dạng public cùng backend. Browser nhận proxy URL có version; kiểm version khi đọc; ảnh public được fetch không kèm bearer, kiểm MIME/giới hạn byte và recheck session sau đọc.
- Unwrap profile envelope của PUT/cover upload/delete. Không tự retry mutation khi kết quả chưa rõ; giữ blocking/đối chiếu rowVersion.
- Upload ảnh bìa không làm mất tên đang sửa hoặc logo đã chọn. Khi upload ảnh thấy canonical text đã đổi, chỉ cập nhật ảnh và chặn lưu text cũ để người dùng đối chiếu. Hủy nháp không tự ghi vào DB.

## Kiểm tra

- 51 ca trong cooperative workflow/repository/BFF + API topnav/profile layout PASS; sau đó thêm ca giữ nháp và logo chờ khi upload cover, bộ workflow10/10 PASS: tổng52 ca liên quan đã qua. Không phải full test suite hoặc CI toàn repo.
- Lint toàn src/scripts/fixtures, typecheck và production build PASS; targeted eslint cho ca bổ sung PASS. Build có route cover-photo mới.
- Browser Owner QA3002/API8082: Hồ sơ HTX tải dữ liệu thật và không còn lỗi contract; thấy shortName/năm/giới thiệu hai ngôn ngữ/logo/cover/3 chứng nhận.
- Bốn image elements của logo/cover đều complete=true và naturalWidth>0 sau tải; giữ nguyên file ảnh trong DB/storage.
- Sửa tên viết tắt ở client rồi Hủy thay đổi → xác nhận bỏ → khôi phục đúng tên gốc; không PUT. Xem trước tiếng Anh hiển thị đúng nội dung API; không chứa taxCode/người đại diện.
- Browser đo1440/1024/360 CSS px: scrollWidth bằng innerWidth; khôi phục viewport sau kiểm tra.
- Chưa ghi PUT/upload/delete thật trên runtime trong đợt này. Các mutation được kiểm qua mocks/BFF tests; phần ghi thật vẫn cần tester nghiệm thu. Không coi read PASS là CRUD PASS.
- Ảnh ignored `.hallmark/cooperative-v2-2026-11-08.jpg`. Full-page capture quá dài bị công cụ từ chối nên lưu ảnh viewport; không coi là bộ ảnh nghiệm thu đầy đủ.

## Tệp chính

- `src/features/cooperative-api/contracts.ts`, `cooperative-screen.tsx`, `repository.ts`, fixtures/tests.
- `src/server/workspace/cooperative-http.ts` và tests.
- `src/app/api/cooperative/profile/cover-photo/route.ts`.

Đổi nhãn/menu/căn giữa hồ sơ cá nhân và audit backend được ghi trong BACKEND_UPDATE_AND_UI_FIXES_2026-11-08.md, inventoryCSV và quyết định P1/P2. Chưa commit/push/merge; giữ mọi thay đổi local.
