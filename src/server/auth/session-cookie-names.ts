// Pure constants shared by the server runtime and proxy.ts. No server-only import:
// proxy.ts must be able to read them without pulling session configuration in.
export type CookieProfile = "https" | "http-loopback-dev";

export type SessionCookieNames = Readonly<{
  access: string;
  refresh: string;
  refreshPath: string;
  marker: string;
  flow: string;
  flowPath: string;
  device: string;
}>;

const https: SessionCookieNames = Object.freeze({
  access: "__Host-omts_at",
  refresh: "__Secure-omts_rt",
  refreshPath: "/api/auth",
  marker: "__Host-omts_rf",
  flow: "__Secure-omts_vf",
  flowPath: "/api/verifications",
  device: "__Secure-omts_dv",
});
const loopback: SessionCookieNames = Object.freeze({
  access: "omts_at_dev",
  refresh: "omts_rt_dev",
  refreshPath: "/api/auth",
  marker: "omts_rf_dev",
  flow: "omts_vf_dev",
  flowPath: "/api/verifications",
  device: "omts_dv_dev",
});

export function sessionCookieNames(profile: CookieProfile): SessionCookieNames {
  return profile === "https" ? https : loopback;
}
