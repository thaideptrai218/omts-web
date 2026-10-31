import { createServer, type Socket } from "node:net";

// TCP fault fixture, NOT a Redis implementation. It never acknowledges a Redis command.
export async function withRedisTransportFault(
  fault: "silent" | "disconnect", run: (url: string, receivedData: () => boolean) => Promise<void>,
) {
  const sockets = new Set<Socket>();
  let received = false;
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("error", () => {});
    socket.on("close", () => { sockets.delete(socket); });
    socket.on("data", () => {
      received = true;
      if (fault === "disconnect") socket.destroy();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => { server.removeListener("error", reject); resolve(); });
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected local TCP test port");
    await run(`redis://127.0.0.1:${address.port}/0`, () => received);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => { if (error) reject(error); else resolve(); });
    });
  }
}

export async function withTestDeadline<T>(work: Promise<T>, timeoutMs = 3000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Transport test deadline exceeded")), timeoutMs);
    })]);
  } finally { if (timer !== undefined) clearTimeout(timer); }
}
