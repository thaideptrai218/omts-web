import { connection } from "next/server";
import { handleCertifications } from "@/server/workspace/certifications-http";
export async function GET(request: Request) { await connection(); return handleCertifications(request); }
export const POST = handleCertifications;
