"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** A separate native top layer avoids clipping and makes the underlying editor inert, including inside a modal. */
export function LocationPickerOverlay({ children, onClose }: { children: ReactNode; onClose(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);
  return createPortal(<dialog ref={dialog} aria-label="Chọn vị trí toàn cảnh"
    className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-surface p-3 text-text"
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}
    onKeyDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
    {children}
  </dialog>, document.body);
}
