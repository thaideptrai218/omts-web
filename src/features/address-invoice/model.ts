import { taxCodePattern } from "./contracts";

/** Who the e-invoice is addressed to. Suppliers have no consumer: the cooperative always buys from a named party. */
export type BuyerType = "Organization" | "Individual" | "Consumer";
export const buyerTypes: readonly (readonly [BuyerType, string])[] = [["Organization", "Doanh nghiệp / Tổ chức"], ["Individual", "Cá nhân"], ["Consumer", "Người tiêu dùng"]];
export const buyerTypeLabel = (value: string | null | undefined) => buyerTypes.find(([key]) => key === value)?.[1] ?? "";
export const consumerInvoiceText = "Người mua không cung cấp thông tin";
export const consumerNote = `Hóa đơn ghi: ${consumerInvoiceText}`;
export const addressReviewHint = "Địa chỉ cũ chưa khớp danh mục mới — chọn lại";

/** The picked province and ward as the backend stores them, plus the street typed by hand. A code is null while only the old free text is known. */
export type AddressValue = { provinceCode: number | null; provinceName: string; wardCode: number | null; wardName: string; street: string };
export const emptyAddress: AddressValue = { provinceCode: null, provinceName: "", wardCode: null, wardName: "", street: "" };

export type InvoiceInfoValue = {
  buyerType: BuyerType; name: string; taxCode: string; personalTaxId: string; email: string; sameAsContact: boolean; address: AddressValue;
};
export const emptyInvoiceInfo = (buyerType: BuyerType): InvoiceInfoValue => ({ buyerType, name: "", taxCode: "", personalTaxId: "", email: "", sameAsContact: true, address: emptyAddress });

type Text = string | null | undefined;
/** What a customer or supplier record carries of the contact address and the invoice info (the old text fields stay as names and street). */
export type AddressRecord = {
  provinceCode?: number | null; provinceName?: Text; province?: Text; wardCode?: number | null; wardName?: Text; ward?: Text; street?: Text; address?: Text;
  invoiceBuyerType?: Text; invoiceName?: Text; companyName?: Text; taxCode?: Text; personalTaxId?: Text; invoiceAddressSameAsContact?: boolean | null;
  invoiceProvinceCode?: number | null; invoiceProvinceName?: Text; invoiceWardCode?: number | null; invoiceWardName?: Text; invoiceStreet?: Text; invoiceEmail?: Text;
  addressNeedsReview?: boolean | null;
};

export const contactAddressOf = (record: AddressRecord | null): AddressValue => ({
  provinceCode: record?.provinceCode ?? null, provinceName: record?.provinceName ?? record?.province ?? "",
  wardCode: record?.wardCode ?? null, wardName: record?.wardName ?? record?.ward ?? "", street: record?.street ?? record?.address ?? "",
});
const asBuyerType = (value: Text): BuyerType | undefined => buyerTypes.find(([key]) => key === value)?.[0];
export function invoiceInfoOf(record: AddressRecord | null, fallback: BuyerType): InvoiceInfoValue {
  if (!record) return emptyInvoiceInfo(fallback);
  return {
    buyerType: asBuyerType(record.invoiceBuyerType) ?? fallback, name: record.invoiceName ?? record.companyName ?? "", taxCode: record.taxCode ?? "", personalTaxId: record.personalTaxId ?? "",
    email: record.invoiceEmail ?? "", sameAsContact: record.invoiceAddressSameAsContact ?? true,
    address: { provinceCode: record.invoiceProvinceCode ?? null, provinceName: record.invoiceProvinceName ?? "", wardCode: record.invoiceWardCode ?? null, wardName: record.invoiceWardName ?? "", street: record.invoiceStreet ?? "" },
  };
}

