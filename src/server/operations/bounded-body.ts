import "server-only";

export async function readBoundedBytes(body: ReadableStream<Uint8Array> | null, signal: AbortSignal, maxBytes: number, timeoutMs: number): Promise<Uint8Array> {
  if (!body || signal.aborted) throw new Error("Body unavailable");
  const reader = body.getReader();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let onAbort = () => {};
  try {
    const interrupted = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("Body deadline")), timeoutMs);
      onAbort = () => reject(new Error("Body cancelled"));
      signal.addEventListener("abort", onAbort, { once: true });
    });
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), interrupted]);
      if (signal.aborted) throw new Error("Body cancelled");
      if (done) return Buffer.concat(chunks, size);
      size += value.byteLength;
      if (size > maxBytes) throw new Error("Body too large");
      chunks.push(value);
    }
  } finally {
    clearTimeout(timeout); signal.removeEventListener("abort", onAbort);
    void reader.cancel().catch(() => undefined); reader.releaseLock();
  }
}

export async function readOperationUpload(request: Request, photo: boolean) {
  const maxBytes = (photo ? 12 : 105) * 1024 * 1024;
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data;\s*boundary=/i.test(contentType) || request.headers.has("content-encoding")) return undefined;
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d{1,12}$/.test(length) || Number(length) > maxBytes)) return undefined;
  try {
    const bytes = await readBoundedBytes(request.body, request.signal, maxBytes, 20_000);
    const form = await new Response(bytes as BodyInit, { headers: { "Content-Type": contentType } }).formData();
    const field = photo ? "photo" : "files";
    if ([...form.keys()].some((name) => name !== field && name !== "payload")) return undefined;
    const files = form.getAll(field);
    const payloads = form.getAll("payload");
    if (!files.length || files.length > (photo ? 1 : 10) || payloads.length !== 1 || typeof payloads[0] !== "string" || payloads[0].length > 16_384) return undefined;
    const allowed = photo ? ["image/jpeg", "image/png"] : ["image/jpeg", "image/png", "application/pdf"];
    if (files.some((file) => typeof file === "string" || file.size < 1 || file.size > 10 * 1024 * 1024 || !allowed.includes(file.type))) return undefined;
    return { files: files as File[], payload: JSON.parse(payloads[0]) as unknown };
  } catch { return undefined; }
}
