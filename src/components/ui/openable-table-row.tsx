"use client";
import type { ComponentProps } from "react";
import styles from "./openable-table-row.module.css";
/** Pointer enhancement; keep a real detail button/link in a cell for keyboard and screen readers. */
export function OpenableTableRow({onOpen,disabled=false,className,children,...props}:Omit<ComponentProps<"tr">,"onClick">&{onOpen():void;disabled?:boolean}) {
 return <tr {...props} className={`${styles.row} ${className??""}`} data-disabled={disabled||undefined} onClick={event=>{
  if(disabled||event.defaultPrevented||event.button!==0)return;
  const target=event.target;
  if(target instanceof Element&&target.closest("button,a,input,select,textarea,label,summary,details,[role=button],[role=checkbox],[contenteditable]"))return;
  const selection=window.getSelection();
  if(selection?.type==="Range"&&selection.anchorNode&&event.currentTarget.contains(selection.anchorNode))return;
  onOpen();
 }}>{children}</tr>;
}
