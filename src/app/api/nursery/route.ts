import { handleNurseryRequest } from "@/server/nursery/nursery-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleNurseryRequest;
export const POST = handleNurseryRequest;
