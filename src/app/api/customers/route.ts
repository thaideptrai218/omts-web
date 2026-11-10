import { connection } from "next/server";
import { handleCustomers } from "@/server/customers/customers-http";
export async function GET(request: Request) { await connection(); return handleCustomers(request); }
export const POST = (request: Request) => handleCustomers(request);
