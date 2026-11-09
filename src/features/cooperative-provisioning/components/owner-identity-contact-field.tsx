import type { UseFormRegisterReturn } from "react-hook-form";

type OwnerIdentityContactFieldProps = Readonly<{
  error?: string;
  hasError: boolean;
  registration: UseFormRegisterReturn<"ownerIdentityContact">;
}>;

/** Multi-line field for the first owner's verified identity and hand-over contact. */
export function OwnerIdentityContactField({ error, hasError, registration }: OwnerIdentityContactFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-text" htmlFor="owner-identity-contact">
        Danh tính và thông tin liên hệ của Chủ nhiệm HTX đầu tiên
        <span aria-hidden="true" className="ml-1 text-danger">
          *
        </span>
      </label>
      <p className="mt-1 text-sm leading-5 text-text-muted" id="owner-identity-contact-hint">
        Nhập đúng nội dung trên hồ sơ đã dùng để đối chiếu và kênh liên hệ bàn giao.
      </p>
      <textarea
        aria-describedby={`owner-identity-contact-hint${hasError ? " owner-identity-contact-error" : ""}`}
        aria-invalid={hasError ? true : undefined}
        className={`mt-2 min-h-32 w-full resize-y rounded-control border bg-surface px-3.5 py-3 text-base text-text shadow-sm outline-none transition placeholder:text-slate-400 ${
          hasError
            ? "border-danger focus-visible:border-danger"
            : "border-border-strong hover:border-slate-500 focus-visible:border-primary"
        }`}
        id="owner-identity-contact"
        placeholder="Họ tên, giấy tờ đã đối chiếu và số điện thoại hoặc email liên hệ"
        required
        {...registration}
      />
      {hasError && (
        <p className="mt-1.5 text-sm font-medium text-danger" id="owner-identity-contact-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
