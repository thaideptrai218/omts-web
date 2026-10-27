"use client";

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useDocumentScrollLock } from "./use-document-scroll-lock";

type DialogProps = Readonly<{
  children: ReactNode;
  description?: string;
  dismissible?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onOpenChange(open: boolean): void;
  open: boolean;
  size?: "md" | "lg" | "xl";
  title: string;
}>;

const dialogWidthStyles = {
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-6xl",
} as const;

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
  size = "md",
  title,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useDocumentScrollLock(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    let focusTimer: number | undefined;

    if (open) {
      if (!dialog.open) dialog.showModal();
      focusTimer = window.setTimeout(() => {
        const focusTarget =
          initialFocusRef?.current ??
          dialog.querySelector<HTMLElement>("[data-dialog-initial-focus]");
        focusTarget?.focus();
      }, 0);
    }
    if (!open && dialog.open) dialog.close();

    return () => {
      if (focusTimer !== undefined) window.clearTimeout(focusTimer);
    };
  }, [initialFocusRef, open]);

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] ${dialogWidthStyles[size]} overflow-y-auto overscroll-contain rounded-card border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-[1px] open:motion-safe:animate-[omts-dialog-enter_220ms_cubic-bezier(0.22,1,0.36,1)_both] max-sm:m-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-none max-sm:rounded-none`}
      onCancel={(event) => {
        event.preventDefault();
        // React also propagates cancel to ancestor dialogs. Escape belongs only
        // to the topmost dialog; closing its parent would discard the editor.
        event.stopPropagation();
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
