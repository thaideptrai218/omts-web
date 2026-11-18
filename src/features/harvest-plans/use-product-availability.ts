"use client";
import { useCallback } from "react";
import { useRemote } from "@/features/operations/ui";
import { availabilityText, productAvailability } from "./plan-maturity";
import { planRepository } from "./repository";

/**
 * "Có sẵn" or "Sắp có – dự kiến dd/mm" for a product, from the rafts that farm it (the rafts a plan can be made for; the read is for who may make plans). Nothing is shown while loading, when the
 * caller may not read the rafts, or when no raft farming the product has an expected harvest date: the order screen never fails because of it.
 */
export function useProductAvailability(enabled: boolean): (productId: string) => string | undefined {
  const remote = useRemote(useCallback((signal: AbortSignal) => enabled
    ? planRepository.eligibleRafts(undefined, signal)
    : Promise.resolve({ status: "success" as const, data: undefined }), [enabled]));
  const rafts = remote.data;
  return (productId) => rafts ? availabilityText(productAvailability(rafts, productId)) : undefined;
}
