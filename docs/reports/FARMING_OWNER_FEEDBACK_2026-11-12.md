# Nuôi trồng — phản hồi Owner 12/11/2026

## Kết quả

1. Menu/tab/slim bar: Chu kỳ nuôi → Thả giống → Thu hoạch → Sử dụng vật tư (tùy chọn) → Theo dõi chất lượng nước. Menu giữ Vùng/Bè ở đầu, Sản lượng/Truy xuất sau Vật tư. Hành trình có bốn mốc chính Kế hoạch → Thả giống → Thu hoạch → Tổng kết; Chăm sóc/Vật tư là hoạt động phụ có nhãn Tùy chọn. Toast lưu thả giống dẫn sang Thu hoạch.
2. Panel thả giống/vật tư/thu hoạch: nút ghi nhận và Tải lại nằm trong header, nút chính trước, Tải lại secondary, giữ quyền nghiệp vụ.
3. Điều hướng thu hoạch: sửa mất ngữ cảnh trong tab, cycleId rỗng khi tra tiến độ theo ngày, vùng không cập nhật khi URL đổi cùng route, workspace giữ state màn trước. Link recordId tự mở đúng trang chứa lô, kể cả sau trang đầu. Chu kỳ cũ có recordId mở endpoint chi tiết lô; chu kỳ cũ không có recordId dẫn tới Sản lượng nuôi đã lọc thay vì hiện nhầm chu kỳ mới.
4. LaneOverview dùng chung ở bè, tiến độ chu kỳ, thả giống và bộ chọn thu hoạch. Header sticky gồm tìm số làn, chip tình trạng/đếm, khoảng số làn; grid có token màu, số tabular, hover/focus/selected, skeleton/empty. Giữ chọn dãy/Shift và lý do chặn thu hoạch. Bỏ CSS cũ ép mọi nút sơ đồ cao 72px và stylesheet grid thu hoạch không còn dùng.
5. Bỏ nút Thiết lập thu hoạch và screen swap cũ; xóa `cultivation-api/harvest-settings.tsx`. Owner quản lý tại `/settings?section=harvest`, với UnitField kg/lồng/ngày, Bỏ qua/Lưu, toast, settings/settings-preview, preview/xác nhận giảm ngày, rowVersion và đối chiếu khi gửi chưa rõ kết quả. Form thu hoạch có hint tỷ lệ hiện tại và link cho Owner. Giữ nguyên hook lookup kg/lồng. Không tìm thấy test riêng/import còn sót của form cũ.

## File

- Điều hướng: `src/features/api-workspace/api-workspace-shell.tsx`; `src/features/farming-management/{farming-workflow-nav.tsx,farming-step-bar.tsx,entity-links.ts,use-zone-choice.ts}`.
- Chu kỳ: `src/features/cycles-api/{raft-cycle-workspace.tsx,cycle-progress-tab.tsx,cycle-journey-tab.tsx,cycle-journey.test.tsx}`.
- Bản ghi: `src/features/cultivation-api/{records-screen.tsx,records-raft-panel.tsx,records-seeding-panel.tsx,records-materials-panel.tsx,records-harvest-panel.tsx,records-seeding-form.tsx,records-harvest-form.tsx}`.
- Sơ đồ làn: `src/features/farming-management/{lane-overview.tsx,lane-overview.module.css}`; `src/features/cultivation-api/{harvest-lane-choices.tsx,cultivation-flow.module.css}`; xóa `harvest-lane-picker.module.css`.
- Thiết lập: `src/features/settings/{settings-page.tsx,harvest-settings-panel.tsx}`; xóa `src/features/cultivation-api/harvest-settings.tsx`.

## Chẩn đoán control Thu hoạch

| Control | Nguyên nhân trước sửa | Sửa |
| --- | --- | --- |
| Tab Thu hoạch | Link trần `/operations/harvest`, mất vùng/bè/chu kỳ | Giữ ba tham số; bỏ recordId của màn nguồn |
| Footer tiến độ tra theo ngày | Dùng cycleId đầu vào rỗng thay vì chu kỳ API trả về | Dùng `data.cycle.id` |
| Link cùng route/vùng khác | Hook vùng chỉ khởi tạo từ URL một lần | Đồng bộ lựa chọn với linkedZone mới |
| Link lô sau 10 dòng đầu | selectedLot có nhưng trang vẫn là 1; fallback bị chặn vì lô tồn tại | Tính trang đầu từ recordId |
| Link chu kỳ cũ | Màn thu hoạch bỏ qua cycleId, tải chu kỳ gần nhất | Chặn hiển thị nhầm; mở detail khi có recordId, đưa tới yield khi chỉ có cycleId |

Journey, slim bar, lane detail và footer dùng các link builder hiện có; đã rà soát tĩnh đường dẫn/handler và màn nhận. Không tuyên bố đã tái hiện lỗi bằng thao tác live.

## Kiểm tra

- PASS `npx.cmd eslint src/features/api-workspace src/features/farming-management src/features/cycles-api src/features/cultivation-api src/features/settings`.
- Chạy đúng một lần `npx.cmd tsc --noEmit -p .`: phát hiện TS2339 tại hai assertion `toHaveTextContent` trong test Hành trình vừa cập nhật. Đã đổi sang `textContent` + `toContain`, đồng thời chuyển query nút Chăm sóc sang aside tùy chọn. Không chạy lại tsc theo giới hạn một lần của người dùng; trạng thái typecheck cuối chưa được xác minh lại.
- PASS eslint riêng `cycle-journey.test.tsx` sau sửa matcher và `records-raft-panel.tsx` sau bổ sung chi tiết lô cũ.
- Không build, không batch Vitest, không thêm helper thuần mới, không thao tác Git, không browser. Responsive rà soát tĩnh: toolbar wrap, cột auto-fill minmax, min-width:0, 44px cell ở màn hẹp. Chưa xác nhận bằng ảnh ở 1366px/dialog hẹp.

## Giới hạn / câu hỏi mở

- Endpoint danh sách thu hoạch theo bè hiện không nhận cycleId. Xem danh sách riêng chu kỳ cũ dùng Sản lượng nuôi; chi tiết từng lô vẫn dùng endpoint detail hiện có.
- Chưa có câu hỏi nghiệp vụ mới. Còn kiểm chứng live click/responsive và chạy lại typecheck ở lượt được cấp quota tiếp theo.
