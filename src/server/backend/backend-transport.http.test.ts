import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createBackendTransport } from "./backend-transport";
import { MAX_RESPONSE_BYTES } from "./backend-response";
import { fixtureEnvironment, readFixtureBody, withHttpFixture } from "./__tests__/http-fixture";

describe("transport with actual Node fetch and disposable HTTP peers, not .NET", () => {
  it("sends exact login JSON without browser cookies, then accepts logout 204", async () => {
    const calls: Array<{ url?: string; method?: string; authorization?: string; cookie?: string; body: string }> = [];
    await withHttpFixture(async (request, response) => {
      calls.push({ url: request.url, method: request.method, authorization: request.headers.authorization,
        cookie: request.headers.cookie, body: await readFixtureBody(request) });
      response.setHeader("Set-Cookie", "must-not-forward=fake");
      if (request.url === "/api/auth/logout") { response.writeHead(204).end(); return; }
      response.writeHead(200, { "Content-Type": "application/json" }).end('{"accessToken":"fake-response-token"}');
    }, async (origin) => {
      const transport = createBackendTransport(fixtureEnvironment(origin));
      const body = { identifier: "qa", password: "  fake-password1  ", clientType: "Web" };
      expect(await transport.request({ endpoint: "login", body }))
        .toEqual({ status: "success", httpStatus: 200, data: { accessToken: "fake-response-token" } });
      expect(await transport.request({ endpoint: "logout", accessToken: "fake-bearer" }))
        .toEqual({ status: "success", httpStatus: 204, data: undefined });
      expect(calls).toEqual([
        { url: "/api/auth/login", method: "POST", authorization: undefined, cookie: undefined, body: JSON.stringify(body) },
        { url: "/api/auth/logout", method: "POST", authorization: "Bearer fake-bearer", cookie: undefined, body: "" },
      ]);
    });
  });
  it.each([302, 307, 308])("never follows redirect %i to another origin or leaks a bearer there", async (status) => {
    let destinationHits = 0;
    let sourceHits = 0;
    await withHttpFixture((_request, response) => { destinationHits++; response.end("unexpected"); }, async (destination) => {
      await withHttpFixture((_request, response) => {
        sourceHits++;
        response.writeHead(status, { Location: `${destination}/stolen` }).end();
      }, async (origin) => {
        expect(await createBackendTransport(fixtureEnvironment(origin)).request({ endpoint: "identity", accessToken: "fake-secret" }))
          .toEqual({ status: "unavailable" });
      });
    });
    expect(sourceHits).toBe(1);
    expect(destinationHits).toBe(0);
  });
  it("also rejects same-origin redirects instead of silently changing the catalog path", async () => {
    const paths: string[] = [];
    await withHttpFixture((request, response) => {
      paths.push(request.url ?? "");
      response.writeHead(302, { Location: "/outside-catalog" }).end();
    }, async (origin) => {
      expect((await createBackendTransport(fixtureEnvironment(origin)).request({ endpoint: "identity", accessToken: "fake" })).status)
        .toBe("unavailable");
    });
    expect(paths).toEqual(["/api/me"]);
  });
  it.each(["headers", "body"])("aborts stalled %s within the configured deadline without retry", async (stage) => {
    let hits = 0;
    await withHttpFixture((_request, response) => {
      hits++;
      if (stage === "body") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.write('{"pending":');
      }
      // Intentionally never ends; the client must abort, fixture cleanup closes its own sockets.
    }, async (origin) => {
      const before = performance.now();
      expect(await createBackendTransport(fixtureEnvironment(origin, 150)).request({ endpoint: "identity", accessToken: "fake" }))
        .toEqual({ status: "timeout" });
      expect(performance.now() - before).toBeLessThan(2000);
    });
    expect(hits).toBe(1);
  });
  it("does not resend an update whose response was lost after the peer read the write", async () => {
    let writes = 0;
    await withHttpFixture(async (request, response) => {
      await readFixtureBody(request);
      writes++;
      response.destroy();
    }, async (origin) => {
      expect(await createBackendTransport(fixtureEnvironment(origin)).request({
        endpoint: "profileUpdate", accessToken: "fake", body: { displayName: "Hải" },
      })).toEqual({ status: "unavailable" });
    });
    expect(writes).toBe(1);
  });
  it("rejects an oversized chunked response without trusting Content-Length", async () => {
    await withHttpFixture((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.write('"');
      response.end("x".repeat(MAX_RESPONSE_BYTES));
    }, async (origin) => {
      expect(await createBackendTransport(fixtureEnvironment(origin)).request({ endpoint: "identity", accessToken: "fake" }))
        .toEqual({ status: "invalid-response" });
    });
  });
  it("keeps concurrent users and tokens isolated without memoizing their responses", async () => {
    await withHttpFixture((request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" })
        .end(JSON.stringify({ fixtureIdentity: request.headers.authorization }));
    }, async (origin) => {
      const transport = createBackendTransport(fixtureEnvironment(origin));
      const results = await Promise.all(["fake-A", "fake-B"].map((accessToken) => transport.request({ endpoint: "identity", accessToken })));
      expect(results).toEqual(["fake-A", "fake-B"].map((token) => ({ status: "success", httpStatus: 200, data: { fixtureIdentity: `Bearer ${token}` } })));
    });
  });
  it("redacts actual error bodies/headers and does not retry a rate-limited response", async () => {
    let hits = 0;
    await withHttpFixture((_request, response) => {
      hits++;
      response.writeHead(429, { "Content-Type": "application/problem+json", "Retry-After": "2", "Set-Cookie": "fake-secret" })
        .end('{"code":"MSG69","detail":"fake-secret","params":{"token":"fake-secret"}}');
    }, async (origin) => {
      const result = await createBackendTransport(fixtureEnvironment(origin)).request({ endpoint: "identity", accessToken: "fake" });
      expect(result).toEqual({ status: "http-error", httpStatus: 429, code: "MSG69", retryAfterMs: 2000 });
      expect(JSON.stringify(result)).not.toContain("fake-secret");
    });
    expect(hits).toBe(1);
  });
});
