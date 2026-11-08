"use client";

// Deliberately invalid import for a negative build test, never a product route.
import { parseServerBackendConfig } from "../../../../src/server/config/backend-config";
import { createBackendTransport } from "../../../../src/server/backend/backend-transport";
import { parseServerAuthTokens } from "../../../../src/server/backend/server-auth-tokens";
import { projectProfileDto } from "../../../../src/server/backend/browser-dto";
import { projectBackendDiagnostic } from "../../../../src/server/backend/backend-diagnostic";

export default function InvalidClientPage() {
  const result = parseServerBackendConfig({ NODE_ENV: "test", OMTS_DATA_SOURCE: "mock" });
  const transport = createBackendTransport({ NODE_ENV: "test", OMTS_DATA_SOURCE: "mock" });
  const tokens = parseServerAuthTokens(null);
  const profile = projectProfileDto(null, "invalid");
  const diagnostic = projectBackendDiagnostic("login", { status: "success" });
  return <p>{result.status}:{typeof transport.request}:{tokens.status}:{profile.status}:{diagnostic.event}</p>;
}
