// @vitest-environment jsdom
import type { ReactNode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RaftEditorDialog } from "./raft-editor-dialog";
import { mockRafts } from "../mocks/raft-fixtures";
import type { RaftMutationResult } from "../domain/raft";
import type { RaftService } from "../services/raft-service";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
    title,
    dismissible = true,
    onOpenChange,
  }: {
    open: boolean;
    children: ReactNode;
    title: string;
    dismissible?: boolean;
    onOpenChange(open: boolean): void;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button disabled={!dismissible} onClick={() => onOpenChange(false)}>
          Đóng {title}
        </button>
        {children}
      </div>
    ) : null,
}));
afterEach(cleanup);
function setup(index = 1) {
  const save = vi
    .fn<RaftService["save"]>()
    .mockResolvedValue({ status: "conflict" });
  const service: RaftService = {
    save,
    load: vi.fn(),
    getCondition: vi.fn(),
    changeStatus: vi.fn(),
    savePhoto: vi.fn(),
    getPhoto: vi.fn(),
  };
  const onClose = vi.fn(),
    onSaved = vi.fn();
  const renderResult = render(
    <RaftEditorDialog
      raft={mockRafts[index].profile}
      zones={[{ id: "zone-east", label: "Vùng A", status: "in-use" }]}
      service={service}
      onClose={onClose}
      onSaved={onSaved}
    />,
  );
  return { save, onClose, onSaved, ...renderResult };
}
it("keeps draft after a version conflict and asks before discarding it", async () => {
  const h = setup();
  fireEvent.change(screen.getByLabelText(/Ghi chú tình trạng/), {
    target: { value: "Phao mới" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await screen.findByText(/Hồ sơ đã thay đổi ở lượt thao tác khác/);
  expect(
    (screen.getByLabelText(/Ghi chú tình trạng/) as HTMLTextAreaElement).value,
  ).toBe("Phao mới");
  fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
  const discard = within(
    screen.getByRole("dialog", { name: "Bỏ thay đổi chưa lưu?" }),
  );
  fireEvent.click(discard.getByRole("button", { name: "Tiếp tục nhập" }));
  expect(h.onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
  fireEvent.click(screen.getByRole("button", { name: "Bỏ thay đổi" }));
  expect(h.onClose).toHaveBeenCalledOnce();
});
it("binds duplicate code to the field, preserves input and focuses it", async () => {
  const h = setup();
  h.save.mockResolvedValue({ status: "duplicate", existingId: "raft-1-1" });
  fireEvent.change(screen.getByLabelText(/Mã bè/), {
    target: { value: "B1-01" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await screen.findByText("Mã bè đã có trong vùng này. Hãy chọn mã khác.");
  expect(screen.getByLabelText(/Mã bè/).getAttribute("aria-invalid")).toBe(
    "true",
  );
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByLabelText(/Mã bè/)),
  );
});
it("locks layout but permits metadata edits while a cycle is open", async () => {
  const h = setup(0);
  expect(
    (
      screen
        .getByRole("button", { name: "Thêm làn" })
        .closest("fieldset") as HTMLFieldSetElement
    ).disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText(/Ghi chú tình trạng/), {
    target: { value: "Kiểm tra neo" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() => expect(h.save).toHaveBeenCalledOnce());
  expect(h.save.mock.calls[0][0]).toMatchObject({
    conditionNotes: "Kiểm tra neo",
    lanes: mockRafts[0].profile.layouts.at(-1)?.lanes,
  });
});
it("blocks repeated submit and closing while a save is pending", async () => {
  const h = setup();
  let resolve!: (result: RaftMutationResult) => void;
  h.save.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const form = screen.getByLabelText(/Mã bè/).closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  await waitFor(() => expect(h.save).toHaveBeenCalledOnce());
  expect(
    (screen.getByRole("button", { name: "Hủy" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  await act(async () => resolve({ status: "forbidden" }));
  expect(await screen.findByText(/Bạn không còn quyền/)).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "Hủy" }) as HTMLButtonElement).disabled,
  ).toBe(false);
});
it("does not send a command after the form closes while async validation is pending", async () => {
  const h = setup();
  fireEvent.submit(screen.getByLabelText(/Mã bè/).closest("form")!);
  h.unmount();
  await act(async () => {
    await Promise.resolve();
  });
  expect(h.save).not.toHaveBeenCalled();
});
it("ignores a late saved reply after unmount", async () => {
  const h = setup();
  let resolve!: (result: RaftMutationResult) => void;
  h.save.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() => expect(h.save).toHaveBeenCalledOnce());
  h.unmount();
  await act(async () =>
    resolve({
      status: "saved",
      savedId: "raft-1-2",
      workspace: { rafts: [], zones: [], canWrite: true },
    }),
  );
  expect(h.onSaved).not.toHaveBeenCalled();
});
it("creates with validated coordinates/lanes and only offers active zones", async () => {
  const save = vi
    .fn<RaftService["save"]>()
    .mockResolvedValue({ status: "duplicate", existingId: "other" });
  const service: RaftService = {
    save,
    load: vi.fn(),
    getCondition: vi.fn(),
    changeStatus: vi.fn(),
    savePhoto: vi.fn(),
    getPhoto: vi.fn(),
  };
  render(
    <RaftEditorDialog
      zones={[
        { id: "active", label: "Vùng hoạt động", status: "in-use" },
        { id: "stopped", label: "Vùng đã ngừng", status: "discontinued" },
      ]}
      service={service}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />,
  );
  expect(screen.queryByRole("option", { name: "Vùng đã ngừng" })).toBeNull();
  for (const [label, value] of [
    ["Vùng nuôi", "active"],
    ["Mã bè", "B-NEW"],
    ["Kích thước", "24 × 12 m"],
    ["Vĩ độ", "20,9"],
    ["Kinh độ", "107.2"],
    ["Chiều dài làn 1 (m)", "24,5"],
    ["Mốc A làn 1", "Đầu bờ"],
    ["Mốc B làn 1", "Phía biển"],
  ]) {
    fireEvent.change(
      screen.getByLabelText(new RegExp(label.replace(/[()]/g, "\\$&"))),
      { target: { value } },
    );
  }
  fireEvent.click(screen.getByRole("button", { name: "Tạo bè nuôi" }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0]).toMatchObject({
    id: null,
    recordVersion: null,
    zoneId: "active",
    code: "B-NEW",
    latitude: "20,9",
    lanes: [
      { number: 1, length: 24.5, markerA: "Đầu bờ", markerB: "Phía biển" },
    ],
  });
});
