import { connection } from "next/server";
import { handleRaftPage } from "@/server/farming/raft-page-http";
export async function GET(request: Request) { await connection(); return handleRaftPage(request); }
