type LocalSessionClear = () => void;
type ProtectedCacheClear = () => void;
type RemoteSessionInvalidation = () => Promise<void>;

export async function performLocalFirstLogout(
  clearLocalSession: LocalSessionClear,
  clearProtectedCache: ProtectedCacheClear,
  invalidateRemoteSession: RemoteSessionInvalidation,
): Promise<void> {
  clearLocalSession();
  clearProtectedCache();
  await invalidateRemoteSession();
}
