import { connection } from "next/server";
import { handleDebtRead } from "@/server/workspace/debts-http";
export async function GET(request: Request) { await connection(); return handleDebtRead(request); }
