import { describe, expect, it, vi } from "vitest";
import { holdNextRedisGet } from "@/server/auth/__tests__/redis-read-gate";

describe("test-only deterministic read gate", () => {
  it("holds the first GET snapshot, forwards later reads and records the real EVAL reply", async () => {
    const source = { get: vi.fn().mockResolvedValue("original-snapshot"), eval: vi.fn().mockResolvedValue("changed") };
    const gate = holdNextRedisGet(source);
    let completed = false;
    const first = gate.commands.get("first").then((raw) => { completed = true; return raw; });
    await gate.captured;
    try {
      expect(completed).toBe(false);
      source.get.mockResolvedValue("newer-snapshot");
      await expect(gate.commands.get("second")).resolves.toBe("newer-snapshot");
    } finally { gate.release(); }
    await expect(first).resolves.toBe("original-snapshot");
    const options = { keys: ["test-key"], arguments: ["payload"] };
    await expect(gate.commands.eval("test-script", options)).resolves.toBe("changed");
    expect(source.eval).toHaveBeenCalledWith("test-script", options);
    expect(gate.reply()).toBe("changed");
  });
  it("does not swallow a source EVAL failure", async () => {
    const source = { get: vi.fn().mockResolvedValue(null), eval: vi.fn().mockRejectedValue(new Error("fixture failure")) };
    const gate = holdNextRedisGet(source);
    await expect(gate.commands.eval("test-script", { keys: [], arguments: [] })).rejects.toThrow("fixture failure");
    expect(gate.reply()).toBeUndefined();
  });
});
