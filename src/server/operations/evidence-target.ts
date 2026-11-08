import "server-only";
export function localFileTarget(value: unknown, origin: string): URL | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const target = new URL(value, origin);
    return target.origin === origin && !target.username && !target.password && !target.hash && target.pathname.startsWith("/api/files/local/")
      && [...target.searchParams.keys()].every((key) => key === "expires" || key === "sig") ? target : undefined;
  } catch { return undefined; }
}
