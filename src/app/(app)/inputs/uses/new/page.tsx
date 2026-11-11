import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { IssueEditorPage } from "@/features/input-issues/issue-editor";
export const instant = false;
export default async function Page({ searchParams }: { searchParams: Promise<{ copy?: string; item?: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { copy, item } = await searchParams;
  return <IssueEditorPage key={copy ?? item ?? "new"} kind="Use" copyFrom={copy} itemId={item} />;
}
