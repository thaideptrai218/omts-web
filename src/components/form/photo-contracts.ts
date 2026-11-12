import { z } from "zod";

/**
 * Additive read fields: old records can omit their photos entirely, and harvest keeps the legacy `key`.
 * Both identifiers are normalised so callers always have a stable id (gallery) and key (keepPhotoKeys).
 */
export const stepPhotoSchema = z.object({ id: z.string().optional(), key: z.string().optional(), url: z.string(), sortOrder: z.number().optional() })
  .transform(photo => ({ ...photo, id: photo.id ?? photo.key ?? photo.url, key: photo.key ?? photo.id ?? photo.url }));
export const stepPhotosSchema = z.array(stepPhotoSchema).nullish().transform(value => value ?? []);
export type StepPhoto = z.infer<typeof stepPhotoSchema>;
