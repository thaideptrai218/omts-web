// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { LocationPicker } from "./location-picker";

vi.mock("./use-location-default", () => ({ useLocationDefault: () => ({ loading: false, center: { latitude: 21, longitude: 107 } }) }));
vi.mock("next/dynamic", () => ({ default: () => () => <div>Bản đồ</div> }));
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function Editor({ empty = false, disabled = false }: { empty?: boolean; disabled?: boolean }) {
  const [point, setPoint] = useState(empty ? { latitude: "", longitude: "" } : { latitude: "21.0712", longitude: "107.4321" });
  return <form onSubmit={event => { event.preventDefault(); throw Error("Picker must not submit"); }}><fieldset disabled={disabled}>
    <LocationPicker id="test-location" {...point} onChange={setPoint} />
  </fieldset></form>;
}
it("shows read-only coordinates, nudges and confirms without submitting", () => {
  render(<Editor />);
  expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
  const map = screen.getByRole("group", { name: "Điểm chọn trên bản đồ" });
  fireEvent.keyDown(map, { key: "ArrowUp" });
  expect(screen.getAllByText("Vĩ độ 21.0713 · Kinh độ 107.4321").length).toBeGreaterThan(0);
  fireEvent.keyDown(map, { key: "Enter" });
  expect(screen.getByText(/Đã chọn vị trí/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Xóa vị trí" }));
  expect(screen.getByText("Chưa chọn vị trí")).toBeTruthy();
});
it("can place the first marker entirely by keyboard from the cooperative viewport", () => {
  render(<Editor empty />);
  fireEvent.keyDown(screen.getByRole("group", { name: "Điểm chọn trên bản đồ" }), { key: "ArrowRight" });
  expect(screen.getAllByText("Vĩ độ 21 · Kinh độ 107.0001").length).toBeGreaterThan(0);
});
it("opens a native top-layer overlay and returns focus when collapsed", () => {
  const { container } = render(<Editor />);
  fireEvent.click(screen.getByRole("button", { name: "Toàn cảnh" }));
  const dialog = screen.getByRole("dialog", { name: "Chọn vị trí toàn cảnh" });
  expect(container.contains(dialog)).toBe(false);
  expect((dialog as HTMLDialogElement).open).toBe(true);
  fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Toàn cảnh" }));
});
it("announces permission denial and allows retrying current location", () => {
  const getCurrentPosition = vi.fn();
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
  render(<Editor empty />);
  fireEvent.click(screen.getByRole("button", { name: "Dùng vị trí hiện tại của tôi" }));
  act(() => getCurrentPosition.mock.calls[0][1]({ code: 1 }));
  expect(screen.getByText(/Bạn chưa cho phép truy cập vị trí/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Dùng vị trí hiện tại của tôi" }));
  act(() => getCurrentPosition.mock.calls[1][0]({ coords: { latitude: 20, longitude: 106 } }));
  expect(screen.getAllByText("Vĩ độ 20 · Kinh độ 106").length).toBeGreaterThan(0);
});
it("ignores an old geolocation response after the user clears the marker", () => {
  const getCurrentPosition = vi.fn();
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
  render(<Editor />);
  fireEvent.click(screen.getByRole("button", { name: "Dùng vị trí hiện tại của tôi" }));
  fireEvent.click(screen.getByRole("button", { name: "Xóa vị trí" }));
  getCurrentPosition.mock.calls[0][0]({ coords: { latitude: 20, longitude: 106 } });
  expect(screen.getByText("Chưa chọn vị trí")).toBeTruthy();
});
it("keeps marker keyboard changes disabled while the parent fieldset is disabled", () => {
  render(<Editor disabled />);
  fireEvent.keyDown(screen.getByRole("group", { name: "Điểm chọn trên bản đồ" }), { key: "ArrowUp" });
  expect(screen.queryByText("Vĩ độ 21.0713 · Kinh độ 107.4321")).toBeNull();
});
