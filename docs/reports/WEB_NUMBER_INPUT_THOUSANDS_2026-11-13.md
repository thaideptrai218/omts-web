# N0b — Nhóm hàng nghìn khi nhập số, 13/11/2026

## Đã làm

- `UnitInput`/`UnitField` và `MoneyInput`/`MoneyField` tự nhóm nghìn ngay khi gõ: `95000` → `95.000`, `1250000` → `1.250.000`. Focus giữ nhóm nghìn.
- Giữ nguyên chữ số của bản nháp, kể cả phần lẻ/số 0 cuối (`95,50`, `1.234,567`) và dấu phẩy đang nhập (`95,`). Blur đơn vị chỉ bỏ dấu phẩy cuối; không thêm số lẻ hoặc làm tròn bản nháp.
- Tính lại cả hai đầu vùng chọn theo chữ số bên trái, có neo cho dấu âm/dấu phẩy; khôi phục sau React commit. Backspace/Delete cạnh dấu nhóm xóa chữ số liền kề, không kẹt vì dấu chấm tự xuất hiện lại. Hỗ trợ dán số dài, dán giữa chuỗi, thay vùng chọn.
- Giữ hợp đồng giá trị số/null của Input và chuỗi máy của Field (`95000`, `0.5`, rỗng). Giữ N0: cha phản hồi số không ghi đè bản nháp, xóa hết vẫn rỗng, vượt max báo lỗi nhưng không ép số về giới hạn, lỗi validity/min/max và bước tăng/giảm cũ.
- Giữ `autoThousands`, đọc tiền bằng chữ, mở rộng `300k`, `2tr`, `1,5tr` khi blur; tiền số nguyên không tự mất số 0 đầu khi blur.
- Không setState trong effect, không đọc ref khi render. Các tệp mã/test thay đổi đều dưới 200 dòng.

## Quy tắc dấu phân cách và giả định

- Hiển thị Việt Nam: `.` nhóm nghìn, `,` thập phân. Nhóm lại bằng xử lý chuỗi, không chuyển bản nháp qua Number để định dạng.
- Đơn vị có phần lẻ: dấu `.` gõ mới được đổi thành `,`; dấu phẩy cuối phân chia phần nguyên/phần lẻ. Dấu chấm có sẵn do chương trình thêm luôn là dấu nhóm. Dán `1.250` hiểu là nhóm nghìn; dán có nhóm cuối khác ba chữ số hoặc phần nguyên không đúng nhóm nghìn, ví dụ `1234.567`, hiểu dấu chấm cuối là thập phân. Muốn nhập phần lẻ không mơ hồ khi dán, dùng `,`.
- Ô nguyên (`decimals=0`, kể cả đơn vị không cho phép phần lẻ) bỏ dấu chấm/phẩy và nhóm lại toàn bộ chữ số. Ví dụ tiền `12,5` → `125`; không coi đó là 12,5 đồng.
- Riêng tiền viết tắt: giữ dấu đã gõ trong bản nháp riêng để nhận hậu tố nhập sau. Khi gõ `1,5`, ô tiền nguyên hiển thị `15`; khi thêm `tr`, hiện `1,5tr`, blur thành `1.500.000`. Dán nguyên chuỗi viết tắt cũng được hỗ trợ.
- Không đổi `parseDecimalText`/`parseMoneyText` hay API: độ chính xác của giá trị số phát ra vẫn theo `decimals` hiện có; phần hiển thị giữ toàn bộ chữ số đã gõ. `number-fields.tsx` tiếp tục chuyển số/null thành chuỗi máy/rỗng như trước.

## Tệp thay đổi

Trong `src/components/form/`:

- Sửa: `unit-input.tsx`, `money-input.tsx`, `number-field-parts.tsx`.
- Thêm: `grouped-number-text.ts`, `use-grouped-number-editing.ts`, `money-shortcut-draft.ts`.
- Cập nhật test: `unit-input.test.tsx`, `money-input.test.tsx`, `number-fields.test.tsx`.
- Thêm test: `grouped-number-text.test.ts`, `number-fields-editing.test.tsx`.

Không sửa các màn nursery/cultivation hoặc các thay đổi có sẵn của người khác. Không cần chỉnh màn cha.

## Kiểm tra

- ESLint đúng 11 tệp mã/test trên: đạt, không cảnh báo (gồm React Compiler).
- Test cuối: **7 tệp, 91/91 test đạt** — `grouped-number-text`, `unit-input`, `money-input`, `number-fields`, `number-fields-editing`, `nursery-complete-dialog`, `records-forms-units`.
- `npx tsc --noEmit -p .`: chạy đúng **một lần**, exit 0, không lỗi.
- `git diff --check -- src/components/form`: đạt.
- Không có test `nursery-start` trong repo; chạy `nursery-complete-dialog.test.tsx` và `records-forms-units.test.tsx` nguyên trạng cùng test ô số.
- Không build, dev server, toàn bộ test, CI, commit hoặc push.

## Chẩn đoán đã kiểm chứng

- Test hồi quy đầu: `npx vitest run src/components/form/money-input.test.tsx -t 'groups digits while typing'` thất bại, thực tế `1250000` thay vì `1.250.000`. Nguyên nhân: N0 chỉ định dạng khi blur. Đã chuyển nhóm nghìn sang sự kiện nhập, giữ bản nháp riêng khỏi giá trị số.
- Rà soát phát hiện dán `12` trước dấu nhóm trong `95.000` có thể thành `9.512,000`: suy luận thập phân từ toàn chuỗi làm hiểu nhầm dấu nhóm cũ. Chỉ suy luận từ dấu chấm trong phần vừa chèn; thêm test thuần và test dán thực tế. Lượt test đang chạy trước bản sửa ghi nhận lỗi này; lượt sau bản sửa đạt các test liên quan.
- Workflow được AGENTS dẫn tới trong `%USERPROFILE%/.Codex/rules/` không có trên máy; chỉ có `default.rules`. Tiếp tục theo AGENTS, tài liệu repo và giới hạn trực tiếp của người dùng.

## Còn thiếu

- Chưa thử trực tiếp trình duyệt/thiết bị thật, IME và bàn phím di động; đã kiểm tra con trỏ/vùng chọn qua jsdom/user-event.
- Không có câu hỏi nghiệp vụ mới.
