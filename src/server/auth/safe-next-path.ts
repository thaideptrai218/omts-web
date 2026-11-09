// A same-origin relative path or nothing. Anything else (absolute URL, protocol-relative, backslash
// tricks, control characters, the API surface itself) falls back to the default.
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || value.length > 2048) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "http://omts.invalid");
    // Dot segments are resolved by the parser ("/.//x" becomes "//x"), so the normalised path is checked again.
    if (url.origin !== "http://omts.invalid" || url.pathname.startsWith("//") || url.pathname.includes("\\")
      || url.pathname.startsWith("/api/") || url.pathname === "/api") return fallback;
    return `${url.pathname}${url.search}`;
  } catch { return fallback; }
}
