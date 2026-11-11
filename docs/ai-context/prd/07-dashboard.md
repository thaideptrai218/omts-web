# 07 — Dashboard

## Chế độ mock (`DashboardExperience`, cần `workspace.overview.view`)
Số liệu (`DashboardSnapshot`, `dashboard/domain/dashboard.ts`), tải qua `dashboardService.load(access)` với độ trễ mock 350ms; có nút "Làm mới số liệu" và banner lỗi "Thử lại":
- `farming?`: `activeRaftCount`, `discontinuedRaftCount`, `openCycleCount` — chỉ hiện khi có `cooperative.profile.manage` và `farming.rafts.view`; panel "Tình hình bè nuôi".
- `workforce`: `employedCount`, `leftCount` (panel + thanh phân bố).
- `access`: `activeInternalAccountCount`, `lockedInternalAccountCount`, `roleInUseCount`, `zoneInUseCount`; cảnh báo "Tài khoản cần đối chiếu" khi có tài khoản khóa.

Lối tắt "Công việc của bạn":
| Lối tắt | Đích | Khóa |
| --- | --- | --- |
| Bè nuôi | `/farming/rafts` | `farming.rafts.view` |
| Nhân viên thời vụ | `/employees` | `cooperative.employees.manage` |
| Tài khoản nhân viên nội bộ | `/access/accounts` | `access.accounts.manage` |
| Vai trò & quyền | `/access/roles` | `access.roles.manage` |
| Hồ sơ hợp tác xã | `/cooperative/profile` | `cooperative.profile.manage` |

## Chế độ API (`ApiWorkspaceHome`)
- **SysAdmin**: tiêu đề "Quản trị hệ thống", một liên kết tới `/system/accounts`.
- **Owner**: `OwnerOverview` (`api-workspace/owner-overview.tsx`). **Toàn bộ số liệu là dữ liệu mẫu hard-code** và có banner "Bản mẫu báo cáo tổng hợp… chưa lấy từ báo cáo thực tế… API tổng hợp chưa được nối". Gồm: bộ lọc vùng (Ngọc Vừng, Minh Châu) + kỳ; tile Doanh thu, Công nợ khách hàng, Cảnh báo chất lượng nước (ngưỡng 28–34‰); biểu đồ doanh thu theo tuần; "Việc chờ xử lý" (yêu cầu mua chờ phản hồi, phiếu nhập cần theo dõi, yêu cầu nhân sự, công nợ NCC) liên kết `purchase-requests`, `purchase-receipts`, `workforce`, `supplier-debts`; "Lô thu hoạch đang mở" (mẫu) liên kết `/operations/harvest`.
- **Staff / Trader**: hai danh sách liên kết "Danh mục quản lý" (resource) và "Công việc" (operation) đã lọc theo quyền; rỗng thì báo "chưa được cấp chức năng nghiệp vụ".
- Backend có 5 mã `DASHBOARD_*` nhưng chưa có tile UI thật nào dùng.

## Quy tắc hiển thị
Tiêu đề và lối tắt hiện trước khi số liệu tải xong; skeleton chỉ ở ô số; không hiện 0 khi thiếu dữ liệu. Đề xuất precompute/job/cache còn chờ quyết định BA/backend (`docs/decisions/DASHBOARD_LOADING_AND_AGGREGATION_PROPOSAL.md`).
