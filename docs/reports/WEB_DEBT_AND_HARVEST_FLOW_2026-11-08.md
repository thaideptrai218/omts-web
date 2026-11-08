# Đợt hoàn thiện công nợ NCC và hồ sơ thu hoạch — 08/11/2026

## Nguồn và giới hạn

Đối chiếu ảnh `11_Ke-toan_Cong-no-luong-va-bao-cao/01_SCR-PURCHASE-04_Cong-no-nha-cung-cap_web_man-hinh-chinh.png` trong bộ WEB-desktop. Dùng API đã có của SupplierDebtsController và các repository Web hiện có; không triển khai business API mới hoặc đổi runtime/database/branch backend.

## Công nợ nhà cung cấp

- Tìm kiếm trên kết quả, kỳ sổ đối chiếu bên trái, bảng mật độ gọn. Nhấn dòng NCC mở chi tiết ngay dưới dòng, thay popup sổ.
- Tab Sổ đối chiếu: số dư đầu/cuối kỳ, phát sinh theo ngày, chứng từ, phương thức và ghi chú; số dư lấy trực tiếp backend, không tính lại theo danh sách đang phân trang.
- Tab Phiếu nhập chưa thanh toán nối API detail công nợ đã có; dùng lại hàng chờ và form giao dịch v2. Ghi nhận thanh toán / NCC trả lại tiền chọn đúng NCC và loại Payment/PaidBack. Confirmation, deduplicationKey, trả trước, trùng mã ngân hàng, giữ nháp và unknown no replay giữ nguyên từ PaymentEditor.
- Mã phiếu nhập và giao dịch mở đúng API chi tiết hiện có. Khi lưu/hủy thành công, đọc lại số dư/phiếu/sổ đối chiếu; không tự gửi lại lệnh.
- Phân trang danh sách10/20/50/100 qua BFF, endpoint backend vẫn cũ. Sổ chi tiết phân trang20 trên toàn bộ entries backend trả.
- GET `/api/supplier-debts/export` được nối qua BFF: query whitelist, View/Export riêng, kiểu XLSX, giới hạn32MB, kiểm lại cùng phiên sau tải, no-store/nosniff. Không thay quyền hay cơ chế phiên.
- Kỳ chỉ lọc sổ; số dư hiện tại và phiếu chưa trả là đến hôm nay. Tổng danh sách theo tìm kiếm do backend cung cấp. Không xuất kỳ đang gõ nhưng chưa áp dụng.

## Thu hoạch

- Bấm dòng/mã lô mở preview ngay dưới dòng, tải GET detail thật theo id+zoneId. Xem làn/đã thu hết, người/thời điểm, số lồng, quy đổi tại lượt ghi, ước tính, hóa đơn, bán/trả/còn lại/hao hụt/chênh lệch, ảnh.
- Giữ phân biệt ước tính và số bán thực tế; cờ chưa chốt hiển thị đúng backend. Không lấy số lồng hoặc kg quy đổi hiện tại để viết lại số liệu lô cũ.
- Mở hồ sơ lô / xử lý dùng editor đã có, giữ quyền và trạng thái. Chưa thêm API hóa đơn/truy xuất mới trong đợt này.

## Kiểm tra

11 targeted tests PASS: BFF list/export/query/session/Export permission; mở sổ inline, tab chưa trả, preview harvest dùng số API, regression vật tư.
Typecheck PASS. Lint phát hiện React Compiler không chứng minh allowed(View) là primitive; đổi sang boolean rõ ràng, không đổi kết quả kiểm quyền. Kết quả lint/build cuối ghi tiếp bên dưới.
Browser Owner API3002/8082: 5NCC, nợ tổng61.534.500đ; NCC Hạ Long hiện12.844.000đ, sổ đầu12.840.000/cuối12.844.000;7phiếu còn nợ; mở TT000022 đúng API; form PaidBack chọn sẵn đúng NCC/loại, sau đó bỏ nháp, không gửi giao dịch. Export XLSX thật8493byte, archiveCRC hợp lệ.
CSS360/1024 công nợ không tràn ngang. Ảnh `.hallmark/supplier-debt-ledger-20261108.jpg` và harvest bổ sung sau; công cụ screenshot vẫn có lỗi scale/crop desktop, không coi ảnh đó là kiểm tra đủ toàn trang.
Không xác nhận đã chạy lại mọi role hay ghi tài chính trên browser. Không commit/push/merge; giữ thay đổi local trước đó. Danh sách hóa đơn/bán hàng, truy xuất, công nợ khách, báo cáo/lương vẫn cần các đợt riêng và đối chiếu ref/runtime.

Browser thu hoạch: lô DEMO-01-B1-01-20261106 có8lồng×50kg/lồng tại lượt ghi, ước tính400kg, đã bán0, còn400, chưa chốt; ảnh tải thành công. Preview mobile rộng334px, document scrollWidth360. Ảnh `.hallmark/harvest-inline-preview-20261108.jpg`.

Kết quả cuối: lint/typecheck/build PASS,61routes;11targeted tests PASS. Chưa commit/push/merge. Browser giữ hồ sơ lô thu hoạch mở cho người dùng.
