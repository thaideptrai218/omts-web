"use client";

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

type DialogProps = Readonly<{
  children: ReactNode;
  description?: string;
  dismissible?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onOpenChange(open: boolean): void;
  open: boolean;
  title: string;
}>;

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function keepFocusInsideDialog(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;

  const focusableElements = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter((element) => element.offsetParent !== null);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements.at(-1);

  if (!firstElement || !lastElement) return;

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

export function Dialog({
  children,
  description,
  dismissible = true,
  initialFocusRef,
  onOpenChange,
  open,
  title,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      initialFocusRef?.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [initialFocusRef, open]);

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-card border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-[1px] open:motion-safe:animate-[omts-reveal-from-bottom_180ms_ease-out_both] max-sm:m-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-none max-sm:rounded-none"
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onOpenChange(false);
      }}
      onClick={(event) => {
        if (dismissible && event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
      onKeyDown={keepFocusInsideDialog}
      ref={dialogRef}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight" id={titleId}>
              {title}
            </h2>
            {description && (
              <p className="mt-2 leading-6 text-text-muted" id={descriptionId}>
                {description}
              </p>
            )}
          </div>

          {dismissible && (
            <button
              aria-label="Đóng hộp thoại"
              className="grid size-11 shrink-0 place-items-center rounded-control text-xl text-text-muted transition hover:bg-surface-subtle hover:text-text"
              onClick={() => onOpenChange(false)}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </dialog>
  );
}
