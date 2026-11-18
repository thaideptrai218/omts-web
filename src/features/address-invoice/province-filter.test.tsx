// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({ provinces: vi.fn() }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), addressRepository: repo }));
import { ProvinceFilter } from "./province-filter";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("filters by the name of a province of the list, and keeps a name of the old free text that the list does not have", async () => {
  repo.provinces.mockResolvedValue({ status: "success", data: [{ code: 92, name: "Thành phố Cần Thơ" }, { code: 66, name: "Tỉnh Đắk Lắk" }] });
  const changed = vi.fn();
  const { rerender } = render(<ProvinceFilter className="x" value="" onChange={changed} />);
  const box = await screen.findByRole("combobox", { name: "Tỉnh/thành" }) as HTMLSelectElement;
  expect([...box.options].map((option) => option.text)).toEqual(["Tất cả", "Thành phố Cần Thơ", "Tỉnh Đắk Lắk"]);
  fireEvent.change(box, { target: { value: "Tỉnh Đắk Lắk" } });
  expect(changed).toHaveBeenCalledWith("Tỉnh Đắk Lắk");
  rerender(<ProvinceFilter className="x" value="Can Tho" onChange={changed} />);
  expect([...(screen.getByRole("combobox", { name: "Tỉnh/thành" }) as HTMLSelectElement).options].map((option) => option.text)).toContain("Can Tho");
});

it("stays a text box when the list cannot be loaded, so that filtering keeps working", async () => {
  repo.provinces.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false });
  const changed = vi.fn();
  render(<ProvinceFilter className="x" value="" onChange={changed} />);
  const input = await screen.findByPlaceholderText("Nhập tỉnh/thành");
  fireEvent.change(input, { target: { value: "Cần" } });
  expect(changed).toHaveBeenCalledWith("Cần");
  await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());
});
