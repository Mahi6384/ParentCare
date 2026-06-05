-- ============================================================
-- ParentCare — Full Database Schema
-- Run this in Supabase SQL Editor (once, top to bottom)
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('kid', 'parent');
create type task_type as enum ('walk', 'diet', 'medicine', 'sleep', 'exercise', 'custom');
create type proof_type as enum ('photo', 'none');
create type recurrence_type as enum ('daily', 'weekly', 'custom', 'once');
create type task_status as enum ('pending', 'in_progress', 'submitted', 'passed', 'flagged', 'failed', 'skipped');
create type fitness_level as enum ('sedentary', 'light', 'moderate', 'active');
create type meal_type as enum ('breakfast', 'lunch', 'dinner');
create type suggestion_status as enum ('pending', 'approved', 'dismissed');
create type notification_channel as enum ('push', 'whatsapp_voice', 'whatsapp_text', 'email', 'websocket');
create type notification_status as enum ('sent', 'failed', 'pending');
create type agent_loop_type as enum ('verification', 'exercise_coach', 'nudge', 'weekly_insight');
create type concern_severity as enum ('low', 'medium', 'high');

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Users (extends Supabase auth.users)
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null,
  name        text not null,
  phone       text,
  email       text,
  whatsapp_number text,
  timezone    text not null default 'Asia/Kolkata',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Families (links kid ↔ parent)
