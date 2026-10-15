-- -- Run this ONCE in Supabase SQL Editor to add WhatsApp reminder support.
-- -- Safe to run even if unsure which migrations you've already run (all
-- -- statements use IF NOT EXISTS / IF EXISTS guards).

-- -- Each student needs their own CallMeBot API key (see README) — WhatsApp's
-- -- free personal API requires every recipient to individually opt in.
-- alter table profiles add column if not exists whatsapp_number text;   -- e.g. "919876543210" (country code, no + or spaces)
-- alter table profiles add column if not exists whatsapp_apikey text;   -- from callmebot.com, one-time setup per student

-- -- Prevents spamming the same student every time the drift check runs —
-- -- only re-notify once per day per task.
-- alter table tasks add column if not exists last_notified_at date;
