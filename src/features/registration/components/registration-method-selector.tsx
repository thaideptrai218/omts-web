"use client";

import type { RegistrationMethod } from "@/features/registration/domain/registration-method";

type RegistrationMethodSelectorProps = Readonly<{
  disabled?: boolean;
  name?: string;
  onChange(method: RegistrationMethod): void;
  value?: RegistrationMethod;
}>;

const methodOptions = [
  {
    description: "Nhận mã xác minh trong hộp thư của bạn.",
    label: "Email",
    value: "email",
  },
  {
    description: "Nhận mã xác minh bằng tin nhắn SMS.",
    label: "Số điện thoại",
    value: "phone",
  },
] as const satisfies readonly {
  description: string;
  label: string;
  value: RegistrationMethod;
}[];

function MethodIcon({ method }: { method: RegistrationMethod }) {
  if (method === "email") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
        <path
          d="m3.5 5.5 6.5 5 6.5-5M4.75 4h10.5A1.75 1.75 0 0 1 17 5.75v8.5A1.75 1.75 0 0 1 15.25 16H4.75A1.75 1.75 0 0 1 3 14.25v-8.5A1.75 1.75 0 0 1 4.75 4Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M7 3.5h6A1.5 1.5 0 0 1 14.5 5v10A1.5 1.5 0 0 1 13 16.5H7A1.5 1.5 0 0 1 5.5 15V5A1.5 1.5 0 0 1 7 3.5Zm1 10.25h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function RegistrationMethodSelector({
  disabled = false,
  name = "registration-method",
  onChange,
  value,
}: RegistrationMethodSelectorProps) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-semibold text-text">
        Bạn muốn đăng ký bằng
        <span aria-hidden="true" className="ml-1 text-danger">
          *
        </span>
      </legend>

      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {methodOptions.map((option) => (
          <label className="group relative cursor-pointer" key={option.value}>
            <input
              checked={value === option.value}
              className="peer sr-only"
              name={name}
              onChange={() => onChange(option.value)}
              type="radio"
              value={option.value}
            />
            <span className="flex min-h-24 items-start gap-3 rounded-control border border-border-strong bg-surface p-4 text-left transition duration-200 group-hover:border-primary peer-checked:border-primary peer-checked:bg-primary-soft peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-60">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-surface-subtle text-primary">
                <MethodIcon method={option.value} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-text">
                  {option.label}
                </span>
                <span className="mt-1 block text-sm leading-5 text-text-muted">
                  {option.description}
                </span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
