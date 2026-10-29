import { connection } from "next/server";
import { handleOwnerAccessRead } from "@/server/workspace/account-grants-http";
export async function GET(request: Request) { await connection(); return handleOwnerAccessRead(request, "functions"); }
