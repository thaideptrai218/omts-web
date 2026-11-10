// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { answered, ids, page, row, trader } from "./claim-test-fixtures";

const { read, upload, workspace, search } = vi.hoisted(() => ({ read: vi.fn(), upload: vi.fn(), workspace: vi.fn(), search: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read, upload }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: workspace }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search()) }));
import { ClaimReportScreen } from "./claim-report-screen";

const traderUser = { identity: { subjectType: "Trader" }, permissions: { functionPermissions: [] } };
type Replies = { list?: unknown; detail?: unknown };
/** Repository giả trả dữ liệu mẫu nhưng vẫn đi qua schema zod thật của hợp đồng. */
function serve({ list = page(), detail = trader() }: Replies = {}) {
  read.mockImplementation(async (action: string, _query: unknown, schema: { parse(v: unknown): unknown }) => ({ status: "success", data: schema.parse(action === "mine" ? list : detail) }));
}
const jpeg = (name = "hau.jpg") => new File([new Uint8Array([1, 2, 3])], name, { type: "image/jpeg", lastModified: 1 });
const attach = (files: File[]) => fireEvent.change(screen.getByLabelText("Chọn ảnh từ máy"), { target: { files } });
const describeProblem = (text = "Hàu chết nhiều") => fireEvent.change(screen.getByLabelText(/Mô tả vấn đề/), { target: { value: text } });
const send = () => fireEvent.click(screen.getByRole("button", { name: "Gửi báo cáo" }));

