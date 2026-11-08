import { connection } from "next/server";
import { handleAdmin } from "@/server/workspace/admin-http";
export async function GET(request: Request) { await connection(); return handleAdmin(request); }
export async function POST(request: Request) { await connection(); return handleAdmin(request); }
