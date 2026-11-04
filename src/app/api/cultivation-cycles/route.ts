import { connection } from "next/server";
import { handleCycles, handleCycleWrite } from "@/server/workspace/cycles-http";
export async function GET(request: Request) { await connection(); return handleCycles(request); }
export const POST = handleCycleWrite;
