"use client";
import { useImperativeHandle, useLayoutEffect, useRef, type ReactNode, type Ref } from "react";

/**
 * Building blocks shared by MoneyInput and UnitInput: the field shell (input + unit suffix inside the
 * border, captions and inline error below) and a ref hook for native validity and caller access.
 * Live grouping and caret restoration are handled separately by useGroupedNumberEditing.
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

/** Forwards the input element and keeps native form validity in sync with the displayed error. */
export function useNumberInputRef(forwarded?: Ref<HTMLInputElement>, validity = "") {
  const node = useRef<HTMLInputElement | null>(null);
  // Expose the same element to the caller's ref (object or callback) without mutating props.
  useImperativeHandle(forwarded, () => node.current as HTMLInputElement, []);
  // Out-of-range text blocks a native form submit (replaces the old type="number" min/max checks).
  useLayoutEffect(() => {
    node.current?.setCustomValidity(validity);
  }, [validity]);
  return node;
}
