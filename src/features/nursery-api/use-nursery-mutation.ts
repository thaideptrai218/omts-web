"use client";
import { useMutation } from "@/features/operations/ui";

export function useNurseryMutation() {
  const mutation = useMutation();
  const specific = (mutation.failure as { nurseryMessage?: string } | undefined)?.nurseryMessage;
  return { ...mutation, error: specific ?? mutation.error };
}
