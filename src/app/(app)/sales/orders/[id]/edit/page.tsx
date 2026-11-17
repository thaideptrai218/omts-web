import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { OrderEditorPage } from "@/features/sales-orders/order-editor";
export const instant = false;
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  const { id } = await params;
  return <OrderEditorPage key={id} id={id} />;
}
