-- Run this ONCE in Supabase SQL Editor to add deadline reminder support.
-- Safe to run even if unsure which migrations you've already run.

-- Prevents spamming the same student every time the drift check runs —
-- only re-notify once per day per task.
alter table tasks add column if not exists last_notified_at date;

-- If you ran an earlier version of this project that used WhatsApp/CallMeBot
-- reminders, these columns are no longer used and can be dropped (optional —
-- leaving them is harmless, they're just unused):
-- alter table profiles drop column if exists whatsapp_number;
-- alter table profiles drop column if exists whatsapp_apikey;
