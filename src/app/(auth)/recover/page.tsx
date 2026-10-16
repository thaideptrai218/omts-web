import type { Metadata } from "next";

import { RecoveryExperience } from "@/features/account-recovery/components/recovery-experience";

export const metadata: Metadata = {
  title: "Khôi phục tài khoản | OMTS",
};

export default function RecoverPage() {
  return <RecoveryExperience />;
}
