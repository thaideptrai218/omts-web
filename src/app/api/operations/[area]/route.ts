import { handleOperationRequest } from "@/server/operations/operation-http";
export async function GET(request: Request, context: { params: Promise<{ area: string }> }) {
  return handleOperationRequest(request, (await context.params).area);
}
export async function POST(request: Request, context: { params: Promise<{ area: string }> }) {
  return handleOperationRequest(request, (await context.params).area);
}
