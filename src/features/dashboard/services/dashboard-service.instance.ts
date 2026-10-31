import { mockManagementEnvironment } from "@/shared/mocks/mock-management-environment.instance";
import { createDashboardService } from "@/features/dashboard/services/dashboard-service";

export const dashboardService = createDashboardService(
  mockManagementEnvironment.dashboard,
);
