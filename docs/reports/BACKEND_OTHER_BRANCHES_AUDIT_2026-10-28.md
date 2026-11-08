# Backend — kiểm tra các branch ngoài develop

Ngày28/10/2026, Asia/Saigon. Người dùng hỏi đã kiểm tra branch khác chưa. Lượt trước mới pull develop và đọc danh sách PR/refs; chưa đọc diff từng branch. Lượt này đã fetch origin, kiểm live heads, metadata các branch và diff tập trung vào PR13/nhân viên/auth, cùng hai branch tài liệu. Không tuyên bố đã review mọi dòng code của tất cả branch.

## Kết quả fetch và trạng thái

Backend working tree sạch, vẫn checkout develop953f597; không merge/rebase/cherry-pick, không chạy migration/seed hay sửa backend. `git fetch origin` thành công, không báo cập nhật ref. Đối chiếu `git ls-remote --heads origin` với snapshot đầu lượt trước: 10 live heads giữ nguyên SHA, không có branch mới hoặc commit head mới trong danh sách đó. Kết luận này là tại thời điểm kiểm, không bảo đảm remote không đổi sau đó.

| Branch đang tồn tại trên remote | Head | Kết luận |
| --- | --- | --- |
| develop |953f597|Nguồn release/contract frontend đang đối chiếu, không mới hơn lần pull trước |
| feature/OMTS-212-lab |c92787b|Code LAB chưa merge, PR13 mở; cần review/rebase với develop mới |
| docs/OMTS-135-sds-auth-coop-admin |39ec292|SDS AUTH/COOP/ADMIN, PR10 mở; tài liệu tham khảo, không phải API runtime |
| docs/srs-entity-vs-db |7a84a21|Báo cáo lệch entity/bảng database, không thêm endpoint |
| feature/OMTS-125-raft-and-refactor |e650c69|Đầu nhánh từ19/10, lịch sử refactor/FARM; chưa có head mới |
| feature/OMTS-126-auth-core |4e0b385|Đầu nhánh19/10, AUTH nền tảng cũ |
| feature/OMTS-127-zone-authorization |14d7839|Đầu nhánh19/10, authorization nền tảng cũ |
| feature/OMTS-128-audit-log |7a41aa6|Đầu nhánh19/10, audit nền tảng cũ |
| feature/persistence-auth |618baf7|Đầu nhánh19/10, persistence/refactor lịch sử |
| main |c84e710|Không có commit riêng so develop; không phải nguồn mới hơn |

Local còn refs origin/feature/OMTS-214-* nhưng live heads không còn chúng. PR15/16/17 đã MERGED vào develop. Không dùng refs cũ còn giữ vì fetch không prune làm bằng chứng nhánh mới đang hoạt động. Không dùng số branch-only commits để kết luận tính năng mới: lịch sử có squash merge nên SHA khác vẫn có thể chứa thay đổi đã phát hành.

## PR13: có gì chưa nằm trên develop?

[PR13](https://github.com/thaideptrai218/omts-backend/pull/13), head c92787b, OPEN và không draft. Đã đọc route/action trong8 controller, danh sách service/DTO và diff employee/auth. Nhánh có các nhóm code:

| Nhóm | Endpoint gốc đã thấy trong source |
| --- | --- |
| Lao động thời vụ | `/api/labor/workers` |
| Tổ đội | `/api/labor/teams` |
| Giao việc/xác nhận hoàn thành | `/api/zones/{zoneId}/work-assignments` |
| Chấm công và bằng chứng | `/api/zones/{zoneId}/attendance` |
| Đơn giá | `/api/pay-rates` |
| Kỳ lương, làm mới, chốt/trả lại/mở lại | `/api/payrolls` |
| Chi trả/đảo chi, ứng lương | `/api/payslips`, `/api/labor-payments`, `/api/salary-advances` |
| Lương/chấm công của bản thân | `/api/me/pay` |

Có migration `20261023161108_AddWorkforceAndPayroll` và snapshot `OmtsDbContextModelSnapshot.cs`. Chỉ kiểm có source, không chạy hoặc nghiệm thu schema SQL. Một lệnh ban đầu đoán tên snapshot OMTSDbContextModelSnapshot.cs báo không có trong ref; dùng git ls-tree tìm đúng tên trước đọc, không checkout branch để chữa đường dẫn.

Điểm cần chú ý: PR13 có18 commit riêng và thiếu5 commit develop theo lịch sử hiện tại. Đọc actual-tree diff cho thấy nó **chưa có sửa unlink từ PR16**:

- EmployeesController không có DELETE `/api/employees/{id}/account`.
- EmployeeService vẫn cho PUT AccountId null làm mất link; develop đã đổi null/missing thành giữ link.
- NewEmployeeAccount vẫn cần Username và EmployeeSaved vẫn trả TemporaryPassword; chưa khớp quyết định frontend tự sinh username/secret-free delivery.
- AuthService trên nhánh còn thiếu phần chuyển push devices sang session thay thế mới có ở develop. Không lấy riêng file auth cũ để cập nhật BFF.

Đề xuất kỹ thuật cho backend khi tiếp tục PR13: rebase/merge develop mới, giữ contract PUT/DELETE mới, giữ các sửa auth/platform đã merge, rồi chạy lại hồi quy nhân viên cùng kiểm LAB. Đây là đề xuất trong tài liệu, chưa gửi comment/Jira hoặc tự sửa PR. Rollup đã đọc chỉ hiện pr-title/scanners; không có bằng chứng build/test/QA của PR13 trong rollup này. `mergeable=UNKNOWN` không được diễn giải thành chắc chắn có conflict hoặc merge an toàn.

## Hai branch tài liệu và tác động frontend

PR10 có SDS với sơ đồ lớp/sequence auth, refresh và quản trị. Nội dung vẫn ghi username do caller gửi, mật khẩu tạm trả Owner/lifetime24h và gate verified phone; không thay quyết định frontend đã chốt hoặc mở refresh thật chỉ vì có sơ đồ. Hai file docs/README mới theo merge-base không có nghĩa đã có endpoint mới chạy được.

Branch docs/srs-entity-vs-db có Markdown/HTML báo cáo mapping. Có ghi working zones được mô hình bằng EmployeeWorkingZones dù entity Employee trong SRS chưa liệt kê đầy đủ. Thông tin này hữu ích để hỏi BA và giữ tách vùng làm việc khỏi AccessGrant; không tự thêm actor/entity hoặc sửa SRS từ đề xuất tài liệu.

## Áp dụng vào công việc hiện tại

Giữ develop953f597 làm contract đã merge. PR13 dùng chuẩn bị kiến thức/lộ trình LAB sau, không thay phạm vi sprint hoặc ghép API chưa phát hành. Luồng tạo account từ hồ sơ hiện tiếp tục mock theo WEB-EMP-ACCOUNT-01, không đổi về username nhập tay hoặc trả mật khẩu từ nhánh cũ. API/refresh/MSG06/tên MSG24 và incident GitGuardian giữ chờ. Không commit/push/merge hoặc chạy test/backend runtime trong audit chỉ đọc này.
