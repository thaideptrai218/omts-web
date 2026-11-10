"use client";
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { MAX_PHOTOS } from "./claim-contracts";
import { addPhotos } from "./claim-photo-rules";
import s from "./claims.module.css";

type Props = { files: readonly File[]; disabled?: boolean; onChange(files: File[]): void };

/** Chọn 1-10 ảnh JPEG/PNG (tối đa 10 MB mỗi ảnh) có xem trước và bỏ từng ảnh; ảnh không hợp lệ bị bỏ kèm lý do bằng tiếng Việt. */
export function ClaimPhotoPicker({ files, disabled, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null), hint = useId();
  const [problems, setProblems] = useState<string[]>([]);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = "";
    const result = addPhotos(files, chosen);
    setProblems(result.problems);
    if (result.files.length !== files.length) onChange(result.files);
  };
  const remove = (index: number) => { setProblems([]); onChange(files.filter((_, at) => at !== index)); };

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" disabled={disabled}>
      <legend className="mb-1.5 text-xs font-medium text-text-muted">Ảnh chụp (ít nhất 1, tối đa {MAX_PHOTOS} ảnh) *</legend>
      <input ref={input} type="file" accept="image/jpeg,image/png" multiple hidden aria-label="Chọn ảnh từ máy" aria-describedby={hint} onChange={pick} />
      {files.length > 0 && (
        <ul className={s.photos} aria-label="Ảnh đã chọn">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`} className={s.removable}>
              <span className={s.thumb}>
                {/* eslint-disable-next-line @next/next/no-img-element -- bản xem trước cục bộ (blob:) */}
                <img src={previews[index]} alt={`Ảnh ${index + 1}: ${file.name}`} />
              </span>
              <span className={s.name}>{file.name}</span>
              <Button variant="secondary" className="min-h-9 w-full px-2 text-xs" aria-label={`Bỏ ảnh ${file.name}`} onClick={() => remove(index)}>Bỏ ảnh</Button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" className="w-auto" disabled={disabled || files.length >= MAX_PHOTOS} onClick={() => input.current?.click()}>
        {files.length ? "Thêm ảnh" : "Chọn ảnh"}
      </Button>
      <p id={hint} className={s.muted} style={{ margin: ".5rem 0 0" }}>Ảnh JPEG hoặc PNG, mỗi ảnh tối đa 10 MB. Đã chọn {files.length}/{MAX_PHOTOS} ảnh.</p>
      {problems.length > 0 && <ul role="alert" className="mt-2 list-disc pl-5 text-sm text-danger">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>}
    </fieldset>
  );
}
