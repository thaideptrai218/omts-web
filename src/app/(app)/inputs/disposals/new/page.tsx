import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { IssueEditorPage } from "@/features/input-issues/issue-editor";
export const instant = false;
export default async function Page({ searchParams }: { searchParams: Promise<{ copy?: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { copy } = await searchParams;
  return <IssueEditorPage key={copy ?? "new"} kind="Disposal" copyFrom={copy} />;
}
