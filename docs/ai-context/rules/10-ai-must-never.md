# 10 — AI tuyệt đối KHÔNG được

## Bí mật và bảo mật
- Commit/push `.env*`, khóa API, mật khẩu, token, chuỗi kết nối; in chúng ra log/báo cáo.
- Đọc nội dung `.env*` khi không cần; chỉ liệt kê **tên** biến.
- Đưa token/refresh token xuống trình duyệt.
- Đổi lưu phiên, refresh, route protection, payload quyền, caching khi chưa được duyệt.
- Fallback âm thầm sang RAM/localStorage cho phiên.
- Bypass/đè GitGuardian hay Gitleaks, viết lại lịch sử git.
- Trỏ `test:redis` vào Redis production.

## Nghiệp vụ
- Tự quyết thay đổi nghiệp vụ nêu ở [09](09-decisions-requiring-confirmation.md).
- Thêm, sao chép, đổi tên vai trò (chính sách: 3 vai trò cố định).
- Đưa lại actor Household/Farmer.
- Dựng Expo/mobile trong repo này.
- Bịa API, bịa số liệu (doanh thu, sản lượng, chi phí = 0), hay suy đoán hợp đồng backend chưa có.
- Đánh dấu Jira Done chỉ vì UI mock xong.

## Kiến trúc và code
- Gọi storage mock hoặc HTTP trực tiếp từ component.
- Replay thao tác ghi có kết quả chưa rõ (401/5xx/mạng).
- Chuyển tiếp chuỗi lỗi tự do của backend lên UI.
- Tạo bản "enhanced" của file; để file phình quá ~200 dòng khi có thể tách.
- Dùng dữ liệu giả, mock hay mẹo để qua build/CI; bỏ qua test lỗi; tăng timeout để cho qua.
- Thêm panel dev, cảnh báo "chưa xong", hay route `/dev/*` vào UI sản phẩm.
- Dùng `confirm`/`alert` native.

## Git và dữ liệu
- Force-push, reset hay ghi đè thay đổi chưa commit của người khác; push thẳng `develop`/`main`.
- Commit file ghi chú học tập `docs/learning/`.
- Reset DB dùng chung, `docker compose down -v`, xóa volume khi tester cần dữ liệu; ghi dữ liệu nghiệp vụ vào runtime 8080.
- Sửa thông tin đăng nhập/grant/liên hệ của seed.
- Chạy `dev` và `build` cùng lúc.

## Tài liệu
- Tạo file markdown ngoài `docs/` hoặc `plans/` khi chưa được yêu cầu.
- Báo kết quả không trung thực: coi lần chạy treo là PASS, hoặc khẳng định đã kiểm 360/1024 px khi chưa kiểm.
