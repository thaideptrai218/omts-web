import { z } from "zod";
export const supplierDocumentsSchema = z.object({ id: z.guid(), name: z.string(), supplierType: z.enum(["Seed", "Material", "Other"]), phoneNumber: z.string(), otherContacts: z.string().nullable(), statusId: z.number().int(), status: z.string(), debt: z.number().finite(), rowVersion: z.string().min(1), certificates: z.array(z.object({ index: z.number().int().min(0).max(9), url: z.string() })).max(10) }).refine((value) => value.certificates.every((file, index) => file.index === index));
export type SupplierDocuments = z.infer<typeof supplierDocumentsSchema>;
