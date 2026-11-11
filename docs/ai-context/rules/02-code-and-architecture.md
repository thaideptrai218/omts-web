# 02 — Code và kiến trúc

## Nền tảng
- Next.js App Router + TypeScript. Tách khái niệm giữa route công khai, xác thực và có bảo vệ.
- Cấu trúc: `src/app` (route + BFF Route Handlers), `components`, `features`, `server` (BFF/session/Redis/transport), `shared`. `tests/fixtures` chỉ chứa fixture cô lập, không phải màn hình sản phẩm.

## Truy cập dữ liệu
- Component **không** gọi storage mock hay HTTP trực tiếp.
- Luồng: component → service → repository interface → adapter mock hoặc API. Mock và API dùng chung interface.

## Cấu hình phía server
- URL backend, khóa và cấu hình Redis chỉ ở server, **không** dùng `NEXT_PUBLIC_*`.
- Ngoại lệ đã ghi nhận (biến public lúc build): `NEXT_PUBLIC_OMTS_PURCHASING_CONTRACT=v2` và `NEXT_PUBLIC_VIETMAP_API_KEY`.

## Quy tắc BFF (`src/app/api`)
- Whitelist endpoint cố định, kiểm tra schema, CSRF, giới hạn kích thước body, header `no-store`, kiểm tra lại session sau mỗi phản hồi.
- Không bao giờ gửi URL backend hay token xuống trình duyệt.
- Không chuyển tiếp chuỗi tự do từ backend lên UI; ánh xạ sang thông báo tiếng Việt đã duyệt.

## Ghi dữ liệu không chắc chắn (write-unknown)
- Lỗi mạng, 5xx, hoặc 401 sau khi commit: **giữ bản nháp, chặn gửi lại, không tự replay**. Một lệnh GET thôi không mở khóa.
- Đồng thời (optimistic concurrency) dùng `rowVersion`. Nơi backend không có version (gán nhân sự, chấm công), Web không tuyên bố bảo vệ nguyên tử.
- Chống trùng dùng `deduplicationKey`: giữ cho một lần ghi, đổi khi người dùng sửa form.

## Chất lượng code
- File mã nên dưới ~200 dòng; tách editor/màn hình lớn (đã làm ở commit `fdb4c4e`, `3883595`).
- Tên file kebab-case mô tả mục đích. Sửa file có sẵn, không tạo bản "enhanced".
- YAGNI, KISS, DRY. Có try/catch, báo lỗi rõ cho người dùng.
- Chữ giao diện tiếng Việt; ngày hiển thị dd/MM/yyyy, service dùng ISO, ngày nghiệp vụ theo UTC+7.

## Số liệu chưa biết
- Chưa biết = `null` / "Chưa có số liệu". Không hiển thị 0 giả. Ví dụ chi phí vật tư của bè là chưa biết đến khi có phiếu nhập; không suy khối lượng hàu từ chiều dài làn hay màu.
