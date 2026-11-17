import type { DropdownProps } from "react-day-picker";
import { SelectBox } from "../select-box";

/** Month/year selectors shared by single-date and range calendars. */
export function CalendarDropdown(props: DropdownProps) {
  return <SelectBox aria-label={props["aria-label"]} value={props.value} onChange={props.onChange} disabled={props.disabled} name={props.name} className="omts-control">
    {props.options?.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
  </SelectBox>;
}
