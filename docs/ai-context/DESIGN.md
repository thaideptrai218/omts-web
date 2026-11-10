# DESIGN

Nguồn token: `src/app/globals.css` (biến `--omts-*`, ánh xạ sang `--color-*` cho Tailwind). Luôn dùng token, không hard-code màu.

## Màu
| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| primary / focus-ring | `#086f78` | Nút chính, liên kết, focus |
| primary-hover | `#075961` | Hover nút chính |
| primary-soft | `#e7f3f3` | Nền nhấn nhẹ |
| canvas | `#f5f7fa` | Nền trang |
| surface | `#ffffff` | Thẻ, bảng |
| surface-subtle | `#edf3f5` | Nền phụ |
| text / text-muted | `#10243a` / `#526674` | Chữ chính / phụ |
| border / border-strong | `#e1e7e3` / `#829ba3` | Viền |
| warning (+soft) | `#98600b` / `#fef3c7` | Cảnh báo |
| danger (+soft) | `#b52d42` / `#fff1f2` | Lỗi, thao tác nguy hiểm |

## Font
- Chữ: **Be Vietnam Pro** (`--font-app-sans`) — hỗ trợ tiếng Việt tốt.
- Số liệu/mã: **Geist Mono** (`--font-geist-mono`).

## Hình khối
Bo góc: control `0.375rem`, card `0.625rem`, dialog `0.875rem`. Bóng nhẹ (`--omts-shadow-card`), bóng nổi chỉ cho dialog/menu. Nội dung tối đa `88rem`. Khoảng cách theo thang `--omts-space-*`.

## Component có sẵn (`src/components/ui`)
Button, Dialog, ConfirmDialog, DataGrid, FilterWorkspace, FilterChecks, ManagementPage, OpenableTableRow, EvidenceGallery, ToastProvider, InterfaceIcon. Dùng lại trước khi tạo mới.

## Phong cách
- Giao diện quản trị: gọn, rõ hàng, thanh bên sáng (mở mặc định ở desktop, thu gọn/ghim được); không dùng kiểu trang quảng bá.
- Danh mục: hàng rõ ràng, tóm tắt, bộ lọc kết hợp; chỉnh sửa mở trong dialog.
- Ngày nhập kiểu ngày/tháng/năm Việt Nam; giá trị service là ISO.
- Loading lần đầu dùng skeleton; thao tác ghi dùng trạng thái pending/disabled tại chỗ.
- Có đủ trạng thái: loading, empty, error, offline, success, syncing, permission-denied.
- Truy cập: landmark đúng, focus nhìn thấy, dùng được bằng bàn phím, kiểm tra ở 360 px và 1024 px.
- Không đặt panel giải thích cho dev, cảnh báo "chưa xong" hay route `/dev/*` vĩnh viễn trong UI sản phẩm.
