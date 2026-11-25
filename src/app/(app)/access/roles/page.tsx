import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { RoleManagementExperience } from "@/features/role-management/components/role-management-experience";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";

export const metadata: Metadata = {
  title: "Vai trò và quyền hạn",
};
export const instant = false;

/** With the real API this address forwards to /workspace/roles, which opens the Nhân viên screen (roles are read from an employee's login tab); the mock data source keeps its demo screen. */
export default async function RoleManagementPage() {
  await connection();
  if (getSessionGateway().mode === "mock") return <RoleManagementExperience />;
  redirect("/workspace/roles");
}
