import type { ReactNode } from "react";
import { addressNeedsReview, addressReviewHint, buyerTypeLabel, consumerInvoiceText, contactAddressOf, invoiceInfoOf, type AddressRecord, type AddressValue, type BuyerType } from "./model";

/** An address on one line: street, ward, province. */
export const formatAddress = (value: AddressValue) => [value.street, value.wardName, value.provinceName].map((part) => part.trim()).filter(Boolean).join(", ");

function Fact({ label, children, review = false }: { label: string; children?: ReactNode; review?: boolean }) {
  return <div><dt>{label}</dt><dd>{children || "—"}{review && <small className="block text-[#92400e]">{addressReviewHint}</small>}</dd></div>;
}

/**
 * The contact address and the e-invoice buyer info of a record, read-only, as `dt`/`dd` items of the facts list of a detail tab. `fallback` is the buyer type
 * shown while the record names none. An address that has only its old text carries the hint to pick it again.
 */
export function AddressInvoiceFacts({ record, fallback }: { record: AddressRecord; fallback: BuyerType }) {
  const contact = contactAddressOf(record), invoice = invoiceInfoOf(record, fallback), organization = invoice.buyerType === "Organization";
  const contactReview = record.addressNeedsReview ?? addressNeedsReview(contact);
  return <>
    <Fact label="Địa chỉ" review={contactReview}>{formatAddress(contact)}</Fact>
    <Fact label="Loại người mua hóa đơn">{buyerTypeLabel(invoice.buyerType)}</Fact>
    {invoice.buyerType === "Consumer" ? <Fact label="Hóa đơn ghi">{consumerInvoiceText}</Fact> : <>
      <Fact label={organization ? "Tên đơn vị" : "Họ tên"}>{invoice.name}</Fact>
      {organization ? <Fact label="Mã số thuế">{invoice.taxCode}</Fact> : <Fact label="MST / Số định danh cá nhân">{invoice.personalTaxId}</Fact>}
      <Fact label="Địa chỉ xuất hóa đơn" review={!invoice.sameAsContact && addressNeedsReview(invoice.address)}>{invoice.sameAsContact ? "Giống địa chỉ liên hệ" : formatAddress(invoice.address)}</Fact>
      <Fact label={organization ? "Email nhận hóa đơn điện tử" : "Email nhận hóa đơn"}>{invoice.email}</Fact>
    </>}
  </>;
}
