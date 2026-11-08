import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { CustomerDebtsScreen } from "@/features/customer-debts-api/screen";
export default async function CustomerDebtsPage() {
  await connection();
  if (getSessionGateway().mode !== "api") notFound();
  return <CustomerDebtsScreen />;
}
