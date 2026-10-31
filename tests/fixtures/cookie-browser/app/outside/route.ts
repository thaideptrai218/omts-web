import { handleFixture } from "../../server";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return handleFixture(request, "probe"); }
