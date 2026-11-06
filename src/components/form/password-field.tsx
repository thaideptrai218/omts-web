"use client";

import { forwardRef, useState } from "react";
import {
  FormField,
  type FormFieldProps,
} from "@/components/form/form-field";

type PasswordFieldProps = Omit<FormFieldProps, "endAdornment" | "type">;

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(props, ref) {
    const [isVisible, setIsVisible] = useState(false);
    const actionLabel = isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu";

    return (
      <FormField
        {...props}
        endAdornment={
          <button
            aria-controls={props.id}
            aria-label={actionLabel}
            aria-pressed={isVisible}
            className="inline-flex min-h-11 min-w-12 items-center justify-center rounded-md px-2 text-sm font-semibold text-primary transition hover:bg-primary-soft"
            onClick={() => setIsVisible((current) => !current)}
            title={actionLabel}
            type="button"
          >
            {isVisible ? "Ẩn" : "Hiện"}
          </button>
        }
        ref={ref}
        type={isVisible ? "text" : "password"}
      />
    );
  },
);
