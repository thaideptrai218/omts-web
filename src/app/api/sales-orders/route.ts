import { connection } from "next/server";
import { handleSalesOrders } from "@/server/sales-orders/sales-orders-http";
export async function GET(request: Request) { await connection(); return handleSalesOrders(request); }
export const POST = (request: Request) => handleSalesOrders(request);
