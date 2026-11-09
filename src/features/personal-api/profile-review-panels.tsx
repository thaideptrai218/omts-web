"use client";
import { Button } from "@/components/ui/button";
import { knownRoleNameLabel } from "@/shared/presentation/actor-label";
import type { ProfileViewDto } from "./contracts";

/** "Email: … · Đã xác minh" and phone lines shared by both review panels. */
function ContactLines({ latest }: { latest: ProfileViewDto }) {
  return (
    <>
      <p>
        Email: {latest.email || "Chưa có"} · {latest.emailVerified ? "Đã xác minh" : "Chưa xác minh"}
      </p>
      <p>
        Số điện thoại: {latest.phoneNumber || "Chưa có"} · {latest.phoneVerified ? "Đã xác minh" : "Chưa xác minh"}
      </p>
    </>
  );
}

/**
 * After an uncertain contact save (or a save that returned no profile), the user reloads the profile and
 * compares it; the save is never resent automatically.
 */
export function ContactReviewPanel({
  latest,
  disabled,
  canAcceptLatest,
  onLoad,
  onAcceptLatest,
}: {
  latest: ProfileViewDto | undefined;
  disabled: boolean;
  canAcceptLatest: boolean;
  onLoad(): void;
  onAcceptLatest(latest: ProfileViewDto): void;
}) {
  return (
    <section className="space-y-3 rounded-card border border-border p-4">
      <p>Hãy tải hồ sơ và đối chiếu liên hệ đã lưu. Lệnh Lưu không được gửi lại tự động.</p>
      <Button className="w-auto" variant="secondary" disabled={disabled} onClick={onLoad}>
        Tải hồ sơ mới để đối chiếu
      </Button>
      {latest && (
        <div className="space-y-2 break-words">
          <p>Tên đã lưu: {latest.displayName}</p>
          <ContactLines latest={latest} />
          {canAcceptLatest && (
            <Button className="w-auto" variant="secondary" onClick={() => onAcceptLatest(latest)}>
              Đã đối chiếu phiên bản hồ sơ
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/** Shown while the name save is blocked: compare with the saved profile, then keep the draft name or adopt. */
export function BlockedProfileReview({
  latest,
  pending,
  uncertain,
  onLoad,
  onAdopt,
}: {
  latest: ProfileViewDto | undefined;
  pending: boolean;
  uncertain: boolean;
  onLoad(): void;
  onAdopt(latest: ProfileViewDto, keepDraftName: boolean): void;
}) {
  return (
    <section className="space-y-4 rounded-card border border-border bg-surface p-4">
      <Button className="w-auto" variant="secondary" disabled={pending} onClick={onLoad}>
        Tải hồ sơ mới để đối chiếu
      </Button>
      {latest && (
        <div className="space-y-3 break-words">
          <h2 className="font-semibold">Hồ sơ hiện tại trên hệ thống</h2>
          <p>Tên hiển thị: {latest.displayName}</p>
          <ContactLines latest={latest} />
          <p>
            Vùng – vai trò:{" "}
            {latest.grants
              .map(
                (grant) =>
                  `${knownRoleNameLabel(grant.role)} / ${grant.allZones ? "Tất cả vùng" : grant.zoneName || "Vùng chưa có tên"}`,
              )
              .join("; ") || "Không có"}
          </p>
          {!uncertain ? (
            <div className="flex flex-wrap gap-3">
              <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => onAdopt(latest, true)}>
                Đã đối chiếu, giữ tên đang nhập
              </Button>
              <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => onAdopt(latest, false)}>
                Dùng hồ sơ đã lưu
              </Button>
            </div>
          ) : (
            <p>Chưa xác định được kết quả lượt ghi. Hãy đối chiếu và mở lại hồ sơ trước khi thực hiện lượt mới.</p>
          )}
        </div>
      )}
    </section>
  );
}
