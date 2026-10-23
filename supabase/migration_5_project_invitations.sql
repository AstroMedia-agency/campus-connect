-- Run this ONCE in Supabase SQL Editor to add project invitations.
-- Safe to re-run (uses "if not exists" / guarded statements).
--
-- Flow: the project owner selects eligible students -> each gets an invitation
-- (email + in-app notification) -> only students who ACCEPT are used when
-- teams are formed. Teams form automatically once every invited student has
-- responded, or manually with "Form teams now" on the project page.

create table if not exists project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  invited_by uuid references profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  team_id uuid references teams(id) on delete set null, -- filled when the student is placed in a team
  invited_at timestamptz default now(),
  responded_at timestamptz,
  unique (project_id, profile_id)
);

alter table project_invitations enable row level security;

-- Anyone logged in can read invitations (same open-read style as the rest of the demo).
-- All writes go through the API routes using the service role key, which checks
-- that only the invited student can accept/decline their own invitation.
drop policy if exists "allow all read" on project_invitations;
create policy "allow all read" on project_invitations for select using (true);

-- Live updates: the project page refreshes the moment a student accepts/declines.
do $$
begin
  alter publication supabase_realtime add table project_invitations;
exception
  when duplicate_object then null;
end $$;
