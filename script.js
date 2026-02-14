/* =========================================================
   NIHONGO321 (SPA leve, só 105X)
   + Backup por arquivo (mobile friendly)
   + Tópicos (conteúdo organizado)
   + ✅ Gerenciar: dropdown por tópico + adicionar dentro + reorder touch + limpar tópico
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

/* ✅ NOVO: HH:MM:SS (Xd) */
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

/* ---------- JP validation ---------- */
const JP_ALLOWED_RE =
  /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF 　。、！？・ー\-~!?.,:;()（）「」『』【】［］…\n\r\t0-9{}]*$/;

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

/* ---------- seed (20 frases) ---------- */
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

/* ---------- state ---------- */
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
      coins: 0,
      bestCoins: 0,
      cyclesDone: 0,
      phrasesMastered: 0,
      listens: 0,
      calls: 0
    },

    habit: {
      firstDay: null,
      days: {}
    },

    bank: {
      topics: [top],
      phrases
    },

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
      collapsedTopics: {}
    }
  };
}

let STATE = loadState();

/* ---------- storage + migration ---------- */
function migrateToV3(st) {
  if (!st || !st.app) return defaultState();

  st.app.schemaVersion = 3;

  st.bank ||= {};
  st.bank.phrases ||= [];
  st.bank.topics ||= [];

  st.ui ||= {};
  st.ui.collapsedTopics ||= {};

  st.session ||= {};
  st.session.topicFilter ||= "ALL";

  let def = st.bank.topics.find(t => t.id === "topic_default");
  if (!def) {
    def = defaultTopic();
    st.bank.topics.unshift(def);
  }

  for (const p of st.bank.phrases) {
    if (!p.topicId) p.topicId = def.id;
  }

  st.stats ||= {};
  st.stats.listens ||= 0;
  st.stats.calls ||= 0;

  st.habit ||= { firstDay: null, days: {} };
  st.habit.days ||= {};

  st.session.study ||= { day: todayKey(), totalMs: 0, running: false, runStartAt: null };

  return st;
}

function loadState() {
  let raw = localStorage.getItem(LS_KEY);
  if (raw) {
    const parsed = safeJSONParse(raw);
    if (parsed && parsed.app?.schemaVersion === 3) return parsed;
  }

  const legacyRaw = localStorage.getItem("jp_105x_v2");
  if (legacyRaw) {
    const parsed = safeJSONParse(legacyRaw);
    if (parsed && parsed.app) {
      const migrated = migrateToV3(parsed);
      localStorage.setItem(LS_KEY, JSON.stringify(migrated));
      return migrated;
    }
  }

  return defaultState();
}

function saveState() {
  STATE.app.updatedAt = now();
  localStorage.setItem(LS_KEY, JSON.stringify(STATE));
}

/* ---------- audio / haptics ---------- */
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
  saveState();
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
  saveState();
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

function syncHabitMs() {
  const k = ensureHabitToday();
  const ms = getStudyMs();
  STATE.habit.days[k].ms = ms;
  saveState();
}

function habitBump(_key, field, amount = 1) {
  const k = ensureHabitToday();
  STATE.habit.days[k][field] = (STATE.habit.days[k][field] || 0) + amount;
  saveState();
}

/* ---------- topics helpers ---------- */
function getTopic(id) {
  return (STATE.bank.topics || []).find(t => t.id === id) || null;
}

function topicName(id) {
  return getTopic(id)?.name || "Sem tópico";
}

function ensureDefaultTopic() {
  let def = STATE.bank.topics.find(t => t.id === "topic_default");
  if (!def) {
    def = defaultTopic();
    STATE.bank.topics.unshift(def);
    saveState();
  }
  return def;
}

function ensurePhrasesHaveValidTopic() {
  const def = ensureDefaultTopic();
  const topics = new Set((STATE.bank.topics || []).map(t => t.id));
  let changed = false;

  for (const p of (STATE.bank.phrases || [])) {
    if (!p.topicId || !topics.has(p.topicId)) {
      p.topicId = def.id;
      changed = true;
    }
  }
  if (changed) saveState();
  return changed;
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
  saveState();
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

  saveState();
  return true;
}

