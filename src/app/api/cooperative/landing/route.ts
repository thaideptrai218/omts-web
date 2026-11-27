import { connection } from "next/server";
import { handleLanding } from "@/server/workspace/landing-http";

export async function GET(request: Request) { await connection(); return handleLanding(request); }
export const POST = handleLanding;
