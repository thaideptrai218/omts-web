# 05 — Trạng thái Git (09/11/2026)

## Nhánh
- Local: `develop`, `experiment/wireframe-cycle-redesign-20261107` (**hiện tại**, HEAD `3883595`), `feature/OMTS-132-web-foundation`.
- Remote: `origin/develop` (`e95520f`), `origin/main` (`9ff1d94`), `origin/feature/OMTS-132-web-foundation`. Nhánh experiment có trên `origin` theo `ls-remote` (`3883595`) nhưng `git branch -a` không liệt kê như tham chiếu remote-tracking (tham chiếu cục bộ cũ).
- `origin/HEAD` → `origin/develop`.
- So với `origin/develop`: 0 behind, **105 ahead**. Commit cuối 09/11/2026 22:10 +0700.

## Thay đổi chưa commit
- Đã sửa: `src/app/(public)/page.tsx`, `src/features/landing/landing-icons.tsx`, `landing-page.tsx`, `landing.module.css`.
- Mới, chưa theo dõi (refactor tách landing): `landing-content-sections.tsx`, `landing-hero.module.css`, `landing-hero.tsx`, `landing-sample-qr.tsx`, `landing-sections.module.css`, `landing-trace-section.tsx`, `landing-trace.module.css`, `landing-zone-plan.tsx`.
- Thư mục `docs/ai-context/` (bộ tài liệu này) cũng chưa commit.

## Số commit theo ngày
24/10 (2), 26/10 (5), 27/10 (3), 28/10 (13), 29/10 (9), 30/10 (19), 31/10 (3), 02/11 (7), 03/11 (3), 04/11 (12), 06/11 (1), 09/11 (13). 07–08/11 không có commit; công việc hai ngày đó nằm trong đợt 09/11.

## Commit gần đây (theo chủ đề, mới nhất trước)
- **09/11** (đều gắn `[OMTS-132]`): tách editor quá lớn và thêm thông báo/tên tệp tiếng Việt (`3883595`); nối khiếu nại chất lượng cho Trader/Owner + tổng dính trên mobile (`742fdd8`); nối danh sách hóa đơn bán + đổi font Việt (`f1a8b5c`); nhãn tiếng Việt cho trạng thái backend, không tràn ngang trên điện thoại (`2cab2e4`); màn chỉ-khung và sửa kg yêu cầu mua (`826ab9c`); tách editor và màn nước (`fdb4c4e`); hàu đăng nhập động (`d28f5c8`); hóa đơn, thanh toán khách, truy xuất, sản lượng, lương, tổng quan nước (`4bda670`); trang nguồn gốc công khai cho QR (`fa40f0c`); landing, boot screen, polish UI (`2005da6`); sửa test (`eb5fcf5`, `a77d57c`); luồng wireframe và công nợ khách (`919f445`).
- **06–08/11**: hoàn thiện workspace API và admin (`f109c4d`, không có khóa Jira); nhật ký/chứng nhận/sao kê công nợ (`65f447b`); tạo/sửa/hủy chu kỳ (`b0788af`); lịch sử chu kỳ và tiến độ làn (`8d9d9be`); nhật ký thao tác Owner (`8220e70`); hành động catalog theo backend develop (`cd64f39`).
- **04/11**: lưới bè (`824432c`); nhãn nav nhân viên (`8ad9c32`); phân tích nước (`45c1e5f`); mua hàng và thanh toán NCC (`90d5a99`); bản địa hóa (`a9b1dfe`); staffing OMTS-223 (`d065a4e`); workspace dùng chung + redesign login (`3eee97a`).
- **03/11**: tài liệu runtime và tài khoản tester (`2f2be19`); QA Docker/Vercel (`9efdb5f`); luồng Manager–Kế toán local (`d339a4f`).
- **02/11**: demo workforce local + phạm vi thu hoạch Manager (`e0b6a91`); nav nhóm (`ea4216a`); đổi tên Owner (`729091d`); tóm tắt làn bè (`e655eec`); sửa thông báo (`35e20dd`); ranh giới và phản hồi cũ (`744e751`); hợp đồng vai trò và catalog (`bc1fc1c`); tài liệu QA OMTS-216 (`4bcb475`).
- **31/10**: yêu cầu mua theo lồng và workforce (`12376d1`); đọc bán hàng/nhân sự (`267a1e4`); phục hồi lookup (`50db089`).

## Mẫu quan sát được
- Dùng Conventional Commits có scope (feat, fix, refactor, test, docs).
- Khóa Jira `[OMTS-132]` dùng nhất quán cho commit Web. Một số commit **không có khóa Jira** (`f109c4d`, `65f447b`, `b0788af`, `8d9d9be`, `8220e70`, `cd64f39`, và các commit UI 02–04/11), trái mẫu PR và hướng dẫn đóng góp.
- Mọi thứ nằm trên một nhánh dài; nhánh feature chưa từng merge vào `develop`.
- Quy ước nhánh/commit/PR/CI/release: xem [`../rules/06-git-branch-pr-commit.md`](../rules/06-git-branch-pr-commit.md).
