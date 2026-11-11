import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { IssueEditorPage } from "@/features/input-issues/issue-editor";
export const instant = false;
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { id } = await params;
  return <IssueEditorPage key={id} kind="Use" id={id} />;
}
