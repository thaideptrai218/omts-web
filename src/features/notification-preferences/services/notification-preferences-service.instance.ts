import { createMockNotificationPreferencesRepository } from "../repositories/mock-notification-preferences-repository";
import { notificationPreferencesFixture } from "../mocks/notification-preferences-fixture";
import { createNotificationPreferencesService, type NotificationPreferencesService } from "./notification-preferences-service";
import { mockManagementEnvironment } from "@/shared/mocks/mock-management-environment.instance";

const services = new Map<string, { service: NotificationPreferencesService; eligibility: { emailVerified: boolean } }>();
export function getNotificationPreferencesService(accountId: string, emailVerified: boolean): NotificationPreferencesService {
  const existing = services.get(accountId);
  if (existing) { existing.eligibility.emailVerified = emailVerified; return existing.service; }
  const eligibility = { emailVerified };
  const service = createNotificationPreferencesService(createMockNotificationPreferencesRepository({
    initialSettings: notificationPreferencesFixture(accountId, mockManagementEnvironment.accounts.snapshotAccounts()
      .some((account) => account.id === accountId && account.accountType === "internal")),
    isEmailVerified: () => eligibility.emailVerified,
  }));
  services.set(accountId, { service, eligibility });
  return service;
}
