# Phase 05: Web màn Ươm giống (W2)

**Người làm:** **Codex GPT-6.1 sol, reasoning high** (fallback Claude). **Ưu tiên:** P1. **Phụ thuộc:** Phase 02 (hợp đồng API `FARMING_NURSERY_API_CONTRACT_2026-11-12.md`). **Trạng thái:** in-progress — đã triển khai; ESLint và 6 test đạt, TypeScript sau sửa chưa xác nhận; API/trình duyệt chưa kiểm chứng.

## Context
- Đặc tả mục 3, 5.2, 7, 10. Mẫu khuôn màn: `src/features/zones-api`, `rafts-api` (danh sách + chi tiết mở tại chỗ), `employee-api` (hai bước tạo, sửa tại chỗ), bộ chọn ngày thống nhất, `UnitField`/`MoneyField`, lịch sử `src/features/history`, liên kết `farming-management/entity-links.ts`, tải ảnh dùng chung (Phase 06 tạo; ở đây dùng bản tạm nếu chưa có).

## Yêu cầu
- Thư mục mới `src/features/nursery-api/**`; route `/farming/nursery` (menu Nuôi trồng: Vùng nuôi, Bè nuôi, **Ươm giống**, Chu kỳ nuôi, Thả giống, Thu hoạch, Sử dụng vật tư (tùy chọn), Sản lượng, Truy xuất, Nước).
- Danh sách khung quản lý: mã NU, vùng, lô giống (link), số mảnh vào, ngày bắt đầu, số ngày ươm, trạng thái; lọc vùng/trạng thái/thời gian; chi tiết mở tại chỗ (thông tin, ảnh, lịch sử, phân bổ và chu kỳ đã tạo có liên kết).
- **Bắt đầu ươm (pop-up hai bước):** nhập gọn (vùng, lô giống từ kho hiện tồn và đơn vị mảnh, số mảnh, ngày, **ảnh 1-3 bắt buộc**) → **bảng xem lại cuối** (tồn trước/sau) → xác nhận.
- **Hoàn tất ươm (pop-up hai bước):** số sống sót (nhãn ước tính, ≤ số vào) + ảnh 1-3 → chọn **một hoặc nhiều bè cùng vùng** và chia số mảnh (nút "dồn hết vào một bè", "chia đều theo số làn"), tổng phải bằng số sống sót, sản lượng dự kiến từng bè (**không có ngày thu dự kiến**) → **bảng xem lại cuối** (vào, sống sót ước tính, hao hụt ước tính %, phân bổ) → xác nhận tạo chu kỳ.
- Sửa số sống sót (cũ → mới, lý do); chuyển phân bổ giữa bè trước khi thả; sửa/hủy khi còn Đang ươm; thông báo thành công bằng toast; lỗi backend nêu trường.
- Vùng chưa có bè: nút "Tạo bè nuôi cho vùng này".
- Hành trình chu kỳ thêm bước Ươm ở đầu (dùng dữ liệu `nursery*` trên chu kỳ).

## Files
Mới: `src/features/nursery-api/**`, `src/server/nursery/**` (BFF), `src/app/(app)/farming/nursery/page.tsx`. Sửa: `api-workspace-shell.tsx` (menu), `cycles-api` (bước ươm trong hành trình), `entity-links.ts`.

## Steps
- [x] zod + service/repository + BFF (request chặt, response dung sai, CSRF, quyền vùng) theo hợp đồng.
- [x] Danh sách + chi tiết + lịch sử; sửa tại chỗ, hủy có lý do; bảo vệ nội dung chưa lưu.
- [x] Hai pop-up hai bước; ảnh 1–3; phân bổ, sửa sống sót/chuyển bè; số sống sót 0 không tạo chu kỳ.
- [x] Menu, route, liên kết, hành trình; liên kết tạo bè mở đúng vùng.
- [x] ESLint phần thay đổi: đạt.
- [x] ESLint riêng `nursery-http.ts` sau sửa và `git diff --check`: đạt.
- [x] Test hàm thuần mới: 6/6 đạt.
- [ ] TypeScript: chạy một lần exit 1, TS2339 tại closure `backend.config.origin` của `nursery-http.ts`; đã sửa bằng cách giữ cấu hình sau API guard. Không chạy lại theo giới hạn phiên; kết quả sau sửa chưa xác nhận.
- [ ] Điều phối viên kiểm tra API/trình duyệt: hoàn tất một đợt chia hai bè, mở đúng chu kỳ; kiểm tra 360 px/1024 px, quyền Owner/Quản lý vùng và lỗi endpoint 404.

## Thành công
Hoàn tất một đợt chia 2 bè; chu kỳ xuất hiện; tổng phân bổ lệch bị chặn trước khi gửi; mọi số đều ghi đơn vị mảnh, số suy ra ghi ước tính.

## Rủi ro
Hợp đồng đổi: dùng schema dung sai; đợi hợp đồng Phase 02 đã commit trước khi bắt đầu.

**Tiếp nhận W2:** dùng bản hợp đồng đang hoàn thiện theo chỉ đạo trực tiếp; chưa kiểm chứng backend đang chạy. Request giữ strict, response bỏ trường thừa. Cần đối chiếu hợp đồng lần nữa trước lượt tích hợp; không đánh dấu Jira Done chỉ từ kiểm tra cục bộ.

## Kiểm tra gọn
eslint + `tsc` một lần + test hàm thuần.

Không build/dev server, không commit/push trong phiên này theo yêu cầu người giao. Bước kiểm tra tích hợp và Git do điều phối viên tiếp nhận; chỉ chốt phase khi tiêu chí thành công đã có bằng chứng.
