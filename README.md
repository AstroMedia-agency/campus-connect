# CampusConnect

A working prototype of your final-year project: **skill-matrix team formation +
DAG-based task/dependency tracking + activity telemetry + AI contribution
reports**, built with **Next.js + Supabase** instead of the MEAN stack — same
ideas, far less setup, and you can run all of it on your own laptop.

No deployment required. Everything runs locally with `npm run dev`, talking to
a free Supabase project for the database + auth.

---

## What's actually implemented

| Module from your abstract | How it's implemented here |
|---|---|
| Multi-attribute skill-matrix team formation | Greedy balanced-assignment algorithm in `lib/teamFormation.ts` |
| DAG task scheduling + timeline drift | Topological sort + critical path (longest path) in `lib/dag.ts` |
| Live activity telemetry | **Real GitHub commit sync** (`lib/github.ts`, `app/api/github-sync`) pulls actual commits by matching `github_username`, plus a manual "log session" form for non-code work |
| Real-time board updates | Supabase Realtime — task board and activity count update live across tabs the moment data changes, no page refresh needed |
| AI-driven domain extraction | `app/api/extract-skills` — reads a project description and suggests required skills (AI if you set a key, keyword-match fallback if not) |
| Candidate search/discovery | `/students` page — filter eligible students by skill domain and minimum level |
| AI report generation | `app/api/report/route.ts` — calls the Claude API if you provide a key, otherwise falls back to a rule-based summary so it still works with zero API cost |
| Academic gatekeeper (attendance/backlogs filter) | Built into `formTeams()` and the candidate search — students below 70% attendance or with backlogs are excluded automatically |
| Angular Kanban UI | Built in React/Next.js instead — a 3-column Kanban board with drift/critical-path highlighting |
| **Email deadline reminders** | `app/api/notify-drift`, `lib/email.ts` — sends a real email to a task's assignee (their signup email, no per-student setup) when it's overdue, via free Gmail SMTP. Auto-checked once per page load, plus a manual "Send reminders now" button |
| **Automatic GitHub checking** | The project page polls `/api/github-sync` every 90 seconds on its own while it's open — no need to keep clicking "Sync commits" |

**Still not built:** a VS Code IDE extension (GitHub commit sync + auto-polling is the practical substitute), a genetic-algorithm variant of team matching (greedy is used instead), and a true push-triggered GitHub webhook (the 90-second auto-poll is the substitute — a real webhook needs a public URL, see "How to check GitHub sync is really working" below for why).

---

## 1. Install prerequisites (one-time)

You need **Node.js 18 or later**. Check with:
```bash
node -v
```
If you don't have it, download from https://nodejs.org (LTS version).

---

## 2. Create your free Supabase project (one-time, ~3 minutes)

1. Go to https://supabase.com and sign up (free tier is enough).
2. Click **New project**. Pick any name/region, set a database password (save it somewhere).
3. Once it's created, go to **Project Settings → API**. You'll need three values:
   - `Project URL`
   - `anon public` key
   - `service_role` key (click "reveal" — keep this one secret, never share it)
4. Go to the **SQL Editor** (left sidebar) → **New query**.
5. Open `supabase/schema.sql` from this project, copy the whole file, paste it into the SQL editor, and click **Run**.
   This creates all the tables (profiles, projects, teams, tasks, task_dependencies, activity_logs, reports).

---

## 3. Configure the project

