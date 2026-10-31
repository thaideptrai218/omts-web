# Rà soát luồng API theo role — 30/10/2026

Phạm vi là những chức năng Web đã nối API, theo yêu cầu kiểm tra độ ổn định cho tester. Runtime chính Weblocalhost3002/backenddevelop8080; runtime đầy đủ endpoint mới Web127.0.0.1:3003/backendZalodc00b2f8081, database riêng. Không merge hoặc sửa backend. Không coi endpoint LAB cũ, module mock hoặc kế hoạch SRSv2 là luồng đã tích hợp.

## Lỗi đã sửa

1. Generic danh mục trước đây trả `uncertain=false` khi mutation nhận401, dù BFF có thể phát hiện phiên đổi sau khi backend đã commit. Nay write401/network/5xx/invalid-success khóa Save để đối chiếu; không tự retry. GET lỗi không bị mô tả thành một lượt ghi chưa rõ kết quả. Thông báo401 có hướng dẫn đăng nhập lại và đối chiếu trước lượt mới.
2. BFF generic đã kiểm schema nhưng chưa đối chiếu ID ở detail/update/status response. Nay ID khác request bị502; không đổi editor sang hồ sơ khác hoặc báo thành công cho response nhầm ID.
3. Bộ chọn vùng trong màn bè trước chỉ lấy100 vùng đầu và nuốt lỗi lookup. Nay dùng loadOptions đọc đủ các trang trong scope, hiển thị lỗi và explicit retry; response về sau abort bị bỏ. Nếu vùng hiện tại không còn trong danh mục mới thì chọn một vùng thực sự có trong response, không tự tạo scope.

## Ma trận role đã kiểm

| Role / tài khoản | Kiểm đọc và quyền trên cả hai runtime | Ghi thật trong database QA8081 |
| --- | --- | --- |
| Owner /owner | Hồ sơ/thông báo, HTX, nhân viên, account/roles/catalog/grants/impact, nhà cung cấp/vật tư/chứng nhận, vùng/bè/map, giấy tờ/condition, receipt/payment/water; inbox/requests chỉ trên branch runtime | INP/ENV lifecycle/files/export; employee create/edit/bank/status/link/unlink/follow-up; account update/lock/unlock; revoke QAgrant; HTX save/logo/conflict; own profile/name/notifications; G2 workflow |
| Manager /quanlyvung1 | ChỉDEMO-01; đọc danh mục/vật tư/receipt/water/raft own zone; foreign-zone/account/role/employee/HTX/license/payment bị chặn | Tạo QA supplier/complete receipt/partial return ởDEMO-01; manual confirm/correct/void water |
| Manager /quanlyvung2 | ChỉDEMO-02; cùng các boundary ở vùng tương ứng | Luồng ghi tương tự tạiDEMO-02 |
| Accountant /ketoan | Danh mục/vật tư/receipt View, payment/debt, vùng/bè theo backend lookup; không có Owner admin hoặc water | Ghi thanh toán thật cho các receipt do từng Manager lập, kiểm số nợ về0 sau partial return |
| Trader /thuonglai1 | Hồ sơ/thông báo riêng; inbox branch; không đọc/ghi vận hành hoặc admin | Hồ sơ/name/notifications theo catalog; G2 kiểm bằng Trader QA riêng, không thay seed credentials |
| Anonymous | APIprivate401; dashboard có redirectlogin (có thể là200 streamed redirect của Next) | Không được ghi nghiệp vụ |

Staff là subject type nền của các tài khoản Manager/Accountant. Role “Nhân viên” thứ ba, SystemAdministrator và QR viewer chưa có contract/runtime QA phù hợp; không gán quyền tạm hoặc dựng actor mới. Staff onboarding emailORphone vẫn giữ gate chờ alignment. Việc tạo Staff qua raw backend dưới đây chỉ chuẩn bị fixture kiểm thử, không mở chức năng create/reset đang chờ trong product Web.

## Bằng chứng chạy mới

- **358 checks HTTP**:179/runtime với5seed accounts +anonymous; profile/session/preferences, owner-only reads, map scope, files/condition/licenses, INP/ENV/debts, branch modules, HTML entry và logout. Script đã commit `scripts/test-api-role-matrix.mjs`, lệnh `npm run test:api-roles`; password lấy từenv. Report ignored `role-matrix-develop-final.json` /`role-matrix-zalo-final.json`.
- **262files /2868tests PASS /0skip /0fail**, Redis integration dùng DB2 riêng. JSON report `docs/learning/role-audit-full-tests.json`; không chỉ dựa vào CI48Redis skip.7 test hồi quy mới thuộc các lỗi trên; targeted APIworkspace28testsPASS.
- Lint/typecheck/build41routes và61 built-product HTTP/style assertions PASS. Không mở rộng test sau khi đã đủ bằng chứng; package chỉ thêm alias test:api-roles, không đổi dependency.

