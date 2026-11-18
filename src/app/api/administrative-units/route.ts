import { connection } from "next/server";
import { handleAdministrativeUnits } from "@/server/address/address-http";
export async function GET(request: Request) { await connection(); return handleAdministrativeUnits(request); }
