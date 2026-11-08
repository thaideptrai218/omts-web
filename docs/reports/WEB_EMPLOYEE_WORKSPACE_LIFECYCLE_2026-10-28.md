# Nhân viên — tải và thử lại theo đúng tài khoản

> Cập nhật khi review xuất bản 28/10: người dùng yêu cầu commit/push phần Nghỉ việc/Đi làm lại. Phần lifecycle này được đưa cùng commit vì cùng component và đã có kiểm hồi quy trên source tách. Các ghi nhận giữ local bên dưới là snapshot trước yêu cầu đó. Kết quả cuối gồm lifecycle + employment ở [báo cáo review mới](WEB_EMPLOYEE_EMPLOYMENT_ACTIONS_2026-10-28.md); không gồm profile/notification/Dialog khác, không bật API/refresh hoặc merge develop.

Ngày 28/10/2026, Asia/Saigon. Làm tiếp sau khi đã commit/push phần danh sách bằng `19c47bce0998f4fafc3e5914adc6d30f6d5b2fa7`, trên nhánh `feature/OMTS-132-web-foundation`. Phần mới này đang local; chưa merge develop. Nguồn là OMTS-203, parent OMTS-119 và quy tắc Owner/MSG02/MSG19 đã có; không mở rộng nghiệp vụ hoặc bật API/refresh.

## Vì sao cần làm tiếp phần này

Danh sách đã có filter, nhưng component cha còn hai đường tải: effect cho lần đầu và hàm async riêng cho nút Tải lại. Effect chỉ phụ thuộc canManage, nên A→B đều có quyền vẫn giữ cùng state và không tải lại. Hàm retry không có cleanup; kết quả cũ có thể thay dữ liệu hoặc phát MSG19 sau khi giao diện cũ đã rời. Đây là vấn đề vòng đời UI, không phải đề xuất đổi session/cookie, cache hoặc quyền.

## Micro-task và cách sửa

1. **EMP-LIFE-01 — Test đổi tài khoản.** Test dùng accountId A/B giả trong harness, không thêm tài khoản/actor/mock seed vào sản phẩm. Lệnh `npm test -- src/features/employee-management/components/employee-workspace-lifecycle.test.tsx` trước sửa có2 fail: mong load được gọi2 lần nhưng chỉ1, và hàng A vẫn hiện khi B đang chờ. Không có lỗi HTTP thực hoặc DB trong test này.
2. **EMP-LIFE-02 — Workspace theo accountId.** Giữ useAuth và kiểm quyền ở component ngoài. Component con giữ dữ liệu, filter/editor/follow-up và request theo key accountId. Đổi account, logout hoặc mất quyền unmount view cũ; view mới bắt đầu bằng skeleton. Không đổi hasEffectivePermission, menu hoặc actor được phép thao tác.
3. **EMP-LIFE-02b — Một đường đọc cho initial/retry.** Nút Tải lại chỉ đổi reload counter và trạng thái chờ. Cùng effect thực hiện đọc trong try/catch/finally; mỗi lượt có isActive riêng, cleanup bỏ quyền cập nhật UI khi rời lượt đó. Dữ liệu, lỗi và MSG19 đều phải qua kiểm current này. Không tự abort/rollback service hoặc retry mutation. Lỗi service ném đồng bộ cũng đi vào cùng trạng thái lỗi có thể tải lại.
4. **EMP-LIFE-02c — MSG02 đúng ngữ cảnh.** Active result forbidden trước đây thành thông báo lỗi kết nối có nút retry, khác yêu cầu OMTS-203. Test mới trước sửa fail do không có heading Không có quyền quản lý nhân viên. Nay dùng PermissionDenied hiện có và MSG02, không có danh sách hoặc nút retry kết nối. Lỗi mạng vẫn thử lại được; MSG19 của request hiện hành vẫn được phát như cũ. Test retry dùng rejected Promise cho lỗi mạng, không đồng nhất forbidden với lỗi tạm thời.
5. **EMP-LIFE-03 — Regression và tự review.**12 test mới kiểm A→B khi A chưa tải/đã tải, retry A trả success/expiry/reject sau B, unmount lúc retry, mất/khôi phục quyền, logout/login cùng account, MSG19/MSG02 hiện hành, sync throw rồi retry và Strict Mode cleanup. Cùng file27 test editor/unlink đạt39/39 sau sửa. Các ca retry bổ sung được kiểm sau sửa; chỉ các ca có RED đã chạy mới được mô tả là tái hiện lỗi trước sửa.

