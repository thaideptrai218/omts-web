import { z } from "zod";
import type { Employee } from "./contracts";
import { buildEmployeeSaveBody, employeeApiEditorSchema, valuesOf, type EmployeeFormValues } from "./employee-editor-model";
import type { EmployeeTabKey } from "./employee-tabs";

const personal = { code: true, fullName: true, phone: true, birthday: true, gender: true, idNumber: true, startDate: true, address: true, area: true, wardCommune: true, otherInformation: true, notes: true } as const;
const work = { employeeType: true, employeeTypeFrom: true, jobTypeIds: true, workingZoneIds: true } as const;
const bank = { bankAccount: true } as const;
const masks = { information: personal, work, bank, account: {} };
export const inlineSchemas = {
  information: employeeApiEditorSchema.pick(personal),
  work: employeeApiEditorSchema.pick(work),
  bank: employeeApiEditorSchema.pick(bank),
};

/** Only the open subtab is overlaid on the loaded record; PUT replaces lists. */
export function mergeEmployeeTab(record: Employee, draft: EmployeeFormValues, tab: EmployeeTabKey) {
  const next = valuesOf(record);
  for (const key of Object.keys(masks[tab]) as (keyof EmployeeFormValues)[]) {
    Object.assign(next, { [key]: draft[key] });
  }
  return next;
}

export function employeeTabSaveBody(record: Employee, draft: EmployeeFormValues, tab: EmployeeTabKey) {
  const merged = mergeEmployeeTab(record, draft, tab);
  const body = buildEmployeeSaveBody(merged as z.infer<typeof employeeApiEditorSchema>, record);
  // Preserve untouched nullable and historical fields exactly, including bank formatting.
  if (tab !== "information") Object.assign(body, { fullName: record.fullName, phoneNumber: record.phoneNumber, birthday: record.birthday ?? null, address: record.address ?? null, area: record.area ?? null, ward: record.ward ?? null, otherInformation: record.otherInformation ?? null, notes: record.notes ?? null });
  if (tab !== "bank") body.bankAccount = record.bankAccount ?? null;
  return body;
}
