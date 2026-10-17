# OMTS-186 — D5.3 Route and UI report

## Route and access

- Production route: `/employees`.
- Provisional frontend capability: `cooperative.employees.manage`.
- Mock Owner receives the capability; other accounts do not gain it implicitly.
- The route has skeleton loading, load error/retry and MSG02 permission-denied states.

## User flow

The page shows summary counts, search by name/phone, compact employee cards and a grouped form. Required fields are full name, phone and status; the remaining SCR-08 fields are optional. A new profile displays the fixed initial status “Đang làm việc”. Editing allows the two confirmed statuses.

The account picker explains that linking does not grant permissions. Duplicate and MSG24 responses focus the responsible field and provide “Mở hồ sơ hiện có”. Successful saves use a global toast so feedback survives editor remount.

Changing to Left opens a reminder to review locking in UC11. Changing back to Employed opens a reminder to review unlocking or grants. Both reminders can be deferred and neither performs an account mutation.
