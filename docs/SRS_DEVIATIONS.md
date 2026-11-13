# Khác biệt so với SRS v8 - OMTS

**Cập nhật:** 12/11/2026 (bổ sung ươm giống, ảnh bắt buộc, % tiến độ làn; xem mục 13-14). **Phạm vi:** Web (`omts-web`, nhánh `feature/OMTS-132-web-login-farming`) và Backend (`omts-backend`, nhánh `feature/OMTS-132-nursery`; các nhánh farming/raft-lanes đã gộp vào đó).
**Tài liệu chủ:** file này là danh sách duy nhất các điểm sản phẩm khác SRS v8 hoặc không có trong SRS. README không ghi thay đổi; mọi ghi chú đã chuyển từ README nằm ở Phụ lục A (Web) và Phụ lục B (Backend), giữ nguyên văn.
**Backend:** `omts-backend/docs/SRS_DEVIATIONS.md` chỉ tóm tắt các mục phía backend.

## 0. Cách đọc

- **Chuẩn đối chiếu:** SRS v8 (Report-3 V8). Backend ghi mã "SRS 27/10/2026" cho danh mục thông báo và mua hàng V2. Chưa xác nhận hai bản có giống nhau (câu hỏi Q1).
- **Mã SRS:** ghi mã use case, quy tắc (BR-, GBR-), thông báo (MSG-) hoặc màn hình (SCR-) khi đối chiếu được. "-" nghĩa là chưa đối chiếu được mã trong bản SRS có trong tài liệu.
- **Trạng thái:**
  - **Đã làm:** có trong code hoặc đã commit.
  - **Đang làm:** có thay đổi chưa commit (kiểm tra ngày 11/11).
  - **Chờ backend:** Web đã làm, API chưa có hoặc chưa push. Đây không phải khác biệt chủ động.
  - **Chờ quyết định:** cần chủ dự án hoặc PM.
  - **Chờ xác nhận:** chưa rõ có khác SRS hay không, hoặc hai tài liệu mâu thuẫn.
- **Phía:** Web, Backend hoặc Cả hai.
- **Nguồn:** mỗi mục ghi nguồn. Nếu chỉ dựa trên báo cáo mà chưa thấy trong code, nguồn ghi "(theo báo cáo)".

## 1. Bảng tổng hợp