CI ởb68e48a phát hiện race trong category-filters.test: chờ mock list được gọi không bảo đảm React đã render nút phân trang, Linuxparallel đôi lúc còn skeleton. Sửa test chờ `findByRole` nútSau trong DOM trước click, không tăng timeout/sleep hoặc thay production để né. Bộ test local full nêu trên hoàn tất trước chỉnh đồng bộ test này; UI/API production không đổi sau đó. Kiểm lại APIworkspace bằng4workers và CI mới.
- Fresh INP: draft/update/stale/invoice/private bytes/complete/seed lot/partial return/copy/cancel/raft costs/export, payments/debt/overpayment/dedup/detach/allocation. Fresh ENV: manual/draft/confirm/correction/stale/void/photo/OCR/history/chart/threshold snapshot/export/editing presence. Fake OCR của backend, không nhận là OCR production.
- FARM: multi-zone license/type sniff/private file/update without replacement/stale/renewal/as-of/replaced guards; raft photo/layoutv2/dated condition/no cycle/cost unknown. QA dates được lấy theo ngày Việt Nam, không dùng ngày29/10 cố định để đòi layoutv2 ở một ngày trước khi đổi layout.
- Employee: create/duplicate/edit/bank/stale/status/date/list-zone/actor privacy. Lần seed không có account trống nên không mô phỏng link. Sau đó tạo fixture Staff riêng qua raw backend rồi kiểm link/picker/end/reinstate/follow-up/unlink/save tiếp thật qua BFF. Account fixture cũng qua update/lock/unlock; login account bị khóa trả403 (423 chỉ temporary login-rate lock).
- HTX save/conflict/logo/privatebytes/delete/CSRF/actor boundary; khôi phục fields/logo sau QA. Profile Owner/Manager/Accountant/Trader save name/stale/preferences/push-mandatory-eligibility/CSRF, khôi phục tên và preferencecells.
- G2: SMS registration→explicit create→no autologin→login, contactproof chỉ áp sau Save/Cancel, name+contact version, cross-context proof refusal; email-password→G1rotation→oldcookie401; generic recovery/wrong+correctOTP/reset/loginverifiedemail. Tạo Trader QA riêng, đưa mật khẩu QA về demo default; không đổi seed password/contact.

Evidence raw HTTP chạy mới dùng ignored `audit-*-live.mjs` và `*-role-audit-evidence.json`. Các luồng inbox/Trader approval đã có HTTP write evidence cùng ngày trong báo cáo riêng; ma trận lượt này đọc lại và full suite kiểm hồi quy. Không lặp thêm việc duyệt các pending request đã chuẩn bị cho tester chỉ để tăng số lần test.

## Dữ liệu và giới hạn

Không ghi nghiệp vụ vào DB8080 trong đợt này. DB8081 giữ audit/files/QA receipts/returns/payments/registrations. QAwater void, QAsuppliers/QAzone/QArafts discontinued; QAemployeesLeft. Dedicated Stafffixture mới được khóa và grantsrevoked; secret temporary của setup chỉ giữ trong RAM, không in/ghi evidence/đưa vào Owner UI. Các seed account/grant/credential/contact được giữ. Tất cả phiên HTTP do scripts tạo đã logout; signup/contact/nameG2 account là QA mới.

Chưa có lượt browser360/1024 mới cho các sửa đổi; HTTP/HTML/component tests không phải browserE2E. Không tuyên bố fullSRS hoàn thành hoặc mọi race đã được backend giải quyết. Các blocker vẫn có: Staff emailORphone; secret-free create/reset; fixed roles/newgrant contract; certificate indexdelete; Manager license; bankHTX; các module API v2. Backend Trader approval chưa có expectedversion/request-generation ID, như báo cáo trước.

**Handoff tester:** ưu tiên127.0.0.1:3003 cho phạm vi đã nối đầy đủ endpoint mới;3002 dùng đối chiếu develop và sẽ404 cho inbox/Traderrequests. Dùng QA-named records và luồng trong REVIEW_GUIDE, không resetdatabase. PR vẫn draft/chưa merge; GitGuardian lịch sử xử lý sau theo quyết định hiện có.
