import { connection } from "next/server";
import { handleDeviceSessions } from "@/server/workspace/device-sessions-http";
// A GET-only handler is prerendered unless it opts into request time.
export async function GET(request: Request) { await connection(); return handleDeviceSessions(request, "list"); }
