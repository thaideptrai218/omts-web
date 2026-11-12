"use client";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import type { HarvestPlanTarget } from "@/features/harvest-plans/plan-logic";
import { HarvestProductLines, blankLine, linesPayload, linesProblem, linesTotals, useHarvestProducts, type HarvestLine } from "./harvest-product-lines";
import flowStyles from "./cultivation-flow.module.css";
import * as c from "./records-contracts";
import { EditorFrame, LaneChoices, harvestRepo } from "./records-shared";

/**
 * Records one harvest trip: lanes, lanes finished, the product lines (product, cages, kg) and photos. With `plan` (a line of a harvest plan) the trip is
 * recorded from that line: the raft and the lanes still to harvest are fixed by the plan, the product line starts from what the line expects, and the line
 * id goes with the lot so the API ties it to the plan.
 */
export function HarvestForm({
  zoneId,
  raftId,
  data,
  plan,
  onClose,
  onSaved,
}: {
  zoneId: string;
  raftId: string;
  /** The raft's harvest screen data; a harvest from a plan line needs none, the plan fixes the lanes. */
  data?: z.infer<typeof c.harvestList>;
  plan?: Pick<HarvestPlanTarget, "lineId" | "planCode" | "laneNumbers" | "expectedProductId" | "expectedCageCount">;
  onClose(): void;
  onSaved(): void;
}) {
  const [lanes, setLanes] = useState<number[]>(() => plan?.laneNumbers ?? []);
  const [finished, setFinished] = useState<number[]>([]);
  const [lines, setLines] = useState<HarvestLine[]>(() => [plan?.expectedProductId ? { ...blankLine(), productId: plan.expectedProductId, cages: plan.expectedCageCount ? String(plan.expectedCageCount) : "" } : blankLine()]);
  const [started] = useState(() => JSON.stringify(lines.map((line) => [line.productId, line.cages])));
  const [error, setError] = useState<string>();
  const [photos, setPhotos] = useState<File[]>([]);
  const products = useHarvestProducts();
  const editor = useOperationEditor(onClose, plan ? !!finished.length || !!photos.length || JSON.stringify(lines.map((line) => [line.productId, line.cages])) !== started : !!lanes.length || lines.some((line) => line.productId || line.cages) || !!photos.length);
  async function save() {
    const problem = linesProblem(lines, true);
    if (problem) {
      setError(problem);
      return;
    }
    const totals = linesTotals(lines);
    // With product lines the lot's cages and kg are their sums; the API ignores the two totals sent here.
    const parsed = c.harvestValues.safeParse({
      laneNumbers: lanes,
      finishedLaneNumbers: finished,
      cageCount: totals.cages,
      estimatedKg: null,
      productLines: linesPayload(lines),
      ...(plan ? { harvestPlanLineId: plan.lineId } : {}),
    });
    if (!parsed.success) {
      setError("Chọn làn thu hoạch, sản phẩm với số lồng nguyên dương và số kg lớn hơn 0 nếu nhập.");
      return;
    }
    if (
      photos.length > 10 ||
      photos.some(
        (file) => !["image/jpeg", "image/png"].includes(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024,
      )
    ) {
      setError("Chọn tối đa 10 ảnh JPEG hoặc PNG, mỗi ảnh tối đa 10 MB.");
      return;
    }
    setError(undefined);
    if (
      await editor.submit(
        `Ghi nhận ${totals.cages} lồng từ làn ${lanes.join(", ")}${finished.length ? `; đã thu hết làn ${finished.join(", ")}` : ""}?`,
        () =>
          harvestRepo.upload(
            "harvest-record",
            photos,
            parsed.data,
            z.object({ lot: z.object({ id: z.guid(), lotCode: z.string() }) }),
            raftId,
            zoneId,
          ),
      )
    )
      onSaved();
  }
  return (
    <EditorFrame title={plan ? `Thu hoạch theo kế hoạch ${plan.planCode}` : "Ghi nhận chuyến thu hoạch"} editor={editor} error={error}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={editor.disabled} className={flowStyles.harvestFormGrid}>
          <div className={flowStyles.harvestFormSection}>
            <h3>Phạm vi thu hoạch</h3>
            <LaneChoices
              lanes={plan ? plan.laneNumbers : (data?.lanes ?? []).filter((v) => v.canHarvest).map((v) => v.laneNumber)}
              values={lanes}
              disabled={!!plan}
              onChange={(v) => {
                setLanes(v);
                setFinished((f) => f.filter((n) => v.includes(n)));
              }}
              label={plan ? `Làn thu hoạch theo kế hoạch ${plan.planCode} (cố định)` : "Làn thu hoạch *"}
            />
            <LaneChoices
              lanes={lanes}
              values={finished}
              onChange={setFinished}
              label="Làn đã thu hết hàu trong chuyến này"
            />
          </div>
          <div className={flowStyles.harvestFormSection}>
            <h3>Sản phẩm thu hoạch và ảnh</h3>
            <HarvestProductLines
              lines={lines}
              products={products.products}
              loading={products.loading}
              error={products.error}
              disabled={editor.disabled}
              onChange={setLines}
            />
            <p className={flowStyles.harvestHint}>
              Chia chuyến thu hoạch theo sản phẩm: số kg tự tính theo quy đổi Lồng của sản phẩm và sửa được. Thời điểm thu hoạch được hệ thống ghi khi lưu.
            </p>
            <Field
              label="Ảnh chuyến thu hoạch (tối đa 10 ảnh JPEG/PNG, 10 MB/ảnh)"
              type="file"
              multiple
              accept="image/jpeg,image/png"
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
            />
            {!!photos.length && (
              <ul className="text-sm">
                {photos.map((file, i) => (
                  <li key={i}>{file.name}</li>
                ))}
              </ul>
            )}
          </div>
          <div className={flowStyles.harvestFormFooter}>
            <Button type="submit">Lưu chuyến thu hoạch</Button>
          </div>
        </fieldset>
      </form>
    </EditorFrame>
  );
}
