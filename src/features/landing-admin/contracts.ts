import { z } from "zod";

export const landingSections = ["Background", "Press", "Gallery"] as const;
export type LandingSectionName = (typeof landingSections)[number];

export const landingSettingsSchema = z.object({
  photos: z.array(z.object({ id: z.guid(), section: z.enum(landingSections), caption: z.string().nullish(), url: z.string() })),
  featuredInvoiceCode: z.string().nullish(),
});
export type LandingSettings = z.infer<typeof landingSettingsSchema>;

export const addPhotoSchema = z.strictObject({ section: z.enum(landingSections), caption: z.string().max(150).optional() });
export const removePhotoSchema = z.strictObject({ id: z.guid() });
export const exampleInvoiceSchema = z.strictObject({ invoiceCode: z.string().max(30) });
