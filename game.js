"use strict";

const W = 600, H = 400, ROUNDS = 5;
const $ = id => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d");

let rand = Math.random;
let round, scores, cur, answered, clickPt, isDaily;

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
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ---------- 문제 유형 ----------
const TYPES = [
  // 1. 길이: 기준선 = 100
  {
    q: "위쪽 기준선의 길이를 100이라고 할 때, 아래 파란 선의 길이는?",
    unit: "", click: false,
    make() {
      const ref = rr(80, 160), len = rr(60, 480);
      const ang = rr(-0.5, 0.5), y = rr(220, 340), x = rr(30, 100);
      return { ref, len, ang, y, x, answer: len / ref * 100 };
    },
    draw(d) {
      line({ x: 30, y: 60 }, { x: 30 + d.ref, y: 60 }, "#ffd166"); label("기준 = 100", 30 + d.ref / 2, 45);
      const a = { x: d.x, y: d.y }, b = { x: d.x + d.len * Math.cos(d.ang * 0.4), y: d.y + d.len * Math.sin(d.ang * 0.4) };
      line(a, b, "#6ea8ff"); dot(a, "#6ea8ff", 4); dot(b, "#6ea8ff", 4);
    },
    score(g, d) { return Math.max(0, 100 * (1 - Math.abs(g - d.answer) / d.answer * 2.5)); },
    text: (g, d) => `정답 ${d.answer.toFixed(1)} / 내 답 ${g}`,
  },
  // 2. 각도
  {
    q: "두 선이 이루는 각도는 몇 도(°)일까요?",
    unit: "°", click: false,
    make() {
      const deg = Math.round(rr(15, 170)), base = rr(0, 360);
      return { deg, base, answer: deg };
    },
    draw(d) {
      const o = { x: W / 2, y: H / 2 }, L = 150, r = d => d * Math.PI / 180;
      line(o, { x: o.x + L * Math.cos(r(d.base)), y: o.y + L * Math.sin(r(d.base)) }, "#6ea8ff");
      line(o, { x: o.x + L * Math.cos(r(d.base + d.deg)), y: o.y + L * Math.sin(r(d.base + d.deg)) }, "#6ea8ff");
      dot(o);
    },
    score(g, d) { return Math.max(0, 100 - Math.abs(g - d.answer) * 4); },
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
    score(g, d) { return Math.max(0, 100 * (1 - Math.abs(g - d.answer) / d.answer * 1.5)); },
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
    score(p, d) { return Math.max(0, 100 * (1 - dist(p, d.target) / d.scale * 8)); },
    text: (p, d) => `오차 ${dist(p, d.target).toFixed(0)}px`,
    reveal(d) { dot(d.target, "#4ade80", 7); line(d.a, d.b, "#4ade8066", 2); },
  },
  // 5. 같은 거리 클릭
  {
    q: "노란 기준선과 같은 거리만큼 떨어진 곳을 클릭하세요. (점 A에서 아무 방향)",
    unit: "", click: true,
    make() {
      const ref = rr(100, 200);
      return { ref, a: { x: rr(260, 340), y: rr(180, 260) }, scale: ref };
    },
    draw(d) {
      line({ x: 30, y: 40 }, { x: 30 + d.ref, y: 40 }, "#ffd166"); label("기준", 30 + d.ref / 2, 25);
      dot(d.a, "#6ea8ff", 8); label("A", d.a.x, d.a.y - 14);
    },
    score(p, d) { return Math.max(0, 100 * (1 - Math.abs(dist(p, d.a) - d.ref) / d.ref * 4)); },
    text: (p, d) => `기준 ${d.ref.toFixed(0)}px / 내 거리 ${dist(p, d.a).toFixed(0)}px`,
    reveal(d) { ctx.strokeStyle = "#4ade80"; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(d.a.x, d.a.y, d.ref, 0, 7); ctx.stroke(); ctx.setLineDash([]); },
  },
];

// ---------- 흐름 ----------
function show(id) { for (const s of document.querySelectorAll(".screen")) s.classList.add("hidden"); $(id).classList.remove("hidden"); }
const getBest = () => { try { return +localStorage.getItem("eyeBest") || 0; } catch { return 0; } };
const setBest = v => { try { localStorage.setItem("eyeBest", v); } catch {} };

function start(daily) {
  isDaily = daily;
  if (daily) {
    const t = new Date(), seed = t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
    rand = mulberry32(seed);
  } else rand = Math.random;
  // 유형 5개를 섞어서 매 라운드 다른 문제
  order = TYPES.map((t, i) => [rand(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  round = 0; scores = [];
  show("game"); nextRound();
}
let order;

function nextRound() {
  const t = TYPES[order[round]];
  cur = { t, d: t.make() };
  answered = false; clickPt = null;
  $("round").textContent = `라운드 ${round + 1} / ${ROUNDS}`;
  $("total").textContent = `점수 ${scores.reduce((a, b) => a + b, 0)}`;
  $("question").textContent = t.q;
  $("result").textContent = "";
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
  $("result").textContent = `${t.text(guess, d)}  →  +${s}점`;
  $("total").textContent = `점수 ${scores.reduce((a, b) => a + b, 0)}`;
  $("btnSubmit").classList.add("hidden");
  $("btnNext").classList.remove("hidden");
  $("btnNext").textContent = round + 1 >= ROUNDS ? "결과 보기" : "다음";
}

function next() {
  round++;
  if (round >= ROUNDS) return finish();
  nextRound();
}

function finish() {
  const total = scores.reduce((a, b) => a + b, 0);
  $("final").textContent = total;
  const g = total >= 450 ? "🎯 인간 자 (신의 눈)" : total >= 350 ? "👁 눈대중 고수" : total >= 250 ? "🙂 평균 이상" : total >= 150 ? "🤔 감이 좀 아쉬워요" : "🫠 오늘은 컨디션이...";
  $("grade").textContent = g;
  if (!isDaily && total > getBest()) setBest(total);
  $("best").textContent = getBest() || "-";
  $("copied").classList.add("hidden");
  show("end");
}

function shareText() {
  const total = scores.reduce((a, b) => a + b, 0);
  const tag = isDaily ? ` (${new Date().toLocaleDateString("ko-KR")})` : "";
  return `📏 눈대중 마스터${tag}\n${total}/500 ${$("grade").textContent}\n${scores.map(s => s >= 80 ? "🟩" : s >= 40 ? "🟨" : "🟥").join("")}\n${location.href}`;
}

// ---------- 입력 ----------
cv.addEventListener("pointerdown", e => {
  if (!cur || !cur.t.click || answered) return;
  const r = cv.getBoundingClientRect();
  clickPt = { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  $("btnSubmit").disabled = false;
  redraw();
});
$("btnPlay").onclick = () => start(false);
$("btnDaily").onclick = () => start(true);
$("btnSubmit").onclick = submit;
$("btnNext").onclick = next;
$("btnAgain").onclick = () => { $("best").textContent = getBest() || "-"; show("start"); };
$("btnShare").onclick = async () => {
  try { await navigator.clipboard.writeText(shareText()); $("copied").classList.remove("hidden"); } catch { prompt("복사하세요", shareText()); }
};
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" || $("game").classList.contains("hidden")) return;
  answered ? next() : submit();
});
$("best").textContent = getBest() || "-";
