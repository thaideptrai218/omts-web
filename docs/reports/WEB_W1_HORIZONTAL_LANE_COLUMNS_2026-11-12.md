# W1 — Sơ đồ làn dạng cột ngang

Nhánh: `feature/OMTS-132-web-login-farming`. Phạm vi: phase-04, đặc tả nursery mục 10.3/10.6. Không đổi bán hàng, yêu cầu mua, nursery-api hoặc các phase khác.

## Đã làm

- `farming-management/lane-progress-display.ts`: hàm thuần ánh xạ trạng thái/% thành nhãn, token màu, phần đổ. % backend ưu tiên; hỏng/ngừng ưu tiên trạng thái nuôi. Dữ liệu cũ: đã thả/đã thu suy ra 100%; đang thu thiếu tỷ lệ giữ `null` và nhãn “Chưa ghi %”, kể cả backfill `seededPercent=100`.
- `lane-overview`, `lane-column`, `lane-detail-popover`: cột 64 px xếp ngang, số làn sticky, thanh cuộn hiện rõ, tìm số nhảy ngang, bộ lọc kèm đếm, chú giải, phím trái/phải/Home/End, reduced motion. Dùng cuộn native, không cập nhật React theo scroll; chỉ mount chi tiết một làn. Chưa đo hiệu năng thực tế 100 làn.
- Token màu trạng thái riêng trong `globals.css`: xanh lá đậm, xanh dương đậm, cam, đỏ, xám có viền, ngừng gạch chéo. Nhãn % trên nền trung tính riêng, số làn trắng trên màu đậm. Dự án hiện chỉ có giao diện sáng, không thêm chế độ tối riêng.
- Popover native top layer, portal trong dialog đang chứa trigger; định vị bằng DOM khi resize/scroll, không setState trong effect hay đọc ref lúc render. Hiện %/người sửa/lịch sử; sự cố dùng lại form và repository hiện có. Đóng/chuyển làn có guard; khóa chéo hai editor để tránh mất draft khi reload. Dirty/pending được chuyển lên form cha và các bộ chọn chu kỳ/ngày.
- Dùng chung tại chi tiết bè, tab tiến độ chu kỳ và picker thả/thu. Giữ logic Shift/dải/chọn tất cả và repository hoàn tất nhiều làn. Giữ payload chứng từ thả/thu hiện có; % trong popover là lệnh điều chỉnh tiến độ độc lập. `lanePercents` gắn với lần thả/lô thu thuộc W3/B2.
- `lane-progress-repository.ts` gọi PUT BFF `/api/rafts/{id}/lanes/{n}/progress?zoneId=…`, chuyển upstream PUT cùng đường dẫn. Query/body strict Zod, số làn 1–200, % 0–100, lý do, rowVersion; reuse CSRF bounded body, session recheck, no-store và `CULTIVATION_CYCLES Edit` theo vùng. Backend vẫn kiểm quyền đối với bè thực tế. Chu kỳ lịch sử chỉ đọc. 404/405 ẩn phần sửa % trong sơ đồ đang mở; lỗi không chắc kết quả khóa gửi lại tới khi đối chiếu.

## Kiểm tra

- ESLint các tệp TypeScript đã đổi: đạt (kiểm tra lại sau các chỉnh sửa review).
- `npx tsc --noEmit -p .`: đạt, chạy đúng một lần. Sau đó có các sửa review nhỏ về guard/forward props; không chạy lại theo hạn mức.
- `npx vitest run src/features/farming-management/lane-progress-display.test.ts`: 7/7 đạt, bao gồm backfill % thu `null`, zero, số lẻ, trạng thái số, dữ liệu lỗi, ưu tiên sự cố.
- Không chạy build, full suite, dev server, browser hay Docker theo yêu cầu. Chưa xác nhận UI ở 360/1024/1366 px hoặc gọi API thật.

## Hợp đồng cần đối chiếu khi B2 có

- Request đã theo đặc tả: `{seededPercent?, harvestedPercent?, reason, rowVersion}`. BFF dùng quyền Edit chu kỳ cùng vùng như sự cố làn.
- Giả định response PUT là object làn trực tiếp: `{laneNumber, seededPercent?, harvestedPercent?, rowVersion?, state?, lastModifiedByName?, lastModifiedAt?, progressHistory?}`; phải có ít nhất một %. Không tự coi HTTP thành công nhưng sai schema là đã lưu.
- Giả định lịch sử đọc kèm làn: `progressHistory[{at, byName?, reason?, oldSeededPercent?, seededPercent?, oldHarvestedPercent?, harvestedPercent?}]`. Các trường đọc mới đều tùy chọn để backend cũ vẫn chạy. Cần đồng bộ tên DTO với B2; chưa có endpoint GET lịch sử % riêng trong đặc tả.
- Phiên bản gửi ưu tiên `lane.rowVersion`, sau đó phiên bản chu kỳ đang mở. Cần B2 xác nhận chủ thể rowVersion và response concurrency; thiếu phiên bản thì chỉ xem.
- Ảnh bắt buộc, payload % theo từng bản ghi và sửa luồng nursery là W2/W3/B2, không đổi trong W1.

## Tệp đổi

- `src/features/farming-management/lane-*`, `src/app/globals.css`.
- `src/features/rafts-api/{lane-incidents-board,lane-incident-details,lane-operating-details,operating-lane-overview,raft-geometry,raft-lane-diagram,raft-info-tab}`.
- `src/features/cycles-api/{contracts,cycle-progress-tab,cycle-lane-detail}`.
- `src/features/cultivation-api/{lane-picker-overview,seeding-lane-picker,harvest-lane-choices,records-contracts,records-seeding-form,records-harvest-form,harvest-aware-lane-overview,finish-harvest-overview}`.
- `src/features/operations/use-operation-editor.ts`: thêm pending từ editor con; các caller khác giữ mặc định false.
- `src/server/farming/{farming-http,farming-plan,lane-progress-plan}` và route PUT mới.

## Còn mở

Đối chiếu DTO/version B2, kiểm tra API thật và QA giao diện/hiệu năng 100 làn. Không xem W1 là bằng chứng backend đã hỗ trợ %.

## Bàn giao Git

Đã thử stage whitelist 34 tệp W1 để commit cục bộ; sandbox từ chối ghi `.git/index.lock` (`Permission denied`). Không có tệp được stage, không có commit, không push. Mã còn nguyên trong working tree. Message dự kiến:

`feat(farming-ui): horizontal lane columns with percent and strong colors [OMTS-132]`

Các file đặc tả/kế hoạch untracked đã có trước giữ nguyên, không đưa vào whitelist. File `FARMING_NURSERY_API_CONTRACT_2026-11-12.md` vừa xuất hiện đã được đọc: hiện là hợp đồng B1, chưa có DTO % của B2; không sửa file của đồng đội.
