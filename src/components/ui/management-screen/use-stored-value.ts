"use client";
import { useCallback, useState, useSyncExternalStore } from "react";

/** A per-browser preference. Storage may be blocked: the value then lives in memory for this page. */
export function useStoredValue(storageKey: string, initial: string) {
  const [fallback, setFallback] = useState<string>();
  const subscribe = useCallback((changed: () => void) => {
    const onStorage = (event: StorageEvent) => { if (event.key === storageKey) changed(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(storageKey, changed);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(storageKey, changed); };
  }, [storageKey]);
  const snapshot = useCallback(() => {
    try { return window.localStorage.getItem(storageKey) ?? fallback ?? initial; } catch { return fallback ?? initial; }
  }, [storageKey, fallback, initial]);
  const value = useSyncExternalStore(subscribe, snapshot, () => initial);
  const store = useCallback((next: string) => {
    try { window.localStorage.setItem(storageKey, next); window.dispatchEvent(new Event(storageKey)); } catch { setFallback(next); }
  }, [storageKey]);
  return [value, store] as const;
}
