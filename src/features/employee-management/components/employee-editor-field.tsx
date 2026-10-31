import type { ReactNode } from "react";

export function EmployeeEditorField({ id, label, required, optional, error, hint, children }: Readonly<{
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}>) {
  return (
    <div className="min-w-0 text-sm font-semibold text-text">
      <label className="block" htmlFor={id}>
        {label}{required && <span aria-hidden="true" className="text-danger"> *</span>}
        {optional && <span className="font-normal text-text-muted"> (không bắt buộc)</span>}
      </label>
      {children}
      {hint && <p className="mt-2 font-normal leading-5 text-text-muted" id={`${id}-hint`}>{hint}</p>}
      {error && <span className="mt-2 block font-normal text-danger" id={`${id}-error`}>{error}</span>}
    </div>
  );
}
