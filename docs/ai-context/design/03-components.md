# 03 — Component dùng chung

Thư mục gốc `src/components/`. Dùng lại trước khi tạo mới.

## `ui/button.tsx` — Button
- Props: `variant` (`primary` mặc định, `secondary`, `danger`), `isPending`, `pendingLabel` (mặc định "Đang xử lý..."), `type` (mặc định `button`), + prop nút gốc.
- Mặc định full-width; `className` chứa `w-auto`/`sm:w-auto` thì bỏ full-width. Cao tối thiểu `min-h-11` (44px), 40px từ `lg`.
- Pending: `aria-busy`, disabled, hiện spinner. Disabled opacity 60%.
- Ví dụ: `<Button className="w-auto" variant="secondary" disabled={isPending}>` trong `ui/confirm-dialog.tsx`.

## `ui/dialog.tsx` — Dialog
- Dựa trên `<dialog>` gốc + `showModal()`.
- Props: `open`, `onOpenChange`, `title`, `description?`, `dismissible` (mặc định true), `onCloseRequest?`, `initialFocusRef?`, `size` (md `max-w-2xl`, lg `4xl`, xl `6xl`), `mobileLayout` (`"fullscreen"` mặc định — dưới 640px phủ toàn màn hình, không bo góc; hoặc `"compact"`).
- Truy cập: `aria-labelledby`/`aria-describedby`; bẫy focus tự viết trên Tab/Shift+Tab; focus đầu vào `initialFocusRef` hoặc `[data-dialog-initial-focus]` đầu tiên; Escape bị chặn và chỉ đóng dialog trên cùng (gọi `onCloseRequest` hoặc `onOpenChange(false)`); bấm backdrop đóng khi dismissible; nút đóng "Đóng hộp thoại" (44px); unmount đóng dialog gốc để trả focus; khóa cuộn qua `useDocumentScrollLock`.
- Header dính khi nội dung cuộn. Hoạt ảnh vào chỉ chạy dưới `motion-safe`.

## `ui/use-document-scroll-lock.ts`
Đếm tham chiếu theo document để popup lồng nhau không đè nhau; đặt `data-omts-scroll-locked` trên `<html>`; không đụng inline style, không gọi `scrollTo`. Test: `dialog-scroll-lock.test.tsx`.

## `ui/confirm-dialog.tsx` — ConfirmDialog
Props: `title`, `description`, `confirmLabel` ("Xác nhận"), `cancelLabel` ("Hủy"), `tone` (`primary`|`danger`), `isPending`, `error`. Khi pending không đóng được. `error` hiện `role="alert"` trong hộp `bg-danger/10`. Nút xếp ngược trên mobile, hàng ngang từ `sm`.

## `ui/use-action-dialog.tsx` — useActionDialog()
Trả `{ confirm(msg): Promise<boolean>, prompt(msg): Promise<string|null>, dialog }`; thay `window.confirm`/`prompt`. `prompt` hỏi "Lý do" (textarea tối đa 1000 ký tự); nút "Đồng ý" tắt khi trống; nút hủy "Quay lại"; `mobileLayout="compact"`. Nơi gọi phải tự render `{dialog}`.

## `ui/toast-provider.tsx` — ToastProvider, useToast()
`notify({title, description?, tone?: "info"|"success"|"danger", durationMs?=4000})`. Gắn ở layout gốc. Chồng `fixed bottom-4 inset-x-4 z-50`, từ `sm` lên phải (`right-5`, max-w-sm); tối đa 3 toast. Container `aria-label="Thông báo hệ thống"`; `role="alert"` cho danger, `role="status"` còn lại; hẹn giờ tạm dừng khi hover/focus (`pausable-timer.ts`); nút "Đóng thông báo". Tone = viền màu + chữ tiêu đề trên nền trắng.

## `ui/data-grid.tsx` + `.module.css` — DataGrid
Props: `headings: string[]`, `children` (hàng), `empty?`, `responsive?`. Trống: "Không có dữ liệu phù hợp." Mặc định dưới 640px bảng `max-content` cuộn ngang với cột đầu dính. Chế độ `responsive`: mỗi hàng thành thẻ, `<td data-label>` hiện nhãn bằng `::before`, đầu bảng ẩn trực quan. Ô `[data-currency]` canh phải, tabular. Từ 1024px nút trong hàng cao 32px. Đầu bảng `scope="col"`. Được bọc bởi `DataTable` trong `features/operations/ui.tsx`.

