-- 눈대중 마스터: Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run 하세요.

-- 1) 점수 테이블
create table public.scores (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nickname   text not null check (char_length(nickname) between 1 and 12),
  mode       text not null check (mode in ('r5', 'r10', 'daily')),
  day        date,
  score      int  not null,
  created_at timestamptz not null default now(),
  -- 만점(5라운드=500, 10라운드=1000)을 넘는 값은 DB가 거부
  check ((mode = 'r10' and score between 0 and 1000) or (mode <> 'r10' and score between 0 and 500)),
  -- 오늘의 도전만 날짜를 가진다
  check ((mode = 'daily' and day is not null) or (mode <> 'daily' and day is null))
);

-- 오늘의 도전은 사용자당 하루 1번만 등록
create unique index scores_one_daily on public.scores (user_id, day) where mode = 'daily';

-- 2) 행 단위 보안(RLS): 누구나 읽기, 로그인한 사용자는 "자기 점수만" 등록
alter table public.scores enable row level security;

create policy "scores readable by everyone"
  on public.scores for select using (true);

create policy "users insert own scores"
  on public.scores for insert to authenticated
  with check (user_id = auth.uid());

-- 수정/삭제 정책은 만들지 않음 → 점수를 고치거나 지울 수 없다

-- 3) 랭킹 뷰: 사용자별 모드별 최고 점수만, user_id 는 숨기고 "내 기록 여부"만 노출
create view public.leaderboard with (security_invoker = true) as
select nickname, mode, day, score, created_at, (user_id = auth.uid()) as mine
from (
  select distinct on (user_id, mode, day) *
  from public.scores
  order by user_id, mode, day, score desc
) best;

grant select on public.leaderboard to anon, authenticated;
