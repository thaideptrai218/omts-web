# Tài khoản QA, dữ liệu QA, chính sách

Toàn bộ là dữ liệu local/demo. Thông tin đăng nhập thật không bao giờ được commit. Tài liệu này **không chép mật khẩu**; mật khẩu demo công khai nằm ở `README.md`.

## Chính sách
- Chỉ gọi tài khoản bằng username.
- Mật khẩu cho script lấy từ biến môi trường trong terminal (vd `OMTS_QA_PASSWORD`), không bao giờ từ file.
- Seed giữ mật khẩu đã đổi về sau.
- Không sửa thông tin đăng nhập, liên hệ, grant của seed; dùng bản ghi tên QA.
- Không reset DB dùng chung; không `docker compose down -v`.
- Không chạy seed có cờ mật khẩu/đã xác minh lên dữ liệu dùng chung; không thu hồi grant seed để qua preflight migration.

## Tài khoản mock frontend (`src/features/auth/repositories/mock-auth-repository.ts`, `src/shared/mocks/mock-identities.ts`)
- `owner` (Ngô Nam Trung), `manager` (Nguyễn Văn An, Khu Đông), `manager2`, `ketoan`, `trader` (Lê Quốc Hải), `sysadmin` (Trần Minh Quân); Staff `staff-verified` có thêm `workforce.assign` phạm vi `zone-east`.
- Fixture cũ (`nguyen.an`, `pham.cuong`, `staff-verified`, `tran.binh`, `staff-first-login`, `staff-needs-contact-verification`) không còn là hướng dẫn chính nhưng `REVIEW_GUIDE.md` còn dẫn một số.
- Mã OTP mock: 123456, sau gửi lại 654321 và 112233.
- **Mâu thuẫn tài liệu**: quyết định 03/11 và `testing/TESTER_RUNBOOK_2026-11-02.md` ghi một mật khẩu ngắn hơn; README ghi mật khẩu dài hơn; code mock có hằng riêng. README là phát biểu công khai mới hơn — cần thống nhất. Kiểm kê tính năng cũng ghi: fixture mock hiện chưa có `manager2` và `ketoan`.

## Seed API thật (README, `REVIEW_GUIDE.md`)
| Username | Vai trò / phạm vi |
| --- | --- |
| `owner` | Owner, mọi vùng |
| `quanlyvung1`, `quanlyvung2` | Quản lý vùng DEMO-01 và DEMO-02 |
| `ketoan` | Kế toán, mọi vùng |
| `sysadmin` | Chỉ ở runtime họp cô lập |
| `thuonglai1` | Thương lái đang hoạt động |
| `thuonglai2` | Thương lái bị khóa (đăng nhập phải bị từ chối) |
| `nhanvien.doimk` | Staff, đổi mật khẩu lần đầu |
| `nhanvien.chuaxacthuc` | Staff, cần xác minh SĐT |
| `nhanvien.hethan` | Staff có grant bị thu hồi (phải bị từ chối) |

- Username mock `manager`, `manager2`, `trader` **không** phải tài khoản backend.
- Staff và QR Viewer không có vai/tài khoản demo backend ổn định; không thay bằng quyền khác.

## Bản ghi QA giữ lại cho tester
Tên: `QA browser employee 20261030`, `QABROWSER30`, `QA-BROWSER-B30`, `QA-MAT30`, phiếu 026–032, tham chiếu thanh toán `QA-BROWSER-M1/M2`, yêu cầu chờ `YC-20261031-F4C2BF613C68`, `QA chờ duyệt`/`QA chờ từ chối`, `QA-SALE31`, `QA-INT31`. Tài khoản khóa `qa.audit.*` với grant bị thu hồi. Đổi mật khẩu/liên hệ chỉ trên tài khoản QA chỉ định.

## Nhà cung cấp giả
OTP dùng Fake provider của backend; OCR dùng Fake provider; proxy tệp chỉ hỗ trợ lưu trữ Local.

## Runtime
Xem bảng trong [`../rules/07-testing-and-qa.md`](../rules/07-testing-and-qa.md) (8080/8081/8082; Web 3000/3002/3003; Redis 6380).
