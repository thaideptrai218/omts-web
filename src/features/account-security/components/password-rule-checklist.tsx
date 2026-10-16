import {
  getPasswordRuleState,
  passwordPolicy,
} from "@/features/account-security/domain/password-policy";

type PasswordRuleChecklistProps = Readonly<{
  id: string;
  password: string;
}>;

export function PasswordRuleChecklist({
  id,
  password,
}: PasswordRuleChecklistProps) {
  const rules = getPasswordRuleState(password);
  const items = [
    {
      isMet: rules.hasMinimumLength,
      label: `Ít nhất ${passwordPolicy.minimumLength} ký tự`,
    },
    { isMet: rules.hasLetter, label: "Có ít nhất một chữ cái" },
    { isMet: rules.hasDigit, label: "Có ít nhất một chữ số" },
  ] as const;

  return (
    <div
      className="mt-3 rounded-control border border-border bg-surface-subtle p-4"
      id={id}
    >
      <p className="text-sm font-semibold text-text">Mật khẩu cần đáp ứng</p>
      <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
        {items.map((item) => (
          <li
            className={`flex items-start gap-2 leading-5 ${
              item.isMet ? "text-success" : "text-text-muted"
            }`}
            key={item.label}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-bold ${
                item.isMet
                  ? "border-success bg-success text-white"
                  : "border-border-strong bg-surface"
              }`}
            >
              {item.isMet ? "✓" : ""}
            </span>
            <span>
              <span className="sr-only">
                {item.isMet ? "Đã đạt: " : "Chưa đạt: "}
              </span>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