In the project folder, copy the example env file:
```bash
cp .env.example .env.local
```
Open `.env.local` and paste in the three Supabase values from step 2:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=
```
Leave `ANTHROPIC_API_KEY` blank if you don't have one — the AI report step will
still work, just using a simpler built-in summary instead of an LLM. If you do
want real LLM-written reports, get a key from https://console.anthropic.com
and paste it in.

---

## 4. Install and run

```bash
npm install
npm run dev
```
Open **http://localhost:3000** in your browser. That's it — no build, no deploy, no server to manage.

---

## 5. How to actually demo it

1. **Sign up** 4–8 times with different accounts (as different "students") — role = Student. On each account, go to **Profile** and set different skill levels (frontend/backend/design/etc), attendance, and backlogs, so the matching algorithm has something real to work with.
2. On any account, go to **Dashboard → New project**. Give it required skills like `frontend, backend, design` and a team size (e.g. 4).
3. Open the project → click **Run team formation**. Watch it auto-create balanced teams from the eligible student pool.
4. Inside a team, **add tasks** with durations and dependencies (e.g. "Design mockups" → "Build frontend" depends on it). The board will show which tasks sit on the **critical path** and flag any that are **drifting** (past their planned finish date and not done). Open the same project in two browser tabs and mark a task done in one — it updates live in the other tab with no refresh (Supabase Realtime).
5. Go to each student's **Profile** and set a real GitHub username (any public GitHub account works, including your own).
6. Back in the project, under **GitHub commit telemetry**, enter a public repo as `owner/repo` and click **Sync commits** — real commits by matching usernames become activity log entries automatically. Leave the page open and it'll auto-check again every 90 seconds on its own.
7. Set up **email reminders** — see the dedicated section below (one-time, for you as the app owner, not per-student). Then push a task's planned finish date into the past (or just wait) and click **Send reminders now**.
8. Try **Find candidates** in the nav bar — filter eligible students by skill domain and minimum level.
9. On **New project**, type a description and click **Suggest from description** to auto-fill required skills.
10. Click **Generate report** — it aggregates activity (manual + GitHub) and task completion into a written contribution report per student.

### If you already ran `schema.sql` before this update

Run these two files once in the Supabase SQL Editor, in order (safe to re-run, both use `if not exists` guards):
1. `supabase/migration_2_github_sync.sql`
2. `supabase/migration_4_email_reminders.sql`

Fresh installs don't need either — they're already folded into `schema.sql`.

---

## Email reminders — one-time setup for you (not per-student)

This uses **Gmail SMTP**, which is completely free and can send to any recipient immediately. We initially tried CallMeBot's free WhatsApp API, but it turned out to have a real limitation for this project: **CallMeBot's free WhatsApp bot requires every individual recipient to personally opt in first** (message a bot number, wait for a personal API key) — meaning every single student would need to do that setup themselves, and the bot has also been unreliable/at-capacity at times. Gmail SMTP has no such requirement: you set it up **once**, and it can already email every student by their signup address.

Do this once, as the app owner:
1. Go to your Google Account → **Security** → turn on **2-Step Verification** (required for the next step, if not already on).
2. Go to **myaccount.google.com/apppasswords**, sign in, and create a new app password — name it anything (e.g. "CampusConnect").
3. Google shows you a 16-character password (spaces don't matter). Copy it.
4. In `.env.local`, set:
   ```
   GMAIL_USER=youraddress@gmail.com
   GMAIL_APP_PASSWORD=the16characterpassword
   ```
5. Restart `npm run dev` so the new env vars load.

That's it — no student does anything. Every student's signup email is looked up automatically when a reminder is due.

**Note:** Gmail's free sending limit is about 500 emails/day — far more than a class project needs. Emails come from your own Gmail address, so they may land in some recipients' Promotions/spam tab the first time — worth mentioning if you demo this live.

---

## How to check GitHub sync is really working

There's no push-triggered webhook here — GitHub can't reach `localhost` on your laptop, since a webhook needs a public URL. Instead this app **polls**: it checks GitHub for new commits every 90 seconds automatically while the project page is open, plus you can force an immediate check with the **Sync commits** button.

To verify it's real (not just a UI animation), do any of these:
- **Push a real commit** to the synced repo, then either wait up to 90 seconds or click **Sync commits** — the message under the button will update with a timestamp and a commit count, and the "logged sessions" counter at the top of that panel will increase.
- **Check the database directly** — open Supabase → Table Editor → `activity_logs` → look for rows with `source = github` and a `commit_sha` filled in. Each one is a real commit, not a mock.
- **Check GitHub's own commit list** at `github.com/<owner>/<repo>/commits` and compare — the messages logged in `activity_logs` should match real commit messages from that page.

If you later deploy this (outside the scope of "no deployment," but worth knowing for your report): a real GitHub webhook could replace the polling entirely, firing the moment a commit is pushed instead of waiting up to 90 seconds. That's a good "future work" line for your presentation.

---

## Project invitations (accept before team formation)

Team formation no longer picks every eligible student automatically. Instead:

1. On a project page, **Invite candidates** lists eligible students (attendance ≥ 70%, no backlogs). Tick the ones you want and click **Send invitations**.
2. Each selected student gets an **email** (via the same Gmail setup as reminders) and an **in-app notification**: an **Invitations** link in the nav bar with a count badge.
3. The student opens **Invitations** and clicks **Accept** or **Decline**.
4. When every invited student has replied, teams are **formed automatically** from the students who accepted, using the same balancing algorithm, and appear on the project page live.
5. Don't want to wait for someone who never replies? Click **Form teams now (accepted only)**.

One-time setup: run `supabase/migration_5_project_invitations.sql` in the Supabase SQL Editor. Fresh installs get it from `schema.sql`.

Optional: after deploying, set `APP_URL=https://your-domain` in `.env.local` so the email link points to the live site (otherwise it uses the address the app is running on, e.g. http://localhost:3000).

