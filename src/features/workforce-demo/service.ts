import { mockManagementEnvironment as environment } from "@/shared/mocks/mock-management-environment.instance";
import { createDemoWorkforceRepository } from "./repository";
// Shares the existing local demo directory; no backend requests or credentials.
export const demoWorkforceService = createDemoWorkforceRepository({ accounts: () => environment.accounts.snapshotAccounts(), roles: () => environment.roles.snapshotRoles(), zones: () => environment.zones.snapshotOptions(), employees: () => environment.employees.snapshotEmployees(), rafts: () => environment.rafts.snapshotRafts() });
