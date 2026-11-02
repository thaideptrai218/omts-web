// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("@/features/auth/state/auth-provider", () => ({ useAuth: () => ({ state: { status: "authenticated", account: { accountId: "account-owner-demo" } } }) }));
import { DemoWorkforceScreen } from "./screen";
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
it("runs local assignment and attendance without sending requests to a backend", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  render(<DemoWorkforceScreen />);
  await screen.findByText("Không có dữ liệu phù hợp.");
  fireEvent.click(screen.getByRole("button", { name: "Phân công công việc" }));
  fireEvent.change(screen.getByLabelText("Vùng phân công *"), { target: { value: "zone-east" } });
  const raftSelect = screen.getByLabelText("Bè phân công *") as HTMLSelectElement;
  fireEvent.change(raftSelect, { target: { value: raftSelect.options[1].value } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Nguyễn Văn An" }));
  fireEvent.click(screen.getByRole("button", { name: "Lưu phân công" }));
  expect(screen.queryByText("Đã lưu phân công vào dữ liệu thử local.")).toBeNull();
  fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
  fireEvent.click(await screen.findByRole("button", { name: "Vào làm" }));
  fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Vào làm" })).toBeNull());
  fireEvent.click(await screen.findByRole("button", { name: "Ra về" }));
  fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(screen.queryByText("Chưa ghi nhận")).toBeNull());
  expect(screen.queryByRole("button", { name: "Gỡ phân công" })).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});
