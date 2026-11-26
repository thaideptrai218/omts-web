import "server-only";

const LOCAL_PREFIX = "/api/files/local/";
// Query names a presigned S3/R2 GET carries (X-Amz-Algorithm, -Credential, -Date, -Expires, -SignedHeaders, -Signature, ...).
const AMZ_PARAM = /^X-Amz-[A-Za-z-]{1,32}$/u;

/**
 * The private R2 bucket the backend signs file links for, from OMTS_FILE_STORAGE_ORIGIN
 * (https://<account>.r2.cloudflarestorage.com/<bucket>). Returns the origin and "/<bucket>/", or undefined when unset or
 * malformed, so a missing setting only hides R2 files instead of letting the BFF fetch from any host.
 */
export function fileStoragePrefix(environment: Readonly<Record<string, unknown>> = process.env): Readonly<{ origin: string; path: string }> | undefined {
  const raw = environment.OMTS_FILE_STORAGE_ORIGIN;
  if (typeof raw !== "string" || !/^https:\/\/[^/?#\\\s@%]+\/[a-z0-9][a-z0-9-]{1,62}\/?$/u.test(raw)) return undefined;
  try {
    const url = new URL(raw);
    return { origin: url.origin, path: `${url.pathname.replace(/\/$/u, "")}/` };
  } catch { return undefined; }
}

/** Object key of a backend file link (Local download path or presigned R2 link), e.g. "harvest-lot-photos/2026/11/x.jpg". */
export function storedFileKey(target: URL, origin: string, environment: Readonly<Record<string, unknown>> = process.env): string | undefined {
  if (target.username || target.password || target.hash) return undefined;
  const keys = [...target.searchParams.keys()];
  let rest: string | undefined;
  if (target.origin === origin && target.pathname.startsWith(LOCAL_PREFIX)) {
    if (keys.every((key) => key === "expires" || key === "sig")) rest = target.pathname.slice(LOCAL_PREFIX.length);
  } else {
    const storage = fileStoragePrefix(environment);
    if (storage && target.origin === storage.origin && target.pathname.startsWith(storage.path) && keys.length > 0 && keys.every((key) => AMZ_PARAM.test(key))) {
      rest = target.pathname.slice(storage.path.length);
    }
  }
  return rest && !rest.split("/").some((part) => part === "" || /^\.+$/u.test(part)) ? rest : undefined;
}

/** Accepts only backend file links the BFF may fetch: Local downloads on the backend origin, or presigned links into the configured R2 bucket. */
export function localFileTarget(value: unknown, origin: string, environment: Readonly<Record<string, unknown>> = process.env): URL | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const target = new URL(value, origin);
    return storedFileKey(target, origin, environment) ? target : undefined;
  } catch { return undefined; }
}
