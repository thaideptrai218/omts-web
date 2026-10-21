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
  access: DashboardAccessSummary;
  workforce: DashboardWorkforceSummary;
}>;

export type DashboardView = Readonly<{
  access?: DashboardAccessSummary;
  workforce?: DashboardWorkforceSummary;
}>;
