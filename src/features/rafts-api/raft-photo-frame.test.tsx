// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const repo = vi.hoisted(() => ({ read: vi.fn(), upload: vi.fn(), post: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repo }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: import("react").ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { RaftPhotoFrame } from "./raft-photo-frame";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const raftId = "00000000-0000-4000-8000-0000000000a1", photoId = "00000000-0000-4000-8000-0000000000b1", otherPhoto = "00000000-0000-4000-8000-0000000000b2";
const raft = (photos: { id: string; sortOrder: number }[]) => ({ id: raftId, zone: { id: raftId, code: "KV01", name: "Vùng" }, code: "B1-01", latitude: null, longitude: null, location: null, size: null, conditionNotes: null,
  photos: photos.map(photo => ({ ...photo, url: `/api/operations/raft-details?action=photo&id=${raftId}&photoId=${photo.id}` })), statusId: 101, status: "In Use", laneCount: 0, lanes: [], materialCost: null, rowVersion: "AAAA" });
const show = (canEdit: boolean) => render(<ToastProvider><RaftPhotoFrame raftId={raftId} raftCode="B1-01" canEdit={canEdit} /></ToastProvider>);

describe("raft photo frame", () => {
  it("shows the main photo with thumbnails under it and switches between them", async () => {
    repo.read.mockResolvedValue({ status: "success", data: raft([{ id: photoId, sortOrder: 1 }, { id: otherPhoto, sortOrder: 2 }]) });
    show(false);
    expect((await screen.findByAltText("Ảnh 1 của bè B1-01")).getAttribute("src")).toContain(photoId);
    fireEvent.click(screen.getByRole("button", { name: "Xem ảnh 2" }));
    expect(screen.getByAltText("Ảnh 2 của bè B1-01").getAttribute("src")).toContain(otherPhoto);
    expect(screen.queryByRole("button", { name: "Thêm ảnh" })).toBeNull(); expect(screen.queryByRole("button", { name: "Xóa ảnh" })).toBeNull();
  });
  it("says when the raft has no photo", async () => {
    repo.read.mockResolvedValue({ status: "success", data: raft([]) });
    show(true);
    expect(await screen.findByText("Chưa có ảnh bè")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Xóa ảnh" })).toBeNull();
  });
  it("adds a photo for an editor and shows the raft the backend returns", async () => {
    repo.read.mockResolvedValue({ status: "success", data: raft([]) });
    repo.upload.mockResolvedValue({ status: "success", data: raft([{ id: photoId, sortOrder: 1 }]) });
    show(true);
    await screen.findByText("Chưa có ảnh bè");
    fireEvent.change(screen.getByLabelText("Chọn ảnh bè"), { target: { files: [new File(["x"], "a.png", { type: "image/png" })] } });
    expect(await screen.findByAltText("Ảnh 1 của bè B1-01")).toBeTruthy();
    expect(repo.upload.mock.calls[0][0]).toBe("upload-photo"); expect(repo.upload.mock.calls[0][4]).toBe(raftId);
    expect(await screen.findByText("Đã thêm ảnh bè B1-01.")).toBeTruthy();
  });
  it("refuses a file that is not JPEG or PNG without calling the backend", async () => {
    repo.read.mockResolvedValue({ status: "success", data: raft([]) });
    show(true);
    await screen.findByText("Chưa có ảnh bè");
    fireEvent.change(screen.getByLabelText("Chọn ảnh bè"), { target: { files: [new File(["x"], "a.gif", { type: "image/gif" })] } });
    expect((await screen.findByRole("alert")).textContent).toContain("JPEG hoặc PNG");
    expect(repo.upload).not.toHaveBeenCalled();
  });
  it("asks first, then deletes the shown photo by its id", async () => {
    repo.read.mockResolvedValue({ status: "success", data: raft([{ id: photoId, sortOrder: 1 }, { id: otherPhoto, sortOrder: 2 }]) });
    repo.post.mockResolvedValue({ status: "success", data: raft([{ id: otherPhoto, sortOrder: 2 }]) });
    show(true);
    fireEvent.click(await screen.findByRole("button", { name: "Xóa ảnh" }));
    expect(repo.post).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(repo.post).toHaveBeenCalled());
    expect(repo.post.mock.calls[0].slice(0, 2)).toEqual(["delete-photo", { id: raftId, photoId }]);
    expect(await screen.findByText("Đã xóa ảnh bè B1-01.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Xem ảnh 2" })).toBeNull());
  });
  it("does not delete when the confirmation is declined, and offers no add at three photos", async () => {
    repo.read.mockResolvedValue({ status: "success", data: raft([{ id: photoId, sortOrder: 1 }, { id: otherPhoto, sortOrder: 2 }, { id: "00000000-0000-4000-8000-0000000000b3", sortOrder: 3 }]) });
    show(true);
    fireEvent.click(await screen.findByRole("button", { name: "Xóa ảnh" }));
    fireEvent.click(await screen.findByRole("button", { name: "Quay lại" }));
    expect(repo.post).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Thêm ảnh" })).toBeNull();
    expect(screen.getByText(/đủ 3 ảnh/)).toBeTruthy();
  });
  it("shows a delete failure inline", async () => {
    repo.read.mockResolvedValue({ status: "success", data: raft([{ id: photoId, sortOrder: 1 }]) });
    repo.post.mockResolvedValue({ status: "error", httpStatus: 403, uncertain: false });
    show(true);
    fireEvent.click(await screen.findByRole("button", { name: "Xóa ảnh" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    expect((await screen.findByRole("alert")).textContent).toContain("không có quyền");
  });
});
