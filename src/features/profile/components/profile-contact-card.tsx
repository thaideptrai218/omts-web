import { Button } from "@/components/ui/button";
import type { ProfileContact, ProfileIdentifierKind } from "../domain/personal-profile";
import { describeProfileContact } from "../lib/describe-profile-contact";

export function ContactEditor({
  contact,
  disabled,
  kind,
  onChange,
  onVerify,
  isVerifying,
  pendingValue,
}: {
  contact: ProfileContact | null;
  disabled: boolean;
  kind: ProfileIdentifierKind;
  onChange(): void;
  onVerify(): void;
  isVerifying: boolean;
  pendingValue?: string;
}) {
  const label = kind === "email" ? "Email" : "Số điện thoại";
  const { isVerified, statusLabel, value } = describeProfileContact(contact, kind);

  return (
    <div className="rounded-control border border-border bg-surface-subtle/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-muted">{label}</p>
          <p className="mt-1 break-all font-medium text-text">{value}</p>
        </div>
        <span
          className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold ${
            isVerified
              ? "bg-primary-soft text-primary-hover"
              : "bg-warning-soft text-warning"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {pendingValue && (
        <div className="mt-3 rounded-control border border-success/20 bg-emerald-50 p-3 text-sm text-success">
          <p className="font-semibold">Đã xác minh, chờ lưu</p>
          <p className="mt-1 break-all">{pendingValue}</p>
        </div>
      )}

      {contact && !contact.isVerified && !pendingValue && (
        <Button className="mt-3 sm:w-auto" disabled={disabled} isPending={isVerifying}
          pendingLabel="Đang gửi mã..." onClick={onVerify} variant="secondary">
          Xác minh {label.toLocaleLowerCase("vi")}
        </Button>
      )}
      <button
        className="mt-3 min-h-11 rounded-control px-3 text-sm font-semibold text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={onChange}
        type="button"
      >
        {pendingValue
          ? `Chọn ${label.toLocaleLowerCase("vi")} khác`
          : `${contact ? "Thay đổi" : "Thêm"} ${label.toLocaleLowerCase("vi")}`}
      </button>
    </div>
  );
}
