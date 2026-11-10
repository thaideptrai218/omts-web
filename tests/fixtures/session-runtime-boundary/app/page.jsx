"use client";

// Deliberately invalid imports for a negative build test, never a product route.
import { parseServerSessionKeyring } from "../../../../src/server/auth/session-keyring-config";
import { loadApplicationContext } from "../../../../src/server/auth/application-context-dal";
import { guardFunctionCapability } from "../../../../src/server/auth/function-capability-guard";

export default function InvalidSessionRuntimeClientPage() {
  const keyring = parseServerSessionKeyring({});
  const context = loadApplicationContext({ status: "unavailable" }, { request: async () => ({ status: "unavailable" }) });
  const capability = guardFunctionCapability({ access: { permissions: [] }, functionPermissions: [] }, null);
  return <p>{keyring.status}:{typeof context}:{capability.status}</p>;
}
