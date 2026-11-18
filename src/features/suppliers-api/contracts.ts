import { z } from "zod";
import { addressViewFields, invoiceViewFields } from "@/features/address-invoice/contracts";

const text = z.string();
const optional = text.nullable();
const type = z.enum(["Seed", "Material", "Other"]);

/** The list carries the contact address and the kind of invoice buyer; the rest of the invoice info is on the detail only. */
export const supplierRow = z.object({
  id: z.guid(), name: text, code: text, supplierType: type, phoneNumber: text, statusId: z.number().int(), status: text,
  email: optional, address: optional, province: optional, ward: optional, companyName: optional, taxCode: optional, note: optional, ...addressViewFields, invoiceBuyerType: optional.optional(), invoiceName: optional.optional(),
  createdAt: text, createdBy: optional, totalPurchased: z.number().nullable(), currentDebt: z.number().nullable(),
});
export const supplierPage = z.object({ items: z.array(supplierRow), page: z.number().int(), pageSize: z.number().int(), total: z.number().int() });
export const supplierDetail = z.object({
  id: z.guid(), name: text, code: text, supplierType: type, phoneNumber: text, statusId: z.number().int(), status: text,
  email: optional, address: optional, province: optional, ward: optional, companyName: optional, taxCode: optional, note: optional, ...addressViewFields, ...invoiceViewFields,
  createdAt: text, createdBy: optional, certificates: z.array(z.object({ index: z.number().int() })), rowVersion: text.min(1),
});
export const historyPage = z.object({
  items: z.array(z.object({ id: z.guid(), receiptId: z.guid().nullable(), kind: z.enum(["Receipt", "Return"]), code: text, date: text, createdAt: text, createdBy: optional, total: z.number(), statusId: z.number().int(), status: text })),
  page: z.number().int(), pageSize: z.number().int(), total: z.number().int(),
});
export const bulkResult = z.object({ succeeded: z.number().int(), failed: z.number().int(), outcomes: z.array(z.object({ id: z.guid(), succeeded: z.boolean(), code: optional, message: optional })) });
export const importResult = z.object({ imported: z.number().int(), errors: z.array(z.object({ row: z.number().int(), fields: z.array(text), message: text })) });

export type SupplierRow = z.infer<typeof supplierRow>;
export type SupplierPage = z.infer<typeof supplierPage>;
export type SupplierDetail = z.infer<typeof supplierDetail>;
export type HistoryPage = z.infer<typeof historyPage>;
export type BulkResult = z.infer<typeof bulkResult>;
export type ImportResult = z.infer<typeof importResult>;

export const supplierTypes = [["Seed", "Giống"], ["Material", "Vật tư"], ["Other", "Khác"]] as const;
export const typeLabel = (value: string) => supplierTypes.find(([key]) => key === value)?.[1] ?? value;
export const IN_USE = 101, DISCONTINUED = 102;