/** True when an address has text for a unit that no code of the current list stands behind: it has to be picked again. */
export const addressNeedsReview = (value: AddressValue) => !value.provinceCode && !!value.provinceName.trim() || !value.wardCode && !!value.wardName.trim();
/** A full address: province, ward and street. A legacy name without its code counts, so that an old record can be saved before it is re-picked. */
export const addressComplete = (value: AddressValue) => !!value.provinceName.trim() && !!value.wardName.trim() && !!value.street.trim();
export const sameAddress = (a: AddressValue, b: AddressValue) => a.provinceCode === b.provinceCode && a.provinceName === b.provinceName && a.wardCode === b.wardCode && a.wardName === b.wardName && a.street === b.street;

const blank = (value: string) => value.trim() || null;
/** The contact address as the save bodies take it: the new fields, and the old text fields kept as names and street. */
export function contactBody(value: AddressValue) {
  return {
    provinceCode: value.provinceCode, provinceName: blank(value.provinceName), wardCode: value.wardCode, wardName: blank(value.wardName), street: blank(value.street),
    province: blank(value.provinceName), ward: blank(value.wardName), address: blank(value.street),
  };
}
/** The invoice info as the save bodies take it. Only what the buyer type uses is sent; the rest is cleared, since the save replaces every field. */
export function invoiceBody(info: InvoiceInfoValue) {
  const consumer = info.buyerType === "Consumer", own = !consumer && !info.sameAsContact ? info.address : undefined;
  return {
    invoiceBuyerType: info.buyerType,
    invoiceName: consumer ? null : blank(info.name),
    taxCode: info.buyerType === "Organization" ? blank(info.taxCode) : null,
    personalTaxId: info.buyerType === "Individual" ? blank(info.personalTaxId) : null,
    invoiceAddressSameAsContact: consumer ? false : info.sameAsContact,
    invoiceProvinceCode: own?.provinceCode ?? null, invoiceProvinceName: own ? blank(own.provinceName) : null,
    invoiceWardCode: own?.wardCode ?? null, invoiceWardName: own ? blank(own.wardName) : null, invoiceStreet: own ? blank(own.street) : null,
    invoiceEmail: consumer ? null : blank(info.email),
  };
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const personalTaxIdPattern = /^\d{10,12}(-\d{3})?$/;
/**
 * The first rule of the e-invoice info the form breaks, as the sentence that asks for the fix; undefined when it is fine.
 * It mirrors the backend rules so that the common slips are caught before the call; the backend message still wins when it refuses.
 */
export function invoiceInfoProblem(info: InvoiceInfoValue, contact: AddressValue): string | undefined {
  if (info.buyerType === "Consumer") return undefined;
  const organization = info.buyerType === "Organization";
  if (!info.name.trim()) return organization ? "Nhập tên đơn vị xuất hóa đơn." : "Nhập họ tên người mua hóa đơn.";
  if (organization) {
    if (!info.taxCode.trim()) return "Nhập mã số thuế của đơn vị.";
    if (!taxCodePattern.test(info.taxCode.trim())) return "Mã số thuế gồm 10 chữ số, hoặc 10 chữ số, dấu gạch ngang và 3 chữ số.";
  } else if (info.personalTaxId.trim() && !personalTaxIdPattern.test(info.personalTaxId.trim())) return "MST / Số định danh cá nhân gồm 10 đến 12 chữ số.";
  if (!addressComplete(info.sameAsContact ? contact : info.address)) {
    return info.sameAsContact ? "Địa chỉ xuất hóa đơn lấy theo địa chỉ liên hệ: hãy nhập đủ tỉnh/thành, phường/xã và số nhà, đường ở mục Địa chỉ." : "Nhập đủ địa chỉ xuất hóa đơn: tỉnh/thành, phường/xã và số nhà, đường.";
  }
  if (organization && !info.email.trim()) return "Nhập email nhận hóa đơn điện tử.";
  if (info.email.trim() && !emailPattern.test(info.email.trim())) return "Email nhận hóa đơn không hợp lệ.";
  return undefined;
}
