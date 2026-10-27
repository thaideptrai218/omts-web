// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-provider";
import { authService } from "../services/auth-service.instance";
import type { AuthSession, CompleteStaffOnboardingResult } from "../domain/auth-types";
import { randomUUID } from "node:crypto";

vi.mock("../services/auth-service.instance", () => ({ authService: {
  getSession: vi.fn(), changeTemporaryPassword: vi.fn(), completeStaffOnboarding: vi.fn(), logout: vi.fn(),
} }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify: vi.fn() }) }));
const service = vi.mocked(authService);
const authenticated: AuthSession = { status: "authenticated", account: { accountId: "fixture-staff", username: "fixture.staff",
  displayName: "Người kiểm thử", organizationName: null, primaryRoleLabel: "Nhân viên", scopeLabel: "Khu kiểm thử", access: { permissions: [] } } };
beforeEach(() => {
  vi.clearAllMocks();
  service.getSession.mockResolvedValue({ status: "anonymous" });
  service.changeTemporaryPassword.mockResolvedValue({ status: "changed", message: { code: "MSG18" } });
  service.logout.mockResolvedValue(undefined);
});
afterEach(cleanup);

function Host() {
  const auth = useAuth();
  return <><p role="status">{auth.state.status}</p>
    <button onClick={() => void auth.changeTemporaryPassword({ currentPassword: "demo123", newPassword: `${randomUUID()}a1` })}>Đổi mật khẩu</button>
    <button onClick={() => void auth.completeStaffOnboarding({ verificationToken: "fixture-proof" })}>Hoàn tất xác minh</button>
    <button onClick={() => void auth.logout()}>Đăng xuất</button></>;
}

describe("session-gate completion in AuthProvider", () => {
  it("restores an application session only after the repository confirms it", async () => {
    render(<AuthProvider><Host /></AuthProvider>);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("anonymous"));
    service.getSession.mockResolvedValueOnce(authenticated);
    fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("authenticated"));
  });
  it("does not restore a late password-change session after logout", async () => {
    render(<AuthProvider><Host /></AuthProvider>);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("anonymous"));
    let finish!: (session: AuthSession) => void;
    service.getSession.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    await waitFor(() => expect(service.getSession).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
    finish(authenticated);
    await waitFor(() => expect(service.logout).toHaveBeenCalledOnce());
    expect(screen.getByRole("status").textContent).toBe("anonymous");
  });
  it("does not restore a late contact-verification session after logout", async () => {
    render(<AuthProvider><Host /></AuthProvider>);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("anonymous"));
    let finish!: (result: CompleteStaffOnboardingResult) => void;
    service.completeStaffOnboarding.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất xác minh" }));
    fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
    await waitFor(() => expect(service.logout).toHaveBeenCalledOnce());
    await act(async () => { finish({ status: "access-granted", session: authenticated }); });
    expect(screen.getByRole("status").textContent).toBe("anonymous");
  });
  it("accepts a contact-verification session when its operation is still current", async () => {
    service.completeStaffOnboarding.mockResolvedValueOnce({ status: "access-granted", session: authenticated });
    render(<AuthProvider><Host /></AuthProvider>);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("anonymous"));
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất xác minh" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("authenticated"));
  });
});
