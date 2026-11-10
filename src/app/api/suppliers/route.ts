import { connection } from "next/server";
import { handleSuppliers } from "@/server/suppliers/suppliers-http";
export async function GET(request: Request) { await connection(); return handleSuppliers(request); }
export const POST = (request: Request) => handleSuppliers(request);
