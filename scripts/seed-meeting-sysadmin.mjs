// Local QA only: the meeting backend supports SystemAdministrator; develop does not.
import { randomBytes, pbkdf2Sync } from "node:crypto";
import { spawnSync } from "node:child_process";
if (!process.argv.includes("--write-demo")) throw new Error("Requires --write-demo; isolated meeting database only.");
const salt = randomBytes(16), header = Buffer.alloc(13);
header[0] = 1; header.writeUInt32BE(2, 1); header.writeUInt32BE(100000, 5); header.writeUInt32BE(salt.length, 9);
const hash = Buffer.concat([header, salt, pbkdf2Sync("Demo@1234", salt, 100000, 32, "sha512")]).toString("base64");
const sql = `SET XACT_ABORT ON; SET NOCOUNT ON; SET QUOTED_IDENTIFIER ON; SET ANSI_NULLS ON; SET ANSI_WARNINGS ON; SET ANSI_PADDING ON; SET CONCAT_NULL_YIELDS_NULL ON; SET ARITHABORT ON; SET NUMERIC_ROUNDABORT OFF;
IF DB_NAME() <> 'OMTS_MEETING_20261106' THROW 51000, 'Unexpected database', 1;
IF EXISTS(SELECT 1 FROM Accounts WHERE Username='sysadmin' AND SubjectType<>'SystemAdministrator') THROW 51000, 'Conflicting account type', 1;
IF NOT EXISTS(SELECT 1 FROM Accounts WHERE Username='sysadmin')
INSERT INTO Accounts(Id,DisplayName,Username,PasswordHash,MustChangePassword,FailedLoginCount,SubjectType,StatusId,CreatedAt)
VALUES(NEWID(),N'Quản trị viên hệ thống','sysadmin','${hash}',0,0,'SystemAdministrator',301,SYSDATETIMEOFFSET());
SELECT Username,SubjectType,StatusId FROM Accounts WHERE Username='sysadmin';
${process.argv.includes("--test-fixture") ? `IF NOT EXISTS(SELECT 1 FROM Accounts WHERE Username='qa.admin.lockcheck.20261106') INSERT INTO Accounts(Id,DisplayName,Username,PasswordHash,MustChangePassword,FailedLoginCount,SubjectType,StatusId,CreatedAt) VALUES(NEWID(),N'QA kiểm tra khóa tài khoản','qa.admin.lockcheck.20261106','${hash}',0,0,'Staff',301,SYSDATETIMEOFFSET());` : ""}
GO
`;
const seeded = spawnSync("docker", ["exec", "-i", "omts-latest-qa-sqlserver-1", "sh", "-c", '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -d OMTS_MEETING_20261106 -i /dev/stdin'], { input: sql, encoding: "utf8" });
if (seeded.status !== 0) throw new Error(`Sysadmin seed failed: ${(seeded.stderr || seeded.stdout || seeded.error?.message || "unknown error").replaceAll(hash, "[redacted]")}`);
console.log(seeded.stdout.trim());