beforeEach(() => {
  workspace.mockReturnValue(traderUser); search.mockReturnValue(`invoiceId=${ids.invoice}`);
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() }));
  window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("ClaimReportScreen (trader)", () => {
  it("denies every role except trader and sends no request", () => {
    workspace.mockReturnValue({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }); render(<ClaimReportScreen />);
    expect(screen.getByText(/Chỉ tài khoản thương lái/)).toBeTruthy(); expect(read).not.toHaveBeenCalled();
  });

  it("asks to choose an invoice when none is given, and lists own claims with Vietnamese status only", async () => {
    search.mockReturnValue(""); serve(); render(<ClaimReportScreen />);
    expect(screen.getByText("Chưa chọn hóa đơn")).toBeTruthy();
    expect(await screen.findByText("KN000001")).toBeTruthy();
    expect(screen.getByText("Chờ phản hồi")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Awaiting|Accepted|Rejected/);
    expect(read.mock.calls[0].slice(0, 2)).toEqual(["mine", { page: "1", pageSize: "20" }]);
  });

  it("opens the detail under the card with the response of the cooperative and no prices", async () => {
    serve({ list: page([row({ ...answered("PriceCutWholeInvoice", 3703, "Giảm 10% hóa đơn") })]), detail: trader({ ...answered("PriceCutWholeInvoice", 3703, "Giảm 10% hóa đơn") }) }); render(<ClaimReportScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết báo cáo KN000001" }));
    expect(await screen.findByText(/Hợp tác xã đề nghị: Giảm giá cả hóa đơn/)).toBeTruthy();
    expect(screen.getByText("Giảm 10% hóa đơn")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Lô thu hoạch" })).toBeTruthy(); expect(screen.queryByRole("columnheader", { name: "Đơn giá" })).toBeNull();
    expect(screen.getByRole("img", { name: /Ảnh 1 của khiếu nại KN000001/ }).getAttribute("src")).toBe("/api/operations/claim-reports?action=photo&id=" + ids.claim + "&index=0");
    expect(read.mock.calls.at(-1)?.slice(0, 2)).toEqual(["mine-detail", { id: ids.claim }]);
    fireEvent.click(screen.getByRole("button", { name: "Báo thêm cho hóa đơn HD000123" }));
    expect(screen.getByRole("form", { name: "Báo vấn đề chất lượng" })).toBeTruthy();
  });

  it("shows an error with retry for the list", async () => {
    read.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false }); render(<ClaimReportScreen />);
    expect(await screen.findByRole("button", { name: "Thử tải lại" })).toBeTruthy();
    serve({ list: page([]) }); fireEvent.click(screen.getByRole("button", { name: "Thử tải lại" }));
    expect(await screen.findByText("Bạn chưa gửi báo cáo nào")).toBeTruthy(); expect(screen.queryByText("There is nothing to show yet.")).toBeNull();
  });

  it("validates description and photo before sending anything", async () => {
    serve({ list: page([]) }); render(<ClaimReportScreen />); await screen.findByText("Bạn chưa gửi báo cáo nào");
    send(); expect(await screen.findByText("Hãy mô tả vấn đề chất lượng bạn gặp.")).toBeTruthy();
    describeProblem(); send(); expect(await screen.findByText("Hãy đính kèm ít nhất một ảnh.")).toBeTruthy();
    attach([new File(["x"], "bao-cao.pdf", { type: "application/pdf" })]);
    expect(screen.getByText('"bao-cao.pdf" không phải ảnh JPEG hoặc PNG.')).toBeTruthy(); expect(upload).not.toHaveBeenCalled();
  });

  it("previews and removes photos, then uploads description + photos for the invoice and reloads the list", async () => {
    serve({ list: page([]) }); upload.mockResolvedValue({ status: "success", data: { claim: trader({ code: "KN000002" }), message: "Saved", messageCode: "MSG-GEN-05" } }); render(<ClaimReportScreen />);
    await screen.findByText("Bạn chưa gửi báo cáo nào");
    const keep = jpeg("giu.jpg"); attach([jpeg("bo.jpg"), keep]);
    expect(screen.getAllByRole("img")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Bỏ ảnh bo.jpg" })); expect(screen.getAllByRole("img")).toHaveLength(1);
    describeProblem("  Hàu chết nhiều  "); send();
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    expect(upload.mock.calls[0].slice(0, 4).slice(0, 3)).toEqual(["claim-submit", [keep], { description: "Hàu chết nhiều" }]); expect(upload.mock.calls[0][4]).toBe(ids.invoice);
    expect(await screen.findByText(/Mã báo cáo KN000002/)).toBeTruthy();
    await waitFor(() => expect(read.mock.calls.filter(([action]) => action === "mine")).toHaveLength(2));
    expect(screen.getByText("Chưa chọn hóa đơn")).toBeTruthy();
  });

  it("explains a 409 and never replays an uncertain write until the trader reviews the list", async () => {
    serve({ list: page([]) }); upload.mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false }); render(<ClaimReportScreen />);
    await screen.findByText("Bạn chưa gửi báo cáo nào"); describeProblem(); attach([jpeg()]); send();
    expect(await screen.findByText(/đang có một báo cáo chờ hợp tác xã phản hồi/)).toBeTruthy();
    upload.mockResolvedValueOnce({ status: "error", httpStatus: 0, uncertain: true }); send();
    expect(await screen.findByText(/Chưa xác nhận được báo cáo đã được gửi hay chưa/)).toBeTruthy();
    const button = screen.getByRole("button", { name: "Gửi báo cáo" }) as HTMLButtonElement; expect(button.disabled).toBe(true);
    fireEvent.click(button); expect(upload).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Tôi đã đối chiếu" })); await waitFor(() => expect((screen.getByRole("button", { name: "Gửi báo cáo" }) as HTMLButtonElement).disabled).toBe(false));
  });

  it("blocks sending when the selected invoice already has a claim awaiting a response", async () => {
    serve(); render(<ClaimReportScreen />);
    const warning = await screen.findByText(/đang có báo cáo KN000001 chờ hợp tác xã phản hồi/);
    expect(within(warning.closest("section")!).getByRole("button", { name: "Gửi báo cáo" }).hasAttribute("disabled")).toBe(true);
  });
});
