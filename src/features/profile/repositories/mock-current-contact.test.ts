import { expect, it } from "vitest";
import { createMockPersonalProfileEnvironment } from "./mock-personal-profile-environment";
import { getMockPersonalProfile } from "../mocks/personal-profile-fixtures";

function setup() {
  const profile = getMockPersonalProfile("account-owner-demo")!;
  return createMockPersonalProfileEnvironment({ initialProfile: {
    ...profile, email: { value: "pending@omts.test", isVerified: false },
    phone: { value: "0912345678", isVerified: false },
  }, latencyMs: 0, verification: { latencyMs: 0 } });
}
it.each(["email", "phone"] as const)("verifies the existing %s only on saved proof", async (kind) => {
  const environment = setup(); const loaded = await environment.profileService.load();
  if (loaded.status !== "loaded") throw new Error("Expected profile");
  const contact = loaded.profile[kind]!;
  expect(await environment.profileService.startIdentifierChange({ kind, value: contact.value })).toMatchObject({ status: "invalid-identifier" });
  const started = await environment.profileService.startIdentifierChange({ kind, value: contact.value, intent: "verify-current" });
  if (started.status !== "verification-started") throw new Error("Expected challenge");
  expect(started.message).toBeUndefined();
  const proof = await environment.verificationService.verify({ requestId: started.challenge.requestId, code: "123456" });
  if (proof.status !== "verified") throw new Error("Expected proof");
  expect(await environment.profileService.load()).toEqual(loaded);
  const saved = await environment.profileService.save({ displayName: loaded.profile.displayName, recordVersion: loaded.profile.recordVersion,
    [kind === "email" ? "emailChange" : "phoneChange"]: { value: contact.value, token: proof.token } });
  expect(saved).toMatchObject({ status: "saved", profile: { [kind]: { value: contact.value, isVerified: true } } });
  expect(await environment.profileService.startIdentifierChange({ kind, value: contact.value, intent: "verify-current" })).toMatchObject({ status: "invalid-identifier" });
});
it("rejects a different value under the verify-current intent", async () => {
  const environment = setup();
  expect(await environment.profileService.startIdentifierChange({ kind: "email", value: "different@omts.test", intent: "verify-current" })).toMatchObject({ status: "invalid-identifier" });
});
it("cannot mark an existing contact verified using a forged proof", async () => {
  const environment = setup(); const loaded = await environment.profileService.load();
  if (loaded.status !== "loaded") throw new Error("Expected profile");
  expect(await environment.profileService.save({ displayName: loaded.profile.displayName, recordVersion: loaded.profile.recordVersion,
    emailChange: { value: "pending@omts.test", token: "forged-fixture-proof" } })).toMatchObject({ status: "invalid-change", field: "email" });
  expect(await environment.profileService.load()).toEqual(loaded);
});
