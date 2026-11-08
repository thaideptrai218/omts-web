# Branch backend và hộp thư Web — 30/10/2026

**Cập nhật sau phê duyệt:** người dùng đã đồng ý Owner duyệt/từ chối Trader; luồng đã nối và kiểm HTTP thật. Xem [báo cáo hiện hành](WEB_TRADER_APPROVAL_API_2026-10-30.md). Những trạng thái “chờ trả lời” bên dưới là snapshot lúc làm inbox.

Đã fetch origin và so sánh controller/DTO/service liên quan. Không merge, checkout nhánh khác hoặc sửa source backend.

| Branch | SHA | Kết quả đối chiếu |
| --- | --- | --- |
| develop |953f597| Runtime chính8080; các module Web đã nối trong bảng phạm vi |
| chore/cors-zalo-mini-app |dc00b2f| Mới: inbox GET `/api/me/notifications`, POST `{id}/read`, POST `read-all`; Owner GET `/api/trader-requests`, POST `{accountId}/approve`, POST `{accountId}/reject`; Zalo link/login/trader request/unlink và location |
| feature/OMTS-212-lab |c92787b| Có Teams, SeasonalWorkers, WorkAssignments (completion/evidence), Attendance, PayRates, Payrolls, WagePayments/advances/reverse/documents và MyPay. Đây là LAB cũ, khác kế hoạch LABORv2 đã ghi trong audit Jira; diff hai đầu còn thiếu employee unlink so với develop. Chưa nối writes theo thiết kế cũ |
| feature/OMTS-216-legacy-cleanup |0fa690b| Dọn entity/migration, không có route mới để nối |
| feature/OMTS-216-message-catalogue |56b4a2f| Đổi message contracts; Web đã hỗ trợ canonical/legacy, không thêm module nghiệp vụ mới |
| feature/OMTS-125-raft-and-refactor / persistence-auth |e650c69 /618baf7| Nhánh nền cũ |
| feature/OMTS-126-auth-core /127-zone-authorization /128-audit-log |4e0b385 /14d7839 /7a41aa6| Nhánh nền cũ |
| docs/OMTS-135-sds-auth-coop-admin /docs/srs-entity-vs-db |39ec292 /7a84a21| Tài liệu |

Không tìm thấy controller mới cho chu kỳ/thu hoạch/bán hàng/customer finance/QR trong các nhánh nghiệp vụ trên. Đây là đối chiếu endpoints và phần contract liên quan, không tuyên bố đã kiểm toán toàn business logic.

## Web đã nối

Nút **Thông báo** trong API workspace mở hộp thư riêng của account: page20, unread count, newest first, đánh dấu từng dòng hoặc tất cả; không tự mark khi mở. Không dùng dev inbox, không giả liên kết record bằng mã không có ID. React render title/body/reference thành text. BFF chỉ nhận page hoặc command strict, không nhận accountId/URL đích; CSRF cho write, token server-only, no-store, recheck session sau upstream kể cả204. Unknown write không replay và Reload không mở khóa mutation.

Owner approval của Zalo thêm bước/status tài khoản; đã hỏi người dùng theo AGENTS.md, chưa có trả lời trong lúc triển khai inbox nên không tự bật thao tác này. Không đổi signup Trader Web đã duyệt. Zalo SDK token/location thuộc Mini App; không dựng SDK giả trên Web.

## Môi trường QA độc lập

Source branch được export nguyên trạng vào ignored `docs/learning/backend-zalo-dc00b2f`; Docker image `omts-zalo-api:dc00b2f`, project `omts-zalo-qa`, SQL volume và file volume riêng. Build/seed nhánh trên database mới, không chạy migration nhánh vào DB demo cũ. API127.0.0.1:8081, SQL127.0.0.1:1435. Local .env không commit/không in giá trị.

Web QA **http://127.0.0.1:3003/login**, RedisDB3/namespace `omts-web-zalo-qa`, dùng cùng built app. Khác host với localhost3002 để tránh cùng tên cookie. Khởi động lại Web QA từ repo bằng PowerShell:

```powershell
$env:OMTS_API_BASE_URL='http://127.0.0.1:8081'
$env:OMTS_WEB_ORIGIN='http://127.0.0.1:3003'
$env:OMTS_WEB_SESSION_REDIS_URL='redis://127.0.0.1:6380/3'
$env:OMTS_WEB_SESSION_REDIS_NAMESPACE='omts-web-zalo-qa'
npm run start:api
```

Các biến ở trên ghi đè cấu hình local trong terminal đó. Dùng terminal mới cho `npm run start:api` thông thường. Backend QA đã được tạo local; nếu container dừng, dùng `docker compose -p omts-zalo-qa -f docs/learning/backend-zalo-dc00b2f/docker-compose.yml --env-file docs/learning/backend-zalo-dc00b2f/.env up -d` tại repo Web.

HTTP thật trên QA branch: Owner list/read/read-all lưu readAt/unreadCount0; Manager không mark được notification của Owner (404); Manager và Trader đọc hộp thư riêng200. Tất cả session HTTP QA đã logout. Chỉ trạng thái đã đọc trong DB QA riêng thay đổi.12 tests BFF/component PASS;58 built-product assertions PASS; lint/typecheck/build40/40 PASS. Chưa kiểm browser/viewport cho dialog mới, không coi component tests là browser E2E.

## Cảnh báo InstantServer /account

AppSessionShell cố ý không render children khi mock session loading/anonymous; API boundary cũng bỏ children khi service không ready. Với trang được guard như vậy, chọn `export const instant = false` tại đúng `account/page.tsx` theo [Next.js](https://nextjs.org/docs/messages/instant-unrendered-segment#skip-validation-on-the-segment). Chỉ bỏ validation phát triển cho page này; không thêm cache, không đổi guard/SSR dữ liệu, không tắt validation toàn app. Đây là ngoại lệ validation, không phải cải thiện tốc độ hay khẳng định conditional-use warning khác đã hết.

Dev server3000 đã chạy trước đó; GET/account sau HMR200, log không thêm diagnostic mới trong lượt HTTP này. Không khởi động được dev3004 do Next dev lock chung; không kill devserver của người dùng. Chưa xác nhận overlay trong browser sau reload.
