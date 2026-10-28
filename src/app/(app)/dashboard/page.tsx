import type { Metadata } from "next";
import { DashboardExperience } from "@/features/dashboard/components/dashboard-experience";
import { ApiPage } from "@/features/api-workspace/api-page";
import { ApiWorkspaceHome } from "@/features/api-workspace/api-workspace-shell";

export const metadata: Metadata = {
  title: "Bảng điều hành | OMTS",
};

// Auth is currently restored on the client, so this protected page cannot join
// the prerendered instant-navigation shell until the server session is defined.
export const instant = false;

export default function DashboardPage() {
  return <ApiPage api={<ApiWorkspaceHome />}><DashboardExperience /></ApiPage>;
}
