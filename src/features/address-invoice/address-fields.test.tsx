// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({ provinces: vi.fn(), wards: vi.fn() }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), addressRepository: repo }));
import { AddressFields } from "./address-fields";
import { emptyAddress, type AddressValue } from "./model";

const provinces = [{ code: 92, name: "Thành phố Cần Thơ" }, { code: 66, name: "Tỉnh Đắk Lắk" }];
const wardsOf: Record<number, { code: number; name: string; provinceCode: number }[]> = {
  92: [{ code: 920101, name: "Phường Ninh Kiều", provinceCode: 92 }, { code: 920102, name: "Phường Cái Khế", provinceCode: 92 }],
  66: [{ code: 660101, name: "Phường Buôn Ma Thuột", provinceCode: 66 }],
};
const ok = <T,>(data: T) => ({ status: "success" as const, data });
const failure = { status: "error" as const, httpStatus: 503, uncertain: false };

function Harness({ initial = emptyAddress, onValue }: { initial?: AddressValue; onValue?(value: AddressValue): void }) {
  const [value, setValue] = useState(initial);
  return <AddressFields required value={value} onChange={(next) => { setValue(next); onValue?.(next); }} />;
}
const province = () => screen.getByRole("combobox", { name: "Tỉnh/thành *" }) as HTMLSelectElement;
const ward = () => screen.getByRole("combobox", { name: "Phường/xã *" }) as HTMLSelectElement;
const user = () => userEvent.setup();
const optionTexts = (select: HTMLSelectElement) => [...select.options].map((option) => option.text);

beforeEach(() => {
  repo.provinces.mockResolvedValue(ok(provinces));
  repo.wards.mockImplementation(async (code: number) => ok(wardsOf[code] ?? []));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("keeps the ward box off until a province is picked, then lists only the wards of that province", async () => {
  const seen = vi.fn();
  render(<Harness onValue={seen} />);
  await waitFor(() => expect(optionTexts(province())).toContain("Thành phố Cần Thơ"));
  expect(ward().disabled).toBe(true);
  expect(optionTexts(ward())).toEqual(["Chọn tỉnh/thành trước"]);
  expect(repo.wards).not.toHaveBeenCalled();

  fireEvent.change(province(), { target: { value: "92" } });
  await waitFor(() => expect(optionTexts(ward())).toEqual(["Chọn phường/xã", "Phường Ninh Kiều", "Phường Cái Khế"]));
  expect(ward().disabled).toBe(false);
  expect(repo.wards).toHaveBeenCalledWith(92);

  fireEvent.change(ward(), { target: { value: "920102" } });
  await user().type(screen.getByLabelText("Số nhà, đường *"), "12 Trần Hưng Đạo");
  expect(seen).toHaveBeenLastCalledWith({ provinceCode: 92, provinceName: "Thành phố Cần Thơ", wardCode: 920102, wardName: "Phường Cái Khế", street: "12 Trần Hưng Đạo" });
});
it("clears the ward, and loads the new list, when another province is picked", async () => {
  const seen = vi.fn();
  render(<Harness initial={{ provinceCode: 92, provinceName: "Thành phố Cần Thơ", wardCode: 920101, wardName: "Phường Ninh Kiều", street: "Số 1" }} onValue={seen} />);
  await waitFor(() => expect(optionTexts(ward())).toContain("Phường Ninh Kiều"));
  fireEvent.change(province(), { target: { value: "66" } });
  expect(seen).toHaveBeenLastCalledWith({ provinceCode: 66, provinceName: "Tỉnh Đắk Lắk", wardCode: null, wardName: "", street: "Số 1" });
  await waitFor(() => expect(optionTexts(ward())).toEqual(["Chọn phường/xã", "Phường Buôn Ma Thuột"]));
  expect(ward().value).toBe("");
});

it("says it is loading while the wards come, and offers a retry when they fail", async () => {
  let release!: (value: unknown) => void;
  repo.wards.mockReturnValueOnce(new Promise((resolve) => { release = resolve; }));
  render(<Harness initial={{ ...emptyAddress, provinceCode: 92, provinceName: "Thành phố Cần Thơ" }} />);
  await waitFor(() => expect(optionTexts(ward())).toEqual(["Đang tải…"]));
  expect(ward().disabled).toBe(true);
  await act(async () => { release(failure); });
  expect((await screen.findByRole("alert")).textContent).toContain("Chưa tải được danh sách phường/xã.");
  expect(ward().disabled).toBe(true);

  await user().click(screen.getByRole("button", { name: "Thử lại" }));
  await waitFor(() => expect(optionTexts(ward())).toContain("Phường Ninh Kiều"));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(ward().disabled).toBe(false);
});

it("offers a retry when the provinces cannot be loaded and keeps both boxes off", async () => {
  repo.provinces.mockResolvedValueOnce(failure);
  render(<Harness />);
  expect((await screen.findByRole("alert")).textContent).toContain("Chưa tải được danh sách tỉnh/thành.");
  expect(province().disabled).toBe(true);
  await user().click(screen.getByRole("button", { name: "Thử lại" }));
  await waitFor(() => expect(province().disabled).toBe(false));
  expect(optionTexts(province())).toContain("Tỉnh Đắk Lắk");
});

it("asks for a new pick when only the old text of the address is known, and shows what is stored", async () => {
  render(<Harness initial={{ provinceCode: null, provinceName: "Can Tho", wardCode: null, wardName: "Ninh Kieu", street: "Số 5" }} />);
  expect(screen.getByText(/Địa chỉ cũ chưa khớp danh mục mới — chọn lại/)).toBeTruthy();
  expect(screen.getByText("Đang lưu: Số 5, Ninh Kieu, Can Tho")).toBeTruthy();
  await waitFor(() => expect(province().disabled).toBe(false));
  fireEvent.change(province(), { target: { value: "92" } });
  // The province is now picked from the list and the old ward text went with the old province: nothing is left to review.
  expect(screen.queryByText(/Địa chỉ cũ chưa khớp/)).toBeNull();
  await waitFor(() => expect(optionTexts(ward())).toContain("Phường Ninh Kiều"));
});
