// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/api/bff-fetch", () => ({ bffFetch: fetcher }));
import { laneIncidentRepository } from "./lane-incident-repository";
const id = "00000000-0000-4000-8000-000000000001", target = { id, zoneId: id, laneNumber: 2 };
afterEach(() => vi.clearAllMocks());
describe("lane incident repository", () => {
  it("preserves 404 as a known unsupported endpoint and validates answers", async () => {
    fetcher.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ status: "rejected" }) });
    expect(await laneIncidentRepository.history(target)).toEqual({ status: "error", httpStatus: 404, code: undefined, uncertain: false });
    fetcher.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: "success", data: { incidents: [{ id, laneNumber: "bad" }] } }) });
    expect(await laneIncidentRepository.history(target)).toMatchObject({ status: "error", httpStatus: 502 });
  });
  it("sends one repair payload and keeps safe backend shortage metadata", async () => {
    fetcher.mockResolvedValue({ ok: false, status: 409, json: async () => ({ code: "MSG-INPUT-01", problem: { onHand: 1, message: "Kho còn 1 m", privateKey: "no" } }) });
    const body = { rowVersion: "v1", materials: [{ itemId: id, quantity: 2 }] };
    expect(await laneIncidentRepository.save("repair", target, body)).toMatchObject({ status: "error", uncertain: false, problem: { onHand: 1, message: "Kho còn 1 m" } });
    expect(fetcher.mock.calls[0][0]).toContain("action=lane-repair");
    expect(fetcher.mock.calls[0][1].body).toBe(JSON.stringify(body));
  });
});
