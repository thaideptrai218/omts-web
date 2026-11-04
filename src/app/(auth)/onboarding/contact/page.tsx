import { OnboardingRouteBoundary } from "@/features/auth/components/onboarding-route-boundary";

export const metadata = { title: "Xác minh thông tin liên hệ | HTX Trung Nam" };

export default function ContactOnboardingPage() {
  return <OnboardingRouteBoundary phase="contact-verification-required" />;
}
