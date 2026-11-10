import { connection } from "next/server";
import { handleRefresh } from "@/server/auth/refresh-http";

export async function GET(request: Request) {
  await connection();
  return handleRefresh(request, "GET");
}

export const POST = (request: Request) => handleRefresh(request, "POST");
