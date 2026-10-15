-- Run this ONCE if you already ran migration_2_github_sync.sql (or schema.sql)
-- BEFORE this fix, and are seeing:
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- when syncing GitHub commits.
--
-- Cause: the original index was a PARTIAL unique index (`where commit_sha is
-- not null`), which Postgres won't match against a plain `ON CONFLICT (commit_sha)`
-- clause. Swapping to a normal unique index fixes it — NULLs are still allowed
-- to repeat under a plain unique index, so manual activity log rows are unaffected.
--
-- Safe to run even if you're not sure which version you have.

drop index if exists activity_logs_unique_commit;

create unique index if not exists activity_logs_unique_commit
  on activity_logs (commit_sha);
