"use client";
import { Button } from "@/components/ui/button";
import { knownRoleNameLabel } from "@/shared/presentation/actor-label";
import type { ProfileViewDto } from "./contracts";
import styles from "./profile-layout.module.css";

export type ContactDialogRequest = { channel: "Email" | "Sms"; target: string };

/**
 * Saved email/phone with verification state. Unverified existing values are prefilled for verification;
 * verified ones start a change with an empty target.
 */
export function ProfileContactsSection({
  record,
  disabled,
  onRequestContact,
}: {
  record: ProfileViewDto;
  disabled: boolean;
  onRequestContact(request: ContactDialogRequest): void;
}) {
  return (
    <section className={`${styles.contacts} space-y-4`} aria-label="Thông tin liên hệ">
      <h2 className="text-base font-semibold">Thông tin liên hệ</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        {[
          ["Email", record.email, record.emailVerified],
          ["Số điện thoại", record.phoneNumber, record.phoneVerified],
        ].map(([label, value, verified]) => (
          <div key={String(label)}>
            <dt className="text-sm text-text-muted">{label}</dt>
            <dd className="mt-1 break-all">{value || "Chưa có"}</dd>
            <dd className="mt-1 text-sm text-text-muted">
              {value ? (verified ? "Đã xác minh" : "Chưa xác minh") : "Chưa có thông tin xác minh"}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-3">
        <Button
          className="w-auto"
          variant="secondary"
          disabled={disabled}
          onClick={() =>
            onRequestContact({ channel: "Email", target: record.emailVerified ? "" : (record.email ?? "") })
          }
        >
          {record.email && !record.emailVerified ? "Xác minh email hiện có" : record.email ? "Đổi email" : "Thêm email"}
        </Button>
        <Button
          className="w-auto"
          variant="secondary"
          disabled={disabled}
          onClick={() =>
            onRequestContact({ channel: "Sms", target: record.phoneVerified ? "" : (record.phoneNumber ?? "") })
          }
        >
          {record.phoneNumber && !record.phoneVerified
            ? "Xác minh số điện thoại hiện có"
            : record.phoneNumber
              ? "Đổi số điện thoại"
              : "Thêm số điện thoại"}
        </Button>
      </div>
    </section>
  );
}

/** Effective role/zone grants of the signed-in account (read-only). */
export function ProfileGrantsSection({ record }: { record: ProfileViewDto }) {
  return (
    <section className={`${styles.grants} space-y-3`} aria-label="Vai trò và vùng được cấp">
      <h2 className="text-base font-semibold">Vai trò và vùng được cấp</h2>
      {record.grants.length ? (
        <ul className="space-y-2">
          {record.grants.map((grant, index) => (
            <li key={`${grant.role}:${grant.zoneId}:${index}`} className="rounded-control bg-surface-subtle p-3">
              <p className="font-semibold">{knownRoleNameLabel(grant.role)}</p>
              <p className="mt-1 text-sm">
                {grant.allZones ? "Tất cả vùng" : grant.zoneName || "Vùng chưa có tên trong danh mục"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-text-muted">
          {record.subjectType === "CooperativeOwner"
            ? "Chủ nhiệm HTX quản lý theo loại tài khoản."
            : "Chưa có cặp vùng – vai trò đang hiệu lực."}
        </p>
      )}
    </section>
  );
}
