"use client";
import { useState } from "react";
import { UnitField } from "@/components/form/number-fields";
import { Field } from "@/features/operations/ui";
import { composeRaftSize, parseRaftSize } from "./raft-size";

/**
 * Raft size as two inputs with units (Dài m, Rộng m) that write the backend text "10 m x 24 m".
 * A stored size that is not of that shape stays editable as free text with an "a m x b m" hint, so nothing is lost on edit.
 */
export function RaftSizeFields({ value, onChange, error }: { value: string; onChange(size: string): void; error?: string }) {
  const [free] = useState(() => !!value.trim() && !parseRaftSize(value));
  const initial = parseRaftSize(value);
  const [length, setLength] = useState(initial ? String(initial.length) : ""), [width, setWidth] = useState(initial ? String(initial.width) : "");
  if (free) return <div><Field label="Kích thước (dài m x rộng m) *" required maxLength={100} placeholder="Ví dụ: 10 m x 24 m" value={value} aria-invalid={!!error} onChange={event => onChange(event.target.value)} />
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}</div>;
  const update = (nextLength: string, nextWidth: string) => { setLength(nextLength); setWidth(nextWidth); onChange(composeRaftSize(nextLength, nextWidth)); };
  return <div className="grid gap-2"><div className="grid grid-cols-2 gap-3">
    <UnitField key="raft-length" label="Chiều dài *" unit="m" decimals={2} min={0.01} max={9999} required value={length} onChange={next => update(next, width)} />
    <UnitField key="raft-width" label="Chiều rộng *" unit="m" decimals={2} min={0.01} max={9999} required value={width} onChange={next => update(length, next)} />
  </div>{error && <p role="alert" className="text-xs text-danger">{error}</p>}</div>;
}
