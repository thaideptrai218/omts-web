// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ movements: vi.fn(), exportMovements: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), inputRepository: { movements: state.movements, exportMovements: state.exportMovements } }));
import { ItemMovementsTab } from "./item-movements-tab";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const row = (n: number, patch: object) => ({ id: id(n), sequence: n, kind: "Receipt", documentId: id(9), documentCode: "PN000001", occurredAt: "2026-11-10T08:00:00+07:00", quantity: 10, balanceAfter: 10, unitCost: 100, transactionPrice: 100, partyName: "NCC A", seedLotLineId: null, seedLotCode: null, reversesMovementId: null, ...patch });
const page = (items: object[]) => ({ status: "success" as const, data: { items, page: 1, pageSize: 15, total: items.length, unit: "cái" } });

beforeEach(() => { state.movements.mockResolvedValue(page([row(1, {}), row(2, { kind: "Opening", documentCode: "VT000001", documentId: id(8), partyName: null })])); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("links a receipt by its code, and shows the opening row without a document code", async () => {
  render(<ItemMovementsTab itemId={id(7)} canExport={false} />);
  const link = await screen.findByRole("link", { name: "PN000001" });
  expect(link.getAttribute("href")).toBe("/operations/purchase-receipts?code=PN000001");
  expect(screen.queryByText("VT000001")).toBeNull();
});

it("asks for the adjustment entries when the switch is on, marks them, and says so when there are none", async () => {
  const user = userEvent.setup();
  render(<ItemMovementsTab itemId={id(7)} canExport={false} />);
  await screen.findByRole("link", { name: "PN000001" });
  expect(state.movements.mock.calls[0][1]).not.toHaveProperty("includeReversals", "true");
  await user.click(screen.getByRole("switch", { name: "Hiện bút toán điều chỉnh" }));
  await waitFor(() => expect(state.movements).toHaveBeenLastCalledWith(id(7), expect.objectContaining({ includeReversals: "true" }), expect.anything()));
  expect(await screen.findByText(/Chưa có bút toán điều chỉnh/)).toBeTruthy();

  state.movements.mockResolvedValue(page([row(1, {}), row(3, { kind: "Reversal", quantity: -10, balanceAfter: 0, reversesMovementId: id(1) })]));
  await user.click(screen.getByRole("switch", { name: "Hiện bút toán điều chỉnh" }));
  await user.click(screen.getByRole("switch", { name: "Hiện bút toán điều chỉnh" }));
  expect(await screen.findByText("Điều chỉnh")).toBeTruthy();
  expect(screen.queryByText(/Chưa có bút toán điều chỉnh/)).toBeNull();
});

it("puts the transaction type filter at the far right of the toolbar, after the switch", async () => {
  render(<ItemMovementsTab itemId={id(7)} canExport={false} />);
  const filter = await screen.findByLabelText("Loại giao dịch"), toggle = screen.getByRole("switch", { name: "Hiện bút toán điều chỉnh" });
  expect(toggle.compareDocumentPosition(filter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
