import { afterEach, describe, expect, it, vi } from "vitest";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/api/bff-fetch", () => ({ bffFetch: fetcher }));
import { loadVatCatalogue, vatRateError, vatRateRepository } from "./repository";

afterEach(() => vi.clearAllMocks());
const answer = (status: number, body: unknown) => fetcher.mockResolvedValue(Response.json(body, { status }));

describe("the VAT rate catalogue as the pickers load it", () => {
  it("reads the rates of the API", async () => {
    answer(200, { status: "success", data: [{ id: "r1", name: "10%", percent: 10, isDefault: true, active: true, itemCount: 2, rowVersion: "v" }] });
    const catalogue = await loadVatCatalogue();
    expect(catalogue.legacy).toBe(false);
    expect(catalogue.rates).toHaveLength(1);
    expect(String(fetcher.mock.calls[0][0])).toBe("/api/vat-rates?action=list");
  });

  it("falls back to the old fixed list when the API has no catalogue (404), without any error", async () => {
    answer(404, { status: "rejected" });
    const catalogue = await loadVatCatalogue();
    expect(catalogue.legacy).toBe(true);
    expect(catalogue.rates.map((rate) => rate.id)).toEqual(["KCT", "0", "5", "8", "10"]);
  });

  it("offers no choices, and does not pretend the old list applies, when the catalogue fails for another reason", async () => {
    answer(503, { status: "unavailable" });
    expect(await loadVatCatalogue()).toEqual({ rates: [], legacy: false });
    fetcher.mockRejectedValue(new Error("offline"));
    expect(await loadVatCatalogue()).toEqual({ rates: [], legacy: false });
  });

  it("sends the Owner's writes as actions with their id and body", async () => {
    answer(200, { status: "success", data: { rate: { id: "r1", name: "5%", percent: 5, active: false }, movedItems: 3 } });
    const result = await vatRateRepository.deactivate("r1", { replacementId: "r2", rowVersion: "v" });
    expect(result.status).toBe("success");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ action: "deactivate", id: "r1", body: { replacementId: "r2", rowVersion: "v" } });
  });
});

describe("the text of a failed write", () => {
  const failure = (code: string, problem?: { message: string }) => ({ status: "error" as const, httpStatus: 409, code, uncertain: false, ...(problem ? { problem } : {}) });
  it("names a name that is taken, a rate changed by someone else, and gives the sentence of the API for a refusal", () => {
    expect(vatRateError(failure("MSG-GEN-02"))).toContain("đã có trong danh sách");
    expect(vatRateError(failure("MSG06"))).toContain("vừa được người khác thay đổi");
    expect(vatRateError(failure("MSG-GEN-09", { message: "KCT là mức thuế của hệ thống." }))).toBe("KCT là mức thuế của hệ thống.");
    expect(vatRateError(failure("MSG-GEN-09"))).toContain("Trạng thái hiện tại không cho phép");
  });
});
