-- CampusConnect schema
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> paste -> Run

-- 1. Profiles (extends Supabase auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'student' check (role in ('student', 'faculty')),
  reg_no text,
  skills jsonb not null default '{}',        -- e.g. {"frontend": 4, "backend": 2, "ml": 0}
  weekly_hours int not null default 10,
  attendance_pct numeric not null default 100,
  backlogs int not null default 0,
  github_username text,
  created_at timestamptz default now()
);

-- 2. Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  required_skills jsonb not null default '[]', -- e.g. ["frontend","backend","design"]
  team_size int not null default 4,
  created_by uuid references profiles(id),
  start_date date not null default current_date,
  created_at timestamptz default now()
);

-- 3. Teams (one project can have multiple teams if run across a whole class)
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  github_repo text, -- format: "owner/repo", used for commit telemetry sync
  created_at timestamptz default now()
);

create table if not exists team_members (
  team_id uuid references teams(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  primary key (team_id, profile_id)
);

-- 4. Tasks (DAG nodes)
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  title text not null,
  duration_days int not null default 1,
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  last_notified_at date,
  assigned_to uuid references profiles(id),
  planned_start date,
  planned_finish date,
  actual_finish date,
  created_at timestamptz default now()
);

create table if not exists task_dependencies (
  task_id uuid references tasks(id) on delete cascade,
  depends_on_task_id uuid references tasks(id) on delete cascade,
  primary key (task_id, depends_on_task_id)
);

-- 5. Activity log (telemetry — commits / active coding sessions)
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual','github')),
  description text,
  minutes_active int not null default 0,
  commit_sha text,
  occurred_at timestamptz default now()
);

create unique index if not exists activity_logs_unique_commit
  on activity_logs (commit_sha);

-- 6. AI-generated contribution reports
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  content text not null,
  generated_at timestamptz default now()
);

-- Row Level Security — kept permissive for a local student demo.
-- Tighten these before using with real student data.
alter table profiles enable row level security;
alter table projects enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table tasks enable row level security;
alter table task_dependencies enable row level security;
alter table activity_logs enable row level security;
alter table reports enable row level security;

create policy "allow all read" on profiles for select using (true);
create policy "allow self insert/update" on profiles for insert with check (auth.uid() = id);
create policy "allow self update" on profiles for update using (auth.uid() = id);

create policy "allow all read" on projects for select using (true);
create policy "allow authenticated insert" on projects for insert with check (auth.uid() is not null);

create policy "allow all read" on teams for select using (true);
create policy "allow authenticated insert" on teams for insert with check (auth.uid() is not null);

create policy "allow all read" on team_members for select using (true);
create policy "allow authenticated insert" on team_members for insert with check (auth.uid() is not null);

create policy "allow all read" on tasks for select using (true);
create policy "allow authenticated insert" on tasks for insert with check (auth.uid() is not null);
create policy "allow authenticated update" on tasks for update using (auth.uid() is not null);

create policy "allow all read" on task_dependencies for select using (true);
create policy "allow authenticated insert" on task_dependencies for insert with check (auth.uid() is not null);

create policy "allow all read" on activity_logs for select using (true);
create policy "allow authenticated insert" on activity_logs for insert with check (auth.uid() is not null);

create policy "allow all read" on reports for select using (true);
create policy "allow authenticated insert" on reports for insert with check (auth.uid() is not null);

-- Enable Supabase Realtime so the task board and activity feed update live
-- across browser tabs without a custom WebSocket server.
alter publication supabase_realtime add table activity_logs;
alter publication supabase_realtime add table tasks;
