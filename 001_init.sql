create table admins(user_id uuid primary key references auth.users on delete cascade);
create table questions(id uuid primary key default gen_random_uuid(),level text not null default 'all' check(level in('all','p1','s1')),text text not null,created_at timestamptz default now());
create table progress(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users on delete cascade,kind text not null check(kind in('idea','iv')),data jsonb not null,created_at timestamptz default now());
alter table admins enable row level security;
alter table questions enable row level security;
alter table progress enable row level security;
create policy "own admin row" on admins for select to authenticated using(user_id=auth.uid());
create policy "read questions" on questions for select to authenticated using(true);
create policy "admin write questions" on questions for all to authenticated using(exists(select 1 from admins where user_id=auth.uid())) with check(exists(select 1 from admins where user_id=auth.uid()));
create policy "own progress" on progress for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
-- 註冊後，將你自己設為管理員（換成你嘅電郵）：
-- insert into admins select id from auth.users where email='你的電郵';
