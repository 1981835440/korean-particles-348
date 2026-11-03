-- 韩语助词 348 题 · 云端同步表结构
-- 用法：Supabase 控制台 → SQL Editor → 粘贴全文 → Run（可重复执行，不会重复建表）

create table if not exists public.attempts (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  q_no       integer     not null check (q_no between 1 and 500),
  answer     text        not null default '',
  is_right   boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, q_no)
);

create index if not exists attempts_user_idx on public.attempts (user_id);

-- 行级安全：任何人只能读写自己的记录（前端只拿 anon key，靠这条兜底）
alter table public.attempts enable row level security;

drop policy if exists "own rows: select" on public.attempts;
create policy "own rows: select" on public.attempts
  for select using (auth.uid() = user_id);

drop policy if exists "own rows: insert" on public.attempts;
create policy "own rows: insert" on public.attempts
  for insert with check (auth.uid() = user_id);

drop policy if exists "own rows: update" on public.attempts;
create policy "own rows: update" on public.attempts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows: delete" on public.attempts;
create policy "own rows: delete" on public.attempts
  for delete using (auth.uid() = user_id);

-- 错题本视图（可选，方便在控制台直接看自己的错题）
create or replace view public.wrong_book
with (security_invoker = true) as
select user_id, q_no, answer, updated_at
from public.attempts
where is_right = false;