| ID | Mô-đun | Khác SRS v8 (tóm tắt) | Lý do / ai quyết | Phía | Trạng thái | Chi tiết |
|---|---|---|---|---|---|---|
| AC-01 | Đăng nhập & tài khoản | Đăng nhập bằng số điện thoại hoặc tên đăng nhập; bỏ email ở đăng ký, đăng nhập, khôi phục, xác minh và tài khoản | Chủ dự án, 11/11/2026 | Cả hai | Web: đã làm. Backend: đăng ký đã từ chối email; nhật ký 11/11 ghi module tài khoản chưa làm (Q18) | §2 |
| AC-02 | Đăng nhập & tài khoản | Ba vai trò vùng cố định: Quản lý vùng, Kế toán; Nhân viên là loại tài khoản; Chủ HTX chỉnh quyền, không tạo hoặc đổi tên vai trò | Quyết định Web 27/10/2026; backend `FixedRoles` | Cả hai | Đã làm (Jira OMTS-216 khác, xem mục 2) | §2 |
| AC-03 | Đăng nhập & tài khoản | Chỉ một tài khoản Kế toán; grant Kế toán chỉ "Tất cả vùng" | Báo cáo 03/11 (theo báo cáo) | Web | Chờ xác nhận | §2 |
| AC-04 | Đăng nhập & tài khoản | Backend `develop` không có actor System Administrator; Web vẫn có màn quản trị `/system` | Yêu cầu 06/11 (theo báo cáo) | Cả hai | Chờ xác nhận (Q14) | §2 |
| AC-05 | Đăng nhập & tài khoản | Không có trang đăng ký trên Web; thương lái tạo tài khoản qua Zalo Mini App, Chủ HTX duyệt yêu cầu | Quyết định 02/11; HR-A08 | Cả hai | Đã làm | §2 |
| AC-06 | Đăng nhập & tài khoản | Phiên Web: cookie HttpOnly, refresh token xoay vòng, phiên theo thiết bị, BFF không lưu phiên | Quyết định phiên (G1, 27/10) | Cả hai | Đã làm | §10, Phụ lục A (A5) |
| AC-07 | Đăng nhập & tài khoản | Hồ sơ nhân viên lưu trước, tài khoản tạo sau; username tự sinh; mật khẩu tạm hiện một lần | WEB-EMP-ACCOUNT-01 (28/10) và HR-A02 (11/11) mâu thuẫn về mật khẩu tạm | Cả hai | Đã làm trên Web; cần chốt (Q2) | §2 |
| HR-01 | Nhân viên | Danh sách, mở dòng ra 4 tab, sửa tại chỗ từng tab; pop-up chỉ để thêm, xác nhận đổi trạng thái, hiện bí mật một lần | HR-A01, HR-A02 (11/11) | Web | Đã làm | §3 |
| HR-02 | Nhân viên | Ngừng việc theo ngày làm cuối; làm lại qua `resume`; loại nhân viên bắt buộc và có lịch sử; bỏ liên kết tài khoản có sẵn | HR-A03, HR-A04, HR-A05 (11/11) | Cả hai | Đã làm (Web); backend có sẵn | §3 |
| HR-03 | Nhân viên | Lọc, sắp xếp, xuất và nhập file .xlsx; mã nhân viên, giới tính, CCCD, ngày bắt đầu làm việc | Yêu cầu theo KiotViet và hướng dẫn giao diện (10–11/11) | Cả hai | Backend: chờ push nhánh `feature/web-hr-api-gaps`. Web đã nối | §3 |
| HR-04 | Nhân viên | Không có email nhân viên (đã thêm rồi gỡ) | Quyết định 11/11 | Cả hai | Đã làm; SRS không có trường này nên không cần sửa | §3 |
| CL-01 | Chấm công & phân công | Chưa có đăng nhập app nhân viên; nhân viên dùng tài khoản đã liên kết hồ sơ; mã QR ký HMAC, hiệu lực 60 giây | Giai đoạn 2 backend (11/11) | Backend | Đã làm trên nhánh, chưa push | §4 |
| CL-02 | Chấm công & phân công | Không đẩy thông báo cho nhân viên (MSG-LABOR-05, -15); Chủ HTX nhận MSG-LABOR-23 | Chưa có app và thiết bị | Backend | Chờ backend | §4 |
| CL-03 | Chấm công & phân công | Khóa kỳ lương bảo thủ: khóa mọi ngày trước ngày cuối của bảng lương chờ chốt hoặc đã chốt | Giai đoạn 2 backend (11/11) | Backend | Chờ quyết định (Q9) | §4 |
| PAY-01 | Bảng lương | Chỉ Chủ HTX lập, chốt và trả lương (luật cứng, không theo quyền) | Chủ dự án, 11/11 (HR-A12) | Cả hai | Đã làm | §5 |
| PAY-02 | Bảng lương | Bỏ màn Thiết lập kỳ lương; chọn kỳ (Hàng tháng / Tùy chọn) trong pop-up tạo bảng lương | Chủ dự án, 11/11 (HR-A11) | Web | Đã làm (Backend còn API cài đặt cũ) | §5 |
| PAY-03 | Bảng lương | Trạng thái: Đang tạo, Tạm tính, Đã chốt lương, Đã hủy (SRS: Nháp, Chờ chốt, Đã chốt) | HR-A11 (11/11) | Cả hai | Đã làm | §5 |
| PAY-04 | Bảng lương | Không có bước "gửi cho Chủ HTX" và "trả lại"; Chủ HTX tạo, chốt, trả | Theo KiotViet (11/11) | Cả hai | Đã làm | §5 |
| PAY-05 | Bảng lương | Có tạm ứng, trừ vào lần chốt kế tiếp; SRS ghi "không trả trước" | Chủ dự án, 11/11 (mục E.3 còn hỏi) | Cả hai | Đã làm; cần xác nhận (Q4) | §5 |
| PAY-06 | Bảng lương | Hồ sơ nhân viên có tab Phiếu lương và Nợ và tạm ứng; bảng lương có tab Lịch sử thanh toán | HR-A13, HR-A14 (11/11) | Cả hai | Web đã làm theo hợp đồng; backend trên nhánh | §5 |
| PAY-07 | Bảng lương | Chỉ tính giờ × đơn giá loại công việc; không ca, làm thêm, thưởng, điều chỉnh, phụ cấp, giảm trừ, bảo hiểm, thuế | Mức A, chủ dự án 11/11 | Cả hai | Chờ quyết định (Q5, Q6) | §5 |
| PAY-08 | Bảng lương | Thiết lập kỳ lương và cờ "Tự động tạo bảng lương" lưu được nhưng chưa có tác dụng; GFR-07 chưa làm | Nhật ký giai đoạn 3 | Backend | Chờ backend | §5 |
| FARM-01 | Nuôi trồng | Số lồng là số thập phân (2 chữ số, 0,5 = nửa lồng); khối lượng ước tính = số lồng × kg mỗi lồng của HTX | Đề xuất Owner, 11/11 | Cả hai | Đã commit (backend `d534d829`, nhánh farming-rules) | §6 |
| FARM-02 | Nuôi trồng | Không có khối lượng mỗi con, hao hụt của nuôi, tỷ lệ sống. Ngoại lệ 12/11: ươm ghi số sống sót ước tính và hao hụt ươm (xem NUR-04) | Đề xuất D3, D4 (11/11); quyết định 12/11 cho ươm | Cả hai | Ươm: đã làm (backend, Web W2). Nuôi: chờ quyết định | §6, §13 |
| FARM-03 | Nuôi trồng | Không có thực thể kế hoạch thu hoạch; kế hoạch là ước tính của chu kỳ (mục tiêu sản lượng). **Ngày thu dự kiến đã bỏ (12/11)** | SRS đã bỏ UC30; quyết định 12/11 | Cả hai | Đã làm (backend, Web); PM chưa xác nhận | §6, NUR-14 |
| FARM-04 | Nuôi trồng | **Thu hoạch không bị chặn theo mục tiêu chu kỳ** (Owner, 12/11): kế hoạch chỉ là kế hoạch; màn thu hoạch hiện `targetPercent`, `overTarget`. Trần 110%/150% chỉ còn ở **thả giống** (hỏi xác nhận/chặn) và vật tư. Thả giống chu kỳ từ ươm: chặn cứng theo phần chia | Quyết định Owner 12/11 (thay đề xuất D1 cho thu hoạch) | Cả hai | Đã làm (backend `6628e663`, `917405de`); ngưỡng thả giống chờ Q7 | §6, §12 |
| FARM-05 | Nuôi trồng | "Thu xong làn" là hành động riêng (endpoint `finish-harvest`); hoàn tất nhiều làn một lần (`finish-harvest` của lô, tất cả hoặc không gì) | Đề xuất D7 (11/11); yêu cầu 12/11 | Cả hai | Đã commit (backend `ade8a6d1`) | §6 |
| FARM-06 | Nuôi trồng | Tọa độ chọn trên bản đồ, chỉ đọc; quy tắc kiểm tra (0,0, hoán đổi, khung Việt Nam, cách vùng 5 km) | Đề xuất D9 (11/11) | Cả hai | Web đang làm (chưa commit). Backend: chờ quyết định | §6 |
| FARM-07 | Nuôi trồng | Số giống đã thả so với lô giống còn lại: thả thường kiểm tồn; thả từ đợt ươm giới hạn theo phần chia (NUR-08). Xem STK-02 | GBR-04, BR-PURCHASE-07; G.4 | Cả hai | Đã làm (backend); Web hiển thị còn lại | §6, §13 |
| FARM-08 | Nuôi trồng | Kế hoạch chu kỳ chỉ nhắc theo dõi, không cảnh báo (báo cáo 07/11), mâu thuẫn với đề xuất cảnh báo mềm (11/11) | Chưa thống nhất | Cả hai | Chờ xác nhận (Q7) | §6 |
| FARM-09 | Nuôi trồng | Phép đo nước: Web chỉ xem; ghi nhận trên điện thoại; quyền backend không đổi | Yêu cầu họp 07/11 (theo báo cáo) | Web | Đã làm | §6 |
| NUR-01 | Nuôi trồng (ươm) | **Bước ươm bắt buộc** trước thả giống cho lần thả mới; SRS dòng 446 ghi "không được ghi nhận trong OMTS" | Quyết định chủ dự án 12/11 | Cả hai | Đã làm (backend, Web W2). Chưa cưỡng chế ở đường chu kỳ cũ (Q21) | §13 |
| NUR-02 | Nuôi trồng (ươm) | Đợt ươm: một lô giống, một vùng (không chọn bè khi bắt đầu), trạng thái Đang ươm / Đã hoàn tất / Đã hủy | Quyết định 12/11 | Cả hai | Đã làm | §13 |
| NUR-03 | Vật tư (ươm) | Kho trừ khi bắt đầu ươm (phiếu Xuất dùng mục đích Nursery); **luôn chặn tồn âm** cho ươm, kể cả HTX cho phép tồn âm | Quyết định 12/11 | Cả hai | Đã làm | §13 |
| NUR-04 | Nuôi trồng (ươm) | Số sống sót nhập một lần lúc hoàn tất, **ước tính bằng mắt**; hao hụt ươm = vào − sống sót, nhãn ước tính; không có tỷ lệ dự kiến, không cảnh báo hao hụt cao; sửa sống sót ghi cũ → mới | Quyết định 12/11 | Cả hai | Đã làm | §13 |
| NUR-05 | Nuôi trồng (ươm) | Hoàn tất ươm chia số sống sót cho các bè cùng vùng, tổng bằng đúng sống sót; dồn một bè hoặc chia nhiều bè; chuyển phần chia sau hoàn tất, không gỡ bè đã thả hoặc có nhật ký, đóng băng khi chu kỳ đã chốt | Quyết định 12/11 (câu hỏi 7 mục 8 đã chốt "có") | Cả hai | Đã làm (backend); Web W2 | §13 |
| NUR-06 | Nuôi trồng (ươm) | Sản lượng dự kiến nhập ở bước hoàn tất ươm (theo từng bè), không nhập khi bắt đầu ươm | Quyết định 12/11 | Cả hai | Đã làm | §13 |
| NUR-07 | Nuôi trồng (ươm) | Đợt đã hoàn tất **không hủy được** (chỉ đợt Đang ươm sửa/hủy). Đây là kết luận của câu hỏi mở đợt 12/11 | Quyết định chủ dự án 12/11 | Cả hai | Đã làm | §13 |
| NUR-08 | Thả giống (ươm) | Thả giống từ đợt ươm: không cần lô giống, **chặn cứng** theo phần còn lại của phần chia (`NURSERY_SEEDING_ABOVE_ALLOCATION`), không có 110%/150%, không tạo phiếu Xuất dùng. Thay GBR-04 cho lần thả này. **Từ 13/11: thả đủ 100% phần còn lại, xem NUR-15** | Quyết định 12/11 | Cả hai | Đã làm (backend, Web) | §13 |
| NUR-09 | Dữ liệu cũ | Chu kỳ và thả giống cũ không có đợt ươm; giữ nguyên, không backfill; báo cáo ghi "không có ươm" | Quyết định 12/11 | Cả hai | Đã làm | §13 |
| NUR-10 | Thông báo (ươm) | Quản lý vùng bắt đầu, sửa, hủy, hoàn tất, sửa sống sót hoặc chia lại thì báo Chủ HTX (`NURSERY_RECORDED`, mã chung `MINI_APP_NOTIFICATION`). Chủ tự làm thì không báo | Quyết định 12/11 | Cả hai | Đã làm (backend) | §13 |
| NUR-11 | Quyền (ươm) | Dùng quyền sẵn có `CultivationCycles` (View/Create/Edit theo vùng), không có mã quyền riêng NURSERY | Quyết định 12/11 (thay câu hỏi 6 mục 8) | Cả hai | Đã làm; PM xác nhận | §13 |
| NUR-12 | Mã lỗi (ươm) | Lỗi ươm dùng `MSG-GEN-09` kèm `reasonCode` `NURSERY_*`, chờ SRS đặt `MSG-NURSERY-xx` | Quyết định 12/11 | Cả hai | Tạm thời | §13 |
| NUR-13 | Truy xuất (ươm) | Không thêm ươm vào truy xuất công khai (QR). Lô giống của chu kỳ từ ươm vẫn truy được tới phiếu nhập và nhà cung cấp | Đặc tả mục 2 (quyết định 10) | Cả hai | Đã làm | §13 |
| NUR-14 | Kế hoạch chu kỳ | **Bỏ ngày thu hoạch dự kiến** khỏi kế hoạch chu kỳ (form, đọc, tổng kết). Cột CSDL giữ, không hiển thị | Quyết định chủ dự án 12/11 (thay GBR/CYCLE-01) | Cả hai | Đã làm (backend); Web W2 đọc tương thích | §13 |
| NUR-15 | Thả giống (ươm) | **Thả giống từ ươm phải đủ 100% phần đã chuyển sang bè; số lượng không chọn được** (bằng phần còn lại của phần chia). Vẫn chọn làn, % từng làn, ngày, ảnh 1-3. Gửi số khác: 400 `NURSERY_SEEDING_MUST_USE_FULL_ALLOCATION`; hết phần: 400 `NURSERY_SEEDING_ALREADY_COMPLETE`. Sửa bản ghi và hiệu chỉnh TRACE-03 giữ đủ 100%. Muốn số khác thì sửa số sống sót hoặc chuyển phần chia giữa các bè trước. Thay phần "chặn cứng, có thể thả một phần" của NUR-08. Chu kỳ không qua ươm giữ số lượng tự nhập | Quyết định chủ dự án 13/11: "thả 100% số đã gửi ươm sang bè... nếu giữ lại phần ươm còn thừa thì có khả năng thừa hoặc vứt bỏ" | Cả hai | Đã làm (backend, Web); PM chưa xác nhận (Q29) | §13 |
| PHO-01 | Ảnh (bước) | Ảnh 1 đến 3 **bắt buộc** cho bắt đầu ươm, hoàn tất ươm (đã có); kế hoạch nuôi (tạo chu kỳ riêng), thả giống, thu hoạch, sự cố làn (chờ B2 và W3). Chỉ áp dụng cho bản ghi mới | Quyết định 12/11 (mục 10.2, 10.6) | Cả hai | Ươm: đã làm. Các bước còn lại: chờ B2 và W3 | §14 |
| PHO-02 | Ảnh (bước) | Nhật ký chăm sóc và sử dụng vật tư: ảnh tùy chọn (nhật ký tối đa 3) | Quyết định 12/11 (mục 10.6) | Cả hai | Giữ như hiện tại | §14 |
| PHO-03 | Lưu trữ ảnh | Ảnh lưu local tạm (`IFileStorage`, `Storage:Provider=Local`); cloud làm sau bằng cấu hình (`AzureBlob` đã có trong code) | Quyết định 12/11 | Backend | Đã làm (local) | §14 |
| LANE-01 | Làn | Mỗi làn có `seededPercent` và `harvestedPercent` (0-100), cộng dồn không vượt 100% trong cùng chu kỳ; trạng thái làn suy ra từ %; chỉnh % có nhật ký (cũ → mới, lý do). Mở rộng BR-FARM-03 | Quyết định 12/11 (mục 10.3) | Cả hai | Web W1 đã làm (chờ B2). Backend B2 đang làm | §14 |
| LANE-02 | Làn | % thu hoạch **không liên kết** với số lồng (hai số nhập độc lập) | Quyết định 12/11 (mục 10.6 số 4) | Cả hai | Chờ B2 | §14 |
| LANE-03 | Làn | Sơ đồ làn dạng cột đứng xếp ngang, màu đậm có chú giải, nhập % ngay trong form thả và thu | Quyết định 12/11 (mục 10.6 số 3) | Web | W1 đã làm (sơ đồ); nhập % trong form chờ W3 | §14 |
| LANE-04 | Sự cố làn | Báo hỏng: ghi chú bắt buộc và **ảnh bắt buộc 1-3** (trước đây ảnh tùy chọn) | Quyết định 12/11 (mục 10.6 số 2) | Cả hai | Chờ B2 | §14 |
| HAR-01 | Thu hoạch | Thu hoạch **gắn yêu cầu mua đã chấp nhận** (một lô gắn một yêu cầu). Đã có từ nhánh đồng đội (#78, OMTS-223); giữ nguyên, không đổi luồng bán | Nhóm bán hàng; giữ 12/11 | Cả hai | Đã làm; **SRS chưa có, cần PM xác nhận** (Q24) | §14 |
| HAR-02 | Thu hoạch | Nhóm nhân viên cùng thu (`crew`, tùy chọn, nhiều người, trên lô) | Yêu cầu 12/11 (ghi trong G.7) | Cả hai | Đã làm (backend `a3cb154f`) | §14 |
| HAR-03 | Thu hoạch | Ảnh thu hoạch bắt buộc 1-3 cho lô mới (trước: tùy chọn, tối đa 10) | Quyết định 12/11 (mục 10.6 số 5) | Cả hai | Chờ B2 | §14 |
| FARM-10 | Nuôi trồng | Giấy tờ vùng: Chủ HTX đọc được; Quản lý vùng chờ backend | Báo cáo 29/10 (theo báo cáo) | Cả hai | Chờ xác nhận | §6 |
| STK-01 | Vật tư, kho & mua hàng | Sổ kho: danh mục vật tư và giống; Xuất dùng; Xuất hủy; đơn vị và giá trên phiếu nhập. **12/11: bắt đầu ươm trừ kho** bằng phiếu Xuất dùng mục đích Nursery (NUR-03) | Commit `ad3b9db`; thay BR-PURCHASE-07 và GBR-04 (G.4 nhật ký) | Cả hai | Đã làm; PM xác nhận thay quy tắc (Q8) | §7, §13 |
| STK-02 | Vật tư, kho & mua hàng | Thả giống thường: tạo phiếu Xuất dùng liên kết, kiểm tồn lô (G.4 bước 2). Thả giống từ đợt ươm: **không** tạo phiếu, giới hạn theo phần chia (NUR-08) | GBR-04, BR-PURCHASE-07; G.4 | Cả hai | Thả giống thường: đã làm (backend). Chỉ thả giống không qua ươm còn chờ quyết định về việc bắt buộc ươm (Q21) | §7, §13 |
| STK-03 | Vật tư, kho & mua hàng | Phiếu nhập V2: không có khu vực, chiết khấu, trả trước, ảnh hóa đơn; dòng có số thứ tự và bè | PURCHASE-01 đến 06 (SRS 27/10) | Cả hai | Đã làm; đối chiếu phiên bản SRS (Q1) | §7 |
| STK-04 | Vật tư, kho & mua hàng | Thanh toán nhà cung cấp ghi theo nhà cung cấp, không gắn phiếu nhập; trả hàng có mã TH | Purchasing V2 | Cả hai | Đã làm | §7 |
| STK-05 | Vật tư, kho & mua hàng | Yêu cầu mua theo số lồng hay kg chưa thống nhất | Báo cáo 05/11 và 09/11 | Cả hai | Chờ quyết định (Q10) | §7 |
| STK-06 | Vật tư, kho & mua hàng | Kế toán không nhận thông báo khi có phiếu mới; "gửi Kế toán" chỉ tạo công nợ | Báo cáo 06/11 (theo báo cáo) | Backend | Chờ backend | §7 |
| SAL-01 | Khách hàng & bán hàng | Cài đặt công nợ khách: hạn mức (số tiền, số ngày), cờ vượt hạn mức, trường bắt buộc | Commit `a88f7f7` (Web) và `b8c11848` (Backend) | Cả hai | Đã làm; đối chiếu SRS | §8 |
| SAL-02 | Khách hàng & bán hàng | Yêu cầu tài khoản thương lái có trang riêng `/trader-requests`, không dùng pop-up | Báo cáo 05/11 (theo báo cáo) | Cả hai | Đã làm | §8 |
| SAL-03 | Khách hàng & bán hàng | Trang `/` là trang giới thiệu tiếng Việt, không chuyển về `/login` | Báo cáo 09/11 (theo báo cáo) | Web | Đã làm; đối chiếu SRS | §8 |
| SAL-04 | Khách hàng & bán hàng | Khách trả tiền theo toàn HTX, không theo vùng; hóa đơn có hộp chờ VietQR | Báo cáo 09/11 (theo báo cáo) | Cả hai | Đã làm; đối chiếu SRS | §8 |
| SAL-05 | Khách hàng & bán hàng | Trang nguồn gốc công khai VI và EN; thông điệp tiếng Việt là đề xuất; MSG-SALE-13 và -14 chưa có trong catalog Web | Báo cáo 09/11; Backend README | Cả hai | Chờ xác nhận (Q15) | §8 |
| SAL-06 | Khách hàng & bán hàng | Quyền xem khiếu nại chất lượng: Quản lý vùng xem trong vùng; Kế toán không xem | PM default (Backend README) | Cả hai | Chờ xác nhận (Q16) | §8 |
| SAL-07 | Khách hàng & bán hàng | Sửa hóa đơn (SALE-07), hủy hóa đơn (SALE-08), trả hàng theo khiếu nại (CLAIM-03) chưa có API | Backend README | Backend | Chờ backend | §8 |
| UX-01 | Giao diện | Pop-up chỉ dùng cho thêm mới, xác nhận đổi trạng thái, và bí mật hiện một lần | DESIGN_GUIDELINES mục 1.10; HR-A02 (11/11) | Web | Đã làm ở màn Nhân viên và Loại công việc; màn khác đang rà | §9 |
| UX-02 | Giao diện | Thay `window.confirm` và `window.prompt` bằng hộp thoại của ứng dụng | QA 30/10 (theo báo cáo) | Web | Đã làm | §9 |
| UX-03 | Giao diện | Thuật ngữ tiếng Việt: Chủ HTX, Nhân viên HTX, Thương lái, Tên đăng nhập, Tổng quan; tên UI không dùng "OMTS" | Báo cáo 04/11 (theo báo cáo) | Web | Đã làm; tên Chủ HTX hay Chủ nhiệm HTX chưa thống nhất (Q17) | §9 |
| UX-04 | Giao diện | Menu nhóm theo nghiệp vụ; mục không có quyền bị ẩn | Báo cáo 02/11 (theo báo cáo) | Web | Đã làm | §9 |
| UX-05 | Giao diện | Ngày nhập dd/mm/yyyy và lịch tiếng Việt; API vẫn dùng ISO 8601 | Báo cáo 28/10 (theo báo cáo) | Web | Đã làm | §9 |
| UX-06 | Giao diện | Số liệu tổng quan của Chủ HTX là minh họa theo wireframe, chưa lấy từ API | Báo cáo 07/11 (theo báo cáo) | Web | Chờ backend | §9 |
| UX-07 | Giao diện | Mở chi tiết thông báo không đánh dấu đã đọc | Báo cáo 06/11 (theo báo cáo) | Web | Chờ xác nhận (đối chiếu ACCOUNT-08) | §9 |
| UX-08 | Giao diện | Nhật ký: không có popup JSON trước và sau; ẩn mã kỹ thuật (SupplierId, RowVersion) | Báo cáo 06/11 (theo báo cáo) | Web | Đã làm | §9 |
| WEB-01 | Quy ước Web | Lọc nhiều giá trị gộp ở phía client (tối đa 100 trang × 100 dòng) | Báo cáo 08/11 (theo báo cáo) | Web | Đã làm (giới hạn) | §10 |
| WEB-02 | Quy ước Web | Component không gọi mock storage hay HTTP trực tiếp; đi qua service và repository | `AGENTS.md` | Web | Đã làm | §10 |
| WEB-03 | Quy ước Web | Dùng "làn" thay "dây" như wireframe | Báo cáo 06/11 (theo báo cáo) | Web | Đã làm | §10 |
| WEB-04 | Quy ước Web | Thông báo backend giữ tiếng Anh theo SRS; Web hiển thị theo mã | Nhật ký giai đoạn 3 | Cả hai | Đã làm | §10 |
| WEB-05 | Quy ước Web | Thông báo lỗi khi nhập, xuất nhân viên và vượt mục tiêu chưa có mã MSG | Nhật ký giai đoạn 1 | Backend | Chờ quyết định (Q15) | §10 |

## 2. Đăng nhập & tài khoản

| ID | Mã SRS v8 | Khác biệt và chi tiết | Đề xuất sửa SRS (một dòng) | Nguồn |
|---|---|---|---|---|
| AC-01 | ACCOUNT-01, -02, -03, -05, -06; SCR-ACCOUNT-01, -02, -03, -04, -05; quy tắc username, phone, email duy nhất (dòng 866, 868); thực thể Account (604–605); Email Service (934); API-03 (212, 1288); thuật ngữ OTP (355) | Web: ô đăng nhập nhận số điện thoại hoặc tên đăng nhập; schema từ chối giá trị có `@`. Backend: `POST /api/auth/login` nhận số điện thoại hoặc tên đăng nhập; email không phải định danh đăng nhập; khôi phục mật khẩu gửi SMS; xác minh và đổi email trong hồ sơ vẫn có. Số điện thoại cũ đăng ký bằng email cần kiểm tra thủ công (Phụ lục B, B1). | Đăng nhập bằng số điện thoại hoặc tên đăng nhập; email là kênh thông báo, không dùng để đăng ký, đăng nhập hay khôi phục. | `SRS_CHANGE_LOG_HR_2026-11-11.md` mục F; `login-schema.ts`; Phụ lục B |
| AC-02 | BR-FARM-07, §I.4.4 (ma trận quyền cố định) | Vai trò: Cooperative Owner (không phải vai trò vùng), Zone Manager (`ZONE_MANAGER`), Accountant (`ACCOUNTANT`). Nhân viên là loại tài khoản, không có vai trò riêng; cặp vai trò–vùng được cấp thêm, không có quyền nghiệp vụ mặc định. Jira OMTS-216 liệt kê Cooperative Owner thay cho Staff: mâu thuẫn chưa giải quyết. | Vai trò vùng cố định là Quản lý vùng và Kế toán; Nhân viên là loại tài khoản; Chủ HTX chỉnh quyền, không tạo hoặc đổi tên vai trò. | `decisions/WEB_FIXED_ROLES_DECISION_2026-10-27.md`; `reports/WEB_JIRA_PR19_CONTRACT_UPDATE_2026-10-29.md`; `WEB_ACCESS_REFINEMENT_2026-11-08.md` |
| AC-03 | - | Có một tài khoản Kế toán và grant Kế toán chỉ áp dụng toàn HTX. UI và repository chặn tạo thêm (theo báo cáo). Backend chưa xác nhận. | Ghi số lượng tài khoản Kế toán và phạm vi grant, sau khi chủ dự án xác nhận. | `reports/WEB_LOCAL_ACCOUNTING_FLOW_2026-11-03.md` |
| AC-04 | Danh sách actor (System Administrator) | Web có `/system/accounts` và `/system/cooperatives/new`. Backend `develop` không có actor này (SubjectType chỉ có CooperativeOwner, Staff, Trader). Runtime API riêng có tài khoản `sysadmin` (Backend README). Khóa và mở khóa Staff hoặc Trader có lý do và nhật ký. | Ghi System Administrator là vai trò vận hành ngoài HTX và cách cấp; chờ Q14. | `reports/WEB_SYSADMIN_GAP_2026-11-06.md`; `reports/WEB_ADMIN_API_2026-11-06.md` |
| AC-05 | ACCOUNT-01 (đăng ký thương lái) | Không có `/register`. Thương lái gửi yêu cầu từ Zalo Mini App (`zalo/trader-requests`); Chủ HTX duyệt tại `/trader-requests`. | Đăng ký thương lái qua Zalo Mini App; Chủ HTX duyệt yêu cầu. | Mục HR-A08; Backend README (thông báo TRADER_ACCESS_*) |
| AC-06 | Mục bảo mật phiên (không có mã) | Web: cookie HttpOnly cho access token và refresh token; refresh xoay vòng với 30 giây ân hạn; phiên theo thiết bị; BFF không lưu phiên. Chi tiết: Phụ lục A, mục A5. | Mô tả cơ chế phiên Web trong mục bảo mật: cookie HttpOnly, refresh xoay vòng, phiên theo thiết bị. | HR-A09; Phụ lục A (A5) |
| AC-07 | LABOR-01 (luồng tài khoản) | Hồ sơ lưu trước, tài khoản tạo từ hồ sơ; username tự sinh; Owner không xem mật khẩu tạm (WEB-EMP-ACCOUNT-01, 28/10). HR-A02 (11/11) lại ghi mật khẩu tạm hiện một lần trong pop-up. Backend còn đòi nhập username và trả mật khẩu tạm theo ticket cũ. | Tài khoản nhân viên tạo từ hồ sơ; mật khẩu tạm xử lý theo quyết định đã chốt (Q2). | `reports/WEB_EMPLOYEE_ACCOUNT_CREATION_2026-10-28.md`; `reports/WEB_EMPLOYEE_PERSONAL_FORM_COMPLETION_2026-10-28.md`; HR-A02 |

## 3. Nhân viên

| ID | Mã SRS v8 | Khác biệt và chi tiết | Đề xuất sửa SRS (một dòng) | Nguồn |
|---|---|---|---|---|
| HR-01 | LABOR-01 (mô tả màn hình) | Danh sách; mở dòng ra 4 tab (Thông tin, Công việc, Ngân hàng, Tài khoản đăng nhập); sửa tại chỗ từng tab với Bỏ qua và Lưu. | Màn Nhân viên gồm danh sách và hồ sơ 4 tab, sửa tại chỗ từng tab. | HR-A01 |
| HR-02 | LABOR-01.3 | Ngừng làm việc dùng ngày làm cuối (`lastWorkingDay`); ngày chọn được là hôm nay hoặc trước đó (28/10). Làm lại dùng `resume`. Loại nhân viên Thời vụ hoặc Nhân viên bắt buộc khi thêm; đổi loại cần "Áp dụng từ ngày" và có lịch sử. Form không còn chọn tài khoản có sẵn hay bỏ liên kết. | LABOR-01.3 dùng "ngày làm cuối" và "làm việc lại"; LABOR-01 thêm loại nhân viên có lịch sử; bỏ luồng liên kết tài khoản có sẵn. | HR-A03, HR-A04, HR-A05; `reports/WEB_EMPLOYEE_EMPLOYMENT_ACTIONS_2026-10-28.md` |
| HR-03 | LABOR-01 và chức năng mới | Lọc theo loại nhân viên và loại công việc; sắp xếp phía server; xuất .xlsx (Chủ HTX); nhập .xlsx (Chủ HTX, 2 MB, 1000 dòng, bỏ qua dòng lỗi và nhập dòng đúng; lỗi ghi cùng lúc trả 409 và không lưu gì); xuất các dòng đã chọn (tối đa 200). Xuất tối đa 5000 dòng. Số tài khoản ngân hàng và CCCD không bao giờ xuất. | Thêm chức năng "Xuất và nhập danh sách nhân viên" và quy tắc lọc, sắp xếp vào LABOR-01. | `reports/BACKEND_EMPLOYEE_API_CHANGES_FOR_SRS_2026-11-10.md`; nhật ký giai đoạn 1 |
| HR-04 | LABOR-01 (hồ sơ) | Mã nhân viên (NV000001, lưu IN HOA, duy nhất trong HTX kể cả người đã nghỉ); giới tính; CCCD 9 hoặc 12 số (audit chỉ ghi có hoặc không); ngày bắt đầu làm việc. Giới tính và ngày bắt đầu chưa xóa được sau khi đặt (Q12). | Thêm mã, giới tính, CCCD (không xuất file), ngày bắt đầu làm việc vào thực thể Employee. | Nhật ký giai đoạn 1 (điểm 3, 4, 7); HR-B05 |
| HR-05 | LABOR-01 (quyền) | Export và import chỉ Chủ HTX. Quản lý vùng giữ View, Create, Edit; Kế toán không có. Nhân viên không gán được vùng đã ngừng (WEB-EMP-ZONE-01, 28/10). | Bảng phân quyền LABOR-01 thêm Export (chỉ Chủ HTX); ghi quy tắc vùng đã ngừng. | Nhật ký giai đoạn 1 (điểm 1); `reports/WEB_EMPLOYEE_ZONES_BANK_FORM_REVIEW_2026-10-28.md` |
| HR-06 | Thực thể Employee (email) | SRS không có trường email cho nhân viên. Trường đã thêm rồi gỡ (migration `RemoveEmployeeEmail`). Email của tài khoản đăng nhập tạo kèm nhân viên vẫn còn, sẽ đổi cùng module tài khoản (AC-01). | Không cần sửa SRS cho nhân viên; sửa email tài khoản theo AC-01. | Nhật ký giai đoạn 1 (điều chỉnh 11/11) |

## 4. Chấm công & phân công (giai đoạn 2)

| ID | Mã SRS v8 | Khác biệt và chi tiết | Đề xuất sửa SRS (một dòng) | Nguồn |
|---|---|---|---|---|
| CL-01 | LABOR-02, LABOR-04, LABOR-05, LABOR-07, LABOR-08, LABOR-10 | Chưa có đăng nhập app nhân viên (LABOR-03, LABOR-06). Nhân viên gọi `/api/me/*` bằng tài khoản đã liên kết (`Employee.AccountId`); không có liên kết thì danh sách trống và gửi yêu cầu bị 403. Mã QR `OMTS-ATT.{mã}.{hết hạn}.{HMAC}` hiệu lực 60 giây, không cần thiết bị. Một dòng mỗi nhân viên mỗi ngày; có thêm `PUT assignments`, `crew-start`, chấm công nhân viên Staff, sửa chấm công của Chủ HTX (LABOR-04.4, .7, .8). | Ghi rõ đăng nhập app nhân viên là giai đoạn sau; giai đoạn đầu dùng tài khoản liên kết; mã QR ký HMAC, hiệu lực 60 giây. | Nhật ký giai đoạn 2 (Khác SRS 1, 3; Khác hợp đồng web) |
| CL-02 | LABOR-05 (mục 5.3); MSG-LABOR-05, -15 | Duyệt giờ vào thiếu của thợ thời vụ không có phân công trong ngày cần `jobTypeId` và `raftId`. Yêu cầu nghỉ phép tối đa 366 ngày; lý do tối đa 500 ký tự. | Thêm điều kiện bắt buộc của giờ vào thiếu vào LABOR-05.3; ghi giới hạn yêu cầu nghỉ. | Nhật ký giai đoạn 2 (Khác SRS 6, 7) |
| CL-03 | MSG-LABOR-05, -15 (thông báo cho nhân viên) | Không đẩy thông báo cho nhân viên vì chưa có app; nhân viên xem kết quả trong danh sách yêu cầu. Chủ HTX nhận MSG-LABOR-23 trong danh sách thông báo. | Ghi rằng giai đoạn đầu không có thông báo đẩy cho nhân viên. | Nhật ký giai đoạn 2 (Khác SRS 2) |
| CL-04 | LABOR-13 (khóa kỳ lương), BR-LABOR-13 | Khóa bảo thủ: mọi ngày không sau ngày cuối của bảng lương Chờ chốt hoặc Đã chốt đều bị khóa (MSG-LABOR-04). Gửi yêu cầu nghỉ bị chặn khi kỳ Đã chốt (MSG-LABOR-25); duyệt bị chặn khi kỳ Chờ chốt hoặc Đã chốt (MSG-LABOR-16). | Khóa đúng kỳ chứa ngày theo BR-LABOR-13 (chờ Q9). | Nhật ký giai đoạn 2 (Khác SRS 4) |
| CL-05 | LABOR-04.4, LABOR-01.3 | Chủ HTX sửa chấm công của mọi nhân viên, kể cả đã nghỉ, mọi ngày, bắt buộc có lý do. Quản lý vùng xem danh sách yêu cầu nhờ quyền WORK_ASSIGNMENTS View (SRS ghi "R"). | Ghi rõ quyền xem yêu cầu của Quản lý vùng; xác nhận Chủ HTX sửa chấm công của nhân viên đã nghỉ (Q11). | Nhật ký giai đoạn 2 (câu hỏi mở 2; Khác SRS 5) |

## 5. Bảng lương & thanh toán lương (giai đoạn 3)

| ID | Mã SRS v8 | Khác biệt và chi tiết | Đề xuất sửa SRS (một dòng) | Nguồn |
|---|---|---|---|---|
| PAY-01 | LABOR-12, LABOR-14 (SRS: Kế toán lập và trả lương) | Chỉ Chủ HTX (`[RequireCooperativeOwner]`); người khác nhận 403 MSG-GEN-08 dù có quyền PAYROLL. Quyền PAYROLL của Kế toán không còn tác dụng. Tạo, chốt và trả đều do Chủ HTX. Cần chốt Q6 về quyền PAY_RULES. | LABOR-12 và LABOR-14: bảng lương và thanh toán lương do Chủ HTX thực hiện. | HR-A12; `reports/PAYROLL_API_CONTRACT_2026-11-11.md` |
| PAY-02 | LABOR-16 | Bỏ màn Thiết lập kỳ lương. Chọn kỳ (Hàng tháng / Tùy chọn) trong pop-up "Thêm bảng tính lương". Thiết lập chấm công (làm tròn, giờ nghỉ) là màn riêng, API chỉ Chủ HTX. | LABOR-16: thiết lập kỳ lương nằm trong pop-up tạo bảng lương. | HR-A11, HR-A06 |
| PAY-03 | LABOR-12 (trạng thái) | Trạng thái: Đang tạo, Tạm tính, Đã chốt lương, Đã hủy (mã 3405, 3406 mới). Tạm tính là Nháp (3401). Đang tạo không lưu vì tạo đồng bộ. | Đổi trạng thái bảng lương và sơ đồ chuyển trạng thái theo PAY-03. | HR-A11; nhật ký giai đoạn 3 |
| PAY-04 | LABOR-12 (luồng) | Không có "gửi cho Chủ HTX" và "trả lại". Chủ HTX tạo, chốt, trả. Không có "Lưu tạm" vì hợp đồng không có endpoint sửa tay từng phiếu. | Bỏ hai bước gửi và trả lại khỏi luồng LABOR-12; ghi "Lưu tạm" là chưa có. | Nhật ký giai đoạn 3 (Khác SRS 1); `PAYROLL_API_CONTRACT` |
| PAY-05 | BR-LABOR-11 | Có tạm ứng: phần trả dư thành khoản Advance, trừ vào lần chốt kế tiếp có nhân viên đó. SRS ghi "không trả trước". Mục E.3 của nhật ký vẫn hỏi lại. | Sửa BR-LABOR-11: cho phép tạm ứng và trừ vào kỳ sau (sau khi Q4 được xác nhận). | HR-A11; nhật ký giai đoạn 3 (Khác SRS 2) |
| PAY-06 | LABOR-01, LABOR-13 | Hồ sơ nhân viên có tab Phiếu lương và Nợ và tạm ứng (chỉ Chủ HTX). Chi tiết phiếu lương có Thu nhập và giảm trừ, Thanh toán, Chấm công. Bảng lương có tab Lịch sử thanh toán và nút Thanh toán cho bảng đã chốt. | Thêm tab hồ sơ và tab bảng lương vào mô tả LABOR-01, LABOR-12, LABOR-13. | HR-A13, HR-A14; `PAYROLL_API_CONTRACT` mục 10 đến 14 |
| PAY-07 | BR-LABOR-11 (thanh toán) | Thanh toán một phần, không quá số còn nợ. Hủy phiếu chi trong Sổ quỹ thì tiền quay lại "còn nợ". Không có hủy riêng một khoản thanh toán. Không có cảnh báo trùng mã tham chiếu ngân hàng (MSG-LABOR-33) và không có thông báo cho Chủ HTX (MSG-LABOR-32) vì Chủ HTX là người thao tác. | LABOR-14: ghi cách hủy khoản thanh toán (hủy phiếu chi ở Sổ quỹ); bỏ MSG-LABOR-32, -33 hoặc ghi lý do. | Nhật ký giai đoạn 3 (Khác SRS 5, 6) |
| PAY-08 | BR-LABOR-07, BR-LABOR-10 | Chỉ có thưởng bằng 0; không có điều chỉnh; không chia chi phí theo bè hay chu kỳ. | Ghi "chưa áp dụng" cho điều chỉnh và chi phí theo bè trong BR-LABOR-07 và BR-LABOR-10. | Nhật ký giai đoạn 3 (Khác SRS 4) |
| PAY-09 | BR-LABOR-09 | Nhân viên Staff không có phiếu lương. SRS còn muốn liệt kê số ngày công; chưa làm. | BR-LABOR-09: ghi trạng thái hiện tại (chờ Q5). | Nhật ký giai đoạn 3 (Khác SRS 3) |
| PAY-10 | LABOR-12, LABOR-14 (đơn giá, hợp đồng) | Chưa in danh sách trả tiền mặt (LABOR-14.3). Thêm tháng ghi nhận chi phí (`expenseMonth`) khi chốt. | Thêm "tháng ghi nhận chi phí" vào LABOR-12. | `PAYROLL_API_CONTRACT` mục 5; nhật ký giai đoạn 3 |
| PAY-11 | Mở rộng lương (KiotViet) | Chưa có ca, làm thêm, ngày công chuẩn, lương cố định, hoa hồng, phụ cấp, giảm trừ, bảo hiểm (BHXH 8%, BHYT 1,5%, BHTN 1%, đoàn phí 0,5%), thuế TNCN, mẫu lương, lễ tết. | Chờ quyết định (Q5); chưa sửa SRS. | Nhật ký mục C và E |
| PAY-12 | GFR-07 (tạo bảng lương tự động) | Cờ "Tự động tạo bảng lương" lưu được nhưng chưa có tác dụng; chưa có tác vụ hằng ngày. | Ghi GFR-07 là chưa triển khai. | Nhật ký giai đoạn 3; HR-B08 |

## 6. Nuôi trồng

Ghi chú: nhật ký nhân sự không có mục G; các điểm nuôi trồng lấy từ hai báo cáo đánh giá ngày 11/11. Phần "Đang làm" đã kiểm tra trong working tree backend và Web ngày 11/11.

| ID | Mã SRS v8 | Khác biệt và chi tiết | Đề xuất sửa SRS (một dòng) | Nguồn |
|---|---|---|---|---|
| FARM-01 | HARVEST-01 (số lồng); BR-HARVEST-02 | Trước: số lồng là số nguyên (`int`). Working tree backend: `CageCount` là `decimal`, migration `20261111120000_HarvestLotFractionalCagesAndOverPlanReason` (chưa commit). Khối lượng ước tính = số lồng × kg mỗi lồng của HTX (`HarvestLotFieldReader`); Web tự tính trên form là đề xuất, chưa xác minh. | HARVEST-01: số lồng có thể là số thập phân; kg ước tính = số lồng × kg mỗi lồng của HTX. | `FARMING_BACKEND_RULES_REVIEW_2026-11-11.md` (P3, P4); kiểm tra code ngày 11/11 |
| FARM-02 | BR-FARM-03 (không ước tính kg theo làn); BR-CYCLE-07 (không có sổ hao hụt) | Không có khối lượng mỗi con, hao hụt của nuôi, tỷ lệ sống trong code. **12/11: ươm có số sống sót ước tính và hao hụt ươm (NUR-04).** Đề xuất: tỷ lệ sống suy ra = kg thu ÷ (số con × khối lượng mỗi con); không có sổ hao hụt (đề xuất D4 chọn cách suy ra). Khối lượng mỗi con là dữ liệu chủ HTX chưa cung cấp. | Ghi "không ghi hao hụt; tỷ lệ sống chỉ là ước tính suy ra" nếu chủ dự án chấp nhận D4. | `FARMING_BACKEND_RULES_REVIEW_2026-11-11.md` (P4, D3, D4) |
| FARM-03 | UC30 (đã bỏ khỏi SRS: "Plan harvest") | Không có thực thể kế hoạch thu hoạch (grep không có HarvestPlan hay WorkPlan). Kế hoạch là `TargetYieldKg` của chu kỳ (12/11: bỏ `ExpectedHarvestDate`, NUR-14). | Kế hoạch thu hoạch là ước tính của chu kỳ; không có thực thể kế hoạch riêng (nếu chốt D5-a). | `FARMING_BACKEND_RULES_REVIEW_2026-11-11.md` (finding 3, D5) |
| FARM-04 | BR-HARVEST-07 (ước tính, so sánh với mục tiêu) | **12/11: thu hoạch không bị chặn theo mục tiêu (Owner); mô tả dưới là của 11/11, chỉ còn đúng cho thả giống.** Mềm: vượt 110% mục tiêu chu kỳ (tức +10%) thì hỏi xác nhận bằng MSG-GEN-04; client gửi lại với `confirmOverPlan` và lý do (`OverPlanReason`). Cứng: vượt 150% (+50%) bị từ chối. Ngưỡng 10% và 50% là mặc định đề xuất D1, chủ dự án chỉnh được. Chưa có ngưỡng cho cảnh báo theo số giống đã thả (P3). | Vượt mục tiêu: cảnh báo mềm có lý do ở 110%, từ chối ở 150%; ngưỡng do chủ dự án xác nhận (Q7). | `FARMING_BACKEND_RULES_REVIEW_2026-11-11.md` (P3, D1, D2); `HarvestQuantityRules.cs`, `HarvestLotCorrectionService.cs` (working tree) |
| FARM-05 | HARVEST-01 (bước 3: đánh dấu làn đã thu xong) | Đã commit trên nhánh backend: `POST /api/rafts/{raftId}/lanes/{laneNumber}/finish-harvest` (`HarvestLotsController`), đánh dấu làn ở lô mới nhất, không cần migration (D7-a). Trước đó chỉ đánh dấu bằng `finishedLaneNumbers` khi tạo lô hoặc khi sửa lô có lý do. Web: nút "Thu xong" theo dòng là đề xuất. | HARVEST-01: đánh dấu một làn đã thu xong bằng một thao tác riêng, không cần sửa lô. | `FARMING_BACKEND_RULES_REVIEW_2026-11-11.md` (P1, D7); `FARMING_WEB_FLOW_REVIEW_2026-11-11.md` (F5); kiểm tra code ngày 11/11 |
| FARM-06 | - (SRS chưa đối chiếu được mục tọa độ) | Web: chọn tọa độ trên bản đồ, tọa độ chỉ đọc (working tree, chưa commit: `location-picker*`). Backend (đề xuất P6, D9): từ chối (0,0) và hoán đổi vĩ độ, kinh độ; cảnh báo ngoài khung Việt Nam (vĩ 8 đến 24,5; kinh 102 đến 110) và khi điểm cách tọa độ vùng quá 5 km. | Tọa độ lấy từ bản đồ; hệ thống từ chối (0,0) và hoán đổi, cảnh báo khi điểm nằm ngoài Việt Nam hoặc cách vùng quá 5 km (chờ Q20). | `FARMING_WEB_FLOW_REVIEW_2026-11-11.md` (E); `FARMING_BACKEND_RULES_REVIEW_2026-11-11.md` (P6, D9) |
| FARM-07 | BR-PURCHASE-07, GBR-04 | Không đối chiếu số giống thả với lô giống còn lại. Xem STK-02. | Xem STK-02. | `FARMING_BACKEND_RULES_REVIEW_2026-11-11.md` (P8, D6) |
| FARM-08 | BR-CYCLE (kế hoạch chu kỳ); HARVEST-01 | Báo cáo 07/11 ghi kế hoạch chu kỳ chỉ nhắc theo dõi, không cảnh báo và không chặn vượt mục tiêu. Đề xuất 11/11 (FARM-04) có cảnh báo mềm. Hai đề xuất mâu thuẫn. | Chờ Q7. | `reports/WEB_MEETING_MAP_PAGING_WATER_2026-11-07.md` |
| FARM-09 | WATER-01 và các mục đo nước | Web chỉ xem phép đo nước; không tạo, xác nhận, hiệu chỉnh, hủy hay nhận dạng lại; ghi nhận trên điện thoại. Quyền backend không đổi. | Ghi ứng dụng di động là nơi ghi nhận đo nước; Web chỉ xem. | `reports/WEB_MEETING_MAP_PAGING_WATER_2026-11-07.md` |
| FARM-10 | Giấy tờ vùng (-) | Giấy tờ chỉ Chủ HTX đọc được theo API; quyền đọc của Quản lý vùng chờ backend. Nhân viên đọc ảnh và sơ đồ bè qua kiểm tra vùng. | Ghi quyền đọc giấy tờ của từng vai trò sau khi xác nhận (chờ Q11). | `reports/WEB_FARM_FILES_CONDITION_API_2026-10-29.md` |

## 7. Vật tư, kho & mua hàng

| ID | Mã SRS v8 | Khác biệt và chi tiết | Đề xuất sửa SRS (một dòng) | Nguồn |
|---|---|---|---|---|
| STK-01 | BR-PURCHASE-07, GBR-04 | Sổ kho đã có: danh mục vật tư và giống (mã VT, đơn vị `con`, `kg`...), Xuất dùng (trừ tồn khi dùng), Xuất hủy, đơn vị và giá trên phiếu nhập. Kiểm tra tồn âm trả MSG-INPUT-01. Phần này phát sinh sau SRS nên là thay đổi so với SRS. | Thêm sổ kho: vật tư và giống có tồn; Xuất dùng và Xuất hủy trừ tồn; không cho tồn âm; thay quy tắc GBR-04 nếu chủ dự án chốt (Q8). | Commit `ad3b9db` (Web và Backend); `FARMING_BACKEND_RULES_REVIEW_2026-11-11.md` (finding 4, Q4) |
| STK-02 | GBR-04 (không kiểm tra số giống thả) và BR-PURCHASE-07 | Hiện: thả giống độc lập với Xuất dùng; Web cảnh báo nếu số thả vượt số còn lại của lô (`quantityReceived` − `quantitySeeded`). Mục tiêu đề xuất: thả giống tạo phiếu Xuất dùng, một nguồn sự thật (D6-b). | Chốt một trong hai: thả giống độc lập với sổ kho (cảnh báo), hoặc thả giống tạo phiếu xuất dùng (Q8). | `FARMING_BACKEND_RULES_REVIEW_2026-11-11.md` (P8, D6) |
| STK-03 | PURCHASE-01 đến PURCHASE-06 (SRS 27/10); BF-01 | Phiếu nhập V2: bỏ khu vực, chiết khấu, số tiền trả ngay và ảnh hóa đơn trên phiếu; dòng có số thứ tự và bè nhận giống hoặc vật tư; mã PN000123 (phiếu cũ giữ mã PR-yyyyMMdd-nnn). | Cập nhật mô tả phiếu nhập theo cấu trúc V2 (dòng theo bè; không có khu vực, chiết khấu, trả trước). | Backend README (migration `PurchaseReceiptsV2`); `reports/WEB_WIREFRAME_SELECTIVE_APPLY_2026-11-06.md` |
| STK-04 | PURCHASE-04, PURCHASE-05 (thanh toán nhà cung cấp, công nợ) | Thanh toán nhà cung cấp không gắn phiếu nhập; mã TT000123; số dư do backend tính. Phiếu trả hàng có mã TH000123; các cột hoàn tiền bị bỏ, hoàn tiền đã ghi thành "trả lại tiền" trong công nợ. | Mô tả thanh toán nhà cung cấp theo nhà cung cấp, không phân bổ vào phiếu; mô tả hoàn tiền trả hàng. | Backend README (migrations `SupplierPaymentsV2`, `PurchaseReturnsV2`) |
| STK-05 | PURCHASE-xx (yêu cầu mua) | Yêu cầu mua theo số lồng (báo cáo 05/11, quay lại luồng cũ); báo cáo 09/11 có hợp đồng theo kg. Hai hướng mâu thuẫn. | Chờ Q10. | `reports/WEB_SALES_BATCH_2026-11-05.md`; `decisions/WEB_PURCHASE_REQUESTS_KG_CONTRACT_2026-11-09.md` |
| STK-06 | Thông báo Kế toán (SRS chưa đối chiếu ID) | Backend không thông báo cho Kế toán khi có phiếu mới (chỉ Chủ HTX). "Gửi Kế toán" chỉ tạo công nợ; chưa có sự kiện xác nhận. Web hiện phiếu còn nợ thật, không gọi là "đã gửi". | Ghi thông báo cho Kế toán khi có phiếu cần thanh toán (chờ backend). | `reports/WEB_ACCOUNTANT_PAYMENT_QUEUE_2026-11-06.md`; `reports/WEB_LOCAL_ACCOUNTING_FLOW_2026-11-03.md` |
| STK-07 | Vai trò lập và duyệt phiếu nhập (-) | Chủ HTX chỉ theo dõi thông báo, không duyệt phiếu nhập; Quản lý vùng lập phiếu; Kế toán lập thanh toán và công nợ. | Chờ xác nhận với chủ dự án trước khi sửa PURCHASE-01. | `reports/WEB_PROCUREMENT_UI_REFINEMENT_2026-11-04.md` |
| STK-08 | Giới hạn bộ lọc (không có mã SRS) | Phiếu nhập: tìm theo mã, không theo tên nhà cung cấp; không chọn nhiều giá trị trạng thái (backend chỉ nhận một nhóm hàng hoặc một trạng thái). | Ghi giới hạn bộ lọc hiện tại; không cần sửa nghiệp vụ. | `reports/WEB_WIREFRAME_PURCHASING_ALIGNMENT_2026-11-08.md` |

## 8. Khách hàng & bán hàng

| ID | Mã SRS v8 | Khác biệt và chi tiết | Đề xuất sửa SRS (một dòng) | Nguồn |
|---|---|---|---|---|
| SAL-01 | Hồ sơ khách hàng (-) | Cài đặt khách hàng trong Thiết lập: hạn mức công nợ (số tiền và số ngày), cho phép ghi thêm công nợ hay không; trường bắt buộc (tên và số điện thoại luôn bắt buộc); đánh dấu và lọc khách vượt hạn mức; hóa đơn hiện lý do khi bị từ chối. Backend lưu các giới hạn này như thiết lập chung của HTX. | Thêm cài đặt công nợ khách và cờ vượt hạn mức vào mô tả khách hàng. | Commit `a88f7f7` (Web, đã kiểm tra file thay đổi); commit `b8c11848` (Backend) |
| SAL-02 | ACCOUNT-01 (liên quan) | Yêu cầu tài khoản thương lái có trang riêng `/trader-requests`, giữ xác nhận và lý do từ chối; không dùng pop-up. | Mô tả duyệt yêu cầu thương lái là một trang danh sách. | `reports/WEB_SALES_BATCH_2026-11-05.md` |
| SAL-03 | - | Trang `/` là trang giới thiệu tiếng Việt; người dùng đã đăng nhập vào `/login` để khôi phục phiên. | Ghi trang công khai `/` là giới thiệu; đăng nhập qua `/login`. | `reports/WEB_SALES_PAYMENTS_LANDING_2026-11-09.md` |
| SAL-04 | SALE-05 (bước 7 đến 8, VietQR) | Thanh toán khách theo toàn HTX, không theo vùng. Hóa đơn có hộp chờ VietQR, thăm dò trạng thái 3, 5, 10 giây; có thể đổi sang tiền mặt hoặc ghi nợ. Khoản chuyển khoản không khớp hóa đơn nào vẫn chờ xác nhận; cần DEBT-02.6 (chưa xong, xem Phụ lục B, B6). | Ghi thanh toán khách theo toàn HTX; mô tả hộp chờ VietQR. | `reports/WEB_SALES_PAYMENTS_LANDING_2026-11-09.md`; Backend README |
| SAL-05 | TRACE-04 (rút lại nguồn gốc), ORIGIN-01, SCR-ORIGIN-01; MSG-SALE-13, -14 | Chỉ Chủ HTX rút lại nguồn gốc; thương lái nhận MSG-TRACE-05. Trang công khai hiện VI và EN; bản tiếng Việt của thông điệp MSG-ORIGIN là đề xuất, SRS chỉ có tiếng Anh. MSG-SALE-13 và -14 chưa có trong catalog Web. | Thêm bản tiếng Việt của MSG-ORIGIN (sau khi PM xác nhận) và MSG-SALE-13, -14 vào catalog. | Backend README (`ProvenancePageController`); `reports/WEB_SALES_PAYMENTS_LANDING_2026-11-09.md` |
| SAL-06 | CLAIM-01, CLAIM-02 (quyền xem) | Chủ HTX và Quản lý vùng (trong vùng) xem khiếu nại; Kế toán không có quyền. Đây là PM default trong Backend README, chưa có quyết định ghi lại. | Ghi quyền xem khiếu nại theo vai trò sau khi PM xác nhận (Q16). | Backend README (Quality claims) |
| SAL-07 | SALE-07, SALE-08, CLAIM-03 | Sửa hóa đơn, hủy hóa đơn và trả hàng theo khiếu nại chưa có API. Phần chi tiết hóa đơn còn các hành động "chưa có" tương ứng. | Không sửa SRS; theo dõi tiến độ backend. | Backend README (Sales invoices, Quality claims) |

## 9. Giao diện & UX (khác biệt theo hướng dẫn giao diện)

| ID | Mã SRS v8 | Khác biệt và chi tiết | Đề xuất sửa SRS (một dòng) | Nguồn |
|---|---|---|---|---|
| UX-01 | Mô tả màn hình (dùng pop-up để sửa) | Pop-up chỉ dùng cho thêm mới, xác nhận đổi trạng thái (nghỉ việc, làm việc lại, ngừng dùng) và bí mật hiện một lần. Sửa hồ sơ tại chỗ, không pop-up. | Thêm quy ước giao diện: pop-up chỉ cho ba trường hợp trên; sửa hồ sơ tại chỗ. | HR-A02; `docs/DESIGN_GUIDELINES.md` mục 1.10 |
| UX-02 | - | Thay `window.confirm` và `window.prompt` bằng hộp thoại của ứng dụng (`useActionDialog`). | Không cần sửa SRS. | `reports/WEB_BROWSER_ROLE_QA_2026-10-30.md` |
| UX-03 | Bảng thuật ngữ (tên actor tiếng Anh) | Thuật ngữ tiếng Việt: Chủ HTX (hoặc Chủ nhiệm HTX, Q17), Nhân viên HTX, Thương lái, Tên đăng nhập, Tổng quan HTX. Tên sản phẩm trên giao diện là "HTX Trung Nam / Quản lý nuôi hàu"; không dùng "OMTS" làm tên hiển thị. | Thêm bảng thuật ngữ tiếng Việt ánh xạ với actor tiếng Anh. | `reports/WEB_VIETNAMESE_TERMINOLOGY_2026-11-04.md` |
| UX-04 | Sơ đồ menu (không có mã) | Menu nhóm: Nuôi trồng, Vật tư và mua hàng, Nhân sự và phân quyền, Kinh doanh. Mục không có quyền bị ẩn. | Không cần sửa SRS. | `reports/WEB_WORKFORCE_NAVIGATION_2026-11-02.md` |
| UX-05 | Định dạng ngày | Nhập ngày dd/mm/yyyy, lịch tiếng Việt; giá trị gửi API là ISO 8601. | Không cần sửa SRS. | `reports/WEB_FARMING_ZONES_UX_REVIEW_2026-10-28.md` |
| UX-06 | Dashboard Chủ HTX | Số liệu minh họa theo wireframe, không lấy từ API. | Ghi trạng thái minh họa cho đến khi có API. | `reports/WEB_MEETING_MAP_PAGING_WATER_2026-11-07.md` |
| UX-07 | ACCOUNT-08 (đánh dấu đã đọc) | Mở chi tiết thông báo không tự đánh dấu đã đọc. | Đối chiếu ACCOUNT-08 trước khi sửa. | `reports/WEB_WIREFRAME_SELECTIVE_APPLY_2026-11-06.md` |
| UX-08 | Nhật ký hệ thống (ACCOUNT-10) | Không có popup JSON trước và sau; không hiện SupplierId, RowVersion. | Không cần sửa SRS. | `reports/WEB_AUDIT_CYCLE_READABILITY_2026-11-06.md` |

## 10. Quy ước riêng của Web

| ID | Nội dung | Ghi chú |
|---|---|---|
| WEB-01 | Web gọi backend qua BFF (Next.js server). Cookie HttpOnly, refresh xoay vòng, phiên theo thiết bị. Nguyên văn: Phụ lục A, mục A5. | Liên quan AC-06 |
| WEB-02 | Component không gọi mock storage hay HTTP trực tiếp; mọi dữ liệu đi qua service và repository, mock và API dùng cùng giao diện. | `AGENTS.md` |
| WEB-03 | Lọc nhiều giá trị gộp ở phía client từ nhiều lần GET (tối đa 100 trang × 100 dòng). API không đổi. | `reports/WEB_CHECKBOX_FILTERS_AND_LOGIN_2026-11-08.md` |
| WEB-04 | Dùng "làn" thay "dây" trong wireframe. | `reports/WEB_FARMING_WIREFRAME_BATCH_2026-11-06.md` |
| WEB-05 | Thông báo backend giữ tiếng Anh theo SRS; Web hiển thị theo mã thông báo và `code`. | Nhật ký giai đoạn 3 |
| WEB-06 | Thông báo lỗi nhập và xuất nhân viên, lỗi file, và vượt giới hạn xuất 5000 dòng chưa có mã MSG (`messageCode` = null). | Nhật ký giai đoạn 1; chờ Q15 |

## 11. Câu hỏi mở

Cần chủ dự án hoặc PM trả lời. Mục nào đã có quyết định ghi trong nhật ký thì ghi kèm để xác nhận lại.

1. **Q1. [Đã trả lời 11/11]** Đúng: các bản 27/10/2026 và 28/10/2026 nằm trong bảng lịch sử thay đổi của SRS v8 (Report-3 V8, bản .docx trong D:\Đồ_án), nên v8 là bản mới nhất chứa "SRS 27/10". Câu hỏi gốc: SRS v8 và "SRS 27/10/2026" có phải cùng một bản? Backend và Web dùng mã "SRS 27/10" cho danh mục thông báo và mua hàng V2. Các mục trên đối chiếu với SRS v8 theo yêu cầu.
2. **Q2. [Đã quyết 11/11: hiện một lần trong pop-up]** Mật khẩu tạm của nhân viên: Chủ HTX không xem (WEB-EMP-ACCOUNT-01, 28/10) hay hiện một lần trong pop-up (HR-A02, 11/11)?
3. **Q3.** Email liên hệ của hồ sơ HTX (SRS dòng 592) và nhà cung cấp (dòng 682, SCR-PURCHASE-06) giữ hay bỏ? Nhật ký chưa đụng tới.
4. **Q4.** Tạm ứng lương: quyết định làm (11/11) nhưng mục E.3 nhật ký vẫn hỏi "có làm không, trừ vào kỳ nào"; xác nhận và chốt kỳ trừ.
5. **Q5.** Mở rộng lương (ca, làm thêm, ngày công chuẩn, phụ cấp, giảm trừ, thưởng), bảo hiểm và thuế TNCN: có làm không? (nhật ký E.1, E.2)
6. **Q6.** Quyền PAY_RULES (loại công việc và đơn giá): có thành luật cứng chỉ Chủ HTX không? Hiện bảng lương và thiết lập chấm công là luật cứng; loại công việc vẫn theo quyền PAY_RULES.
7. **Q7.** Kế hoạch chu kỳ: báo cáo 07/11 ghi chỉ nhắc theo dõi, không cảnh báo. Working tree (11/11) đã cài cảnh báo mềm ở +10% và từ chối ở +50%. Chủ dự án xác nhận hay chỉnh ngưỡng?
8. **Q8.** Sổ kho (Xuất dùng, Xuất hủy) có trở thành một phần của SRS mới không, và thả giống có trừ lô giống không (D6)? Đây là mâu thuẫn với BR-PURCHASE-07 và GBR-04.
9. **Q9.** Khóa kỳ lương cho chấm công và yêu cầu: khóa mọi ngày trước kỳ (hiện tại) hay chỉ kỳ chứa ngày (BR-LABOR-13)?
10. **Q10. [Đã quyết 11/11: theo SRS v8, SALE-01 tính theo kg; số lồng chỉ dùng ở thu hoạch]** Yêu cầu mua theo số lồng hay theo kg? Báo cáo 05/11 và 09/11 không thống nhất.
11. **Q11.** Quản lý vùng có xuất và nhập file nhân viên không (hiện: không)? Có đọc được giấy tờ vùng không? Có sửa chấm công của nhân viên đã nghỉ không (hiện: có)?
12. **Q12.** Mã nhân viên có được trùng với người đã nghỉ không (hiện: không)? Giới tính và ngày bắt đầu có cần xóa được không? Nhập file có chế độ "dừng khi có lỗi" như KiotViet không?
13. **Q13.** Số tài khoản ngân hàng có xuất ra file nhân viên không? Đề xuất: không.
14. **Q14.** System Administrator là ai và được cấp thế nào (AC-04)? Kế toán có đúng một tài khoản (AC-03)?
15. **Q15.** Mã MSG cho các thông báo mới (nhập và xuất nhân viên, vượt mục tiêu chu kỳ, MSG-SALE-13 và -14, MSG-ORIGIN tiếng Việt).
16. **Q16.** Quyền xem khiếu nại chất lượng: Quản lý vùng chỉ xem trong vùng; Kế toán không xem (PM default).
17. **Q17.** Tên hiển thị của vai trò Chủ sở hữu: "Chủ HTX" hay "Chủ nhiệm HTX"? Hai tài liệu đang dùng khác nhau.
18. **Q18. [Đã quyết 11/11: bỏ email khỏi tài khoản là đúng; email dùng cho mục đích liên hệ khác, không để đăng ký hay đăng nhập]** Module tài khoản backend: nhật ký 11/11 ghi email chưa bỏ, nhưng code nhánh hiện tại từ chối email khi đăng ký và README mô tả đã bỏ. Cần kiểm tra trên `develop` để xác nhận.
19. **Q19.** Mục tọa độ: ngưỡng 5 km và khung Việt Nam (vĩ 8 đến 24,5; kinh 102 đến 110) đã chốt chưa (D9)?
20. **Q20.** Sau khi nhóm backend đẩy nhánh `feature/web-hr-api-gaps` lên, cần đối chiếu lại HR-03, HR-04, PAY-06 với API đã push (hiện Web đã nối nhưng API chưa push).
21. **Q21. [Mới 12/11]** Ươm "bắt buộc" có cưỡng chế không? Hiện đường **tạo chu kỳ cũ** (không từ ươm) vẫn chạy: thả giống qua đường đó còn 110%/150%, không chọn lô bị kiểm, trừ kho như trước. Chọn: (a) bắt buộc ươm cho mọi bè mới (khóa đường cũ, chỉ dữ liệu cũ giữ nguyên); (b) cho cả hai đường, ươm là khuyến nghị.
22. **Q22. [Mới 12/11]** Mã SRS cho thông báo ươm (bắt đầu, sửa, hủy, hoàn tất, sửa sống sót, chia lại) và mã lỗi `NURSERY_*` (hiện `MSG-GEN-09` tạm). Đề nghị PM đặt `MSG-NURSERY-xx`.
23. **Q23. [Mới 12/11]** Quyền ươm: dùng chung `CultivationCycles` (đã chốt 12/11: không mã riêng). PM xác nhận đưa vào SRS như thế.
24. **Q24. [Mới 12/11]** Thu hoạch gắn yêu cầu mua đã chấp nhận (HAR-01): đã có trong code từ nhóm bán hàng. Đưa vào SRS HARVEST-01 như bước bắt buộc, hay để ngoài SRS?
25. **Q25. [Mới 12/11]** Ảnh bắt buộc 1-3 ở thả giống, thu hoạch, kế hoạch nuôi, sự cố làn (PHO-01, LANE-04, HAR-03): PM xác nhận đưa vào SRS. Chăm sóc và vật tư giữ tùy chọn.
26. **Q26. [Mới 12/11]** Sửa sống sót hoặc chia lại sau khi đã thả một phần: chấp nhận chia lại miễn không dưới số đã thả (NUR-05)? Đề xuất: có.
27. **Q27. [Mới 12/11]** Thông báo cho Chủ HTX khi Quản lý vùng sửa % làn (LANE-01)? Đề xuất: có, thông báo thường. Hiện backend chưa có.
28. **Q28. [Mới 12/11]** Cảnh báo hao hụt ươm cao (NUR-04): chốt không cảnh báo. PM xác nhận.
29. **Q29. [Mới 13/11]** Thả giống từ ươm bắt buộc đủ 100% phần đã chuyển sang bè (NUR-15): PM xác nhận đưa vào SRS (CYCLE-02, thay GBR-04 cho lần thả từ ươm). Hệ quả: một lần thả lấy hết phần chia; chỉ thả tiếp khi chủ nâng phần chia; nuôi ít hơn phần đã chuyển thì phải sửa số sống sót hoặc chuyển phần thừa sang bè khác trước.

## 12. Quyết định của chủ dự án ngày 11/11/2026 (bổ sung)

- **Kg từ số lồng là ước tính, không phải trọng lượng thật.** SRS v8 đã định nghĩa: Estimated kg = số lồng × kg trung bình mỗi lồng (cài đặt chung của hợp tác xã), Quản lý vùng được sửa, chỉ để theo dõi và không bao giờ lập hóa đơn; số kg lập hóa đơn là Confirmed weight, cân tại cảng (BR-HARVEST-02). Hệ quả: mọi nơi hiển thị kg suy ra từ số lồng phải ghi "ước tính"; không tính cân nặng mỗi con, hao hụt hay tỷ lệ sống; trần so với kế hoạch chỉ là cảnh báo theo ước tính. Sửa tay kg ước tính được phép (đúng SRS), không bị từ chối cứng ở 0,2 đến 2 lần.
- **Số lồng cho phép số lẻ** (nửa lồng): khác SRS nếu SRS ghi số nguyên; cần ghi vào mục Nuôi trồng.
- **Kho tồn được kiểm tra thật:** thả giống và sử dụng vật tư đi qua sổ kho, thay BR-PURCHASE-07 và GBR-04 (xem STK-01).
- **Mọi thực thể liên kết và tham chiếu được với nhau** giữa các màn.

**Quyết định 12/11/2026 (ươm giống và làn, chi tiết mục 13-14):** ươm là bước bắt buộc cho lần thả mới; đợt ươm một lô giống, một vùng; kho trừ khi bắt đầu ươm và luôn chặn tồn âm; sống sót ước tính nhập lúc hoàn tất; đợt đã hoàn tất không hủy; bỏ ngày thu hoạch dự kiến; thu hoạch không bị chặn theo mục tiêu; ảnh bắt buộc 1-3 ở bước quan trọng; % làn nhập ngay trong form thả và thu; ảnh lưu local tạm; thông báo cho Chủ HTX khi Quản lý vùng ghi ươm.

## 13. Ươm giống (12/11/2026): đối chiếu SRS

Nguồn: `FARMING_NURSERY_STEP_SPEC_2026-11-12.md` (mục 2, 4, 5, 10), `FARMING_NURSERY_API_CONTRACT_2026-11-12.md`. Mã dòng SRS theo `.hallmark/srs-v8/srs-v8-full.txt` (bản v8, không đổi).

| SRS v8 | Thay đổi đề xuất | Ghi chú |
|---|---|---|
| Dòng 446 (quy trình, mô tả "acclimatize the seed") | Bỏ câu "this step is not recorded in OMTS"; thêm bước ươm bắt buộc (NUR-01) | Câu gốc còn nguyên trong SRS v8 |
| Use case mới | NURSERY-01 bắt đầu, -02 theo dõi/sửa/hủy, -03 hoàn tất và tạo chu kỳ, -04 sửa sống sót và chia lại | Đề xuất mã, PM đặt số |
| CYCLE-01 (bắt đầu chu kỳ) | Chu kỳ từ ươm bắt đầu từ NURSERY-03, mang phần chia và sản lượng dự kiến; chu kỳ cũ giữ nguyên | Đường cũ còn mở (Q21) |
| CYCLE-02 (ghi thả giống) | Chu kỳ từ ươm: nguồn là phần chia, bỏ chọn lô, bỏ so 110%/150%, chặn cứng theo phần còn lại | NUR-08 |
| CYCLE-06, tóm tắt, xem trước đóng | Thêm khối `nursery` (vào, sống sót ước tính, hao hụt ước tính) | Mục 5.2 đặc tả |
| BR-CYCLE-07 ("no loss record") | Ghi số sống sót khi hoàn tất ươm (ước tính bằng mắt). Hao hụt trong nuôi vẫn không ghi. Câu "no loss record" chỉ áp cho nuôi | Dòng SRS về làn Growing khi đóng sớm (no loss record) giữ cho nuôi |
| GBR-04 (không so với giống còn lại) | Thả giống thuộc đợt ươm bị giới hạn theo phần chia (cứng). Thả thường: đã đổi thành kiểm tồn lô (G.4) | NUR-08, STK-02 |
| BR-PURCHASE-07 ("OMTS keeps no stock") | Thay: kho trừ lúc bắt đầu ươm (phiếu Xuất dùng mục đích Nursery) | NUR-03, G.4 |
| Quy tắc mới BR-NURSERY-01..07 | 01 nơi ươm là vùng; 02 vào không vượt tồn; 03 một đợt một lô; 04 hoàn tất: sống sót ≤ vào, tổng phần chia = sống sót, bè cùng vùng, không chu kỳ mở; 05 sửa sống sót ghi cũ → mới; 06 Quản lý vùng ghi thì báo Chủ HTX; 07 ươm bắt buộc cho thả mới | Đặc tả mục 4 |
| Message | MSG-NURSERY-xx (tạm: `MSG-GEN-09` + `reasonCode`) | NUR-12 |
| Thực thể | NurseryBatch; liên kết SeedingRecord, CultivationCycle; NurseryBatchRaftAllocation; trạng thái Đang ươm, Đã hoàn tất, Đã hủy | Backend `20261112124320_NurseryBatches` |
| Màn hình | SCR-NURSERY-01 danh sách và chi tiết; -02 bắt đầu; -03 hoàn tất | Web `/farming/nursery` |
| Từ điển | Ươm (Nursery), Sống sót (Survivors, ước tính), Hao hụt ươm | — |
| Truy xuất công khai | Không đổi | NUR-13 |

## 14. Ảnh, % làn và thu hoạch (12/11/2026)

**Ảnh.** Đặc tả 10.2 và 10.6 (chủ dự án): ảnh là ảnh chụp tại hiện trường, 1 đến 3 ảnh JPEG hoặc PNG, mỗi ảnh tối đa 10 MB, áp dụng cho bản ghi mới. Lỗi ảnh là 400 gắn trường `Photos`. Lưu local tạm qua `IFileStorage` (PHO-03); cloud về sau bằng cấu hình `Storage`. Khóa lưu giữ dạng `{category}/{yyyy}/{MM}/{guid}.{ext}`.

**% làn.** Mỗi làn có `seededPercent` và `harvestedPercent`. Cộng dồn không vượt 100% trong cùng chu kỳ. Trạng thái làn suy ra từ %: 0 là chưa thả, giữa 0 và 100 là đang nuôi hoặc đang thu một phần, 100 là thả đầy hoặc thu xong. Nút "hoàn tất thu hoạch" đặt `harvestedPercent` = 100. Mỗi lần chỉnh ghi nhật ký (cũ → mới, lý do, người sửa). Số lồng và % thu là hai số độc lập. Web W1 đã vẽ sơ đồ; API `PUT /api/rafts/{raftId}/lanes/{n}/progress` chờ B2.

**Thu hoạch.** Không bị chặn theo mục tiêu chu kỳ (Owner, 12/11). Phải gắn một yêu cầu mua đã chấp nhận (HAR-01, đã có từ nhóm bán hàng). Có nhóm nhân viên cùng thu (`crew`). Ảnh 1 đến 3 cho lô mới (HAR-03, chờ B2).

**Sự cố làn.** Ghi chú bắt buộc (khi nào, làn nào, hỏng thế nào), ảnh bắt buộc 1 đến 3 (LANE-04, chờ B2). Hiện backend vẫn coi ảnh là tùy chọn.

## Phụ lục A - Ghi chú chuyển từ README Web (nguyên văn)

Các đoạn dưới đây được bỏ khỏi `README.md` của Web ngày 11/11/2026 vì là ghi chú thay đổi, tiến độ hoặc hướng dẫn nhánh cũ. Nội dung giữ nguyên văn như bản README trước đó.

#### A1 Trạng thái và ghi chú tiến độ

##### Current status

**Reviewing this project for the first time?** Follow the [reviewer quick start and screen checklist](REVIEW_GUIDE.md).

For a presentation without development overlays, use `npm run build` followed by `npm run start`. Use `npm run dev` while editing code.

> Last updated: **November 3, 2026**. This README describes the source on the branch you are viewing, not every planned OMTS feature.

- **The UI can run with mock data** without a backend, database, or Docker.
- Mock review mode and the real API workspace use separate repository adapters. The API workspace now includes cooperative, employee, account, role and personal workflows as described below.
- Farming zones now have a searchable directory and profile dialogs. Owners can create, rename, edit and discontinue/reactivate zones, then add shared legal documents and replacement versions. Assigned internal users with View permission have read-only access. Renames keep stable zone IDs and update management pickers and role/scope labels from a shared source. Sample locations are not verified cooperative records.
- Rafts now have a directory, profile dialogs, dated lane diagrams and segment-source details. Owners can create/edit rafts and layouts, upload JPEG/PNG photos and discontinue/reactivate eligible rafts. Open cultivation cycles block layout changes and discontinuation; historical layouts are retained. Assigned readers stay within their zone/record scope. Missing material cost remains unknown until purchase receipts are available.
- Date fields use Vietnamese day/month/year entry and a Vietnamese picker while service values remain ISO dates. The desktop sidebar reserves layout space when it expands instead of covering page text.
- The navigation now uses a light sidebar, opens by default on desktop, and supports explicit collapse/pinning plus delayed hover and keyboard expansion. Account name, role and scope appear on separate lines. The mobile drawer releases its scroll lock when resizing to desktop. The dashboard prioritizes raft usage and presents permitted shortcuts as a list.
- The review build shares mock state between management screens: updated role permissions can be assigned, new accounts can be linked to employees, and dashboard counts update. Created staff accounts can complete first-login password/contact setup; account locking and password reset affect their mock login. Personal profile changes, password recovery, and notification settings can be demonstrated without a backend.
- The approved October 27 role policy is now **three fixed zone roles: Zone Manager, Accountant, and Staff**. Owners can edit permissions and discontinue/reactivate roles; they cannot add, copy, or rename roles. Staff initially has no business permissions. This policy is implemented in the product mock; backend/SRS alignment is tracked separately.
- Dashboard headings and permitted shortcuts render while metrics load. Management directories now include clearer rows, summaries and combined filters; editors continue to open in dialogs.
- A local API workspace supports real login → permissions/profile → logout through the Next.js BFF, management screens, purchase receipts, supplier payments and water measurement workflows. Employee profiles support account link/unlink, working zones, bank details and separate employment changes with account follow-up. Saved zone profiles support shared licenses and renewal history; saved raft profiles support photos, dated lane conditions and receipt-backed costs. Use `npm run setup:api`, `npm run build` and `npm run start:api`; the default review mode remains mock. Staff contact activation and new-account creation still await backend alignment.
- Personal API profiles show identity, verified contacts and current grants, with versioned display-name edits. Notification preferences use the backend account-type catalog; mandatory In-app cells are locked and Push is read-only. Owners can inspect role matrices, usage and grant history, then revoke an existing grant with a reason and confirmation. New grants and role edits await fixed-role alignment. Web supports the upcoming backend PR19 message codes alongside the current contract, including notification notice precedence and the removed null raft-source fields. See the [latest workflow evidence](reports/WEB_PERSONAL_NOTIFICATIONS_ACCESS_API_2026-10-29.md) and [Jira/contract changes](reports/WEB_JIRA_PR19_CONTRACT_UPDATE_2026-10-29.md); planned SRS changes are not deployed APIs.
- Password recovery (SMS code to the phone number) and contact verification/change (email or phone, from the profile) run through the BFF. The state of a verification in progress lives in one short-lived, AES-GCM sealed `HttpOnly` cookie (`__Secure-omts_vf`, only sent to `/api/verifications`), keyed by the session key ring and bound to the API session id and account when signed in; browsers receive opaque flow IDs and safe metadata. The API alone enforces single-use codes and tokens, so a replayed older cookie can at most repeat an attempt the API then refuses, until the flow expires (5 minutes for the code, 10 for the proof). The Web has no self-registration: Traders register in the Mini App, and the Web no longer offers email as a sign-in, recovery or password-change proof. Verified contacts wait for explicit profile Save. Independent name/contact writes report partial success truthfully and retain remaining drafts. Password changes replace the session cookies with the new tokens the API returns. See [G2 validation and limits](reports/WEB_G2_VERIFICATION_API_2026-10-29.md); Staff contact onboarding and other backend contract blockers remain open.
- The current UI work is on `feature/OMTS-132-web-foundation` and has not been merged into `develop`. Check out the correct branch to review the screens and configuration described below.
- In API mode, cooperative profiles now support editable industry rows, validation, name/address preview and confirmation, plus separate PNG/JPEG/WebP logo upload/removal. Drafts survive logo changes and conflicts. Receiving-bank integration still awaits the existing BA/backend decision; see the [tester flow and limitations](reports/WEB_COOPERATIVE_API_2026-10-29.md).
- Docker/API verification is available without changing the older QA databases: the latest isolated runtime uses API `8082` and SQL Server `1436`, while the existing develop/QA runtimes remain on `8080`/`8081`. See the [Docker/API/Vercel runtime report](reports/WEB_DOCKER_API_VERCEL_2026-11-03.md).
- The production Vercel alias is [omts-web.vercel.app](https://omts-web.vercel.app). It currently runs the safe mock mode; a real Vercel API deployment still requires a stable HTTPS backend and hosted Redis with TLS/authentication.

Public QR-based provenance pages are part of the product scope but are not complete in the current version.

#### A2 Nhánh làm việc và hướng dẫn cài đặt

To review the current foundation work, switch to this branch **before installing dependencies**:

```bash
git switch feature/OMTS-132-web-foundation
```

#### A3 Tài khoản demo

Các fixture username cũ như `nguyen.an`, `pham.cuong`, `staff-verified` và `tran.binh` không còn là tài khoản hướng dẫn chính.

Đăng nhập trên Web là **số điện thoại + mật khẩu**; email không còn là định danh đăng nhập và biểu mẫu từ chối giá trị có `@`. Riêng chế độ mock vẫn nhận các username demo ở trên để xem trước (Owner cũng đăng nhập được bằng `0900000000`).

The Web form signs in by phone number and password only, so use the phone number of the seeded account; the username column only names the account (the API still accepts a username, the Web form does not).

#### A4 Ghi chú màn hình

This table lists existing UI screens, not use cases accepted against a real API. Income, expenses, rafts, and harvest metrics display the appropriate no-data state when their data sources are unavailable.

#### A5 Quy ước Web: BFF và cookie

The agreed architecture is a **BFF (Backend for Frontend)**: the browser calls the Next.js server, which communicates with the .NET backend. The BFF holds no session state. The access token (`__Host-omts_at`, sent to every route) and the refresh token (`__Secure-omts_rt`, `Path=/api/auth`, so it is only sent to the auth routes) are `HttpOnly; Secure; SameSite=Lax` cookies (`omts_at_dev` / `omts_rt_dev` on the explicit loopback HTTP profile). `src/proxy.ts` sends a protected page navigation with a missing or nearly expired access cookie through `/api/auth/refresh`, which renews both cookies and returns to the page; client calls go through `bffFetch`, which renews once on a 401 under the shared Web Lock and retries. A refresh answered from the API grace window carries the refresh token the browser already holds, so only the access cookie is rewritten. Cookies are cleared only when the API definitively refuses the refresh token (401/403), never on a timeout or 5xx. Nothing is stored on the BFF: no Redis or other database is needed.


## Phụ lục B - Ghi chú chuyển từ README Backend (nguyên văn)

Các đoạn dưới đây được bỏ khỏi `README.md` của Backend ngày 11/11/2026. Nội dung giữ nguyên văn. Phần hành vi kỹ thuật vẫn còn trong `docs/api-behaviour-reference.md` và `docs/operations-reference.md` của Backend.

#### B1 Đăng nhập và email

Email is a contact for notifications only: it is no longer a way to register
(`POST /api/auth/register` and `POST /api/verifications` accept `channel` `Sms` only), to recover a password
(`POST /api/auth/recovery` sends an SMS code to a verified phone number; an email identifier gets the same answer and no code) or to
prove identity when changing the password (`POST /api/me/password` needs the current password; `POST /api/me/password/code` is gone).
Adding, changing and verifying an email in the profile still works. A trader account created through the old email registration
has no phone number: it cannot log in by phone, and a username (generated at registration) is not something the person knows. There is
no migration for such accounts; run `SELECT Id, Username, Email FROM Accounts WHERE PhoneNumber IS NULL AND Email IS NOT NULL` before deploying
to see whether any exist (staff and Owner accounts always have a phone number).

#### B2 Mã lỗi tạm thời

For one
release they also carry `legacyCode`, the old code of the same situation (`MSG01`, `MSG12`…), so web and mobile can
switch on their own schedule.

A few old codes have no SRS 27/10 message yet and are still sent as `code` (MSG05,
MSG06, MSG19, MSG58, the technical codes `NOT_FOUND`, `UNEXPECTED_ERROR`…; full list in
`MessageCodes.Legacy.KeptAsCode`).

#### B3 Mã thay thế tạm thời

; the older `zoneIds` is read for one release, with one
  zone only

(`/reactivate` is the older route, kept for one release)

#### B4 Trang nguồn gốc, bán hàng, nhân sự

The Vietnamese
  MSG-ORIGIN texts are proposals until the PM confirms them (the SRS gives English only).

A lot whose returned oysters were thrown away (CLAIM-03) will be left out once sales returns exist.

The corrections and the cancel date and reason of SALE-09.1 step 2 have no data yet: they join the detail with SALE-07 and SALE-08.

Not here yet: the employee app login with login codes (LABOR-03, LABOR-06) and the pushes to the employee (MSG-LABOR-05, MSG-LABOR-15).

#### B5 Chưa có nhà cung cấp (OCR, API-12)

The OCR Service of the water meter photos (WATER-01) is only faked until its provider ticket:

The Payment Notification Service (API-12) has no provider yet, so there is only an interface (`IPaymentNotificationService`)
and a fake that works in Development:

#### B6 Thanh toán VietQR chưa hoàn tất

Until DEBT-02.6 (settle: attach to a profile, or pay it
    back) ships in PR 7b, such a payment cannot be confirmed

#### B7 Demo và chu kỳ

The demo has no Open cycle yet, so GFR-04 sends no reminder (MSG-WATER-06) in the demo until the cycle demo data arrives.

#### B8 Nâng cấp dữ liệu (migration)

Upgrading a database from before the fixed roles (migration `FixedRoles`): the rows named "Zone Manager" and
   "Accountant" get the codes, other roles get a placeholder code (they are not listed, and their pairs give no
   permission, login or zone any more), and the validity dates of the pairs are dropped, so expired and future pairs and
   pairs of discontinued roles become Effective again; of two Effective copies of one pair only the newest stays. Down is
   lossy (no stored permissions, every role In Use). Demo and test databases are not converted further: reset them
   (`docker compose down -v`).
   Upgrading a database from before the purchasing catalogue of SRS 27/10 (migration `PurchaseCatalogueV2`): the item
   group `RaftMaterial` becomes `Material`, the supplier's free-text "other contacts" become its address, and the
   migration stops when two farming input items have the same name (rename one first, or reset a demo database).
   Upgrading a database from before the purchase receipts of SRS 27/10 (migration `PurchaseReceiptsV2`): receipts lose their
   zone, discount, paid-now amount and invoice photos; their lines get numbers and the receipt raft on their Seed and
   Material lines; seed lots become the Seed lines themselves (the seeding events are re-pointed); old codes
   (`PR-yyyyMMdd-nnn`) stay and new receipts take `PN000123` codes from the `DocumentSequences` counter, which starts after
   the highest PN code and never gives a number twice. Down is lossy. Demo databases are not converted further:
   reset them (`docker compose down -v`).
   Upgrading a database from before the supplier payments of SRS 27/10 (migration `SupplierPaymentsV2`): payments are no
   longer linked to receipts and lose their evidence files; the rows get kind `Payment` and `TT000123` codes in payment order,
   and the `DocumentSequences` counter starts after them. Down is lossy (money
   paid back is dropped, amounts are rounded to thousands). Demo databases are not converted further: reset them.
   Upgrading a database from before the purchase returns of SRS 27/10 (migration `PurchaseReturnsV2`): the rows become Recorded
   and keep their amounts and `PRT-…` codes, new returns take `TH000123` codes; the refund columns are dropped without turning
   them into money paid back, so a refund already on a return leaves the debt. Down is lossy (Cancelled returns are deleted, amounts
   are rounded to thousands). Demo databases are not converted further: reset them.


## Cần cập nhật SRS

Checklist theo chương SRS. Mỗi dòng là một thay đổi cần đưa vào SRS; ô "Mục" nêu mã hoặc vị trí đã biết.

### Use case

- [ ] ACCOUNT-01, -02, -03, -05, -06: bỏ email; đăng nhập bằng số điện thoại hoặc tên đăng nhập; khôi phục bằng SMS (AC-01).
- [ ] ACCOUNT-02 và SCR-ACCOUNT-02: bỏ "phone hoặc email" trong màn đăng nhập.
- [ ] LABOR-01: màn 4 tab, sửa tại chỗ; loại nhân viên; lọc, sắp xếp, xuất và nhập file; tạo tài khoản mới, bỏ liên kết (HR-01 đến HR-05).
- [ ] LABOR-01.3: ngừng việc theo ngày làm cuối; làm việc lại (HR-02).
- [ ] LABOR-02, LABOR-04, LABOR-05, LABOR-07, LABOR-08, LABOR-10: ghi các endpoint thực tế; thêm giờ vào thiếu (CL-01, CL-02).
- [ ] LABOR-12: chỉ Chủ HTX; trạng thái mới; tạo bảng lương qua pop-up; tab Lịch sử thanh toán; tháng ghi nhận chi phí (PAY-01, PAY-03, PAY-04, PAY-06, PAY-10).
- [ ] LABOR-13: phiếu lương và tab hồ sơ nhân viên (PAY-06).
- [ ] LABOR-14: thanh toán, tạm ứng, hủy phiếu chi; bỏ gửi và trả lại (PAY-04, PAY-05, PAY-07).
- [ ] LABOR-16: bỏ màn Thiết lập kỳ lương (PAY-02).
- [ ] HARVEST-01: số lồng thập phân; kg = số lồng × kg mỗi lồng; đánh dấu làn đã thu xong (FARM-01, FARM-05).
- [ ] UC30: đã bỏ; ghi kế hoạch là ước tính của chu kỳ (FARM-03).
- [ ] Đăng ký thương lái: qua Zalo Mini App; Chủ HTX duyệt (AC-05).
- [ ] Trang nguồn gốc và rút lại nguồn gốc (TRACE-04): chỉ Chủ HTX; thông báo MSG-TRACE-05 (SAL-05).
- [ ] CLAIM-01, CLAIM-02: quyền xem theo vùng (SAL-06).
- [ ] Đo nước (WATER-01 và các mục liên quan): Web chỉ xem; ghi trên điện thoại (FARM-09).
- [ ] GFR-07: tạo bảng lương tự động, chưa triển khai (PAY-12).

### Business rule

- [ ] BR-FARM-07: ba vai trò cố định; Nhân viên là loại tài khoản (AC-02).
- [ ] BR-FARM-08: quyền theo vùng; hồ sơ không theo vùng áp dụng theo vai trò (AC-03, CL-05).
- [ ] BR-LABOR-07 và BR-LABOR-10: thưởng, điều chỉnh, chi phí theo bè chưa áp dụng (PAY-08).
- [ ] BR-LABOR-09: Nhân viên không có phiếu lương (PAY-09).
- [ ] BR-LABOR-11: tạm ứng thay cho "không trả trước"; thanh toán một phần; hoàn tiền (PAY-05, PAY-07).
- [ ] BR-LABOR-12: đơn giá theo ngày hiệu lực (đã làm; ghi rõ).
- [ ] BR-LABOR-13: khóa kỳ đúng kỳ hay toàn bộ trước kỳ (CL-04, Q9).
- [ ] BR-CYCLE-07 và BR-FARM-03: không có sổ hao hụt; tỷ lệ sống là ước tính suy ra nếu được chấp nhận (FARM-02).
- [ ] BR-HARVEST-07 và kế hoạch chu kỳ: cảnh báo mềm ở 110%, từ chối ở 150% (đang làm; ngưỡng do Q7) (FARM-04).
- [ ] BR-PURCHASE-07 và GBR-04: sổ kho và thả giống (STK-01, STK-02, Q8).
- [ ] Tọa độ vùng và bè: quy tắc kiểm tra (FARM-06, Q19).
- [ ] Yêu cầu mua theo lồng hoặc kg (STK-05, Q10).
- [ ] Quyền Export và Import nhân viên: chỉ Chủ HTX (HR-05).
- [ ] Mật khẩu tạm của nhân viên (AC-07, Q2).

### Message

- [ ] Thông báo lỗi nhập và xuất nhân viên, lỗi file, vượt 5000 dòng: đánh số MSG mới (WEB-06, Q15).
- [ ] Vượt mục tiêu chu kỳ: đánh số MSG cho cảnh báo mềm (FARM-04, Q15).
- [ ] MSG-SALE-13 và MSG-SALE-14: đưa vào catalog (SAL-05).
- [ ] MSG-ORIGIN: bản tiếng Việt sau khi PM xác nhận (SAL-05).
- [ ] MSG-LABOR-04, -06, -07, -12, -13, -14, -16, -22, -23, -25, -26, -28, -31, -34: đối chiếu với SRS và ghi đúng nội dung (CL-01, PAY-01).
- [ ] MSG-LABOR-05 và -15 (thông báo cho nhân viên): chưa dùng (CL-03).
- [ ] MSG-LABOR-32 và -33: bỏ hoặc ghi lý do (PAY-07).
- [ ] Thông báo Kế toán khi có phiếu cần thanh toán: thêm vào danh sách thông báo (STK-06).

### Screen

- [ ] SCR-ACCOUNT-01, -03, -04, -05: bỏ email; xác minh chỉ bằng số điện thoại (AC-01).
- [ ] Màn đăng ký: bỏ; đăng ký thương lái qua Mini App (AC-05).
- [ ] Màn Nhân viên (LABOR-01): 4 tab, sửa tại chỗ, pop-up chỉ cho ba trường hợp (HR-01, UX-01).
- [ ] LABOR-16 (Thiết lập kỳ lương): bỏ màn (PAY-02).
- [ ] Màn Bảng lương: pop-up tạo bảng; tab Thông tin, Phiếu lương, Lịch sử thanh toán; trạng thái mới (PAY-03, PAY-06, PAY-07).
- [ ] SCR-PURCHASE-06 và hồ sơ HTX (dòng 592): bỏ email liên hệ nếu chốt Q3.
- [ ] Tổng quan Chủ HTX: số liệu thật thay cho số minh họa (UX-06).
- [ ] Trang `/` giới thiệu và `/login` (SAL-03).
- [ ] Màn Phiếu nhập và Phiếu trả hàng theo cấu trúc V2 (STK-03, STK-04).

### Entity

- [ ] Account: bỏ email (dòng 604–605) (AC-01).
- [ ] Employee: thêm mã, giới tính, CCCD (không xuất file), ngày bắt đầu, EmployeeType và lịch sử loại; bỏ email (HR-02, HR-04, HR-06).
- [ ] Payroll: Code, PeriodType, Scope, ExpenseMonth, Note, CancelledAt; PayrollLine, PayrollLineJob, WagePayment, PayrollAdvanceDeduction, PayrollSelectedEmployee (PAY-03 đến PAY-07).
- [ ] WorkAssignment, Attendance, EmployeeRequest: thực thể mới (CL-01, CL-02).
- [ ] HarvestLot: số lồng thập phân; OverPlanReason; cờ làn đã thu xong nếu chốt (FARM-01, FARM-04, FARM-05).
- [ ] HarvestPlan: không có thực thể này; ghi rõ (FARM-03).
- [ ] Sổ kho: InputItem (mã VT), InputIssue (Dùng và Hủy) (STK-01).
- [ ] PurchaseReceipt V2, PurchaseReturn, SupplierPayment: mã PN, TH, TT (STK-03, STK-04).
- [ ] Supplier và Cooperative: email liên hệ (Q3).
- [ ] CustomerSettings (giới hạn công nợ, trường bắt buộc) (SAL-01).
- [ ] NurseryBatch và các liên kết (mục 13) (NUR-01 đến NUR-02).
- [ ] Ảnh bắt buộc 1-3 ở các bước quan trọng và sự cố làn (PHO-01, LANE-04, HAR-03).
- [ ] Làn: % thả và % thu theo làn (LANE-01, LANE-02).
- [ ] Thu hoạch gắn yêu cầu mua và nhóm nhân viên cùng thu (HAR-01, HAR-02).
- [ ] Kế hoạch chu kỳ bỏ ngày thu hoạch dự kiến (NUR-14).
