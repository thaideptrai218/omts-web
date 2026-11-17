// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
const read = vi.hoisted(() => vi.fn());
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read }) }));
import { useLotSearch } from "./use-lot-search";
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("searches the referenced lot code and opens only its exact record", async () => {
  read.mockResolvedValue({ status: "success", data: { lots: [{ id: "other", lotCode: "TH0000012" }, { id: "wanted", lotCode: "TH000001" }] } });
  const { result } = renderHook(() => useLotSearch("TH000001", "wanted"));
  await waitFor(() => expect(result.current.lotId).toBe("wanted"));
  expect(result.current.text).toBe("TH000001");
  expect(read.mock.calls[0].slice(0, 2)).toEqual(["search", { lotCode: "TH000001" }]);
});
