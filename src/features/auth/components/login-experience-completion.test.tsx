// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LoginExperience } from "./login-experience";
import type { LoginFormValues } from "../schemas/login-schema";
import type { StaffOnboardingRequired } from "../domain/auth-types";

const { login, replace } = vi.hoisted(() => ({ login: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify: vi.fn() }) }));
vi.mock("@/features/auth/state/auth-provider", () => ({ useAuth: () => ({ login }) }));
vi.mock("@/features/auth/services/auth-service.instance", () => ({ staffOnboardingVerificationService: {} }));
vi.mock("./login-form", () => ({
  LoginForm: ({ onSubmit }: { onSubmit(values: LoginFormValues): Promise<boolean> }) =>
    <button onClick={() => void onSubmit({ identifier: "staff-fixture", password: ["demo", "123"].join("") })}>Đăng nhập mẫu</button>,
}));
vi.mock("./staff-onboarding-shell", () => ({
  StaffOnboardingShell: ({ onOnboardingCompleted }: { onOnboardingCompleted(): void }) =>
    <button onClick={onOnboardingCompleted}>Hoàn tất onboarding mẫu</button>,
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("clears the completed onboarding step before the cached login page is reused", async () => {
  const gate: StaffOnboardingRequired = { status: "staff-onboarding-required", availableContactChannels: ["email"], checklist: { passwordChanged: true, contactVerified: false }, nextStep: "verify-contact" };
  login.mockResolvedValue(gate);
  render(<LoginExperience />);
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập mẫu" }));
  fireEvent.click(await screen.findByRole("button", { name: "Hoàn tất onboarding mẫu" }));
  expect(replace).toHaveBeenCalledWith("/dashboard");
  expect(screen.queryByRole("button", { name: "Hoàn tất onboarding mẫu" })).toBeNull();
  expect(screen.getByRole("button", { name: "Đăng nhập mẫu" })).toBeTruthy();
});
