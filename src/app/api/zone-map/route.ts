import { connection } from "next/server";
import { handleZoneMap } from "@/server/farming/zone-map-http";
export async function GET(request: Request) { await connection(); return handleZoneMap(request); }
