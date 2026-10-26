import "server-only";
import { inspect } from "node:util";

export type MutationBodyPolicy = Readonly<{ body: "json"; maxBytes: number; timeoutMs: number }>
  | Readonly<{ body: "none"; timeoutMs: number }>;
type Rejection = Readonly<{ status: "rejected"; httpStatus: 400 | 408 | 413 | 415 }>;
function reject(httpStatus: Rejection["httpStatus"]): Rejection { return Object.freeze({ status: "rejected", httpStatus }); }
class BodyFailure extends Error {
  constructor(readonly httpStatus: 400 | 408 | 413) { super("Mutation body rejected"); }
}

// Successful login/gate input can contain passwords: not a JSON/RSC DTO.
class GuardedMutationBody {
  #value: unknown;
  constructor(value: unknown) { this.#value = value; Object.freeze(this); }
  readForValidation(): unknown { return this.#value; }
  toJSON(): never { throw new Error("MUTATION_BODY_NOT_SERIALIZABLE"); }
  toString(): string { return "GuardedMutationBody [REDACTED]"; }
  [Symbol.toPrimitive](): string { return this.toString(); }
  [inspect.custom](): string { return this.toString(); }
}

// Internal guard stage: caller must validate policy and CSRF headers first.
export async function readMutationBody(request: Request, policy: MutationBodyPolicy): Promise<
  Readonly<{ status: "checked"; body: GuardedMutationBody }> | Rejection
> {
  const encoding = request.headers.get("content-encoding");
  if (encoding !== null && encoding.toLowerCase() !== "identity") return reject(415);
  const contentType = request.headers.get("content-type");
  if (policy.body === "json" && (contentType === null
    || !/^application\/json(?:[ \t]*;[ \t]*charset[ \t]*=[ \t]*(?:utf-8|"utf-8"))?$/i.test(contentType))) return reject(415);
  const limit = policy.body === "json" ? policy.maxBytes : 0;
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader !== null && !/^[0-9]{1,20}$/.test(lengthHeader)) return reject(400);
  const declared = lengthHeader === null ? undefined : BigInt(lengthHeader);
  if (declared !== undefined && declared > BigInt(limit)) return reject(413);
  if (request.bodyUsed || request.signal.aborted || request.body?.locked) return reject(400);
  const reader = request.body?.getReader();
  if (!reader) return policy.body === "none" && (declared === undefined || declared === BigInt(0))
    ? Object.freeze({ status: "checked", body: new GuardedMutationBody(undefined) }) : reject(400);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort = () => {};
  try {
    const interrupted = new Promise<never>((_, fail) => {
      timer = setTimeout(() => fail(new BodyFailure(408)), policy.timeoutMs);
      onAbort = () => fail(new BodyFailure(400));
      request.signal.addEventListener("abort", onAbort, { once: true });
    });
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), interrupted]);
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new BodyFailure(400);
      size += value.byteLength;
      if (size > limit) throw new BodyFailure(413);
      if (value.byteLength) chunks.push(value);
    }
    if (declared !== undefined && declared !== BigInt(size)) throw new BodyFailure(400);
    const value = policy.body === "none" ? undefined
      : JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, size)));
    return Object.freeze({ status: "checked", body: new GuardedMutationBody(value) });
  } catch (error) {
    return reject(error instanceof BodyFailure ? error.httpStatus : 400);
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", onAbort);
    // Do not await cancellation: a hostile/broken stream can leave it pending.
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
