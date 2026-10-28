# Nâng cấp sidebar và UI quản trị

Ngày28/10/2026. Theo [micro-plan UI1–UI5](../WEB_NAVIGATION_UX_UPGRADE_PLAN.md), tiếp nối274dbe0 trên `feature/OMTS-132-web-foundation`. Phạm vi là thiết kế/điều hướng; nghiệp vụ, capability, nguồn dữ liệu và API gate giữ nguyên.

## Thay đổi nhìn thấy được

Sidebar chuyển từ mảng xanh đậm/icon rail mặc định sang nền sáng, mặc định mở, mục đang chọn xanh biển. Nhóm Bảng điều hành, Nuôi trồng, Nhân sự/phân quyền, HTX và Hệ thống được lọc theo capability như cũ. Không thêm menu chết hoặc quyền mới. Tên cá nhân, role và phạm vi tách thành các dòng ở chân sidebar, có tên đầy đủ cho screen reader/tooltip; không thêm topnav tài khoản hoặc “không gian làm việc”.

Nút Thu gọn/Mở rộng/Giữ menu mở mô tả đúng hành động. Rail80px; cột mở264px. Khi compact, hover mở sau160ms, rời280ms mới đóng; quay lại hủy đóng, focus bàn phím giữ mở. Cột và nhãn dùng cùng trạng thái, không còn opacity CSS hover độc lập. Icon có ô cố định; không phủ nội dung. Có reduced-motion. Chế độ giữ mở chỉ nằm trong state của shell, không thêm storage/session policy.

Drawer di động dùng thiết kế sáng cùng hệ thống, giữ dialog/Escape/focus/scroll lock. Resize sang desktop tự đóng drawer; JS và CSS dùng cùng breakpoint64rem. Nút điều hướng tối thiểu44px; giảm khoảng trống nhóm để menu dễ vừa màn laptop768px cao.

Header quản trị dùng chung bỏ viền xanh dày/gradient/khung card ngoài, làm rõ tiêu đề và hành động. Nút phụ nhẹ hơn, có phản hồi nhấn và reduced-motion. Dashboard đưa số liệu bè lên trước, có thanh tỷ lệ từ counts đã có và đường tới danh sách bè; shortcut chuyển thành danh sách dễ quét mắt. Chart nhân sự co/wrap theo không gian; giữ các nhãn số, số liệu, empty/error/loading và mọi đích cũ. Không thêm doanh thu, sản lượng hoặc tỷ lệ không có nguồn. Registry0 không vẽ tỷ lệ giả/NaN.

## Cấu trúc code

`app-shell.tsx` giữ layout/drawer; `app-navigation.tsx` giữ inventory route và lọc capability; `sidebar-account.tsx` giữ identity/logout; `use-sidebar-expansion.ts` điều khiển intent/focus/pin; CSS Module giữ stylesheet riêng. DashboardShortcuts tách phần hiển thị khỏi phần gọi service. Không thay service/repository, BFF, auth/token, SSR/cache policy hoặc quyền Owner/Manager.

## Tự review và lỗi thực tế

### NAV-REV-01: CSS Module mất binding trong bản production

Build và unit test đạt nhưng browser ban đầu hiện shell không có định dạng. DOM: aside/main không có class; CSS bundle lại có `.desktopSidebar` global. Rule `*.css` trong Next config cho mọi file đi qua Tailwind loader và `as:*.css`, khiến CSS Module thành đầu ra `.module.css.css` và mất bảng export class. Đây là lỗi P1 của bản local đang phát triển, đã sửa trước xuất bản.

Giới hạn loader vào `globals.css`, để Next xử lý `.module.css` bằng cơ chế tích hợp. Build lại có class scoped `E5J3NG_desktopSidebar`, sidebar/main đặt đúng cột trên browser. Không thêm dependency hoặc đổi sang Webpack. Đã đọc tài liệu CSS/Turbopack đi kèm Next16.4.3 và README loader trong node_modules.

Thêm helper `check-sidebar-styles.mjs`: kiểm selector gốc scoped và binding tương ứng trong client JavaScript đã build.5 test gồm fixture mất scope/thiếu CSS/thiếu binding và hai cú pháp selector hợp lệ. `test:session-pages` gọi helper sau build; CI vốn chạy script này nên không cần sửa workflow. Test này bắt kiểu hỏng export đã gặp, không chứng minh mọi CSS/contrast/browser behavior.

### NAV-REV-02: Drawer còn khóa trang khi chuyển về desktop

