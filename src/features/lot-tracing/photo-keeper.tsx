"use client";
import { RecordPhotoPicker } from "@/features/cultivation-api/record-photo-picker";
import { photoProblem } from "./correction-draft";
import s from "./lot-tracing.module.css";

type Props = { existing: string[]; keep: string[]; files: File[]; max: number; min: number; disabled?: boolean; onChange(next: { keep: string[]; files: File[] }): void };

/** Chọn ảnh giữ lại và thêm ảnh mới. Ảnh bỏ chọn sẽ bị xóa khi lưu, nên có số đếm và lỗi nêu rõ. */
export function PhotoKeeper({ existing, keep, files, max, min, disabled, onChange }: Props) {
  const total = keep.length + files.length, problem = photoProblem(files);
  const toggle = (key: string) => onChange({ files, keep: keep.includes(key) ? keep.filter((k) => k !== key) : [...keep, key] });
  return (
    <fieldset className={s.field} disabled={disabled}>
      <legend>Ảnh ({total}/{max}{min ? `, tối thiểu ${min}` : ""})</legend>
      {existing.length > 0 && (
        <ul className={s.photoList}>
          {existing.map((key, index) => (
            <li key={key}><label className={s.check}><input type="checkbox" className="omts-check" checked={keep.includes(key)} onChange={() => toggle(key)} /><span>Giữ ảnh {index + 1}</span></label></li>
          ))}
        </ul>
      )}
      <RecordPhotoPicker label="Thêm ảnh mới" files={files} disabled={disabled} onChange={picked => onChange({ keep, files: picked })} />
      {problem && <p role="alert" className={s.error}>{problem}</p>}
      {total > max && <p role="alert" className={s.error}>Tối đa {max} ảnh.</p>}
      {total < min && <p role="alert" className={s.error}>Cần ít nhất {min} ảnh.</p>}
    </fieldset>
  );
}
