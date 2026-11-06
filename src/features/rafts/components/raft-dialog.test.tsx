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
import { RaftDialog } from "./raft-dialog";
import { mockRafts } from "../mocks/raft-fixtures";
import type { RaftMutationResult, RaftProfile } from "../domain/raft";
import type { RaftService } from "../services/raft-service";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
    title,
    onOpenChange,
  }: {
    open: boolean;
    children: ReactNode;
    title: string;
    onOpenChange(open: boolean): void;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button onClick={() => onOpenChange(false)}>Đóng {title}</button>
        {children}
      </div>
    ) : null,
}));
vi.mock("./raft-condition-panel", () => ({
  RaftConditionPanel: () => <section aria-label="Tình trạng làn nuôi" />,
}));
vi.mock("./raft-photo", () => ({
  RaftPhoto: ({ canWrite }: { canWrite: boolean }) =>
    canWrite ? <button>Chọn ảnh bè</button> : <p>Ảnh bè</p>,
}));
afterEach(cleanup);
it("keeps exactly one diagram and photo panel across successive saved versions", () => {
  const service: RaftService = {
    changeStatus: vi.fn(),
    save: vi.fn(),
    load: vi.fn(),
    getCondition: vi.fn(),
    savePhoto: vi.fn(),
    getPhoto: vi.fn(),
  };
  function dialog(raft: RaftProfile) {
    return (
      <RaftDialog
        raft={raft}
        zoneName="Vùng A"
        workspace={{ rafts: [raft], zones: [], canWrite: true }}
        service={service}
        onSaved={vi.fn()}
        onClose={vi.fn()}
      />
    );
  }
  const view = render(dialog(mockRafts[1].profile));
  for (const recordVersion of ["saved-photo", "stopped", "reactivated"]) {
    view.rerender(dialog({ ...mockRafts[1].profile, recordVersion }));
    expect(
      screen.getAllByRole("region", { name: "Tình trạng làn nuôi" }),
    ).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Chọn ảnh bè" })).toHaveLength(
      1,
    );
  }
});
function setup(canWrite = true, index = 1, zoneActive = true) {
  const raft = mockRafts[index].profile;
  const changeStatus = vi
    .fn<RaftService["changeStatus"]>()
    .mockResolvedValue({ status: "conflict" });
  const service: RaftService = {
    changeStatus,
    save: vi.fn(),
    load: vi.fn(),
    getCondition: vi.fn(),
    savePhoto: vi.fn(),
    getPhoto: vi.fn(),
  };
  const onSaved = vi.fn(),
    onClose = vi.fn();
  const view = render(
    <RaftDialog
      raft={raft}
      zoneName="Vùng A"
      workspace={{
        rafts: [raft],
        canWrite,
        zones: [
          {
            id: "zone-east",
            label: "Vùng A",
            status: zoneActive ? "in-use" : "discontinued",
          },
        ],
      }}
      service={service}
      onSaved={onSaved}
      onClose={onClose}
    />,
  );
  return { changeStatus, onSaved, onClose, ...view };
}
it("shows read-only profile without write controls to a scoped reader", () => {
  setup(false);
  expect(
    screen.getByRole("region", { name: "Tình trạng làn nuôi" }),
  ).toBeTruthy();
  for (const name of ["Chỉnh sửa", "Ngừng sử dụng", "Chọn ảnh bè"])
    expect(screen.queryByRole("button", { name })).toBeNull();
});
it("disables stop for an open cycle and explains why", () => {
  setup(true, 0);
  expect(
    (screen.getByRole("button", { name: "Ngừng sử dụng" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(screen.getByText(/Bè còn chu kỳ nuôi đang mở/)).toBeTruthy();
});
it("disables reactivation when the zone is stopped", () => {
  setup(true, 2, false);
  expect(
    (
      screen.getByRole("button", {
        name: "Khôi phục sử dụng",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
it("keeps status errors inside the top confirmation rather than behind the popup", async () => {
  const h = setup();
  fireEvent.click(screen.getByRole("button", { name: "Ngừng sử dụng" }));
  const confirm = within(
    screen.getByRole("dialog", { name: "Ngừng sử dụng bè B1-02?" }),
  );
  fireEvent.click(confirm.getByRole("button", { name: "Ngừng sử dụng" }));
  expect(await confirm.findByRole("alert")).toBeTruthy();
  expect(h.changeStatus.mock.calls[0][0]).toMatchObject({
    id: "raft-1-2",
    recordVersion: mockRafts[1].profile.recordVersion,
    status: "discontinued",
  });
  expect(h.onSaved).not.toHaveBeenCalled();
});
it("locks close and repeated status confirmation synchronously until the command finishes", async () => {
  const h = setup();
  let resolve!: (result: RaftMutationResult) => void;
  h.changeStatus.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Ngừng sử dụng" }));
  const confirm = within(
    screen.getByRole("dialog", { name: "Ngừng sử dụng bè B1-02?" }),
  );
  fireEvent.click(confirm.getByRole("button", { name: "Ngừng sử dụng" }));
  fireEvent.click(screen.getByRole("button", { name: "Đóng Bè B1-02" }));
  fireEvent.click(
    confirm.getByRole("button", { name: "Đóng Ngừng sử dụng bè B1-02?" }),
  );
  expect(h.changeStatus).toHaveBeenCalledOnce();
  expect(h.onClose).not.toHaveBeenCalled();
  expect(
    screen.getByRole("dialog", { name: "Ngừng sử dụng bè B1-02?" }),
  ).toBeTruthy();
  await act(async () => resolve({ status: "forbidden" }));
  await waitFor(() =>
    expect(confirm.getByRole("alert").textContent).toContain(
      "Bạn không còn quyền",
    ),
  );
});
