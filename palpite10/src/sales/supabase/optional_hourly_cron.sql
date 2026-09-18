-- =====================================================================
--  OPTIONAL — hourly follow-ups on the free plans.
--  Vercel Hobby runs cron jobs once a day. Supabase can call the same
--  endpoint every hour for free. Replace the two placeholders, then run
--  this file in the Supabase SQL Editor.
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobname) from cron.job where jobname in ('palpite10-followups');

select cron.schedule(
  'palpite10-followups',
  '7 * * * *',  -- minute 7 of every hour; the app itself respects 09:00–21:00 Brasília
  $$
  select net.http_get(
    url := 'https://YOUR-DOMAIN/api/cron/followups',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Check it:   select * from cron.job;
-- Remove it:  select cron.unschedule('palpite10-followups');
