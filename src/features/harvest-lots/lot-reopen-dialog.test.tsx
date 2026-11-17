// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const { reopen, close } = vi.hoisted(() => ({ reopen: vi.fn(), close: vi.fn() }));
vi.mock("./repository", () => ({ lotRepository: { reopen, close } }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: import("react").ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { ToastProvider } from "@/components/ui/toast-provider";
import { LotCloseDialog } from "./lot-close-dialog";
import { LotReopenDialog } from "./lot-reopen-dialog";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const lot = { id: "122bb318-a72e-49aa-a8d7-a6169f889007", lotCode: "LTH000007", rowVersion: "v1", closeReason: "Unsold", figures: { remainingKg: 12.5 } } as never;

it("reopens only with a reason and sends it with the version of the lot", async () => {
  reopen.mockResolvedValue({ status: "success", data: { lot: {} } });
  const onSaved = vi.fn();
  render(<ToastProvider><LotReopenDialog lot={lot} zoneId="z" onClose={vi.fn()} onSaved={onSaved} /></ToastProvider>);
  expect(screen.getByRole("dialog", { name: "Mở lại lô LTH000007" })).toBeTruthy();
  expect(screen.getByText(/không bán hết/)).toBeTruthy();
  const submit = screen.getByRole("button", { name: "Mở lại lô" }) as HTMLButtonElement;
  expect(submit.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Lý do mở lại/), { target: { value: "  Khách nhận thêm  " } });
  expect(submit.disabled).toBe(false);
  fireEvent.click(submit);
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(reopen).toHaveBeenCalledWith("122bb318-a72e-49aa-a8d7-a6169f889007", "z", { rowVersion: "v1", reason: "Khách nhận thêm" });
});

it("keeps the reason and shows the refusal when the lot can no longer be reopened", async () => {
  reopen.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false });
  const onSaved = vi.fn();
  render(<ToastProvider><LotReopenDialog lot={lot} zoneId="z" onClose={vi.fn()} onSaved={onSaved} /></ToastProvider>);
  fireEvent.change(screen.getByLabelText(/Lý do mở lại/), { target: { value: "x" } });
  fireEvent.click(screen.getByRole("button", { name: "Mở lại lô" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Trạng thái hiện tại không cho phép");
  expect(onSaved).not.toHaveBeenCalled();
  expect((screen.getByLabelText(/Lý do mở lại/) as HTMLTextAreaElement).value).toBe("x");
});

it("closes with the kg left, starting from what remains, and asks the reason only above 0", async () => {
  close.mockResolvedValue({ status: "success", data: { lot: {} } });
  const onSaved = vi.fn();
  render(<ToastProvider><LotCloseDialog lot={lot} zoneId="z" onClose={vi.fn()} onSaved={onSaved} /></ToastProvider>);
  expect((screen.getByLabelText("Kg còn lại không bán") as HTMLInputElement).value).toBe("12,5");
  fireEvent.change(screen.getByLabelText("Lý do còn lại"), { target: { value: "Spoiled" } });
  fireEvent.click(screen.getByRole("button", { name: "Đóng lô" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(close.mock.calls[0][2]).toEqual({ rowVersion: "v1", leftoverKg: 12.5, reason: "Spoiled" });
});

it("sends no reason when nothing is left", async () => {
  close.mockResolvedValue({ status: "success", data: { lot: {} } });
  render(<ToastProvider><LotCloseDialog lot={lot} zoneId="z" onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);
  fireEvent.change(screen.getByLabelText("Kg còn lại không bán"), { target: { value: "0" } });
  expect(screen.queryByLabelText("Lý do còn lại")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Đóng lô" }));
  await waitFor(() => expect(close).toHaveBeenCalled());
  expect(close.mock.calls[0][2]).toEqual({ rowVersion: "v1", leftoverKg: 0 });
});
