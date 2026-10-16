import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export type FormFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  endAdornment?: ReactNode;
  error?: string;
  hint?: string;
  id: string;
  label: string;
};

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField(
    {
      "aria-describedby": ariaDescribedBy,
      endAdornment,
      error,
      hint,
      id,
      label,
      ...inputProps
    },
    ref,
  ) {
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ");

    return (
      <div>
        <label className="block text-sm font-semibold text-text" htmlFor={id}>
          {label}
          {inputProps.required && (
            <span aria-hidden="true" className="ml-1 text-danger">
              *
            </span>
          )}
        </label>

        {hint && (
          <p className="mt-1 text-sm leading-5 text-text-muted" id={hintId}>
            {hint}
          </p>
        )}

        <div className="relative mt-2">
          <input
            {...inputProps}
            aria-describedby={describedBy || undefined}
            aria-invalid={error ? true : undefined}
            className={`min-h-12 w-full rounded-control border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm outline-none transition duration-200 placeholder:text-slate-400 ${
              endAdornment ? "pr-20" : ""
            } ${
              error
                ? "border-danger focus-visible:border-danger"
                : "border-border-strong hover:border-slate-500 focus-visible:border-primary"
            }`}
            id={id}
            ref={ref}
          />

          {endAdornment && (
            <div className="absolute inset-y-0 right-1.5 flex items-center">
              {endAdornment}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-sm font-medium text-danger" id={errorId} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
