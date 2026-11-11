import { z } from "zod";
import { apiIdSchema } from "@/features/auth/api/auth-contract.schemas";

const positiveInt32 = z.number().int().min(1).max(2_147_483_647);
const employeeStatusId = z.union([z.literal(401), z.literal(402)]);

export const employeeSortBySchema = z.enum(["name", "code", "phone", "type", "status", "lastWorkingDay"]);
const employeeTypeFilter = z.enum(["SeasonalWorker", "Staff"]);
const sortDirSchema = z.enum(["asc", "desc"]);
/** Largest id selection the export endpoint accepts. */
export const maxEmployeeExportIds = 200;

// Wire query only: absent statusId means all. The UI's initial Employed
// filter must explicitly send 401; parsing a query does not choose UI policy.
export const employeeListQuerySchema = z.strictObject({
  search: z.string().optional(),
  statusId: employeeStatusId.optional(),
  zoneId: apiIdSchema.optional(),
  employeeType: employeeTypeFilter.optional(),
  jobTypeId: apiIdSchema.optional(),
  sortBy: employeeSortBySchema.optional(),
  sortDir: sortDirSchema.optional(),
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
// Compatibility for the external legacy registry: reject this removed endpoint.
export const employeePickerRequestSchema = z.strictObject({ endpoint: z.literal("employeeLinkableAccounts").refine(() => false, "Endpoint removed") });
export const employeeReadRequestSchema = z.discriminatedUnion("endpoint", [
  employeeListRequestSchema, employeeDetailRequestSchema,
]);
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
export type EmployeeReadRequest = z.infer<typeof employeeReadRequestSchema>;

const numericQuery = z.string().regex(/^[1-9]\d*$/u).transform(Number).pipe(positiveInt32);
const urlQuerySchema = z.strictObject({
  search: z.string().optional(), statusId: numericQuery.optional(), zoneId: apiIdSchema.optional(),
  employeeType: employeeTypeFilter.optional(), jobTypeId: apiIdSchema.optional(), sortBy: employeeSortBySchema.optional(), sortDir: sortDirSchema.optional(),
  page: numericQuery.optional(), pageSize: numericQuery.optional(),
}).pipe(employeeListQuerySchema);

/** The export takes the list filters and sort without paging; `ids` replaces the filters (the backend ignores them then). */
const exportFilters = { search: z.string().max(200).optional(), statusId: numericQuery.optional(), zoneId: apiIdSchema.optional(), employeeType: employeeTypeFilter.optional(), jobTypeId: apiIdSchema.optional() };
const exportSort = { sortBy: employeeSortBySchema.optional(), sortDir: sortDirSchema.optional() };
const exportQuerySchema = z.union([
  z.strictObject({ ...exportSort, ids: z.array(apiIdSchema).min(1).max(maxEmployeeExportIds).refine(ids => new Set(ids).size === ids.length) }),
  z.strictObject({ ...exportFilters, ...exportSort }),
]);
export function parseEmployeeExportSearchParams(searchParams: URLSearchParams) {
  const values: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const all = searchParams.getAll(key);
    if (key !== "ids" && all.length > 1) return { status: "invalid-input" } as const;
    values[key] = key === "ids" ? all : all[0];
  }
  const parsed = exportQuerySchema.safeParse(values);
  return parsed.success ? { status: "parsed" as const, query: parsed.data } : { status: "invalid-input" as const };
}

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
    path = `/api/employees/${request.employeeId}`;
  }
  return { status: "prepared" as const, request: {
    method: "GET" as const, path, headers: { Accept: "application/json" as const },
  } };
}
