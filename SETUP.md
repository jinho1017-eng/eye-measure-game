# 로그인 + 랭킹 설정 가이드 (Supabase)

코드는 이미 들어 있습니다. 아래 순서로 Supabase를 만들고 키 2개만 `config.js`에 넣으면 켜집니다.
키를 넣기 전에는 로그인/랭킹 버튼이 숨겨지고 게임만 동작합니다.

## 1. 프로젝트 만들기
1. https://supabase.com → **Start your project** → GitHub로 가입
2. **New project** → 이름 `eye-measure-game`, 비밀번호 설정(따로 메모), Region은 `Northeast Asia (Seoul)`
3. 생성까지 1~2분 대기

## 2. 테이블 만들기
1. 왼쪽 메뉴 **SQL Editor → New query**
2. 이 저장소의 `supabase.sql` 내용을 전부 붙여넣고 **Run**
3. `Success` 가 나오면 완료 (점수 테이블, 보안 규칙, 랭킹 뷰가 만들어짐)

## 3. 키 2개를 `config.js`에 넣기
**Project Settings → API** 에서 복사합니다.
- `Project URL` → `url`
- `anon public` 키 → `anonKey`

> ⚠️ `service_role` 키는 절대 넣지 마세요. anon 키는 공개돼도 되도록 설계됐고, 실제 보호는 2번의 RLS 규칙이 합니다.

## 4. GitHub 로그인 켜기 (가장 쉬움)
1. GitHub → Settings → Developer settings → **OAuth Apps → New OAuth App**
   - Homepage URL: 배포한 게임 주소 (예: `https://eye-measure-game.vercel.app`)
   - Authorization callback URL: Supabase의 **Authentication → Providers → GitHub** 화면에 적힌 `Callback URL`
2. 만들면 나오는 **Client ID** 와 **Generate a new client secret** 값을 Supabase GitHub 설정에 붙여넣고 **Enable → Save**

## 5. Google 로그인 켜기 (선택, 단계가 더 많음)
1. https://console.cloud.google.com → 프로젝트 생성 → **APIs & Services → OAuth consent screen** 설정(External)
2. **Credentials → Create credentials → OAuth client ID → Web application**
   - Authorized redirect URIs: Supabase의 **Providers → Google** 화면에 적힌 `Callback URL`
3. 나온 Client ID / Client secret 을 Supabase Google 설정에 붙여넣고 **Enable → Save**

> Client secret 은 Supabase 대시보드에만 넣고, 코드나 GitHub에는 올리지 마세요.

## 6. 로그인 후 돌아올 주소 등록
Supabase **Authentication → URL Configuration**
- **Site URL**: 배포한 게임 주소
- **Redirect URLs**: 배포 주소와 테스트용 `http://localhost:5173/**` 추가

## 7. 확인
1. 게임을 열고 로그인 → 5라운드 플레이 → 결과 화면에서 **랭킹 등록**
2. 시작 화면의 **🏆 전체 랭킹** 에서 내 닉네임이 보이면 성공

## 알아둘 한계
- 점수는 브라우저에서 계산되어 서버로 전송되므로, 개발자 도구로 점수를 조작할 수 있습니다. DB가 만점 초과(500/1000)와 수정/삭제를 막지만, 만점 이하의 조작까지는 막지 못합니다. 친구들끼리 쓰는 규모에서는 충분하고, 엄격하게 막으려면 서버(Edge Function)에서 점수를 검증해야 합니다.
- 오늘의 도전은 사용자당 하루 1번만 등록됩니다.
