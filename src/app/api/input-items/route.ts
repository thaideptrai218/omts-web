import { connection } from "next/server";
import { handleInputItems } from "@/server/input-items/input-items-http";
export async function GET(request: Request) { await connection(); return handleInputItems(request); }
export const POST = (request: Request) => handleInputItems(request);
