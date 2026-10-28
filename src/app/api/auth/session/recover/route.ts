import { handleApiAuth } from "@/server/auth/api-auth-http";

export async function POST(request: Request) {
  return handleApiAuth(request, "recover");
}
