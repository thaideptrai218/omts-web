import { ApiError } from "@/shared/http/api-error";
import { isJsonContentType, readApiProblem, readRetryAfterMs } from "@/shared/http/api-problem";
import { mapApiError, type ApiErrorContext } from "@/shared/http/map-api-error";
import type { AppMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type FetchImplementation = typeof fetch;

export type ApiClientOptions = Readonly<{
  baseUrl: string;
  fetchImplementation?: FetchImplementation;
  onUnauthorized?: (message: AppMessage) => void;
}>;

export type ApiRequestOptions = RequestInit & Readonly<{
  errorContext?: ApiErrorContext;
}>;

export type ApiClient = Readonly<{
  request<T>(path: string, init?: ApiRequestOptions): Promise<T>;
}>;

function createRequestUrl(baseUrl: string, path: string): URL {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  return new URL(normalizedPath, normalizedBaseUrl);
}

function createRequestHeaders(initialHeaders?: HeadersInit): Headers {
  const headers = new Headers(initialHeaders);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return headers;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function readResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  try {
    const body = await response.text();
    if (!body) return undefined as T;
    if (isJsonContentType(response.headers.get("content-type"))) {
      return JSON.parse(body) as T;
    }
    return body as T;
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError(response.status, { code: "MSG04" }, { cause: error });
  }
}

export function createApiClient({
  baseUrl,
  fetchImplementation = fetch,
  onUnauthorized,
}: ApiClientOptions): ApiClient {
  return {
    async request<T>(path: string, init: ApiRequestOptions = {}): Promise<T> {
      let response: Response;
      const { errorContext = "public", ...fetchInit } = init;

      try {
        response = await fetchImplementation(createRequestUrl(baseUrl, path), {
          ...fetchInit,
          headers: createRequestHeaders(fetchInit.headers),
        });
      } catch (error) {
        if (isAbortError(error)) throw error;

        throw new ApiError(null, { code: "MSG04" }, { cause: error });
      }

      if (!response.ok) {
        const problem = await readApiProblem(response);
        const { expireSession, message } = mapApiError(response.status, errorContext, problem);
        if (expireSession) {
          const expiryMessage = { code: "MSG19" } as const;
          sessionExpiryChannel.publish(expiryMessage);
          try {
            onUnauthorized?.(expiryMessage);
          } catch {
            // Observers must not replace the original HTTP error.
          }
        }
        throw new ApiError(response.status, message, {
          problem,
          retryAfterMs: readRetryAfterMs(response.headers.get("retry-after")),
        });
      }

      return readResponse<T>(response);
    },
  };
}
