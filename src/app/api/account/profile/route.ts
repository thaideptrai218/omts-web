import { handlePersonalRequest } from "@/server/workspace/personal-http";
export const GET = (request: Request) => handlePersonalRequest(request);
export const PUT = GET;
