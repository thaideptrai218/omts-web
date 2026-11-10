# 01 — Quy trình và ngữ cảnh

## Đọc trước khi làm một nhiệm vụ mới (`AGENTS.md`)
1. `README.md` và `docs/PROJECT_CONTEXT.md` (mục mới nhất nằm trên cùng).
2. Use case SRS liên quan và các quyết định đã duyệt trong `docs/decisions/`.
3. Jira để biết phân công và phụ thuộc; Figma chỉ là tham chiếu, không bắt buộc làm theo.
4. Tài liệu Next.js trong `node_modules/next/dist/docs/` trước khi viết code Next. Phiên bản này có thay đổi lớn so với kiến thức cũ. Khối quy tắc này do `next dev` tự thêm lại; commit cùng thay đổi của bạn để cây làm việc sạch.

## Phạm vi repo
- Repo này chỉ là **Web**. Không tạo ứng dụng Expo/mobile trong đây.
- Ba repo chính: `thaideptrai218/omts-web`, `omts-mobile`, `omts-backend`.

## Actor hiện hành
System Administrator, Cooperative Owner, Staff, Zone Manager, Accountant, Trader, QR Viewer. Không đưa lại Household/Farmer từ báo cáo cũ nếu SRS và Jira chưa thêm.

## Thứ tự ưu tiên khi nguồn mâu thuẫn
1. Quyết định người dùng đã duyệt (mới nhất thắng).
2. SRS hiện hành, rồi Jira.
3. Báo cáo cũ và README.
Ghi lại mâu thuẫn quan trọng và hỏi trước khi tự giải quyết.

## Phạm vi công việc
- Quyết định 28/10/2026: làm đủ luồng role theo SRS; phân công Jira **không** phải trần phạm vi.
- Không đánh dấu Jira Done chỉ vì UI mock xong.
- Báo cáo là bằng chứng tại một thời điểm. Một lần chạy mock không chứng minh backend/QA đã qua; luôn đối chiếu source hiện tại.

## Nơi đặt tài liệu
- Báo cáo kiểm chứng: `docs/reports/`.
- Quyết định/đề xuất: `docs/decisions/`.
- Ghi chú học tập cá nhân: `docs/learning/` (bị git ignore, không commit).
- Ảnh/chẩn đoán tạm: `.hallmark/` (bị ignore).
