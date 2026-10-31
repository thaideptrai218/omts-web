import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

// Disposable test peer only: random loopback port, no backend/DB or real accounts.
export async function withHttpFixture<T>(
  handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>,
  run: (origin: string) => Promise<T>,
): Promise<T> {
  const server = createServer((request, response) => {
    Promise.resolve().then(() => handler(request, response)).catch(() => response.destroy());
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => { server.off("error", reject); resolve(); });
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected loopback HTTP fixture");
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }
}

export async function readFixtureBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

export function fixtureEnvironment(origin: string, timeout = 2000) {
  return { NODE_ENV: "test", OMTS_DATA_SOURCE: "api", OMTS_API_BASE_URL: origin, OMTS_API_TIMEOUT_MS: String(timeout) };
}
