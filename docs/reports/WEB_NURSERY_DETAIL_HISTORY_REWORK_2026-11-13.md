# N2 — Chi tiết và lịch sử Ươm giống, 13/11/2026

## Đã làm

- Lịch sử mỗi sự kiện một dòng: lúc, người, hành động ngắn; sửa sống sót có số cũ → mới. Mặc định đóng; nút riêng có `type="button"`, key và `aria-expanded`; bấm mới xem từng trường, lý do, ghi chú. Giữ phong cách danh sách lịch sử hiện có.
- Chi tiết luôn hiện vùng ươm mã + tên dạng văn bản. Tab **Đã chuyển sang bè** dùng danh sách gọn, mỗi bè một dòng số nhận/đã thả/còn lại/sản lượng dự kiến; giữ liên kết bè và hành trình nuôi. Ảnh là lưới nhỏ, bấm mở lớn trong hộp thoại có vùng chỉ đọc.
- Giữ quyền và cờ backend. Hủy/sửa/hoàn tất chỉ khi đang ươm. Chuyển lại chỉ hiện khi bè còn mở và còn mảnh chưa thả. Khi toàn bộ bè đã kết thúc, vẫn cho sửa tăng sống sót nếu còn hao hụt; có thể giữ nguyên các bè cũ và chuyển phần tăng sang bè mới.
- Danh sách dùng **Vùng ươm**, **Số mảnh vào ươm**; thêm cột chọn được **Sống sót (ước tính)**, **Hao hụt (ước tính)**. Không đổi logic lọc/sắp xếp/phân trang.
- Bắt đầu ươm có chọn **Vùng ươm**; bước xem lại hiện mã + tên. Sửa đợt chỉ hiện vùng dạng văn bản, không có ô đổi vùng và không gửi vùng thay thế.
- Hai form dùng `Field` chuẩn với state chuỗi nguyên văn, không định dạng lại khi gõ/xóa/blur. Chỉ đọc số khi kiểm tra/xem lại/gửi; nhận dấu phẩy hoặc chấm thập phân, tối đa 2 chữ số. Nhãn lượng vào ươm giữ mảnh; tồn lô giống dùng đúng `unit` backend, kể cả con, không chặn do khác đơn vị.
- Toast nêu đúng thao tác. Chữ cũ từ lỗi/lịch sử được chuyển ở lớp hiển thị; không đổi dữ liệu/hợp đồng `allocations`/`cycle`. Chỉ đổi chữ của bước Ươm trong `cycle-journey-tab.tsx`.

## Tệp N2

Trong `src/features/nursery-api/`:

- Sửa: `nursery-detail-panel.tsx`, `nursery-history-tab.tsx`, `nursery-table.tsx`, `nursery-screen.tsx`, `nursery-edit-form.tsx`, `nursery-start-dialog.tsx`.
- Thêm thành phần nhỏ: `nursery-photo-gallery.tsx`, `nursery-received-rafts.tsx`.
- Thêm hàm thuần: `nursery-display-text.ts`, `nursery-history-presentation.ts`, `nursery-quantity-value.ts`.
- Thêm test tương ứng: `nursery-display-text.test.ts`, `nursery-history-presentation.test.ts`, `nursery-quantity-value.test.ts`, `nursery-history-tab.test.tsx`, `nursery-edit-form.test.tsx`, `nursery-detail-panel.test.tsx`.

Ngoài module: `src/features/cycles-api/cycle-journey-tab.tsx` — chỉ chữ bước Ươm. Các tệp N2 đều dưới 200 dòng. Không sửa tệp N0/N1, bán hàng, đơn khách, kế hoạch làm việc.

## Kiểm tra

- ESLint chỉ các tệp N2 đổi/thêm: đạt; các bản sửa sau rà soát được lint lại riêng.
- 6 tệp test N2, **21 test đạt** qua các lượt chạy giới hạn. Kiểm tra lịch sử đóng/mở và retry, nhãn cũ, parser, vùng sửa chỉ đọc, giữ chuỗi thô, payload không đổi vùng, liên kết và các trường hợp ẩn/hiện hành động.
- `npx tsc --noEmit -p .` chạy **đúng một lần**, exit 1: hai test N2 đặt `guard.dialog: null` thay vì `Element | undefined`; đã sửa thành `undefined`, eslint và test hai tệp đạt sau sửa. Không chạy lại tsc theo hạn mức.
- Lượt tsc còn báo `nursery-complete-dialog.tsx(36,92) TS2345`: `batch.allocations[].targetYieldKg` có thể `null` nhưng hàm nhận `AllocationInput[]` chỉ cho `number | undefined`. Đây là tệp N1 đang sửa, N2 không đụng; cần người điều phối/N1 xử lý. Chưa khẳng định TypeScript toàn repo đạt.
- Không build, không dev server, không bộ test toàn repo, không CI, không commit/push.

## Còn thiếu và giả định

- Chưa QA trình duyệt ở 360/1024 px hoặc API thật; cần kiểm tra chung sau khi ghép N0/N1.
- Hợp đồng và schema lịch sử hiện không trả ảnh theo sự kiện; không suy diễn ảnh hiện tại thành ảnh lịch sử. Ảnh bắt đầu/hoàn tất vẫn xem được ở tab ảnh.
- Không thêm cột số bè nhận ở danh sách: schema danh sách hiện không giữ `allocationCount`; bè nhận thực tế nằm trong chi tiết, không tự gọi chi tiết từng dòng để suy diễn.
- Backend tiếp tục quyết định quyền, số lượng có thể chuyển và trạng thái bè khi ghi. Vùng bất biến; không thêm bước nghiệp vụ, thay trạng thái hoặc hợp đồng.
- Bốn tệp workflow `%USERPROFILE%/.Codex/rules/{primary-workflow,development-rules,orchestration-protocol,documentation-management}.md` không tồn tại; áp dụng AGENTS.md và tài liệu repo.

## Câu hỏi chưa giải quyết

Không có câu hỏi nghiệp vụ mới. Cần N1/người điều phối sửa lỗi kiểu nêu trên và QA tích hợp.
