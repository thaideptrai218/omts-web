"use client";
import { CooperativeApiScreen } from "@/features/cooperative-api/cooperative-screen";
import { PersonalApiScreen } from "@/features/personal-api/profile-screen";
import type { SingletonKey } from "./singleton-contract";
export function ApiSingletonScreen({ kind }: { kind: SingletonKey }) {
  return kind === "cooperative" ? <CooperativeApiScreen /> : <PersonalApiScreen />;
}
