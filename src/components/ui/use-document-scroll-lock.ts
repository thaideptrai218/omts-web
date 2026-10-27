"use client";

import { useEffect } from "react";

const lockAttribute = "data-omts-scroll-locked";
const locks = new WeakMap<
  Document,
  { count: number; previous: string | null }
>();

export function useDocumentScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const root = document.documentElement;
    let lock = locks.get(document);
    if (!lock) {
      lock = { count: 0, previous: root.getAttribute(lockAttribute) };
      locks.set(document, lock);
      root.setAttribute(lockAttribute, "");
    }
    lock.count += 1;

    return () => {
      lock.count -= 1;
      // A nested confirmation or mobile menu may still own the lock.
      if (lock.count > 0) return;
      if (lock.previous === null) root.removeAttribute(lockAttribute);
      else root.setAttribute(lockAttribute, lock.previous);
      locks.delete(document);
    };
  }, [enabled]);
}