## `ui/openable-table-row.tsx` — OpenableTableRow
Props: `onOpen`, `disabled`, + prop `tr`. Bấm hàng để mở; bỏ qua click trên phần tử tương tác con và khi đang bôi chọn chữ; hover/`:focus-within` nền `primary-soft`; disabled `cursor: wait`. Ghi chú trong code: vẫn phải có nút/liên kết thật trong một ô cho người dùng bàn phím.

## `ui/filter-workspace.tsx` — FilterWorkspace
Props: `filters`, `children` (kết quả), `label` ("Bộ lọc"), `reset`. Rail `<aside aria-label>` bên trái nền `surface-subtle`: dưới 640px một cột; 640–959px trường lọc 2 cột; từ 960px rail 232px dính tại `top:154px`, vùng trường cuộn được. Ví dụ: `features/employee-api/employee-directory.tsx`.

## `ui/filter-checks.tsx` — FilterChecks
Props: `label`, `options: [key, text][]`, `value`, `onChange`, `disabled`. Mã hóa giá trị ở `shared/presentation/filter-selection.ts`: `""` = tất cả, `"-"` = không chọn, `"a|b"` = tập con. Ô "Tất cả" có trạng thái `indeterminate`. Render `fieldset` + `legend`. Hàng chạm 32px, 44px dưới 640px.

## `ui/management-page.tsx`
- `ManagementHeading({title, description, icon, children})`: `<header>` có h1, icon 18px, mô tả, slot hành động canh phải từ `lg`.
- `ManagementSummary({items:[{label,value,icon}]})`: `<dl>` 3 cột, vạch trái.
- `PersonAvatar({name})`: chữ cái đầu + cuối, ô vuông 36px.
- `StatusPill({tone: success|danger|neutral})`: pill 11px có chấm — "chữ + chấm" để nghĩa không chỉ dựa vào màu. Ví dụ `employee-directory-table.tsx`.
- `DirectoryEmpty({title, description})`: ô icon tìm kiếm 56px, tiêu đề, mô tả, canh giữa.
- `directoryRowStyles`: hằng chuỗi style cho hàng danh sách.

## `ui/evidence-gallery.tsx` — EvidenceGallery
Props: `images[{id,url,label}]`, `title` ("Hình ảnh ghi nhận"). Preview 16:10, liên kết "Mở ảnh gốc ↗", dải thumbnail `aria-pressed`. Trống: "Chưa có ảnh được ghi nhận." Dùng `next/image` `unoptimized`.

## `ui/interface-icon.tsx` — InterfaceIcon
Bộ icon SVG nội tuyến 24×24, stroke 1.7, `aria-hidden`, cỡ mặc định `size-5`. 44 tên (bell, panel-close/open, menu, grid, list, logout, raft, dashboard, id-card, settings, calendar, document, users, account, roles, zone, search, add, arrow, refresh, link, lock, check, waves, attendance, employee, receipt, payment, cooperative, supplier, material, water, product, request, inbox, security, work…).

## `ui/use-directory-view.ts`
`useDirectoryView(key, initial, options)` → `[view, choose]`. Lưu lựa chọn bảng/lưới ở `localStorage` khóa `omts-directory-<key>` bằng `useSyncExternalStore`; lỗi storage thì dùng state bộ nhớ. Ví dụ `useDirectoryView("zones","table",["table","grid"])` trong `farming-zones/components/zone-directory.tsx`.

## `form/form-field.tsx` — FormField
Props: `id` (bắt buộc), `label`, `hint?`, `error?`, `endAdornment?`, + prop input. Nhãn phía trên; trường bắt buộc có `*` đỏ `aria-hidden`; `aria-describedby` nối id gợi ý + lỗi; `aria-invalid` khi lỗi; lỗi hiện dưới trường. Input cao tối thiểu 44px, viền `border-strong`, hover `primary/60`, viền danger khi lỗi.
*(Agent quét chỉ xác nhận phần nhãn/hint/aria; cách hiển thị chữ lỗi chưa kiểm chứng đầy đủ.)*

## `form/password-field.tsx` — PasswordField
Bọc `FormField`, nút chữ "Hiện"/"Ẩn" (`aria-pressed`, `aria-controls`, `aria-label` "Hiện/Ẩn mật khẩu"), đặt `data-password-field` để CSS toàn cục ẩn icon của Edge.

