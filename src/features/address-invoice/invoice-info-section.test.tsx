// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({ provinces: vi.fn(), wards: vi.fn(), lookupTaxCode: vi.fn() }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), addressRepository: repo }));
import { InvoiceInfoSection } from "./invoice-info-section";
import { emptyInvoiceInfo, type BuyerType, type InvoiceInfoValue } from "./model";

const ok = <T,>(data: T) => ({ status: "success" as const, data });
const company = { taxCode: "0312345678", name: "CÔNG TY TNHH THỦY SẢN BA", shortName: "BA", address: "12 Trần Hưng Đạo, Phường Ninh Kiều, Thành phố Cần Thơ", status: "NNT đang hoạt động",
  province: { code: 92, name: "Thành phố Cần Thơ" }, ward: { code: 920101, name: "Phường Ninh Kiều" }, street: "12 Trần Hưng Đạo" };

function Harness({ type = "Organization", allowConsumer = true, contactName, onValue }: { type?: BuyerType; allowConsumer?: boolean; contactName?: string; onValue?(value: InvoiceInfoValue): void }) {
  const [value, setValue] = useState(emptyInvoiceInfo(type));
  return <InvoiceInfoSection allowConsumer={allowConsumer} contactName={contactName} value={value} onChange={(next) => { setValue(next); onValue?.(next); }} />;
}

