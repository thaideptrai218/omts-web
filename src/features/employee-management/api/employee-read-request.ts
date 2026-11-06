import { z } from "zod";
import { apiIdSchema } from "@/features/auth/api/auth-contract.schemas";

const positiveInt32 = z.number().int().min(1).max(2_147_483_647);
const employeeStatusId = z.union([z.literal(401), z.literal(402)]);

// Wire query only: absent statusId means all. The UI's initial Employed
// filter must explicitly send 401; parsing a query does not choose UI policy.
export const employeeListQuerySchema = z.strictObject({
  search: z.string().optional(),
  statusId: employeeStatusId.optional(),
  zoneId: apiIdSchema.optional(),
  page: positiveInt32.default(1),
  pageSize: positiveInt32.max(100).default(20),
}).refine(({ page, pageSize }) => (page - 1) * pageSize <= 2_147_483_647, {
  path: ["page"], message: "Paging offset exceeds the backend Int32 range",
});

export const employeeListRequestSchema = z.strictObject({
  endpoint: z.literal("employeeList"), query: employeeListQuerySchema,
});
export const employeeDetailRequestSchema = z.strictObject({
  endpoint: z.literal("employeeRead"), employeeId: apiIdSchema,
});
export const employeePickerRequestSchema = z.strictObject({ endpoint: z.literal("employeeLinkableAccounts") });
export const employeeReadRequestSchema = z.discriminatedUnion("endpoint", [
  employeeListRequestSchema, employeeDetailRequestSchema, employeePickerRequestSchema,
]);
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
export type EmployeeReadRequest = z.infer<typeof employeeReadRequestSchema>;

const numericQuery = z.string().regex(/^[1-9]\d*$/u).transform(Number).pipe(positiveInt32);
const urlQuerySchema = z.strictObject({
  search: z.string().optional(), statusId: numericQuery.optional(), zoneId: apiIdSchema.optional(),
  page: numericQuery.optional(), pageSize: numericQuery.optional(),
}).pipe(employeeListQuerySchema);

export function parseEmployeeListSearchParams(searchParams: URLSearchParams) {
  const values: Record<string, string> = {};
  for (const [key, value] of searchParams) {
    if (Object.hasOwn(values, key)) return { status: "invalid-input" } as const;
    Object.defineProperty(values, key, { value, enumerable: true });
  }
  const parsed = urlQuerySchema.safeParse(values);
  return parsed.success ? { status: "parsed" as const, query: parsed.data } : { status: "invalid-input" as const };
}

export function prepareEmployeeReadRequest(input: unknown) {
  const parsed = employeeReadRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid-input" } as const;
  const request = parsed.data;
  let path: string;
  if (request.endpoint === "employeeList") {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(request.query)) {
      if (value !== undefined) query.set(key, String(value));
    }
    path = `/api/employees?${query.toString()}`;
  } else {
    path = request.endpoint === "employeeRead"
      ? `/api/employees/${request.employeeId}` : "/api/employees/linkable-accounts";
  }
  return { status: "prepared" as const, request: {
    method: "GET" as const, path, headers: { Accept: "application/json" as const },
  } };
}
