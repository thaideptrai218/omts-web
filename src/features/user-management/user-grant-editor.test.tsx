// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
const read = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
const revoke = vi.hoisted(() => vi.fn());
const options = vi.hoisted(() => vi.fn());
vi.mock("@/features/personal-api/account-grants-repository", () => ({ readAccountGrants: read, createAccountGrant: create, revokeAccountGrant: revoke }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: options }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { UserGrantEditor } from "./user-grant-editor";
import { grantFailureMessage } from "./user-grant-apply";

const ngoc = "11111111-1111-4111-8111-111111111111", thai = "22222222-2222-4222-8222-222222222222";
const row = (id: string, zoneId: string | null, zoneName: string | null, state = "Effective", role = "ZONE_MANAGER") => ({ id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${id}`, roleId: "44444444-4444-4444-8444-444444444444", roleName: role === "ACCOUNTANT" ? "Accountant" : "Zone Manager", role, zoneId, zoneName, allZones: zoneId === null,
  grantedAt: "2026-11-18T21:05:00+07:00", grantedByAccountId: "55555555-5555-4555-8555-555555555555", state, revokedAt: null, revokeReason: null });
function setup(rows = [row("1", ngoc, "Vùng nuôi Ngọc Vừng")], beforeGrant?: (role: string) => Promise<boolean>) {
  read.mockResolvedValue({ status: "success", data: rows });
  options.mockResolvedValue({ status: "success", data: [{ id: ngoc, name: "Vùng nuôi Ngọc Vừng", statusId: 101 }, { id: thai, name: "Thái Đẹp Trai Pro Max", statusId: 101 }] });
  render(<UserGrantEditor accountId="acc" beforeGrant={beforeGrant} />);
}
const chip = (name: RegExp) => screen.findByRole("button", { name });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("grant editor", () => {
  it("shows the held zone as an active chip marked Đang giao, every other zone selectable, and nothing to save yet", async () => {
    setup();
    const held = await chip(/Vùng nuôi Ngọc Vừng/);
    expect(held.getAttribute("aria-pressed")).toBe("true"); expect(held.textContent).toMatch(/✓.*Đang giao/); expect((held as HTMLButtonElement).disabled).toBe(false);
    for (const name of [/Thái Đẹp Trai Pro Max/, /Thái Đẹp Trai Pro Max/]) expect(((await chip(name)) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("radio", { name: "Một số vùng" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("button", { name: "Lưu thay đổi" }) as HTMLButtonElement).disabled).toBe(true);
    expect(document.body.textContent).toMatch(/Chưa có thay đổi nào/);
  });
  it("marks a new zone Sẽ thêm and sends only that zone, never the pair already held", async () => {
    create.mockResolvedValue({ status: "success", data: row("2", thai, "Thái Đẹp Trai Pro Max") });
    setup();
    const added = await chip(/Thái Đẹp Trai Pro Max/); fireEvent.click(added);
    expect(added.textContent).toMatch(/\+.*Sẽ thêm/);
    expect(screen.getByText("+ Sẽ thêm:").parentElement?.textContent).toMatch(/Thái Đẹp Trai Pro Max/);
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await screen.findByText("Đã thêm: Thái Đẹp Trai Pro Max.");
    expect(create).toHaveBeenCalledTimes(1); expect(create).toHaveBeenCalledWith("acc", thai, "ZONE_MANAGER"); expect(revoke).not.toHaveBeenCalled();
  });
  it("lets a current grant be clicked off (Sẽ bỏ), asks one reason only then, and revokes with it", async () => {
    revoke.mockResolvedValue({ status: "success", data: { ...row("1", ngoc, "Vùng nuôi Ngọc Vừng", "Revoked"), revokedAt: "2026-11-23T10:00:00+07:00", revokeReason: "Đổi vùng" } });
    setup();
    expect(screen.queryByLabelText("Lý do bỏ quyền *")).toBeNull();
    const held = await chip(/Vùng nuôi Ngọc Vừng/); fireEvent.click(held);
    expect(held.textContent).toMatch(/−.*Sẽ bỏ/);
    expect(screen.getByText("− Sẽ bỏ:").parentElement?.textContent).toMatch(/Vùng nuôi Ngọc Vừng/);
    expect((screen.getByRole("button", { name: "Lưu thay đổi" }) as HTMLButtonElement).disabled).toBe(true);
    expect(document.body.textContent).toMatch(/Nhập lý do bỏ quyền/);
    fireEvent.change(screen.getByLabelText("Lý do bỏ quyền *"), { target: { value: " Đổi vùng " } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await screen.findByText("Đã bỏ: Vùng nuôi Ngọc Vừng.");
    expect(revoke).toHaveBeenCalledWith("acc", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "Đổi vùng");
  });
  it("Tất cả vùng is a mode: chips hide, the summary replaces the held zone, one reason, add then revoke; switching back restores", async () => {
    create.mockResolvedValue({ status: "success", data: row("3", null, null) });
    revoke.mockResolvedValue({ status: "success", data: { ...row("1", ngoc, "Vùng nuôi Ngọc Vừng", "Revoked"), revokedAt: "2026-11-23T10:00:00+07:00", revokeReason: "Gộp" } });
    setup();
    await chip(/Vùng nuôi Ngọc Vừng/);
    fireEvent.click(screen.getByRole("radio", { name: "Tất cả vùng" }));
    expect(screen.queryByRole("button", { name: /Vùng nuôi Ngọc Vừng/ })).toBeNull();
    expect(screen.getByText(/Quản lý vùng làm việc ở mọi vùng, kể cả vùng tạo sau\./)).toBeTruthy();
    expect(screen.getByText("+ Sẽ thêm:").parentElement?.textContent).toMatch(/Tất cả vùng/);
    expect(screen.getByText("− Sẽ bỏ:").parentElement?.textContent).toMatch(/Vùng nuôi Ngọc Vừng \(đã nằm trong Tất cả vùng\)/);
    fireEvent.click(screen.getByRole("radio", { name: "Một số vùng" }));
    expect(screen.queryByLabelText("Lý do bỏ quyền *")).toBeNull();
    expect((await chip(/Vùng nuôi Ngọc Vừng/)).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "Tất cả vùng" }));
    fireEvent.change(screen.getByLabelText("Lý do bỏ quyền *"), { target: { value: "Gộp" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(revoke).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith("acc", null, "ZONE_MANAGER");
    expect(create.mock.invocationCallOrder[0]).toBeLessThan(revoke.mock.invocationCallOrder[0]);
  });
  it("shows Tất cả vùng as the current state when it is already held", async () => {
    setup([row("4", null, null)]);
    await screen.findByText(/✓ Đang giao: Tất cả vùng\./);
    expect((screen.getByRole("radio", { name: "Tất cả vùng" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("button", { name: "Lưu thay đổi" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("says Kế toán is not held and warns before assigning it; OK continues, Back leaves it unchanged", async () => {
    const warn = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    create.mockResolvedValue({ status: "success", data: row("5", null, null, "Effective", "ACCOUNTANT") });
    setup(undefined, warn);
    await screen.findByText("Chưa giữ vai trò Kế toán");
    fireEvent.click(screen.getByRole("button", { name: "Giao vai trò Kế toán" }));
    await waitFor(() => expect(warn).toHaveBeenCalledWith("ACCOUNTANT"));
    expect(screen.getByText("Chưa giữ vai trò Kế toán")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Giao vai trò Kế toán" }));
    await screen.findByText("+ Sẽ giao vai trò Kế toán");
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(create).toHaveBeenCalledWith("acc", null, "ACCOUNTANT"));
  });
  it("keeps going after a failure, explains it in Vietnamese and keeps the selection; Hoàn tác restores", async () => {
    create.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-02", uncertain: false });
    setup();
    fireEvent.click(await chip(/Thái Đẹp Trai Pro Max/));
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await screen.findByText(/Chưa thêm Thái Đẹp Trai Pro Max: Tài khoản này đã có quyền ở vùng đó\./);
    expect(document.body.textContent).not.toMatch(/Bản ghi đã tồn tại/);
    expect((await chip(/Thái Đẹp Trai Pro Max/)).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tác" }));
    expect((await chip(/Thái Đẹp Trai Pro Max/)).getAttribute("aria-pressed")).toBe("false");
  });
  it("maps a duplicate to plain Vietnamese", () => {
    expect(grantFailureMessage({ status: "error", httpStatus: 409, code: "MSG03", uncertain: false })).toBe("Tài khoản này đã có quyền ở vùng đó.");
  });
});
