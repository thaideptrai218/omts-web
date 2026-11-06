import { mockManagementEnvironment as environment } from "@/shared/mocks/mock-management-environment.instance";
import { resolveMockRaftAccess } from "@/shared/mocks/mock-raft-access";
import { createRaftService, type RaftService } from "./raft-service";

const services = new Map<string, RaftService>();
export function getRaftService(accountId: string): RaftService {
  const existing = services.get(accountId);
  if (existing) return existing;
  const service = createRaftService(
    environment.rafts.forAccess(() =>
      resolveMockRaftAccess(
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
