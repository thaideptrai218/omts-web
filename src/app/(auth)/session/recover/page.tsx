import { InvalidSessionRecovery } from "@/features/auth/components/invalid-session-recovery";

export const metadata = { title: "Kiểm tra phiên đăng nhập | OMTS" };

export default function SessionRecoveryPage() {
  return <InvalidSessionRecovery />;
}
