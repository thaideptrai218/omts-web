# Các lát hoàn thiện bản trình diễn Web ngày 27/10

> Đợt tiếp theo đã chốt fixed roles và thay UI theo [plan polish](WEB_MANAGEMENT_POLISH_PLAN.md). Các lát tạo role ở bảng này mô tả giai đoạn trước quyết định mới; không dùng để tạo custom role trong bản hiện tại.

Mục tiêu: thầy đi được các luồng quản trị đang có, dữ liệu giữa các màn nhất quán. Không mở API nửa thật/nửa mock, không thêm actor hoặc tính năng vận hành chưa có. Nhánh hiện tại: `feature/OMTS-132-web-foundation`; không merge develop.

| Lát | Thao tác cần trình diễn | Thay đổi cụ thể | Bằng chứng |
| --- | --- | --- | --- |
| R1 | Đổi/khôi phục mật khẩu rồi đăng nhập lại | Auth, security và recovery dùng cùng credential directory RAM; proof chỉ tác động đúng recipient | Mock review flows + OTP tests |
| R2 | Lưu tên/contact rồi logout/login | Alias mới chỉ mở sau verified save; alias cũ bị retire; tên cá nhân không trở về tên fixture sau login | Cross-service regression tests |
| R3 | Tạo role→gán account→liên kết employee | Shared management composition; picker lấy snapshot hiện hành |4 integration cases |
| R4 | Xem dashboard sau thao tác | Số tài khoản/nhân viên/vai trò lấy từ state hiện tại; không bịa thu chi/sản lượng | Counter integration + browser review |
| R5 | Tạo Staff rồi first login | Username từ bản ghi tạo; public mock temp password; forced change; xác minh email OR phone; profile/role/scope từ account đó | Service flow fixture; browser hướng dẫn cho người review |
| R6 | Khóa/unlock/reset Staff | Login kiểm trạng thái; reset thay credential mock và phiên cũ, chỉ bắt các bước còn thiếu | Root service integration + AuthProvider late-result test |
| R7 | Tùy chọn thông báo | Profile mở dialog; load/draft/save/cancel; mandatory locked, Push/Zalo unavailable, Email theo verified status |3 component/repository cases + browser review |
| R8 | Menu hẹp | Bấm thẻ hồ sơ phải đóng drawer như các link khác | Regression test + kiểm browser |
| R9 | Gói chạy cho thầy | README/guide tiếng Anh, OTP và account mẫu, build/start, giới hạn reset sau reload | Lint/typecheck/full tests/build/HTTP smoke; đối chiếu đúng head |

Đăng ký Thương lái Web chưa triển khai theo lựa chọn trực tiếp của Duy Thái. QR và nghiệp vụ nuôi/thu hoạch/thu chi chưa có không được đưa vào checklist như tính năng đã làm.

G1 được chốt hướng nhưng runtime vẫn là lộ trình API riêng: ledger RAM chỉ kiểm quy tắc, không gọi backend hoặc cấp phiên/cookie. Không đổi SRS/Jira/backend để làm demo chạy thuận tiện.

Kết quả lượt này: R1–R8 đã có source/test và các kiểm tra browser ghi trong [báo cáo](reports/WEB_REVIEW_READINESS_2026-10-27.md). R9 có guide chạy, full 1.599 PASS/31 Redis SKIP, lint/typecheck/build/24 HTTP assertions PASS; nghiệm thu riêng viewport 360/1024 và backend/QA vẫn pending. REVIEW-REV-01 về onboarding result sau logout đã tái hiện và sửa bằng operation tracker. Không đánh dấu toàn bộ SRS hoặc G1 runtime hoàn thành.

Các nguồn mock vẫn ở RAM theo tab/module. Reload/reset server hoặc tải lại trang có thể làm mất state; không lưu password/OTP/JWT trong storage để che giới hạn này. Credential demo và OTP công khai chỉ dùng cho mock. UI client guard trong mock không thay backend authorization.
