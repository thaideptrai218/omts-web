import { SideRow } from "./document-parts";

/**
 * "Thuế GTGT: KCT": oysters sold and seed are not subject to VAT, so every sales document and every seed receipt shows this one fixed row
 * before its final total; no amount changes. `side` is a row of the editor's aside, `sum` a row of the totals block of a detail, `list` a row of a definition list.
 */
export function KctVatRow({ layout, label = "Thuế GTGT", valueClassName }: { layout: "side" | "sum" | "list"; label?: string; valueClassName?: string }) {
  if (layout === "side") return <SideRow label={label}>KCT</SideRow>;
  if (layout === "list") return <div><dt>{label}</dt><dd className={valueClassName}>KCT</dd></div>;
  return <div><span>{label}</span><span>KCT</span></div>;
}
