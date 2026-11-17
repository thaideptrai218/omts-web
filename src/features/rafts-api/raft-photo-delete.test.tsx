// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const repo = vi.hoisted(() => ({ read: vi.fn(), upload: vi.fn(), post: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repo }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: import("react").ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { RaftPhotoTab } from "./raft-photo-tab";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const raftId = "00000000-0000-4000-8000-0000000000a1", photoId = "00000000-0000-4000-8000-0000000000b1", otherPhoto = "00000000-0000-4000-8000-0000000000b2";
const raft = (photos: { id: string; sortOrder: number }[]) => ({ id: raftId, zone: { id: raftId, code: "KV01", name: "Vùng" }, code: "B1-01", latitude: null, longitude: null, location: null, size: null, conditionNotes: null,
  photos: photos.map(photo => ({ ...photo, url: `/api/operations/raft-details?action=photo&id=${raftId}&photoId=${photo.id}` })), statusId: 101, status: "In Use", laneCount: 0, lanes: [], materialCost: null, rowVersion: "AAAA" });

describe("raft photo delete", () => {
  it("asks first, deletes the chosen photo by its id and shows the raft the backend returns", async () => {
    repo.read.mockResolvedValue({ status: "success", data: raft([{ id: photoId, sortOrder: 1 }, { id: otherPhoto, sortOrder: 2 }]) });
    repo.post.mockResolvedValue({ status: "success", data: raft([{ id: otherPhoto, sortOrder: 2 }]) });
    render(<ToastProvider><RaftPhotoTab raftId={raftId} canEdit /></ToastProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Xóa ảnh 1" }));
    expect(repo.post).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(repo.post).toHaveBeenCalled());
    expect(repo.post.mock.calls[0].slice(0, 2)).toEqual(["delete-photo", { id: raftId, photoId }]);
    expect(await screen.findByText("Đã xóa ảnh bè B1-01.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Xóa ảnh 1" })).toBeNull());
    expect(screen.getByRole("button", { name: "Xóa ảnh 2" })).toBeTruthy();
  });
  it("does not delete when the confirmation is declined", async () => {
    repo.read.mockResolvedValue({ status: "success", data: raft([{ id: photoId, sortOrder: 1 }]) });
    render(<ToastProvider><RaftPhotoTab raftId={raftId} canEdit /></ToastProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Xóa ảnh 1" }));
    fireEvent.click(await screen.findByRole("button", { name: "Quay lại" }));
    expect(repo.post).not.toHaveBeenCalled();
  });
  it("has no delete button without edit permission and shows a failure inline", async () => {
    repo.read.mockResolvedValue({ status: "success", data: raft([{ id: photoId, sortOrder: 1 }]) });
    const view = render(<ToastProvider><RaftPhotoTab raftId={raftId} canEdit={false} /></ToastProvider>);
    await screen.findByRole("list", { name: "Ảnh bè" });
    expect(screen.queryByRole("button", { name: "Xóa ảnh 1" })).toBeNull();
    view.unmount();
    repo.post.mockResolvedValue({ status: "error", httpStatus: 403, uncertain: false });
    render(<ToastProvider><RaftPhotoTab raftId={raftId} canEdit /></ToastProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Xóa ảnh 1" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    expect((await screen.findByRole("alert")).textContent).toContain("không có quyền");
  });
});
