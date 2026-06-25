-- Reminders: a dedup stamp so the 5-min sweep pings each instance exactly once.
-- null  = no around-due-time reminder sent yet
-- value = reminder was delivered at this timestamp (sweep skips it from now on)
alter table public.task_instances
  add column if not exists reminder_sent_at timestamptz;

-- Backs the sweep query: "pending instances, not yet reminded, due around now".
-- Partial index = only the rows the sweep cares about, so it stays tiny.
create index if not exists task_instances_reminder_idx
  on public.task_instances (due_at)
  where status = 'pending' and reminder_sent_at is null;
