import { OnboardingRouteBoundary } from "@/features/auth/components/onboarding-route-boundary";

export const metadata = { title: "Đổi mật khẩu tạm thời | HTX Trung Nam" };

export default function PasswordOnboardingPage() {
  return <OnboardingRouteBoundary phase="password-change-required" />;
}
