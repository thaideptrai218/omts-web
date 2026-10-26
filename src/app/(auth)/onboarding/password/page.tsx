import { OnboardingRouteBoundary } from "@/features/auth/components/onboarding-route-boundary";

export const metadata = { title: "Đổi mật khẩu tạm thời | OMTS" };

export default function PasswordOnboardingPage() {
  return <OnboardingRouteBoundary phase="password-change-required" />;
}
