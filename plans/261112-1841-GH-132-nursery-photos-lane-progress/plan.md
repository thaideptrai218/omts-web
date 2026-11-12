---
title: "Ươm giống, ảnh từng bước, % tiến độ làn (Nuôi trồng)"
description: "Thêm bước ươm bắt buộc, ảnh 1-3 ở các bước quan trọng, % thả/thu từng làn, sơ đồ làn cột ngang, ảnh lưu local, đơn mua demo để test thu hoạch"
status: in-progress
priority: P1
effort: medium
branch: feature/OMTS-132-web-login-farming
tags: [farming, nursery, photos]
branch_web: feature/OMTS-132-web-login-farming
branch_backend: feature/OMTS-132-nursery (từ feature/OMTS-132-raft-lanes)
created: 2026-11-12
---

# Kế hoạch: ươm giống, ảnh từng bước, % tiến độ làn

**Nguồn chốt:** `docs/reports/FARMING_NURSERY_STEP_SPEC_2026-11-12.md` (mục 2-7, 10.1-10.6) là đặc tả duy nhất; file này chỉ chia module và thứ tự. Chủ dự án đã chốt mọi quyết định nghiệp vụ. PM chưa duyệt phần SRS: làm trên nhánh riêng, không vào `develop`.

## Quyết định mới ngày 12/11 (bổ sung)
- **Ảnh lưu local tạm thời** (đĩa máy chủ qua `IFileStorage` + `LocalFilesController` đã có), **cloud làm sau**: chỉ dùng interface, không gắn cứng đường dẫn đĩa; đổi cấu hình `StorageOptions` là sang cloud.
- **Thu hoạch gắn yêu cầu mua là quy tắc của đồng đội, giữ nguyên.** Chỉ cần **tạo sẵn một yêu cầu mua đã được chấp nhận trong DB demo** để chủ test thu hoạch (seed demo), không sửa luồng bán hàng.
- Mô hình giao việc: **Codex (GPT-6.1 sol, reasoning HIGH) làm UI web**; **agent Claude làm backend, Docker, tích hợp, tài liệu** (Codex trong sandbox không chạy được Docker và không gọi được backend). Codex hết hạn mức giữa chừng thì **Claude tiếp quản từ nhật ký** (xem "Quy trình tiếp quản").

## Module và giao việc
| Module | Phase | Người làm | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| M0 Nền tảng: ảnh local, demo đơn mua | [phase-01](phase-01-foundation-photos-demo-request.md) | Claude (backend) | không | pending |
| B1 API ươm | [phase-02](phase-02-backend-nursery-api.md) | Claude (backend) | M0 | pending |
| B2 % làn, ảnh bắt buộc các bước, sự cố | [phase-03](phase-03-backend-lane-progress-step-photos.md) | Claude (backend) | B1 (cùng nhánh) | pending |
| W1 Sơ đồ làn cột ngang | [phase-04](phase-04-web-lane-columns.md) | **Codex high** | không (dùng % suy ra tới khi có B2) | pending |
| W2 Màn Ươm giống | [phase-05](phase-05-web-nursery-screens.md) | **Codex high** | B1 hợp đồng | đã triển khai; ESLint + 6 test đạt; đã sửa lỗi tsc, chưa kiểm lại; API/trình duyệt chưa kiểm chứng |
| W3 Thả giống, thu hoạch, sự cố, tổng kết, ảnh | [phase-06](phase-06-web-steps-photos-summary.md) | **Codex high** | B1, B2, W1 | pending |
| D Tài liệu, SRS, luồng sử dụng, tóm tắt PM | [phase-07](phase-07-docs-srs.md) | Claude (docs) | B1 | pending |

**Cập nhật W2 (12/11/2026):** đã có màn quản lý, chi tiết/sửa tại chỗ, hai luồng hai bước, ảnh tạm, BFF, menu/liên kết và bước Ươm trong hành trình. Chưa xác nhận tiêu chí hoàn tất một đợt chia hai bè trên API thật. Không suy trạng thái các module khác từ việc W2 đã có mã.

**Bằng chứng kiểm tra W2:** ESLint phần thay đổi đạt; test hàm thuần mới đạt 6/6. `tsc --noEmit -p .` chạy đúng một lần, exit 1 với TS2339 tại closure đọc `backend.config.origin` trong `nursery-http.ts`; đã sửa bằng cách giữ cấu hình sau API guard. Không chạy lại theo giới hạn phiên, nên TypeScript sau sửa chưa được xác nhận.

ESLint riêng `src/server/nursery/nursery-http.ts` sau sửa đạt; `git diff --check` đạt. Hai kiểm tra này không thay thế kết quả TypeScript còn cần xác nhận ở lượt tiếp nhận.

**Giới hạn phiên W2 theo yêu cầu người giao:** chỉ ESLint phần đổi, TypeScript một lần và test hàm thuần mới; không build/dev server, không commit/push. Điều phối viên tiếp nhận kiểm tra tích hợp và thao tác Git.

