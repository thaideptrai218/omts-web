# OMTS-186 — D5.1 Scope and contract report

## Sources checked

- Jira [OMTS-186](https://welterial.atlassian.net/browse/OMTS-186): Web list/form, unlinked internal-account picker, Working/Left and lock prompt.
- Jira [OMTS-145](https://welterial.atlassian.net/browse/OMTS-145): UC10 acceptance criteria, duplicate behavior, optional account and history retention.
- Jira [OMTS-185](https://welterial.atlassian.net/browse/OMTS-185) and [OMTS-187](https://welterial.atlassian.net/browse/OMTS-187): backend/QA dependencies remain To Do.
- SRS UC10, E03 Employee, SCR-08, status catalog and MSG01/02/03/10/24.

## Confirmed model

`EmployeeProfile` contains full name, phone, optional account, birthday, address, area, ward/commune, other information, notes and status. `EmployeeAccountSummary` is only a reference to an internal login account. It intentionally contains no role, permission or zone because linking an account does not grant access.

New profiles start as `employed`; the only confirmed status values are `employed` and `left`. Both transitions are performed by the Cooperative Owner and require no reason in the SRS status-transition table.

## Source gaps not decided in code

- UC56/57 refer to restrictions “from the leaving date”, but E03 and SCR-08 do not define a leaving-date field.
- The SRS requires a valid phone format but does not choose a domestic/E.164 syntax.
- QA endpoint, DTO, audit payload and concurrency behavior are unavailable while OMTS-185 is To Do.

D5 therefore keeps these points explicit and does not add a mandatory field or regex without team approval.
