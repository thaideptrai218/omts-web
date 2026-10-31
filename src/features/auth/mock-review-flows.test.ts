import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });
async function finish<T>(pending: Promise<T>): Promise<T> { await vi.runAllTimersAsync(); return pending; }
const nextPassword = () => `${randomUUID()}a1`;

async function services() {
  const { authService } = await import("./services/auth-service.instance");
  const { getAccountSecurityService } = await import("@/features/account-security/services/account-security-service.instance");
  const { mockAccountRecoveryEnvironment } = await import("@/features/account-recovery/services/account-recovery-service.instance");
  return { authService, security: getAccountSecurityService("account-owner-demo"), recovery: mockAccountRecoveryEnvironment };
}

describe("review-ready mock flows use the same account credentials", () => {
  it("uses a changed password on the next login and refuses the old password", async () => {
    const h = await services(); const password = nextPassword();
    await finish(h.authService.login({ identifier: "owner", password: "demo123" }));
    expect(await finish(h.security.changeWithCurrentPassword({ currentPassword: "demo123", newPassword: password }))).toMatchObject({ status: "changed" });
    await finish(h.authService.logout());
    expect(await finish(h.authService.login({ identifier: "owner", password: "demo123" }))).toMatchObject({ status: "rejected" });
    expect(await finish(h.authService.login({ identifier: "owner", password }))).toMatchObject({ status: "access-granted" });
    expect(await finish(h.authService.login({ identifier: "owner@omts.test", password }))).toMatchObject({ status: "access-granted" });
  });

  it("resets the verified recipient's password and shares it with normal password change", async () => {
    const h = await services(); const password = nextPassword();
    const start = await finish(h.recovery.accountRecoveryService.start({ channel: "email", identifier: "owner@omts.test" }));
    const proof = await finish(h.recovery.verificationService.verify({ code: "123456", requestId: start.challenge.requestId }));
    if (proof.status !== "verified") throw new Error("Expected proof");
    expect(await finish(h.recovery.accountRecoveryService.resetPassword({ verificationToken: proof.token, newPassword: password }))).toMatchObject({ status: "password-reset" });
    expect(await finish(h.authService.login({ identifier: "owner", password }))).toMatchObject({ status: "access-granted" });
    expect(await finish(h.security.changeWithCurrentPassword({ currentPassword: "demo123", newPassword: nextPassword() }))).toMatchObject({ reason: "invalid-current-password" });
    expect(await finish(h.security.changeWithCurrentPassword({ currentPassword: password, newPassword: nextPassword() }))).toMatchObject({ status: "changed" });
  });

  it("does not reset Owner through a proof issued for another recipient", async () => {
    const h = await services();
    const start = await finish(h.recovery.accountRecoveryService.start({ channel: "email", identifier: "unknown@omts.test" }));
    const proof = await finish(h.recovery.verificationService.verify({ code: "123456", requestId: start.challenge.requestId }));
    if (proof.status !== "verified") throw new Error("Expected mock proof");
    await finish(h.recovery.accountRecoveryService.resetPassword({ verificationToken: proof.token, newPassword: nextPassword() }));
    expect(await finish(h.authService.login({ identifier: "owner", password: "demo123" }))).toMatchObject({ status: "access-granted" });
  });

  it("keeps the saved personal name after logout/login", async () => {
    const h = await services();
    const { getPersonalProfileEnvironment } = await import("@/features/profile/services/personal-profile-service.instance");
    const environment = getPersonalProfileEnvironment("account-owner-demo")!;
    const loaded = await finish(environment.profileService.load());
    if (loaded.status !== "loaded") throw new Error("Expected profile");
    await finish(environment.profileService.save({ displayName: "Lê Minh Hải cập nhật", recordVersion: loaded.profile.recordVersion }));
    await finish(h.authService.logout());
    expect(await finish(h.authService.login({ identifier: "owner", password: "demo123" })))
      .toMatchObject({ session: { account: { displayName: "Lê Minh Hải cập nhật" } } });
  });

  it("activates a new email only after verified save and retires the old login alias", async () => {
    const h = await services();
    const { getPersonalProfileEnvironment } = await import("@/features/profile/services/personal-profile-service.instance");
    const environment = getPersonalProfileEnvironment("account-owner-demo")!;
    const loaded = await finish(environment.profileService.load());
    if (loaded.status !== "loaded") throw new Error("Expected profile");
    const value = "owner.review@omts.test";
    const start = await finish(environment.profileService.startIdentifierChange({ kind: "email", value }));
    if (start.status !== "verification-started") throw new Error("Expected challenge");
    expect(await finish(h.authService.login({ identifier: value, password: "demo123" }))).toMatchObject({ status: "rejected" });
    const proof = await finish(environment.verificationService.verify({ code: "123456", requestId: start.challenge.requestId }));
    if (proof.status !== "verified") throw new Error("Expected proof");
    await finish(environment.profileService.save({ displayName: loaded.profile.displayName, recordVersion: loaded.profile.recordVersion,
      emailChange: { value, token: proof.token } }));
    expect(await finish(h.authService.login({ identifier: "owner@omts.test", password: "demo123" }))).toMatchObject({ status: "rejected" });
    expect(await finish(h.authService.login({ identifier: value, password: "demo123" }))).toMatchObject({ status: "access-granted" });
  });

  it("does not let a profile take another demo account's verified contact", async () => {
    await services();
    const { getPersonalProfileEnvironment } = await import("@/features/profile/services/personal-profile-service.instance");
    const environment = getPersonalProfileEnvironment("account-owner-demo")!;
    expect(await finish(environment.profileService.startIdentifierChange({ kind: "email", value: "an.nguyen@omts.test" })))
      .toMatchObject({ status: "invalid-identifier" });
  });

  it.each(["email", "phone"] as const)("completes Staff onboarding with %s only and keeps its password coherent", async (channel) => {
    const h = await services(); const password = nextPassword();
    const { staffOnboardingVerificationService } = await import("./services/auth-service.instance");
    expect(await finish(h.authService.login({ identifier: "staff-first-login", password: "demo123" })))
      .toMatchObject({ nextStep: "change-temporary-password" });
    await finish(h.authService.changeTemporaryPassword({ currentPassword: "demo123", newPassword: password }));
    const start = await finish(h.authService.startStaffContactVerification(channel));
    if (start.status !== "started") throw new Error("Expected challenge");
    const proof = await finish(staffOnboardingVerificationService.verify({ code: "123456", requestId: start.challenge.requestId }));
    if (proof.status !== "verified") throw new Error("Expected proof");
    const completed = await finish(h.authService.completeStaffOnboarding({ verificationToken: proof.token }));
    if (completed.status !== "access-granted") throw new Error("Expected session");
    const { getPersonalProfileEnvironment } = await import("@/features/profile/services/personal-profile-service.instance");
    const profile = await finish(getPersonalProfileEnvironment(completed.session.account.accountId)!.profileService.load());
    expect(profile).toMatchObject({ profile: { email: { isVerified: channel === "email" }, phone: { isVerified: channel === "phone" } } });
    await finish(h.authService.logout());
    expect(await finish(h.authService.login({ identifier: channel === "email" ? "nhanvien@omts.test" : "0903454567", password })))
      .toMatchObject({ status: "access-granted" });
  });

  it("runs Owner-created account through first login, verification, profile and account locking", async () => {
    const h = await services();
    const { accountManagementService } = await import("@/features/account-management/services/account-management-service.instance");
    const created = await finish(accountManagementService.save({ id: null, recordVersion: null,
      fullName: "Nhân viên chạy demo", email: "new.staff@omts.test", phone: "0903111222", deliveryChannel: "email",
      newGrants: [{ key: "first", roleId: "role-accountant", zoneId: "zone-south", effectiveFrom: "2026-01-01", effectiveTo: "" }] }));
    if (created.status !== "saved") throw new Error("Expected account");
    const username = created.account.username;
    expect(await finish(h.authService.login({ identifier: username, password: "demo123" })))
      .toMatchObject({ status: "staff-onboarding-required", nextStep: "change-temporary-password" });
    const password = nextPassword();
    await finish(h.authService.changeTemporaryPassword({ currentPassword: "demo123", newPassword: password }));
    const start = await finish(h.authService.startStaffContactVerification("email"));
    if (start.status !== "started") throw new Error("Expected challenge");
    const { staffOnboardingVerificationService } = await import("./services/auth-service.instance");
    const proof = await finish(staffOnboardingVerificationService.verify({ code: "123456", requestId: start.challenge.requestId }));
    if (proof.status !== "verified") throw new Error("Expected proof");
    const result = await finish(h.authService.completeStaffOnboarding({ verificationToken: proof.token }));
    if (result.status !== "access-granted") throw new Error("Expected access");
    expect(result.session.account).toMatchObject({ accountId: created.account.id, displayName: created.account.displayName,
      primaryRoleLabel: "Kế toán", scopeLabel: "Khu Nam" });
    expect(result.session.account.access.permissions.some((entry) => entry.key === "access.accounts.manage")).toBe(false);
    const { getPersonalProfileEnvironment } = await import("@/features/profile/services/personal-profile-service.instance");
    expect(await finish(getPersonalProfileEnvironment(created.account.id)!.profileService.load()))
      .toMatchObject({ profile: { username, email: { isVerified: true }, phone: { isVerified: false } } });
    await finish(accountManagementService.changeStatus({ accountId: created.account.id, action: "lock", confirmed: true, reason: "Kiểm thử khóa tài khoản" }));
    expect(await finish(h.authService.getSession())).toEqual({ status: "anonymous" });
    expect(await finish(h.authService.login({ identifier: username, password }))).toMatchObject({ status: "rejected", message: { code: "MSG13" } });
  });

  it("resets an existing Staff credential, invalidates its session and requires only the outstanding password step", async () => {
    const h = await services();
    const { accountManagementService } = await import("@/features/account-management/services/account-management-service.instance");
    const { getAccountSecurityService } = await import("@/features/account-security/services/account-security-service.instance");
    const first = await finish(h.authService.login({ identifier: "nguyen.an", password: "demo123" }));
    if (first.status !== "access-granted") throw new Error("Expected staff");
    const previousPassword = nextPassword();
    await finish(getAccountSecurityService(first.session.account.accountId).changeWithCurrentPassword({ currentPassword: "demo123", newPassword: previousPassword }));
    await finish(accountManagementService.resetPassword({ accountId: first.session.account.accountId, confirmed: true }));
    expect(await finish(h.authService.getSession())).toEqual({ status: "anonymous" });
    expect(await finish(h.authService.login({ identifier: "nguyen.an", password: previousPassword }))).toMatchObject({ status: "rejected" });
    expect(await finish(h.authService.login({ identifier: "nguyen.an", password: "demo123" })))
      .toMatchObject({ nextStep: "change-temporary-password", checklist: { contactVerified: true } });
    await finish(h.authService.changeTemporaryPassword({ currentPassword: "demo123", newPassword: nextPassword() }));
    expect(await finish(h.authService.getSession())).toMatchObject({ status: "authenticated", account: { username: "nguyen.an" } });
  });

  it("requires contact verification after Owner changes both contacts and refuses the old phone alias", async () => {
    const h = await services();
    const { accountManagementService } = await import("@/features/account-management/services/account-management-service.instance");
    await finish(h.authService.login({ identifier: "nguyen.an", password: "demo123" }));
    await finish(h.authService.logout());
    const workspace = await finish(accountManagementService.load());
    if (workspace.status !== "loaded") throw new Error("Expected workspace");
    const row = workspace.workspace.accounts.find((account) => account.username === "nguyen.an")!;
    await finish(accountManagementService.save({ id: row.id, fullName: row.displayName, email: "changed@omts.test", phone: "0903555666",
      deliveryChannel: "email", recordVersion: row.recordVersion, newGrants: [] }));
    expect(await finish(h.authService.login({ identifier: "0901234567", password: "demo123" }))).toMatchObject({ status: "rejected" });
    expect(await finish(h.authService.login({ identifier: "nguyen.an", password: "demo123" })))
      .toMatchObject({ nextStep: "verify-contact", checklist: { passwordChanged: true, contactVerified: false } });
  });
});
