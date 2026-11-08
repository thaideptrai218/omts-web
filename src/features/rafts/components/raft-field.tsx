import { useId, type ReactNode } from "react";
export const raftInputStyles =
  "mt-2 min-h-12 w-full min-w-0 rounded-control border border-border-strong bg-surface px-3 py-2 text-text disabled:bg-surface-subtle disabled:text-text-muted";
export function RaftField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children(props: {
    id: string;
    "aria-invalid": boolean;
    "aria-required"?: boolean;
    "aria-describedby"?: string;
  }): ReactNode;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children({
        id,
        "aria-invalid": !!error,
        "aria-required": required || undefined,
        "aria-describedby": error ? `${id}-error` : undefined,
      })}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
