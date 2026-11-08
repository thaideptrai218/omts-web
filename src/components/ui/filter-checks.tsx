"use client";
import { useEffect, useRef } from "react";
import { selectedValues, toggleSelection } from "@/shared/presentation/filter-selection";
import styles from "./filter-checks.module.css";
export function FilterChecks({label,options,value,onChange,disabled=false}:{label:string;options:readonly (readonly [string,string])[];value:string;onChange(value:string):void;disabled?:boolean}) {
 const all = useRef<HTMLInputElement>(null), values = selectedValues(value);
 useEffect(() => { if(all.current) all.current.indeterminate = value !== "" && value !== "-"; },[value]);
 return <fieldset className={styles.group} disabled={disabled}><legend>{label}</legend><label className={styles.all}><input ref={all} type="checkbox" checked={value === ""} onChange={()=>onChange(value === "" ? "-" : "")}/>Tất cả</label>{options.map(([key,text])=><label key={key}><input type="checkbox" checked={values === undefined || values.includes(key)} onChange={()=>onChange(toggleSelection(value,key,options.map(([id])=>id)))}/>{text}</label>)}</fieldset>;
}
