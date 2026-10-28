import { handleSingletonRequest } from "@/server/workspace/singleton-http";
export const GET = (request: Request) => handleSingletonRequest(request, "cooperative");
export const PUT = GET;
