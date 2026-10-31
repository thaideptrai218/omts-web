"use client";

import { useId, type ClipboardEvent, type RefObject } from "react";

import {
  normalizeVerificationCode,
  verificationPolicy,
} from "@/features/verification/domain/verification-types";

type VerificationCodeFieldProps = Readonly<{
  disabled?: boolean;
  error?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  onChange(value: string): void;
  value: string;
}>;

export function VerificationCodeField({
  disabled = false,
  error,
  inputRef,
  onChange,
  value,
}: VerificationCodeFieldProps) {
  const inputId = useId();
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    onChange(normalizeVerificationCode(event.clipboardData.getData("text")));
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-text" htmlFor={inputId}>
        Mã xác minh <span aria-hidden="true" className="text-danger">*</span>
      </label>

      <input
        aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
        aria-invalid={Boolean(error)}
        autoComplete="one-time-code"
        className="mt-2 min-h-12 w-full rounded-control border border-border bg-surface px-4 text-center font-mono text-2xl font-semibold tracking-[0.55em] text-text outline-none transition placeholder:text-text-muted/60 focus:border-primary focus:ring-4 focus:ring-focus-ring disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20"
        disabled={disabled}
        enterKeyHint="done"
        id={inputId}
        inputMode="numeric"
        maxLength={verificationPolicy.codeLength}
        name="verificationCode"
        onChange={(event) => onChange(normalizeVerificationCode(event.target.value))}
        onPaste={handlePaste}
        pattern={`\\d{${verificationPolicy.codeLength}}`}
        ref={inputRef}
        type="text"
        value={value}
      />

      <p className="mt-2 text-sm leading-5 text-text-muted" id={helpId}>
        Nhập {verificationPolicy.codeLength} chữ số trong email hoặc tin nhắn vừa nhận.
      </p>

      {error && (
        <p className="mt-2 text-sm font-medium text-danger" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
