# 06 — Git, nhánh, commit, PR

Nguồn: `AGENTS.md`, `CONTRIBUTING.md`, `.github/*`.

## Nhánh
| Nhánh | Dùng cho |
| --- | --- |
| `main` | Đã phát hành, gắn tag `vX.Y.Z` |
| `develop` | Tích hợp, nhánh mặc định |
| `feature/OMTS-<n>-<slug>` | Tính năng gắn Jira |
| `fix/OMTS-<n>-<slug>` | Sửa lỗi gắn Jira |
| `chore/<slug>`, `docs/<slug>` | Khi không có Jira |
| `hotfix/OMTS-<n>-<slug>` | Từ `main`, merge về `main` rồi `develop` |

- Không push thẳng `main`/`develop`; mọi thay đổi qua PR vào `develop`.
- Các micro-task là ranh giới dạy/test, **không** là ranh giới nhánh: một Jira hoặc một module = một nhánh + một PR.

## Commit
- Conventional Commits kèm khóa Jira: `type(scope): imperative summary [OMTS-n]`.
- Type: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- Không nhắc AI trong commit. Giữ commit tập trung vào thay đổi thật.
- Lưu ý: một số commit lịch sử thiếu khóa Jira, trái mẫu PR.

## PR
- Mẫu PR: khóa Jira, Summary, Type, Test evidence, Checklist (nhánh và tiêu đề chứa khóa Jira; có test cho quy tắc nghiệp vụ đổi; không có bí mật/`.env`; nêu vùng rủi ro: phân quyền, cân dùng chung, thanh toán, đồng bộ offline).
- Điều kiện merge: 1 review duyệt + check `build-test`, `gitleaks`, `pr-title`.
- Squash and merge cho PR tính năng (xóa nhánh tự động). PR release `develop → main` đặt tên `chore(release): vX.Y.Z` và dùng **Create a merge commit**; sau đó gắn tag `main`, `release.yml` tạo GitHub Release.
- CODEOWNERS: `* @Thaissyl @thaideptrai218`.
- Mốc tag: v1.0.0 24/10/2026, v2.0.0 07/11/2026, v3.0.0 21/11/2026, v4.0.0 (cuối) 05/12/2026.
- Jira: chuyển In Progress khi bắt đầu, Done khi merge.

## CI (`.github/workflows`)
- `ci.yml`: `npm ci → lint → typecheck → test → build → test:session-pages`, Node theo `.nvmrc` (24.x); chạy trên PR vào main/develop và push vào hai nhánh đó, có hủy chạy trùng. Push nhánh feature đơn thuần **không** chứng minh CI đã chạy.
- `gitleaks.yml`: quét toàn lịch sử.
- `pr-title.yml`: kiểm tra tiêu đề PR dạng semantic (`pull_request_target`, không checkout code PR).
- `release.yml`: chạy khi có tag `v*`.

## Trước khi commit/push
- Chạy lint trước commit, test trước push; không bỏ qua test lỗi để cho xanh.
- Không commit/push thông tin bí mật.
