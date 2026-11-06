"use client";

// No JSON.stringify here: the negative case must fail at the Server -> Client
// boundary, not because a client component deliberately calls the JSON guard.
export default function ReviewClient({ dto }) {
  return <p>{dto.displayName ?? "serialization-fixture-client"}</p>;
}
