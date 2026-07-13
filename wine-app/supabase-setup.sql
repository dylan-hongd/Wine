-- =====================================================================
--  Dylan's Wine Cellar · Supabase 초기 설정 SQL
--  Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 "Run" 하세요.
--  (여러 번 실행해도 안전하도록 작성돼 있습니다.)
-- =====================================================================

-- 1) 와인 테이블 : 한 병 = 한 행. 상세 데이터는 jsonb(data)에 통째로 저장.
create table if not exists public.wines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 조회 속도용 인덱스
create index if not exists wines_user_id_idx  on public.wines(user_id);
create index if not exists wines_created_idx  on public.wines(user_id, created_at);

-- 2) updated_at 자동 갱신 트리거
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists wines_touch_updated_at on public.wines;
create trigger wines_touch_updated_at
  before update on public.wines
  for each row execute function public.touch_updated_at();

-- 3) Row Level Security : 각 사용자는 '자기 행'만 읽고/쓰게.
alter table public.wines enable row level security;

drop policy if exists "wines_select_own" on public.wines;
create policy "wines_select_own" on public.wines
  for select using (auth.uid() = user_id);

drop policy if exists "wines_insert_own" on public.wines;
create policy "wines_insert_own" on public.wines
  for insert with check (auth.uid() = user_id);

drop policy if exists "wines_update_own" on public.wines;
create policy "wines_update_own" on public.wines
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "wines_delete_own" on public.wines;
create policy "wines_delete_own" on public.wines
  for delete using (auth.uid() = user_id);

-- =====================================================================
--  [초대 전용 운영 안내]  * SQL 아님, 대시보드에서 설정 *
--  Authentication → Providers → Email : "Enable Email" 켜고,
--  Authentication → Sign In / Providers 하단(또는 Settings)의
--  "Allow new users to sign up" 은 OFF 로 두세요. (아무나 가입 차단)
--  사람을 추가할 때: Authentication → Users → "Add user / Invite" 로
--  이메일을 초대하면 그 사람만 비밀번호를 설정하고 로그인할 수 있습니다.
-- =====================================================================
