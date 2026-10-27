import {
  employeePageSchema, employeeSavedSchema, employeeViewSchema, linkableEmployeeAccountsSchema,
  type EmployeeListItemDto, type EmployeeViewDto,
} from "./employee-contract.schemas";
import type {
  EmployeeLinkableAccount, EmployeeLinkedAccount, EmployeeListRecord, EmployeePage, EmployeeRecord,
} from "@/features/employee-management/domain/employee-record";

type MappingResult<T> =
  | Readonly<{ status: "mapped"; value: T }>
  | Readonly<{ status: "invalid-response" | "employee-mismatch" }>;

const employmentStatuses = { Employed: "employed", Left: "left" } as const;
const accountStatuses = { Active: "active", Locked: "locked" } as const;

function mapAccount(dto: NonNullable<EmployeeListItemDto["account"]>): EmployeeLinkedAccount {
  return { id: dto.id, username: dto.username, displayName: dto.displayName, status: accountStatuses[dto.status] };
}

function mapSummary(dto: EmployeeListItemDto): EmployeeListRecord {
  return {
    id: dto.id, fullName: dto.fullName, phone: dto.phoneNumber,
    workingZones: dto.workingZones.map((zone) => ({ ...zone })),
    account: dto.account === null ? null : mapAccount(dto.account),
    status: employmentStatuses[dto.status],
  };
}

function mapDetail(dto: EmployeeViewDto, expectedEmployeeId: string): MappingResult<EmployeeRecord> {
  if (dto.id.toLowerCase() !== expectedEmployeeId.toLowerCase()) return { status: "employee-mismatch" };
  return {
    status: "mapped",
    value: {
      ...mapSummary(dto), birthday: dto.birthday, address: dto.address, area: dto.area,
      wardCommune: dto.ward, otherInformation: dto.otherInformation, notes: dto.notes,
      bankAccount: dto.bankAccount === null ? null : { ...dto.bankAccount },
      employmentEndDate: dto.employmentEndDate, recordVersion: dto.rowVersion,
    },
  };
}

export function mapEmployeeDetailResponse(input: unknown, expectedEmployeeId: string): MappingResult<EmployeeRecord> {
  const parsed = employeeViewSchema.safeParse(input);
  return parsed.success ? mapDetail(parsed.data, expectedEmployeeId) : { status: "invalid-response" };
}

// No raw English success message or one-time credential is forwarded.
export function mapEmployeeSavedResponse(input: unknown, expectedEmployeeId: string): MappingResult<EmployeeRecord> {
  const parsed = employeeSavedSchema.safeParse(input);
  return parsed.success ? mapDetail(parsed.data.employee, expectedEmployeeId) : { status: "invalid-response" };
}

export function mapEmployeePageResponse(input: unknown): MappingResult<EmployeePage> {
  const parsed = employeePageSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid-response" };
  const { items, page, pageSize, total } = parsed.data;
  return { status: "mapped", value: { items: items.map(mapSummary), page, pageSize, total } };
}

export function mapLinkableEmployeeAccountsResponse(input: unknown): MappingResult<readonly EmployeeLinkableAccount[]> {
  const parsed = linkableEmployeeAccountsSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid-response" };
  return {
    status: "mapped",
    value: parsed.data.map((account) => ({ ...mapAccount(account), phone: account.phoneNumber })),
  };
}
