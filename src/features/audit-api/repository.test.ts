// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

const bff = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/features/auth/api/bff-fetch", () => ({ bffFetch: bff.fetch }));
import { auditRepository } from "./repository";

const id = "122bb318-a72e-49aa-a8d7-a6169f889007";
const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
afterEach(() => vi.clearAllMocks());

it("sends only the filters that have a value and parses the facets", async () => {
  bff.fetch.mockResolvedValue(reply(200, { status: "success", data: { actions: ["A.Created"], recordTypes: ["A"], people: [{ kind: "Account", accountId: id, employeeId: null, name: "Chủ HTX", username: "owner" }] } }));
  const result = await auditRepository.facets();
  expect(bff.fetch.mock.calls[0][0]).toBe("/api/audit-events?facets=1");
  expect(result.status === "success" && result.data.people[0].name).toBe("Chủ HTX");
  await auditRepository.list({ recordCode: "", action: "A.Created", page: "2" });
  expect(bff.fetch.mock.calls[1][0]).toBe("/api/audit-events?action=A.Created&page=2");
});

it("turns a refusal, a malformed body and a network failure into a read error that is never uncertain", async () => {
  bff.fetch.mockResolvedValueOnce(reply(403, { status: "forbidden", code: "MSG02" }));
  expect(await auditRepository.detail(id)).toEqual({ status: "error", code: "MSG02", httpStatus: 403, uncertain: false });
  bff.fetch.mockResolvedValueOnce(reply(200, { status: "success", data: { nope: true } }));
  expect(await auditRepository.detail(id)).toMatchObject({ status: "error", httpStatus: 200, uncertain: false });
  bff.fetch.mockRejectedValueOnce(new Error("offline"));
  expect(await auditRepository.list({})).toEqual({ status: "error", httpStatus: 0, uncertain: false });
});
