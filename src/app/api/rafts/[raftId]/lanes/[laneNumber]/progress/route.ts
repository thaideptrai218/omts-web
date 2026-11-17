import { handleFarmingRequest } from "@/server/farming/farming-http";

/** Only zoneId is browser supplied. The validated plan owns the upstream path and PUT method. */
export async function PUT(request: Request, context: { params: Promise<{ raftId: string; laneNumber: string }> }) {
  const { raftId, laneNumber } = await context.params;
  const url = new URL(request.url);
  if (url.searchParams.size !== 1 || !url.searchParams.has("zoneId")) return Response.json({ status: "invalid-input", code: "MSG01" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  url.searchParams.set("action", "lane-progress"); url.searchParams.set("id", raftId); url.searchParams.set("laneNumber", laneNumber);
  return handleFarmingRequest(new Request(url, request), "raft-details");
}
