"use client";
import { FilterGroup } from "@/components/ui/management-screen/management-layout";
import { PersonPicker, type PersonOption } from "@/components/ui/management-screen/person-picker";
import { SelectBox } from "@/components/ui/select-box";
import { toggleId } from "./end-of-day-filters-model";
import s from "./report-live.module.css";

export type MultiOption = Readonly<{ id: string; label: string }>;
type Source = Readonly<{ loading?: boolean; error?: string; reload?(): void }>;

function Pills({ legend, labels, selected, onChange }: Readonly<{ legend: string; labels: ReadonlyMap<string, string>; selected: readonly string[]; onChange(next: string[]): void }>) {
  return <div className={s.pills}>{selected.map((id) => <button key={id} type="button" className={s.pill} aria-label={`Bỏ lọc ${legend.toLocaleLowerCase("vi")} ${labels.get(id) ?? id}`} onClick={() => onChange(selected.filter((value) => value !== id))}>{labels.get(id) ?? "Đã chọn"} ×</button>)}</div>;
}

function SourceNote({ source }: Readonly<{ source: Source }>) {
  if (source.loading) return <p className={s.muted} role="status">Đang tải danh sách...</p>;
  return source.error ? <p className={s.error} role="alert">Chưa tải được danh sách. {source.reload && <button type="button" className={s.linkButton} onClick={source.reload}>Tải lại</button>}</p> : null;
}

/** Chọn nhiều đối tượng từ một danh sách dài (khách hàng, sản phẩm, nhóm hàng, loại thu chi): ô chọn thêm và các nhãn bấm để bỏ. */
export function MultiSelectFilter({ legend, allLabel, selected, options, source, onChange }: Readonly<{ legend: string; allLabel: string; selected: readonly string[]; options: readonly MultiOption[]; source: Source; onChange(next: string[]): void }>) {
  const labels = new Map(options.map((option) => [option.id, option.label]));
  return (
    <FilterGroup legend={legend}>
      <SelectBox aria-label={`Thêm ${legend.toLocaleLowerCase("vi")} vào bộ lọc`} className="omts-control" value="" disabled={source.loading} searchable onChange={(event) => { if (event.target.value) onChange(toggleId(selected, event.target.value)); }}>
        <option value="">{selected.length ? "Chọn thêm" : allLabel}</option>
        {options.filter((option) => !selected.includes(option.id)).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </SelectBox>
      <Pills legend={legend} labels={labels} selected={selected} onChange={onChange} />
      <SourceNote source={source} />
    </FilterGroup>
  );
}

/** Chọn nhiều người bằng PersonPicker: chọn một người để thêm vào bộ lọc, nhãn bấm để bỏ. */
export function PeopleFilter({ legend, people, selected, source, onChange }: Readonly<{ legend: string; people: readonly PersonOption[]; selected: readonly string[]; source: Source; onChange(next: string[]): void }>) {
  const labels = new Map(people.map((person) => [person.id, person.name]));
  return (
    <FilterGroup legend={legend}>
      <PersonPicker label={legend} people={people.filter((person) => !selected.includes(person.id))} value="" placeholder={selected.length ? "Chọn thêm" : "Tất cả"} disabled={source.loading || !!source.error} onChange={(id) => onChange(toggleId(selected, id))} />
      <Pills legend={legend} labels={labels} selected={selected} onChange={onChange} />
      <SourceNote source={source} />
    </FilterGroup>
  );
}

/** Nhóm nút bật/tắt cho tập lựa chọn ngắn cố định (phương thức thanh toán, kênh bán...); không bật nút nào = tất cả. */
export function TogglePills({ legend, options, selected, onChange }: Readonly<{ legend: string; options: readonly (readonly [string, string])[]; selected: readonly string[]; onChange(next: string[]): void }>) {
  return (
    <FilterGroup legend={legend}>
      <div className={s.pills}>{options.map(([id, label]) => <button key={id} type="button" className={s.pill} aria-pressed={selected.includes(id)} onClick={() => onChange(toggleId(selected, id))}>{label}</button>)}</div>
    </FilterGroup>
  );
}
