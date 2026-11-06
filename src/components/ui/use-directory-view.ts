"use client";
import { useCallback, useState, useSyncExternalStore } from "react";

export function useDirectoryView<T extends string>(key: string, initial: T, options: readonly T[]) {
  const allowed = options.join("|");
  const storageKey = `omts-directory-${key}`;
  const [fallback, setFallback] = useState<T>();
  const subscribe = useCallback((changed: () => void) => {
    const onStorage = (event: StorageEvent) => { if (event.key === storageKey) changed(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(storageKey, changed);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(storageKey, changed); };
  }, [storageKey]);
  const snapshot = useCallback(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      return saved && allowed.split("|").includes(saved) ? saved as T : initial;
    } catch { return fallback ?? initial; }
  }, [storageKey, allowed, fallback, initial]);
  const serverSnapshot = useCallback(() => initial, [initial]);
  const view = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  function choose(next: T) {
    try { window.localStorage.setItem(storageKey, next); window.dispatchEvent(new Event(storageKey)); } catch { setFallback(next); }
  }
  return [view, choose] as const;
}
