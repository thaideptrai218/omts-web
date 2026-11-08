import { parseServerAuthTokens } from "../../../../src/server/backend/server-auth-tokens";
import { projectProfileDto } from "../../../../src/server/backend/browser-dto";
import { projectBackendDiagnostic } from "../../../../src/server/backend/backend-diagnostic";
import { accountId, profileFixture, tokenFixture } from "../../../../src/server/backend/__tests__/serialization-fixtures";
import ReviewClient from "./review-client";

// Isolated static test project only. No Route Handler, real API, key or session.
export default function SerializationFixturePage() {
  const tokens = parseServerAuthTokens(tokenFixture());
  if (tokens.status !== "validated") throw new Error("INVALID_SERIALIZATION_FIXTURE");
  console.info(projectBackendDiagnostic("login", { status: "success", data: tokenFixture() }));
  if (process.env.OMTS_TEST_UNSAFE_DTO === "1") {
    return <ReviewClient dto={tokens.credentials} />;
  }
  const profile = projectProfileDto(profileFixture(), accountId);
  if (profile.status !== "projected") throw new Error("INVALID_PROFILE_FIXTURE");
  return <ReviewClient dto={profile.dto} />;
}
