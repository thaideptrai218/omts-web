import { connection } from "next/server";
import { handleReceivingAccount } from "@/server/workspace/receiving-account-http";
export async function GET(request: Request) { await connection(); return handleReceivingAccount(request); }
export const POST = handleReceivingAccount;
