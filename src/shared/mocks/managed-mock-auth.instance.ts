import { createManagedMockAuth } from "./managed-mock-auth";
import { mockManagementEnvironment } from "./mock-management-environment.instance";

export const managedMockAuth = createManagedMockAuth(mockManagementEnvironment);
