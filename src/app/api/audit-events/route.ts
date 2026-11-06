import { connection } from "next/server";
import { handleAudit } from "@/server/workspace/audit-http";
export async function GET(request: Request) { await connection(); return handleAudit(request); }
