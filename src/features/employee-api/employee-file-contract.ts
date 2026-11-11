import { z } from "zod";

/** Limits of the import file; the BFF and the dialog both enforce them before the backend sees the file. */
export const employeeImportMaxBytes = 2 * 1024 * 1024;
export const employeeFileMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Answer of POST /api/employees/import: rows with an error are skipped, the others are imported.
 * `fields` are backend labels (for example "Phone number"); `message` is English backend text, `messageCode` is null for
 * the file-level reasons that have no catalogue number yet.
 */
export const employeeImportResultSchema = z.strictObject({
  imported: z.number().int().min(0),
  errors: z.array(z.strictObject({
    row: z.number().int().min(1),
    fields: z.array(z.string().max(64)).max(32),
    message: z.string().max(500),
    messageCode: z.string().max(40).nullish(),
  })).max(2000),
});
export type EmployeeImportResult = z.infer<typeof employeeImportResultSchema>;
