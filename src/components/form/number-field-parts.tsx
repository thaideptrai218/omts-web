"use client";
import { useImperativeHandle, useLayoutEffect, useRef, type ReactNode, type Ref } from "react";

/**
 * Building blocks shared by MoneyInput and UnitInput: the field shell (input + unit suffix inside the
 * border, captions and inline error below) and a hook that keeps the caret next to the same digit
 * after the text was regrouped while typing.
 */
export const NUMBER_INPUT_CLASS =
  "omts-control text-right tabular-nums aria-invalid:border-danger aria-invalid:focus:border-danger";

export function NumberFieldShell({
  input, suffix, notes, error, errorId, className,
}: {
  input: ReactNode;
  suffix: string;
  /** Neutral captions under the field (id is referenced by aria-describedby). */
  notes: { id: string; text: string }[];
  error?: string;
  errorId: string;
  className?: string;
}) {
  return (
    <div className={className ?? "w-full"}>
      <div className="relative">
        {input}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-2 flex items-center"
        >
          <span className="rounded bg-surface-subtle px-1.5 text-xs font-medium leading-5 text-text-muted">
            {suffix}
          </span>
        </span>
      </div>
      {notes.map((note) => (
        <p className="mt-1 text-xs leading-4 text-text-muted" id={note.id} key={note.id}>
          {note.text}
        </p>
      ))}
      {error && (
        <p className="mt-1 text-xs font-medium leading-4 text-danger" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const SIGNIFICANT = /[\d,]/g;

/** Caret position in `next` after as many digits/commas as `raw` had before `caret`. */
export function caretAfterReformat(raw: string, caret: number, next: string): number {
  let count = (raw.slice(0, caret).match(SIGNIFICANT) ?? []).length;
  if (count === 0) return 0;
  for (let index = 0; index < next.length; index += 1) {
    if (/[\d,]/.test(next[index]) && --count === 0) return index + 1;
  }
  return next.length;
}

/** Returns a ref callback (also forwarding the caller's ref) and `keep()` to call from onChange. */
export function useDigitCaret(forwarded?: Ref<HTMLInputElement>, validity = "") {
  const node = useRef<HTMLInputElement | null>(null);
  const pending = useRef<number | null>(null);
  // Expose the same element to the caller's ref (object or callback) without mutating props.
  useImperativeHandle(forwarded, () => node.current as HTMLInputElement, []);
  // Out-of-range text blocks a native form submit (replaces the old type="number" min/max checks).
  useLayoutEffect(() => {
    node.current?.setCustomValidity(validity);
  }, [validity]);
  useLayoutEffect(() => {
    if (pending.current !== null && node.current) {
      node.current.setSelectionRange(pending.current, pending.current);
    }
    pending.current = null;
  });
  const keep = (raw: string, caret: number | null, next: string) => {
    pending.current = caret !== null && next !== raw && caret < raw.length ? caretAfterReformat(raw, caret, next) : null;
  };
  return { setRef: node, keep };
}