beforeEach(() => {
  repo.provinces.mockResolvedValue(ok([{ code: 92, name: "Thành phố Cần Thơ" }]));
  repo.wards.mockResolvedValue(ok([{ code: 920101, name: "Phường Ninh Kiều", provinceCode: 92 }]));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("shows the fields of an organisation, with the e-invoice email required, and no identity-number field", () => {
  render(<Harness />);
  expect(screen.getByLabelText("Mã số thuế *")).toBeTruthy();
  expect(screen.getByLabelText("Tên đơn vị *")).toBeTruthy();
  expect(screen.getByLabelText("Email nhận hóa đơn điện tử *")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Lấy thông tin" })).toBeTruthy();
  expect(screen.getByRole("checkbox", { name: "Giống địa chỉ liên hệ" })).toBeTruthy();
  expect(screen.queryByText(/CCCD/)).toBeNull();
  expect(screen.queryByLabelText(/MST \/ Số định danh/)).toBeNull();
});

it("shows the fields of an individual, where the tax or identity number and the email are optional", () => {
  render(<Harness type="Individual" />);
  expect(screen.getByLabelText("Họ tên *")).toBeTruthy();
  expect(screen.getByLabelText("MST / Số định danh cá nhân (nếu có)")).toBeTruthy();
  expect(screen.getByLabelText("Email (nếu có)")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Lấy thông tin" })).toBeNull();
  expect(screen.queryByLabelText("Mã số thuế *")).toBeNull();
});

it("asks for nothing from a consumer and says what the invoice will read", () => {
  render(<Harness type="Consumer" />);
  expect(screen.getByText("Hóa đơn ghi: Người mua không cung cấp thông tin")).toBeTruthy();
  expect(screen.queryAllByRole("textbox")).toHaveLength(0);
});

it("leaves the consumer pill out for a supplier", () => {
  render(<Harness allowConsumer={false} type="Individual" />);
  expect(screen.getAllByRole("radio").map((radio) => (radio.closest("label") as HTMLElement).textContent)).toEqual(["Doanh nghiệp / Tổ chức", "Cá nhân"]);
});

it("switches the fields with the pill and offers the contact name to an individual with none", async () => {
  render(<Harness contactName="Chú Ba" />);
  await userEvent.setup().click(screen.getByRole("radio", { name: "Cá nhân" }));
  expect((screen.getByLabelText("Họ tên *") as HTMLInputElement).value).toBe("Chú Ba");
  await userEvent.setup().click(screen.getByRole("radio", { name: "Người tiêu dùng" }));
  expect(screen.queryByLabelText("Họ tên *")).toBeNull();
});

it("takes the address of the contact until the box is cleared, then asks for a province, ward and street", async () => {
  render(<Harness />);
  expect(screen.queryByRole("combobox", { name: /Tỉnh\/thành/ })).toBeNull();
  await userEvent.setup().click(screen.getByRole("checkbox", { name: "Giống địa chỉ liên hệ" }));
  expect(screen.getByRole("combobox", { name: "Tỉnh/thành *" })).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "Phường/xã *" })).toBeTruthy();
  expect(screen.getByLabelText("Số nhà, đường *")).toBeTruthy();
});

it("fills the name and the address, with the province and ward codes, from the tax code, and shows the company status", async () => {
  repo.lookupTaxCode.mockResolvedValue(ok(company));
  const seen = vi.fn(), user = userEvent.setup();
  render(<Harness onValue={seen} />);
  await user.type(screen.getByLabelText("Mã số thuế *"), "0312345678");
  await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
  expect(await screen.findByText("Tình trạng: NNT đang hoạt động")).toBeTruthy();
  expect(repo.lookupTaxCode).toHaveBeenCalledWith("0312345678");
  expect((screen.getByLabelText("Tên đơn vị *") as HTMLInputElement).value).toBe("CÔNG TY TNHH THỦY SẢN BA");
  expect(seen).toHaveBeenLastCalledWith(expect.objectContaining({
    taxCode: "0312345678", name: "CÔNG TY TNHH THỦY SẢN BA", sameAsContact: false,
    address: { provinceCode: 92, provinceName: "Thành phố Cần Thơ", wardCode: 920101, wardName: "Phường Ninh Kiều", street: "12 Trần Hưng Đạo" },
  }));
  expect((screen.getByLabelText("Số nhà, đường *") as HTMLInputElement).value).toBe("12 Trần Hưng Đạo");
  await waitFor(() => expect((screen.getByRole("combobox", { name: "Phường/xã *" }) as HTMLSelectElement).value).toBe("920101"));
});

it("puts the whole address in the street when the backend could not split it, and says to pick again", async () => {
  repo.lookupTaxCode.mockResolvedValue(ok({ ...company, province: null, ward: null, street: null }));
  const user = userEvent.setup();
  render(<Harness />);
  await user.type(screen.getByLabelText("Mã số thuế *"), "0312345678");
  await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
  expect(await screen.findByText(/Chưa tách được tỉnh\/thành/)).toBeTruthy();
  expect((screen.getByLabelText("Số nhà, đường *") as HTMLInputElement).value).toBe(company.address);
});

it("tells when the tax code is not found and leaves the fields open for typing by hand", async () => {
  repo.lookupTaxCode.mockResolvedValue({ status: "error", httpStatus: 404, uncertain: false });
  const user = userEvent.setup();
  render(<Harness />);
  await user.type(screen.getByLabelText("Mã số thuế *"), "0312345678");
  await user.type(screen.getByLabelText("Tên đơn vị *"), "Cty tự nhập");
  await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Không tìm thấy doanh nghiệp có mã số thuế này");
  expect((screen.getByLabelText("Tên đơn vị *") as HTMLInputElement).value).toBe("Cty tự nhập");
  expect((screen.getByLabelText("Mã số thuế *") as HTMLInputElement).value).toBe("0312345678");
});

it("refuses a malformed tax code before calling the backend", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.type(screen.getByLabelText("Mã số thuế *"), "12345");
  await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
  expect((await screen.findByRole("alert")).textContent).toContain("10 chữ số");
  expect(repo.lookupTaxCode).not.toHaveBeenCalled();
});

it("tells when the lookup service is down", async () => {
  repo.lookupTaxCode.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false });
  const user = userEvent.setup();
  render(<Harness />);
  fireEvent.change(screen.getByLabelText("Mã số thuế *"), { target: { value: "0312345678-001" } });
  await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Chưa tra cứu được mã số thuế lúc này");
});
