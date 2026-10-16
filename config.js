// Supabase 연결 설정.
// 아래 두 값을 비워 두면 로그인/랭킹 기능이 꺼지고 게임만 동작합니다.
//
// - url:     Supabase → Project Settings → API → Project URL
// - anonKey: 같은 화면의 "anon public" 키 (공개돼도 안전하도록 설계된 키)
//
// ⚠️ "service_role" 키는 절대 여기에 넣지 마세요. GitHub에 올라가면 DB가 뚫립니다.
window.SUPABASE_CONFIG = {
  url: "",
  anonKey: "",
};
