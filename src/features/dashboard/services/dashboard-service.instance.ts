import { createMockDashboardRepository } from "@/features/dashboard/repositories/mock-dashboard-repository";
import { createDashboardService } from "@/features/dashboard/services/dashboard-service";

export const dashboardService = createDashboardService(
  createMockDashboardRepository(),
);
