/**
 * Update query parameters of the current page in place: `null`/empty removes a key, other parameters stay, the history entry is replaced
 * (no new back-button stop) and the scroll position is untouched. Next.js syncs `window.history.replaceState` with `useSearchParams`
 * (documented shallow routing), so no server round trip happens. Call from event handlers, not during render.
 */
export function replaceUrlParams(updates: Record<string, string | null | undefined>) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(updates)) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  } catch { /* an unusual embedding context: the screen still works, only the shareable URL is not updated */ }
}
