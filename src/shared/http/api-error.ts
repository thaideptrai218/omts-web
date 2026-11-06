import type { AppMessage } from "@/shared/messages/message-catalog";
import type { ApiProblem } from "@/shared/http/api-problem";

type ApiErrorOptions = ErrorOptions & Readonly<{
  problem?: ApiProblem;
  retryAfterMs?: number;
}>;

export class ApiError extends Error {
  readonly appMessage: AppMessage;
  readonly status: number | null;
  readonly problem?: ApiProblem;
  readonly retryAfterMs?: number;

  constructor(
    status: number | null,
    appMessage: AppMessage,
    options?: ApiErrorOptions,
  ) {
    const detail = status === null ? "before receiving a response" : `with status ${status}`;

    super(`API request failed ${detail}.`, options);
    this.name = "ApiError";
    this.status = status;
    this.appMessage = appMessage;
    this.problem = options?.problem;
    this.retryAfterMs = options?.retryAfterMs;
  }
}
