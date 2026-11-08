"use client";
import { GlobalZoneMap } from "./global-zone-map";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
export function RecordMap({resource}:{resource:string;record:ApiRecord}) {
 return resource === "zones" || resource === "rafts" ? <div className="mt-5"><GlobalZoneMap/></div> : null;
}
