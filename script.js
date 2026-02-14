/* =========================================================
   NIHONGO321 (SPA leve)
   ✅ Blindagem de estado pós load/import (evita crashes)
   ✅ Save throttling (fluidez grande)
   ✅ Rota consistente no editar (back perfeito)
   ✅ Anti-spam TTS (menos "fantasma")
   ✅ Tópicos sempre fechados + clicar frase carrega treino
   ✅ Drag handle para ordenar TÓPICOS + progresso por tópico
   ✅ Correção JP validation (inclui 々 e 〜/～ etc)
   ✅ FIX: CSS/JS compatíveis (classes do topic header)
   ✅ FIX: drag do tópico não dispara click fantasma
   ========================================================= */

const LS_KEY = "jp_105x_v3";

/* ---------- helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const now = () => Date.now();
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const uid = (p = "id") => `${p}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
const escapeHTML = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function safeJSONParse(str) { try { return JSON.parse(str); } catch { return null; } }

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtHMSDays(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const rem = totalSec % 86400;

  const hh = String(Math.floor(rem / 3600)).padStart(2, "0");
  const mm = String(Math.floor((rem % 3600) / 60)).padStart(2, "0");
  const ss = String(rem % 60).padStart(2, "0");

  return `${hh}:${mm}:${ss} (${days}d)`;
}

function fmtDateShort(ts) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}
function addDaysTS(ts, days) { return ts + days * 24 * 60 * 60 * 1000; }

function downloadTextFile(filename, text, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function normalizeName(s) {
  return String(s || "").trim().replace(/\s+/g, " ").slice(0, 40);
}

/* ---------- hash route + params ---------- */
function routeInfo() {
  const h = location.hash || "#/home";
  const raw = h.startsWith("#/") ? h.slice(2) : "home";
  const [pathRaw, q] = raw.split("?");
  const path = `#/${pathRaw || "home"}`;
  const params = {};
  if (q) {
    for (const part of q.split("&")) {
      const [k, v] = part.split("=");
      if (!k) continue;
      params[decodeURIComponent(k)] = decodeURIComponent(v || "");
    }
  }
  return { path, params };
}
function route() { return routeInfo().path; }
function nav(hash) { location.hash = hash; }

/* ---------- JP validation (corrigido) ---------- */
const JP_ALLOWED_RE =
  /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3005\u3006 　。、！？・ー\-~!?.,:;()（）「」『』【】［］…〜～\n\r\t0-9{}]*$/;

function isValidJP(text) {
  if (typeof text !== "string") return false;
  const t = text.trim();
  if (!t) return false;

  if (!JP_ALLOWED_RE.test(t)) return false;

  const open = (t.match(/{/g) || []).length;
  const close = (t.match(/}/g) || []).length;
  if (open !== close) return false;

  if (/\{\s*\}/.test(t)) return false;
  return true;
}

/* ---------- Furigana parsing ---------- */
const FURI_RE = /([^{}\s]+)\{([^{}]+)\}/g;

function jpStripFurigana(raw) {
  return String(raw || "").replace(FURI_RE, (_, base) => base);
}
function jpHasFurigana(raw) { FURI_RE.lastIndex = 0; return FURI_RE.test(String(raw || "")); }

function jpToRubyHTML(raw) {
  const s = String(raw || "");
  FURI_RE.lastIndex = 0;

  let out = "";
  let last = 0;
  let m;
  while ((m = FURI_RE.exec(s)) !== null) {
    const [full, base, reading] = m;
    const i = m.index;
    out += escapeHTML(s.slice(last, i));
    out += `<ruby>${escapeHTML(base)}<rt>${escapeHTML(reading.trim())}</rt></ruby>`;
    last = i + full.length;
  }
  out += escapeHTML(s.slice(last));
  return out;
}

/* ---------- topics ---------- */
function topicPalette() {
  return ["tRose","tViolet","tBlue","tCyan","tGreen","tAmber","tPink","tMint"];
}
function pickTopicColor(i) {
  const p = topicPalette();
  return p[i % p.length];
}
function defaultTopic() {
  const t = now();
  return { id: "topic_default", name: "Frases aleatórias", color: "tViolet", createdAt: t, updatedAt: t };
}

