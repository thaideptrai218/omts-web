import { connection } from "next/server";
import { handleCultivationLogs } from "@/server/workspace/cultivation-logs-http";
export async function GET(request: Request) { await connection(); return handleCultivationLogs(request); }
export const POST = handleCultivationLogs;
