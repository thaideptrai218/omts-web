# 06 — Mẫu task mới

Sao chép khối dưới vào file `docs/ai-context/tasks/` thích hợp (hoặc vào kế hoạch của nhiệm vụ) và điền.

```md
## <động từ + đối tượng>  (Jira OMTS-<n>)

**Loại**: web-only | chờ backend | cần quyết định
**Là gì / vì sao cần**: <1–3 câu>
**Luồng dữ liệu**: component → service → repository → (mock | /api/... → backend endpoint)
**Quyền/phạm vi**: <functionCode + action + scope; actor nào>
**Tệp sẽ sửa/tạo**: <đường dẫn, kebab-case, < ~200 dòng>
**Quyết định liên quan**: <link docs/decisions/...> (có chạm danh sách "bắt buộc hỏi"? → đã hỏi chưa)
**Tiêu chí xong** (kiểm chứng được):
- [ ] <hành vi 1>
- [ ] trạng thái loading/empty/error/denied đủ
- [ ] lint, typecheck, test, build qua
- [ ] kiểm 360/1024 px (hoặc ghi rõ chưa kiểm)
**Rủi ro**: <ghi không chắc chắn, đồng thời rowVersion, bảo mật…>
**Câu hỏi bảo vệ có thể gặp**: <2–3 câu>
**Bằng chứng**: <báo cáo docs/reports/..., lệnh, kết quả>
```
