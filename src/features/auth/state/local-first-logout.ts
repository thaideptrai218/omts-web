type LocalSessionClear = () => void;
type ProtectedCacheClear = () => void;
type RemoteSessionInvalidation = () => Promise<void>;

export type LocalFirstLogoutOptions = Readonly<{
  remoteTimeoutMs?: number;
}>;

export async function performLocalFirstLogout(
  clearLocalSession: LocalSessionClear,
  clearProtectedCache: ProtectedCacheClear,
  invalidateRemoteSession: RemoteSessionInvalidation,
  { remoteTimeoutMs = 1_500 }: LocalFirstLogoutOptions = {},
): Promise<void> {
  clearLocalSession();
  clearProtectedCache();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timeoutId = setTimeout(() => resolve("timeout"), remoteTimeoutMs);
  });

  try {
    await Promise.race([
      invalidateRemoteSession().catch(() => undefined),
      timeout,
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
