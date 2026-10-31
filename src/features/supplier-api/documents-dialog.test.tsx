// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
const request = vi.hoisted(() => vi.fn());
vi.mock("./repository", () => ({ supplierDocuments: request }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div> }));
import { SupplierDocumentsDialog } from "./documents-dialog";
const record = () => ({ id: "122bb318-a72e-49aa-a8d7-a6169f889007", name: "QA supplier", rowVersion: "v1", certificates: [] });
afterEach(() => { cleanup(); request.mockReset(); });
describe("supplier documents workflow", () => {
  it("lets readers download without exposing upload controls or marking a read as saved", async () => {
    request.mockResolvedValue({ status: "success", data: { ...record(), certificates: [{ index: 0, url: "/api/supplier-documents?id=qa" }] } }); const close = vi.fn(); render(<SupplierDocumentsDialog id={record().id} canEdit={false} onClose={close} />);
    expect((await screen.findByRole("link", { name: "Tải chứng nhận 1" })).getAttribute("href")).toContain("/api/supplier-documents"); expect(screen.queryByLabelText("Tệp chứng nhận")).toBeNull(); fireEvent.click(screen.getByRole("button", { name: "Đóng chứng nhận" })); expect(close).toHaveBeenCalledWith(undefined);
  });
  it("adopts the new version only after a confirmed upload and passes it back on close", async () => {
    const next = { ...record(), rowVersion: "v2", certificates: [{ index: 0, url: "/api/supplier-documents?id=qa" }] }; request.mockResolvedValueOnce({ status: "success", data: record() }).mockResolvedValueOnce({ status: "success", data: next }); const close = vi.fn(); render(<SupplierDocumentsDialog id={record().id} canEdit onClose={close} />);
    fireEvent.change(await screen.findByLabelText("Tệp chứng nhận"), { target: { files: [new File(["qa"], "qa.pdf", { type: "application/pdf" })] } }); fireEvent.click(screen.getByRole("button", { name: "Tải lên chứng nhận" })); await screen.findByText("Đã tải lên chứng nhận."); fireEvent.click(screen.getByRole("button", { name: "Đóng chứng nhận" })); expect(close).toHaveBeenCalledWith(next);
  });
  it("does not replay an uncertain upload when a fresh list loads", async () => {
    request.mockResolvedValueOnce({ status: "success", data: record() }).mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: true }).mockResolvedValueOnce({ status: "success", data: { ...record(), certificates: [{ index: 0, url: "/api/supplier-documents?id=qa" }] } }); render(<SupplierDocumentsDialog id={record().id} canEdit onClose={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText("Tệp chứng nhận"), { target: { files: [new File(["qa"], "qa.pdf", { type: "application/pdf" })] } }); fireEvent.click(screen.getByRole("button", { name: "Tải lên chứng nhận" })); fireEvent.click(await screen.findByRole("button", { name: "Tải lại danh sách" })); await screen.findByRole("link", { name: "Tải chứng nhận 1" }); expect((screen.getByRole("button", { name: "Tải lên chứng nhận" }) as HTMLButtonElement).disabled).toBe(true); expect(request).toHaveBeenCalledTimes(3);
  });
});
