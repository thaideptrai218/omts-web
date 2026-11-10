import { connection } from "next/server";
import { handlePurchases } from "@/server/purchases/purchases-http";
export async function GET(request: Request) { await connection(); return handlePurchases(request); }
export const POST = (request: Request) => handlePurchases(request);
