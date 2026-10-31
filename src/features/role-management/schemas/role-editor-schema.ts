import { z } from "zod";

export const roleEditorSchema = z.object({
  description: z.string(),
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên vai trò.")
    .max(100, "Tên vai trò không được dài quá 100 ký tự."),
});

export type RoleEditorValues = z.infer<typeof roleEditorSchema>;
