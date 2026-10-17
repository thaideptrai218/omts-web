import type { Metadata } from "next";
import { RoleManagementExperience } from "@/features/role-management/components/role-management-experience";

export const metadata: Metadata = {
  title: "Vai trò và quyền hạn | OMTS",
};

export default function RoleManagementPage() {
  return <RoleManagementExperience />;
}
