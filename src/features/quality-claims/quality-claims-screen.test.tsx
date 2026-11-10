// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { answered, ids, page, row, staff } from "./claim-test-fixtures";

const { read, write, workspace } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), workspace: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read, write }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: workspace }));
import { QualityClaimsScreen } from "./quality-claims-screen";

const owner = { identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } };
const manager = { identity: { subjectType: "Staff" }, permissions: { functionPermissions: [{ functionCode: "QUALITY_CLAIMS", action: "View", dataScope: "AssignedZone", scope: { kind: "all-zones" } }] } };
type Replies = { list?: unknown; detail?: unknown };
/** Repository giả trả dữ liệu mẫu nhưng vẫn đi qua schema zod thật của hợp đồng. */
function serve({ list = page(), detail = staff() }: Replies = {}) {
  read.mockImplementation(async (action: string, _query: unknown, schema: { parse(v: unknown): unknown }) => ({ status: "success", data: schema.parse(action === "list" ? list : detail) }));
}
const openRow = async () => { render(<QualityClaimsScreen />); fireEvent.click(await screen.findByRole("button", { name: /Khiếu nại KN000001/ })); await screen.findByRole("tablist"); };

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
  workspace.mockReturnValue(owner);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("QualityClaimsScreen (owner)", () => {
  it("lists claims with Vietnamese labels only and filters by status through the API", async () => {
    serve({ list: page([row(), row({ id: ids.claim2, code: "KN000002", ...answered("ReturnAllGoods", 3703, null) })]) }); render(<QualityClaimsScreen />);
    const first = (await screen.findByRole("button", { name: /Khiếu nại KN000001/ })).closest("tr")!;
    expect(within(first).getByText("Chờ phản hồi")).toBeTruthy(); expect(first.textContent).toContain("Trần Văn Lái"); expect(first.textContent).toContain("HD000123");
    const second = screen.getByRole("button", { name: /Khiếu nại KN000002/ }).closest("tr")!;
    expect(within(second).getByText("Đã chấp nhận")).toBeTruthy(); expect(within(second).getByText("Trả lại toàn bộ hàng")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Awaiting|Accepted|Rejected|ReturnAllGoods/);
    expect(read.mock.calls[0].slice(0, 2)).toEqual(["list", { page: "1", pageSize: "20", statusId: undefined }]);
    fireEvent.click(screen.getByRole("radio", { name: "Chờ phản hồi" }));
    await waitFor(() => expect(read.mock.calls.at(-1)?.[1]).toMatchObject({ statusId: "3701", page: "1" }));
  });

  it("shows an error with retry, and an empty state without the backend English text", async () => {
    read.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false }); render(<QualityClaimsScreen />);
    expect(await screen.findByText("Chưa tải được danh sách khiếu nại")).toBeTruthy();
    serve({ list: page([]) }); fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Không có khiếu nại nào")).toBeTruthy(); expect(screen.queryByText("There is nothing to show yet.")).toBeNull();
  });

  it("denies a trader and sends no request", () => {
    workspace.mockReturnValue({ identity: { subjectType: "Trader" }, permissions: { functionPermissions: [] } }); render(<QualityClaimsScreen />);
    expect(screen.getByText("Bạn chưa có quyền xem khiếu nại chất lượng")).toBeTruthy(); expect(read).not.toHaveBeenCalled();
  });

  it("opens the detail under the row: photos through the BFF, invoice with prices, sendings in Vietnamese", async () => {
    serve({ detail: staff({ sendings: [{ channel: "Sms", phoneNumber: "0901234567", deliveryStatusId: 1602, deliveryStatus: "Sent", deliveryStatusAt: "2026-11-08T08:01:00+00:00" }]}) }); await openRow();
    expect(screen.getByText("Hàu chết nhiều, mùi hôi", { selector: "p" })).toBeTruthy();
    expect(screen.getAllByRole("img").map((img) => img.getAttribute("src"))).toEqual([0, 1].map((i) => `/api/operations/quality-claims?action=photo&id=${ids.claim}&index=${i}`));
    fireEvent.click(screen.getByRole("tab", { name: "Hóa đơn" }));
    expect(screen.getByText("Vùng nuôi 1")).toBeTruthy(); expect(screen.getByRole("columnheader", { name: "Thành tiền" })).toBeTruthy(); expect(screen.getAllByText(/10\.242\.500/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("tab", { name: "Tin đã gửi" }));
    expect(screen.getByText("Tin nhắn SMS")).toBeTruthy(); expect(screen.getByText("Đã gửi")).toBeTruthy(); expect(document.body.textContent).not.toMatch(/Completed|\bSent\b|\bSms\b/);
  });

  it("accepts with a required offer and an optional note, sends the row version, then refreshes", async () => {
    serve(); write.mockResolvedValue({ status: "success", data: staff({ ...answered("PriceCutWholeInvoice", 3703, "Giảm 10%"), message: "Saved" }) }); await openRow();
    fireEvent.click(screen.getByRole("button", { name: "Chấp nhận" }));
    const dialog = screen.getByRole("dialog", { name: "Chấp nhận khiếu nại" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận chấp nhận" }));
    expect(await within(dialog).findByText("Hãy chọn cách xử lý hợp tác xã đề nghị.")).toBeTruthy(); expect(write).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("radio", { name: "Giảm giá cả hóa đơn" }));
    fireEvent.change(within(dialog).getByLabelText(/Ghi chú cho thương lái/), { target: { value: "  Giảm 10%  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận chấp nhận" }));
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    expect(write.mock.calls[0][0]).toBe("accept"); expect(write.mock.calls[0][1]).toEqual({ offer: "PriceCutWholeInvoice", note: "Giảm 10%", rowVersion: "AAAAAAAAB9E=" }); expect(write.mock.calls[0][3]).toBe(ids.claim);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Chấp nhận khiếu nại" })).toBeNull());
    expect(screen.queryByRole("button", { name: "Chấp nhận" })).toBeNull(); expect(screen.getByText("Đề nghị: Giảm giá cả hóa đơn")).toBeTruthy();
    await waitFor(() => expect(read.mock.calls.filter(([action]) => action === "list")).toHaveLength(2));
    expect(screen.getByRole("tablist")).toBeTruthy();
  });

  it("rejects only with a reason, and explains why a cancelled or returned invoice cannot be accepted", async () => {
    serve(); write.mockResolvedValueOnce({ status: "error", httpStatus: 409, uncertain: false }); await openRow();
    fireEvent.click(screen.getByRole("button", { name: "Chấp nhận" }));
    let dialog = screen.getByRole("dialog", { name: "Chấp nhận khiếu nại" });
    fireEvent.click(within(dialog).getByRole("radio", { name: "Trả lại toàn bộ hàng" })); fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận chấp nhận" }));
    expect(await within(dialog).findByText(/hóa đơn đã bị hủy hoặc đã có phiếu trả hàng/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Bỏ qua" }));
    fireEvent.click(screen.getByRole("button", { name: "Từ chối" }));
    dialog = screen.getByRole("dialog", { name: "Từ chối khiếu nại" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận từ chối" }));
    expect(await within(dialog).findByText("Hãy nhập lý do từ chối để gửi cho thương lái.")).toBeTruthy(); expect(write).toHaveBeenCalledTimes(1);
    write.mockResolvedValueOnce({ status: "success", data: staff(answered(null, 3702, "Ảnh không rõ")) });
    fireEvent.change(within(dialog).getByLabelText(/Lý do từ chối/), { target: { value: "Ảnh không rõ" } }); fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận từ chối" }));
    await waitFor(() => expect(write).toHaveBeenCalledTimes(2));
    expect(write.mock.calls[1].slice(0, 2)).toEqual(["reject", { note: "Ảnh không rõ", rowVersion: "AAAAAAAAB9E=" }]);
    expect(await screen.findByText("Ảnh không rõ", { selector: "p" })).toBeTruthy();
  });

  it("locks the dialog after an uncertain write until the detail is reloaded (no replay)", async () => {
    serve(); write.mockResolvedValueOnce({ status: "error", httpStatus: 0, uncertain: true }); await openRow();
    fireEvent.click(screen.getByRole("button", { name: "Từ chối" }));
    const dialog = screen.getByRole("dialog", { name: "Từ chối khiếu nại" });
    fireEvent.change(within(dialog).getByLabelText(/Lý do từ chối/), { target: { value: "Không đạt" } }); fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận từ chối" }));
    expect(await within(dialog).findByText(/Chưa xác nhận được kết quả/)).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Xác nhận từ chối" })).toBeNull(); expect(write).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole("button", { name: "Tải lại chi tiết" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Từ chối khiếu nại" })).toBeNull());
  });

  it("lets a zone manager read the claim but not answer it; answered claims have no actions", async () => {
    workspace.mockReturnValue(manager); serve(); await openRow();
    expect(screen.queryByRole("button", { name: "Chấp nhận" })).toBeNull(); expect(screen.getByText(/Chỉ Chủ hợp tác xã được chấp nhận hoặc từ chối/)).toBeTruthy();
    cleanup(); serve({ detail: staff(answered("ReturnAllGoods", 3703, null)) }); workspace.mockReturnValue(owner); await openRow();
    expect(screen.queryByRole("button", { name: "Từ chối" })).toBeNull();
  });
});