function topicPhraseIds(topicId) {
  return (STATE.bank.phrases || []).filter(p => p.topicId === topicId).map(p => p.id);
}

function clearTopic(topicId) {
  const def = ensureDefaultTopic();
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

  saveState();
  return ids.size;
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
  saveState();
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
  saveState();
}

function setPhraseById(id) {
  const idx = STATE.session.queue.indexOf(id);
  STATE.session.phraseId = id;
  if (idx >= 0) STATE.session.index = idx;
  resetCountForPhrase(id);
  saveState();
}

function addCoins(amount) {
  STATE.stats.coins = (STATE.stats.coins || 0) + amount;
  STATE.stats.bestCoins = Math.max(STATE.stats.bestCoins || 0, STATE.stats.coins);
  saveState();
  refreshHUD();
}

function nextPhrase() {
  const q = STATE.session.queue;
  if (!q.length) return;

  STATE.session.index = clamp(STATE.session.index + 1, 0, q.length - 1);
  STATE.session.phraseId = q[STATE.session.index];
  resetCountForPhrase(STATE.session.phraseId);
  saveState();
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
  saveState();

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

/* ---------- karaoke ---------- */
function segmentText(text) {
  return [...String(text || "")];
}

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

function estimateDurationMs(text, rate) {
  const clean = (text || "").replace(/\s+/g, "");
  const n = clean.length || 1;
  const base = 110 * n;
  const r = clamp(rate, 0.6, 1.2);
  return base / r;
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

function ttsSpeak(text, rate = 1.0, onStart, onEnd) {
  if (!("speechSynthesis" in window)) return false;
  try { speechSynthesis.cancel(); } catch {}

  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = clamp(rate, 0.6, 1.2);
  u.onstart = () => onStart && onStart();
  u.onend = () => onEnd && onEnd();
  u.onerror = () => onEnd && onEnd();

  speechSynthesis.speak(u);
  return true;
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

  if (!ok) toast("sem áudio. mas dá pra treinar lendo.");
}

/* ---------- call and response ---------- */
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

  if (!ok) toast("sem áudio. mas dá pra treinar lendo.");
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
    saveState();
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
  saveState();

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
    saveState();
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
      saveState();
    }
    stopTimerTick();
    syncHabitMs();
    return;
  }

  if (!st.running) {
    st.running = true;
    st.runStartAt = now();
    saveState();
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

function getStudyMs() {
  ensureStudyDay();
  const st = STATE.session.study;
  const runningAdd = st.running && st.runStartAt ? (now() - st.runStartAt) : 0;
  return (st.totalMs || 0) + runningAdd;
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

/* ---------- render ---------- */
function render() {
  refreshHUD();

  const r = route();
  if (r === "#/home") return renderHome();
  if (r === "#/105x") return render105x();
  if (r === "#/edit") return renderEdit();
  if (r === "#/manage") return renderManage();
  if (r === "#/backup") return renderBackup();
  if (r === "#/settings") return renderSettings();
  if (r === "#/skills") return renderSkills();

  nav("#/home");
}

/* ---------- HOME ---------- */
function renderHome() {
  ensurePhrasesHaveValidTopic();

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
      saveState();
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
  ensurePhrasesHaveValidTopic();

  if (!STATE.session.inProgress) {
    startAuto();
    return;
  }

  if (!STATE.session.queue || !STATE.session.queue.length) {
    STATE.session.queue = buildQueue();
    STATE.session.index = 0;
    STATE.session.phraseId = STATE.session.queue[0] || null;
    saveState();
  }

  if (!STATE.session.phraseId && STATE.session.queue.length) {
    STATE.session.phraseId = STATE.session.queue[0];
    STATE.session.index = 0;
    saveState();
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
            <!-- ✅ alinhado à direita (fica no topo, mas “encostado” no lado direito) -->
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

        <!-- ✅ timer desceu e ficou no bloco da direita (como na seta) -->
        <div class="studyDock">
          <div class="studyRight">
            <div class="studyTimer" aria-label="tempo de estudo">
              <div class="studyTimerRow">
                <div class="studyTime"><span class="ic">⏱</span> <span id="studyTime">00:00:00 (0d)</span></div>
                <div class="studyHint">Tempo Dedicado</div>
              </div>
              <div class="studyBar"><div class="studyFill" id="studyFill"></div></div>
            </div>

            <!-- ✅ call button desceu, alinhado à direita -->
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

function renderTopicHeader(topic, count, collapsed) {
  return `
    <button class="topicHdr ${topic.color}" data-action="toggleTopic" data-id="${topic.id}">
      <span class="topicHdrL">
        <span class="topicDot"></span>
        <span class="topicName">${escapeHTML(topic.name)}</span>
        <span class="topicCount">${count}</span>
      </span>
      <span class="topicChevron">${collapsed ? "▾" : "▴"}</span>
    </button>
  `;
}

function renderPhraseListOnly() {
  const box = $("#phraseList");
  if (!box) return;

  ensurePhrasesHaveValidTopic();

  const byTopic = new Map();
  const phrases = phrasesByFilter();

  const topics = STATE.bank.topics || [];
  for (const t of topics) byTopic.set(t.id, []);
  byTopic.set("_missing", []);

  for (const p of phrases) {
    if (byTopic.has(p.topicId)) byTopic.get(p.topicId).push(p);
    else byTopic.get("_missing").push(p);
  }

  const collapsedTopics = STATE.ui.collapsedTopics || {};
  const frag = document.createDocumentFragment();

  for (const t of topics) {
    const list = byTopic.get(t.id) || [];
    if (!list.length) continue;

    const collapsed = !!collapsedTopics[t.id];
    const wrap = document.createElement("div");
    wrap.className = "topicGroup";
    wrap.innerHTML = `
      ${renderTopicHeader(t, list.length, collapsed)}
      <div class="topicBody ${collapsed ? "isCollapsed" : ""}">
        ${list.map(x => {
          const pr = getProg(x.id);
          const st = pr.status === "mastered" ? "dominada ✓" : "treino";
          const pct = phraseProgressPct(pr);
          const pctTxt = Math.round(pct * 100);
          return `
            <div class="item">
              <div class="itemTop">
                <div style="min-width:0">
                  <p class="itemTitle">${escapeHTML(jpStripFurigana(x.jp))}</p>
                  <div class="itemMeta">${escapeHTML(x.pt)} • ${st}</div>

                  <div class="pWrap" aria-label="progresso">
                    <div class="pBar"><div class="pFill" style="transform:scaleX(${pct})"></div></div>
                    <div class="pTxt">${pctTxt}%</div>
                  </div>
                </div>
                <button class="btn" data-action="goto" data-id="${x.id}">IR</button>
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

function renderEdit(editingId = null) {
  ensurePhrasesHaveValidTopic();

  const { params } = routeInfo();
  const preTopic = params.topic ? String(params.topic) : null;

  const editing = editingId ? getPhrase(editingId) : null;

  const jpVal = editing ? editing.jp : "";
  const ptVal = editing ? editing.pt : "";
  const nwVal = editing && Array.isArray(editing.newWords)
    ? editing.newWords.map(x => `${x.jp}=${x.pt}`).join(", ")
    : "";

  const topicId = editing
    ? (editing.topicId || ensureDefaultTopic().id)
    : (preTopic && getTopic(preTopic) ? preTopic : ensureDefaultTopic().id);

  APP.innerHTML = `
    <div class="stack">
      <section class="card stack">
        <div class="row row--between">
          <div class="badge">${editing ? "editar frase" : "cadastro"}</div>
          <button class="btn" data-nav="#/home">voltar</button>
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

          ${editing ? `<button class="btn btn--muted btn--full" data-nav="#/manage">voltar pro gerenciar</button>` : ""}

          <div class="small" id="editMsg"></div>
        </div>
      </section>
    </div>
  `;
}

/* ---------- GERENCIAR (igual ao seu) ---------- */
function renderManage() {
  ensurePhrasesHaveValidTopic();

  const def = ensureDefaultTopic();
  const topics = STATE.bank.topics || [];
  const collapsed = STATE.ui.collapsedTopics || {};

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
          <button class="btn" data-nav="#/105x">voltar</button>
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
          <button class="btn btn--ghost" data-nav="#/edit">novo cadastro</button>
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
    const isCollapsed = !!collapsed[t.id];

    const canDeleteTopic = t.id !== def.id;
    const hasPhrases = list.length > 0;

    const wrap = document.createElement("div");
    wrap.className = "topicGroup";

    const headerHtml = renderTopicHeader(t, list.length, isCollapsed);

    const toolsHtml = `
      <div class="topicTools">
        <button class="btn btn--ok" data-action="addPhraseToTopic" data-id="${t.id}">adicionar</button>
        ${hasPhrases ? `<button class="btn btn--muted" data-action="clearTopic" data-id="${t.id}">limpar</button>` : ``}
        ${canDeleteTopic ? `<button class="btn btn--bad" data-action="deleteTopic" data-id="${t.id}">excluir</button>` : `<span class="badge">fixo</span>`}
      </div>
    `;

    const bodyHtml = `
      <div class="topicBody ${isCollapsed ? "isCollapsed" : ""}">
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
                      <button class="btn btn--ghost" data-action="editPhrase" data-id="${p.id}">editar</button>
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
}

/* ---------- Reorder touch-friendly (Pointer Events) ---------- */
let DRAG = null;

function initReorderable() { DRAG = null; }

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
  saveState();
}

/* ---------- delete phrase ---------- */
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

  saveState();
  return true;
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

/* ---------- backup ---------- */
function validateAndLoadBackup(parsed, msgEl) {
  if (!parsed || parsed.schema !== "jp_105x_backup_v1" || !parsed.state) {
    msgEl.textContent = "json inválido.";
    toast("json inválido");
    beep("tuk");
    return false;
  }

  const st = parsed.state;
  if (!st.bank?.phrases || !Array.isArray(st.bank.phrases)) {
    msgEl.textContent = "backup incompleto.";
    toast("backup incompleto");
    beep("tuk");
    return false;
  }

  for (const p of st.bank.phrases) {
    if (!isValidJP(p.jp || "")) {
      msgEl.textContent = "backup tem jp inválido.";
      toast("jp inválido no backup");
      beep("tuk");
      return false;
    }
  }

  const migrated = migrateToV3(st);

  STATE = migrated;
  saveState();
  refreshHUD();

  msgEl.textContent = "importado ✅";
  toast("importado ✅");
  beep("ding");
  nav("#/home");
  return true;
}

/* ---------- backup/settings/skills (mantidos) ---------- */
function renderBackup() {
  APP.innerHTML = `
    <div class="stack">
      <section class="card stack">
        <div class="row row--between">
          <div class="badge">backup</div>
          <button class="btn" data-nav="#/home">voltar</button>
        </div>

        <div class="sheet stack">
          <div class="badge">exportar</div>
          <div class="grid2">
            <button class="btn btn--ok btn--full" data-action="exportCopy">copiar json</button>
            <button class="btn btn--ok btn--full" data-action="exportFile">baixar arquivo</button>
          </div>
          <div class="small">no celular, “baixar arquivo” costuma ser o mais confiável ✅</div>
        </div>

        <div class="sheet stack">
          <div class="badge">importar</div>
          <div class="grid2">
            <button class="btn btn--muted btn--full" data-action="importText">importar do texto</button>
            <button class="btn btn--muted btn--full" data-action="importFile">importar arquivo</button>
          </div>

          <input id="fileImport" type="file" accept=".json,application/json" style="display:none" />

          <div class="small">cole aqui para importar</div>
          <textarea id="importBox" class="btn" style="height:160px; width:100%; text-align:left; padding:12px; border-radius:18px;"></textarea>
          <div class="small" id="backupMsg"></div>
        </div>

        <div class="sheet stack">
          <div class="small">como usar no celular:</div>
          <div class="small">1) exportar: baixar arquivo (ou copiar) e mandar no whatsapp pra você mesmo</div>
          <div class="small">2) importar: abrir o arquivo e importar aqui</div>
        </div>
      </section>
    </div>
  `;
}

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

/* --- skills (mantido do seu build) --- */
const SKILL_PLAN_DAYS = 270;
const BASE_MIN_PER_DAY = 30;

const RANKS = [
  { days: 7,   name: "Bronze",   vibe: "o nihongo não é tão estranho assim", icon: "🥉" },
  { days: 30,  name: "Aço",      vibe: "tô começando a achar que eu consigo", icon: "🛡️" },
  { days: 90,  name: "Ouro",     vibe: "eu vou aprender nihongo sim", icon: "🥇" },
  { days: 150, name: "Platina",  vibe: "minha boca tá ficando automática", icon: "💠" },
  { days: 210, name: "Diamante", vibe: "eu já sobrevivo no cotidiano", icon: "💎" },
  { days: 270, name: "Fluência", vibe: "fluência total. o jogo virou", icon: "🌸" }
];

function isStudyDay(dayObj) {
  if (!dayObj) return false;
  const mins = (dayObj.ms || 0) / 60000;
  return mins >= 2 || (dayObj.cycles || 0) > 0;
}

function habitSummary() {
  const days = STATE.habit?.days || {};
  const keys = Object.keys(days).sort();

  let totalMs = 0;
  let activeDays = 0;
  let cycles = 0;
  let listens = 0;
  let calls = 0;

  for (const k of keys) {
    const d = days[k];
    totalMs += d.ms || 0;
    cycles += d.cycles || 0;
    listens += d.listens || 0;
    calls += d.calls || 0;
    if (isStudyDay(d)) activeDays++;
  }

  const nowTS = now();
  const last7 = [];
  const last30 = [];
  for (let i = 0; i < 30; i++) {
    const ts = addDaysTS(nowTS, -i);
    const dk = new Date(ts);
    const y = dk.getFullYear();
    const m = String(dk.getMonth() + 1).padStart(2, "0");
    const dd = String(dk.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${dd}`;
    const obj = days[key] || { ms: 0, cycles: 0, listens: 0, calls: 0 };
    if (i < 7) last7.push(obj);
    last30.push(obj);
  }

  const last7Ms = last7.reduce((a, x) => a + (x.ms || 0), 0);
  const last30Ms = last30.reduce((a, x) => a + (x.ms || 0), 0);

  const last7MinPerDay = last7Ms / 60000 / 7;
  const last30MinPerDay = last30Ms / 60000 / 30;

  return { keys, totalMs, totalMin: totalMs / 60000, activeDays, cycles, listens, calls, last7MinPerDay, last30MinPerDay };
}

function rankFromActiveDays(activeDays) {
  let current = RANKS[0];
  for (const r of RANKS) if (activeDays >= r.days) current = r;
  const next = RANKS.find(r => r.days > activeDays) || null;
  return { current, next };
}

function overallProgressByMinutes(totalMin) {
  const totalNeededMin = SKILL_PLAN_DAYS * BASE_MIN_PER_DAY;
  return clamp(totalMin / totalNeededMin, 0, 1);
}

function projectedFinishDate(avgMinPerDay) {
  const sum = habitSummary();
  const totalNeededMin = SKILL_PLAN_DAYS * BASE_MIN_PER_DAY;
  const remainingMin = Math.max(0, totalNeededMin - sum.totalMin);
  if (avgMinPerDay <= 0.1) return null;
  const daysNeeded = remainingMin / avgMinPerDay;
  return addDaysTS(now(), Math.ceil(daysNeeded));
}

function projectedRankDates(avgMinPerDay) {
  const sum = habitSummary();
  const dates = [];
  if (avgMinPerDay <= 0.1) return dates;

  const totalMin = sum.totalMin;

  for (const r of RANKS) {
    const needMin = r.days * BASE_MIN_PER_DAY;
    if (totalMin >= needMin) {
      dates.push({ ...r, done: true, dateTS: null });
    } else {
      const rem = needMin - totalMin;
      const daysNeeded = rem / avgMinPerDay;
      dates.push({ ...r, done: false, dateTS: addDaysTS(now(), Math.ceil(daysNeeded)) });
    }
  }
  return dates;
}

function skillBars() {
  const sum = habitSummary();

  const listening = clamp((sum.totalMin / (30 * 6)) * 0.65 + (sum.listens / 80) * 0.35, 0, 1);
  const speaking = clamp((sum.calls / 80), 0, 1);
  const repetition = clamp((sum.cycles / 120), 0, 1);
  const vocab = clamp(((STATE.stats.phrasesMastered || 0) / 20) * 0.55 + (sum.totalMin / (30 * 10)) * 0.45, 0, 1);
  const confidence = clamp((repetition * 0.35 + listening * 0.25 + vocab * 0.20 + speaking * 0.20), 0, 1);

  return [
    { name: "audição", val: listening, icon: "🎧", tip: "quanto mais você ouve, menos pensa" },
    { name: "fala", val: speaking, icon: "🗣️", tip: "call and response deixa a boca solta" },
    { name: "repetição", val: repetition, icon: "🔁", tip: "o ouro vem do ciclo fechado" },
    { name: "vocab", val: vocab, icon: "📦", tip: "palavras viram ferramentas" },
    { name: "confiança", val: confidence, icon: "✨", tip: "a soma silenciosa do dia a dia" }
  ];
}

function renderSkills() {
  const sum = habitSummary();
  const avg = Math.max(sum.last7MinPerDay, 0);
  const avgShow = avg > 0.1 ? `${avg.toFixed(1)} min/dia` : "ainda sem ritmo";
  const { current, next } = rankFromActiveDays(sum.activeDays);

  const prog = overallProgressByMinutes(sum.totalMin);
  const finish = projectedFinishDate(avg);
  const dates = projectedRankDates(avg);
  const bars = skillBars();

  const progPct = Math.round(prog * 100);

  const nextTxt = next
    ? `próxima: ${next.icon} ${next.name} (${next.days} dias)`
    : `você chegou: ${current.icon} ${current.name} ✅`;

  const projTxt = finish
    ? `se continuar no ritmo (${avgShow}), fluência em: ${fmtDateShort(finish)}`
    : `faz 2 minutinhos hoje e eu te dou a projeção 😉`;

  const timeline = RANKS.map(r => {
    const done = sum.activeDays >= r.days;
    return `
      <div class="tlNode ${done ? "done" : ""}">
        <div class="tlDot"></div>
        <div class="tlLbl">${r.icon} ${r.name}</div>
        <div class="tlMini">${r.days}d</div>
      </div>
    `;
  }).join("");

  const datesList = dates.map(d => {
    const right = d.done
      ? `<span class="badge">feito ✅</span>`
      : `<span class="badge">${d.dateTS ? fmtDateShort(d.dateTS) : "..."}</span>`;
    return `
      <div class="row row--between" style="gap:10px">
        <div class="small"><b>${d.icon} ${d.name}</b> <span style="opacity:.8">(${d.days} dias)</span></div>
        ${right}
      </div>
    `;
  }).join("");

  const barHtml = bars.map(b => {
    const pct = Math.round(b.val * 100);
    return `
      <div class="skillRow">
        <div class="skillLeft">
          <div class="skillName">${b.icon} ${b.name}</div>
          <div class="skillTip">${escapeHTML(b.tip)}</div>
        </div>
        <div class="skillRight">
          <div class="pBar skillBar"><div class="pFill" style="transform:scaleX(${b.val})"></div></div>
          <div class="pTxt">${pct}%</div>
        </div>
      </div>
    `;
  }).join("");

  APP.innerHTML = `
    <div class="stack">
      <section class="card stack">
        <div class="row row--between">
          <div class="badge">skills</div>
          <button class="btn" data-nav="#/home">voltar</button>
        </div>

        <div class="rankCard">
          <div class="rankBig">
            <div class="rankIcon">${current.icon}</div>
            <div>
              <div class="rankTitle">${current.name}</div>
              <div class="rankSub">${escapeHTML(current.vibe)}</div>
            </div>
          </div>

          <div class="row row--between">
            <div class="badge">${sum.activeDays} dias vivos</div>
            <div class="badge">${nextTxt}</div>
          </div>

          <div class="projWrap">
            <div class="projTop">
              <div class="small">progresso até fluência</div>
              <div class="badge">${progPct}%</div>
            </div>
            <div class="pBar projBar"><div class="pFill" style="transform:scaleX(${prog})"></div></div>
            <div class="small projTxt">${projTxt}</div>
          </div>
        </div>

        <div class="sheet stack">
          <div class="row row--between">
            <div class="badge">linha do tempo</div>
            <div class="badge">meta: 9 meses</div>
          </div>
          <div class="tlLine">
            <div class="tlTrack"></div>
            <div class="tlFill" style="transform:scaleX(${clamp(sum.activeDays / SKILL_PLAN_DAYS, 0, 1)})"></div>
            <div class="tlNodes">${timeline}</div>
          </div>
          <div class="small">dica: “dia vivo” = 2 min ou 1 ciclo. sem culpa.</div>
        </div>

        <div class="sheet stack">
          <div class="row row--between">
            <div class="badge">projeção de ranks</div>
            <div class="badge">${avgShow}</div>
          </div>
          <div class="stack" style="gap:8px">${datesList}</div>
        </div>

        <div class="sheet stack">
          <div class="row row--between">
            <div class="badge">mini skills</div>
            <div class="badge">panorama</div>
          </div>
          <div class="skillGrid">
            ${barHtml}
          </div>
        </div>

        <div class="small">
          você não precisa vencer o dia. só precisa encostar nele por 2 minutos.
        </div>
      </section>
    </div>
  `;

  ensureBackTopButton();
  updateBackTopVisibility();
}

/* =========================================================
   Global click delegation + drag (Pointer)
   ========================================================= */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.nav) {
    nav(btn.dataset.nav);
    return;
  }

  const act = btn.dataset.action;

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

  if (act === "goto") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;
    if (!STATE.session.inProgress) startAuto();
    setPhraseById(id);
    toast("frase carregada ✅");
    beep("pop");
    render105xBodyOnly();
    return;
  }

  if (act === "toggleTopic") {
    const id = btn.dataset.id;
    if (!id) return;
    STATE.ui.collapsedTopics ||= {};
    STATE.ui.collapsedTopics[id] = !STATE.ui.collapsedTopics[id];
    saveState();
    render();
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

    saveState();
    toast(id === "ALL" ? "treino: tudo ✅" : `treino: ${topicName(id)} ✅`);
    beep("ding");

    render();
    return;
  }

  if (act === "toggleCall") {
    unlockAudio();
    STATE.session.callMode = !STATE.session.callMode;
    saveState();
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
    nav(`#/edit?topic=${encodeURIComponent(id)}`);
    return;
  }

  if (act === "editPhrase") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;
    renderEdit(id);
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
    if (!isValidJP(jp)) { msg.textContent = "jp inválido. dica: 仕事{しごと} ou （ ）"; toast("jp inválido"); beep("tuk"); return; }
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

    saveState();
    toast("salvo ✅");
    beep("ding");
    msg.textContent = "salvo ✅";

    $("#inJp").value = "";
    $("#inPt").value = "";
    $("#inNW").value = "";

    const { params } = routeInfo();
    if (params.topic) {
      nav("#/manage");
      return;
    }

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
    if (!isValidJP(jp)) { msg.textContent = "jp inválido. dica: 仕事{しごと} ou （ ）"; toast("jp inválido"); beep("tuk"); return; }
    for (const w of nw) {
      if (!isValidJP(w.jp)) { msg.textContent = "palavra nova jp inválida."; toast("palavra inválida"); beep("tuk"); return; }
    }

    p.jp = jp;
    p.pt = pt;
    p.newWords = nw;
    p.topicId = topicId;
    p.updatedAt = now();

    saveState();
    toast("alterado ✅");
    beep("ding");
    msg.textContent = "alterado ✅";
    nav("#/manage");
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

  /* backup */
  if (act === "exportCopy" || act === "exportFile") {
    const msg = $("#backupMsg");
    const payload = { schema: "jp_105x_backup_v1", exportedAt: new Date().toISOString(), state: STATE };
    const txt = JSON.stringify(payload, null, 2);

    if (act === "exportCopy") {
      navigator.clipboard?.writeText(txt).then(() => {
        msg.textContent = "copiado pro clipboard ✅";
        toast("backup copiado ✅");
        beep("ding");
      }).catch(() => {
        msg.textContent = "não deu pra copiar. selecione e copie manualmente.";
        toast("copie manualmente");
        beep("tuk");
        const box = $("#importBox");
        if (box) box.value = txt;
      });
      return;
    }

    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const filename = `nihongo321-backup-${y}-${m}-${dd}.json`;

    downloadTextFile(filename, txt);
    msg.textContent = "baixado ✅ (procure em downloads)";
    toast("backup baixado ✅");
    beep("ding");
    return;
  }

  if (act === "importText") {
    const box = $("#importBox");
    const msg = $("#backupMsg");
    const raw = (box?.value || "").trim();
    if (!raw) { msg.textContent = "cole o json primeiro."; toast("sem json"); beep("tuk"); return; }

    const parsed = safeJSONParse(raw);
    validateAndLoadBackup(parsed, msg);
    return;
  }

  if (act === "importFile") {
    const input = $("#fileImport");
    if (!input) return;
    input.value = "";
    input.click();
    return;
  }

  /* settings */
  if (act === "toggleSound") {
    unlockAudio();
    STATE.prefs.audio.enabled = !STATE.prefs.audio.enabled;
    saveState();
    toast(STATE.prefs.audio.enabled ? "som ligado" : "som desligado");
    refreshHUD();
    render();
    return;
  }

  if (act === "toggleVibe") {
    STATE.prefs.haptics.enabled = !STATE.prefs.haptics.enabled;
    saveState();
    toast(STATE.prefs.haptics.enabled ? "vibração ligada" : "vibração desligada");
    refreshHUD();
    render();
    return;
  }

  if (act === "reset") {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem("jp_105x_v2");
    STATE = defaultState();
    saveState();
    toast("resetado. seed voltou ✅");
    beep("ding");
    nav("#/home");
    return;
  }

  if (btn.id === "hudSound") {
    unlockAudio();
    STATE.prefs.audio.enabled = !STATE.prefs.audio.enabled;
    saveState();
    refreshHUD();
    toast(STATE.prefs.audio.enabled ? "som ligado" : "som desligado");
    return;
  }

  if (btn.id === "hudVibe") {
    unlockAudio();
    STATE.prefs.haptics.enabled = !STATE.prefs.haptics.enabled;
    saveState();
    refreshHUD();
    toast(STATE.prefs.haptics.enabled ? "vibração ligada" : "vibração desligada");
    return;
  }
});

