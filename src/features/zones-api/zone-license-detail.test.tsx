// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";
import { farmingIds as ids, licenseFixture } from "@/features/farming-api/fixtures";

const repo = vi.hoisted(() => ({ read: vi.fn(), post: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repo }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { ZoneLicenseDetail } from "./zone-license-detail";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = (patch: object = {}, props: { canDelete?: boolean } = { canDelete: true }) => {
  repo.read.mockResolvedValue({ status: "success", data: licenseFixture(patch) });
  const onDeleted = vi.fn();
  render(<ToastProvider><ZoneLicenseDetail id={ids.license} asOf="2026-11-27" canEdit {...props} onOpen={vi.fn()} onEdit={vi.fn()} onReplace={vi.fn()} onDeleted={onDeleted} /></ToastProvider>);
  return onDeleted;
};
const deleteButton = () => screen.queryByRole("button", { name: "Xóa" });
const other = "5a92b32d-2901-4560-9237-350be750cb99";

describe("licence delete", () => {
  it("is offered to the Owner of a zone in use for a plain licence", async () => {
    mount();
    expect(await screen.findByRole("button", { name: "Xóa" })).toBeTruthy();
  });
  it("is hidden without the right (zone not in use or not the Owner), for a replaced licence and for one that replaced another", async () => {
    mount({}, { canDelete: false }); await screen.findByText("QA-GP-01"); expect(deleteButton()).toBeNull(); cleanup();
    mount({ replacedByDocumentId: other }); await screen.findByText("QA-GP-01"); expect(deleteButton()).toBeNull(); cleanup();
    mount({ replacesDocumentId: other }); await screen.findByText("QA-GP-01"); expect(deleteButton()).toBeNull();
  });
  it("asks first, then deletes with the row version, tells the user and lets the list reload", async () => {
    repo.post.mockResolvedValue({ status: "success", data: { done: true } });
    const onDeleted = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Xóa" }));
    expect(repo.post).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: "Xóa giấy tờ?" });
    expect(dialog.textContent).toContain("QA-GP-01");
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận xóa" }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(repo.post.mock.calls[0].slice(0, 2)).toEqual(["delete", { id: ids.license, rowVersion: "AQID" }]);
    expect(await screen.findByText(/Đã xóa giấy tờ/)).toBeTruthy();
  });
  it("does nothing when the confirmation is dismissed", async () => {
    const onDeleted = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Xóa" }));
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(repo.post).not.toHaveBeenCalled(); expect(onDeleted).not.toHaveBeenCalled();
  });
  it("shows the refusal of a document in a replacement chain and keeps the list as it is", async () => {
    repo.post.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false });
    const onDeleted = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Xóa" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận xóa" }));
    expect((await screen.findByRole("alert")).textContent).toContain("đã thay thế hoặc đã được thay thế");
    expect(onDeleted).not.toHaveBeenCalled(); expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("offers a reload after a stale row version (MSG06) instead of repeating the delete", async () => {
    repo.post.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG06", uncertain: false });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Xóa" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận xóa" }));
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại giấy tờ" }));
    await waitFor(() => expect(repo.read).toHaveBeenCalledTimes(2));
  });
});
