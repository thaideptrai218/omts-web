import { handleResourceRequest } from "@/server/workspace/resource-http";
async function handle(request: Request, context: { params: Promise<{ resource: string }> }) {
  return handleResourceRequest(request, (await context.params).resource);
}
export const GET = handle;
export const POST = handle;
