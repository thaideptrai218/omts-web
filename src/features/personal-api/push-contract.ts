import { z } from "zod";
const type = z.string().min(1).max(100).regex(/^[A-Z][A-Z0-9_]*$/);
export const pushCatalogSchema = z.object({
  types: z.array(z.object({ type, name: z.string().min(1).max(200), mandatory: z.boolean(), push: z.boolean() })
    .refine((row) => !row.mandatory || row.push)).max(100)
    .refine((rows) => new Set(rows.map((row) => row.type)).size === rows.length),
  pushAllowedOnDevice: z.boolean(),
});
export const pushSaveSchema = z.strictObject({ items: z.array(z.strictObject({ type, push: z.boolean() })).min(1).max(100)
  .refine((rows) => new Set(rows.map((row) => row.type)).size === rows.length) });
export const pushSavedSchema = pushCatalogSchema.extend({ messageCode: z.literal("MSG-GEN-05"),
  notice: z.string().min(1).nullable(), noticeCode: z.literal("MSG-ACCOUNT-21").nullable() })
  .refine((value) => (value.notice === null) === (value.noticeCode === null));
export type PushCatalog = z.infer<typeof pushCatalogSchema>;
export function pushPatch(catalog: PushCatalog, values: Record<string, boolean>) {
  return catalog.types.flatMap((row) => !row.mandatory && typeof values[row.type] === "boolean" && values[row.type] !== row.push
    ? [{ type: row.type, push: values[row.type] }] : []);
}