---

## 6. Project structure

```
app/
  login/, signup/          → auth pages
  dashboard/                → project list + create
  profile/                  → skill matrix editor
  projects/[id]/             → team formation, Kanban/DAG board, activity log, report
  api/
    team-formation/          → runs the matching algorithm, persists teams
    tasks/                    → create tasks, GET returns scheduled+drift+critical path
    activity/                 → log/read activity sessions
    report/                   → aggregates data, calls AI (or fallback), saves report
lib/
  teamFormation.ts            → the skill-matrix matching algorithm
  dag.ts                       → topological sort, critical path, drift detection
  supabaseClient.ts            → browser Supabase client
  supabaseServer.ts            → server-side Supabase client (service role)
supabase/
  schema.sql                   → run this once in the Supabase SQL editor
```

---

## 7. What's actually left (for your report/viva)

Everything below is a genuine, honest gap — not implemented, not faked:

- **VS Code IDE extension** — no extension code exists. GitHub commit sync + 90-second auto-polling is the practical substitute, but it only sees *commits* (a save-and-push event), not continuous active-coding-time the way a real editor plugin would capture it.
- **Genetic algorithm for team matching** — `lib/teamFormation.ts` still uses greedy balanced-assignment. A genetic variant (selection/crossover/mutation over team splits) is a self-contained swap in that one file whenever you're ready to add it — nothing else in the app needs to change.
- **True push-triggered GitHub webhook** — commits are found by polling every 90 seconds, not by GitHub pushing an event to this app the instant a commit lands. A real webhook needs a public URL, which conflicts with running this with no deployment. If you deploy later, this is a natural upgrade.
- **Faculty view** — there's a `role = faculty` field on signup, but no dedicated faculty dashboard yet that lists every team's reports across the whole class without owning the project.

Everything else from the original abstract — skill-matrix matching, DAG/critical path/drift, the academic gatekeeper, AI report generation, domain extraction, candidate search, live UI updates, and now GitHub telemetry + email reminders — is real and working, not mocked.

---

## Troubleshooting

- **"Supabase env vars are missing" warning** → you haven't filled in `.env.local` yet.
- **Team formation says "no eligible students"** → check that student profiles have attendance ≥ 70% and 0 backlogs, and have set skill levels above 0.
- **Nothing happens when you click things** → open the browser console (F12) — API errors will show there and in your terminal running `npm run dev`.
- **Email reminder never arrives** → check your terminal running `npm run dev` for the actual error from `nodemailer` — the most common cause is using your normal Gmail password instead of an App Password, or 2-Step Verification not being turned on yet (it's required before Google will issue an App Password). Also check the recipient's Spam/Promotions folder.
- **"there is no unique or exclusion constraint..." on GitHub sync** → you're missing `supabase/migration_3_fix_commit_conflict.sql` — run it once in the SQL Editor.


Full build passed with zero errors before packaging. Here's what changed and what you need to do:

Setup (one-time, done by you — not per student)
Go to your Google Account → Security → turn on 2-Step Verification (required)
Go to myaccount.google.com/apppasswords → create a new app password (name it anything)
Copy the 16-character password it gives you
In .env.local, add:
   GMAIL_USER=youraddress@gmail.com
   GMAIL_APP_PASSWORD=the16characterpassword
Restart npm run dev

That's it. No student does anything — every student's signup email is already known to the app, so reminders just work.

If you already ran the database migrations before

Run supabase/migration_4_email_reminders.sql in the Supabase SQL Editor (this replaces the old WhatsApp migration file — same one-time step as before, just adds a column for "don't re-notify the same task twice in one day").