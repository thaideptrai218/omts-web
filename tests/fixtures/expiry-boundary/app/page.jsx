"use client";
import { deriveAccessBoundExpiry, checkAccessBoundExpiry } from "../../../../src/server/auth/session-expiry";

export default function InvalidExpiryClientPage() {
  const derived = deriveAccessBoundExpiry(null, () => 0);
  const checked = checkAccessBoundExpiry(null, () => 0);
  return <p>{derived.status}/{checked.status}</p>;
}
