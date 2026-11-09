# RULES

## Bắt buộc trước khi làm
1. Đọc `README.md`, `docs/PROJECT_CONTEXT.md`, `AGENTS.md` và use case SRS liên quan.
2. Làm theo task nhỏ trong [TASKS.md](TASKS.md); xong thì cập nhật [PROGRESS.md](PROGRESS.md).
3. Đọc tài liệu Next.js trong `node_modules/next/dist/docs/` trước khi viết code Next.

## Quy tắc code
- Next.js App Router + TypeScript; tách route công khai / xác thực / có bảo vệ.
- Dữ liệu đi qua service/repository; mock và API dùng chung interface.
- Quyền dựa trên grant hiệu lực và phạm vi vùng, không suy từ tên vai trò. Backend vẫn là nơi cấp quyền cuối.
- File mã dưới ~200 dòng, đặt tên kebab-case mô tả rõ mục đích; sửa file có sẵn, không tạo bản "enhanced".
- Chữ giao diện tiếng Việt; tuân YAGNI, KISS, DRY.
- Xử lý lỗi bằng try/catch, thông báo rõ cho người dùng; không nuốt lỗi.
- Commit theo conventional commits, không nhắc AI. Nhánh `feature/OMTS-<n>-<slug>` từ `develop`; mở PR, không push thẳng `develop`/`main`.
- Trước khi báo xong: `npm run lint`, `npm run typecheck`, `npm run build` đều qua; test không được bỏ qua để cho xanh.

## AI tuyệt đối KHÔNG được
- Commit/push bí mật: `.env*`, khóa API, mật khẩu, token. Không in chúng ra log hay báo cáo.
- Đưa token/refresh token xuống trình duyệt, hay đổi cách lưu phiên, route protection, payload quyền, caching khi chưa được duyệt.
- Tự quyết các thay đổi nghiệp vụ: thêm/bớt bước, đổi actor hay phạm vi vùng, đổi chuyển trạng thái, đổi trường bắt buộc/validation, đổi dữ liệu QR công khai, đổi offline/conflict, đổi ranh giới Web/Mobile, giải quyết câu hỏi SRS còn mở. **Phải hỏi người dùng trước.**
- Thêm vai trò mới, sao chép hay đổi tên vai trò (chính sách: 3 vai trò vùng cố định).
- Dựng Expo/mobile trong repo này; đưa lại actor Household/Farmer.
- Gọi storage mock hoặc HTTP trực tiếp từ component.
- Dùng dữ liệu giả, mock hay mẹo để qua build/CI; bỏ qua test lỗi.
- Đánh dấu Jira Done chỉ vì UI mock xong.
- Replay lại thao tác ghi khi kết quả chưa rõ (401/5xx/mạng); giữ nháp và báo trạng thái không chắc chắn.
- Thêm file ghi chú học tập vào Git (`docs/learning/` bị ignore); force-push, reset hay ghi đè thay đổi chưa commit của người khác.
- Tạo file markdown ngoài `docs/` hoặc `plans/` khi chưa được yêu cầu.
