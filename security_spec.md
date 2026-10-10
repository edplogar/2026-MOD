# Security Specification for MOD REPORT LOGAR (Hotel Lombok Garden)

## 1. Data Invariants
1. `users/{userId}`: User documents must maintain valid ID format, strict schema. Role elevation requires Super Admin privileges.
2. `reports/{reportId}`: Report documents must maintain valid ID, required hotel inspection fields (date, officerName, location, problem, followUpDept, status, priority), and cannot exceed size bounds.
3. `settings/{settingId}`: System settings (e.g. `settings/system`) can only be modified by Super Admin / authorized admin.
4. `audit_logs/{logId}`: Audit logs are append-only; cannot be updated or deleted by normal users to preserve audit integrity.

## 2. The Dirty Dozen Payloads
1. Attempt to inject a 10MB string into report location -> REJECTED (exceeds size limits).
2. Attempt to update another user's role to Super Admin without admin privileges -> REJECTED.
3. Attempt to delete system settings -> REJECTED.
4. Attempt to mutate immutable createdAt or auditLog fields -> REJECTED.
5. Attempt to create user with empty required fields -> REJECTED.
6. Attempt to inject arbitrary script tags into problem description -> REJECTED.
7. Attempt to perform blanket read without collection constraints -> REJECTED.
8. Attempt to tamper with audit logs by deleting records -> REJECTED.
9. Attempt to forge admin rights without authentic credential -> REJECTED.
10. Attempt to spoof document IDs with path injection / non-alphanumeric -> REJECTED.
11. Attempt to overwrite settings with invalid compression quality -> REJECTED.
12. Attempt to bypass catch-all root security -> REJECTED.
