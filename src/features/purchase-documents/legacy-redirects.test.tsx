// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ replace: vi.fn(), search: "", list: vi.fn(), detail: vi.fn(), listReceipts: vi.fn(), listReturns: vi.fn(), getReceipt: vi.fn(), getReturn: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace }), useSearchParams: () => new URLSearchParams(state.search) }));
vi.mock("@/features/input-items/repository", () => ({ inputRepository: { list: state.list, detail: state.detail } }));
vi.mock("./repository", () => ({ listReceipts: state.listReceipts, listReturns: state.listReturns, getReceipt: state.getReceipt, getReturn: state.getReturn }));
import { LegacyItemsRedirect, LegacyReceiptEditRedirect, LegacyReceiptNewRedirect, LegacyReceiptsRedirect, LegacyReturnEditRedirect, LegacyReturnNewRedirect, LegacyReturnsRedirect } from "./legacy-redirects";

const id = "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01";
const ok = (data: unknown) => ({ status: "success", data });
const fail = { status: "error", httpStatus: 500, uncertain: false };
beforeEach(() => { state.search = ""; });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("sends an old catalogue link to the screen of the item's group, keeping the code", async () => {
  state.search = "code=GG000001";
  state.list.mockResolvedValue(ok({ items: [{ code: "GG000001", group: "Seed", units: [] }] }));
  render(<LegacyItemsRedirect />);
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/inputs/seeds?code=GG000001"));
  expect(state.list.mock.calls[0][0]).toMatchObject({ search: "GG000001", status: "All" });
});

it("finds the item by the code of one of its units too, and sends a Vật tư to its own screen", async () => {
  state.search = "code=VT000001-T";
  state.list.mockResolvedValue(ok({ items: [{ code: "VT000001", group: "Material", units: [{ code: "VT000001-T" }] }] }));
  render(<LegacyItemsRedirect />);
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/inputs/supplies?code=VT000001-T"));
});

it("sends an old catalogue link with no code, or with a code nobody has, to Vật tư", async () => {
  render(<LegacyItemsRedirect />);
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/inputs/supplies"));
  cleanup(); state.replace.mockClear();
  state.search = "code=NOPE"; state.list.mockResolvedValue(ok({ items: [] }));
  render(<LegacyItemsRedirect />);
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/inputs/supplies"));
});

it("says so, and does not guess a kind, when the lookup fails", async () => {
  state.search = "code=GG000001"; state.list.mockResolvedValue(fail);
  const view = render(<LegacyItemsRedirect />);
  expect((await view.findByRole("alert")).textContent).toMatch(/Không mở được/);
  expect(state.replace).not.toHaveBeenCalled();
});

it("sends an old receipt or return link to the screen of its kind", async () => {
  state.search = "code=PN000004";
  state.listReceipts.mockResolvedValue(ok({ items: [{ code: "PN000004", kind: "Seed" }] }));
  render(<LegacyReceiptsRedirect />);
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/operations/seed-receipts?code=PN000004"));
  cleanup(); state.replace.mockClear();
  state.search = "code=TH000002";
  state.listReturns.mockResolvedValue(ok({ items: [{ code: "TH000002", kind: "Supply" }] }));
  render(<LegacyReturnsRedirect />);
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/operations/supply-returns?code=TH000002"));
});

it("sends the edit link of an old receipt or return to the edit route of its kind", async () => {
  state.getReceipt.mockResolvedValue(ok({ kind: "Seed" }));
  render(<LegacyReceiptEditRedirect id={id} />);
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith(`/operations/seed-receipts/${id}/edit`));
  cleanup(); state.replace.mockClear();
  state.getReturn.mockResolvedValue(ok({ kind: "Supply" }));
  render(<LegacyReturnEditRedirect id={id} />);
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith(`/operations/supply-returns/${id}/edit`));
});

it("keeps the item, the copy and the receipt of an old new-document link", async () => {
  state.detail.mockResolvedValue(ok({ group: "Seed" }));
  render(<LegacyReceiptNewRedirect item={id} />);
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith(`/operations/seed-receipts/new?item=${id}`));
  cleanup(); state.replace.mockClear();
  state.getReceipt.mockResolvedValue(ok({ kind: "Supply" }));
  render(<LegacyReceiptNewRedirect copy={id} />);
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith(`/operations/supply-receipts/new?copy=${id}`));
  cleanup(); state.replace.mockClear();
  render(<LegacyReturnNewRedirect receipt={id} />);
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith(`/operations/supply-returns/new?receipt=${id}`));
});
