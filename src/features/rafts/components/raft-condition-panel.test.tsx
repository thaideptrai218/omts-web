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
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RaftConditionPanel } from "./raft-condition-panel";
import { mockRafts } from "../mocks/raft-fixtures";
import { projectRaftCondition } from "../domain/project-raft-condition";
import type { RaftConditionResult } from "../domain/raft";
import type { RaftService } from "../services/raft-service";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    title,
    onOpenChange,
  }: {
    children: ReactNode;
    title: string;
    onOpenChange(open: boolean): void;
  }) => (
    <div role="dialog" aria-label={title}>
      <button onClick={() => onOpenChange(false)}>Đóng nguồn</button>
      {children}
    </div>
  ),
}));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-28T08:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function setup(index = 0) {
  const record = mockRafts[index];
  const getCondition = vi
    .fn<RaftService["getCondition"]>()
    .mockImplementation(async (input) => ({
      status: "loaded",
      condition: projectRaftCondition(record, input),
    }));
  const service: RaftService = {
    load: vi.fn(),
    getCondition,
    save: vi.fn(),
    changeStatus: vi.fn(),
    savePhoto: vi.fn(),
    getPhoto: vi.fn(),
  };
  return { record, service, getCondition };
}
it("shows source records for a real colored portion and closes only the source dialog", async () => {
  const { record, service } = setup();
  render(<RaftConditionPanel raft={record.profile} service={service} />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Làn 1, 0–8 m: Đã thu hoạch" }),
  );
  const source = within(
    screen.getByRole("dialog", { name: "Nguồn đoạn làn 1" }),
  );
  expect(source.getByText("GIONG-1-01")).toBeTruthy();
  expect(source.getByText("DH-1-01")).toBeTruthy();
  expect(source.getByText("20/10/2026")).toBeTruthy();
  expect(source.queryByText("Khối lượng")).toBeNull();
  fireEvent.click(source.getByRole("button", { name: "Đóng nguồn" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("region", { name: "Sơ đồ làn nuôi" })).toBeTruthy();
});
it("ignores a late diagram response after the user changes the viewing date", async () => {
  const { record, service, getCondition } = setup();
  const pending: ((result: RaftConditionResult) => void)[] = [];
  getCondition.mockImplementation(
    () => new Promise((resolve) => pending.push(resolve)),
  );
  render(<RaftConditionPanel raft={record.profile} service={service} />);
  fireEvent.change(screen.getByLabelText("Ngày xem sơ đồ"), {
    target: { value: "02/10/2026" },
  });
  await waitFor(() => expect(pending).toHaveLength(2));
  await act(async () =>
    pending[1]({
      status: "loaded",
      condition: projectRaftCondition(record, {
        raftId: record.profile.id,
        date: "2026-10-02",
        cycleId: null,
      }),
    }),
  );
  expect(
    screen.getByRole("button", { name: "Làn 1, 0–24 m: Đang nuôi" }),
  ).toBeTruthy();
  await act(async () =>
    pending[0]({
      status: "loaded",
      condition: projectRaftCondition(record, {
        raftId: record.profile.id,
        date: "2026-10-28",
        cycleId: null,
      }),
    }),
  );
  expect(
    screen.queryByRole("button", { name: "Làn 1, 0–8 m: Đã thu hoạch" }),
  ).toBeNull();
});
it("keeps invalid Vietnamese dates visible without loading or showing an unrelated old map", async () => {
  const { record, service, getCondition } = setup();
  render(<RaftConditionPanel raft={record.profile} service={service} />);
  await screen.findByRole("region", { name: "Sơ đồ làn nuôi" });
  const input = screen.getByLabelText<HTMLInputElement>("Ngày xem sơ đồ");
  fireEvent.change(input, { target: { value: "31/02/2026" } });
  expect(input.value).toBe("31/02/2026");
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(screen.queryByRole("region", { name: "Sơ đồ làn nuôi" })).toBeNull();
  expect(getCondition).toHaveBeenCalledOnce();
});
it("retries a failed read and does not turn a permission denial into an empty layout", async () => {
  const { record, service, getCondition } = setup();
  getCondition
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ status: "forbidden" });
  render(<RaftConditionPanel raft={record.profile} service={service} />);
  fireEvent.click(await screen.findByRole("button", { name: "Tải lại sơ đồ" }));
  await screen.findByText("Bạn không có quyền xem sơ đồ này.");
  expect(screen.queryByRole("region", { name: "Sơ đồ làn nuôi" })).toBeNull();
  expect(getCondition).toHaveBeenCalledTimes(2);
});
it("opens a closed cycle at its closing date and returns to date mode when the date is edited", async () => {
  const { record, service, getCondition } = setup(1);
  render(<RaftConditionPanel raft={record.profile} service={service} />);
  fireEvent.change(screen.getByLabelText("Chu kỳ"), {
    target: { value: record.profile.cycles[0].id },
  });
  await waitFor(() =>
    expect(getCondition).toHaveBeenLastCalledWith({
      raftId: record.profile.id,
      date: "2026-10-10",
      cycleId: record.profile.cycles[0].id,
    }),
  );
  expect(screen.getByLabelText<HTMLInputElement>("Ngày xem sơ đồ").value).toBe(
    "10/10/2026",
  );
  fireEvent.change(screen.getByLabelText("Ngày xem sơ đồ"), {
    target: { value: "15/10/2026" },
  });
  await waitFor(() =>
    expect(getCondition).toHaveBeenLastCalledWith({
      raftId: record.profile.id,
      date: "2026-10-15",
      cycleId: null,
    }),
  );
});
it("drops a failed response after the panel unmounts", async () => {
  const { record, service, getCondition } = setup();
  let reject!: (error: Error) => void;
  getCondition.mockImplementation(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  const view = render(
    <RaftConditionPanel raft={record.profile} service={service} />,
  );
  view.unmount();
  await act(async () => reject(new Error("late network failure")));
  expect(screen.queryByRole("alert")).toBeNull();
});
