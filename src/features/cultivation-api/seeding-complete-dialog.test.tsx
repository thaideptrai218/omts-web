// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const { read, write } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("./records-shared", async (importOriginal) => {
  const original = await importOriginal<typeof import("./records-shared")>();
  return { ...original, seedRepo: { read, write } };
});
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: import("react").ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { CompleteSeeding } from "./records-complete-seeding-dialog";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const id = "00000000-0000-4000-8000-000000000022";

describe("marking seeding complete", () => {
  it("asks once, in a single dialog, and completes on the first confirmation", async () => {
    read.mockResolvedValue({ status: "success", data: { cycleId: id, laneCount: 12, seededCount: 5, notSeededLanes: [6, 7], cycleRowVersion: "v" } });
    write.mockResolvedValue({ status: "success", data: { cycle: { id } } });
    const onSaved = vi.fn();
    render(<ToastProvider><CompleteSeeding cycleId={id} zoneId="z" hasRecords onClose={vi.fn()} onSaved={onSaved} /></ToastProvider>);

    expect(await screen.findByText("Đánh dấu hoàn tất thả giống và thông báo cho chủ hợp tác xã?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận hoàn tất" }));

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(write).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByRole("dialog")).toHaveLength(1);
  });

  it("does not allow completing before any seeding is recorded", async () => {
    read.mockResolvedValue({ status: "success", data: { cycleId: id, laneCount: 12, seededCount: 0, notSeededLanes: [], cycleRowVersion: "v" } });
    render(<ToastProvider><CompleteSeeding cycleId={id} zoneId="z" hasRecords={false} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);

    const confirm = await screen.findByRole("button", { name: "Xác nhận hoàn tất" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });
});
