import { handleSingletonRequest } from "@/server/workspace/singleton-http";
export const GET = (request: Request) => handleSingletonRequest(request, "profile");
export const PUT = GET;
