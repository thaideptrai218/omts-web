# N0 — Nhất quán ô nhập số, 13/11/2026

Phạm vi: `src/components/form/**` và test cạnh component. Nhánh `feature/OMTS-132-web-login-farming`. Không sửa nursery-api hoặc các màn nghiệp vụ; các thay đổi đồng thời của nhóm khác không thuộc báo cáo này. Không commit/push.

## Đã sửa và quy tắc cuối cùng

- Nguyên nhân: `liveDecimalText` nhóm ngay `95000` thành `95.000`; xóa một chữ số thành `95.00` bị hiểu là 95. Wrapper và cha chuyển chuỗi qua `Number` khiến giá trị này quay lại ô.
- UnitInput/UnitField và MoneyInput/MoneyField giữ nguyên bản nháp khi gõ, gồm dấu cuối, số 0 đầu/cuối, nội dung sai và trạng thái rỗng. Không tự nhóm nghìn/cắt chữ số hoặc di chuyển con trỏ khi gõ/xóa/chèn giữa chuỗi. Bỏ logic tự đặt lại con trỏ.
- Chỉ blur mới định dạng: nhóm nghìn bằng dấu chấm; số lẻ dùng dấu phẩy, làm tròn theo `decimals` và bỏ số 0 lẻ không cần thiết như formatter hiện có. Không tự thêm `.00`. Enter trong ô còn focus không định dạng lại.
- Focus lại ô đã nhóm nghìn hiện số không nhóm để sửa/xóa không nhầm dấu phân cách. Ô chỉ đọc giữ định dạng.
- Ô đơn vị nhận dấu phẩy hoặc một dấu chấm làm dấu thập phân trong bản nháp: `95,50`/`95.50` phát `"95.5"`; `1.250` khi gõ có nghĩa 1,25. Dán chuỗi có cả dấu nhóm và dấu lẻ (`1.250,5`) vẫn đọc được. Helper đọc chuỗi định dạng mặc định vẫn tương thích nhóm nghìn cũ.
- Wrapper vẫn phát chuỗi số chuẩn dấu chấm hoặc `""`; Input trực tiếp vẫn phát number/null. Bản nháp không bị viết lại khi cha trả `String(Number(...))`. Xóa rỗng vẫn rỗng dù cha chuyển thành 0.
- Vượt min/max chỉ hiện lỗi và cập nhật native validity; không sửa số đã gõ. Phím tăng/giảm theo `step` giữ hành vi giới hạn cũ.
- Tiền vẫn là số nguyên đồng; giữ lối tắt `300k`, `1,5tr`, đọc tiền bằng chữ và `autoThousands` khi nơi gọi chủ động bật. Chỉ định dạng ở blur. Số tiền có sẵn dưới 1.000 không tự nhân nghìn khi chỉ focus/blur.
- Không thêm setState trong effect hoặc đọc ref lúc render.

## Tệp N0 thay đổi

- `src/components/form/unit-input.tsx`, `money-input.tsx`: bản nháp, focus/blur, phản hồi cha.
- `src/components/form/decimal-text.ts`, `money-text.ts`: phân biệt dấu chấm bản nháp; bỏ định dạng trong lúc gõ.
- `src/components/form/number-field-parts.tsx`: giữ ref/validity, bỏ cơ chế tự đặt con trỏ.
- `src/components/form/number-fields.tsx`: ghi rõ hợp đồng chuỗi và trạng thái rỗng.
- `src/components/form/number-fields.test.tsx` (mới), `unit-input.test.tsx`, `money-input.test.tsx`.
- Báo cáo này. Mỗi tệp mã/test N0 dưới 200 dòng.

## Kiểm tra

