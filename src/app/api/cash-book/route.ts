import { connection } from "next/server";
import { handleCashBook } from "@/server/cash-book/cash-book-http";
export async function GET(request: Request) { await connection(); return handleCashBook(request); }
export const POST = (request: Request) => handleCashBook(request);
