import { handlePersonalRequest } from "@/server/workspace/personal-http";
export const GET = (request: Request) => handlePersonalRequest(request, "notifications");
export const PUT = GET;
