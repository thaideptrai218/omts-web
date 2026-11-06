import { handleApiAuth } from "@/server/auth/api-auth-http";
export const POST = (request: Request) => handleApiAuth(request, "bootstrap");
