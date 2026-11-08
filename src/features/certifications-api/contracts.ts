import { z } from "zod";
export const certificationSchema = z.object({ id: z.guid(), name: z.string(), number: z.string().nullable(), issuer: z.string().nullable(), expiryDate: z.string().nullable(), state: z.enum(["Valid","ExpiringSoon","Expired"]), fileUrl: z.string().nullable(), rowVersion: z.string() });
export type Certification = z.infer<typeof certificationSchema>;
export const certificationInput = z.strictObject({ name: z.string().trim().min(1).max(200), number: z.string().max(100).nullable(), issuer: z.string().max(200).nullable(), expiryDate: z.iso.date(), rowVersion: z.string().min(1).optional() });
