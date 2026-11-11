"use client";
import { useCallback } from "react";
import { useRemote } from "@/features/operations/ui";
import { customerRepository } from "./repository";

/**
 * The customer settings of the cooperative (debt warning, required fields). Not loaded when `enabled` is false; a failed read leaves
 * `data` empty, and the callers then ask for nothing extra, so the customer screens keep working.
 */
export function useCustomerSettings(enabled = true) {
  return useRemote(useCallback((signal: AbortSignal) => enabled ? customerRepository.settings(signal) : Promise.resolve({ status: "success" as const, data: undefined }), [enabled]));
}
