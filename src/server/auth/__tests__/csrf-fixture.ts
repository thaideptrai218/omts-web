import { createCsrfGuard, type CsrfMutationPolicy } from "../csrf-guard";

export const environment = {
  NODE_ENV: "test", OMTS_WEB_ORIGIN: "https://web.example.test", OMTS_WEB_COOKIE_PROFILE: "https",
};
export const loginPolicy = { method: "POST", body: "json", maxBytes: 65_536, timeoutMs: 5000 } satisfies CsrfMutationPolicy;
export const logoutPolicy = { method: "POST", body: "none", timeoutMs: 5000 } satisfies CsrfMutationPolicy;
export function guard(env: Readonly<Record<string, unknown>> = environment) {
  const result = createCsrfGuard(env);
  if (result.status !== "available") throw new Error("Unexpected fake guard config");
  return result.guard;
}
export function mutation(init: RequestInit = {}) {
  const headers = new Headers({ Origin: environment.OMTS_WEB_ORIGIN, "X-OMTS-Request": "web", "Content-Type": "application/json" });
  if (init.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  return new Request(environment.OMTS_WEB_ORIGIN + "/fake-mutation", {
    method: "POST", body: "{}", ...init, headers,
  });
}
export function streamed(chunks: readonly Uint8Array[], headers: HeadersInit = {}) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); },
  });
  return mutation({ body, duplex: "half", headers } as RequestInit);
}
