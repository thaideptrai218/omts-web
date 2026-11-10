"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { useOysterMood } from "@/components/brand/oyster-mood";
import {
  FormField,
  type FormFieldProps,
} from "@/components/form/form-field";

type PasswordFieldProps = Omit<FormFieldProps, "endAdornment" | "type">;

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(props, ref) {
    const [isVisible, setIsVisible] = useState(false);
    const { setMood } = useOysterMood();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const attachRef = useCallback((input: HTMLInputElement | null) => {
      inputRef.current = input;
      if (typeof ref === "function") return ref(input);
      if (ref) ref.current = input;
    }, [ref]);
    const actionLabel = isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu";

    // Also covers controlled resets and values supplied before the first focus.
    useEffect(() => {
      const input = inputRef.current;
      setMood(isVisible ? "open" : input?.value || document.activeElement === input ? "closed" : "idle");
    }, [isVisible, props.value, props.defaultValue, setMood]);

    useEffect(() => {
      const onOtherFieldFocus = (event: FocusEvent) => {
        const target = event.target;
        if (target instanceof Element && target.matches("input, select, textarea") &&
          !target.matches('[data-password-field="true"]')) setMood("idle");
      };
      document.addEventListener("focusin", onOtherFieldFocus);
      return () => {
        document.removeEventListener("focusin", onOtherFieldFocus);
        setMood("idle");
      };
    }, [setMood]);

    return (
      <FormField
        {...props}
        data-password-field="true"
        onFocus={(event) => {
          setMood(isVisible ? "open" : "closed");
          props.onFocus?.(event);
        }}
        onChange={(event) => {
          setMood(isVisible ? "open" : event.currentTarget.value || document.activeElement === event.currentTarget ? "closed" : "idle");
          props.onChange?.(event);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.value) setMood("idle");
          props.onBlur?.(event);
        }}
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
        ref={attachRef}
        type={isVisible ? "text" : "password"}
      />
    );
  },
);
