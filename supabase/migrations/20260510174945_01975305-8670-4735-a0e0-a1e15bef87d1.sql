
create table public.master_resume (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.master_resume enable row level security;

create policy "public read" on public.master_resume for select using (true);
create policy "public insert" on public.master_resume for insert with check (true);
create policy "public update" on public.master_resume for update using (true) with check (true);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger master_resume_touch before update on public.master_resume
for each row execute function public.touch_updated_at();
