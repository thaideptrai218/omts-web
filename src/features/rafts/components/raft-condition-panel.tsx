"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { VietnameseDateInput } from "@/components/form/vietnamese-date-input";
import {
  formatVietnameseDate,
  isDateOnly,
  vietnameseBusinessDate,
} from "@/shared/format/date-only";
import type { RaftConditionResult, RaftProfile } from "../domain/raft";
import type { RaftService } from "../services/raft-service";
import { RaftLaneMap } from "./raft-lane-map";

const controlStyles =
  "mt-2 min-h-12 w-full min-w-0 rounded-control border border-border-strong bg-surface px-3 text-text";
export function RaftConditionPanel({
  raft,
  service,
}: {
  raft: RaftProfile;
  service: RaftService;
}) {
  const [date, setDate] = useState(vietnameseBusinessDate());
  const [cycleId, setCycleId] = useState("");
  const [retry, setRetry] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    result?: RaftConditionResult;
    failed?: boolean;
  }>();
  const id = useId();
  const dateValid = isDateOnly(date);
  const key = JSON.stringify([raft.id, date, cycleId, retry]);
  useEffect(() => {
    if (!isDateOnly(date)) return;
    let active = true;
    void service
      .getCondition({ raftId: raft.id, date, cycleId: cycleId || null })
      .then((result) => {
        if (active) setSnapshot({ key, result });
      })
      .catch(() => {
        if (active) setSnapshot({ key, failed: true });
      });
    return () => {
      active = false;
    };
  }, [service, raft.id, date, cycleId, key]);
  const current = snapshot?.key === key ? snapshot : undefined;
  const condition =
    current?.result?.status === "loaded" ? current.result.condition : undefined;
  const version = raft.layouts.find(
    (layout) => layout.version === condition?.layoutVersion,
  );
  return (
    <section
      className="mt-7 border-t border-border pt-6"
      aria-label="Tình trạng làn nuôi"
    >
      <h3 className="text-lg font-semibold">Tình trạng làn nuôi</h3>
      <p className="mt-2 text-sm leading-6 text-text-muted">
        Xem từng đoạn tính từ mốc A. Chọn một đoạn để tra cứu sự kiện nguồn.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-date`} className="text-sm font-semibold">
            Ngày xem sơ đồ
          </label>
          <VietnameseDateInput
            id={`${id}-date`}
            value={date}
            onValueChange={(value) => {
              setDate(value);
              setCycleId("");
            }}
            className={controlStyles}
            calendarLabel="Chọn ngày xem sơ đồ"
            aria-invalid={!dateValid}
            aria-describedby={!dateValid ? `${id}-error` : undefined}
          />
        </div>
        <div>
          <label htmlFor={`${id}-cycle`} className="text-sm font-semibold">
            Chu kỳ
          </label>
          <select
            id={`${id}-cycle`}
            value={cycleId}
            onChange={(event) => {
              const value = event.target.value;
              setCycleId(value);
              const cycle = raft.cycles.find((cycle) => cycle.id === value);
              if (cycle) setDate(cycle.closedAt ?? vietnameseBusinessDate());
            }}
            className={controlStyles}
          >
            <option value="">Chu kỳ tại ngày đã chọn</option>
            {raft.cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.code} ({cycle.closedAt ? "đã đóng" : "đang mở"})
              </option>
            ))}
          </select>
        </div>
      </div>
      {!dateValid && (
        <p role="alert" id={`${id}-error`} className="mt-2 text-sm text-danger">
          Nhập ngày hợp lệ theo ngày/tháng/năm.
        </p>
      )}
      {dateValid && !current && (
        <div
          role="status"
          aria-label="Đang tải sơ đồ làn"
          className="mt-5 space-y-3"
        >
          {[1, 2, 3].map((lane) => (
            <div
              key={lane}
              className="h-20 rounded-control bg-surface-subtle motion-safe:animate-pulse"
            />
          ))}
        </div>
      )}
      {current?.failed && (
        <div role="alert" className="mt-4">
          <p>Chưa tải được sơ đồ. Vui lòng thử lại.</p>
          <Button
            className="mt-3 sm:w-auto"
            variant="secondary"
            onClick={() => setRetry((value) => value + 1)}
          >
            Tải lại sơ đồ
          </Button>
        </div>
      )}
      {current?.result && current.result.status !== "loaded" && (
        <p role="alert" className="mt-4 text-danger">
          {current.result.status === "forbidden"
            ? "Bạn không có quyền xem sơ đồ này."
            : "Không tìm thấy sơ đồ hoặc chu kỳ phù hợp. Hãy kiểm tra lựa chọn."}
        </p>
      )}
      {condition && (
        <>
          <div className="mt-5 rounded-control bg-surface-subtle p-4 text-sm leading-6">
            <p>
              {version
                ? `Sơ đồ phiên bản ${version.version}, có hiệu lực từ ${formatVietnameseDate(version.validFrom)}.`
                : "Chưa có sơ đồ có hiệu lực tại ngày đã chọn."}
            </p>
            <p>
              {condition.cycle
                ? `Đang xem chu kỳ ${condition.cycle.code}.`
                : "Chưa ghi nhận chu kỳ nuôi tại ngày đã chọn."}
            </p>
          </div>
          <RaftLaneMap key={key} lanes={condition.lanes} />
        </>
      )}
    </section>
  );
}
