import { FilterChecks } from "@/components/ui/filter-checks";
import { Select } from "@/features/operations/ui";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import styles from "./employee-screen.module.css";
export function EmployeeDirectoryFilters({statusId, setStatusId, zoneId, setZoneId, setPage, zones}: { statusId: string; setStatusId(value:string):void; zoneId:string; setZoneId(value:string):void; setPage(value:number):void; zones:ApiRecord[] }) { return <>
            <FilterChecks
              label="Tình trạng làm việc"
              value={statusId}
              options={[
                ["401", "Đang làm việc"],
                ["402", "Đã nghỉ việc"],
              ]}
              onChange={(value) => {
                setStatusId(value);
                setPage(1);
              }}
            />
            <Select
              label="Vùng làm việc"
              value={zoneId}
              onChange={(event) => {
                setZoneId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả vùng</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {String(zone.code)} · {String(zone.name)}
                </option>
              ))}
            </Select></>; }
export function EmployeeDirectoryReset({ search, zoneId, statusId, setSearch, setStatusId, setZoneId, setPage }: {search:string; zoneId:string; statusId:string; setSearch(value:string):void; setStatusId(value:string):void; setZoneId(value:string):void; setPage(value:number):void}) { return (          <button
            type="button"
            className={styles.reset}
            disabled={!search && !zoneId && statusId === "401"}
            onClick={() => {
              setSearch("");
              setStatusId("401");
              setZoneId("");
              setPage(1);
            }}
          >
            Đặt lại
          </button>); }
