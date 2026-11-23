"use client";
import { useCallback } from "react";
import { planHref } from "@/features/harvest-plans/plan-labels";
import { planRepository } from "@/features/harvest-plans/repository";
import { lotRepository } from "@/features/harvest-lots/repository";
import { LOT } from "@/features/harvest-lots/contracts";
import { nurseryService } from "@/features/nursery-api/service";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { attendanceAccess } from "@/features/attendance-today/attendance-today-model";
import { readAttendanceToday, type TodaySnapshot } from "@/features/attendance-today/attendance-today-service";
import { waterHistorySchema } from "@/features/operations/contracts";
import { waterRepository } from "@/features/operations/water-measurement-shared";
import { businessToday, useRemote } from "@/features/operations/ui";
import { viDateTime } from "@/features/purchase-documents/document-parts";
import { HomeBlock } from "./home-block";
import { homeAttendance, nursingBatches, outsideWaterCount, plansToHarvest } from "./home-selection";
import { useZoneReads } from "./use-zone-reads";

const dayBefore = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** Người chưa vào làm hôm nay: cùng nguồn và cùng con số với màn "Chấm công hôm nay" (phân công + nhân viên nội bộ). */
export function AttendanceBlock() {
  const context = useApiWorkspace();
  const allowed = attendanceAccess(context.identity, context.permissions.functionPermissions);
  const today = businessToday();
  const remote = useRemote<TodaySnapshot>(useCallback((signal: AbortSignal) => readAttendanceToday(today, signal).catch(() => ({ status: "error" as const, httpStatus: 0, uncertain: false })), [today]));
  return <HomeBlock title="Chưa vào làm hôm nay" remote={remote} moreHref="/work/today" moreLabel="Chấm công" empty="Hôm nay chưa có ai cần chấm công."
    rows={(snapshot) => {
      const sum = homeAttendance(snapshot, today, allowed);
      return sum.total && !sum.waiting ? [{ key: "all", title: `Cả ${sum.total} người đã vào làm`, href: "/work/today" }]
        : sum.waiting ? [{ key: "waiting", title: `${sum.waiting}/${sum.total} người chưa vào làm`, detail: sum.names.join(", "), href: "/work/today" }] : [];
    }} />;
}

/** Kế hoạch thu hoạch Chủ HTX đã giao cho vùng của mình, còn bè để thu. */
export function AssignedPlansBlock() {
  const remote = useRemote(useCallback((signal: AbortSignal) => planRepository.assigned(signal), []));
  return <HomeBlock title="Kế hoạch thu hoạch được giao" remote={remote} moreHref="/farming/harvest-plans" empty="Chưa có kế hoạch nào được giao."
    rows={(plans) => plansToHarvest(plans).slice(0, 4).map((plan) => ({ key: plan.id, title: plan.code, detail: `Dự kiến ${viDateTime(plan.plannedAt)} · ${plan.lines.length} bè`, href: planHref(plan.code) }))} />;
}

/** Trang nhỏ nhất mà BFF nhận cho danh sách lô (15/30/50/100): chỉ cần `total`, không đọc dòng nào. pageSize "1" bị từ chối 400. */
const LOT_COUNT_PAGE_SIZE = "15";
const lotCounts = async (signal: AbortSignal) => {
  const [waiting, open] = await Promise.all([LOT.awaitingWeighing, LOT.open].map((id) => lotRepository.list({ statusId: String(id), page: "1", pageSize: LOT_COUNT_PAGE_SIZE }, signal)));
  if (waiting.status !== "success") return waiting;
  if (open.status !== "success") return open;
  return { status: "success" as const, data: { waiting: waiting.data.total, open: open.data.total } };
};
/** Lô thu hoạch chờ cân và lô đang mở (chưa đóng). */
export function OpenLotsBlock() {
  const remote = useRemote(lotCounts);
  return <HomeBlock title="Lô thu hoạch cần xử lý" remote={remote} moreHref="/farming/harvest-lots" empty="Không có lô nào đang chờ cân hay đang mở."
    rows={({ waiting, open }) => [
      ...(waiting ? [{ key: "waiting", title: `${waiting} lô chờ cân`, href: "/farming/harvest-lots" }] : []),
      ...(open ? [{ key: "open", title: `${open} lô đang mở`, detail: "Chưa đóng, cần cân hoặc chốt", href: "/farming/harvest-lots" }] : []),
    ]} />;
}

const readNursery = (zoneId: string, signal: AbortSignal) => nurseryService.list({ zoneId, status: "all", page: "1", pageSize: "100" }, signal);
/** Đợt ươm đang chạy, lâu ngày nhất trước. */
export function NurseryBlock() {
  const remote = useZoneReads(readNursery);
  return <HomeBlock title="Đợt ươm đang chạy" remote={remote} moreHref="/farming/nursery" empty="Không có đợt ươm nào đang chạy."
    rows={(zones) => nursingBatches(zones.flatMap((zone) => zone.items)).slice(0, 4).map((row) => ({ key: row.id, title: `${row.code} · ${row.zoneName}`, detail: `${row.daysNursing} ngày ươm${row.itemName ? ` · ${row.itemName}` : ""}`, href: "/farming/nursery" }))} />;
}

const readWater = (zoneId: string, signal: AbortSignal) => {
  const today = businessToday();
  return waterRepository.read("list", { zoneId, from: dayBefore(today), to: today, status: "Active", page: "1", pageSize: "100" }, waterHistorySchema, signal);
};
/** Số đo nước vượt ngưỡng trong hôm qua và hôm nay của các vùng đang chọn. */
export function WaterBlock() {
  const remote = useZoneReads(readWater);
  return <HomeBlock title="Cảnh báo chất lượng nước" remote={remote} moreHref="/operations/water" empty="Không có số đo vượt ngưỡng hôm qua và hôm nay."
    rows={(zones) => { const count = outsideWaterCount(zones.flatMap((zone) => zone.items)); return count ? [{ key: "water", title: `${count} số đo vượt ngưỡng`, detail: "Hôm qua và hôm nay", href: "/operations/water" }] : []; }} />;
}
