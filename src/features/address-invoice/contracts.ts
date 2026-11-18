import { z } from "zod";

/**
 * Shapes of the administrative-unit and tax-lookup endpoints of the backend (api/administrative-units, api/tax-lookup), as the BFF
 * hands them over at /api/administrative-units and /api/tax-lookup. Units are the two-level ones in force since 1/7/2025: province, then ward.
 */
const text = z.string(), code = z.number().int().positive();
const named = z.object({ code, name: text.min(1) });

export const province = z.object({ code, name: text.min(1), divisionType: text.nullish() });
export const provinceList = z.array(province).max(200);
export const ward = z.object({ code, name: text.min(1), divisionType: text.nullish(), provinceCode: code });
export const wardList = z.array(ward).max(2000);
/** The company behind a tax code; the address is also split into province, ward and street when the backend could match it to the units. */
export const taxLookup = z.object({
  taxCode: text, name: text, shortName: text.nullish(), address: text, status: text.nullish(),
  province: named.nullish(), ward: named.nullish(), street: text.nullish(),
});

export type Province = z.infer<typeof province>;
export type Ward = z.infer<typeof ward>;
export type TaxLookup = z.infer<typeof taxLookup>;

/** A tax code of a company: ten digits, or ten digits, a hyphen and three digits (a branch). */
export const taxCodePattern = /^\d{10}(-\d{3})?$/;

const opt = z.string().nullish(), optCode = z.number().int().nullish(), flag = z.boolean().nullish();
/** What a customer or supplier record of the backend carries of the contact address, next to its old `province`, `ward` and `address` texts. */
export const addressViewFields = {
  provinceCode: optCode, provinceName: opt, wardCode: optCode, wardName: opt, street: opt, addressNeedsReview: flag,
};
/** What a record carries of the e-invoice buyer info. */
export const invoiceViewFields = {
  invoiceBuyerType: opt, invoiceName: opt, personalTaxId: opt, invoiceAddressSameAsContact: flag,
  invoiceProvinceCode: optCode, invoiceProvinceName: opt, invoiceWardCode: optCode, invoiceWardName: opt, invoiceStreet: opt, invoiceEmail: opt,
};

const bodyText = (max: number) => z.string().max(max).nullable().optional(), bodyCode = z.number().int().positive().nullable().optional();
/** The contact address of a save body: the codes and names of the units, the street, and the old text fields kept as names and street. */
export const addressBodyFields = {
  provinceCode: bodyCode, provinceName: bodyText(100), wardCode: bodyCode, wardName: bodyText(100), street: bodyText(500), province: bodyText(100), ward: bodyText(100), address: bodyText(500),
};
/** The invoice buyer info of a save body (the tax code stays with the other fields of the record). */
export const invoiceBodyFields = (allowConsumer: boolean) => ({
  invoiceBuyerType: (allowConsumer ? z.enum(["Organization", "Individual", "Consumer"]) : z.enum(["Organization", "Individual"])).optional(),
  invoiceName: bodyText(200), personalTaxId: bodyText(20), invoiceAddressSameAsContact: z.boolean().optional(),
  invoiceProvinceCode: bodyCode, invoiceProvinceName: bodyText(100), invoiceWardCode: bodyCode, invoiceWardName: bodyText(100), invoiceStreet: bodyText(500), invoiceEmail: bodyText(256),
});
