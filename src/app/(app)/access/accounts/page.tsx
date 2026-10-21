import { AccountManagementExperience } from "@/features/account-management/components/account-management-experience";

// Auth is currently restored on the client, so this protected page cannot join
// the prerendered instant-navigation shell until the server session is defined.
export const instant = false;

export default function AccountManagementPage() {
  return <AccountManagementExperience />;
}
