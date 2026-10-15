import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "danger" | "primary" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  isPending?: boolean;
  pendingLabel?: string;
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, string> = {
  danger: "border-danger bg-danger text-white hover:brightness-95",
  primary:
    "border-primary bg-primary text-white hover:border-primary-hover hover:bg-primary-hover",
  secondary:
    "border-border-strong bg-surface text-text hover:border-primary hover:bg-primary-soft",
};

export function Button({
  children,
  className = "",
  disabled,
  isPending = false,
  pendingLabel = "Đang xử lý...",
  type = "button",
  variant = "primary",
  ...buttonProps
}: ButtonProps) {
  return (
    <button
      {...buttonProps}
      aria-busy={isPending || undefined}
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control border px-5 py-3 text-base font-semibold transition duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60 ${variantStyles[variant]} ${className}`}
      disabled={disabled || isPending}
      type={type}
    >
      {isPending && (
        <span
          aria-hidden="true"
          className="size-5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
        />
      )}
      <span>{isPending ? pendingLabel : children}</span>
    </button>
  );
}