/* ----- Pointer drag handlers ----- */
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

  DRAG = {
    topic,
    list,
    item,
    pointerId: e.pointerId
  };

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

/* inputs */
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el && el.id === "vol") {
    const v = Number(el.value);
    STATE.prefs.audio.volume = clamp(v, 0, 1);
    saveState();
  }
});

document.addEventListener("change", (e) => {
  const el = e.target;
  if (el && el.id === "fileImport") {
    const msg = $("#backupMsg");
    if (!msg) return;

    const file = el.files && el.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "").trim();
      const parsed = safeJSONParse(text);
      validateAndLoadBackup(parsed, msg);
    };
    reader.onerror = () => {
      msg.textContent = "não deu pra ler o arquivo.";
      toast("erro ao ler arquivo");
      beep("tuk");
    };
    reader.readAsText(file);
  }
});

/* hash change */
window.addEventListener("hashchange", () => {
  render();
  startStudyTimerIfOn105x();
  updateBackTopVisibility();
});

/* boot */
(function init() {
  ensureDefaultTopic();
  ensurePhrasesHaveValidTopic();
  refreshHUD();
  if (!location.hash) nav("#/home");

  ensureBackTopButton();
  hookBackTopScroll();
  updateBackTopVisibility();

  ensureHabitToday();
  syncHabitMs();

  render();
  startStudyTimerIfOn105x();
})();
