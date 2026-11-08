# OMTS-183 — D2.4 Route và access

## Đã triển khai

- Route `/cooperative/profile` và metadata production.
- Route-level skeleton cùng client loading/error/retry state.
- Permission denied bằng MSG02.
- Navigation `Hồ sơ HTX` chỉ xuất hiện với `cooperative.profile.manage`.
- Mock Owner có capability; mock SysAdmin không có.

Capability hiện là frontend contract tạm để render navigation. Backend vẫn phải kiểm tra Cooperative Owner cho load và save; client guard không phải security boundary.

## Kiểm tra

Route xuất hiện trong production build. Owner đăng nhập bằng mock account nhìn thấy menu và tải được hồ sơ. Trạng thái backend/QA chưa thể xác nhận vì `OMTS-182` còn To Do.
