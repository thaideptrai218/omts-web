import { connection } from "next/server";
import { handleSupplierDocuments } from "@/server/workspace/supplier-documents-http";
export async function GET(request: Request) { await connection(); return handleSupplierDocuments(request); }
export const POST = (request: Request) => handleSupplierDocuments(request);
