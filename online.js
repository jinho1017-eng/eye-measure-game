"use strict";

// 로그인 + 전체 랭킹 (Supabase). config.js 가 비어 있으면 아무것도 하지 않는다.
const Online = (() => {
  const cfg = window.SUPABASE_CONFIG || {};
  const enabled = !!(cfg.url && cfg.anonKey && window.supabase);
  const el = id => document.getElementById(id);
  const MODE_NAMES = { r5: "5라운드", r10: "10라운드", daily: "오늘의 도전" };

  let sb = null, user = null, last = null, boardMode = "r5";

  const today = () => {
    const t = new Date(), p = n => String(n).padStart(2, "0");
    return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
  };
  const savedNick = () => { try { return localStorage.getItem("eyeNick") || ""; } catch { return ""; } };
  const defaultNick = () => {
    const m = (user && user.user_metadata) || {};
    return (savedNick() || m.user_name || m.name || m.full_name || "").slice(0, 12);
  };

  function init() {
    if (!enabled) return;
    sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    el("btnBoard").classList.remove("hidden");
    el("authBox").classList.remove("hidden");
    el("btnLoginGithub").onclick = () => login("github");
    el("btnLoginGoogle").onclick = () => login("google");
    el("btnLogout").onclick = logout;
    el("btnBoard").onclick = () => { show("board"); loadBoard(boardMode); };
    el("btnBoardBack").onclick = () => show("start");
    el("btnRankSubmit").onclick = submit;
    for (const b of document.querySelectorAll("[data-board]")) b.onclick = () => loadBoard(b.dataset.board);
    sb.auth.getSession().then(({ data }) => setUser(data.session && data.session.user));
    sb.auth.onAuthStateChange((_e, s) => setUser(s && s.user));
  }

  function setUser(u) {
    user = u || null;
    el("btnLogout").classList.toggle("hidden", !user);
    el("btnLoginGithub").classList.toggle("hidden", !!user);
    el("btnLoginGoogle").classList.toggle("hidden", !!user);
    el("authName").textContent = user ? `👤 ${defaultNick() || "로그인됨"}` : "로그인하면 랭킹에 등록할 수 있어요";
    renderRankBox();
  }

  async function login(provider) {
    const { error } = await sb.auth.signInWithOAuth({
      provider, options: { redirectTo: location.origin + location.pathname },
    });
    if (error) el("authName").textContent = "로그인 실패: " + error.message;
  }
  async function logout() { await sb.auth.signOut(); }

  // 게임이 끝났을 때 game.js 가 호출
  function onFinish(result) {
    last = { ...result, sent: false };
    renderRankBox();
  }

  function renderRankBox() {
    const box = el("rankBox");
    if (!enabled || !last) { box.classList.add("hidden"); return; }
    box.classList.remove("hidden");
    const msg = el("rankMsg"), input = el("nickInput"), btn = el("btnRankSubmit");
    if (!user) {
      msg.textContent = "랭킹 등록은 로그인이 필요해요. 로그인 화면으로 이동하면 이번 점수는 사라지니, 로그인한 뒤 다시 플레이해 주세요.";
      input.classList.add("hidden"); btn.classList.add("hidden");
      return;
    }
    input.classList.remove("hidden"); btn.classList.remove("hidden");
    if (!input.value) input.value = defaultNick();
    btn.disabled = last.sent;
    if (!last.sent) msg.textContent = `${MODE_NAMES[last.mode]} ${last.score}점을 랭킹에 등록할까요? (닉네임 12자까지)`;
  }

  async function submit() {
    if (!user || !last || last.sent) return;
    const nick = el("nickInput").value.trim().slice(0, 12);
    if (!nick) { el("rankMsg").textContent = "닉네임을 입력해 주세요."; return; }
    el("btnRankSubmit").disabled = true;
    const row = { nickname: nick, mode: last.mode, score: last.score, day: last.mode === "daily" ? today() : null };
    const { error } = await sb.from("scores").insert(row);
    if (error) {
      const dup = error.code === "23505";
      el("rankMsg").textContent = dup ? "오늘의 도전은 하루에 한 번만 등록할 수 있어요." : "등록 실패: " + error.message;
      el("btnRankSubmit").disabled = dup ? true : false;
      return;
    }
    try { localStorage.setItem("eyeNick", nick); } catch {}
    last.sent = true;
    el("rankMsg").textContent = "🏆 랭킹에 등록됐어요!";
    el("btnRankSubmit").disabled = true;
    el("authName").textContent = `👤 ${nick}`;
  }

  async function loadBoard(mode) {
    boardMode = mode;
    for (const b of document.querySelectorAll("[data-board]")) b.classList.toggle("sub", b.dataset.board !== mode);
    const list = el("boardList");
    list.textContent = "불러오는 중...";
    let q = sb.from("leaderboard").select("nickname,score,mine").eq("mode", mode)
      .order("score", { ascending: false }).limit(20);
    if (mode === "daily") q = q.eq("day", today());
    const { data, error } = await q;
    list.textContent = "";
    if (error) { list.textContent = "랭킹을 불러오지 못했어요: " + error.message; return; }
    if (!data.length) { list.textContent = "아직 기록이 없어요. 첫 번째가 되어 보세요!"; return; }
    data.forEach((r, i) => {
      const li = document.createElement("li");
      if (r.mine) li.className = "mine";
      const a = document.createElement("span"), b = document.createElement("b");
      a.textContent = `${i + 1}. ${r.nickname}`;   // 사용자가 입력한 값은 textContent 로만 넣는다 (XSS 방지)
      b.textContent = r.score;
      li.append(a, b); list.append(li);
    });
  }

  return { init, onFinish, enabled };
})();

Online.init();
