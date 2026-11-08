/** Empty means every option; "-" means deliberately no options. */
export function selectedValues(value: string): string[] | undefined { return value === "" ? undefined : value === "-" ? [] : value.split("|"); }
export function matchesSelection(selection: string, value: string) { const values = selectedValues(selection); return values === undefined || values.includes(value); }
export function toggleSelection(value: string, option: string, all: readonly string[]) {
 const selected = new Set(selectedValues(value) ?? all);
 if (selected.has(option)) selected.delete(option); else selected.add(option);
 const next = all.filter(item => selected.has(item));
 return next.length === all.length ? "" : next.length ? next.join("|") : "-";
}
export function selectionQueries(base: Record<string,string|undefined>, selections: Record<string,string>) {
 let queries = [{...base}];
 for (const [key, selection] of Object.entries(selections)) {
  const values = selectedValues(selection);
  queries = queries.flatMap(query => { const next = {...query}; delete next[key]; return values === undefined ? [next] : values.map(value => ({...next,[key]:value})); });
 }
 return queries;
}
