// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { SelectBox } from "./select-box";

afterEach(cleanup);
const box = <SelectBox aria-label="Nhóm hàng" value="" onChange={() => undefined}><option value="">Chọn nhóm</option><option value="a">Nhóm A</option></SelectBox>;

it("opens its list inside the modal dialog the box sits in, where the top layer would hide anything left on the body", async () => {
  const { container } = render(<dialog open>{box}</dialog>);
  await userEvent.setup().click(container.querySelector<HTMLElement>(".omts-select-trigger")!);
  const menu = document.querySelector<HTMLElement>(".omts-select-menu");
  expect(menu?.closest("dialog")).toBe(container.querySelector("dialog"));
  expect(within(menu!).getByText("Nhóm A")).toBeTruthy();
});

it("opens its list on the body when the box is not in a dialog", async () => {
  const { container } = render(box);
  await userEvent.setup().click(container.querySelector<HTMLElement>(".omts-select-trigger")!);
  const menu = document.querySelector<HTMLElement>(".omts-select-menu");
  expect(menu?.parentElement).toBe(document.body);
});

it("filters a searchable list by text without caring for case or diacritics, and picks the first match on Enter", async () => {
  const picked = vi.fn();
  const { container } = render(<SelectBox aria-label="Tỉnh" searchable value="" onChange={(event) => picked(event.target.value)}>
    <option value="">Chọn</option><option value="92">Thành phố Cần Thơ</option><option value="66">Tỉnh Đắk Lắk</option></SelectBox>);
  const user = userEvent.setup();
  await user.click(container.querySelector<HTMLElement>(".omts-select-trigger")!);
  const menu = document.querySelector<HTMLElement>(".omts-select-menu")!;
  await user.type(within(menu).getByRole("searchbox", { hidden: true }), "dak lak");
  expect(within(menu).queryByText("Thành phố Cần Thơ")).toBeNull();
  expect(within(menu).getByText("Tỉnh Đắk Lắk")).toBeTruthy();
  await user.keyboard("{Enter}");
  expect(picked).toHaveBeenCalledWith("66");
});

it("says so when the search finds nothing", async () => {
  const { container } = render(<SelectBox aria-label="Tỉnh" searchable value="" onChange={() => undefined}><option value="">Chọn</option><option value="1">Hà Nội</option></SelectBox>);
  const user = userEvent.setup();
  await user.click(container.querySelector<HTMLElement>(".omts-select-trigger")!);
  await user.type(within(document.querySelector<HTMLElement>(".omts-select-menu")!).getByRole("searchbox", { hidden: true }), "zzz");
  expect(screen.getByText("Không tìm thấy “zzz”.")).toBeTruthy();
});

it("shows the missing-choice message under the box instead of a browser bubble, and drops it once a value is chosen", () => {
  function Form() {
    const [value, setValue] = useState("");
    return <form><SelectBox aria-label="Loại xuất" required value={value} onChange={(event) => setValue(event.target.value)}><option value="">Chọn loại</option><option value="a">A</option></SelectBox></form>;
  }
  const { container } = render(<Form />);
  const select = container.querySelector("select")!;
  let notCancelled = true;
  act(() => { notCancelled = select.dispatchEvent(new Event("invalid", { cancelable: true })); });
  expect(notCancelled).toBe(false);
  expect(screen.getByRole("alert").textContent).toBe("Vui lòng chọn loại xuất.");
  expect(select.getAttribute("aria-invalid")).toBe("true");
  fireEvent.change(select, { target: { value: "a" } });
  expect(screen.queryByRole("alert")).toBeNull();
});

const many = (count: number, required = false) => <SelectBox aria-label="Vùng" required={required} value="" onChange={() => undefined}>
  <option value="">Tất cả vùng</option>{Array.from({ length: count }, (_, index) => <option key={index} value={String(index)}>{index === 1 ? "Vùng Đầm Môn" : `Vùng ${index}`}</option>)}</SelectBox>;

it("gives a list of more than 5 choices a search box on its own, and keeps the empty choice while nothing is typed", async () => {
  const { container } = render(many(6));
  await userEvent.setup().click(container.querySelector<HTMLElement>(".omts-select-trigger")!);
  const menu = document.querySelector<HTMLElement>(".omts-select-menu")!;
  expect(within(menu).getByRole("searchbox", { hidden: true })).toBeTruthy();
  expect(within(menu).getByText("Tất cả vùng")).toBeTruthy();
});

it("leaves a short list without a search box", async () => {
  const { container } = render(many(5));
  await userEvent.setup().click(container.querySelector<HTMLElement>(".omts-select-trigger")!);
  expect(document.querySelector(".omts-select-menu input")).toBeNull();
});

it("moves through the matches with the arrow keys and picks the highlighted one with Enter", async () => {
  const picked = vi.fn();
  const { container } = render(<SelectBox aria-label="Vùng" value="" onChange={(event) => picked(event.target.value)}>
    {Array.from({ length: 7 }, (_, index) => <option key={index} value={String(index + 1)}>{`Vùng ${index + 1}`}</option>)}</SelectBox>);
  const user = userEvent.setup();
  await user.click(container.querySelector<HTMLElement>(".omts-select-trigger")!);
  await user.type(within(document.querySelector<HTMLElement>(".omts-select-menu")!).getByRole("searchbox", { hidden: true }), "vung");
  await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
  expect(picked).toHaveBeenCalledWith("3");
});
