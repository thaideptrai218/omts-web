import { ApiError } from "@/shared/http/api-error";
import type { AppMessage } from "@/shared/messages/message-catalog";

type FetchImplementation = typeof fetch;

export type ApiClientOptions = Readonly<{
  baseUrl: string;
  fetchImplementation?: FetchImplementation;
  onUnauthorized?: (message: AppMessage) => void;
}>;

export type ApiClient = Readonly<{
  request<T>(path: string, init?: RequestInit): Promise<T>;
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

  const body = await response.text();
  if (!body) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(body) as T;
    } catch (error) {
      throw new ApiError(response.status, { code: "MSG04" }, { cause: error });
    }
  }

  return body as T;
}

export function createApiClient({
  baseUrl,
  fetchImplementation = fetch,
  onUnauthorized,
}: ApiClientOptions): ApiClient {
  return {
    async request<T>(path: string, init?: RequestInit): Promise<T> {
      let response: Response;

      try {
        response = await fetchImplementation(createRequestUrl(baseUrl, path), {
          ...init,
          headers: createRequestHeaders(init?.headers),
        });
      } catch (error) {
        if (isAbortError(error)) throw error;

        throw new ApiError(null, { code: "MSG04" }, { cause: error });
      }

      if (response.status === 401) {
        const message = { code: "MSG19" } as const;
        onUnauthorized?.(message);
        throw new ApiError(response.status, message);
      }

      if (!response.ok) {
        throw new ApiError(response.status, { code: "MSG04" });
      }

      return readResponse<T>(response);
    },
  };
}
