import type { DashboardSnapshot } from "@/features/dashboard/domain/dashboard";

export interface DashboardRepository {
  load(): Promise<DashboardSnapshot>;
}
