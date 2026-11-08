import {connection} from "next/server";
import {handleCustomerDebtRead} from "@/server/workspace/customer-debts-http";
export async function GET(request:Request){await connection();return handleCustomerDebtRead(request);}
