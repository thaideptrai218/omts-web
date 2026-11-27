import { connection } from "next/server";
import { handleVatRates } from "@/server/vat-rates/vat-rates-http";
export async function GET(request: Request) { await connection(); return handleVatRates(request); }
export const POST = (request: Request) => handleVatRates(request);
