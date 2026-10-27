import "server-only";
import { isJsonContentType, readRetryAfterMs } from "../../shared/http/api-problem";
import { messageCatalog, type MessageCode } from "../../shared/messages/message-catalog";
import type { BackendRequest } from "./backend-request";
import type { BackendTransportResult } from "./backend-result";
import { projectEmployeeProblemMetadata } from "../../features/employee-management/api/employee-problem-metadata";

export const MAX_RESPONSE_BYTES = 1024 * 1024;

function cancelBody(response: Response): void {
  void response.body?.cancel().catch(() => undefined);
}

async function readBoundedJson(response: Response): Promise<unknown> {
  if (!isJsonContentType(response.headers.get("content-type")) || !response.body) {
    cancelBody(response);
    throw new Error("Invalid upstream JSON");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) throw new Error("Upstream body exceeds limit");
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks, length);
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } finally {
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function knownCode(data: unknown): MessageCode | undefined {
  if (typeof data !== "object" || data === null || !("code" in data)) return undefined;
  return typeof data.code === "string" && Object.hasOwn(messageCatalog, data.code)
    ? data.code as MessageCode : undefined;
}

export async function readBackendResponse(response: Response, endpoint: BackendRequest["endpoint"]): Promise<BackendTransportResult> {
  if (response.status >= 300 && response.status < 400) {
    cancelBody(response);
    return { status: "invalid-response" };
  }
  if (response.status === 204) {
    cancelBody(response);
    return endpoint === "logout" ? { status: "success", httpStatus: 204, data: undefined }
      : { status: "invalid-response" };
  }
  if (!response.ok) {
    const retryAfterMs = readRetryAfterMs(response.headers.get("retry-after"));
    // No arbitrary upstream strings/params/headers/cause in failures. MSG06's
    // structured conflict projection is deferred; this layer does not render copy.
    let code: MessageCode | undefined;
    let employeeProblem: ReturnType<typeof projectEmployeeProblemMetadata>;
    try {
      const data = await readBoundedJson(response);
      code = knownCode(data);
      employeeProblem = projectEmployeeProblemMetadata(endpoint, response.status, code, data);
    } catch { /* Status is still authoritative. */ }
    return { status: "http-error", httpStatus: response.status, code, retryAfterMs,
      ...(employeeProblem ? { employeeProblem } : {}) };
  }
  try {
    return { status: "success", httpStatus: response.status, data: await readBoundedJson(response) };
  } catch {
    return { status: "invalid-response" };
  }
}
