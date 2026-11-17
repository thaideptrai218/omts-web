import "server-only";
import { projectFarmingProblem, type FarmingProblem } from "@/features/cultivation-api/farming-problem";

const MAX_PROBLEM_BYTES = 64 * 1024;
/**
 * The allow-listed part of a failed Nuôi trồng answer. Call with `response.clone()` BEFORE readBackendResponse consumes the body;
 * a body that is not JSON, too large or unreadable gives undefined (the status and message code stay authoritative).
 */
export async function readFarmingProblem(copy: Response | undefined): Promise<FarmingProblem | undefined> {
  if (!copy || !copy.headers.get("content-type")?.toLowerCase().includes("json")) return undefined;
  try {
    const text = await copy.text();
    if (text.length > MAX_PROBLEM_BYTES) return undefined;
    return projectFarmingProblem(JSON.parse(text));
  } catch { return undefined; }
}
