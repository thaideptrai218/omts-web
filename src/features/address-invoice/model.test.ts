import { describe, expect, it } from "vitest";
import { contactAddressOf, contactBody, emptyAddress, emptyInvoiceInfo, invoiceBody, invoiceInfoOf, invoiceInfoProblem, type AddressValue, type InvoiceInfoValue } from "./model";

const full: AddressValue = { provinceCode: 92, provinceName: "Thành phố Cần Thơ", wardCode: 920101, wardName: "Phường Ninh Kiều", street: "12 Trần Hưng Đạo" };
const organization = (patch: Partial<InvoiceInfoValue> = {}): InvoiceInfoValue => ({ ...emptyInvoiceInfo("Organization"), name: "Cty Ba", taxCode: "0312345678", email: "ba@cty.vn", ...patch });

describe("invoice info rules", () => {
  it("asks nothing of a consumer", () => {
    expect(invoiceInfoProblem(emptyInvoiceInfo("Consumer"), emptyAddress)).toBeUndefined();
  });
  it("requires name, tax code, address and email of an organisation, one at a time", () => {
    expect(invoiceInfoProblem(organization({ name: " " }), full)).toBe("Nhập tên đơn vị xuất hóa đơn.");
    expect(invoiceInfoProblem(organization({ taxCode: "" }), full)).toBe("Nhập mã số thuế của đơn vị.");
    expect(invoiceInfoProblem(organization({ taxCode: "12345" }), full)).toContain("10 chữ số");
    expect(invoiceInfoProblem(organization(), emptyAddress)).toContain("lấy theo địa chỉ liên hệ");
    expect(invoiceInfoProblem(organization({ sameAsContact: false }), full)).toBe("Nhập đủ địa chỉ xuất hóa đơn: tỉnh/thành, phường/xã và số nhà, đường.");
    expect(invoiceInfoProblem(organization({ email: "" }), full)).toBe("Nhập email nhận hóa đơn điện tử.");
    expect(invoiceInfoProblem(organization({ email: "không-phải-email" }), full)).toBe("Email nhận hóa đơn không hợp lệ.");
    expect(invoiceInfoProblem(organization({ taxCode: "0312345678-001" }), full)).toBeUndefined();
  });
  it("requires only name and address of an individual; the tax or identity number and the email are checked only when given", () => {
    const person = (patch: Partial<InvoiceInfoValue> = {}) => ({ ...emptyInvoiceInfo("Individual"), name: "Chú Ba", ...patch });
    expect(invoiceInfoProblem(person(), full)).toBeUndefined();
    expect(invoiceInfoProblem(person({ name: "" }), full)).toBe("Nhập họ tên người mua hóa đơn.");
    expect(invoiceInfoProblem(person(), { ...full, street: "" })).toContain("địa chỉ liên hệ");
    expect(invoiceInfoProblem(person({ personalTaxId: "12" }), full)).toContain("10 đến 12 chữ số");
    expect(invoiceInfoProblem(person({ personalTaxId: "012345678901", email: "a@b.vn" }), full)).toBeUndefined();
    expect(invoiceInfoProblem(person({ email: "a@" }), full)).toBe("Email nhận hóa đơn không hợp lệ.");
  });
  it("accepts an old address as complete while only its text is known, so that the record can still be saved", () => {
    expect(invoiceInfoProblem(organization(), { provinceCode: null, provinceName: "Can Tho", wardCode: null, wardName: "Ninh Kieu", street: "Số 5" })).toBeUndefined();
  });
});

describe("save bodies", () => {
  it("sends the new fields and keeps the old text fields as names and street", () => {
    expect(contactBody(full)).toEqual({ ...full, province: "Thành phố Cần Thơ", ward: "Phường Ninh Kiều", address: "12 Trần Hưng Đạo" });
    expect(contactBody(emptyAddress)).toEqual({ provinceCode: null, provinceName: null, wardCode: null, wardName: null, street: null, province: null, ward: null, address: null });
  });
  it("sends only what the buyer type uses and clears the rest", () => {
    expect(invoiceBody(organization({ personalTaxId: "123" }))).toEqual({
      invoiceBuyerType: "Organization", invoiceName: "Cty Ba", taxCode: "0312345678", personalTaxId: null, invoiceAddressSameAsContact: true,
      invoiceProvinceCode: null, invoiceProvinceName: null, invoiceWardCode: null, invoiceWardName: null, invoiceStreet: null, invoiceEmail: "ba@cty.vn",
    });
    expect(invoiceBody({ ...emptyInvoiceInfo("Individual"), name: "Chú Ba", taxCode: "0312345678", personalTaxId: "012345678901", sameAsContact: false, address: full })).toMatchObject({
      invoiceBuyerType: "Individual", taxCode: null, personalTaxId: "012345678901", invoiceAddressSameAsContact: false, invoiceProvinceCode: 92, invoiceWardCode: 920101, invoiceStreet: "12 Trần Hưng Đạo", invoiceEmail: null,
    });
    expect(invoiceBody({ ...emptyInvoiceInfo("Consumer"), name: "x", taxCode: "y", email: "z@z.vn" })).toEqual({
      invoiceBuyerType: "Consumer", invoiceName: null, taxCode: null, personalTaxId: null, invoiceAddressSameAsContact: false,
      invoiceProvinceCode: null, invoiceProvinceName: null, invoiceWardCode: null, invoiceWardName: null, invoiceStreet: null, invoiceEmail: null,
    });
  });
});

describe("reading a record", () => {
  it("falls back to the old text fields and to the company name when the new ones are absent", () => {
    expect(contactAddressOf({ province: "Cần Thơ", ward: "Ninh Kiều", address: "Số 1" })).toEqual({ provinceCode: null, provinceName: "Cần Thơ", wardCode: null, wardName: "Ninh Kiều", street: "Số 1" });
    expect(invoiceInfoOf({ companyName: "Cty Ba", taxCode: "0312345678" }, "Consumer")).toMatchObject({ buyerType: "Consumer", name: "Cty Ba", taxCode: "0312345678", sameAsContact: true });
  });
  it("reads the new fields first", () => {
    expect(invoiceInfoOf({ invoiceBuyerType: "Individual", invoiceName: "Chú Ba", personalTaxId: "012345678901", invoiceAddressSameAsContact: false, invoiceProvinceCode: 92, invoiceProvinceName: "Cần Thơ", invoiceWardCode: 920101, invoiceWardName: "Ninh Kiều", invoiceStreet: "Số 2", invoiceEmail: "a@b.vn" }, "Organization")).toEqual({
      buyerType: "Individual", name: "Chú Ba", taxCode: "", personalTaxId: "012345678901", email: "a@b.vn", sameAsContact: false, address: { provinceCode: 92, provinceName: "Cần Thơ", wardCode: 920101, wardName: "Ninh Kiều", street: "Số 2" },
    });
  });
});
