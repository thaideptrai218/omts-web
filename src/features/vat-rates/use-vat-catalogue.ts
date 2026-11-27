"use client";
import { useEffect, useState } from "react";
import { emptyVatCatalogue, type VatCatalogue } from "@/features/input-items/vat-rate";
import { loadVatCatalogue } from "./repository";

/** The VAT rate catalogue for a picker, loaded when the screen mounts; `loading` is true until the first answer. */
export function useVatCatalogue() {
  const [state, setState] = useState<{ catalogue: VatCatalogue; loading: boolean }>({ catalogue: emptyVatCatalogue, loading: true });
  useEffect(() => {
    const controller = new AbortController();
    void loadVatCatalogue(controller.signal).then((catalogue) => { if (!controller.signal.aborted) setState({ catalogue, loading: false }); });
    return () => controller.abort();
  }, []);
  return state;
}
