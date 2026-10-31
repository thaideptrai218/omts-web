import type { VerificationChannel } from "@/features/verification/domain/verification-types";

type RecoveryChannelSelectorProps = Readonly<{
  disabled?: boolean;
  onChange(channel: VerificationChannel): void;
  value: VerificationChannel;
}>;

const choices = [
  {
    description: "Nhận mã qua địa chỉ email đã xác minh.",
    label: "Email",
    value: "email",
  },
  {
    description: "Nhận mã qua số điện thoại đã xác minh.",
    label: "Tin nhắn SMS",
    value: "sms",
  },
] as const;

export function RecoveryChannelSelector({
  disabled = false,
  onChange,
  value,
}: RecoveryChannelSelectorProps) {
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-semibold text-text">Cách nhận mã</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {choices.map((choice) => {
          const isSelected = choice.value === value;

          return (
            <label
              className={`flex min-h-24 cursor-pointer items-start gap-3 rounded-card border p-4 transition ${
                isSelected
                  ? "border-primary bg-primary-soft shadow-sm"
                  : "border-border bg-surface hover:border-border-strong"
              } has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-focus-ring`}
              key={choice.value}
            >
              <input
                checked={isSelected}
                className="mt-1 size-4 shrink-0 accent-primary"
                name="recovery-channel"
                onChange={() => onChange(choice.value)}
                type="radio"
                value={choice.value}
              />
              <span>
                <span className="block font-semibold text-text">{choice.label}</span>
                <span className="mt-1 block text-sm leading-5 text-text-muted">
                  {choice.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
