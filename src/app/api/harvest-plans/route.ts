import { connection } from "next/server";
import { handleHarvestPlans } from "@/server/harvest-plans/harvest-plans-http";
export async function GET(request: Request) { await connection(); return handleHarvestPlans(request); }
export const POST = (request: Request) => handleHarvestPlans(request);
