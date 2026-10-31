import { connection } from "next/server";
import { handleInbox } from "@/server/workspace/inbox-http";
export async function GET(request: Request) { await connection(); return handleInbox(request); }
export const POST = handleInbox;
