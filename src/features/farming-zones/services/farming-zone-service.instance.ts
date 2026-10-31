import { mockManagementEnvironment as environment } from "@/shared/mocks/mock-management-environment.instance";
import { resolveMockZoneAccess } from "@/shared/mocks/mock-zone-access";
import {
  createFarmingZoneService,
  type FarmingZoneService,
} from "./farming-zone-service";

const services = new Map<string, FarmingZoneService>();
export function getFarmingZoneService(accountId: string): FarmingZoneService {
  const existing = services.get(accountId);
  if (existing) return existing;
  const service = createFarmingZoneService(
    environment.zones.forAccess(() =>
      resolveMockZoneAccess(
        accountId,
        environment.accounts.snapshotAccounts(),
        environment.roles.snapshotRoles(),
        environment.zones.snapshotOptions(),
      ),
    ),
  );
  services.set(accountId, service);
  return service;
}
