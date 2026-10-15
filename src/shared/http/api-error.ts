import type { AppMessage } from "@/shared/messages/message-catalog";

export class ApiError extends Error {
  readonly appMessage: AppMessage;
  readonly status: number | null;

  constructor(
    status: number | null,
    appMessage: AppMessage,
    options?: ErrorOptions,
  ) {
    const detail = status === null ? "before receiving a response" : `with status ${status}`;

    super(`API request failed ${detail}.`, options);
    this.name = "ApiError";
    this.status = status;
    this.appMessage = appMessage;
  }
}
