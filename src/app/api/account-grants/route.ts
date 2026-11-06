import { handleAccountGrantsRequest } from "@/server/workspace/account-grants-http";
import { connection } from "next/server";
export async function GET(request: Request) {
  await connection();
  return handleAccountGrantsRequest(request);
}
