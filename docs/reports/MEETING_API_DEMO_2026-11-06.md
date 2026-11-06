# Bản API phục vụ buổi họp 06/11/2026

## Mở bản chạy thật

Web: <http://localhost:3002/login>.

**Cổng 3000 hiện vẫn là bản mock cũ. Khi demo API dùng cổng 3002.**

| Tài khoản | Mật khẩu demo | Vai trò |
| --- | --- | --- |
| owner | Demo@1234 | Chủ hợp tác xã |
| quanlyvung1 | Demo@1234 | Quản lý DEMO-01 |
| quanlyvung2 | Demo@1234 | Quản lý DEMO-02 |
| ketoan | Demo@1234 | Kế toán |

Đây là tài khoản seed trong database demo mới, không phải danh sách tài khoản mock và không đổi mật khẩu database cũ. Phiên API dùng Redis, đã kiểm hai lần đọc phiên liên tiếp và sau ghi phiếu/thanh toán vẫn authenticated. Chưa xác minh F5 bằng browser trong đợt này.

## Hai luồng đã chạy thật qua BFF

### Nuôi trồng

Chọn nhóm Nuôi trồng:

1. `/operations/cultivation-cycles`: DEMO-01 → B1-06. Chu kỳ demo đã mở.
2. `/operations/seeding`: cùng bè, đã lưu một lần thả giống vào làn đủ điều kiện.
3. `/operations/material-usages`: đã lưu một dòng sử dụng vật tư, lý do nhận diện buổi họp.
4. Hồ sơ chu kỳ → tiến trình → nhật ký: đã lưu nhật ký và một ảnh demo.
5. `/operations/harvest`: lô `DEMO-01-B1-06-20261106`, 1 lồng, 10 kg ước tính, một ảnh demo.

Đây là dữ liệu seed/ghi phục vụ demo, không phải số liệu sản xuất thật. API đã lưu và đọc lại hồ sơ lô; chưa xác minh mọi thao tác sửa/gỡ hoặc mọi tình huống lỗi bằng browser.

### Mua hàng và kế toán theo contract mới

Người dùng đã duyệt [quyết định v2](../decisions/WEB_PURCHASING_V2_2026-11-06.md).

- `/operations/purchase-receipts`: danh sách/bộ lọc, hồ sơ, tạo/sửa nháp, hoàn thành, kiểm tra trước hủy, xóa nháp, trả hàng, Owner hủy phiếu trả. Có giữ nháp khi lỗi và rowVersion khi cập nhật/hủy.
- `/operations/supplier-payments`: danh sách, công nợ, ghi chi/thu hồi, mã ngân hàng, ghi chú, xác nhận trả trước/mã trùng, hủy giao dịch có lý do. Ghi mới có deduplicationKey, không tự gửi lại khi chưa rõ kết quả.
- Happy path đã ghi qua BFF và đọc lại: PN000024 hoàn thành 2.000đ → Kế toán TT000024 chi 2.000đ → Owner trả một đơn vị trị giá 1.000đ → Kế toán TT000025 ghi thu hồi 1.000đ → đọc lại công nợ.
- Phiên vẫn authenticated sau ghi phiếu và thanh toán.
- Các lần chuẩn bị trước có PN000021/PN000022 (đã hoàn thành), PN000023 và TT000022/TT000023. Chúng nằm riêng trong database demo, không xóa âm thầm hoặc tác động database cũ.
- Chưa nghiệm thu mọi thao tác hủy/trả hoặc edge case bằng browser. Chưa nối UI sao chép phiếu, sửa phiếu hoàn thành của Owner, xuất Excel/sao kê và chi phí bè v2, dù một số endpoint đã có.

## Dịch vụ đang chạy

- Web API 3002, `.env.api.local` trỏ API8082, Redis namespace `omts-web-meeting-20261106`.
- API8082: container `omts-meeting-20261106-api`, image `omts-api:meeting-20261106`, backend feature checkout `42e0195d` (harvest-corrections cùng các module cultivation phụ thuộc).
- SQL: `omts-latest-qa-sqlserver-1`, cổng máy 1436, database riêng **OMTS_MEETING_20261106**.
- Files volume riêng `omts-meeting-20261106-files`.
- Redis: `omts-web-session-redis`, cổng6380.
- API8080 và SQL1433/database cũ giữ nguyên; chưa migrate/xóa volume cũ.

Khởi động lại nếu Docker đã chạy:

```powershell
docker start omts-latest-qa-sqlserver-1 omts-web-session-redis omts-meeting-20261106-api
cd D:\Đồ_án\omts-web
npm run dev:api
```

Không chạy seed lại hoặc xóa volume để khởi động dịch vụ. `.env.api.local` được giữ local, không commit secrets.

## Kiểm tra đã làm và phần chưa sẵn sàng

- Docker Engine lên; API8082 `/health/ready` Healthy; Web `/login` HTTP200.
- `node scripts/check-meeting-api.mjs`: đăng nhập/phiên, vùng, chu kỳ, nhật ký, thả giống, vật tư, thu hoạch; phiếu nhập/thanh toán/công nợ Owner và Kế toán đều HTTP200 sau sửa contract.
- `prepare-meeting-demo.mjs --write-demo`: chuỗi ghi nuôi trồng trên database demo; script chỉ cho phép loopback và từ chối lặp mở chu kỳ B1-06.
- `prepare-meeting-purchasing-demo.mjs --write-demo`: chuỗi ghi mua hàng/chi trả/hoàn tiền. Script này tạo giao dịch mới mỗi lần chạy, không dùng làm health check định kỳ.
- TypeScript và lint phần mua hàng v2/scripts thay đổi đạt.
- Không chạy test sâu hoặc full browser E2E. HTTP session check không đồng nghĩa đã xác minh F5 UI trên mọi role.
- Backend develop đã pull lên **559640dc**. Nó đã merge cycles/rafts/payments/returns mới; nhưng chưa có đủ harvest/seeding/logs. Merge-tree thử giữa develop và harvest branch có nhiều xung đột; không ghép vội vào branch đang chạy.
- Runtime demo chọn feature harvest để chạy chuỗi nuôi trồng. **Không phải runtime hội tụ mọi API.** Sản phẩm/khách hàng/ngân hàng, workforce và loại việc có thể chưa có controller trên runtime này; không trình bày là các luồng đã sẵn sàng tại đây.
- Yêu cầu mua thương lái vẫn lệch giữa quyết định số lồng/staffing và develop kg; chưa nhận ready.
- VietMap Web đã có code nhưng chưa có `NEXT_PUBLIC_VIETMAP_API_KEY` ở local, nên hiện fallback danh sách tọa độ.
- Chuỗi hóa đơn bán, thanh toán khách, truy xuất và báo cáo tổng hợp chưa hoàn thành. Không dùng dữ liệu giả để nhận ready.

Giữ toàn bộ thay đổi local; không commit/push/merge develop Web.
