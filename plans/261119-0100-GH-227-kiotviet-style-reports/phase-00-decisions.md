# Phase 0 – Quyết định cần chốt (user/PM)

Theo AGENTS.md: thay đổi contract/quyền/nghiệp vụ phải hỏi trước. Mỗi mục có **đề xuất mặc định**; nếu user chưa trả lời thì model làm theo mặc định và ghi vào `docs/SRS_DEVIATIONS.md` (BE) / báo cáo phase.

| # | Câu hỏi | Đề xuất mặc định |
|---|---|---|
| D1 | "Chi nhánh" của KiotViet = vùng nuôi (zone)? | Có. Lọc vùng áp cho hóa đơn, lô thu hoạch, xuất vật tư. Thu/chi, công nợ, nhập hàng không có vùng → không lọc theo vùng, ghi chú trên màn. |
| D2 | Giá vốn / Lợi nhuận tính thế nào? | Giai đoạn 1 **không tính lợi nhuận theo sản phẩm**. Báo cáo Tài chính dùng chi phí thực trong kỳ: giống + vật tư đã xuất (InputIssue Kind=Use, Value) + lương đã chốt (Payroll theo tháng chi phí) + phiếu chi khác (CashVoucher Category=OtherExpense). Phân bổ giá vốn theo kg chu kỳ để sau. |
| D3 | VAT | Bỏ hết cột thuế (DB không có VAT). |
| D4 | Thư viện biểu đồ | **CHỐT (user): cài thư viện** (đề xuất `recharts`, phiên bản cố định đã ra ≥2 tuần, kiểm tra tương thích React/Next của repo trước khi cài). Biểu đồ mới giữ **giao diện na ná biểu đồ Sản lượng nuôi hiện tại** (màu, nhãn, tooltip, chú giải) và nâng cấp thêm (tooltip, chú giải bấm ẩn/hiện series, cột chồng, trục tiền rút gọn). **Đổi luôn biểu đồ Sản lượng nuôi** sang cùng bộ component để thống nhất; phải nhìn gần giống bản cũ. |
| D5 | Quyền | **CHỐT (user): Chủ HTX + Kế toán** xem được tất cả báo cáo (Tổng quan, Cuối ngày, Bán hàng, Hàng hóa, Khách hàng, Nhà cung cấp, Tài chính). Được phép sửa BE: các endpoint đang gắn `[RequireCooperativeOwner]` (vd `api/dashboard`) hoặc `SALES_REPORTS` mà Kế toán chưa có thì sửa để Kế toán vào được (kiểm tra role Accountant trong seed/permission, thêm quyền hoặc đổi attribute; ghi vào `docs/SRS_DEVIATIONS.md`). Web: menu + `operationAllowed` cho cả hai. Nhân viên/quản lý vùng khác: không thấy. |

**Chốt:** D1 ok, D2 ok, D3 ok, D4 ok (xem giải thích: tự vẽ SVG, không cài thư viện), D5 như trên.
| D6 | "Hoạt động gần đây" trên Tổng quan | Lấy từ nhật ký thao tác (audit log) đã có, 10 dòng mới nhất. |
| D7 | Mock `DashboardExperience` | Giữ cho chế độ mock; chế độ API dùng dữ liệu thật. |

Kết quả phase: điền cột "Chốt" khi user trả lời.