create table public.families (
  id            uuid primary key default uuid_generate_v4(),
  kid_id        uuid not null references public.users(id) on delete cascade,
  parent_id     uuid references public.users(id) on delete set null,
  invite_code   text not null unique default upper(substr(md5(random()::text), 1, 8)),
  agent_enabled boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Tasks (created by kid)
create table public.tasks (
  id              uuid primary key default uuid_generate_v4(),
  kid_id          uuid not null references public.users(id) on delete cascade,
  family_id       uuid not null references public.families(id) on delete cascade,
  title           text not null,
  type            task_type not null default 'custom',
  proof_type      proof_type not null default 'photo',
  recurrence      recurrence_type not null default 'daily',
  schedule_time   time,                        -- e.g. 08:00 for morning tasks
  note            text,                        -- personal message from kid to parent
  voice_note_url  text,                        -- optional voice message URL
  streak_goal     int not null default 7,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Task Instances (one per day per task)
create table public.task_instances (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  parent_id   uuid not null references public.users(id) on delete cascade,
  family_id   uuid not null references public.families(id) on delete cascade,
  due_at      timestamptz not null,
  status      task_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Submissions (photo proof from parent)
create table public.submissions (
  id               uuid primary key default uuid_generate_v4(),
  task_instance_id uuid not null references public.task_instances(id) on delete cascade,
  photo_url        text not null,
  submitted_at     timestamptz not null default now()
);

-- AI Results (from Verification Agent)
create table public.ai_results (
  id               uuid primary key default uuid_generate_v4(),
  submission_id    uuid not null references public.submissions(id) on delete cascade,
  result           task_status not null,        -- passed | failed | flagged
  confidence       float,                       -- 0.0 to 1.0
  reasoning        text not null,              -- Claude's explanation
  nutrition_json   jsonb,                       -- extracted nutrition data (diet tasks)
  medication_json  jsonb,                       -- extracted medication data (medicine tasks)
  context_used     jsonb,                       -- what history/context was passed to Claude
  created_at       timestamptz not null default now()
);

-- ============================================================
-- HEALTH PROFILE + COACHING
-- ============================================================

-- Health Profiles (filled via conversational onboarding)
create table public.health_profiles (
  id                   uuid primary key default uuid_generate_v4(),
  parent_id            uuid not null unique references public.users(id) on delete cascade,
  age                  int,
  conditions           text[] not null default '{}',   -- e.g. ['hypertension', 'knee_pain']
  restrictions         text[] not null default '{}',   -- e.g. ['no_running', 'no_jumping']
  fitness_level        fitness_level not null default 'sedentary',
  equipment            text[] not null default '{}',   -- e.g. ['dumbbells'] or []
  preferred_duration   int not null default 20,        -- minutes
  food_region          text not null default 'north_indian',
  language_preference  text not null default 'hinglish', -- hindi | english | hinglish
  updated_at           timestamptz not null default now()
);

-- Exercise Routines (generated per session by Exercise Coach Agent)
create table public.exercise_routines (
  id               uuid primary key default uuid_generate_v4(),
  task_instance_id uuid references public.task_instances(id) on delete set null,
  parent_id        uuid not null references public.users(id) on delete cascade,
  routine_json     jsonb not null,              -- full routine with all steps
  generated_at     timestamptz not null default now()
);

-- Exercise Steps (individual steps within a routine)
create table public.exercise_steps (
  id            uuid primary key default uuid_generate_v4(),
  routine_id    uuid not null references public.exercise_routines(id) on delete cascade,
  step_index    int not null,
  section       text not null default 'Main Set',
  name          text not null,
  reps          int,
  duration_sec  int,
  rest_sec      int,
  modification  text,                           -- condition-specific modification
  completed_at  timestamptz                     -- null = not done yet
);

-- ============================================================
-- MEAL PLANNING
-- ============================================================

-- Weekly Meal Plans
create table public.meal_plans (
  id              uuid primary key default uuid_generate_v4(),
  parent_id       uuid not null references public.users(id) on delete cascade,
  week_start_date date not null,
  plan_json       jsonb not null,               -- 7-day plan: { monday: { breakfast, lunch, dinner }, ... }
  generated_at    timestamptz not null default now(),
  unique(parent_id, week_start_date)
);

-- Meal Reminders
create table public.meal_reminders (
  id           uuid primary key default uuid_generate_v4(),
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  parent_id    uuid not null references public.users(id) on delete cascade,
  meal_type    meal_type not null,
  due_at       timestamptz not null,
  sent_at      timestamptz
);

-- ============================================================
-- AGENT
-- ============================================================

-- Agent Decisions (full audit log of every agent run)
create table public.agent_decisions (
  id            uuid primary key default uuid_generate_v4(),
  family_id     uuid not null references public.families(id) on delete cascade,
  parent_id     uuid not null references public.users(id) on delete cascade,
  loop_type     agent_loop_type not null,
  trigger_event text not null,                  -- what triggered this agent run
  tools_called  jsonb not null default '[]',    -- list of tools called in order
  reasoning     text,                           -- Claude's final reasoning
  actions_taken jsonb not null default '[]',    -- what actions were executed
  created_at    timestamptz not null default now()
);

-- Agent Notes (memory/observations about a parent)
create table public.agent_notes (
  id         uuid primary key default uuid_generate_v4(),
  parent_id  uuid not null references public.users(id) on delete cascade,
  note       text not null,
  created_at timestamptz not null default now()
);

-- Health Concerns (flagged by agent, shown to kid)
create table public.health_concerns (
  id           uuid primary key default uuid_generate_v4(),
  parent_id    uuid not null references public.users(id) on delete cascade,
  kid_id       uuid not null references public.users(id) on delete cascade,
  concern      text not null,
  severity     concern_severity not null default 'low',
  acknowledged boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Task Suggestions (agent drafts, kid approves)
create table public.task_suggestions (
  id         uuid primary key default uuid_generate_v4(),
  kid_id     uuid not null references public.users(id) on delete cascade,
  parent_id  uuid not null references public.users(id) on delete cascade,
  family_id  uuid not null references public.families(id) on delete cascade,
  title      text not null,
  reason     text not null,                     -- agent's reasoning for suggesting this
  status     suggestion_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

-- Push Subscriptions (Web Push / VAPID)
create table public.push_subscriptions (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  endpoint   text not null,
  keys_json  jsonb not null,                    -- { p256dh, auth }
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

-- Notifications Log
create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  channel    notification_channel not null,
  message    text not null,
  sent_at    timestamptz,
  status     notification_status not null default 'pending'
);

-- Snooze Log (for full-screen alerts)
create table public.snooze_log (
  id              uuid primary key default uuid_generate_v4(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  snoozed_at      timestamptz not null default now(),
  count           int not null default 1
);

-- ============================================================
-- GAMIFICATION
-- ============================================================

-- Streaks
create table public.streaks (
  id                      uuid primary key default uuid_generate_v4(),
  task_id                 uuid not null references public.tasks(id) on delete cascade,
  parent_id               uuid not null references public.users(id) on delete cascade,
  current_streak          int not null default 0,
  longest_streak          int not null default 0,
  freeze_used_this_week   boolean not null default false,
  updated_at              timestamptz not null default now(),
  unique(task_id, parent_id)
);

-- Audit Log (full Claude prompt/response for debugging)
create table public.audit_log (
  id              uuid primary key default uuid_generate_v4(),
  submission_id   uuid references public.submissions(id) on delete set null,
  claude_prompt   text not null,
  claude_response text not null,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- INDEXES (for common queries)
-- ============================================================

create index on public.task_instances (parent_id, status);
create index on public.task_instances (task_id, due_at);
create index on public.submissions (task_instance_id);
create index on public.ai_results (submission_id);
create index on public.agent_decisions (family_id, created_at desc);
create index on public.health_concerns (kid_id, acknowledged);
create index on public.task_suggestions (kid_id, status);
create index on public.notifications (user_id, status);
create index on public.streaks (parent_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- RLS ensures users can only access their own data at DB level.
-- Even if API code has a bug, the DB won't leak data.

alter table public.users enable row level security;
alter table public.families enable row level security;
alter table public.tasks enable row level security;
alter table public.task_instances enable row level security;
alter table public.submissions enable row level security;
alter table public.ai_results enable row level security;
alter table public.health_profiles enable row level security;
alter table public.exercise_routines enable row level security;
alter table public.exercise_steps enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_reminders enable row level security;
alter table public.agent_decisions enable row level security;
alter table public.agent_notes enable row level security;
alter table public.health_concerns enable row level security;
alter table public.task_suggestions enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.snooze_log enable row level security;
alter table public.streaks enable row level security;
alter table public.audit_log enable row level security;

-- Users: can only read/update own row
create policy "users: read own" on public.users
  for select using (auth.uid() = id);
create policy "users: update own" on public.users
  for update using (auth.uid() = id);
create policy "users: insert own" on public.users
  for insert with check (auth.uid() = id);

-- Families: kid or parent of that family
create policy "families: member access" on public.families
  for all using (auth.uid() = kid_id or auth.uid() = parent_id);

-- Tasks: kid who created OR parent in that family
create policy "tasks: kid owns" on public.tasks
  for all using (auth.uid() = kid_id);
create policy "tasks: parent reads" on public.tasks
  for select using (
    exists (
      select 1 from public.families f
      where f.id = tasks.family_id and f.parent_id = auth.uid()
    )
  );

-- Task Instances: parent it belongs to OR kid in the family
create policy "task_instances: parent access" on public.task_instances
  for all using (auth.uid() = parent_id);
create policy "task_instances: kid reads" on public.task_instances
  for select using (
    exists (
      select 1 from public.families f
      where f.id = task_instances.family_id and f.kid_id = auth.uid()
    )
  );

-- Submissions: parent who submitted OR kid in family
create policy "submissions: parent owns" on public.submissions
  for all using (
    exists (
      select 1 from public.task_instances ti
      where ti.id = submissions.task_instance_id and ti.parent_id = auth.uid()
    )
  );
create policy "submissions: kid reads" on public.submissions
  for select using (
    exists (
      select 1 from public.task_instances ti
      join public.families f on f.id = ti.family_id
      where ti.id = submissions.task_instance_id and f.kid_id = auth.uid()
    )
  );

-- Health Profiles: parent owns, kid in family can read
create policy "health_profiles: parent owns" on public.health_profiles
  for all using (auth.uid() = parent_id);
create policy "health_profiles: kid reads" on public.health_profiles
  for select using (
    exists (
      select 1 from public.families f
      where f.parent_id = health_profiles.parent_id and f.kid_id = auth.uid()
    )
  );

-- Health Concerns: kid in family can read/acknowledge
create policy "health_concerns: kid access" on public.health_concerns
  for all using (auth.uid() = kid_id);
create policy "health_concerns: parent reads" on public.health_concerns
  for select using (auth.uid() = parent_id);

-- Task Suggestions: kid can manage
create policy "task_suggestions: kid owns" on public.task_suggestions
  for all using (auth.uid() = kid_id);

-- Push Subscriptions: own only
create policy "push_subscriptions: own" on public.push_subscriptions
  for all using (auth.uid() = user_id);

-- Notifications: own only
create policy "notifications: own" on public.notifications
  for all using (auth.uid() = user_id);

-- Streaks: parent owns, kid reads
create policy "streaks: parent owns" on public.streaks
  for all using (auth.uid() = parent_id);
create policy "streaks: kid reads" on public.streaks
  for select using (
    exists (
      select 1 from public.tasks t
      join public.families f on f.id = t.family_id
      where t.id = streaks.task_id and f.kid_id = auth.uid()
    )
  );

-- Agent tables: accessible via service role only (backend bypasses RLS)
-- No client-side access needed for agent_decisions, audit_log, agent_notes
create policy "agent_decisions: kid reads own family" on public.agent_decisions
  for select using (
    exists (
      select 1 from public.families f
      where f.id = agent_decisions.family_id and f.kid_id = auth.uid()
    )
  );

-- ============================================================
-- FUNCTION: auto-create user profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, role, name, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'kid'),
    coalesce(new.raw_user_meta_data->>'name', 'User'),
    new.email
  );
  return new;
end;
$$;

-- Trigger: fires after every new Supabase auth signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ADDENDUM: policies added after initial migration
-- ============================================================

-- task_instances: kid INSERT (added Day 11)
-- Kids need to INSERT task_instances when the Edge Function is not used
-- (e.g. local dev). Separate policy because FOR SELECT != FOR INSERT in RLS.
create policy "task_instances: kid inserts" on public.task_instances
  for insert with check (
    exists (
      select 1 from public.families f
      where f.id = task_instances.family_id and f.kid_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE: photos bucket + policies (added Day 13)
-- Run these separately if the bucket doesn't exist yet:
--
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('photos', 'photos', false)
--   ON CONFLICT (id) DO NOTHING;
-- ============================================================

-- Storage path structure: photos/<parentId>/<instanceId>.jpg
-- The parentId as the first path segment is enforced by RLS below.
-- storage.foldername(name) returns text[] — index [1] is the first segment.

create policy "photos: parent upload"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "photos: parent read"
  on storage.objects for select
  using (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- upsert: true in SubmitForm triggers an UPDATE when the file already exists.
-- Without this policy the second upload for the same instance fails with RLS violation.
create policy "photos: parent update"
  on storage.objects for update
  using (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