- Test tái hiện trước sửa: 5 lỗi/8 ca, gồm `95000` tự thành `95.000`, mất số 0 đầu và đổi chuỗi khi sửa giữa ô.
- ESLint đúng 9 tệp mã/test N0, `--max-warnings=0`: đạt. Sau đó chỉ bỏ dòng trống cuối hai helper.
- Lượt test màn liên quan: **84 đạt, 3 lỗi / 87 ca**, 9 tệp. Các tệp đạt: ba test component, `rafts-api/raft-size.test.tsx`, `cultivation-api/{seeding-plan-tiers,seeding-stock-and-empty,harvest-plan-flow}.test.tsx`, `purchase-documents/price-setup-dialog.test.tsx`.
- Ba lỗi `raft-geometry-fields.test.tsx` do test lệch UI hiện có: đòi `.readOnly`/`.value` của input ở nơi đã dùng `<output>`; hai ca tìm nhãn cũ `Độ dài dây từng làn` thay vì `Độ dài từng làn (tùy chọn)`. Lỗi xuất hiện trước khi kiểm hành vi số; không sửa ngoài phạm vi.
- Sau bổ sung ca biên: ba test component + test giá mua **51/51 đạt**. Sửa tham số test Unit/Money rồi chạy lại riêng `number-fields.test.tsx`: **12/12 đạt**.
- `npx tsc --noEmit -p .`: chạy đúng **một lần**, exit 1; không có lỗi ở N0. Có 3 lỗi trong phần nursery đang được nhóm khác sửa: `nursery-complete-dialog.tsx:52` (hai TS2322: state `AllocationInput[]` số không khớp props `AllocationDraft[]` chuỗi), `nursery-edit-form.test.tsx:17` (TS2322: null không khớp Element | undefined). Không sửa nursery theo ranh giới được giao; chưa xác nhận TypeScript toàn repo đạt.
- `git diff --check` trong phạm vi N0: đạt. Ghi chú `docs/learning/WEB_NUMBER_INPUT_CONSISTENCY_2026-11-13.md` đã xác nhận được ignore.
- Không build, dev server, cả bộ test hoặc CI; chưa QA trình duyệt thật/thiết bị.

## Ảnh hưởng, còn thiếu và giả định

- Mọi nơi dùng bốn ô dùng chung nhận cách nhập mới: ươm, bè, thả/thu/chăm sóc, vật tư, phiếu nhập/trả, thu chi, lương, thiết lập; các nơi dùng chúng trong bán hàng/đơn khách cũng nhận hành vi qua component dùng chung, không sửa tệp nghiệp vụ đó.
- Cha nursery nên giữ giá trị nhập ở dạng chuỗi và chỉ đổi sang số khi tính/kiểm tra/gửi; đặc biệt không đổi `""` thành `quantity: 0`. N0 không sửa các tệp này. `nursery-start-dialog.tsx` và số sống sót ở `nursery-complete-dialog.tsx` đã giữ chuỗi; phần số mảnh từng bè cần nhóm phụ trách kiểm tra.
- Khi ghép: đổi state/khởi tạo của complete dialog sang `AllocationDraft[]` theo module draft của nhóm phụ trách, đổi thành `AllocationInput[]` chỉ tại ranh giới tính/ghi. Nhóm test sửa giá trị children/placeholder null ở test edit-form theo props hiện hành. Đây là chẩn đoán từ lượt tsc, không tự áp thay đổi ngoài phạm vi.
- Bản nháp rỗng/không hợp lệ được ưu tiên nếu cha trả 0 trong khi đang sửa. API number không phân biệt phản hồi ép rỗng→0 với lệnh reset thật thành 0; muốn reset tuyệt đối dùng null/chuỗi rỗng hoặc remount bằng key riêng. Không suy ra rằng trạng thái cha 0 đã giữ được ý nghĩa thiếu dữ liệu.
- Giả định giữ độ chính xác/rounding và tùy chọn `autoThousands` cũ; không đổi min/max nghiệp vụ hoặc payload. Phân biệt số gõ với định dạng hiển thị là thay đổi có chủ ý để tránh lỗi dấu chấm nhảy nghĩa.
- Các workflow trong `%USERPROFILE%/.Codex/rules/` không tồn tại; đã dùng AGENTS và tài liệu repo. Ghi chú chẩn đoán để trong `docs/learning/` đã ignore.

## Câu hỏi chưa giải quyết

Không có câu hỏi nghiệp vụ mới. Nhóm điều phối cần xử lý ba test hình học bè lệch UI và QA thật các form sau khi ghép nhóm.
