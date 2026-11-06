import { secretCanaries } from "../../../../tests/fixtures/serialization/canaries.mjs";

export const accountId = "122bb318-a72e-49aa-a8d7-a6169f889007";
export const otherAccountId = "222bb318-a72e-49aa-a8d7-a6169f889007";
export function tokenFixture() {
  return {
    accountId, displayName: "Người dùng fixture", subjectType: "Staff",
    accessToken: secretCanaries[0], refreshToken: secretCanaries[1],
    accessTokenExpiresAt: "2026-10-24T15:00:00Z", refreshTokenExpiresAt: "2026-10-31T15:00:00Z",
    mustChangePassword: true, phoneVerificationRequired: true,
    password: secretCanaries[2], nested: { token: secretCanaries[0] },
  };
}
export function profileFixture() {
  return {
    accountId, username: "fixture.user", displayName: "Tên cá nhân fixture", subjectType: "Staff",
    email: null, emailVerified: false, phoneNumber: null, phoneVerified: false,
    rowVersion: "opaque:version/+1=", accessToken: secretCanaries[0],
    grants: [{ role: "Vai trò fixture", allZones: true, zoneId: null, zoneName: null, refreshToken: secretCanaries[1] }],
  };
}
export { secretCanaries };
