import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readBoundedBytes, readOperationUpload } from "./bounded-body";
describe("bounded purchasing and water uploads", () => {
  it("counts actual streamed bytes instead of trusting Content-Length", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(5)); }, cancel() { cancelled = true; } });
    await expect(readBoundedBytes(stream, new AbortController().signal, 4, 100)).rejects.toThrow("Body too large"); expect(cancelled).toBe(true);
  });
  it("bounds a stalled upload body and cancels its reader", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
    await expect(readBoundedBytes(stream, new AbortController().signal, 4, 10)).rejects.toThrow("Body deadline"); expect(cancelled).toBe(true);
  });
  it("does not accept extra fields or a document as an OCR photo", async () => {
    const form = new FormData(); form.set("payload", "{}"); form.set("photo", new File(["pdf"], "qa.pdf", { type: "application/pdf" }));
    expect(await readOperationUpload(new Request("http://localhost", { method: "POST", body: form }), true)).toBeUndefined();
    form.set("photo", new File(["png"], "qa.png", { type: "image/png" })); form.set("url", "https://evil.test");
    expect(await readOperationUpload(new Request("http://localhost", { method: "POST", body: form }), true)).toBeUndefined();
  });
});
