import { inspect } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { guard, loginPolicy, logoutPolicy, mutation, streamed } from "./__tests__/csrf-fixture";

afterEach(() => vi.useRealTimers());
const bytes = (text: string) => new TextEncoder().encode(text);
describe("C2A route media type and bounded body", () => {
  it.each(["application/json", "APPLICATION/JSON", "application/json; charset=utf-8", 'application/json; charset="UTF-8"'])(
    "accepts supported JSON media type %s", async (type) => {
      expect((await guard().check(mutation({ headers: { "Content-Type": type } }), loginPolicy)).status).toBe("allowed");
    },
  );
  it.each([null, "text/plain", "application/x-www-form-urlencoded", "multipart/form-data; boundary=abc", "application/problem+json",
    "application/jsonp", "application/json, application/json", "application/json; charset=iso-8859-1", "application/json; x=1"])(
    "rejects unsupported/missing JSON media type %s", async (type) => {
      const request = mutation();
      if (type === null) request.headers.delete("content-type"); else request.headers.set("content-type", type);
      expect(await guard().check(request, loginPolicy)).toEqual({ status: "rejected", httpStatus: 415 });
      expect(request.bodyUsed).toBe(false);
    },
  );
  it.each(["gzip", "br", "identity, gzip", ""])("rejects unsupported Content-Encoding %s", async (encoding) => {
    expect(await guard().check(mutation({ headers: { "Content-Encoding": encoding } }), loginPolicy))
      .toEqual({ status: "rejected", httpStatus: 415 });
  });
  it("accepts explicit identity encoding and decodes split UTF-8 chunks only once", async () => {
    const content = bytes(JSON.stringify({ displayName: "Hải" }));
    const request = streamed([content.slice(0, 18), content.slice(18)], { "Content-Encoding": "identity", "Content-Length": String(content.length) });
    const result = await guard().check(request, loginPolicy);
    expect(result.status).toBe("allowed");
    if (result.status === "allowed") expect(result.body.readForValidation()).toEqual({ displayName: "Hải" });
  });
  it.each([undefined, "", " ", "{broken-fake-secret", "{} trailing"])("rejects absent/invalid JSON without echo: %s", async (body) => {
    expect(await guard().check(mutation({ body }), loginPolicy)).toEqual({ status: "rejected", httpStatus: 400 });
  });
  it("rejects invalid UTF-8 instead of replacement-decoding it", async () => {
    expect(await guard().check(streamed([new Uint8Array([0x22, 0xff, 0x22])]), loginPolicy))
      .toEqual({ status: "rejected", httpStatus: 400 });
  });
  it.each(["null", "0", "[]"])("leaves JSON domain shape %s to the later wire schema", async (body) => {
    const result = await guard().check(mutation({ body }), loginPolicy);
    expect(result.status).toBe("allowed");
    if (result.status === "allowed") expect(result.body.readForValidation()).toEqual(JSON.parse(body));
  });
  it("accepts exactly the server policy byte budget and rejects one extra byte", async () => {
    const value = JSON.stringify("a".repeat(65_534));
    expect(Buffer.byteLength(value)).toBe(65_536);
    expect((await guard().check(mutation({ body: value }), loginPolicy)).status).toBe("allowed");
    expect(await guard().check(mutation({ body: value + " " }), loginPolicy)).toEqual({ status: "rejected", httpStatus: 413 });
  });
  it("enforces actual streamed bytes, even with absent or falsely small Content-Length", async () => {
    for (const headers of [new Headers(), new Headers({ "Content-Length": "1" })]) {
      expect(await guard().check(streamed([bytes("{}"), bytes("xxx")], headers), { ...loginPolicy, maxBytes: 4 }))
        .toEqual({ status: "rejected", httpStatus: 413 });
    }
    expect(await guard().check(mutation({ body: '"ế"' }), { ...loginPolicy, maxBytes: 4 }))
      .toEqual({ status: "rejected", httpStatus: 413 });
  });
  it.each(["-1", "1.5", "NaN", "2, 2", "2x", "+2"])("rejects malformed Content-Length %s", async (length) => {
    expect(await guard().check(mutation({ headers: { "Content-Length": length } }), loginPolicy))
      .toEqual({ status: "rejected", httpStatus: 400 });
  });
  it.each(["0", "1", "3"])("rejects declared/actual body-length mismatch %s", async (length) => {
    expect(await guard().check(mutation({ headers: { "Content-Length": length } }), loginPolicy))
      .toEqual({ status: "rejected", httpStatus: 400 });
  });
  it("rejects large advertised bodies before reading and accepts an exact length", async () => {
    const request = mutation({ headers: { "Content-Length": "99999999999999999999" } });
    expect(await guard().check(request, loginPolicy)).toEqual({ status: "rejected", httpStatus: 413 });
    expect(request.bodyUsed).toBe(false);
    expect((await guard().check(mutation({ headers: { "Content-Length": "2" } }), loginPolicy)).status).toBe("allowed");
  });
  it.each([undefined, ""])("allows bodyless logout without requiring a JSON object: %s", async (body) => {
    const request = mutation({ body });
    request.headers.delete("content-type");
    const result = await guard().check(request, logoutPolicy);
    expect(result.status).toBe("allowed");
    if (result.status === "allowed") expect(result.body.readForValidation()).toBeUndefined();
  });
  it.each(["{}", " ", "a"])("refuses a nonempty logout body: %s", async (body) => {
    expect(await guard().check(mutation({ body }), logoutPolicy)).toEqual({ status: "rejected", httpStatus: 413 });
  });
  it("guards sensitive allowed payloads against JSON/inspection, but allows explicit schema validation", async () => {
    const value = { identifier: "fake-user", password: "fake-password-secret" };
    const result = await guard().check(mutation({ body: JSON.stringify(value) }), loginPolicy);
    expect(result.status).toBe("allowed");
    if (result.status !== "allowed") throw new Error("Unexpected fake guard rejection");
    expect(result.body.readForValidation()).toEqual(value);
    expect(inspect(result)).not.toContain(value.password);
    expect(inspect(result.body, { showHidden: true })).not.toContain(value.password);
    expect(String(result.body)).toContain("REDACTED");
    expect(() => JSON.stringify({ nested: [result] })).toThrowError("MUTATION_BODY_NOT_SERIALIZABLE");
    expect({ ...result.body }).toEqual({});
    expect(Object.isFrozen(result.body)).toBe(true);
  });
});
