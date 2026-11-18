// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  expect(screen.getByText("Không có kết quả phù hợp.")).toBeTruthy();
});
