import { connection } from "next/server";
import { handleProducts } from "@/server/products/products-http";
export async function GET(request: Request) { await connection(); return handleProducts(request); }
export const POST = (request: Request) => handleProducts(request);
