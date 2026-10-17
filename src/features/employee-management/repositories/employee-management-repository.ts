import type {
  LoadEmployeeWorkspaceResult,
  SaveEmployeeInput,
  SaveEmployeeResult,
} from "@/features/employee-management/domain/employee-management";

export interface EmployeeManagementRepository {
  load(): Promise<LoadEmployeeWorkspaceResult>;
  save(input: SaveEmployeeInput): Promise<SaveEmployeeResult>;
}
