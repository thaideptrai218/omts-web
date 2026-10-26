import type {
  LoadEmployeeWorkspaceResult,
  SaveEmployeeInput,
  SaveEmployeeResult,
  UnlinkEmployeeAccountInput,
  UnlinkEmployeeAccountResult,
} from "@/features/employee-management/domain/employee-management";

export interface EmployeeManagementRepository {
  load(): Promise<LoadEmployeeWorkspaceResult>;
  save(input: SaveEmployeeInput): Promise<SaveEmployeeResult>;
  unlinkAccount(input: UnlinkEmployeeAccountInput): Promise<UnlinkEmployeeAccountResult>;
}