## Ranh giới cần nói rõ

Key/reset chỉ bảo vệ vòng đời hiển thị ở browser. Chúng không chứng minh backend trả đúng HTX, hủy request đang chạy, hoàn tác ghi hoặc thay thế kiểm quyền tại DAL/backend. Response workspace hiện không có accountId để kiểm chéo như hồ sơ cá nhân, nên không bịa field đó trong contract. API/QA, MSG06 và tên MSG24 vẫn chờ các bước riêng.

Tài khoản giữ cùng accountId không bị reset chỉ vì profile/permission object được tạo lại. Nếu quyền quản lý thực sự mất, wrapper ngừng render child; khi được phép trở lại, child mới tải lại. Không thêm subscription, storage, TTL hoặc auto-refresh.

## Kiểm chứng phần mới

Đã chạy12 test lifecycle và27 test luồng editor/unlink, **39/39 pass**,18,03 giây. Kiểm source tách trên nền19c47bc cộng đúng2 file phần lifecycle, không gồm các sửa đổi hồ sơ/thông báo/Dialog local. Hash2 file source đã đối chiếu với bản kiểm trước khi kết thúc; các bước kiểm chạy tuần tự.

| Kiểm source lifecycle cuối | Kết quả |
| --- | --- |
| Full Vitest | **2.116 pass/31 Redis skip**,174 file pass/4 skip;99,29 giây |
| Lint/typecheck | Đạt |
| Build | Đạt18/18 trang, không thêm route |
| HTTP regression | Đạt24 assertions |
| Diff, liên kết và learning ignore | Đã kiểm; bài114 không đưa lên Git |

Không có lỗi mới trong lượt kiểm phần lifecycle. Finding timeout subprocess của bước review danh sách đã ghi trong báo cáo danh sách, không chuyển thành finding Redis thật hoặc bỏ test ở đây.31 skip vẫn là các ca Redis thật chưa chạy. Kết quả2.116 thuộc source local, không phải CI của19c47bc.

Không thay bố cục/CSS hoặc endpoint, vì vậy ảnh360/1024 ở báo cáo danh sách là bằng chứng bố cục trước đó. Chưa giả lập nhiều tài khoản/response forbidden qua browser native trong lượt lifecycle; các nhánh đó được kiểm bằng component harness. Bài114 giữ local trong docs/learning, không đưa vào Git.

## CI của phần danh sách đã push

CI đúng head19c47bc: [build-test](https://github.com/thaideptrai218/omts-web/actions/runs/40630880828/job/122626700228), [Gitleaks](https://github.com/thaideptrai218/omts-web/actions/runs/40630880891/job/122626700960) và [tên PR](https://github.com/thaideptrai218/omts-web/actions/runs/40630878031/job/122626692689) SUCCESS. Đã đọc đầy đủ log build-test, không bị cắt: Linux2.104 test pass/31 Redis skip,173 file pass/4 skip, build18/18 và24 HTTP assertions.

GitGuardian check122626712248 vẫn FAILURE với7 vị trí thuộc6 incident lịch sử; không có dòng phát hiện trỏ vào19c47bc. Giữ quyết định để sau, không thay scanner/history hoặc tự phân loại incident. PR #3 vẫn draft/open, chưa merge develop. Kết quả CI này chỉ áp dụng phần danh sách đã push, không phải phần lifecycle local.

Tự đánh giá: EMP-LIFE-01–03 hoàn tất trong phạm vi đọc/retry UI mock, chưa hoàn tất auth/API/QA hay toàn LAB-01. Giữ phần mới local để review riêng, chưa commit/push phần lifecycle trong lượt này. Bản xem thử3105 được dựng lại từ source kiểm để tiếp tục xem luồng bình thường;3000 không bị stop/rebuild. Không thêm nút hay panel thử account/response giả vào sản phẩm.
