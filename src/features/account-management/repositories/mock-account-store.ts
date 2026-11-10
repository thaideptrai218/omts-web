import type { ManagedAccount } from "@/features/account-management/domain/account-management";
import { cloneAccount } from "@/features/account-management/repositories/mock-account-store-helpers";

/** Early results shared by every mock account request (expired session / no permission). */
export type MockAccountEarlyResult =
  | Readonly<{ message: Readonly<{ code: "MSG19" }>; status: "session-expired" }>
  | Readonly<{ message: Readonly<{ code: "MSG02" }>; status: "forbidden" }>;

/** Simulated latency + session/permission checks run before each mock request. */
export type MockAccountPrepareRequest = () => Promise<MockAccountEarlyResult | undefined>;

/**
 * Mutable in-memory account list plus the id/version counters of the mock backend.
 * Counters keep the exact numbering the single-closure repository used before.
 */
export function createMockAccountStore(initialAccounts: readonly ManagedAccount[]) {
  let accounts = initialAccounts.map(cloneAccount);
  let nextAccountNumber = accounts.length + 1;
  let nextGrantNumber = 1;
  let nextVersion = accounts.length + 1;

  return {
    all: (): readonly ManagedAccount[] => accounts,
    find: (accountId: string) => accounts.find((account) => account.id === accountId),
    replace(account: ManagedAccount) {
      accounts = accounts.map((item) => (item.id === account.id ? account : item));
    },
    append(account: ManagedAccount) {
      accounts = [...accounts, account];
    },
    nextRecordVersion: () => `account-v${++nextVersion}`,
    nextGrantId: () => `grant-${nextGrantNumber++}`,
    nextAccountId: () => `account-${nextAccountNumber++}`,
  };
}

export type MockAccountStore = ReturnType<typeof createMockAccountStore>;
