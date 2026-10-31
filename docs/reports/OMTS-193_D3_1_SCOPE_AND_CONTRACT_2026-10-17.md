# OMTS-193 — D3.1 Phạm vi và contract SCR-10

## Nguồn đã đối chiếu

- [OMTS-193](https://welterial.atlassian.net/browse/OMTS-193) — Web role list và matrix editor.
- [OMTS-147](https://welterial.atlassian.net/browse/OMTS-147) — story UC12 và acceptance criteria.
- [OMTS-192](https://welterial.atlassian.net/browse/OMTS-192) — backend role/matrix API.
- [OMTS-123](https://welterial.atlassian.net/browse/OMTS-123) — BA function catalog/default matrix/data scope, hiện vẫn To Do.
- SRS v5.8 UC12, SCR-10, BR-19, MSG01/03/09/11 và entity Role/RolePermission/AccessGrant.

## Kết luận phạm vi

Chỉ Cooperative Owner quản lý vai trò. Role có tên duy nhất, mô tả, trạng thái In Use/Discontinued, record version và một permission row cho mỗi function trong catalog hệ thống. Owner không tự tạo function/action. Role đang dùng phải cho biết account/zone bị ảnh hưởng và cần xác nhận trước khi lưu; thay đổi có hiệu lực ngay và được audit ở backend. Role không bị xóa vật lý; discontinue bị chặn khi còn effective grant.

`OMTS-123` chưa hoàn tất nên Web không coi bất kỳ fixture function/action/default role matrix nào là nghiệp vụ đã chốt. Contract nhận catalog qua service; fixture chỉ phục vụ UI/test. Data scope được mô hình hóa theo từng feature với `options` và `requiredWhenGranted`, không tự gán cùng một quy tắc cho mọi function.

## Kết quả code

- Domain types tách Role, RolePermission, FeatureCatalogItem, DataScopeOption và impact account/zone.
- Typed outcomes phân biệt loaded, forbidden, session expired, invalid input, duplicate, conflict, impact required, saved và discontinue blocked.
- Capability tạm `access.roles.manage` được cấp cho mock Owner, không cấp SysAdmin.

## Điểm chưa thể đóng

- Catalog chính thức function × supported actions × data scope từ `OMTS-123`.
- DTO, ETag, audit và immediate-effect của QA API `OMTS-192`.
- Vì vậy D3 là UI-ready bằng mock, chưa đạt Jira Done.
