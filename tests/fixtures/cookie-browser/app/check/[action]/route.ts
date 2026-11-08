import { handleFixture } from "../../../server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ action: string }> };
async function handle(request: Request, context: Context) {
  return handleFixture(request, (await context.params).action);
}
export { handle as GET, handle as POST, handle as OPTIONS };
