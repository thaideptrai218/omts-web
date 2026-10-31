import { ApiSecurityGate } from "@/features/auth/components/api-security-gate";
import { ApiPage } from "@/features/api-workspace/api-page";
export default function AccountSecurityPage() {
  return <ApiPage api={<ApiSecurityGate phase="password-change-required" forced={false} />}><p>Vui lòng đổi mật khẩu trong hồ sơ cá nhân.</p></ApiPage>;
}
