import type { Dispatch, SetStateAction } from "react";
import { Field, Note } from "@/features/operations/ui";
import type { EmployeeFormValues } from "./employee-editor-model";
import type { EmployeeErrorProps } from "./employee-editor-fields";
import styles from "./employee-screen.module.css";
export function EmployeeAddressFields({values, setValues, errorProps}: {values: EmployeeFormValues; setValues: Dispatch<SetStateAction<EmployeeFormValues>>; errorProps: EmployeeErrorProps}) {
 return <>      <h3 className={styles.sectionTitle}>Địa chỉ và ghi chú</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["address", "Địa chỉ", 500],
          ["area", "Khu vực", 100],
          ["wardCommune", "Phường/Xã", 100],
        ].map(([key, label, max]) => (
          <Field
            key={key}
            label={String(label)}
            maxLength={Number(max)}
            {...errorProps(String(key))}
            value={values[key as "address" | "area" | "wardCommune"]}
            onChange={(event) => setValues({ ...values, [key]: event.target.value })}
          />
        ))}
      </div>
      <Note
        label="Thông tin khác"
        maxLength={1000}
        {...errorProps("otherInformation")}
        value={values.otherInformation}
        onChange={(event) => setValues({ ...values, otherInformation: event.target.value })}
      />
      <Note
        label="Ghi chú"
        maxLength={1000}
        {...errorProps("notes")}
        value={values.notes}
        onChange={(event) => setValues({ ...values, notes: event.target.value })}
      /></>;
}
