import "server-only";
import { z } from "zod";
import { backendEndpointSchema } from "./backend-endpoint";

const outcome = z.enum([
  "success", "http-error", "disabled", "invalid-config", "invalid-request", "invalid-response", "timeout", "unavailable",
]);
const resultSchema = z.object({ status: outcome, httpStatus: z.number().int().min(100).max(599).optional() });

// Deliberately accepts no context/headers/body/Error bag. The caller can send
// this projection to a logger later; no production logging sink is selected here.
export function projectBackendDiagnostic(target: unknown, result: unknown) {
  try {
    const parsedTarget = backendEndpointSchema.safeParse(target);
    const parsedResult = resultSchema.safeParse(result);
    if (!parsedTarget.success || !parsedResult.success) return Object.freeze({ event: "backend-request", outcome: "invalid-diagnostic" });
    const { status, httpStatus } = parsedResult.data;
    return Object.freeze({ event: "backend-request", endpoint: parsedTarget.data, outcome: status,
      ...(status === "http-error" && httpStatus !== undefined ? { httpStatus } : {}) });
  } catch {
    return Object.freeze({ event: "backend-request", outcome: "invalid-diagnostic" });
  }
}
