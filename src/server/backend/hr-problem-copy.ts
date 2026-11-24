import "server-only";
import { projectHrProblem, type HrProblem } from "@/shared/messages/hr-problem";

const MAX_PROBLEM_BYTES = 64 * 1024;
/**
 * The allow-listed part of a failed payroll / attendance answer (message parameters, finalize reasons, totals check).
 * Call with `response.clone()` BEFORE the body is consumed; a body that is not JSON, too large or unreadable gives undefined
 * (the status and message code stay authoritative).
 */
export async function readHrProblem(copy: Response | undefined): Promise<HrProblem | undefined> {
  if (!copy || !copy.headers.get("content-type")?.toLowerCase().includes("json")) return undefined;
  try {
    const text = await copy.text();
    if (text.length > MAX_PROBLEM_BYTES) return undefined;
    return projectHrProblem(JSON.parse(text));
  } catch { return undefined; }
}
