
-- Profiles: child display info (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Friend',
  avatar text not null default 'cloud',
  reduced_motion boolean not null default false,
  large_text boolean not null default false,
  sound_on boolean not null default true,
  stars int not null default 0,
  level int not null default 1,
  streak int not null default 0,
  last_active_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile read" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup, derive display_name from metadata if present
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'Friend'),
    coalesce(new.raw_user_meta_data->>'avatar', 'cloud')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute procedure public.touch_updated_at();

-- Lesson progress per emotion/activity
create table public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity text not null, -- 'flashcards' | 'match' | 'camera' | 'scenario'
  emotion text not null,  -- emotion key
  attempts int not null default 0,
  correct int not null default 0,
  last_at timestamptz not null default now(),
  unique (user_id, activity, emotion)
);
alter table public.progress enable row level security;
create policy "own progress all" on public.progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index progress_user_idx on public.progress(user_id);

-- Journal entries
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  emotion text not null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.journal_entries enable row level security;
create policy "own journal all" on public.journal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index journal_user_idx on public.journal_entries(user_id, created_at desc);

-- Camera attempts (face-api.js results)
create table public.camera_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_emotion text not null,
  detected_emotion text,
  confidence numeric(4,3),
  matched boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.camera_attempts enable row level security;
create policy "own cam all" on public.camera_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index cam_user_idx on public.camera_attempts(user_id, created_at desc);
