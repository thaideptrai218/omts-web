"use client";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import flowStyles from "./cultivation-flow.module.css";
import * as c from "./records-contracts";
import { EditorFrame, LaneChoices, harvestRepo } from "./records-shared";

/** Records one harvest trip: lanes, lanes finished, cage count, optional kg estimate and photos. */
export function HarvestForm({
  zoneId,
  raftId,
  data,
  onClose,
  onSaved,
}: {
  zoneId: string;
  raftId: string;
  data: z.infer<typeof c.harvestList>;
  onClose(): void;
  onSaved(): void;
}) {
  const [lanes, setLanes] = useState<number[]>([]);
  const [finished, setFinished] = useState<number[]>([]);
  const [cages, setCages] = useState("");
  const [kg, setKg] = useState("");
  const [error, setError] = useState<string>();
  const [photos, setPhotos] = useState<File[]>([]);
  const editor = useOperationEditor(onClose, !!lanes.length || !!cages || !!kg || !!photos.length);
  async function save() {
    const parsed = c.harvestValues.safeParse({
      laneNumbers: lanes,
      finishedLaneNumbers: finished,
      cageCount: Number(cages),
      estimatedKg: kg ? Number(kg) : null,
    });
    if (!parsed.success) {
      setError("Chọn làn thu hoạch, số lồng nguyên dương và sản lượng lớn hơn 0 nếu nhập.");
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
        `Ghi nhận ${cages} lồng từ làn ${lanes.join(", ")}${finished.length ? `; đã thu hết làn ${finished.join(", ")}` : ""}?`,
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
    <EditorFrame title="Ghi nhận chuyến thu hoạch" editor={editor} error={error}>
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
              lanes={data.lanes.filter((v) => v.canHarvest).map((v) => v.laneNumber)}
              values={lanes}
              onChange={(v) => {
                setLanes(v);
                setFinished((f) => f.filter((n) => v.includes(n)));
              }}
              label="Làn thu hoạch *"
            />
            <LaneChoices
              lanes={lanes}
              values={finished}
              onChange={setFinished}
              label="Làn đã thu hết hàu trong chuyến này"
            />
          </div>
          <div className={flowStyles.harvestFormSection}>
            <h3>Sản lượng và ảnh</h3>
            <Field
              label="Số lồng thu hoạch *"
              type="number"
              min={1}
              step={1}
              required
              value={cages}
              onChange={(e) => setCages(e.target.value)}
            />
            <Field
              label="Sản lượng ước tính (kg)"
              type="number"
              min="0.01"
              step="0.01"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
            />
            <p className={flowStyles.harvestHint}>
              Để trống sản lượng để quy đổi theo {data.averageKgPerCage.toLocaleString("vi-VN")} kg/lồng. Thời điểm thu
              hoạch được hệ thống ghi khi lưu.
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
