import { z } from "zod";
export const product = z.object({ id: z.guid(), name: z.string(), unitPrice: z.number().nullable(), statusId: z.number().int(), status: z.string(), rowVersion: z.string().min(1) });
export const saveProduct = z.strictObject({ name: z.string().trim().min(1).max(200), unitPrice: z.number().int().positive(), rowVersion: z.string().min(1).nullable() });
export type Product = z.infer<typeof product>;
