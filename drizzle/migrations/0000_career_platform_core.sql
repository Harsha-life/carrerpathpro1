-- ROLES ---------------------------------------------------------------
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- PROFILES ------------------------------------------------------------
create table public.profiles (
  id uuid primary key,
  email text,
  full_name text,
  education text,
  experience_years int not null default 0,
  interests text[] not null default '{}',
  target_role text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles for select to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));
create policy "insert own profile" on public.profiles for insert to authenticated
  with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- QUESTIONS -----------------------------------------------------------
create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('skill','aptitude','personality')),
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_index int,
  trait text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.assessment_questions to anon, authenticated;
grant insert, update, delete on public.assessment_questions to authenticated;
grant all on public.assessment_questions to service_role;
alter table public.assessment_questions enable row level security;

create policy "anyone reads active questions" on public.assessment_questions
  for select using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "admins manage questions" on public.assessment_questions
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ATTEMPTS ------------------------------------------------------------
create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text not null check (category in ('skill','aptitude','personality')),
  score numeric not null default 0,
  max_score numeric not null default 0,
  answers jsonb not null default '{}'::jsonb,
  traits jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now()
);
grant select, insert, delete on public.assessment_attempts to authenticated;
grant all on public.assessment_attempts to service_role;
alter table public.assessment_attempts enable row level security;

create policy "read own attempts" on public.assessment_attempts for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "insert own attempts" on public.assessment_attempts for insert to authenticated
  with check (auth.uid() = user_id);
create policy "delete own attempts" on public.assessment_attempts for delete to authenticated
  using (auth.uid() = user_id);

-- RECOMMENDATIONS -----------------------------------------------------
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  model text,
  summary text,
  careers jsonb not null default '[]'::jsonb,
  courses jsonb not null default '[]'::jsonb,
  jobs jsonb not null default '[]'::jsonb,
  skill_gaps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.recommendations to authenticated;
grant all on public.recommendations to service_role;
alter table public.recommendations enable row level security;

create policy "read own recommendations" on public.recommendations for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "insert own recommendations" on public.recommendations for insert to authenticated
  with check (auth.uid() = user_id);
create policy "delete own recommendations" on public.recommendations for delete to authenticated
  using (auth.uid() = user_id);

-- SEED QUESTIONS ------------------------------------------------------
insert into public.assessment_questions (category, prompt, options, correct_index, trait, sort_order) values
('skill','Which data structure gives O(1) average lookup by key?','["Array","Hash map","Linked list","Stack"]',1,'programming',1),
('skill','In SQL, which clause filters rows after aggregation?','["WHERE","GROUP BY","HAVING","ORDER BY"]',2,'data',2),
('skill','What does an API endpoint returning 401 indicate?','["Server error","Unauthorized","Not found","Created"]',1,'backend',3),
('skill','Which chart best shows the share of a whole?','["Line chart","Pie chart","Scatter plot","Histogram"]',1,'analytics',4),
('skill','Git command to combine another branch into yours?','["git clone","git merge","git init","git log"]',1,'tooling',5),
('skill','CSS property used to build a responsive grid layout?','["float","display: grid","position: absolute","z-index"]',1,'frontend',6),
('aptitude','Next number in the series: 2, 6, 12, 20, ?','["24","28","30","32"]',2,'numerical',1),
('aptitude','If all Bloops are Razzies and all Razzies are Lazzies, then all Bloops are:','["Lazzies","Not Lazzies","Only Razzies","Undetermined"]',0,'logical',2),
('aptitude','A train covers 180 km in 3 hours. Its average speed is:','["50 km/h","55 km/h","60 km/h","65 km/h"]',2,'numerical',3),
('aptitude','Which figure completes the pattern: circle, square, circle, square, ?','["Triangle","Circle","Square","Hexagon"]',1,'spatial',4),
('aptitude','Odd one out: 3, 5, 11, 14, 17','["5","11","14","17"]',2,'logical',5),
('aptitude','25% of 240 equals:','["48","60","70","80"]',1,'numerical',6),
('personality','I recharge by spending time around other people.','["Strongly disagree","Disagree","Neutral","Agree","Strongly agree"]',null,'extraversion',1),
('personality','I enjoy exploring abstract ideas and new concepts.','["Strongly disagree","Disagree","Neutral","Agree","Strongly agree"]',null,'openness',2),
('personality','I plan my work carefully before starting.','["Strongly disagree","Disagree","Neutral","Agree","Strongly agree"]',null,'conscientiousness',3),
('personality','I stay calm when deadlines get tight.','["Strongly disagree","Disagree","Neutral","Agree","Strongly agree"]',null,'resilience',4),
('personality','I prefer collaborating over working solo.','["Strongly disagree","Disagree","Neutral","Agree","Strongly agree"]',null,'teamwork',5),
('personality','I like taking the lead on group projects.','["Strongly disagree","Disagree","Neutral","Agree","Strongly agree"]',null,'leadership',6),
('personality','I pay close attention to small details.','["Strongly disagree","Disagree","Neutral","Agree","Strongly agree"]',null,'detail',7),
('personality','I adapt quickly when priorities change.','["Strongly disagree","Disagree","Neutral","Agree","Strongly agree"]',null,'adaptability',8);