import { z } from "zod";
import { knownBackendMessageCode } from "@/shared/messages/backend-message-code";

const problemSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_-]{0,63}$/).optional().catch(undefined),
  legacyCode: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/).optional().catch(undefined),
  params: z.record(z.string(), z.union([
    z.string().max(500), z.number().finite(),
  ])).optional().catch(undefined),
  currentRowVersion: z.string().max(1024).optional().catch(undefined),
});

export type ApiProblem = z.infer<typeof problemSchema>;

export function isJsonContentType(contentType: string | null): boolean {
  const mediaType = contentType?.split(";")[0]?.trim() ?? "";
  return /^application\/(?:json|[\w.+-]+\+json)$/i.test(mediaType);
}

export async function readApiProblem(response: Response): Promise<ApiProblem | undefined> {
  if (!isJsonContentType(response.headers.get("content-type"))) return undefined;

  try {
    const raw: unknown = await response.json();
    const parsed = problemSchema.safeParse(raw);
    // Raw detail, stack traces and unrelated top-level fields never leave here.
    const known = knownBackendMessageCode(raw);
    return parsed.success ? { ...parsed.data, ...(known ? { code: known } : {}) } : undefined;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    return undefined;
  }
}

export function readRetryAfterMs(value: string | null, now = Date.now()): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const normalized = value.trim();
  const isSeconds = /^\d+$/.test(normalized);
  const isHttpDate = /^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(normalized);
  if (!isSeconds && !isHttpDate) return undefined;
  const duration = isSeconds ? Number(normalized) * 1000 : Date.parse(normalized) - now;
  return Number.isSafeInteger(duration) ? Math.max(0, duration) : undefined;
}
