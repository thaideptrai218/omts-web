# Nghiên cứu: vai trò, màn hình, thiết lập (20/11/2026)

Nguồn: đọc code web `D:\Đồ_án\omts-web`, backend `D:\Đồ_án\omts-backend`, md quyết định 27/10, 31/10, 02/11, 19/11.

## 1. Mô hình quyền thực tế
- Backend: `FixedRoles.cs:33-86` (ma trận hằng số), `PermissionFunctions.cs:16-107` (mã + action), `AccountAccess.cs:32-86` (Owner bypass; ZoneId null = mọi vùng; mã CoopWide = mọi vùng). Endpoint Owner-only dùng `[RequireCooperativeOwner]` (kiểm SubjectType, không theo vai trò).
- `GET /api/me/permissions` → `Functions[]` + `Grants[]`. `GET /api/roles` có ma trận, **không có số người dùng**. `POST /api/accounts` **nhận grants inline**. **Không có** luật "1 Kế toán".
- Web: quyền đi qua `mapPermissionsResponse` → `collectFunctionPermissions` → `useApiWorkspace()`. Web **không bao giờ** kiểm "Quản lý vùng"/"Kế toán" — chỉ kiểm `subjectType === "CooperativeOwner"` và mã chức năng. Nhãn vai trò chỉ để hiển thị.

## 2. Lỗi web làm Manager/Kế toán "mất màn"
| Lỗi | Vị trí | Hậu quả |
|---|---|---|
| Thiếu 7 mã trong catalog | `features/access/domain/backend-function-catalog.ts:15-44`, lọc ở `collect-function-permissions.ts:51-52` | Manager không thấy Kế hoạch thu hoạch, Đơn hàng, Xuất dùng vật tư, Hủy sản phẩm; Kế toán không thấy Sổ quỹ, Thiết lập sổ quỹ |
| PURCHASE_REQUESTS thiếu action Review | cùng catalog | — |
| Nhãn `PAYROLLS` ≠ `PAYROLL` | `shared/presentation/actor-label.ts:26` | Nhãn "Kế toán" sai |
| `/employees` cần LABOR_WORKERS + PAYROLL | shell | Manager (có LABOR_WORKERS VCE) không vào được Nhân viên |
| Không có fixture Kế toán mock | `mock-auth-fixtures.ts`, `mock-identities.ts` | Không demo Kế toán ở mock |
| `/audit`, `/cooperative/certifications` không bọc `ApiPage` | — | Có thể crash ở mock (suy luận, chưa chạy) |

## 3. Ma trận hiện tại (rút gọn) — Manager (QLV) / Kế toán (KT)
| Nhóm | QLV | KT |
|---|---|---|
| Chu kỳ, nhật ký, nước, thu hoạch, lô, xuất dùng, hủy SP | VCED(X) | — / VX |
| Kế hoạch thu hoạch | **V** | — |
| NCC, phiếu nhập | VCEDX | VX |
| Thanh toán NCC, thu nợ KH, công nợ KH | — | đủ |
| Khách hàng | VCEDX | VCEX |
| Yêu cầu mua, khiếu nại | **V** | — |
| Đơn hàng / Hóa đơn / Trả hàng | VCE / VCX / VC | VX / VX / — |
| Nhân viên, giao việc, chấm công | VCE, VCED, VCE | V, —, — |
| Đơn giá, bảng lương | — | VCE, VX |
| Báo cáo bán, sổ quỹ, thiết lập quỹ | — | VX, VCEDX, VE |
| Dashboard tiles | — | — (KT vào qua SALES_REPORTS toàn vùng) |

## 4. Việc hằng ngày Manager cần nhưng backend chỉ cho Owner
| Việc | Endpoint | Đề xuất |
|---|---|---|
| Lập/sửa kế hoạch ngày công, người phụ trách | `WorkDayPlansController` POST/PUT/responsibles | **Mở cho Manager trong vùng** |
| Sửa chấm công, duyệt nghỉ | `WorkforceController:117,124,141` | Mở cho Manager trong vùng; Owner vẫn được |
| Lập kế hoạch thu hoạch | HARVEST_PLANS C/E | Mở cho Manager (vùng mình) |
| Nhận/từ chối yêu cầu mua, báo thu xong | `PurchaseRequestsController` | Hỏi: Owner duyệt hay Manager? |
| Tạo/sửa bè trong vùng | `RaftsController` | Hỏi (SRS cũ: Owner giữ cấu trúc) |
| Hủy đơn/hóa đơn, sửa hóa đơn | Sales controllers | Giữ Owner (nhạy cảm tiền) |
| Ngưỡng nước, danh mục, thiết lập | nhiều | Giữ Owner |
| Chốt lương | `PayrollsController` | Giữ Owner; KT lập bảng? (hỏi) |

## 5. Thiết lập & tài khoản hiện tại — điểm đau
1. Hub `/settings` (`settings/settings-page.tsx`) 5 panel tại chỗ (sổ quỹ, vật tư, sản phẩm, khách hàng, thu hoạch) + link: Hồ sơ HTX, Ngân hàng, Chứng nhận, Nhật ký, Tài khoản, Vai trò. Thiếu: Thiết lập nhân sự, Kỳ lương, Chấm công, Loại công việc (ở menu Nhân sự), Ngưỡng nước (trong màn nước).
2. Tạo 1 Manager = 3 màn không liên kết (Nhân viên→tab Tài khoản; Tài khoản→dialog→toggle→Thêm phân quyền; Vai trò→ma trận). ~10+ click, phải F5.
3. Danh sách tài khoản chỉ có username, tên, SĐT, trạng thái.
4. Reset mật khẩu bởi Owner: backend có `POST api/accounts/{id}/reset-password`, BFF/UI API chưa nối (chỉ có ở mock).
5. Mock `account-management/*`, `role-management/*` làm nhiều hơn bản API (tạo TK, reset MK, preview quyền, sửa ma trận) → demo khác thật.
6. URL kép: `/access/*`=`/workspace/accounts|roles`, `/employees`=`/workspace/employees`, `/farming/zones|rafts`=`/workspace/*`.
7. "Vùng làm việc" của nhân viên ≠ "phân quyền vùng" của tài khoản — 2 khái niệm cùng tên vùng.
8. Code chết: `/system/cooperatives/new` (API luôn từ chối), BFF `/api/role-impact` không dùng.

<a id="cau-hoi"></a>
## Câu hỏi chưa giải quyết
1. Duyệt nguyên tắc "Manager vận hành, Owner giám sát + cấu hình, KT tiền/chứng từ"?
2. Phase 5 — mở cho Manager (trong vùng) việc nào: (a) kế hoạch ngày công, (b) sửa chấm công + duyệt nghỉ, (c) lập kế hoạch thu hoạch, (d) nhận/từ chối yêu cầu mua, (e) tạo/sửa bè?
3. Kế toán thứ hai: cảnh báo (web) hay chặn (backend)? Mặc định: cảnh báo.
4. Owner đăng nhập có thấy "Bàn làm việc vùng" như Manager không, hay chỉ dashboard tổng?
5. Số người dùng mỗi vai trò trên tab Vai trò: tính ở web (gọi danh sách grant) hay thêm trường backend? Mặc định: tính ở web.
6. Có cần "Sao chép người dùng" và "giới hạn giờ truy cập"? Mặc định: sao chép có, giờ truy cập không.
7. Gộp "vùng làm việc" (nhân viên) với "phân quyền vùng" (tài khoản) khi tạo Manager? Mặc định: khi cấp Manager vùng X, gợi ý thêm X vào vùng làm việc.
