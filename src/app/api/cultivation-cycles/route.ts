import { connection } from "next/server";
import { handleCycles } from "@/server/workspace/cycles-http";
export async function GET(request: Request) { await connection(); return handleCycles(request); }
