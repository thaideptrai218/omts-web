type MockAccountContact = Readonly<{ kind: "email" | "phone"; value: string; isVerified: boolean }>;
type MockAccountIdentity = Readonly<{ accountId: string; username: string; displayName: string; contacts?: readonly MockAccountContact[] }>;
type Seed = MockAccountIdentity & Readonly<{ password: string; identifiers: readonly string[] }>;

// Only synthetic review data in memory. No browser storage, tokens or API use.
export function createMockAccountDirectory(seeds: readonly Seed[] = []) {
  const accounts = new Map<string, Seed>();
  const identifiers = new Map<string, string>();
  const retiredIdentifiers = new Set<string>();
  const normalize = (value: string) => value.trim();
  const identity = (record: Seed): MockAccountIdentity => ({
    accountId: record.accountId, username: record.username, displayName: record.displayName,
    contacts: record.contacts?.map((contact) => ({ ...contact })),
  });

  function register(seed: Seed): boolean {
    const aliases = [...new Set([seed.username, ...seed.identifiers].map(normalize))];
    if (aliases.some((alias) => { const owner = identifiers.get(alias); return owner !== undefined && owner !== seed.accountId; })) return false;
    const previous = accounts.get(seed.accountId);
    for (const alias of previous?.identifiers ?? []) {
      identifiers.delete(alias); retiredIdentifiers.add(alias);
    }
    const record = { ...seed, identifiers: aliases, contacts: seed.contacts?.map((contact) => ({ ...contact })) };
    accounts.set(seed.accountId, record);
    aliases.forEach((alias) => identifiers.set(alias, seed.accountId));
    return true;
  }
  seeds.forEach((seed) => { if (!register(seed)) throw new Error("DUPLICATE_MOCK_IDENTIFIER"); });

  return Object.freeze({
    register,
    findAccount(accountId: string) { const record = accounts.get(accountId); return record ? identity(record) : undefined; },
    findIdentifier(value: string) {
      const accountId = identifiers.get(normalize(value));
      const record = accountId ? accounts.get(accountId) : undefined;
      return record ? identity(record) : undefined;
    },
    isRetiredIdentifier(value: string) { return retiredIdentifiers.has(normalize(value)) && !identifiers.has(normalize(value)); },
    isIdentifierTaken(value: string, exceptAccountId: string) {
      const owner = identifiers.get(normalize(value));
      return owner !== undefined && owner !== exceptAccountId;
    },
    verifyPassword(accountId: string, password: string): boolean | undefined {
      const record = accounts.get(accountId);
      return record ? record.password === password : undefined;
    },
    replacePassword(accountId: string, password: string): boolean {
      const record = accounts.get(accountId);
      if (!record) return false;
      accounts.set(accountId, { ...record, password });
      return true;
    },
    updateIdentity(input: MockAccountIdentity & Readonly<{ identifiers: readonly string[] }>): boolean {
      const record = accounts.get(input.accountId);
      return record ? register({ ...record, ...input }) : false;
    },
  });
}

export type MockAccountDirectory = ReturnType<typeof createMockAccountDirectory>;
