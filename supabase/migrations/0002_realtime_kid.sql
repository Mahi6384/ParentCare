-- ============================================================
-- 0002_realtime_kid — enable Supabase Realtime for the kid dashboard
-- ============================================================
-- The kid dashboard subscribes (via @supabase/ssr browser client) to:
--   • notifications  INSERT  (user_id = kid)     → live "Saathi" toast
--   • task_instances UPDATE  (parent_id)         → live verification feed
--
-- Realtime only streams tables that belong to the `supabase_realtime`
-- publication, so we add them here. Guarded so re-running is safe.
--
-- task_instances also needs REPLICA IDENTITY FULL: our UPDATE filter is on
-- parent_id, a non-primary-key column. Without FULL replica identity, the
-- old/changed-row image sent to Realtime may not carry parent_id, so the
-- server-side filter can't match. FULL makes Postgres emit the whole row.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_instances'
  ) then
    alter publication supabase_realtime add table public.task_instances;
  end if;
end $$;

alter table public.task_instances replica identity full;
