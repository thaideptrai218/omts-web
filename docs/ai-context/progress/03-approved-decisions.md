# 03 — Quyết định đã duyệt

Người duyệt: chủ dự án (Duy Thái) trừ khi ghi khác. Quyết định mới nhất thắng.

## Xác thực, phiên, bảo mật
| Ngày | Quyết định | Hiệu lực | Nguồn |
| --- | --- | --- | --- |
| 14/10/2026 | WEB-AUTH-01 phương án B | Chỉ username, SĐT đã xác minh hoặc email đã xác minh được đăng nhập; Staff lần đầu dùng username + mật khẩu tạm rồi qua cổng xác minh SĐT | OPEN_QUESTIONS |
| 20/10/2026 | Staff email-HOẶC-SĐT | Frontend cho phép một trong hai; backend/SRS vẫn chỉ SĐT nên kích hoạt API bị chặn (WEB-API-04) | OPEN_QUESTIONS |
| 23/10/2026 | BFF Next.js | SID mờ trong cookie HttpOnly; token ở server | WEB-API-01 |
| 24/10/2026 | Redis runtime, RAM chỉ cho test | Không fallback RAM; refresh tắt | WEB-API-01 |
| 24/10/2026 | MSG06 | Chờ backend gửi `user_name` và `time` có cấu trúc; không chữ dự phòng, không parse tiếng Anh | WEB-API-05 |
| 24/10/2026 | C1A, C2A, C3A | Cookie, CSRF, thời hạn (xem `../rules/03`) | WEB-API-07 |
| 24/10/2026 | Cho phép vá phụ thuộc | Next 16.4.3, Vitest 4.1.12 | OPEN_QUESTIONS |
| 25/10/2026 | Keyring nhiều phiên bản | Khóa active ghi mới, khóa cũ đọc | WEB-API-01 |
| 26/10/2026 | Route onboarding | `/onboarding/password`, `/onboarding/contact`, phục hồi bằng phase server | WEB-API-01 cập nhật |
| 26/10/2026 | WEB-API-08 | Giữ phiên BFF hợp lệ; đăng xuất trước khi đổi tài khoản | OPEN_QUESTIONS |
| 27/10/2026 | WEB-API-08b/08c | Một đăng nhập chờ mỗi trình duyệt; G1 cookie điều phối + ledger Redis; bắt buộc Web Locks | OPEN_QUESTIONS |
| 27/10/2026 | WEB-REVIEW-01 | Ưu tiên luồng admin đã có; đăng ký Trader trên Web "chưa" (sau đó G2 đã nối) | OPEN_QUESTIONS |
| 29/10/2026 | G2 | OTP thật, lưu một phần + giữ nháp | `WEB_VERIFICATION_FLOW_PROPOSAL_2026-10-29.md` |

## Vai trò và quyền
| Ngày | Quyết định | Hiệu lực | Nguồn |
| --- | --- | --- | --- |
| 27/10/2026 | WEB-ROLE-01 | Ba vai cố định; Owner chỉ sửa quyền và ngừng/kích hoạt; không Add/Copy/đổi tên; Staff mới không có quyền nghiệp vụ | `WEB_FIXED_ROLES_DECISION_2026-10-27.md` |
| 02/11/2026 | D1 | Backend hai vai (ZONE_MANAGER, ACCOUNTANT); ma trận chỉ đọc; grant chỉ Effective/Revoked, không ngày hiệu lực; `LEGACY-*` chỉ xem | `WEB_BACKEND_21_23_ALIGNMENT_PROPOSAL_2026-10-31.md` |
| 02/11/2026 | D2 | Catalog thông báo theo loại; Web và Mobile đều sửa được Push tùy chọn; loại bắt buộc khóa bật (thay "Push chỉ đọc trên Web") | như trên |
| 02/11/2026 | D3 | Danh mục mua hàng nhóm Seed/Material/Other, `next-code`, `/resume`, địa chỉ/email NCC | như trên |
| 03/11/2026 | Luồng kế toán | Một Owner và một Kế toán mỗi HTX; Kế toán toàn HTX; Manager gửi thẳng Kế toán; Owner chỉ nhận thông báo | `WEB_ACCOUNTING_REQUEST_FLOW_2026-11-03.md` |
| 29/10/2026 | WEB-NOTIFY-02 | Catalog theo loại tài khoản; InApp khóa; Orders cho Staff | OPEN_QUESTIONS |

