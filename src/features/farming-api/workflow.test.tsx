// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ read: vi.fn(), upload: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children, dismissible, onOpenChange }: { title: string; children: ReactNode; dismissible?: boolean; onOpenChange(open: boolean): void }) => <div role="dialog" aria-label={title}><button disabled={!dismissible} onClick={() => onOpenChange(false)}>Fermer test dialog</button>{children}</div> }));
import { LicenseEditor } from "./license-screen";
import { ConditionDiagram, RaftMaterialCosts } from "./raft-screen";
import { farmingIds as ids, licenseFixture, conditionFixture } from "./fixtures";
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
const props = () => ({ zoneId: ids.zone, zones: licenseFixture().zones, onClose: vi.fn(), onMode: vi.fn(), onNavigate: vi.fn(), onSaved: vi.fn() });
describe("license editor draft and history behavior", () => {
  it("downloads the protected document without requiring a popup", () => {
    const url = `/api/operations/zone-licenses?action=file&id=${ids.zone}`;
    render(<LicenseEditor {...props()} record={licenseFixture({ fileUrl: url })} mode="view" />);
    const link = screen.getByRole("link", { name: "Tải tệp giấy tờ" });
    expect(link.getAttribute("href")).toBe(url); expect(link.hasAttribute("download")).toBe(true); expect(link.hasAttribute("target")).toBe(false);
  });
  it("keeps the draft after MSG06, compares canonical fields and only rebases after an explicit choice", async () => {
    const latest = licenseFixture({ rowVersion: "NEW", holder: "HTX mới", documentNumber: "GP-MOI" });
    repository.upload.mockResolvedValueOnce({ status: "error", code: "MSG06", httpStatus: 409, uncertain: false }).mockResolvedValueOnce({ status: "success", data: latest });
    repository.read.mockResolvedValue({ status: "success", data: latest });
    render(<LicenseEditor {...props()} record={licenseFixture()} mode="update" />);
    fireEvent.change(screen.getByLabelText("Cơ quan cấp"), { target: { value: "Bản nháp của tôi" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu giấy tờ" }));
    await screen.findByText(/Bản ghi đã thay đổi/);
    expect((screen.getByLabelText("Cơ quan cấp") as HTMLInputElement).value).toBe("Bản nháp của tôi");
    fireEvent.click(screen.getByRole("button", { name: "Tải hồ sơ mới để đối chiếu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đã đối chiếu, giữ bản nháp để sửa tiếp" }));
    expect(repository.upload).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Lưu giấy tờ" }));
    await waitFor(() => expect(repository.upload).toHaveBeenCalledTimes(2));
    expect(repository.upload.mock.calls[1][2]).toMatchObject({ issuingAuthority: "Bản nháp của tôi", rowVersion: "NEW" });
  });
  it("does not retry an uncertain update or unblock it just by loading the current record", async () => {
    repository.upload.mockResolvedValue({ status: "error", httpStatus: 401, uncertain: true });
    repository.read.mockResolvedValue({ status: "success", data: licenseFixture() });
    render(<LicenseEditor {...props()} record={licenseFixture()} mode="update" />);
    fireEvent.change(screen.getByLabelText("Cơ quan cấp"), { target: { value: "Bản nháp" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu giấy tờ" }));
    fireEvent.click(await screen.findByRole("button", { name: "Tải hồ sơ mới để đối chiếu" }));
    await screen.findByText("Giấy tờ hiện tại trên hệ thống");
    expect(repository.upload).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Đã đối chiếu, giữ bản nháp để sửa tiếp" })).toBeNull();
    expect((screen.getByRole("button", { name: "Lưu giấy tờ" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("shows replaced documents as read only and navigates the historical chain", async () => {
    const callbacks = props(), old = licenseFixture({ replacedByDocumentId: ids.raft, state: "Superseded" }), next = licenseFixture({ id: ids.raft });
    repository.read.mockResolvedValue({ status: "success", data: next });
    render(<LicenseEditor {...callbacks} record={old} mode="view" />);
    expect(screen.queryByRole("button", { name: "Sửa giấy tờ" })).toBeNull(); expect(screen.queryByRole("button", { name: "Gia hạn / thay thế" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem giấy tờ thay thế" }));
    await waitFor(() => expect(callbacks.onNavigate).toHaveBeenCalledWith(next)); expect(repository.upload).not.toHaveBeenCalled();
  });
  it("requires a file on creation and retains an edited draft until explicit discard", async () => {
    const callbacks = props();
    render(<LicenseEditor {...callbacks} record={null} mode="create" />);
    fireEvent.change(screen.getByLabelText("Số giấy tờ *"), { target: { value: "QA-GP" } });
    fireEvent.submit(screen.getByRole("button", { name: "Lưu giấy tờ" }).closest("form")!);
    await screen.findByText("Chọn tệp PDF, JPEG hoặc PNG để lưu giấy tờ."); expect(repository.upload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Đóng giấy tờ" })); expect(callbacks.onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục sửa" })); expect((screen.getByLabelText("Số giấy tờ *") as HTMLInputElement).value).toBe("QA-GP");
    fireEvent.click(screen.getByRole("button", { name: "Đóng giấy tờ" })); fireEvent.click(screen.getByRole("button", { name: "Bỏ bản nháp" })); expect(callbacks.onClose).toHaveBeenCalledTimes(1);
  });
  it("prevents closing and duplicate writes while an upload is pending", async () => {
    const callbacks = props(); let finish!: (result: unknown) => void;
    repository.upload.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render(<LicenseEditor {...callbacks} record={licenseFixture()} mode="update" />);
    fireEvent.change(screen.getByLabelText("Cơ quan cấp"), { target: { value: "QA" } });
    const form = screen.getByRole("button", { name: "Lưu giấy tờ" }).closest("form")!;
    fireEvent.submit(form); fireEvent.submit(form); fireEvent.click(screen.getByRole("button", { name: "Đóng giấy tờ" }));
    expect(repository.upload).toHaveBeenCalledTimes(1); expect(callbacks.onClose).not.toHaveBeenCalled();
    finish({ status: "success", data: licenseFixture() }); await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledTimes(1));
  });
  it("preserves an uncertain creation draft while inspecting a potentially saved result", async () => {
    const callbacks = props(), saved = licenseFixture();
    repository.upload.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: true });
    repository.read.mockImplementation(async (action: string) => ({ status: "success", data: action === "list" ? { zoneId: ids.zone, asOf: "2026-10-29", licenses: [{ documentType: saved.documentType, documentNumber: saved.documentNumber, documentId: saved.id, state: saved.state }] } : saved }));
    render(<LicenseEditor {...callbacks} record={null} mode="create" />);
    fireEvent.change(screen.getByLabelText("Số giấy tờ *"), { target: { value: "Bản nháp đang nhập" } });
    fireEvent.change(screen.getByLabelText("Tệp giấy tờ *"), { target: { files: [new File(["png"], "qa.png", { type: "image/png" })] } });
    fireEvent.submit(screen.getByRole("button", { name: "Lưu giấy tờ" }).closest("form")!);
    fireEvent.click(await screen.findByRole("button", { name: "Tải hồ sơ mới để đối chiếu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đối chiếu bản QA-GP-01" }));
    await screen.findByText("Giấy tờ hiện tại trên hệ thống");
    expect((screen.getByLabelText("Số giấy tờ *") as HTMLInputElement).value).toBe("Bản nháp đang nhập");
    expect(callbacks.onNavigate).not.toHaveBeenCalled(); expect(repository.upload).toHaveBeenCalledTimes(1);
  });
});
describe("raft cost evidence", () => {
  it("shows unknown when no completed receipt provides a cost", async () => {
    repository.read.mockResolvedValue({ status: "success", data: [] });
    render(<RaftMaterialCosts raftId={ids.raft} zoneId={ids.zone} />);
    expect(await screen.findByText("Chưa có số liệu chi phí.")).toBeTruthy(); expect(screen.queryByText(/Tổng chi phí/)).toBeNull();
  });
  it("shows a real zero when there is a completed receipt with a zero cost", async () => {
    repository.read.mockResolvedValue({ status: "success", data: [{ raft: { id: ids.raft, code: "QA-R" }, materialCost: 0, receipts: [{ receiptId: ids.license, code: "QA-PN", receiptDate: "2026-10-29", materialCost: 0 }] }] });
    render(<RaftMaterialCosts raftId={ids.raft} zoneId={ids.zone} />);
    expect(await screen.findByText(/Tổng chi phí: 0/)).toBeTruthy(); expect(screen.queryByText("Chưa có số liệu chi phí.")).toBeNull(); expect(screen.getByText(/QA-PN/)).toBeTruthy();
  });
});
describe("raft condition sources", () => {
  it("shows no cycle as not seeded, and does not infer material cost or production", () => {
    render(<ConditionDiagram condition={conditionFixture()} />);
    expect(screen.getByText("Bè chưa có chu kỳ tại ngày xem.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Làn 1, 0–30 m, Chưa thả" }));
    expect(screen.getByText("Chưa có sự kiện thả, thu hoặc ghi giảm cho đoạn này.")).toBeTruthy();
  });
  it("shows the source, recorder and confirmer for the selected colored portion", () => {
    const fixture = conditionFixture(); fixture.cycleId = ids.license;
    fixture.lanes[0].summary = "Growing"; fixture.lanes[0].portions[0] = { from: 0, to: 30, condition: "Growing", segments: [{ id: ids.lane, type: "Seeded", from: 0, to: 30, date: "2026-10-01", recordedBy: "Người ghi QA", confirmedBy: "Người xác nhận QA", seedingEventId: ids.raft, seedLotCode: "LOT-QA", writeOffReason: null }] };
    render(<ConditionDiagram condition={fixture} />); fireEvent.click(screen.getByRole("button", { name: "Làn 1, 0–30 m, Đang nuôi" }));
    expect(screen.getByText("Người ghi QA / Người xác nhận QA")).toBeTruthy(); expect(screen.getByText("LOT-QA")).toBeTruthy(); expect(screen.getByText(ids.raft)).toBeTruthy();
  });
});
