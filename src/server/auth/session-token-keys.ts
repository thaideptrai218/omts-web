import "server-only";
import { KeyObject } from "node:crypto";

export type SessionKeyProvider = Readonly<{
  active(): Promise<Readonly<{ keyId: string; key: KeyObject }>>;
  byId(keyId: string): Promise<KeyObject | undefined>;
}>;

export function isSessionEncryptionKey(key: unknown): key is KeyObject {
  return key instanceof KeyObject && key.type === "secret" && key.symmetricKeySize === 32;
}
