-- Run this ONCE in Supabase SQL Editor if you already ran schema.sql before.
-- Adds: per-team GitHub repo field, and a commit_sha column on activity_logs
-- so re-syncing never inserts the same commit twice.

alter table teams add column if not exists github_repo text; -- format: "owner/repo"
alter table activity_logs add column if not exists commit_sha text;

create unique index if not exists activity_logs_unique_commit
  on activity_logs (commit_sha);

-- Enable Realtime on these tables (safe to re-run; errors if already added are fine to ignore)
alter publication supabase_realtime add table activity_logs;
alter publication supabase_realtime add table tasks;
