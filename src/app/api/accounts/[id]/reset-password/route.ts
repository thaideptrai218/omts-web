import { handleAccountResetPassword } from "@/server/workspace/account-reset-password-http";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleAccountResetPassword(request, (await context.params).id);
}
