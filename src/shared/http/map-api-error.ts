import {
  messageCatalog,
  type AppMessage,
  type MessageCode,
  type MessageParams,
} from "@/shared/messages/message-catalog";
import type { ApiProblem } from "@/shared/http/api-problem";

export type ApiErrorContext = "public" | "login" | "protected" | "profile" | "refresh";

const codesByStatus: Readonly<Record<number, readonly string[]>> = {
  400: ["MSG01", "MSG16", "MSG17", "MSG20"],
  403: ["MSG02", "MSG13", "MSG67", "MSG68"],
  409: ["MSG03", "MSG06"],
  423: ["MSG69"],
};

function hasMessageCode(code: string): code is MessageCode {
  return Object.hasOwn(messageCatalog, code);
}

function messageFromProblem(status: number, problem?: ApiProblem): AppMessage {
  const code = problem?.code;
  if (!code || !hasMessageCode(code) || !codesByStatus[status]?.includes(code)) {
    return { code: "MSG04" };
  }

  const placeholders = [...messageCatalog[code].matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)];
  const params: MessageParams = {};
  for (const match of placeholders) {
    const key = match[1];
    const value = problem?.params?.[key];
    if (value === undefined || (typeof value === "string" && !value.trim())) {
      // Keep the wire code on ApiError.problem; never fabricate missing parameters.
      return { code: "MSG04" };
    }
    params[key] = value;
  }
  return placeholders.length ? { code, params } : { code };
}

export function mapApiError(status: number, context: ApiErrorContext, problem?: ApiProblem) {
  const expireSession = status === 401 && (context === "protected" || context === "profile");
  if (expireSession || (status === 401 && context === "refresh")) {
    return { expireSession, message: { code: "MSG19" } as const };
  }
  if (status === 401 && context === "login" && problem?.code === "MSG12") {
    return { expireSession: false, message: { code: "MSG12" } as const };
  }
  return { expireSession: false, message: messageFromProblem(status, problem) };
}
