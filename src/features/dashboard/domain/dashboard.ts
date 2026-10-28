export type DashboardWorkforceSummary = Readonly<{
  employedCount: number;
  leftCount: number;
}>;

export type DashboardAccessSummary = Readonly<{
  activeInternalAccountCount: number;
  lockedInternalAccountCount: number;
  roleInUseCount: number;
  zoneInUseCount: number;
}>;

export type DashboardSnapshot = Readonly<{
  farming?: DashboardFarmingSummary;
  access: DashboardAccessSummary;
  workforce: DashboardWorkforceSummary;
}>;

export type DashboardView = Readonly<{
  farming?: DashboardFarmingSummary;
  access?: DashboardAccessSummary;
  workforce?: DashboardWorkforceSummary;
}>;

export type DashboardFarmingSummary = Readonly<{
  activeRaftCount: number;
  discontinuedRaftCount: number;
  openCycleCount: number;
}>;
