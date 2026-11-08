# OMTS-186 — D5.2 Service and mock report

## Data boundary

The UI depends on `EmployeeManagementService`, which depends on `EmployeeManagementRepository`. The in-memory adapter and a future QA API adapter must return the same typed outcomes: loaded, saved, invalid input, duplicate employee, account already linked, forbidden and session expired.

The workspace returns only currently unlinked internal accounts. When editing, the UI adds the employee's own linked account back as the current option. This avoids offering an account owned by another profile while still allowing the current link to remain unchanged.

## Defensive checks

The mock revalidates at save time because picker data can become stale. It checks:

- mandatory name/phone/status;
- new profile starts as Employed;
- duplicate full name + phone returns MSG03 and the existing employee ID;
- unknown account returns MSG01;
- account linked to another employee returns MSG24 and that employee ID;
- a status transition produces an account follow-up without mutating Account.

Tests cover all of the above, including the race condition that happens after picker data was loaded.
