import { z } from "zod";
import { formatMessage } from "@/shared/messages/message-catalog";
import { employeeBusinessDate, employeeDateOnlySchema } from "./employee-date-only";

export function createEmployeeEndDateSchema(now: () => Date = () => new Date()) {
  return z.object({
    endDate: z.string().refine((date) => employeeDateOnlySchema.safeParse(date).success &&
      date <= employeeBusinessDate(now()), formatMessage({ code: "MSG01" })),
  });
}