/* ---------- seeds (inicial) ---------- */
function seedPhrases(topicId) {
  const t = now();
  return [
    { id:"ph_001", jp:"おはよう", pt:"bom dia", newWords:[{jp:"おはよう", pt:"bom dia"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_002", jp:"おつかれさま", pt:"bom trabalho / valeu pelo esforço", newWords:[{jp:"おつかれさま", pt:"bom trabalho"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_003", jp:"きょうは つかれた", pt:"hoje eu estou cansado", newWords:[{jp:"きょう",pt:"hoje"},{jp:"つかれた",pt:"cansado"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_004", jp:"ねむい", pt:"estou com sono", newWords:[{jp:"ねむい",pt:"com sono"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_005", jp:"いま いそがしい", pt:"agora estou ocupado", newWords:[{jp:"いま",pt:"agora"},{jp:"いそがしい",pt:"ocupado"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_006", jp:"ちょっと まって", pt:"espera um pouco", newWords:[{jp:"ちょっと",pt:"um pouco"},{jp:"まって",pt:"espera"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_007", jp:"だいじょうぶ", pt:"tudo bem / está ok", newWords:[{jp:"だいじょうぶ",pt:"tudo bem"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_008", jp:"もういちど おねがい", pt:"de novo, por favor", newWords:[{jp:"もういちど",pt:"mais uma vez"},{jp:"おねがい",pt:"por favor"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_009", jp:"ゆっくり おねがい", pt:"devagar, por favor", newWords:[{jp:"ゆっくり",pt:"devagar"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_010", jp:"わからない", pt:"não entendi / não sei", newWords:[{jp:"わからない",pt:"não entendi"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_011", jp:"これ どこ", pt:"onde fica isto?", newWords:[{jp:"これ",pt:"isto"},{jp:"どこ",pt:"onde"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_012", jp:"これ なに", pt:"o que é isto?", newWords:[{jp:"なに",pt:"o que"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_013", jp:"たすけて", pt:"me ajuda", newWords:[{jp:"たすけて",pt:"me ajuda"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_014", jp:"あぶない", pt:"perigoso", newWords:[{jp:"あぶない",pt:"perigoso"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_015", jp:"きをつけて", pt:"cuidado", newWords:[{jp:"きをつけて",pt:"cuidado"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_016", jp:"ここで まって", pt:"espera aqui", newWords:[{jp:"ここ",pt:"aqui"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_017", jp:"これを つかう", pt:"usar isto", newWords:[{jp:"つかう",pt:"usar"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_018", jp:"それは だめ", pt:"isso não pode", newWords:[{jp:"それ",pt:"isso"},{jp:"だめ",pt:"não pode"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_019", jp:"もう いい", pt:"já está bom / pode parar", newWords:[{jp:"もう",pt:"já"},{jp:"いい",pt:"bom"}], topicId, createdAt:t, updatedAt:t },
    { id:"ph_020", jp:"あとで はなそう", pt:"vamos falar depois", newWords:[{jp:"あとで",pt:"depois"},{jp:"はなそう",pt:"vamos falar"}], topicId, createdAt:t, updatedAt:t }
  ];
}

/* ---------- default state ---------- */
function defaultState() {
  const t = now();
  const top = defaultTopic();
  const phrases = seedPhrases(top.id);

  const progress = {};
  for (const p of phrases) {
    progress[p.id] = { status:"training", cycleStart:14, count:14, masteredAt:null, history:[] };
  }

  return {
    app: { schemaVersion: 3, createdAt: t, updatedAt: t },
    prefs: {
      audio: { enabled: true, volume: 0.35, unlocked: false },
      haptics: { enabled: true }
    },
    stats: {
      coins: 0, bestCoins: 0, cyclesDone: 0, phrasesMastered: 0, listens: 0, calls: 0
    },
    habit: { firstDay: null, days: {} },
    bank: { topics: [top], phrases },
    progress,
    session: {
      inProgress: false,
      queue: [],
      index: 0,
      phraseId: null,
      callMode: false,
      topicFilter: "ALL",
      study: { day: todayKey(), totalMs: 0, running: false, runStartAt: null }
    },
    ui: {
      lastToast: "",
      collapsedTopics: {},
      collapsedDefault: true
    }
  };
}

/* =========================================================
   BLINDAGEM / MIGRATION / LOAD
   ========================================================= */
function migrateToV3(st) {
  if (!st || !st.app) return defaultState();

  st.app.schemaVersion = 3;
  st.bank ||= {};
  st.bank.phrases ||= [];
  st.bank.topics ||= [];

  st.ui ||= {};
  st.ui.collapsedTopics ||= {};
  if (typeof st.ui.collapsedDefault !== "boolean") st.ui.collapsedDefault = true;

  st.session ||= {};
  st.session.topicFilter ||= "ALL";
  st.session.queue ||= [];
  st.session.index ||= 0;

  let def = (st.bank.topics || []).find(t => t.id === "topic_default");
  if (!def) {
    def = defaultTopic();
    st.bank.topics.unshift(def);
  }

  for (const p of st.bank.phrases) {
    if (!p.topicId) p.topicId = def.id;
    if (!p.id) p.id = uid("ph");
    if (!p.createdAt) p.createdAt = now();
    if (!p.updatedAt) p.updatedAt = p.createdAt;
    if (!Array.isArray(p.newWords)) p.newWords = [];
  }

  st.stats ||= {};
  st.stats.listens ||= 0;
  st.stats.calls ||= 0;

  st.habit ||= { firstDay: null, days: {} };
  st.habit.days ||= {};

  st.session.study ||= { day: todayKey(), totalMs: 0, running: false, runStartAt: null };

  st.progress ||= {};
  for (const p of st.bank.phrases) {
    if (!st.progress[p.id]) st.progress[p.id] = { status:"training", cycleStart:14, count:14, masteredAt:null, history:[] };
  }

  return st;
}

function ensurePhrasesHaveValidTopic(stateRef) {
  const def = (stateRef.bank?.topics || []).find(t => t.id === "topic_default") || defaultTopic();
  const topics = new Set((stateRef.bank.topics || []).map(t => t.id));
  let changed = false;

  for (const p of (stateRef.bank.phrases || [])) {
    if (!p.topicId || !topics.has(p.topicId)) {
      p.topicId = def.id;
      changed = true;
    }
  }
  return changed;
}

/* blindagem: mescla com default e garante tipos */
function sanitizeState(raw) {
  const base = defaultState();
  const st = migrateToV3(raw || base);

  st.app ||= base.app;
  if (typeof st.app.schemaVersion !== "number") st.app.schemaVersion = 3;

  st.prefs ||= base.prefs;
  st.prefs.audio ||= base.prefs.audio;
  st.prefs.haptics ||= base.prefs.haptics;
  st.prefs.audio.enabled = !!st.prefs.audio.enabled;
  st.prefs.haptics.enabled = !!st.prefs.haptics.enabled;
  st.prefs.audio.volume = clamp(Number(st.prefs.audio.volume ?? 0.35), 0, 1);
  st.prefs.audio.unlocked = !!st.prefs.audio.unlocked;

  st.stats ||= base.stats;
  for (const k of ["coins","bestCoins","cyclesDone","phrasesMastered","listens","calls"]) {
    st.stats[k] = Math.max(0, Number(st.stats[k] || 0));
  }

  st.habit ||= base.habit;
  st.habit.days ||= {};
  if (!st.habit.firstDay || typeof st.habit.firstDay !== "string") st.habit.firstDay = base.habit.firstDay;

  st.bank ||= base.bank;
  st.bank.topics = Array.isArray(st.bank.topics) ? st.bank.topics : [];
  st.bank.phrases = Array.isArray(st.bank.phrases) ? st.bank.phrases : [];

  st.ui ||= base.ui;
  st.ui.collapsedTopics ||= {};
  if (typeof st.ui.collapsedDefault !== "boolean") st.ui.collapsedDefault = true;

  st.session ||= base.session;
  st.session.queue = Array.isArray(st.session.queue) ? st.session.queue : [];
  st.session.index = clamp(Number(st.session.index || 0), 0, 999999);
  st.session.inProgress = !!st.session.inProgress;
  st.session.callMode = !!st.session.callMode;
  st.session.topicFilter = st.session.topicFilter || "ALL";
  st.session.study ||= base.session.study;

  st.progress ||= {};
  for (const p of st.bank.phrases) {
    if (!p || typeof p !== "object") continue;
    if (!p.id) p.id = uid("ph");
    if (!p.topicId) p.topicId = "topic_default";
    if (!p.jp) p.jp = "";
    if (!p.pt) p.pt = "";
    if (!Array.isArray(p.newWords)) p.newWords = [];
    if (!st.progress[p.id]) st.progress[p.id] = { status:"training", cycleStart:14, count:14, masteredAt:null, history:[] };
    const pr = st.progress[p.id];
    pr.status = (pr.status === "mastered") ? "mastered" : "training";
    pr.cycleStart = clamp(Number(pr.cycleStart || 14), 1, 14);
    pr.count = clamp(Number(pr.count || pr.cycleStart), 1, pr.cycleStart);
    if (!Array.isArray(pr.history)) pr.history = [];
  }

  if (!st.bank.topics.find(t => t && t.id === "topic_default")) {
    st.bank.topics.unshift(defaultTopic());
  }

  ensurePhrasesHaveValidTopic(st);
  return st;
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = safeJSONParse(raw);
      if (parsed && parsed.app?.schemaVersion === 3) return sanitizeState(parsed);
    }

    const legacyRaw = localStorage.getItem("jp_105x_v2");
    if (legacyRaw) {
      const parsed = safeJSONParse(legacyRaw);
      if (parsed && parsed.app) {
        const migrated = sanitizeState(migrateToV3(parsed));
        localStorage.setItem(LS_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
    return sanitizeState(defaultState());
  } catch {
    return sanitizeState(defaultState());
  }
}

/* =========================================================
   SAVE THROTTLING (fluidez)
   ========================================================= */
let SAVE_T = null;
let SAVE_DIRTY = false;

function saveStateDebounced() {
  SAVE_DIRTY = true;
  if (SAVE_T) return;
  SAVE_T = setTimeout(() => {
    SAVE_T = null;
    if (!SAVE_DIRTY) return;
    SAVE_DIRTY = false;
    try {
      STATE.app.updatedAt = now();
      localStorage.setItem(LS_KEY, JSON.stringify(STATE));
    } catch {}
  }, 450);
}

function saveStateNow() {
  SAVE_DIRTY = false;
  if (SAVE_T) { clearTimeout(SAVE_T); SAVE_T = null; }
  try {
    STATE.app.updatedAt = now();
    localStorage.setItem(LS_KEY, JSON.stringify(STATE));
  } catch {}
}

window.addEventListener("pagehide", () => saveStateNow());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveStateNow();
});

/* ---------- state ---------- */
let STATE = loadState();

/* =========================================================
   audio / haptics + TTS guard
   ========================================================= */
let audioCtx = null;

function unlockAudio() {
  if (STATE.prefs.audio.unlocked) return;
  STATE.prefs.audio.unlocked = true;

  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    g.gain.value = 0.0001;
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.01);
  } catch {}
  saveStateDebounced();
}

function beep(type = "tap") {
  if (!STATE.prefs.audio.enabled) return;
  if (!STATE.prefs.audio.unlocked) return;
  if (!audioCtx) return;

  const vol = clamp(STATE.prefs.audio.volume ?? 0.35, 0, 1);
  const t0 = audioCtx.currentTime;

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  let freq = 220, dur = 0.06;
  if (type === "ding") { freq = 660; dur = 0.09; }
  if (type === "pop")  { freq = 520; dur = 0.05; }
  if (type === "tuk")  { freq = 140; dur = 0.06; }
  if (type === "level"){ freq = 840; dur = 0.12; }

  o.type = "sine";
  o.frequency.setValueAtTime(freq, t0);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * 0.14), t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  o.connect(g).connect(audioCtx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function vibrate(pattern = [10]) {
  if (!STATE.prefs.haptics.enabled) return;
  if (!navigator.vibrate) return;
  navigator.vibrate(pattern);
}

/* Anti-spam TTS (Android/Chrome) */
const TTS_GUARD = { lockUntil: 0, watchdog: null };

function ttsCancelSafe() {
  try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch {}
  if (TTS_GUARD.watchdog) {
    clearTimeout(TTS_GUARD.watchdog);
    TTS_GUARD.watchdog = null;
  }
  TTS_GUARD.lockUntil = 0;
}

function ttsCanStart() { return now() >= TTS_GUARD.lockUntil; }
function ttsLockFor(ms) { TTS_GUARD.lockUntil = now() + ms; }

function estimateDurationMs(text, rate) {
  const clean = (text || "").replace(/\s+/g, "");
  const n = clean.length || 1;
  const base = 110 * n;
  const r = clamp(rate, 0.6, 1.2);
  return base / r;
}

function ttsSpeak(text, rate = 1.0, onStart, onEnd) {
  if (!("speechSynthesis" in window)) return false;
  if (!ttsCanStart()) return false;

  ttsLockFor(700);

  try { speechSynthesis.cancel(); } catch {}

  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = clamp(rate, 0.6, 1.2);

  const finish = () => {
    if (TTS_GUARD.watchdog) {
      clearTimeout(TTS_GUARD.watchdog);
      TTS_GUARD.watchdog = null;
    }
    onEnd && onEnd();
  };

  u.onstart = () => { onStart && onStart(); };
  u.onend = finish;
  u.onerror = finish;

  const approx = estimateDurationMs(text, u.rate) + 1200;
  TTS_GUARD.watchdog = setTimeout(() => {
    TTS_GUARD.watchdog = null;
    finish();
  }, approx);

  speechSynthesis.speak(u);
  return true;
}

/* ---------- UI helpers ---------- */
const APP = $("#app");

function toast(msg) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("on");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("on"), 1400);
  STATE.ui.lastToast = msg;
  saveStateDebounced();
}

function floatCoin(text = "+100 🪙") {
  const el = document.createElement("div");
  el.className = "floatCoin";
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function sparkOn(node) {
  if (!node) return;
  let sp = node.querySelector(".spark");
  if (!sp) {
    sp = document.createElement("div");
    sp.className = "spark";
    node.appendChild(sp);
  }
  sp.classList.remove("on");
  void sp.offsetWidth;
  sp.classList.add("on");
}

function refreshHUD() {
  const coinsEl = $("#hudCoinsVal");
  if (coinsEl) coinsEl.textContent = String(STATE.stats.coins || 0);

  const soundEl = $("#hudSound");
  if (soundEl) soundEl.textContent = STATE.prefs.audio.enabled ? "🔊" : "🔇";

  const vibeEl = $("#hudVibe");
  if (vibeEl) vibeEl.textContent = STATE.prefs.haptics.enabled ? "📳" : "📴";

  const sub = $("#subStatus");
  if (sub) sub.textContent = `${STATE.stats.cyclesDone || 0} ciclos • ${STATE.stats.phrasesMastered || 0} dominadas`;
}

/* =========================================================
   HABIT LOG
   ========================================================= */
function ensureHabitToday() {
  const k = todayKey();
  STATE.habit ||= { firstDay: null, days: {} };
  STATE.habit.days ||= {};
  if (!STATE.habit.firstDay) STATE.habit.firstDay = k;

  if (!STATE.habit.days[k]) {
    STATE.habit.days[k] = { ms: 0, cycles: 0, listens: 0, calls: 0 };
  }
  return k;
}

function getStudyMs() {
  ensureStudyDay();
  const st = STATE.session.study;
  const runningAdd = st.running && st.runStartAt ? (now() - st.runStartAt) : 0;
  return (st.totalMs || 0) + runningAdd;
}

function syncHabitMs() {
  const k = ensureHabitToday();
  const ms = getStudyMs();
  STATE.habit.days[k].ms = ms;
  saveStateDebounced();
}

function habitBump(_key, field, amount = 1) {
  const k = ensureHabitToday();
  STATE.habit.days[k][field] = (STATE.habit.days[k][field] || 0) + amount;
  saveStateDebounced();
}

/* ---------- topics helpers ---------- */
function getTopic(id) {
  return (STATE.bank.topics || []).find(t => t.id === id) || null;
}
function topicName(id) { return getTopic(id)?.name || "Sem tópico"; }

function ensureDefaultTopic() {
  let def = STATE.bank.topics.find(t => t.id === "topic_default");
  if (!def) {
    def = defaultTopic();
    STATE.bank.topics.unshift(def);
    saveStateDebounced();
  }
  return def;
}

function ensurePhrasesHaveValidTopicLive() {
  const changed = ensurePhrasesHaveValidTopic(STATE);
  if (changed) saveStateDebounced();
}

function createTopic(name) {
  const n = normalizeName(name);
  if (!n) return null;

  const exists = STATE.bank.topics.some(t => t.name.toLowerCase() === n.toLowerCase());
  if (exists) return null;

  const t = now();
  const id = uid("topic");
  const color = pickTopicColor(STATE.bank.topics.length);

  const topic = { id, name: n, color, createdAt: t, updatedAt: t };
  STATE.bank.topics.unshift(topic);

  STATE.ui.collapsedTopics ||= {};
  STATE.ui.collapsedTopics[id] = true;

  saveStateDebounced();
  return topic;
}

function deleteTopic(topicId) {
  const def = ensureDefaultTopic();
  if (topicId === def.id) return false;

  for (const p of STATE.bank.phrases) {
    if (p.topicId === topicId) p.topicId = def.id;
  }

  const idx = STATE.bank.topics.findIndex(t => t.id === topicId);
  if (idx >= 0) STATE.bank.topics.splice(idx, 1);

  if (STATE.ui?.collapsedTopics) delete STATE.ui.collapsedTopics[topicId];
  if (STATE.session.topicFilter === topicId) STATE.session.topicFilter = "ALL";

  saveStateDebounced();
  return true;
}

function topicPhraseIds(topicId) {
  return (STATE.bank.phrases || []).filter(p => p.topicId === topicId).map(p => p.id);
}

function clearTopic(topicId) {
  if (!topicId) return 0;

  const ids = new Set(topicPhraseIds(topicId));
  if (!ids.size) return 0;

  STATE.bank.phrases = STATE.bank.phrases.filter(p => !ids.has(p.id));
  for (const id of ids) delete STATE.progress[id];

  if (Array.isArray(STATE.session.queue) && STATE.session.queue.length) {
    STATE.session.queue = STATE.session.queue.filter(x => !ids.has(x));
  }

  if (ids.has(STATE.session.phraseId)) {
    STATE.session.phraseId = STATE.session.queue[0] || null;
    STATE.session.index = 0;
  }

  saveStateDebounced();
  return ids.size;
}

/* ---------- collapse behavior (default fechado) ---------- */
function isTopicCollapsed(id) {
  STATE.ui ||= {};
  STATE.ui.collapsedTopics ||= {};
  const v = STATE.ui.collapsedTopics[id];
  if (typeof v === "boolean") return v;
  return STATE.ui.collapsedDefault !== false;
}
function setTopicCollapsed(id, collapsed) {
  STATE.ui.collapsedTopics ||= {};
  STATE.ui.collapsedTopics[id] = !!collapsed;
  saveStateDebounced();
}
function collapseAllTopics() {
  STATE.ui.collapsedTopics ||= {};
  for (const t of (STATE.bank.topics || [])) STATE.ui.collapsedTopics[t.id] = true;
  saveStateDebounced();
}

/* ---------- session / queue ---------- */
function getProg(id) {
  if (!STATE.progress[id]) {
    STATE.progress[id] = { status:"training", cycleStart:14, count:14, masteredAt:null, history:[] };
  }
  return STATE.progress[id];
}

function phrasesByFilter() {
  const tf = STATE.session.topicFilter || "ALL";
  if (tf === "ALL") return STATE.bank.phrases;
  return STATE.bank.phrases.filter(p => p.topicId === tf);
}

function buildQueue() {
  const list = phrasesByFilter();
  const training = [];
  const mastered = [];
  for (const p of list) {
    const pr = getProg(p.id);
    (pr.status === "mastered" ? mastered : training).push(p.id);
  }
  return training.concat(mastered);
}

function startAuto() {
  unlockAudio();
  STATE.session.inProgress = true;
  STATE.session.queue = buildQueue();
  STATE.session.index = 0;
  STATE.session.phraseId = STATE.session.queue[0] || null;
  saveStateDebounced();
  refreshHUD();
  nav("#/105x");
}

function getPhrase(id) {
  return STATE.bank.phrases.find(p => p.id === id) || null;
}

function resetCountForPhrase(id) {
  const pr = getProg(id);
  const cs = clamp(pr.cycleStart || 14, 1, 14);
  pr.count = cs;
  saveStateDebounced();
}

function setPhraseById(id) {
  const idx = STATE.session.queue.indexOf(id);
  STATE.session.phraseId = id;
  if (idx >= 0) STATE.session.index = idx;
  resetCountForPhrase(id);
  saveStateDebounced();
}

function addCoins(amount) {
  STATE.stats.coins = (STATE.stats.coins || 0) + amount;
  STATE.stats.bestCoins = Math.max(STATE.stats.bestCoins || 0, STATE.stats.coins);
  saveStateDebounced();
  refreshHUD();
}

function nextPhrase() {
  const q = STATE.session.queue;
  if (!q.length) return;

  STATE.session.index = clamp(STATE.session.index + 1, 0, q.length - 1);
  STATE.session.phraseId = q[STATE.session.index];
  resetCountForPhrase(STATE.session.phraseId);
  saveStateDebounced();
}

function skipPhrase() {
  const q = STATE.session.queue;
  const current = STATE.session.phraseId;
  if (!current || !q.length) return;

  const idx = STATE.session.index;
  q.splice(idx, 1);
  q.push(current);

  STATE.session.index = clamp(idx, 0, q.length - 1);
  STATE.session.phraseId = q[STATE.session.index];

  resetCountForPhrase(STATE.session.phraseId);
  saveStateDebounced();

  toast("pulou. suave. próxima ✅");
  beep("tuk");
}

/* ---------- progresso panorâmico ---------- */
function sum1to(n) { return (n * (n + 1)) / 2; }

function phraseProgressPct(pr) {
  if (!pr) return 0;
  if (pr.status === "mastered") return 1;

  const cycleStart = clamp(pr.cycleStart || 14, 1, 14);
  const count = clamp(pr.count || cycleStart, 1, cycleStart);

  const total = 105;
  const remaining = count + sum1to(cycleStart - 1);
  const done = clamp(total - remaining, 0, total);

  return done / total;
}

function topicProgress(topicId) {
  const list = (STATE.bank.phrases || []).filter(p => p.topicId === topicId);
  if (!list.length) return 0;
  let sum = 0;
  for (const p of list) sum += phraseProgressPct(getProg(p.id));
  return clamp(sum / list.length, 0, 1);
}

/* ---------- karaoke ---------- */
function segmentText(text) { return [...String(text || "")]; }

function setKanaLine(el, rawText) {
  const hasFuri = jpHasFurigana(rawText);
  if (hasFuri) {
    el.innerHTML = jpToRubyHTML(rawText);
    el.dataset.mode = "ruby";
    return;
  }

  const segs = segmentText(rawText);
  el.innerHTML = segs.map((s, i) => `<span class="kseg" data-idx="${i}">${escapeHTML(s)}</span>`).join("");
  el.dataset.mode = "karaoke";
}

function karaokePlay(el, rawText, rate) {
  const segEls = el.querySelectorAll(".kseg");
  if (!segEls || segEls.length === 0) return;

  segEls.forEach(sp => sp.classList.remove("on"));

  const plain = rawText;
  const segs = segmentText(plain);

  const dur = estimateDurationMs(plain, rate);
  const n = segs.length || 1;
  const step = dur / n;

  let idx = 0;
  const t0 = now();
  karaokePlay._kill?.();

  let raf = null;
  const tick = () => {
    const elapsed = now() - t0;
    const target = clamp(Math.floor(elapsed / step), 0, n);
    while (idx < target) {
      const sp = el.querySelector(`.kseg[data-idx="${idx}"]`);
      if (sp) sp.classList.add("on");
      idx++;
    }
    if (idx < n) raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  karaokePlay._kill = () => {
    if (raf) cancelAnimationFrame(raf);
    karaokePlay._kill = null;
  };
}

function speakWithKaraoke(jpRaw, rate, kanaEl) {
  const plain = jpStripFurigana(jpRaw);

  STATE.stats.listens = (STATE.stats.listens || 0) + 1;
  habitBump(todayKey(), "listens", 1);

  const ok = ttsSpeak(
    plain,
    rate,
    () => karaokePlay(kanaEl, plain, rate),
    () => {}
  );

  if (!ok) toast("aguarda um instante (tts) ⏳");
}

function callAndResponse(jpRaw, rate, kanaEl, onDone) {
  const plain = jpStripFurigana(jpRaw);

  STATE.stats.calls = (STATE.stats.calls || 0) + 1;
  habitBump(todayKey(), "calls", 1);

  const ok = ttsSpeak(
    plain,
    rate,
    () => karaokePlay(kanaEl, plain, rate),
    () => {}
  );

  const t = estimateDurationMs(plain, rate);
  setTimeout(() => showNowYouSheet(onDone), t + 90);

  if (!ok) toast("aguarda um instante (tts) ⏳");
}

function showNowYouSheet(onDone) {
  const sheet = $("#cycleSheet");
  if (!sheet) return;

  sheet.style.display = "block";
  sheet.innerHTML = `
    <div class="stamp">agora você ✅</div>
    <div class="small">repete em voz alta. sem pressa.</div>
    <div class="row row--between">
      <div class="badge">tempo</div>
      <div class="badge" id="nyCount">2</div>
    </div>
  `;

  let c = 2;
  const tick = () => {
    c--;
    const el = $("#nyCount");
    if (el) el.textContent = String(Math.max(0, c));
    if (c <= 0) {
      sheet.style.display = "none";
      onDone && onDone();
      return;
    }
    setTimeout(tick, 1000);
  };
  setTimeout(tick, 1000);
}

/* ---------- 105X engine ---------- */
function onRepeat() {
  unlockAudio();

  const pid = STATE.session.phraseId;
  if (!pid) return;

  const p = getPhrase(pid);
  if (!p) return;

  const pr = getProg(pid);
  const cs = clamp(pr.cycleStart || 14, 1, 14);
  pr.count = clamp(pr.count || cs, 1, cs);

  if (pr.count > 1) {
    pr.count -= 1;
    pr.history.push({ at: now(), event: "rep", count: pr.count });
    saveStateDebounced();
    beep("pop");
    vibrate([8]);
    render105xBodyOnly();
    renderPhraseListOnly();
    return;
  }

  pr.history.push({ at: now(), event: "cycle_done", cycleStart: cs });

  STATE.stats.cyclesDone = (STATE.stats.cyclesDone || 0) + 1;
  habitBump(todayKey(), "cycles", 1);

  addCoins(100);
  floatCoin("+100 🪙");
  beep("ding");
  vibrate([12]);
  sparkOn($("#counterBox"));

  if (pr.cycleStart > 1) pr.cycleStart -= 1;
  else pr.cycleStart = 1;

  let masteredNow = false;
  if (pr.cycleStart === 1 && pr.status !== "mastered") {
    pr.status = "mastered";
    pr.masteredAt = now();
    STATE.stats.phrasesMastered = (STATE.stats.phrasesMastered || 0) + 1;

    addCoins(500);
    floatCoin("+500 🪙");
    beep("level");
    vibrate([10, 40, 10]);

    masteredNow = true;
  }

  pr.count = clamp(pr.cycleStart, 1, 14);
  saveStateDebounced();

  showCycleSheet(masteredNow);
  render105xBodyOnly();
  renderPhraseListOnly();
}

function showCycleSheet(masteredNow) {
  const sheet = $("#cycleSheet");
  if (!sheet) return;
  sheet.style.display = "block";

  const msg = masteredNow
    ? "frase dominada. você ficou mais rico ✅"
    : "ciclo fechado. mais 100 moedas 🪙";

  sheet.innerHTML = `
    <div class="stamp">parabéns 👏</div>
    <div class="small">${escapeHTML(msg)}</div>
    <div class="row">
      <button class="btn btn--ok btn--full" data-action="next">próxima frase 🔼</button>
    </div>
  `;
}

/* ---------- Timer (sessão hoje) ---------- */
let timerTickId = null;

function ensureStudyDay() {
  const k = todayKey();
  if (!STATE.session.study) STATE.session.study = { day: k, totalMs: 0, running: false, runStartAt: null };
  if (STATE.session.study.day !== k) {
    STATE.session.study.day = k;
    STATE.session.study.totalMs = 0;
    STATE.session.study.running = false;
    STATE.session.study.runStartAt = null;
    saveStateDebounced();
  }
  ensureHabitToday();
}

function startStudyTimerIfOn105x() {
  ensureStudyDay();

  const on105x = route() === "#/105x";
  const st = STATE.session.study;

  if (!on105x) {
    if (st.running && st.runStartAt) {
      st.totalMs += now() - st.runStartAt;
      st.running = false;
      st.runStartAt = null;
      saveStateDebounced();
    }
    stopTimerTick();
    syncHabitMs();
    return;
  }

  if (!st.running) {
    st.running = true;
    st.runStartAt = now();
    saveStateDebounced();
  }

  startTimerTick();
  updateStudyUI();
}

function stopTimerTick() {
  if (timerTickId) {
    clearInterval(timerTickId);
    timerTickId = null;
  }
}

function startTimerTick() {
  if (timerTickId) return;
  timerTickId = setInterval(() => {
    updateStudyUI();
    syncHabitMs();
  }, 1000);
}

function updateStudyUI() {
  const el = $("#studyTime");
  const fill = $("#studyFill");
  if (!el || !fill) return;

  const ms = getStudyMs();
  el.textContent = fmtHMSDays(ms);

  const goal = 10 * 60 * 1000;
  const pct = clamp(ms / goal, 0, 1);
  fill.style.transform = `scaleX(${pct})`;
}

/* =========================================================
   render
   ========================================================= */
function render() {
  refreshHUD();

  const r = route();
  const { params } = routeInfo();

  if (r === "#/home") return renderHome();
  if (r === "#/105x") return render105x();
  if (r === "#/edit") return renderEdit(params.id || null, params.from || null, params.topic || null);
  if (r === "#/manage") return renderManage();
  if (r === "#/backup") return renderBackup();
  if (r === "#/settings") return renderSettings();
  if (r === "#/skills") return renderSkills();

  nav("#/home");
}

/* ---------- HOME ---------- */
function renderHome() {
  ensurePhrasesHaveValidTopicLive();

  const topicFilter = STATE.session.topicFilter || "ALL";
  const topics = STATE.bank.topics || [];
  const filterLabel = topicFilter === "ALL" ? "tudo" : topicName(topicFilter);

  APP.innerHTML = `
    <div class="stack">
      <section class="card stack">
        <h1 class="h1">✨Super Memória✨</h1>
        <p class="p">hoje pode ser 2 minutos. já conta. sem culpa.</p>

        <button class="bigBtn" id="btnStart">COMEÇAR AGORA</button>

        <div class="sep"></div>

        <div class="sheet stack">
          <div class="row row--between">
            <div class="badge">separar por conteúdo</div>
            <div class="badge">agora: ${escapeHTML(filterLabel)}</div>
          </div>

          <div class="row">
            <select class="btn selectBtn" id="topicFilterSel" aria-label="filtro de tópicos">
              <option value="ALL">tudo</option>
              ${topics.map(t => `<option value="${t.id}" ${t.id===topicFilter?"selected":""}>${escapeHTML(t.name)}</option>`).join("")}
            </select>
            <button class="btn btn--ghost" data-nav="#/manage">gerenciar</button>
          </div>

          <div class="small">dica: filtro deixa seu treino mais “limpo”.</div>
        </div>

        <div class="row">
          <button class="btn" data-nav="#/105x">ir pro treino</button>
          <button class="btn" data-nav="#/edit">cadastro</button>
          <button class="btn" data-nav="#/backup">backup</button>
          <button class="btn btn--ghost" data-nav="#/skills">skills</button>
        </div>

        <div class="small">no fim de cada ciclo: +100 moedas 🪙</div>
      </section>

      <section class="card stack">
        <div class="row row--between">
          <div class="badge">seu tesouro</div>
          <div class="badge">🪙 ${STATE.stats.coins || 0}</div>
        </div>
        <div class="small">ciclos: ${STATE.stats.cyclesDone || 0} • dominadas: ${STATE.stats.phrasesMastered || 0}</div>
      </section>
    </div>
  `;

  $("#btnStart").addEventListener("click", () => {
    startAuto();
    toast("vamos. só 1 frase por vez ✅");
  });

  const sel = $("#topicFilterSel");
  if (sel) {
    sel.addEventListener("change", () => {
      STATE.session.topicFilter = sel.value;
      if (STATE.session.inProgress) {
        STATE.session.queue = buildQueue();
        STATE.session.index = 0;
        STATE.session.phraseId = STATE.session.queue[0] || null;
      }
      saveStateDebounced();
      toast("filtro aplicado ✅");
      beep("ding");
      render();
    });
  }
}

/* ---------- 105X ---------- */
function renderNewWords(list) {
  if (!Array.isArray(list) || list.length === 0) return "";
  const rows = list.map(w => `<div class="small"><b>${escapeHTML(w.jp)}</b> = ${escapeHTML(w.pt)}</div>`).join("");
  return `
    <div class="sheet">
      <div class="small" style="font-weight:1000;margin-bottom:6px">palavras novas</div>
      ${rows}
    </div>
  `;
}

function renderTopicMiniPills(selectedId) {
  const topics = STATE.bank.topics || [];
  return `
    <div class="topicPills">
      <button class="pill ${selectedId==="ALL"?"on":""}" data-action="topicFilter" data-id="ALL">tudo</button>
      ${topics.map(t => `
        <button class="pill ${t.id===selectedId?"on":""} ${t.color}" data-action="topicFilter" data-id="${t.id}">
          ${escapeHTML(t.name)}
        </button>
      `).join("")}
    </div>
  `;
}

function render105x() {
  ensurePhrasesHaveValidTopicLive();

  if (!STATE.session.inProgress) {
    startAuto();
    return;
  }

  if (!STATE.session.queue || !STATE.session.queue.length) {
    STATE.session.queue = buildQueue();
    STATE.session.index = 0;
    STATE.session.phraseId = STATE.session.queue[0] || null;
    saveStateDebounced();
  }

  if (!STATE.session.phraseId && STATE.session.queue.length) {
    STATE.session.phraseId = STATE.session.queue[0];
    STATE.session.index = 0;
    saveStateDebounced();
  }

  const curPhrase = getPhrase(STATE.session.phraseId);
  const curTopic = curPhrase ? getTopic(curPhrase.topicId) : null;

  APP.innerHTML = `
    <div class="stack">
      <section class="card stack viewRel" id="view105x">

        <div class="studyTop">
          <div class="badge">105x</div>

          <div class="studyActions">
            <button class="miniBtn" title="skills" aria-label="skills" data-nav="#/skills">🏅</button>
            <button class="miniBtn" title="editar frases" aria-label="editar frases" data-nav="#/manage">✏️</button>
            <div class="badge" style="margin-left:6px">${STATE.session.callMode ? "chamada on" : "chamada off"}</div>
          </div>
        </div>

        <div class="row row--between" style="gap:10px">
          <div class="badge ${curTopic ? curTopic.color : "tViolet"}">
            ${curTopic ? escapeHTML(curTopic.name) : "Sem tópico"}
          </div>
          <div></div>
        </div>

        ${renderTopicMiniPills(STATE.session.topicFilter || "ALL")}

        <div class="studyDock">
          <div class="studyRight">
            <div class="studyTimer" aria-label="tempo de estudo">
              <div class="studyTimerRow">
                <div class="studyTime"><span class="ic">⏱</span> <span id="studyTime">00:00:00 (0d)</span></div>
                <div class="studyHint">Tempo Dedicado</div>
              </div>
              <div class="studyBar"><div class="studyFill" id="studyFill"></div></div>
            </div>

            <button class="btn btn--ghost callBtn" data-action="toggleCall">
              ${STATE.session.callMode ? "call: on" : "call: off"}
            </button>
          </div>
        </div>

        <div class="phraseArea" aria-label="frase em treino">
          <div class="counterMini" id="counterBox" aria-label="contador">
            <div class="counterVal" id="countVal">-</div>
            <div class="counterSub" id="cycleSub">ciclo</div>
          </div>

          <div class="kana" id="kanaLine"></div>
          <div class="pt" id="ptLine"></div>
        </div>

        <div id="newWordsBox"></div>

        <div class="primaryRow">
          <button class="primaryAction" data-action="repeat">repeti e entendi ✅</button>
        </div>

        <div class="row">
          <button class="btn btn--muted" data-action="speak" data-rate="1">ouvir normal</button>
          <button class="btn btn--muted" data-action="speak" data-rate="0.8">ouvir lento</button>
          <button class="btn btn--muted" data-action="skip">pular</button>
        </div>

        <div id="cycleSheet" class="sheet stack" style="display:none"></div>

        <div class="row">
          <button class="btn" data-action="next">próxima frase</button>
          <button class="btn" data-nav="#/home">sair</button>
        </div>
      </section>

      <section class="card stack">
        <div class="row row--between">
          <div class="badge">todas as frases</div>
          <div class="small">organizado por tópicos</div>
        </div>
        <div class="list" id="phraseList"></div>
      </section>
    </div>
  `;

  render105xBodyOnly();
  renderPhraseListOnly();

  startStudyTimerIfOn105x();
  ensureBackTopButton();
  updateBackTopVisibility();
}

/* ✅ render header compatível com SEU CSS */
function renderTopicHeader(topic, count, collapsed, pct, dragEnabled) {
  const pctTxt = `${Math.round(pct * 100)}%`;
  return `
    <button class="topicHdr ${topic.color}" data-action="toggleTopic" data-id="${topic.id}">
      <div class="topicHdrTop">
        <div class="topicHdrL">
          <span class="topicDot"></span>
          <span class="topicName">${escapeHTML(topic.name)}</span>
          <span class="topicCount">${count}</span>
        </div>

        <div class="topicHdrR">
          ${dragEnabled ? `<span class="topicDrag" title="segure e arraste tópico" aria-label="segure e arraste tópico">≡</span>` : ``}
          <span class="topicChevron">${collapsed ? "▾" : "▴"}</span>
        </div>
      </div>

      <div class="topicProgRow" aria-label="progresso do tópico">
        <div class="topicProg"><div class="topicProgFill" style="transform:scaleX(${pct})"></div></div>
        <div class="topicPct">${pctTxt}</div>
      </div>
    </button>
  `;
}

function renderPhraseListOnly() {
  const box = $("#phraseList");
  if (!box) return;

  ensurePhrasesHaveValidTopicLive();

  const byTopic = new Map();
  const phrases = phrasesByFilter();
  const topics = STATE.bank.topics || [];

  for (const t of topics) byTopic.set(t.id, []);
  byTopic.set("_missing", []);

  for (const p of phrases) {
    if (byTopic.has(p.topicId)) byTopic.get(p.topicId).push(p);
    else byTopic.get("_missing").push(p);
  }

  const frag = document.createDocumentFragment();

  for (const t of topics) {
    const list = byTopic.get(t.id) || [];
    if (!list.length) continue;

    const collapsed = isTopicCollapsed(t.id);
    const wrap = document.createElement("div");
    wrap.className = "topicGroup";
    wrap.dataset.topicItem = "1";
    wrap.dataset.id = t.id;

    const pct = topicProgress(t.id);

    wrap.innerHTML = `
      ${renderTopicHeader(t, list.length, collapsed, pct, false)}
      <div class="topicBody ${collapsed ? "isCollapsed" : ""} scrollBox">
        ${list.map(x => {
          const pr = getProg(x.id);
          const st = pr.status === "mastered" ? "dominada ✓" : "treino";
          const pct2 = phraseProgressPct(pr);
          const pctTxt2 = Math.round(pct2 * 100);
          return `
            <div class="item">
              <div class="itemTop">
                <div style="min-width:0">
                  <p class="itemTitle">${escapeHTML(jpStripFurigana(x.jp))}</p>
                  <div class="itemMeta">${escapeHTML(x.pt)} • ${st}</div>

                  <div class="pWrap" aria-label="progresso">
                    <div class="pBar"><div class="pFill" style="transform:scaleX(${pct2})"></div></div>
                    <div class="pTxt">${pctTxt2}%</div>
                  </div>
                </div>
                <button class="btn" data-action="gotoStudy" data-id="${x.id}">ESTUDAR</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
    frag.appendChild(wrap);
  }

  box.innerHTML = "";
  box.appendChild(frag);
}

function render105xBodyOnly() {
  const pid = STATE.session.phraseId;
  const p = getPhrase(pid);
  const pr = getProg(pid);
  if (!p) return;

  const cs = clamp(pr.cycleStart || 14, 1, 14);
  const count = clamp(pr.count || cs, 1, cs);

  $("#countVal").textContent = String(count);
  $("#cycleSub").textContent = `ciclo ${cs} → 1`;

  const kanaEl = $("#kanaLine");
  setKanaLine(kanaEl, p.jp);

  $("#ptLine").textContent = p.pt;

  const nw = $("#newWordsBox");
  nw.innerHTML = renderNewWords(p.newWords || []);

  const sheet = $("#cycleSheet");
  if (sheet && sheet.style.display === "block" && count > 1) {
    sheet.style.display = "none";
  }
}

/* ---------- cadastro / editar ---------- */
function parseNewWords(input) {
  const raw = String(input || "").trim();
  if (!raw) return [];
  const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
  const out = [];
  for (const part of parts) {
    const [jp, pt] = part.split("=").map(s => (s || "").trim());
    if (!jp || !pt) continue;
    out.push({ jp, pt });
  }
  return out;
}

function renderTopicSelect(selectedId) {
  const topics = STATE.bank.topics || [];
  const sel = selectedId || (ensureDefaultTopic().id);
  return `
    <select class="btn selectBtn" id="topicSel" aria-label="selecionar tópico">
      ${topics.map(t => `<option value="${t.id}" ${t.id===sel?"selected":""}>${escapeHTML(t.name)}</option>`).join("")}
    </select>
  `;
}

function renderEdit(editingId = null, from = null, preTopic = null) {
  ensurePhrasesHaveValidTopicLive();

  const editing = editingId ? getPhrase(editingId) : null;

  const jpVal = editing ? editing.jp : "";
  const ptVal = editing ? editing.pt : "";
  const nwVal = editing && Array.isArray(editing.newWords)
    ? editing.newWords.map(x => `${x.jp}=${x.pt}`).join(", ")
    : "";

  const topicId = editing
    ? (editing.topicId || ensureDefaultTopic().id)
    : (preTopic && getTopic(preTopic) ? preTopic : ensureDefaultTopic().id);

  const backHash =
    from === "manage" ? "#/manage" :
    from === "105x" ? "#/105x" :
    "#/home";

  APP.innerHTML = `
    <div class="stack">
      <section class="card stack">
        <div class="row row--between">
          <div class="badge">${editing ? "editar frase" : "cadastro"}</div>
          <button class="btn" data-nav="${backHash}">voltar</button>
        </div>

        <div class="sheet stack">
          <div class="row row--between" style="gap:10px">
            <div class="badge">separar por conteúdo</div>
            <button class="btn btn--ghost" data-nav="#/manage">gerenciar</button>
          </div>

          ${renderTopicSelect(topicId)}

          <div class="sep"></div>

          <div class="small">jp (aceita kanji. furigana manual: 仕事{しごと}. parênteses （ ） ok)</div>
          <input id="inJp" class="btn" style="height:56px; width:100%; text-align:left" placeholder="ex: 私{わたし} の名前{なまえ} は あきおです。" value="${escapeHTML(jpVal)}" />
          <div class="small">pt</div>
          <input id="inPt" class="btn" style="height:56px; width:100%; text-align:left" placeholder="ex: meu nome é Akio." value="${escapeHTML(ptVal)}" />
          <div class="small">palavras novas (opcional) formato: jp=pt, jp=pt</div>
          <input id="inNW" class="btn" style="height:56px; width:100%; text-align:left" placeholder="ex: 名前{なまえ}=nome" value="${escapeHTML(nwVal)}" />

          <button class="btn btn--ok btn--full" data-action="${editing ? "saveEdit" : "addPhrase"}" data-id="${editing ? editing.id : ""}">
            ${editing ? "salvar alterações" : "salvar frase"}
          </button>

          ${editing ? `
            <div class="grid2">
              <button class="btn btn--muted btn--full" data-action="retrain" data-id="${editing.id}">re-treinar</button>
              <button class="btn btn--bad btn--full" data-action="deletePhrase" data-id="${editing.id}">excluir</button>
            </div>
          ` : ""}

          <div class="small" id="editMsg"></div>
        </div>
      </section>
    </div>
  `;
}

/* ---------- GERENCIAR ---------- */
let DRAG = null;
let TOPIC_DRAG = null;

function initReorderable() { DRAG = null; }
function initTopicReorderable() { TOPIC_DRAG = null; }

function applyTopicOrder(topicId, orderedIds) {
  if (!topicId || !Array.isArray(orderedIds) || !orderedIds.length) return;

  const set = new Set(orderedIds);
  const arr = STATE.bank.phrases;

  let firstIndex = -1;
  for (let i = 0; i < arr.length; i++) {
    if (set.has(arr[i].id)) { firstIndex = i; break; }
  }
  if (firstIndex < 0) firstIndex = arr.length;

  const removed = [];
  const kept = [];
  for (const p of arr) {
    if (set.has(p.id)) removed.push(p);
    else kept.push(p);
  }

  const map = new Map(removed.map(p => [p.id, p]));
  const ordered = orderedIds.map(id => map.get(id)).filter(Boolean);

  kept.splice(firstIndex, 0, ...ordered);

  STATE.bank.phrases = kept;
  saveStateDebounced();
}

function applyTopicsOrder(orderedTopicIds) {
  if (!Array.isArray(orderedTopicIds) || !orderedTopicIds.length) return;
  const map = new Map((STATE.bank.topics || []).map(t => [t.id, t]));
  const ordered = orderedTopicIds.map(id => map.get(id)).filter(Boolean);

  if (!ordered.find(t => t.id === "topic_default")) {
    ordered.unshift(ensureDefaultTopic());
  }

  STATE.bank.topics = ordered;
  saveStateDebounced();
}

function deletePhraseById(id) {
  const idx = STATE.bank.phrases.findIndex(p => p.id === id);
  if (idx < 0) return false;

  STATE.bank.phrases.splice(idx, 1);
  delete STATE.progress[id];

  if (Array.isArray(STATE.session.queue) && STATE.session.queue.length) {
    STATE.session.queue = STATE.session.queue.filter(x => x !== id);
  }

  if (STATE.session.phraseId === id) {
    if (!STATE.session.queue.length) {
      STATE.session.phraseId = null;
      STATE.session.index = 0;
    } else {
      STATE.session.index = clamp(STATE.session.index, 0, STATE.session.queue.length - 1);
      STATE.session.phraseId = STATE.session.queue[STATE.session.index] || STATE.session.queue[0];
      resetCountForPhrase(STATE.session.phraseId);
    }
  }

  saveStateDebounced();
  return true;
}

function retrainPhrase(id) {
  const pr = getProg(id);
  pr.status = "training";
  pr.cycleStart = 14;
  pr.count = 14;
  pr.masteredAt = null;
  pr.history = Array.isArray(pr.history) ? pr.history : [];
  pr.history.push({ at: now(), event: "retrain" });
  saveStateDebounced();
}

function renderManage() {
  ensurePhrasesHaveValidTopicLive();

  const def = ensureDefaultTopic();
  const topics = STATE.bank.topics || [];

  const byTopic = new Map();
  for (const t of topics) byTopic.set(t.id, []);
  for (const p of STATE.bank.phrases) {
    if (!byTopic.has(p.topicId)) byTopic.set(def.id, byTopic.get(def.id) || []);
    (byTopic.get(p.topicId) || byTopic.get(def.id)).push(p);
  }

  APP.innerHTML = `
    <div class="stack">
      <section class="card stack">
        <div class="row row--between">
          <div class="badge">gerenciar</div>
          <button class="btn" data-nav="#/home">voltar</button>
        </div>

        <div class="sheet stack">
          <div class="small">criar tópico novo</div>
          <div class="row" style="gap:10px; flex-wrap:nowrap">
            <input id="topicNewName2" class="btn" style="flex:1; min-width:0" placeholder="ex: fábrica, segurança, aeroporto..." />
            <button class="btn btn--ok" data-action="addTopic">adicionar</button>
          </div>
          <div class="small" id="topicMsg"></div>
        </div>

        <div class="sep"></div>

        <div class="row row--between">
          <div class="badge">tópicos + frases</div>
          <button class="btn btn--ghost" data-nav="#/edit?from=manage">novo cadastro</button>
        </div>

        <div class="small">furigana em cima usando { }. exemplo: 名前{なまえ}</div>

        <div class="list" id="manageTopics"></div>
      </section>
    </div>
  `;

  const root = $("#manageTopics");
  const frag = document.createDocumentFragment();

  for (const t of topics) {
    const list = byTopic.get(t.id) || [];
    const isCollapsed = isTopicCollapsed(t.id);

    const canDeleteTopic = t.id !== def.id;
    const hasPhrases = list.length > 0;

    const wrap = document.createElement("div");
    wrap.className = "topicGroup";
    wrap.dataset.topicItem = "1";
    wrap.dataset.id = t.id;

    const pct = topicProgress(t.id);

    const headerHtml = renderTopicHeader(t, list.length, isCollapsed, pct, true);

    const toolsHtml = `
      <div class="topicTools">
        <button class="btn btn--ok" data-action="addPhraseToTopic" data-id="${t.id}">adicionar</button>
        ${hasPhrases ? `<button class="btn btn--muted" data-action="clearTopic" data-id="${t.id}">limpar</button>` : ``}
        ${canDeleteTopic ? `<button class="btn btn--bad" data-action="deleteTopic" data-id="${t.id}">excluir</button>` : `<span class="badge">fixo</span>`}
      </div>
    `;

    const bodyHtml = `
      <div class="topicBody ${isCollapsed ? "isCollapsed" : ""} scrollBox">
        ${toolsHtml}
        ${hasPhrases ? `
          <div class="reorderList" data-reorder-list="1" data-topic="${t.id}">
            ${list.map(p => {
              const pr = getProg(p.id);
              const st = pr.status === "mastered" ? "dominada ✓" : "treino";
              return `
                <div class="reorderItem" data-reorder-item="1" data-topic="${t.id}" data-id="${p.id}">
                  <div class="reorderTop">
                    <div class="reorderLeft">
                      <p class="itemTitle">${escapeHTML(jpStripFurigana(p.jp))}</p>
                      <div class="itemMeta">${escapeHTML(p.pt)} • ${st}</div>
                    </div>

                    <div class="manageBtns" style="gap:8px">
                      <div class="dragHandle" title="segure e arraste" aria-label="segure e arraste" data-action="dragHandle">≡</div>
                      <button class="btn btn--ghost" data-action="gotoStudy" data-id="${p.id}">estudar</button>
                      <button class="btn btn--ghost" data-action="editPhrase" data-id="${p.id}">editar</button>
                      <button class="btn btn--muted" data-action="retrain" data-id="${p.id}">re-treinar</button>
                      <button class="btn btn--bad" data-action="deletePhrase" data-id="${p.id}">excluir</button>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
          <div class="small">dica: segure no ≡ e arraste para ordenar.</div>
        ` : `
          <div class="sheet stack">
            <div class="small">sem frases aqui ainda.</div>
          </div>
        `}
      </div>
    `;

    wrap.innerHTML = `${headerHtml}${bodyHtml}`;
    frag.appendChild(wrap);
  }

  root.innerHTML = "";
  root.appendChild(frag);

  initReorderable();
  initTopicReorderable();
}

/* =========================================================
   Voltar ao topo (FAB)
   ========================================================= */
function ensureBackTopButton() {
  if (document.getElementById("backTop")) return;

  const btn = document.createElement("button");
  btn.id = "backTop";
  btn.type = "button";
  btn.setAttribute("aria-label", "voltar ao topo");
  btn.innerHTML = `<span class="ic">↑</span>`;
  document.body.appendChild(btn);

  btn.addEventListener("click", () => {
    unlockAudio();
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) window.scrollTo(0, 0);
    else window.scrollTo({ top: 0, behavior: "smooth" });

    try { beep("pop"); } catch {}
    try { vibrate([8]); } catch {}
  }, { passive: true });
}

let backTopTicking = false;
function updateBackTopVisibility() {
  const btn = document.getElementById("backTop");
  if (!btn) return;
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  btn.classList.toggle("on", y > 220);
}
function hookBackTopScroll() {
  window.addEventListener("scroll", () => {
    if (backTopTicking) return;
    backTopTicking = true;
    requestAnimationFrame(() => {
      backTopTicking = false;
      updateBackTopVisibility();
    });
  }, { passive: true });
}

/* =========================================================
   SKILLS (incremento real)
   ========================================================= */

function isAliveDay(dayObj) {
  const ms = Number(dayObj?.ms || 0);
  const cycles = Number(dayObj?.cycles || 0);
  return (ms >= 2 * 60 * 1000) || (cycles >= 1);
}

function parseDayKeyToTS(k) {
  // k: YYYY-MM-DD
  const [y, m, d] = String(k || "").split("-").map(n => Number(n));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

function collectDaysSorted() {
  const days = STATE.habit?.days || {};
  const keys = Object.keys(days).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
  keys.sort((a, b) => (parseDayKeyToTS(a) || 0) - (parseDayKeyToTS(b) || 0));
  return keys.map(k => ({ k, ts: parseDayKeyToTS(k) || 0, v: days[k] || {} }));
}

function calcAliveDays() {
  const all = collectDaysSorted();
  let alive = 0;
  for (const d of all) if (isAliveDay(d.v)) alive++;
  return alive;
}

function calcAliveStreak() {
  const days = STATE.habit?.days || {};
  const kToday = todayKey();
  let streak = 0;

  // anda pra trás enquanto for "dia vivo"
  let ts = parseDayKeyToTS(kToday);
  for (let i = 0; i < 5000; i++) {
    const d = new Date(ts);
    const kk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const obj = days[kk];
    if (!obj || !isAliveDay(obj)) break;
    streak++;
    ts = addDaysTS(ts, -1);
  }
  return streak;
}

function sumStudyTotalMs() {
  const all = collectDaysSorted();
  let sum = 0;
  for (const d of all) sum += Number(d.v?.ms || 0);
  return sum;
}

function avgMinPerDayLast7() {
  const days = STATE.habit?.days || {};
  const tsToday = parseDayKeyToTS(todayKey()) || now();
  let sumMs = 0;

  for (let i = 0; i < 7; i++) {
    const ts = addDaysTS(tsToday, -i);
    const d = new Date(ts);
    const kk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    sumMs += Number(days[kk]?.ms || 0);
  }
  const min = (sumMs / 60000) / 7;
  return Math.max(0, min);
}

function projectDateByMinutesGoal(goalMin, avgMinDay) {
  if (!avgMinDay || avgMinDay <= 0.01) return null;
  const totalMin = sumStudyTotalMs() / 60000;
  const remaining = Math.max(0, goalMin - totalMin);
  const daysNeed = remaining / avgMinDay;
  return addDaysTS(parseDayKeyToTS(todayKey()) || now(), Math.ceil(daysNeed));
}

function rankSpec() {
  return [
    { key:"bronze", name:"Bronze", icon:"🥉", days: 7 },
    { key:"aco", name:"Aço", icon:"🛡️", days: 30 },
    { key:"ouro", name:"Ouro", icon:"🥇", days: 90 },
    { key:"platina", name:"Platina", icon:"💠", days: 150 },
    { key:"diamante", name:"Diamante", icon:"💎", days: 210 },
    { key:"fluencia", name:"Fluência", icon:"🌸", days: 270 },
  ];
}

function currentRankByAliveDays(aliveDays) {
  const list = rankSpec();
  let cur = list[0];
  for (const r of list) {
    if (aliveDays >= r.days) cur = r;
  }
  const next = list.find(r => r.days > aliveDays) || null;
  return { cur, next, list };
}

function pct(x) { return `${Math.round(clamp(x, 0, 1) * 100)}%`; }

function renderSkills() {
  ensureHabitToday();
  const aliveDays = calcAliveDays();
  const streak = calcAliveStreak();

  const { cur, next, list } = currentRankByAliveDays(aliveDays);

  const avg7 = avgMinPerDayLast7();
  const avgTxt = avg7 ? `${avg7.toFixed(1)} min/dia` : "0.0 min/dia";

  // Meta de fluência (minutos): 270 dias * 10 min/dia = 2700 min (leve, mas viciante e realista pro app)
  const goalMin = 270 * 10;
  const totalMin = sumStudyTotalMs() / 60000;
  const fluPct = clamp(totalMin / goalMin, 0, 1);
  const etaTs = projectDateByMinutesGoal(goalMin, avg7);

  const nextLabel = next ? `próxima: ${next.icon} ${next.name} (${next.days} dias)` : "no topo 👑";
  const etaLabel = etaTs ? fmtDateShort(etaTs) : "—";

  const tlFill = clamp(aliveDays / 270, 0, 1);

  // mini skills (leve, só pra dar sensação de progresso)
  const aliveSafe = Math.max(1, aliveDays);
  const listens = Number(STATE.stats.listens || 0);
  const calls = Number(STATE.stats.calls || 0);
  const cycles = Number(STATE.stats.cyclesDone || 0);
  const mastered = Number(STATE.stats.phrasesMastered || 0);
  const coins = Number(STATE.stats.coins || 0);

  const audition = clamp((listens / (aliveSafe * 5)), 0, 1);
  const talk = clamp((calls / (aliveSafe * 3)), 0, 1);
  const repetition = clamp((cycles / (aliveSafe * 2)), 0, 1);
  const vocab = clamp((mastered / (aliveSafe * 0.2)), 0, 1);
  const confidence = clamp((coins / (aliveSafe * 200)), 0, 1);

  APP.innerHTML = `
    <div class="stack">
      <section class="card stack">
        <div class="row row--between">
          <div class="badge">skills</div>
          <button class="btn" data-nav="#/home">voltar</button>
        </div>

        <div class="skillsRankCard">
          <div class="rankHead">
            <div class="rankIcon">${cur.icon}</div>
            <div style="text-align:left">
              <p class="rankTitle">${escapeHTML(cur.name)}</p>
              <p class="rankSub">o nihongo não é tão estranho assim</p>
            </div>
          </div>

          <div class="rankPills">
            <div class="rankPill">${streak} dias vivos</div>
            <div class="rankPill">${escapeHTML(nextLabel)}</div>
          </div>

          <div class="skillsBarRow">
            <div class="skillsBarLabel">progresso até fluência</div>
            <div class="rankPill skillsPctBadge">${pct(fluPct)}</div>
          </div>

          <div class="pWrap" style="margin-top:10px">
            <div class="pBar"><div class="pFill" style="transform:scaleX(${fluPct})"></div></div>
            <div class="pTxt">${pct(fluPct)}</div>
          </div>

          <div class="small" style="margin-top:8px">
            se continuar no ritmo (${escapeHTML(avgTxt)}), fluência em: <b>${escapeHTML(etaLabel)}</b>
          </div>
        </div>

        <div class="tlWrap">
          <div class="row row--between">
            <div class="rankPill">linha do tempo</div>
            <div class="rankPill">meta: 9 meses</div>
          </div>

          <div class="tlLine" aria-label="linha do tempo">
            <div class="tlFill" style="transform:scaleX(${tlFill})"></div>
          </div>

          <div class="tlDots" aria-hidden="true">
            ${list.map(r => {
              const done = aliveDays >= r.days;
              const isNow = cur.key === r.key;
              return `<div class="tlDot ${done ? "done" : ""} ${isNow ? "now" : ""}"></div>`;
            }).join("")}
          </div>

          <div class="small" style="margin-top:10px">
            dica: “dia vivo” = 2 min ou 1 ciclo. sem culpa.
          </div>
        </div>

        <div class="rankList">
          <div class="row row--between" style="margin-bottom:4px">
            <div class="rankPill">projeção de ranks</div>
            <div class="rankPill">${escapeHTML(avgTxt)}</div>
          </div>

          ${list.map(r => {
            const done = aliveDays >= r.days;
            const remaining = Math.max(0, r.days - aliveDays);
            const ts = done ? null : addDaysTS(parseDayKeyToTS(todayKey()) || now(), remaining);
            const right = done ? "feito ✅" : fmtDateShort(ts || now());
            return `
              <div class="rankRow">
                <div class="left">
                  <div class="name">${r.icon} ${escapeHTML(r.name)}</div>
                  <div class="meta">(${r.days} dias)</div>
                </div>
                <div class="rankPill rankRightPill">${escapeHTML(right)}</div>
              </div>
            `;
          }).join("")}
        </div>

        <div class="miniSkills">
          <div class="row row--between" style="margin-bottom:4px">
            <div class="rankPill">mini skills</div>
            <div class="rankPill">panorama</div>
          </div>

          ${[
            { icon:"🎧", title:"audição", desc:"quanto mais você ouve, menos pensa", v: audition },
            { icon:"🗣️", title:"fala", desc:"call and response deixa a boca solta", v: talk },
            { icon:"🔁", title:"repetição", desc:"o ouro vem do ciclo fechado", v: repetition },
            { icon:"📦", title:"vocab", desc:"palavras viram ferramentas", v: vocab },
            { icon:"✨", title:"confiança", desc:"a soma silenciosa do dia a dia", v: confidence },
          ].map(s => {
            const p = clamp(s.v, 0, 1);
            return `
              <div class="miniSkill">
                <div>
                  <div class="t">${s.icon} ${escapeHTML(s.title)}</div>
                  <div class="d">${escapeHTML(s.desc)}</div>
                </div>
                <div class="miniBarRow">
                  <div class="pBar"><div class="pFill" style="transform:scaleX(${p})"></div></div>
                </div>
                <div class="pTxt">${pct(p)}</div>
              </div>
            `;
          }).join("")}

          <div class="small" style="text-align:center;margin-top:10px">
            você não precisa vencer o dia. só precisa encostar nele por 2 minutos.
          </div>
        </div>
      </section>
    </div>
  `;

  ensureBackTopButton();
  updateBackTopVisibility();
}

/* =========================================================
   BACKUP (incremento real)
   ========================================================= */

function buildBackupFilename() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `nihongo321_backup_${y}${m}${dd}_${hh}${mm}.json`;
}

function exportStateJSON() {
  // compacto porém legível
  try { return JSON.stringify(STATE, null, 2); } catch { return ""; }
}

async function copyTextToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return !!ok;
  } catch {
    return false;
  }
}

function importStateFromString(str) {
  const parsed = safeJSONParse(String(str || "").trim());
  if (!parsed) return { ok: false, msg: "json inválido." };

  const st = sanitizeState(parsed);
  STATE = st;
  saveStateNow();
  refreshHUD();
  return { ok: true, msg: "importado ✅" };
}

function renderBackup() {
  APP.innerHTML = `
    <div class="stack">
      <section class="card stack">
        <div class="row row--between">
          <div class="badge">backup</div>
          <button class="btn" data-nav="#/home">voltar</button>
        </div>

        <div class="sheet stack" style="text-align:left">
          <div class="badge">exportar</div>
          <div class="small">no celular, “baixar arquivo” costuma ser o mais confiável ✅</div>

          <button class="bigBtn" data-action="copyBackup">copiar json</button>
          <button class="bigBtn" data-action="downloadBackup">baixar arquivo</button>
        </div>

        <div class="sheet stack" style="text-align:left">
          <div class="badge">importar</div>

          <div class="grid2">
            <button class="btn btn--full" data-action="importFromText">importar do texto</button>
            <button class="btn btn--full" data-action="triggerImportFile">importar arquivo</button>
          </div>

          <div class="small">cole aqui para importar</div>
          <textarea id="backupText" class="backupField" placeholder="cole aqui o JSON do backup..."></textarea>

          <input id="backupFile" type="file" accept="application/json,.json" style="display:none" />

          <div class="small" style="margin-top:6px">
            como usar no celular:<br/>
            1) exportar: baixar arquivo (ou copiar) e mandar no whatsapp pra você mesmo<br/>
            2) importar: abrir o arquivo e importar aqui
          </div>
        </div>
      </section>
    </div>
  `;

  const file = $("#backupFile");
  if (file) {
    file.onchange = async () => {
      try {
        const f = file.files && file.files[0];
        if (!f) return;
        const text = await f.text();
        const r = importStateFromString(text);
        if (!r.ok) { toast(r.msg); beep("tuk"); return; }
        toast("importado ✅");
        beep("ding");
        nav("#/home");
      } catch {
        toast("falha ao importar arquivo");
        beep("tuk");
      } finally {
        try { file.value = ""; } catch {}
      }
    };
  }
}

/* =========================================================
   Click delegation + drag (Pointer)
   ========================================================= */

/* ✅ suprime click fantasma após drag */
let SUPPRESS_CLICK_UNTIL = 0;

document.addEventListener("click", (e) => {
  if (now() < SUPPRESS_CLICK_UNTIL) return;

  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.nav) {
    nav(btn.dataset.nav);
    return;
  }

  const act = btn.dataset.action;

  if (act === "toggleTopic") {
    /* ✅ se clicou no drag handle, não alterna */
    if (e.target.closest(".topicDrag")) return;

    const id = btn.dataset.id;
    if (!id) return;

    const nextCollapsed = !isTopicCollapsed(id);
    setTopicCollapsed(id, nextCollapsed);
    render();
    return;
  }

  if (act === "repeat") { onRepeat(); return; }

  if (act === "skip") {
    unlockAudio();
    skipPhrase();
    render105xBodyOnly();
    renderPhraseListOnly();
    return;
  }

  if (act === "next") {
    unlockAudio();
    nextPhrase();
    toast("próxima ✅");
    beep("pop");
    render105xBodyOnly();
    renderPhraseListOnly();
    return;
  }

  if (act === "gotoStudy") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;

    if (!STATE.session.inProgress) startAuto();
    else {
      STATE.session.queue = buildQueue();
      if (!STATE.session.queue.includes(id)) {
        STATE.session.topicFilter = "ALL";
        STATE.session.queue = buildQueue();
      }
      saveStateDebounced();
    }

    setPhraseById(id);
    collapseAllTopics();

    toast("frase carregada ✅");
    beep("pop");
    nav("#/105x");
    return;
  }

  if (act === "topicFilter") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;

    STATE.session.topicFilter = id;
    STATE.session.queue = buildQueue();
    STATE.session.index = 0;
    STATE.session.phraseId = STATE.session.queue[0] || null;

    saveStateDebounced();
    toast(id === "ALL" ? "treino: tudo ✅" : `treino: ${topicName(id)} ✅`);
    beep("ding");
    render();
    return;
  }

  if (act === "toggleCall") {
    unlockAudio();
    STATE.session.callMode = !STATE.session.callMode;
    saveStateDebounced();
    toast(STATE.session.callMode ? "call and response: on" : "call and response: off");
    render();
    return;
  }

  if (act === "speak") {
    unlockAudio();
    const rate = Number(btn.dataset.rate || "1");
    const pid = STATE.session.phraseId;
    const p = getPhrase(pid);
    const kanaEl = $("#kanaLine");
    if (!p || !kanaEl) return;

    if (STATE.session.callMode) callAndResponse(p.jp, rate, kanaEl, () => {});
    else speakWithKaraoke(p.jp, rate, kanaEl);
    return;
  }

  if (act === "addTopic") {
    unlockAudio();
    const input = $("#topicNewName2");
    const msg = $("#topicMsg");
    if (!input || !msg) return;

    const topic = createTopic(input.value);
    if (!topic) {
      msg.textContent = "nome vazio ou já existe.";
      toast("tópico inválido");
      beep("tuk");
      return;
    }

    input.value = "";
    msg.textContent = "criado ✅";
    toast("tópico criado ✅");
    beep("ding");
    renderManage();
    return;
  }

  if (act === "deleteTopic") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;

    const ok = confirm("excluir tópico? as frases vão para Frases aleatórias.");
    if (!ok) return;

    const done = deleteTopic(id);
    if (!done) return;

    toast("tópico excluído ✅");
    beep("tuk");
    renderManage();
    return;
  }

  if (act === "clearTopic") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;

    const name = topicName(id);
    const ok = confirm(`apagar todas as frases de "${name}"? (sem desfazer)`);
    if (!ok) return;

    const n = clearTopic(id);
    toast(n ? `apagou ${n} frases ✅` : "nada pra apagar");
    beep(n ? "ding" : "tuk");
    renderManage();
    return;
  }

  if (act === "addPhraseToTopic") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;
    nav(`#/edit?topic=${encodeURIComponent(id)}&from=manage`);
    return;
  }

  if (act === "editPhrase") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;
    nav(`#/edit?id=${encodeURIComponent(id)}&from=manage`);
    return;
  }

  if (act === "retrain") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;
    const ok = confirm("re-treinar esta frase? (reseta o progresso dela)");
    if (!ok) return;
    retrainPhrase(id);
    toast("re-treino aplicado ✅");
    beep("ding");
    render();
    return;
  }

  if (act === "addPhrase") {
    unlockAudio();
    const jp = ($("#inJp")?.value || "").trim();
    const pt = ($("#inPt")?.value || "").trim();
    const nw = parseNewWords($("#inNW")?.value || "");
    const msg = $("#editMsg");
    const topicId = ($("#topicSel")?.value || ensureDefaultTopic().id);

    if (!jp || !pt) { msg.textContent = "preencha jp e pt."; toast("faltou jp/pt"); beep("tuk"); return; }
    if (!isValidJP(jp)) { msg.textContent = "jp inválido. confira { } e caracteres."; toast("jp inválido"); beep("tuk"); return; }
    for (const w of nw) {
      if (!isValidJP(w.jp)) { msg.textContent = "palavra nova jp inválida."; toast("palavra inválida"); beep("tuk"); return; }
    }

    const t = now();
    const id = uid("ph");

    STATE.bank.phrases.unshift({ id, jp, pt, newWords: nw, topicId, createdAt:t, updatedAt:t });
    STATE.progress[id] = { status:"training", cycleStart:14, count:14, masteredAt:null, history:[] };

    if (STATE.session.inProgress) {
      STATE.session.queue = buildQueue();
      STATE.session.index = 0;
      STATE.session.phraseId = STATE.session.queue[0] || null;
    }

    saveStateDebounced();
    toast("salvo ✅");
    beep("ding");
    msg.textContent = "salvo ✅";

    $("#inJp").value = "";
    $("#inPt").value = "";
    $("#inNW").value = "";

    const { params } = routeInfo();
    if (params.topic) { nav("#/manage"); return; }

    render();
    return;
  }

  if (act === "saveEdit") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;

    const p = getPhrase(id);
    if (!p) return;

    const jp = ($("#inJp")?.value || "").trim();
    const pt = ($("#inPt")?.value || "").trim();
    const nw = parseNewWords($("#inNW")?.value || "");
    const msg = $("#editMsg");
    const topicId = ($("#topicSel")?.value || ensureDefaultTopic().id);

    if (!jp || !pt) { msg.textContent = "preencha jp e pt."; toast("faltou jp/pt"); beep("tuk"); return; }
    if (!isValidJP(jp)) { msg.textContent = "jp inválido. confira { } e caracteres."; toast("jp inválido"); beep("tuk"); return; }
    for (const w of nw) {
      if (!isValidJP(w.jp)) { msg.textContent = "palavra nova jp inválida."; toast("palavra inválida"); beep("tuk"); return; }
    }

    p.jp = jp;
    p.pt = pt;
    p.newWords = nw;
    p.topicId = topicId;
    p.updatedAt = now();

    saveStateDebounced();
    toast("alterado ✅");
    beep("ding");
    msg.textContent = "alterado ✅";

    const { params } = routeInfo();
    if (params.from === "manage") nav("#/manage");
    else if (params.from === "105x") nav("#/105x");
    else nav("#/home");
    return;
  }

  if (act === "deletePhrase") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;

    const ok = confirm("excluir esta frase? (sem desfazer)");
    if (!ok) return;

    const removed = deletePhraseById(id);
    if (!removed) return;

    toast("excluída ✅");
    beep("tuk");
    vibrate([8]);

    render();
    return;
  }

  /* settings */
  if (act === "toggleSound") {
    unlockAudio();
    STATE.prefs.audio.enabled = !STATE.prefs.audio.enabled;
    saveStateDebounced();
    toast(STATE.prefs.audio.enabled ? "som ligado" : "som desligado");
    refreshHUD();
    render();
    return;
  }

  if (act === "toggleVibe") {
    STATE.prefs.haptics.enabled = !STATE.prefs.haptics.enabled;
    saveStateDebounced();
    toast(STATE.prefs.haptics.enabled ? "vibração ligada" : "vibração desligada");
    refreshHUD();
    render();
    return;
  }

  if (act === "reset") {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem("jp_105x_v2");
    STATE = sanitizeState(defaultState());
    saveStateNow();
    toast("resetado. seed voltou ✅");
    beep("ding");
    nav("#/home");
    return;
  }

  /* BACKUP actions (incremento) */
  if (act === "copyBackup") {
    unlockAudio();
    const text = exportStateJSON();
    copyTextToClipboard(text).then((ok) => {
      toast(ok ? "json copiado ✅" : "não deu pra copiar");
      beep(ok ? "ding" : "tuk");
      vibrate(ok ? [8] : [6]);
    });
    return;
  }

  if (act === "downloadBackup") {
    unlockAudio();
    const text = exportStateJSON();
    if (!text) { toast("falha ao gerar backup"); beep("tuk"); return; }
    downloadTextFile(buildBackupFilename(), text, "application/json");
    toast("baixando… ✅");
    beep("ding");
    return;
  }

  if (act === "importFromText") {
    unlockAudio();
    const ta = $("#backupText");
    const raw = (ta?.value || "").trim();
    if (!raw) { toast("cole o json primeiro"); beep("tuk"); return; }
    const r = importStateFromString(raw);
    if (!r.ok) { toast(r.msg); beep("tuk"); return; }
    toast("importado ✅");
    beep("ding");
    nav("#/home");
    return;
  }

  if (act === "triggerImportFile") {
    unlockAudio();
    const file = $("#backupFile");
    if (!file) { toast("input de arquivo não encontrado"); beep("tuk"); return; }
    file.click();
    return;
  }

  if (btn.id === "hudSound") {
    unlockAudio();
    STATE.prefs.audio.enabled = !STATE.prefs.audio.enabled;
    saveStateDebounced();
    refreshHUD();
    toast(STATE.prefs.audio.enabled ? "som ligado" : "som desligado");
    return;
  }

  if (btn.id === "hudVibe") {
    unlockAudio();
    STATE.prefs.haptics.enabled = !STATE.prefs.haptics.enabled;
    saveStateDebounced();
    refreshHUD();
    toast(STATE.prefs.haptics.enabled ? "vibração ligada" : "vibração desligado");
    return;
  }
});

/* ----- Pointer drag handlers (frases) ----- */
document.addEventListener("pointerdown", (e) => {
  const handle = e.target.closest(".dragHandle");
  if (!handle) return;

  const item = handle.closest("[data-reorder-item='1']");
  const list = handle.closest("[data-reorder-list='1']");
  if (!item || !list) return;

  const topic = item.dataset.topic;
  if (!topic) return;
  if (route() !== "#/manage") return;

  e.preventDefault();
  unlockAudio();

  DRAG = { topic, list, item, pointerId: e.pointerId };
  try { item.setPointerCapture(e.pointerId); } catch {}

  item.classList.add("dragging");
  vibrate([8]);
}, { passive: false });

document.addEventListener("pointermove", (e) => {
  if (!DRAG) return;
  if (e.pointerId !== DRAG.pointerId) return;

  const { list, item } = DRAG;

  const y = e.clientY;
  const items = $$("[data-reorder-item='1']", list).filter(el => el !== item);
  let target = null;

  for (const it of items) {
    const r = it.getBoundingClientRect();
    const mid = r.top + r.height / 2;
    if (y < mid) { target = it; break; }
  }

  if (target) list.insertBefore(item, target);
  else list.appendChild(item);
}, { passive: true });

document.addEventListener("pointerup", (e) => {
  if (!DRAG) return;
  if (e.pointerId !== DRAG.pointerId) return;

  const { list, item, topic } = DRAG;

  item.classList.remove("dragging");

  const orderedIds = $$("[data-reorder-item='1']", list).map(el => el.dataset.id).filter(Boolean);
  applyTopicOrder(topic, orderedIds);

  toast("ordem salva ✅");
  beep("ding");

  DRAG = null;
}, { passive: true });

document.addEventListener("pointercancel", (e) => {
  if (!DRAG) return;
  if (e.pointerId !== DRAG.pointerId) return;
  try { DRAG.item.classList.remove("dragging"); } catch {}
  DRAG = null;
}, { passive: true });

/* ----- Pointer drag handlers (tópicos) ----- */
document.addEventListener("pointerdown", (e) => {
  const handle = e.target.closest(".topicDrag");
  if (!handle) return;
  if (route() !== "#/manage") return;

  const item = handle.closest("[data-topic-item='1']");
  const list = $("#manageTopics");
  if (!item || !list) return;

  e.preventDefault();
  unlockAudio();

  TOPIC_DRAG = { list, item, pointerId: e.pointerId };
  try { item.setPointerCapture(e.pointerId); } catch {}

  item.classList.add("dragging");
  vibrate([8]);
}, { passive: false });

document.addEventListener("pointermove", (e) => {
  if (!TOPIC_DRAG) return;
  if (e.pointerId !== TOPIC_DRAG.pointerId) return;

  const { list, item } = TOPIC_DRAG;

  const y = e.clientY;
  const items = $$("[data-topic-item='1']", list).filter(el => el !== item);
  let target = null;

  for (const it of items) {
    const r = it.getBoundingClientRect();
    const mid = r.top + r.height / 2;
    if (y < mid) { target = it; break; }
  }

  if (target) list.insertBefore(item, target);
  else list.appendChild(item);
}, { passive: true });

document.addEventListener("pointerup", (e) => {
  if (!TOPIC_DRAG) return;
  if (e.pointerId !== TOPIC_DRAG.pointerId) return;

  const { list, item } = TOPIC_DRAG;
  item.classList.remove("dragging");

  const orderedTopicIds = $$("[data-topic-item='1']", list).map(el => el.dataset.id).filter(Boolean);
  applyTopicsOrder(orderedTopicIds);

  /* ✅ trava click fantasma depois do drag */
  SUPPRESS_CLICK_UNTIL = now() + 260;

  toast("tópicos ordenados ✅");
  beep("ding");

  TOPIC_DRAG = null;
}, { passive: true });

document.addEventListener("pointercancel", (e) => {
  if (!TOPIC_DRAG) return;
  if (e.pointerId !== TOPIC_DRAG.pointerId) return;
  try { TOPIC_DRAG.item.classList.remove("dragging"); } catch {}
  TOPIC_DRAG = null;
}, { passive: true });

/* inputs */
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el && el.id === "vol") {
    const v = Number(el.value);
    STATE.prefs.audio.volume = clamp(v, 0, 1);
    saveStateDebounced();
  }
});

/* hash change */
window.addEventListener("hashchange", () => {
  ttsCancelSafe();
  render();
  startStudyTimerIfOn105x();
  updateBackTopVisibility();
});

/* fallback anti tela-branca */
window.addEventListener("error", () => {
  try { toast("algo quebrou. reset pode salvar."); } catch {}
});

/* ---------- settings (mantidos) ---------- */
function renderSettings() {
  APP.innerHTML = `
    <div class="stack">
      <section class="card stack">
        <div class="row row--between">
          <div class="badge">ajustes</div>
          <button class="btn" data-nav="#/home">voltar</button>
        </div>

        <div class="grid2">
          <button class="btn btn--full" data-action="toggleSound">${STATE.prefs.audio.enabled ? "som: ligado" : "som: desligado"}</button>
          <button class="btn btn--full" data-action="toggleVibe">${STATE.prefs.haptics.enabled ? "vibração: ligada" : "vibração: desligada"}</button>
        </div>

        <div class="sheet stack">
          <div class="small">volume do som (leve)</div>
          <input id="vol" type="range" min="0" max="1" step="0.05" value="${STATE.prefs.audio.volume ?? 0.35}" />
          <div class="small">som só toca depois do primeiro toque.</div>
        </div>

        <div class="sep"></div>
        <button class="btn btn--bad btn--full" data-action="reset">resetar tudo</button>
        <div class="small">vai voltar ao seed inicial.</div>
      </section>
    </div>
  `;
}

/* boot */
(function init() {
  try {
    ensureDefaultTopic();
    ensurePhrasesHaveValidTopicLive();
    refreshHUD();
    if (!location.hash) nav("#/home");

    ensureBackTopButton();
    hookBackTopScroll();
    updateBackTopVisibility();

    ensureHabitToday();
    syncHabitMs();

    render();
    startStudyTimerIfOn105x();
  } catch {
    STATE = sanitizeState(defaultState());
    saveStateNow();
    try { nav("#/home"); } catch {}
  }
})();
