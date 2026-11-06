import { z } from "zod";
const names = { Code: "code", Name: "name", Group: "group", Unit: "unit", PhoneNumber: "phoneNumber", "Phone number": "phoneNumber", Address: "address", Email: "email" } as const;
export const catalogueProblemSchema = z.object({ field: z.enum(["code", "name", "group", "unit", "phoneNumber", "address", "email"]), existingId: z.guid().optional() });
export type CatalogueProblem = z.infer<typeof catalogueProblemSchema>;
export function projectCatalogueProblem(status: number, code: string | undefined, raw: unknown): CatalogueProblem | undefined {
  if (!((status === 400 && ["MSG01", "MSG-GEN-01"].includes(code ?? "")) || (status === 409 && ["MSG03", "MSG-GEN-02"].includes(code ?? "")))) return;
  const value = z.object({ field: z.string(), existingId: z.guid().optional() }).safeParse(raw);
  if (!value.success || !Object.hasOwn(names, value.data.field)) return;
  return { field: names[value.data.field as keyof typeof names], ...(status === 409 && value.data.existingId ? { existingId: value.data.existingId } : {}) };
}