Rà code cũ thấy CSS có thể ẩn drawer ở breakpoint desktop trong khi dialog còn open và scroll lock vẫn tồn tại. Đã thêm listener media query đóng state drawer và cleanup listener; unit test mở→resize→kiểm dialog/lock đã đạt. Native browser360→1024 xác nhận0 dialog mở, khóa cuộn false. Không chỉ ẩn drawer bằng CSS.

Typecheck từng bắt TS2769 vì dùng option Playwright `exact` trong Testing Library; đã sửa đúng API, không nới compiler. Unit test CSS import được mô phỏng nên không thấy NAV-REV-01; do đó browser/compiled-asset check là bắt buộc trong bằng chứng đợt này.

## Kết quả kiểm

| Kiểm | Kết quả |
| --- | --- |
| Shell + dashboard + scroll lock + CSS artifact helper | 6 file,37 test đạt |
| Full Vitest | 211 file đạt/4 file skip;2.455 pass/31 Redis skip,187,34s |
| Lint/typecheck | Đạt, không hạ rule/strictness |
| Production build cuối |20/20 trang; CSS Module và Tailwind cùng hoạt động |
| Built-product assertions cuối |30 đạt:28 HTTP và2 CSS–JS binding; không gọi .NET thật |
| Browser desktop |1440 và1024: mở264/compact80; không tràn ngang; pointer vào rail mở đủ nhãn opacity1; rời tự đóng; Tab vào link giữ mở; main không bị sidebar phủ |
| Browser mobile |360: drawer sáng, tên/role/vùng, mục active rõ; desktop sidebar display:none, scrollWidth≤viewport. Resize1024 đóng drawer/giải phóng lock |

Full Vitest kiểm code chức năng và helper sau bản vá loader. Sau đó chỉ tinh chỉnh CSS mật độ dọc và câu kết quả CLI; build/assertions/browser kiểm lại bản cuối. Không dùng jsdom thay bằng chứng CSS thật hoặc tuyên bố60fps trên mọi máy.31 Redis skip vẫn theo cấu hình endpoint test riêng; đợt này không chạy Redis/API/TLS thật.

CI của commit nền274dbe0 đã kiểm: build-test/Gitleaks/pr-title SUCCESS; GitGuardian FAILURE theo incident lịch sử, tiếp tục để sau. Không tự áp kết quả này cho commit UI mới. Không merge develop, đổi trạng thái Jira/SRS hoặc sửa backend.

## Audit thiết kế và giới hạn

Hallmark static app scope đã chạy, không chạy renderer riêng vì browser được kiểm bằng CUA. Scanner còn5 FAIL cơ học/3 WARN: animation grid track, thiếu stamp ở hai stylesheet, khóa cuộn `overflow:hidden` và hai sticky top0; cảnh báo palette/scrollbar. Hai sticky thuộc breakpoint loại trừ nhau, đã kiểm browser. Giữ khóa cuộn đã có hồi quy; giữ chuyển cột có reduced-motion theo yêu cầu menu mượt và không phủ nội dung. Không đổi theme hoặc gắn stamp giả để làm scanner xanh. Không tuyên bố Hallmark render/gates đều đạt.

Ảnh trước/sau và log nằm `.hallmark/`, ignored. Bài124 local giải thích từ vấn đề tới code và lỗi thực tế. README/reviewer guide tiếng Anh cập nhật. API/refresh vẫn tắt; MSG06/tên MSG24/GitGuardian giữ chờ. Không phát hiện lỗi chức năng P1/P2 còn mở trong phạm vi đã kiểm; đây không phải chứng minh toàn hệ thống đã hoàn tất.

Ảnh bàn giao: `sidebar-dashboard-before.png`, `sidebar-dashboard-after.png`, `sidebar-mobile-after.png`. Build cuối1024×768: vùng nav cao493px/scrollHeight493px, không cần cuộn menu cho dataset Owner hiện tại.360px Escape trả focus về Menu và khóa cuộn false.

Trong lúc chốt, working tree có thêm chỉnh sửa API vùng/auth ngoài phạm vi UI, gồm endpoint/request và các adapter/schema. Các file đó được giữ nguyên, không stage chung hoặc dùng kết quả kiểm UI để nhận là đã review. Bản production độc lập3107 và các kiểm trong báo cáo dành cho lát UI trên nền274dbe0. Chỉ xuất bản các file UI/tooling/tài liệu đã chọn; không tuyên bố toàn bộ working tree đồng thời đã xanh.
