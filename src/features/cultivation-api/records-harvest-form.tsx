"use client";
import { useState } from "react";
import { z } from "zod";
import { useToast } from "@/components/ui/toast-provider";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { Button } from "@/components/ui/button";
import { RecordPhotoPicker } from "./record-photo-picker";
import { UnitField } from "@/components/form/number-fields";
import { HarvestLaneChoices } from "./harvest-lane-choices";
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
  const { notify } = useToast();
  const editor = useOperationEditor(onClose, !!lanes.length || !!cages || !!kg || !!photos.length);
  // Live hint: the kg the backend will store when the estimate is left blank.
  const cageNumber = Number(cages);
  const estimateHint =
    !kg && Number.isFinite(cageNumber) && cageNumber > 0
      ? `${cageNumber.toLocaleString("vi-VN")} lồng ≈ ${(cageNumber * data.averageKgPerCage).toLocaleString("vi-VN")} kg ước tính. `
      : "";
  async function save() {
    const parsed = c.harvestValues.safeParse({
      laneNumbers: lanes,
      finishedLaneNumbers: finished,
      cageCount: Number(cages),
      estimatedKg: kg ? Number(kg) : null,
    });
    if (!parsed.success) {
      setError("Chọn làn thu hoạch, số lồng lớn hơn 0 (được nhập 0,5) và kg ước tính lớn hơn 0 nếu nhập.");
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
    ) { notify({ tone: "success", title: "Đã ghi nhận chuyến thu hoạch." }); onSaved(); }
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
          <CollapsibleSection title="Làn thu hoạch" description="Các làn trong chuyến thu." columns={1}>
            <HarvestLaneChoices
              lanes={data.lanes}
              values={lanes}
              onChange={(v) => {
                setLanes(v);
                setFinished((f) => f.filter((n) => v.includes(n)));
              }}
              label="Làn thu hoạch *"
            />
            <div>
              <h4 className="mb-1 text-sm font-semibold">Xác nhận làn đã thu xong</h4>
              <p className={flowStyles.harvestHint}>
                {lanes.length
                  ? "Tích những làn không còn hàu để thu. Làn không tích sẽ vẫn ở trạng thái Đang thu hoạch sau khi lưu."
                  : "Chọn làn thu hoạch ở trên để hiện các ô xác nhận đã thu xong."}
              </p>
              {lanes.length > 0 && <LaneChoices
                lanes={lanes}
                values={finished}
                onChange={setFinished}
                label="Làn đã thu hết hàu trong chuyến này"
              />}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title="Số lượng và ảnh" description="Số lồng thu hoạch và ảnh ghi nhận." columns={1}>
            <UnitField
              key="harvest-cages"
              label="Số lồng thu hoạch *"
              unit="lồng"
              decimals={2}
              step={0.5}
              min={0.01}
              max={100000}
              required
              value={cages}
              onChange={setCages}
            />
            <UnitField
              key="harvest-estimated-kg"
              label={`Kg ước tính (để trống: hệ thống tính theo ${data.averageKgPerCage.toLocaleString("vi-VN")} kg/lồng)`}
              unit="kg ước tính"
              decimals={2}
              min={0.01}
              value={kg}
              onChange={setKg}
            />
            <p className={flowStyles.harvestHint}>
              {estimateHint}

            </p>
            <RecordPhotoPicker label="Ảnh chuyến thu hoạch (tối đa 10 ảnh JPEG/PNG, 10 MB/ảnh)" files={photos} onChange={setPhotos} />
          </CollapsibleSection>
        </fieldset>
          <div className={flowStyles.harvestFormFooter}>
            <Button key="discard-harvest" type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button><Button key="save-harvest" type="submit" disabled={editor.disabled}>Lưu</Button>
          </div>
      </form>
    </EditorFrame>
  );
}
