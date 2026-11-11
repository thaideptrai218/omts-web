// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
const files = vi.hoisted(() => ({ template: vi.fn(), importFile: vi.fn() }));
vi.mock("./employee-file-repository", () => ({ employeeFileRepository: files }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { EmployeeImportDialog } from "./employee-import-dialog";

const onClose = vi.fn(), onImported = vi.fn();
beforeEach(() => { vi.clearAllMocks(); files.template.mockResolvedValue({ status: "success", data: true }); });
afterEach(cleanup);
const xlsx = (name = "nv.xlsx", size = 8) => new File([new Uint8Array(size)], name);
const pick = (file: File) => fireEvent.change(screen.getByLabelText("Chọn file"), { target: { files: [file] } });
const send = () => fireEvent.click(screen.getByRole("button", { name: "Nhập file" }));
const dialog = () => render(<EmployeeImportDialog onClose={onClose} onImported={onImported} />);

it("offers the template, needs a file before it can import and does not submit any form", () => {
  dialog();
  expect(screen.getByRole("dialog", { name: "Nhập nhân viên từ file" })).toBeTruthy();
  expect((screen.getByRole("button", { name: "Nhập file" }) as HTMLButtonElement).disabled).toBe(true);
  expect(document.querySelector("form")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Tải file mẫu" }));
  expect(files.template).toHaveBeenCalledTimes(1);
});

it("refuses a wrong extension and a file above 2 MB on the client", () => {
  dialog();
  pick(xlsx("nv.csv"));
  expect(screen.getByRole("alert").textContent).toContain("Chỉ nhận file Excel .xlsx");
  expect((screen.getByRole("button", { name: "Nhập file" }) as HTMLButtonElement).disabled).toBe(true);
  pick(xlsx("nv.xlsx", 2 * 1024 * 1024 + 1));
  expect(screen.getByRole("alert").textContent).toContain("2 MB");
  expect(files.importFile).not.toHaveBeenCalled();
});

it("shows the number imported and a Dòng / Trường / Thông báo table of skipped rows, and refreshes the list once", async () => {
  files.importFile.mockResolvedValue({ status: "success", data: { imported: 3, errors: [
    { row: 5, fields: ["Phone number"], message: "Repeated in this file.", messageCode: null },
    { row: 9, fields: ["Code", "Gender"], message: "Missing or invalid.", messageCode: "MSG-GEN-01" },
    { row: 12, fields: [], message: "Formulas are not accepted.", messageCode: null },
    { row: 14, fields: ["Phone number"], message: "Another employee", messageCode: "MSG-LABOR-03" },
  ] } });
  dialog(); pick(xlsx()); send();
  expect((await screen.findByRole("status")).textContent).toBe("Đã nhập 3 nhân viên. Bỏ qua 4 dòng lỗi.");
  expect(onImported).toHaveBeenCalledTimes(1); expect(onImported).toHaveBeenCalledWith(3);
  const table = screen.getByRole("table");
  expect(within(table).getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["Dòng", "Trường", "Thông báo"]);
  const rows = within(table).getAllByRole("row").slice(1).map(row => within(row).getAllByRole("cell").map(cell => cell.textContent));
  expect(rows).toEqual([["5", "Số điện thoại", "Bị lặp lại trong file."], ["9", "Mã nhân viên, Giới tính", "Thiếu hoặc không hợp lệ."], ["12", "—", "Không nhận ô chứa công thức."], ["14", "Số điện thoại", "Số điện thoại đã thuộc về một nhân viên đang làm việc."]]);
  expect(screen.queryByRole("button", { name: "Nhập file" })).toBeNull();
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("a clean import shows only the count with a Đóng button", async () => {
  files.importFile.mockResolvedValue({ status: "success", data: { imported: 2, errors: [] } });
  dialog(); pick(xlsx()); send();
  expect((await screen.findByRole("status")).textContent).toBe("Đã nhập 2 nhân viên.");
  expect(screen.queryByRole("table")).toBeNull(); expect(screen.queryByRole("button", { name: "Chọn file khác" })).toBeNull();
});

it("when nothing could be imported, Chọn file khác returns to the picker without importing or closing", async () => {
  files.importFile.mockResolvedValue({ status: "success", data: { imported: 0, errors: [{ row: 2, fields: ["Full name"], message: "Missing or invalid.", messageCode: null }] } });
  dialog(); pick(xlsx()); send();
  await screen.findByRole("table");
  expect(onImported).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Chọn file khác" }));
  expect(screen.getByLabelText("Chọn file")).toBeTruthy(); expect((screen.getByRole("button", { name: "Nhập file" }) as HTMLButtonElement).disabled).toBe(true);
  expect(files.importFile).toHaveBeenCalledTimes(1); expect(onClose).not.toHaveBeenCalled();
});

it("explains a refused file, and blocks a second upload after an unknown outcome", async () => {
  files.importFile.mockResolvedValueOnce({ status: "error", httpStatus: 400, code: "MSG-GEN-01", uncertain: false }).mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: true });
  dialog(); pick(xlsx()); send();
  expect((await screen.findByRole("alert")).textContent).toContain("File chưa đúng mẫu");
  send();
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Chưa xác định được kết quả nhập file"));
  expect((screen.getByRole("button", { name: "Nhập file" }) as HTMLButtonElement).disabled).toBe(true);
  expect(files.importFile).toHaveBeenCalledTimes(2);
});

it("ignores a second click while the upload is running and locks the footer", async () => {
  let finish!: (value: unknown) => void;
  files.importFile.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  dialog(); pick(xlsx());
  const submit = screen.getByRole("button", { name: "Nhập file" });
  fireEvent.click(submit); fireEvent.click(submit);
  expect(files.importFile).toHaveBeenCalledTimes(1);
  expect((screen.getByRole("button", { name: "Bỏ qua" }) as HTMLButtonElement).disabled).toBe(true);
  finish({ status: "success", data: { imported: 1, errors: [] } });
  await screen.findByRole("status");
});

it("regression: the footer buttons are separate elements with explicit type button when the step changes", async () => {
  files.importFile.mockResolvedValue({ status: "success", data: { imported: 0, errors: [{ row: 2, fields: [], message: "x", messageCode: null }] } });
  dialog(); pick(xlsx());
  const cancel = screen.getByRole("button", { name: "Bỏ qua" }), submit = screen.getByRole("button", { name: "Nhập file" });
  expect(cancel.getAttribute("type")).toBe("button"); expect(submit.getAttribute("type")).toBe("button");
  send();
  await screen.findByRole("table");
  const close = screen.getByRole("button", { name: "Đóng" }), again = screen.getByRole("button", { name: "Chọn file khác" });
  expect(close.getAttribute("type")).toBe("button"); expect(again.getAttribute("type")).toBe("button");
  expect(close).not.toBe(cancel); expect(close).not.toBe(submit); expect(again).not.toBe(submit);
});
