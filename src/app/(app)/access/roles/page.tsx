import type { Metadata } from "next";
import { RoleManagementExperience } from "@/features/role-management/components/role-management-experience";
import { ApiPage } from "@/features/api-workspace/api-page";
import { ApiResourceScreen } from "@/features/api-workspace/api-resource-screen";

export const metadata: Metadata = {
  title: "Vai trò và quyền hạn | OMTS",
};

export default function RoleManagementPage() {
  return <ApiPage api={<ApiResourceScreen resource="roles" />}><RoleManagementExperience /></ApiPage>;
}
