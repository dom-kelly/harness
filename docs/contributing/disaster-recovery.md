# Disaster recovery

Shipping fast is only safe when data can come back. Recovery is a last resort,
but it must exist and it must be tested.

## Requirements

- **Offsite backups.** Backups live with a different provider from production,
  so a provider outage or account loss does not take both.
- **Encrypted at rest**, with keys stored outside the production provider.
- **Automated schedule** with a recovery point objective (RPO) and recovery time
  objective (RTO) written below.
- **Restore drills.** A scheduled job restores a recent backup into a scratch
  environment and verifies it. An untested backup is not a backup.
- **Runbook.** The exact commands to restore to a point in time, kept here.

## This product

| Item              | Value                     |
| ----------------- | ------------------------- |
| Data stores       | _fill in_                 |
| Backup provider   | _fill in (not prod host)_ |
| Schedule          | _fill in_                 |
| RPO / RTO         | _fill in_                 |
| Last restore test | see the drill job output  |

## Runbook

_Fill in: how to list backups, stage a restore, verify it, and cut over. Note
what is intentionally not restored (caches, derived data)._
