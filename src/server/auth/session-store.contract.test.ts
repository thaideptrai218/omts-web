import { vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createMemorySessionStoreForTests } from "@/server/auth/__tests__/memory-session-store";
import { registerSessionStoreContract } from "@/server/auth/__tests__/session-store-contract";

registerSessionStoreContract("RAM test adapter shared contract", async () => createMemorySessionStoreForTests());