## HTX, vùng, bè, nhân viên
| Ngày | Quyết định | Hiệu lực | Nguồn |
| --- | --- | --- | --- |
| 28/10/2026 | WEB-ZONE-01/02 | Chỉ Owner tạo/sửa/ngừng/khôi phục vùng; Manager đọc trong phạm vi; lưu vùng trước, thêm giấy phép sau; thiếu hồ sơ hiện "Thiếu hồ sơ"; gia hạn giữ bản cũ | OPEN_QUESTIONS |
| 28/10/2026 | RAFT-DEC-01/02 | Lưu bè và layout trước; chi phí đến từ phiếu INP-03 (chưa biết = `null`, không phải 0); chỉ Owner ghi; quyền View chỉ đọc trong phạm vi; không có phiếu vật tư UC76/77 cho bè | OPEN_QUESTIONS; `WEB_RAFT_IMPLEMENTATION_PLAN.md` |
| 28/10/2026 | WEB-EMP-ACCOUNT-01 | Lưu hồ sơ nhân viên trước, tạo tài khoản sau; username tự sinh; Owner không thấy mật khẩu | OPEN_QUESTIONS |
| 28/10/2026 | WEB-EMP-EMPLOY-01/02 | Ngày nghỉ là hôm nay hoặc trước; nháp chưa lưu phải lưu hoặc bỏ trước khi nghỉ/quay lại | OPEN_QUESTIONS |
| 28/10/2026 | WEB-EMP-LIST-01 | Bộ lọc mặc định "Đang làm việc" | OPEN_QUESTIONS |
| 28/10/2026 | WEB-EMP-ZONE-01 | Hiện vùng đã ngừng gắn với hồ sơ; Owner phải gỡ trước khi lưu | OPEN_QUESTIONS |
| 28/10/2026 | WEB-PROFILE-CONTACT-01 | Cho xác minh liên hệ chưa xác minh sẵn có (OTP rồi Lưu) | OPEN_QUESTIONS |
| 28/10/2026 | WEB-COOP-BANK-01 | Giữ khối ngân hàng HTX chờ BA (Jira muốn chuyển sang PAY-01) | OPEN_QUESTIONS |
| 29/10/2026 | WEB-EMP-ERROR-01 | MSG24 tạm với nút "mở hồ sơ" chỉ bấm | OPEN_QUESTIONS |
| 26/10/2026 | Gỡ liên kết nhân viên | Nút riêng, giữ nháp, dùng version mới khi lưu | OPEN_QUESTIONS |
| 08/11/2026 | P1 | Đồng bộ đầy đủ hồ sơ HTX v2 (xem `01-current-state.md`) | `WEB_BACKEND_PROFILE_SALES_ALIGNMENT_PROPOSAL_2026-11-08.md` |
| 08/11/2026 | Nhãn và menu | Nhãn "Nhân viên thời vụ"; chu kỳ nuôi chuyển dưới Nuôi trồng; căn giữa hồ sơ cá nhân | như trên |

## Vận hành, bán hàng, nhân sự
| Ngày | Quyết định | Hiệu lực | Nguồn |
| --- | --- | --- | --- |
| 30/10/2026 | Hóa đơn chờ | Tải lên hoặc bỏ chọn tệp trước khi hoàn tất/hủy; không tự tải | `WEB_RECEIPT_PENDING_INVOICES_PROPOSAL_2026-10-30.md` |
| 30/10/2026 | Duyệt Trader | Nối duyệt và từ chối (lý do 1–1000 ký tự) | `PROJECT_CONTEXT.md` |
| 31/10/2026 | Phạm vi bán hàng/nhân sự | Yêu cầu mua theo số lồng (sau bị 09/11 thay); thêm công việc/nghỉ phép cá nhân | `WEB_SALES_WORKFORCE_SCOPE_2026-10-31.md` |
| 02/11/2026 | Nhật ký hoạt động Manager | Chỉ đọc theo vùng; **chỉ ghi chú API cần, không tạo** | `WEB_MANAGER_ACTIVITY_PROPOSAL_2026-11-02.md` |
| 02/11/2026 | Đánh dấu thu hoạch Manager | Đánh dấu làn/phần đang/đã thu hoạch trong vùng được gán; không thêm/xóa cấu trúc; chỉ ghi chú hợp đồng | `WEB_MANAGER_HARVEST_MARKING_2026-11-02.md` |
| 02/11/2026 | Chỉ nối API đã có | Thu hoạch → bàn giao → bán/thanh toán chờ backend; GitGuardian để chủ repo | `PROJECT_CONTEXT.md` |
| 02/11/2026 | Demo workforce local | Chạy không cần backend | `PROJECT_CONTEXT.md` |
| 04/11/2026 | Staffing mua hàng | Luồng đủ (`AWAITING_STAFF`): Owner mời, Staff phản hồi, đủ người Owner nhận | `WEB_PURCHASE_STAFFING_2026-11-04.md` |
| 06/11/2026 | Purchasing v2 | Áp luồng API mới: phiếu không có vùng, không tệp hóa đơn, thanh toán theo NCC, hoàn tiền; chọn bằng `NEXT_PUBLIC_OMTS_PURCHASING_CONTRACT=v2` | `WEB_PURCHASING_V2_2026-11-06.md` |
| 08/11/2026 | P2 | Giữ số lồng và luồng cũ, không chuyển kg | `WEB_BACKEND_PROFILE_SALES_ALIGNMENT_PROPOSAL_2026-11-08.md` |
| 09/11/2026 | **Thay P2**: Web theo backend đã merge (kg) | Bỏ UI staffing/ca; Owner accept/decline trực tiếp; khôi phục chỉ sau khi backend staffing merge và xác nhận lại | `WEB_PURCHASE_REQUESTS_KG_CONTRACT_2026-11-09.md` |
| 09/11/2026 | Nối hàng loạt | "Nối hàng loạt mọi màn đã có API; không hỏi lại cho đến khi backend merge xong" | `WEB_SALES_PAYMENTS_LANDING_2026-11-09.md` |

## Chỉ nghiên cứu, chưa duyệt
`DASHBOARD_LOADING_AND_AGGREGATION_PROPOSAL.md` (27/10/2026): mới làm phần frontend (skeleton + lối tắt trước); bảng precompute, job, cache cần BA/backend quyết về độ tươi và phạm vi dữ liệu.