## `form/vietnamese-date-input.tsx` + `vietnamese-date-chooser.tsx`
- Input: `value` (ISO `YYYY-MM-DD`), `onValueChange(iso)`, `min`, `max`, `inputRef`, `calendarLabel` ("Chọn ngày"). Ô chữ `inputMode="numeric"`, placeholder `ngày/tháng/năm`, nút lịch 44px. Hiển thị `dd/MM/yyyy`; gõ `d/m/yyyy` hoặc `ddmmyyyy` được parse sang ISO; nhập sai vẫn hiện để schema form báo lỗi. Giới hạn "Từ dd/mm/yyyy. Không sau dd/mm/yyyy." nối qua `aria-describedby`. Chọn xong trả focus về input.
- Chooser: `Dialog` nhỏ với `<select>` ngày 01–31, tháng 01–12, ô số năm; Enter xác nhận; thông báo `role="alert"` ("Ngày không hợp lệ. Kiểm tra lại ngày, tháng và năm.", "Chọn ngày từ dd/mm/yyyy trở đi.", "Chọn ngày không sau dd/mm/yyyy."); mặc định hôm nay theo Asia/Ho_Chi_Minh, kẹp trong min/max; nút "Hủy"/"Chọn ngày".
- Helper: `shared/format/date-only.ts` (`isDateOnly`, `vietnameseBusinessDate`, `formatVietnameseDate`, `parseVietnameseDateInput`). `Field` của operations tự đổi `type="date"` sang input này.

## `layout/*`
- `app-shell.tsx` — AppShell: props `access`, `accountInitials`, `accountLabel`, `accountRole`, `accountScope`, `navigation?({compact,onNavigate})`, `topAction?`, `isLoggingOut`, `onLogout`, `children`. Cấu trúc: skip link "Đến nội dung chính" → header dính (hàng nhận diện + thanh menu) → `<main id="workspace-main">`.
- `app-navigation.tsx` — chế độ local; `navigationGroups`, mỗi mục `href`, `icon`, `label`, `requiredPermission`, lọc theo vai trò. Nhóm: Điều hành, Nuôi trồng, Vật tư & mua hàng, Nhân sự & phân quyền, Hợp tác xã, Hệ thống. Trống: "Chưa có mục phù hợp với quyền hiện tại."
- `navigation-group.tsx` — dropdown `<details>/<summary>`; đóng khi đổi route, bấm ngoài, Escape (trả focus về summary), bấm liên kết.
- `sidebar-account.tsx`, `use-sidebar-expansion.ts` — sidebar cũ, **không còn importer** (xem file 04).
- `auth-shell.tsx` — xem file 04.

## `feedback/*`
- `boot-screen.tsx` — `BootScreen({message})`: loader toàn trang `role="status" aria-live="polite" aria-busy`; logo "thở", thanh track trượt; mặc định "Đang tải hệ thống...". Dùng cho Suspense fallback và kiểm tra phiên.
- `restricted-access-icon.tsx` — SVG khiên + khóa `text-warning`, dùng ở màn từ chối quyền.

## `security/one-time-credential-dialog.tsx`
Props: `credential`, `title`, `description`, `onAcknowledge`. Dialog không đóng được, banner hổ phách, ô mật khẩu monospace chỉ đọc chọn khi focus, nút "Sao chép mật khẩu" có `aria-live` ("Đã sao chép" hoặc nhắc sao chép tay), xác nhận "Tôi đã bàn giao thông tin". Nội dung: hiệu lực 24 giờ, phải đổi ở lần đăng nhập đầu, không gửi qua kênh nào.

## Helper cấp feature (`features/operations/ui.tsx`)
`Field`, `Select`, `Note` (nhãn `text-xs`); `control` (cao 44px, 40px từ `lg`); `FilterPanel` (lưới 2/3/4 cột); `ErrorNotice` (`role="alert"`, `border-danger/30 bg-danger/5`); `Skeleton` (`role="status" aria-label="Đang tải dữ liệu"`, 3 thanh 56px); `Money` (`vi-VN`, 0 số lẻ, hậu tố " ₫", `data-currency`, null → "—"); `Paging` ("N bản ghi · Trang P", "Trước"/"Sau"); `statusLabel`, `methodLabel`; `useRemote` (loading/error/reload); `useMutation` (pending, error, chặn khi xung đột hoặc kết quả không chắc); `businessToday`, `displayTime`, `toApiTime` (+07:00); `operationError()` ánh xạ mã backend sang tiếng Việt.
