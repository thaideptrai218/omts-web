import { connection } from "next/server";
import { handleTaxLookup } from "@/server/address/address-http";
export async function GET(request: Request) { await connection(); return handleTaxLookup(request); }
