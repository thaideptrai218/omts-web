import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const bff = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/features/auth/api/bff-fetch", () => ({ bffFetch: bff.fetch }));
import { addressRepository, lookupError } from "./repository";

const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const provinces = [{ code: 92, name: "Thành phố Cần Thơ" }];

beforeEach(() => addressRepository.reset());
afterEach(() => { vi.clearAllMocks(); });

describe("address repository", () => {
  it("reads the provinces once and shares the answer, also between callers that ask while it is on its way", async () => {
    bff.fetch.mockResolvedValue(answer({ status: "success", data: provinces }));
    const [first, second] = await Promise.all([addressRepository.provinces(), addressRepository.provinces()]);
    await addressRepository.provinces();
    expect(first).toEqual({ status: "success", data: provinces });
    expect(second).toBe(first);
    expect(bff.fetch).toHaveBeenCalledTimes(1);
    expect(bff.fetch.mock.calls[0][0]).toBe("/api/administrative-units?action=provinces");
  });
  it("reads the wards of each province once", async () => {
    bff.fetch.mockImplementation(async (url: string) => answer({ status: "success", data: [{ code: 920101, name: "Phường Ninh Kiều", provinceCode: url.includes("92") ? 92 : 66 }] }));
    await addressRepository.wards(92); await addressRepository.wards(92); await addressRepository.wards(66);
    expect(bff.fetch.mock.calls.map((call) => call[0])).toEqual(["/api/administrative-units?action=wards&provinceCode=92", "/api/administrative-units?action=wards&provinceCode=66"]);
  });
  it("does not keep a failed read, so that the retry asks again", async () => {
    bff.fetch.mockResolvedValueOnce(answer({ status: "unavailable" }, 503)).mockResolvedValueOnce(answer({ status: "success", data: provinces }));
    expect(await addressRepository.provinces()).toMatchObject({ status: "error", httpStatus: 503 });
    expect(await addressRepository.provinces()).toMatchObject({ status: "success" });
    expect(bff.fetch).toHaveBeenCalledTimes(2);
  });
  it("treats an answer of another shape as a contract failure", async () => {
    bff.fetch.mockResolvedValue(answer({ status: "success", data: [{ code: "92", name: "x" }] }));
    expect(await addressRepository.provinces()).toMatchObject({ status: "error", httpStatus: 502 });
  });
  it("reports a network failure without throwing", async () => {
    bff.fetch.mockRejectedValue(new Error("offline"));
    expect(await addressRepository.provinces()).toMatchObject({ status: "error", httpStatus: 0 });
  });
  it("looks a tax code up with the code in the query and does not cache it", async () => {
    const found = { taxCode: "0312345678", name: "Cty", address: "Số 1", status: "NNT đang hoạt động" };
    bff.fetch.mockResolvedValue(answer({ status: "success", data: found }));
    expect(await addressRepository.lookupTaxCode("0312345678-001")).toEqual({ status: "success", data: found });
    await addressRepository.lookupTaxCode("0312345678-001");
    expect(bff.fetch).toHaveBeenCalledTimes(2);
    expect(bff.fetch.mock.calls[0][0]).toBe("/api/tax-lookup?taxCode=0312345678-001");
  });
});

describe("lookup error text", () => {
  it("says what happened and that the fields can be typed by hand", () => {
    const failure = (httpStatus: number) => ({ status: "error" as const, httpStatus, uncertain: false });
    expect(lookupError(failure(404))).toContain("Không tìm thấy");
    expect(lookupError(failure(429))).toContain("quá nhiều lần");
    expect(lookupError(failure(503))).toContain("nhập thông tin thủ công");
    expect(lookupError(failure(0))).toContain("nhập thông tin thủ công");
  });
});
