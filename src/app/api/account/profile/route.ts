import { handlePersonalRequest } from "@/server/workspace/personal-http";
export const GET = (request: Request) => handlePersonalRequest(request, "profile");
export const PUT = GET;