## Thứ tự và song song
1. **M0 trước** (nhỏ, mở khóa test thu hoạch). Cùng lúc **W1** (chỉ web).
2. **B1** (sau M0) song song **W1**. Hợp đồng API B1 xong thì **W2** bắt đầu.
3. **B2** (sau B1, cùng nhánh backend) song song W2.
4. **W3** sau B2 và W1. **D** chạy song song W3, chốt cuối.
5. Cuối: dựng lại backend demo, một lượt kiểm tra trình duyệt ẩn, commit, báo chủ.

Quy tắc file để khỏi đè nhau: backend chỉ một agent mỗi lúc trên nhánh `feature/OMTS-132-nursery`; web tối đa một Codex mỗi lúc (W1, W2, W3 tuần tự hoặc song song chỉ khi file khác thư mục: W1 trong `farming-management`, W2 trong thư mục mới `nursery-api`, W3 trong `cultivation-api`, `cycles-api`).

## Giao Codex đúng cách
- Lệnh: `codex exec -m gpt-6.1-sol -c model_reasoning_effort=high --sandbox workspace-write --skip-git-repo-check - < <prompt>.txt > <log>.txt` (chạy nền).
- Prompt mỗi module = nội dung phase file + phần "Ràng buộc chung" dưới đây. Lưu prompt/log ở scratchpad.
- Reasoning high chậm hơn: dặn Codex **không chạy test dài**, chỉ eslint thư mục đổi, `tsc --noEmit -p .` một lần, test hàm thuần mới.

## Ràng buộc chung (mọi module)
- Đọc `AGENTS.md`, `docs/DESIGN_GUIDELINES.md`, đặc tả nursery trước. Không bịa số liệu; số suy từ đếm tay luôn ghi **ước tính**.
- Không đụng bán hàng, đơn khách, kế hoạch làm việc của đồng đội; không sửa `develop`; không push.
- Tiết kiệm hạn mức: một agent nhỏ mỗi đợt; backend chỉ chạy lớp test vừa thêm trong **một container 3 GB**, không SQL Server nếu không cần, không đợt test dài; web chỉ eslint + tsc một lần + test hàm thuần.
- Nút đổi vai trò dùng key riêng và `type` tường minh; tệp dưới ~200 dòng; tiếng Việt, không panel mô tả dev, không chữ "chưa hoàn thiện".
- Mỗi module kết thúc bằng một commit cục bộ và một báo cáo ngắn (xong/chưa/giả định).

## Quy trình tiếp quản khi Codex hết hạn mức
1. Kiểm tra log Codex (`tail`, tìm `usage limit`, `apply_patch`) và `git status` để biết đã sửa gì.
2. Giao **agent Claude** (fullstack) với: prompt gốc + đường dẫn log + "cây mã đang dở, đọc trước khi sửa, đưa về xanh (`tsc`, eslint) rồi làm nốt".
3. Không chạy test dài; báo cáo ngắn; chủ hồi hạn mức Codex thì chuyển lại.

## Rủi ro chính
| Rủi ro | Xử lý |
|---|---|
| Ảnh bắt buộc cản nhập liệu | Chỉ bản ghi mới; lỗi nêu rõ trường ảnh; nén ảnh phía trình duyệt |
| Migration chồng với đồng đội (OMTS-223, #76, #79) | Tên migration sau `20261112120000`; đối chiếu `develop` trước khi mở PR |
| Thu hoạch gắn yêu cầu mua | Seed demo yêu cầu đã chấp nhận (M0); không đổi luồng |
| Docker sập vì bộ nhớ | Một container test mỗi lúc, giới hạn bộ nhớ, kiểm tra stack của chủ trước mỗi đợt |
| Hạn mức Claude/Codex | Đợt nhỏ, báo cáo ngắn, tiếp quản có quy trình |

## Quyết định đã chốt (12/11)
1. Ươm hoàn tất không hủy; mã thông báo/quyền ươm dùng chung (thả giống); thông báo chủ khi Quản lý sửa % làn: có.
2. **Đường tạo chu kỳ cũ bị khóa** (1A): chu kỳ mới chỉ sinh khi hoàn tất ươm. Chu kỳ đang chạy giữ nguyên, nhãn "Không qua ươm", vẫn thả thêm bằng form cũ (2A).
3. Dữ liệu hiện tại là demo (3): không migrate; dữ liệu thật tổng hợp sau. Seed demo thêm một đợt ươm đang ươm để chủ thử luồng mới.
4. Thu hoạch vẫn bắt buộc yêu cầu mua đã chấp nhận (4A).
5. Không cảnh báo khi hao hụt ươm cao (5A).

## Việc B3 (sau B2, backend): khóa đường cũ
Backend từ chối tạo chu kỳ thủ công mới và thả giống chọn lô cho chu kỳ mới (400 nêu "tạo chu kỳ qua ươm"); chu kỳ cũ không đổi; seed demo thêm đợt ươm Đang ươm (idempotent, không âm kho); test lớp liên quan; cập nhật hợp đồng và SRS_DEVIATIONS Q21.
