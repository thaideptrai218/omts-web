import { connection } from "next/server";
import { handleTraderRequests } from "@/server/workspace/trader-requests-http";
export async function GET(request: Request) { await connection(); return handleTraderRequests(request); }
export const POST = handleTraderRequests;
