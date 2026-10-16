"use strict";

const W = 600, H = 400;
const $ = id => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d");

let rand = Math.random;
let rounds = 5, round, scores, cur, answered, clickPt, isDaily, order;
let muted = false;

// 날짜 시드 난수 (오늘의 도전용)
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rr = (a, b) => a + rand() * (b - a);
const rad = d => d * Math.PI / 180;

// ---------- 효과음 (WebAudio, 외부 파일 없음) ----------
let audio;
function tone(freq, start, dur, type = "sine", vol = 0.12) {
  if (muted) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + start;
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + dur);
  } catch {}
}
function sfx(kind) {
  if (kind === "click") tone(660, 0, 0.06, "square", 0.05);
  else if (kind === "great") { tone(660, 0, 0.12); tone(880, 0.1, 0.12); tone(1320, 0.2, 0.25); }
  else if (kind === "ok") { tone(520, 0, 0.12); tone(660, 0.1, 0.2); }
  else if (kind === "bad") { tone(260, 0, 0.18, "sawtooth", 0.08); tone(200, 0.15, 0.25, "sawtooth", 0.08); }
  else if (kind === "end") { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25)); }
}

// ---------- 그리기 도구 ----------
function clear() { ctx.clearRect(0, 0, W, H); }
function line(a, b, color = "#fff", w = 3) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}
function dot(p, color = "#ffd166", r = 6) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
}
function label(t, x, y, color = "#b9bfd3") {
  ctx.fillStyle = color; ctx.font = "16px sans-serif"; ctx.textAlign = "center"; ctx.fillText(t, x, y);
}
function dashedCircle(c, r, color = "#4ade80") {
  ctx.strokeStyle = color; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp01 = v => Math.max(0, Math.min(100, v));

// ---------- 문제 유형 ----------
const TYPES = [
  // 1. 길이: 기준선 = 100
  {
    q: "위쪽 기준선의 길이를 100이라고 할 때, 아래 파란 선의 길이는?",
    unit: "", click: false,
    make() {
      const ref = rr(80, 160), len = rr(60, 480);
      return { ref, len, ang: rr(-0.5, 0.5), y: rr(220, 340), x: rr(30, 100), answer: len / ref * 100 };
    },
    draw(d) {
      line({ x: 30, y: 60 }, { x: 30 + d.ref, y: 60 }, "#ffd166"); label("기준 = 100", 30 + d.ref / 2, 45);
      const a = { x: d.x, y: d.y }, b = { x: d.x + d.len * Math.cos(d.ang * 0.4), y: d.y + d.len * Math.sin(d.ang * 0.4) };
      line(a, b, "#6ea8ff"); dot(a, "#6ea8ff", 4); dot(b, "#6ea8ff", 4);
    },
    score: (g, d) => clamp01(100 * (1 - Math.abs(g - d.answer) / d.answer * 2.5)),
    text: (g, d) => `정답 ${d.answer.toFixed(1)} / 내 답 ${g}`,
  },
  // 2. 각도
  {
    q: "두 선이 이루는 각도는 몇 도(°)일까요?",
    unit: "°", click: false,
    make() { const deg = Math.round(rr(15, 170)); return { deg, base: rr(0, 360), answer: deg }; },
    draw(d) {
      const o = { x: W / 2, y: H / 2 }, L = 150;
      line(o, { x: o.x + L * Math.cos(rad(d.base)), y: o.y + L * Math.sin(rad(d.base)) }, "#6ea8ff");
      line(o, { x: o.x + L * Math.cos(rad(d.base + d.deg)), y: o.y + L * Math.sin(rad(d.base + d.deg)) }, "#6ea8ff");
      dot(o);
    },
    score: (g, d) => clamp01(100 - Math.abs(g - d.answer) * 4),
    text: (g, d) => `정답 ${d.answer}° / 내 답 ${g}°`,
  },
  // 3. 넓이: 정사각형 = 100
  {
    q: "정사각형의 넓이를 100이라고 할 때, 원의 넓이는?",
    unit: "", click: false,
    make() {
      const side = rr(70, 130), R = rr(30, 120);
      return { side, R, answer: Math.PI * R * R / (side * side) * 100 };
    },
    draw(d) {
      ctx.fillStyle = "#ffd166"; ctx.fillRect(40, 60, d.side, d.side);
      label("= 100", 40 + d.side / 2, 60 + d.side + 22);
      ctx.fillStyle = "#6ea8ff"; ctx.beginPath(); ctx.arc(400, 220, d.R, 0, 7); ctx.fill();
    },
    score: (g, d) => clamp01(100 * (1 - Math.abs(g - d.answer) / d.answer * 1.5)),
    text: (g, d) => `정답 ${d.answer.toFixed(0)} / 내 답 ${g}`,
  },
  // 4. 중점 클릭
  {
    q: "두 점의 정확한 가운데(중점)를 클릭하세요.",
    unit: "", click: true,
    make() {
      const a = { x: rr(60, 250), y: rr(60, 340) }, b = { x: rr(350, 540), y: rr(60, 340) };
      return { a, b, target: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, scale: dist(a, b) };
    },
    draw(d) { dot(d.a, "#6ea8ff", 8); dot(d.b, "#6ea8ff", 8); },
    score: (p, d) => clamp01(100 * (1 - dist(p, d.target) / d.scale * 8)),
    text: (p, d) => `오차 ${dist(p, d.target).toFixed(0)}px`,
    reveal(d) { line(d.a, d.b, "#4ade8066", 2); dot(d.target, "#4ade80", 7); },
  },
  // 5. 같은 거리 클릭
  {
    q: "노란 기준선과 같은 거리만큼 떨어진 곳을 클릭하세요. (점 A에서 아무 방향)",
    unit: "", click: true,
    make() { const ref = rr(100, 200); return { ref, a: { x: rr(260, 340), y: rr(180, 260) }, scale: ref }; },
    draw(d) {
      line({ x: 30, y: 40 }, { x: 30 + d.ref, y: 40 }, "#ffd166"); label("기준", 30 + d.ref / 2, 25);
      dot(d.a, "#6ea8ff", 8); label("A", d.a.x, d.a.y - 14);
    },
    score: (p, d) => clamp01(100 * (1 - Math.abs(dist(p, d.a) - d.ref) / d.ref * 4)),
    text: (p, d) => `기준 ${d.ref.toFixed(0)}px / 내 거리 ${dist(p, d.a).toFixed(0)}px`,
    reveal(d) { dashedCircle(d.a, d.ref); },
  },
  // 6. 원의 중심 클릭
  {
    q: "일부만 보이는 원호입니다. 이 원의 중심을 클릭하세요.",
    unit: "", click: true,
    make() {
      const R = rr(70, 120), c = { x: rr(R + 30, W - R - 30), y: rr(R + 30, H - R - 30) };
      return { c, R, start: rr(0, 360), span: rr(150, 230), target: c, scale: R };
    },
    draw(d) {
      ctx.strokeStyle = "#6ea8ff"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(d.c.x, d.c.y, d.R, rad(d.start), rad(d.start + d.span)); ctx.stroke();
    },
    score: (p, d) => clamp01(100 * (1 - dist(p, d.target) / d.R * 2.5)),
    text: (p, d) => `오차 ${dist(p, d.target).toFixed(0)}px (반지름 ${d.R.toFixed(0)}px)`,
    reveal(d) { dashedCircle(d.c, d.R); dot(d.c, "#4ade80", 7); },
  },
  // 7. 직각 만들기 클릭
  {
    q: "점 O에서 파란 선과 정확히 직각(90°)이 되는 방향의 아무 곳이나 클릭하세요.",
    unit: "", click: true,
    make() {
      const base = rr(0, 360);
      return { o: { x: W / 2, y: H / 2 }, base, L: 140, target: null, scale: 1 };
    },
    draw(d) {
      line(d.o, { x: d.o.x + d.L * Math.cos(rad(d.base)), y: d.o.y + d.L * Math.sin(rad(d.base)) }, "#6ea8ff");
      dot(d.o, "#ffd166", 7); label("O", d.o.x, d.o.y - 14);
    },
    score(p, d) { return clamp01(100 - Math.abs(this.angle(p, d) - 90) * 4); },
    angle(p, d) {
      let a = Math.abs(Math.atan2(p.y - d.o.y, p.x - d.o.x) * 180 / Math.PI - d.base) % 360;
      return a > 180 ? 360 - a : a;
    },
    text(p, d) { return `내 각도 ${this.angle(p, d).toFixed(1)}° (정답 90°)`; },
    reveal(d) {
      for (const s of [90, -90]) line(d.o, { x: d.o.x + 200 * Math.cos(rad(d.base + s)), y: d.o.y + 200 * Math.sin(rad(d.base + s)) }, "#4ade8088", 2);
    },
  },
  // 8. 삼등분점 클릭
  {
    q: "점 A에서 B 쪽으로 정확히 1/3 되는 지점을 클릭하세요.",
    unit: "", click: true,
    make() {
      const a = { x: rr(60, 200), y: rr(60, 340) }, b = { x: rr(380, 540), y: rr(60, 340) };
      return { a, b, target: { x: a.x + (b.x - a.x) / 3, y: a.y + (b.y - a.y) / 3 }, scale: dist(a, b) };
    },
    draw(d) { line(d.a, d.b, "#6ea8ff55", 2); dot(d.a, "#6ea8ff", 8); dot(d.b, "#6ea8ff", 8); label("A", d.a.x, d.a.y - 14); label("B", d.b.x, d.b.y - 14); },
    score: (p, d) => clamp01(100 * (1 - dist(p, d.target) / d.scale * 8)),
    text: (p, d) => `오차 ${dist(p, d.target).toFixed(0)}px`,
    reveal(d) { dot(d.target, "#4ade80", 7); },
  },
  // 9. 점 개수 어림하기
  {
    q: "점이 몇 개일까요? 세지 말고 눈으로 어림해 보세요!",
    unit: "개", click: false,
    make() {
      const n = Math.round(rr(30, 200)), pts = [];
      for (let i = 0; i < n; i++) pts.push({ x: rr(30, W - 30), y: rr(30, H - 30) });
      return { n, pts, answer: n };
    },
    draw(d) { for (const p of d.pts) dot(p, "#6ea8ff", 4); },
    score: (g, d) => clamp01(100 * (1 - Math.abs(g - d.answer) / d.answer * 3)),
    text: (g, d) => `정답 ${d.answer}개 / 내 답 ${g}개`,
  },
];

// ---------- 화면 전환 / 저장 ----------
function show(id) { for (const s of document.querySelectorAll(".screen")) s.classList.add("hidden"); $(id).classList.remove("hidden"); }
const bestKey = n => "eyeBest" + n;
const getBest = n => { try { return +localStorage.getItem(bestKey(n)) || 0; } catch { return 0; } };
const setBest = (n, v) => { try { localStorage.setItem(bestKey(n), v); } catch {} };
function renderBest() {
  $("best5").textContent = getBest(5) ? getBest(5) + " / 500" : "-";
  $("best10").textContent = getBest(10) ? getBest(10) + " / 1000" : "-";
}
function loadMuted() { try { muted = localStorage.getItem("eyeMuted") === "1"; } catch {} $("btnMute").textContent = muted ? "🔇" : "🔊"; }

// ---------- 게임 흐름 ----------
function start(n, daily) {
  rounds = n; isDaily = daily;
  if (daily) {
    const t = new Date();
    rand = mulberry32(t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate());
  } else rand = Math.random;
  // 유형을 섞어서 필요한 만큼 이어 붙인다 (같은 유형이 연속되지 않게)
  order = [];
  while (order.length < rounds) {
    const batch = TYPES.map((t, i) => [rand(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    if (order.length && batch[0] === order[order.length - 1]) batch.push(batch.shift());
    order.push(...batch);
  }
  round = 0; scores = [];
  show("game"); nextRound();
}

const sum = () => scores.reduce((a, b) => a + b, 0);

function nextRound() {
  const t = TYPES[order[round]];
  cur = { t, d: t.make() };
  answered = false; clickPt = null;
  $("round").textContent = `라운드 ${round + 1} / ${rounds}`;
  $("total").textContent = `점수 ${sum()}`;
  $("progress").style.width = (round / rounds * 100) + "%";
  $("question").textContent = t.q;
  $("result").textContent = ""; $("result").className = "";
  $("answer").value = ""; $("unit").textContent = t.unit;
  $("inputRow").classList.toggle("hidden", t.click);
  $("btnSubmit").classList.remove("hidden"); $("btnSubmit").disabled = t.click;
  $("btnNext").classList.add("hidden");
  redraw();
  if (!t.click) $("answer").focus();
}

function redraw() { clear(); cur.t.draw(cur.d); if (clickPt) dot(clickPt, "#f87171", 6); }

function submit() {
  if (answered) return;
  const { t, d } = cur;
  let guess;
  if (t.click) { if (!clickPt) return; guess = clickPt; }
  else { guess = parseFloat($("answer").value); if (isNaN(guess)) return; }
  answered = true;
  const s = Math.round(t.score(guess, d));
  scores.push(s);
  redraw(); if (t.reveal) t.reveal(d);
  const r = $("result");
  r.textContent = `${t.text(guess, d)}  →  +${s}점`;
  r.className = "pop " + (s >= 80 ? "great" : s >= 40 ? "ok" : "bad");
  sfx(s >= 80 ? "great" : s >= 40 ? "ok" : "bad");
  $("total").textContent = `점수 ${sum()}`;
  $("progress").style.width = ((round + 1) / rounds * 100) + "%";
  $("btnSubmit").classList.add("hidden");
  $("btnNext").classList.remove("hidden");
  $("btnNext").textContent = round + 1 >= rounds ? "결과 보기" : "다음";
  $("btnNext").focus();
}

function next() { round++; if (round >= rounds) finish(); else nextRound(); }

function grade(pct) {
  return pct >= 90 ? "🎯 인간 자 (신의 눈)" : pct >= 70 ? "👁 눈대중 고수" : pct >= 50 ? "🙂 평균 이상" : pct >= 30 ? "🤔 감이 좀 아쉬워요" : "🫠 오늘은 컨디션이...";
}

function finish() {
  const total = sum(), max = rounds * 100;
  $("final").textContent = total; $("finalMax").textContent = max;
  $("grade").textContent = grade(total / max * 100);
  let msg = "";
  if (!isDaily) {
    if (total > getBest(rounds)) { setBest(rounds, total); msg = "🏆 최고 기록 갱신!"; }
  }
  $("newBest").textContent = msg;
  $("breakdown").innerHTML = scores.map((s, i) => `<li><span>${i + 1}. ${TYPES[order[i]].q.split(/[.?]/)[0]}</span><b>${s}</b></li>`).join("");
  $("copied").classList.add("hidden");
  sfx("end"); renderBest(); show("end");
}

function shareText() {
  const tag = isDaily ? ` 오늘의 도전 (${new Date().toLocaleDateString("ko-KR")})` : ` ${rounds}라운드`;
  return `📏 눈대중 마스터${tag}\n${sum()}/${rounds * 100} ${$("grade").textContent}\n${scores.map(s => s >= 80 ? "🟩" : s >= 40 ? "🟨" : "🟥").join("")}\n${location.href}`;
}

// ---------- 입력 ----------
cv.addEventListener("pointerdown", e => {
  if (!cur || !cur.t.click || answered) return;
  const r = cv.getBoundingClientRect();
  clickPt = { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  $("btnSubmit").disabled = false;
  sfx("click"); redraw();
});
$("btnPlay").onclick = () => start(5, false);
$("btnLong").onclick = () => start(10, false);
$("btnDaily").onclick = () => start(5, true);
$("btnSubmit").onclick = submit;
$("btnNext").onclick = next;
$("btnAgain").onclick = () => { renderBest(); show("start"); };
$("btnMute").onclick = () => {
  muted = !muted; $("btnMute").textContent = muted ? "🔇" : "🔊";
  try { localStorage.setItem("eyeMuted", muted ? "1" : "0"); } catch {}
  sfx("click");
};
$("btnShare").onclick = async () => {
  try { await navigator.clipboard.writeText(shareText()); $("copied").classList.remove("hidden"); }
  catch { prompt("복사하세요", shareText()); }
};
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" || $("game").classList.contains("hidden")) return;
  e.preventDefault();
  answered ? next() : submit();
});
loadMuted(); renderBest();
