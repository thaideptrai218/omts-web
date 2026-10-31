import type {
  LoadEmployeeWorkspaceResult,
  SaveEmployeeInput,
  SaveEmployeeResult,
  UnlinkEmployeeAccountInput,
  UnlinkEmployeeAccountResult,
} from "@/features/employee-management/domain/employee-management";
import type { ChangeEmployeeEmploymentResult, EndEmployeeEmploymentInput, ReinstateEmployeeInput } from "../domain/employee-employment";

import type { CreateEmployeeAccountInput, CreateEmployeeAccountResult } from "../domain/employee-account-creation";

export interface EmployeeManagementRepository {
  createLoginAccount(input: CreateEmployeeAccountInput): Promise<CreateEmployeeAccountResult>;
  load(): Promise<LoadEmployeeWorkspaceResult>;
  save(input: SaveEmployeeInput): Promise<SaveEmployeeResult>;
  unlinkAccount(input: UnlinkEmployeeAccountInput): Promise<UnlinkEmployeeAccountResult>;
  endEmployment(input: EndEmployeeEmploymentInput): Promise<ChangeEmployeeEmploymentResult>;
  reinstate(input: ReinstateEmployeeInput): Promise<ChangeEmployeeEmploymentResult>;
}
