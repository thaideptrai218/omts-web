// @vitest-environment jsdom
import { cleanup, render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
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
