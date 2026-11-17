# Farming UI polish — 12/11/2026

Implemented against the owner's A–H request. No browser, build, dependencies, Git mutations, backend changes, payroll changes, or harvest-owned file changes.

| Item | Status | Delivered / limits |
| --- | --- | --- |
| A | Done in code | Floating dialog-aware top-layer calendar, viewport positioning/flipping, masked date input, Vietnamese validation, SelectBox month/year and time controls, weekday abbreviations, today/selection/disabled states, footer controls, keyboard handling and focus return. Removed inlineCalendar dependencies. Existing component tests adapted, not executed. |
| B | Partial across modules | Employee create/edit audited against backend validators; shared numeric domestic phone rule, CCCD, bank constraints, length limits, dates no later than today, username rules. Account management adopts phone helper. Supplier/customer audited but unchanged under explicit sales/purchase exclusion. Backend defines no lower birthday/start-date boundary; none invented. |
| C | Done in code | Empty-zone/no-available-raft actions; reordered detail tabs; journey navigation and related screen links retain raft/cycle; start button moved to header. |
| D | Done in code | Grouped raft form; two-column dimensions, calculated area, collapsed map and per-lane length table, compact lane preview. |
| E | Partial across ownership boundary | Shared range compression/parser and numbered overview with search, state chips/counts, compressed summaries and one detail panel. Applied to raft, cycle progress, seeding, completion/close and journey summaries. Harvest-owned lists intentionally unchanged. |
| F | Done in code | Select all unseeded, clear, range input, Shift-click, count and selected range. Backend-permitted NotSeeded shown by default; Growing revealed with supplement toggle. Default seed quantity unit is mảnh; lot catalogue unit retained when supplied. |
| G | Done in code | Menu/global strip already follow requested order; checked source. Added scoped step bar to shared raft record panel (including harvest wrapper), and next-step toast links after seeding/material saves. No harvest form/panel changes. |
| H | Done for active requested flows | Shared Vietnamese ImageFileInput for raft, incident and care-log photos; RecordPhotoPicker wraps it so existing harvest consumers inherit it. Native file picker language remains controlled by the OS. Unreferenced legacy farming-api/raft-screen.tsx file input left outside requested files. |

## Main files

- Calendar: `src/components/ui/management-screen/date-picker-field.tsx`, `date-picker-field.module.css`, `date-picker-input-model.ts`, `time-range-filter.tsx`, `time-range-filter.module.css`; date-picker/time-range/operations date adapter tests adapted. `src/features/operations/ui.tsx`, `src/features/labor-api/job-types-rate-editor.tsx` callers updated.
- Employee: `src/features/employee-api/employee-create-fields.tsx`, `employee-inline-fields.tsx`, `employee-editor-fields.tsx`, `employee-editor-bank-fields.tsx`, `employee-editor-model.ts`, `employee-create-model.ts`, `employee-account-contract.ts`, `employee-create-account-fields.tsx`, `employee-account-issue-dialog.tsx`, `contracts.ts`; `src/features/employee-management/api/employee-update.schema.ts`, `schemas/employee-bank-schema.ts`.
- Accounts: `src/features/api-workspace/api-resource-editor-fields.tsx`, `api-resource-editor.tsx` (account-only phone behavior).
- Shared inputs: `src/components/form/phone-input-rules.ts`, `image-file-input.tsx`.
- Shared farming: `src/features/farming-management/lane-ranges.ts`, `lane-overview.tsx`, `lane-overview.module.css`, `entity-links.ts`, `farming-step-bar.tsx`.
- Cycles: `src/features/cycles-api/raft-cycle-workspace.tsx`, `cycle-detail-panel.tsx`, `cycle-journey-model.ts`, `cycle-journey-tab.tsx`, `cycle-close-panel.tsx`, `cycle-editor.tsx`, `cycle-plan-tab.tsx`, `log-screen.tsx`. Cycle progress inherits the compact shared grid through LaneBoard.
- Rafts: `src/features/rafts-api/raft-create-dialog.tsx`, `raft-form-fields.tsx`, `raft-geometry-fields.tsx`, `raft-lane-diagram.tsx`, `raft-info-tab.tsx`, `lane-incidents-board.tsx`, `raft-photo-tab.tsx`, `lane-incident-form.tsx`.
- Cultivation shared/seeding/material: `src/features/cultivation-api/lane-board.tsx`, `seeding-lane-picker.tsx`, `records-seeding-form.tsx`, `records-seeding-panel.tsx`, `records-complete-seeding-dialog.tsx`, `records-raft-panel.tsx`, `records-material-form.tsx`, `records-materials-panel.tsx`, `record-photo-picker.tsx`.

## Validation

- Changed-file/folder ESLint: PASS (calendar, employee/account, raft/shared-lane, final root-owned changes).
- Exactly one `npx.cmd tsc --noEmit -p .`: PASS, exit 0. No errors ignored.
- Only individual pure-helper tests executed: date input 3/3; phone rule 3/3; lane ranges 3/3; entity links 2/2. Total 11/11.
- No test batches, component test execution, build, browser or dependency installation.
- Not visually verified: 360/1024 px layouts, calendar layering/positioning in actual dialogs, native browser keyboard/focus behavior, real API save/toast flows, and 50–100-lane visual density.

## Outstanding boundaries

- Supplier phone: `src/features/suppliers-api/supplier-form-dialog.tsx`; customer phone: `src/features/customers/customer-form-dialog.tsx`. Still use wider phone inputs; their owners must adopt the shared phone rule.
- Harvest-owned lane text/list replacements remain with the other agent; shared helper/component are ready for import.
- No unresolved business-rule question was resolved implicitly.
