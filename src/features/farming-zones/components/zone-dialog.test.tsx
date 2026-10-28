// @vitest-environment jsdom
import type { ReactNode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ZoneDialog } from "./zone-dialog";
import { initialFarmingZones } from "../mocks/farming-zone-fixtures";
import { createMockFarmingZoneStore } from "../repositories/mock-farming-zone-store";
import { createFarmingZoneService } from "../services/farming-zone-service";
import type { ZoneMutationResult, ZoneWorkspace } from "../domain/farming-zone";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    title,
    onOpenChange,
  }: {
    children: ReactNode;
    open: boolean;
    title: string;
    onOpenChange(open: boolean): void;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button onClick={() => onOpenChange(false)}>Thử đóng {title}</button>
        {children}
      </div>
    ) : null,
}));
afterEach(cleanup);
function setup(canWrite = true) {
  const store = createMockFarmingZoneStore({
    initialZones: initialFarmingZones,
    latencyMs: 0,
  });
  const service = createFarmingZoneService(
    store.forAccess(() => ({
      canWrite,
      visibleZoneIds: canWrite ? null : ["zone-east"],
      actorName: "Người kiểm thử",
    })),
  );
  const workspace: ZoneWorkspace = {
    canWrite,
    zones: canWrite ? initialFarmingZones : [initialFarmingZones[0]],
    documents: [],
  };
  const onSaved = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <ZoneDialog
      zone={initialFarmingZones[0]}
      workspace={workspace}
      service={service}
      onSaved={onSaved}
      onClose={onClose}
    />,
  );
  return { ...view, service, store, onSaved, onClose };
}
it("renders a readonly assigned-zone profile without Owner actions", () => {
  setup(false);
  expect(screen.getByText("21.0712, 107.4321")).toBeTruthy();
  expect(screen.getByText(/Thiếu hồ sơ còn hiệu lực/)).toBeTruthy();
  for (const name of [
    "Lưu thông tin vùng",
    "Thêm giấy tờ",
    "Ngừng sử dụng vùng",
  ])
    expect(screen.queryByRole("button", { name })).toBeNull();
});
it("requires an explicit discard decision before closing a dirty zone", async () => {
  const { onClose } = setup();
  fireEvent.change(screen.getByLabelText("Tên vùng *"), {
    target: { value: "Tên đang nhập" },
  });
  expect(
    (
      screen.getByRole("button", {
        name: "Ngừng sử dụng vùng",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Thử đóng Khu Đông" }));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Bỏ thay đổi" }));
  expect(onClose).toHaveBeenCalledOnce();
});
it("does not publish a save after unmount while form validation is still pending", async () => {
  const { unmount, service, onSaved } = setup();
  const save = vi.spyOn(service, "save");
  const name = screen.getByLabelText("Tên vùng *");
  await act(async () => {
    fireEvent.submit(name.closest("form")!);
    unmount();
  });
  expect(save).not.toHaveBeenCalled();
  expect(onSaved).not.toHaveBeenCalled();
});
it("cancels the pending validation when the draft is discarded", async () => {
  const { service } = setup();
  const save = vi.spyOn(service, "save");
  const name = screen.getByLabelText("Tên vùng *");
  fireEvent.change(name, { target: { value: "Bản nháp" } });
  await act(async () => {
    fireEvent.submit(name.closest("form")!);
    fireEvent.click(screen.getByRole("button", { name: "Hủy thay đổi" }));
  });
  expect(save).not.toHaveBeenCalled();
  expect((name as HTMLInputElement).value).toBe("Khu Đông");
});
it("blocks close synchronously before the pending state renders and sends one save", async () => {
  const { service, onClose, onSaved } = setup();
  let resolve!: (value: ZoneMutationResult) => void;
  const save = vi.spyOn(service, "save").mockImplementation(() => {
    fireEvent.click(screen.getByRole("button", { name: "Thử đóng Khu Đông" }));
    return new Promise((finish) => {
      resolve = finish;
    });
  });
  const form = screen.getByLabelText("Tên vùng *").closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => resolve({ status: "forbidden" }));
  expect(screen.getByRole("alert").textContent).toContain("không có quyền");
  expect(onSaved).not.toHaveBeenCalled();
});
it("opening a document editor keeps the zone metadata draft intact", () => {
  setup();
  const input = screen.getByLabelText<HTMLInputElement>("Tên vùng *");
  fireEvent.change(input, { target: { value: "Tên vùng chưa lưu" } });
  fireEvent.click(screen.getByRole("button", { name: "Thêm giấy tờ" }));
  expect(screen.getByRole("dialog", { name: "Thêm giấy tờ" })).toBeTruthy();
  expect(input.value).toBe("Tên vùng chưa lưu");
});
it("returns keyboard focus to the zone name after a pending save", async () => {
  const { service, onSaved } = setup();
  let finish!: (value: ZoneMutationResult) => void;
  vi.spyOn(service, "save").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const name = screen.getByLabelText<HTMLInputElement>("Tên vùng *");
  fireEvent.submit(name.closest("form")!);
  await screen.findByRole("button", { name: "Đang xử lý..." });
  await act(async () =>
    finish({
      status: "saved",
      savedId: "zone-east",
      workspace: { canWrite: true, zones: initialFarmingZones, documents: [] },
    }),
  );
  expect(onSaved).toHaveBeenCalledOnce();
  await waitFor(() => expect(document.activeElement).toBe(name));
});
it("binds a duplicate code error to its field and restores focus there", async () => {
  const { service } = setup();
  let finish!: (value: ZoneMutationResult) => void;
  vi.spyOn(service, "save").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const code = screen.getByLabelText<HTMLInputElement>("Mã vùng *");
  fireEvent.change(code, { target: { value: "DEMO-02" } });
  fireEvent.submit(code.closest("form")!);
  await screen.findByRole("button", { name: "Đang xử lý..." });
  await act(async () =>
    finish({ status: "duplicate", existingId: "zone-south" }),
  );
  expect(code.getAttribute("aria-invalid")).toBe("true");
  expect(
    screen.getByText("Mã vùng đã được sử dụng. Hãy nhập mã khác."),
  ).toBeTruthy();
  await waitFor(() => expect(document.activeElement).toBe(code));
  fireEvent.click(screen.getByRole("button", { name: "Hủy thay đổi" }));
  expect(code.value).toBe("DEMO-01");
  expect(screen.queryByRole("alert")).toBeNull();
});
it("focuses the required attachment without submitting an incomplete document", async () => {
  const { service } = setup();
  const save = vi.spyOn(service, "saveDocument");
  fireEvent.click(screen.getByRole("button", { name: "Thêm giấy tờ" }));
  const number = screen.getByLabelText("Số giấy tờ *");
  fireEvent.change(number, { target: { value: "GP-TEST" } });
  fireEvent.submit(number.closest("form")!);
  await screen.findByText("Chọn tệp đính kèm cho giấy tờ mới.");
  expect(document.activeElement).toBe(screen.getByLabelText("Tệp đính kèm *"));
  expect(save).not.toHaveBeenCalled();
});
