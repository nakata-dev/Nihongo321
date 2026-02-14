/* =========================================================
   NIHONGO321
   FIX PACK:
   - blindagem state após load/import (anti crash)
   - salvar menos vezes (fluidez)
   - rota consistente no editar (back perfeito)
   - anti-spam TTS
   - instalar pacote (merge) mesmo com localStorage antigo
   - ✅ lista com scroll interno + colapsar tópicos ao selecionar frase
   - ✅ CRUD completo (add/edit/delete + add no tópico correto)
   - ✅ formatação JP sem ficar vertical (sem mexer no CSS)
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
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

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
  if (t.length > 220) return false;
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

/* ---------- seed: tópicos + frases ---------- */
function seedTopics() {
  const t = now();
  const names = [
    "Na Fábrica",
    "No Aeroporto",
    "No Correio",
    "Na Prefeitura",
    "No Konbini",
    "No Mercado",
    "Na Loja de Bicicletas",
    "No Cinema",
    "Na Loja de Departamentos",
    "Na Viagem",
    "Perguntas e Respostas",
    "Frases aleatórias"
  ];

  const topics = names.map((name, i) => {
    const id = name === "Frases aleatórias" ? "topic_default" : uid("topic");
    return { id, name, color: pickTopicColor(i), createdAt: t, updatedAt: t };
  });

  const def = topics.find(x => x.id === "topic_default") || defaultTopic();
  const others = topics.filter(x => x.id !== "topic_default");
  return [def, ...others];
}

function ph(id, jp, pt, topicId, newWords = []) {
  const t = now();
  return { id, jp, pt, newWords, topicId, createdAt: t, updatedAt: t };
}

function seedPhrasesForTopics(topics) {
  const byName = new Map(topics.map(t => [t.name, t.id]));
  const tid = (name) => byName.get(name) || topics[0].id;

  const out = [];

  const TF = tid("Na Fábrica");
  out.push(
    ph("ph_fab_001", "ラインを止{と}めてください。", "Por favor, pare a linha.", TF),
    ph("ph_fab_002", "この部品{ぶひん}は規格外{きかくがい}です。", "Esta peça está fora da especificação.", TF),
    ph("ph_fab_003", "不良品{ふりょうひん}を隔離{かくり}して、報告{ほうこく}してください。", "Isole o defeituoso e reporte, por favor.", TF),
    ph("ph_fab_004", "工具{こうぐ}の校正{こうせい}は済{す}んでいますか。", "A calibração da ferramenta está em dia?", TF),
    ph("ph_fab_005", "作業手順書{さぎょうてじゅんしょ}どおりにやり直{なお}します。", "Vou refazer conforme o procedimento.", TF),
    ph("ph_fab_006", "ここは安全第一{あんぜんだいいち}です。保護具{ほごぐ}を着用{ちゃくよう}してください。", "Aqui é segurança em primeiro lugar. Use EPI.", TF),
    ph("ph_fab_007", "このロットは再検査{さいけんさ}が必要{ひつよう}です。", "Este lote precisa de reinspeção.", TF),
    ph("ph_fab_008", "異常{いじょう}を見{み}つけたら、すぐに合図{あいず}してください。", "Se encontrar anomalia, sinalize imediatamente.", TF),
    ph("ph_fab_009", "今{いま}の条件{じょうけん}だと、歩留{ぶど}まりが下{さ}がります。", "Com estas condições, o rendimento vai cair.", TF),
    ph("ph_fab_010", "原因{げんいん}を切{き}り分{わ}けて、対策{たいさく}を立{た}てましょう。", "Vamos isolar a causa e definir a contramedida.", TF)
  );

  const TA = tid("No Aeroporto");
  out.push(
    ph("ph_air_001", "国際線{こくさいせん}のチェックインはどこですか。", "Onde é o check-in do voo internacional?", TA),
    ph("ph_air_002", "手荷物{てにもつ}検査{けんさ}はこの先{さき}ですか。", "A inspeção de bagagem de mão é ali na frente?", TA),
    ph("ph_air_003", "搭乗口{とうじょうぐち}が変更{へんこう}になりましたか。", "O portão de embarque mudou?", TA),
    ph("ph_air_004", "預{あず}け荷物{にもつ}はどこで受{う}け取{と}れますか。", "Onde pego a bagagem despachada?", TA),
    ph("ph_air_005", "乗{の}り継{つ}ぎ時間{じかん}が短{みじか}いです。急{いそ}いでいます。", "Minha conexão é curta. Estou com pressa.", TA)
  );

  const TC = tid("No Correio");
  out.push(
    ph("ph_post_001", "書留{かきとめ}で送{おく}りたいです。", "Quero enviar registrado.", TC),
    ph("ph_post_002", "追跡番号{ついせきばんごう}はありますか。", "Tem código de rastreio?", TC),
    ph("ph_post_003", "速達{そくたつ}でお願{ねが}いします。", "Por favor, via expressa.", TC),
    ph("ph_post_004", "この荷物{にもつ}は関税{かんぜい}の対象{たいしょう}ですか。", "Esta encomenda tem taxa/alfândega?", TC)
  );

  const TP = tid("Na Prefeitura");
  out.push(
    ph("ph_city_001", "住民票{じゅうみんひょう}を取{と}りたいです。", "Quero tirar o comprovante de residência (juminhyo).", TP),
    ph("ph_city_002", "転入届{てんにゅうとどけ}の手続{てつづ}きはどこですか。", "Onde faço o procedimento de mudança para a cidade?", TP),
    ph("ph_city_003", "必要書類{ひつようしょるい}を教{おし}えてください。", "Pode me dizer os documentos necessários?", TP),
    ph("ph_city_004", "予約{よやく}は必要{ひつよう}ですか。", "Precisa de agendamento?", TP)
  );

  const TK = tid("No Konbini");
  out.push(
    ph("ph_kon_001", "袋{ふくろ}は要{い}りますか。", "Precisa de sacola?", TK),
    ph("ph_kon_002", "温{あたた}めてください。", "Pode esquentar, por favor.", TK),
    ph("ph_kon_003", "公共料金{こうきょうりょうきん}を支払{しはら}いたいです。", "Quero pagar contas aqui.", TK),
    ph("ph_kon_004", "コピー機{き}は使{つか}えますか。", "Posso usar a copiadora?", TK)
  );

  const TM = tid("No Mercado");
  out.push(
    ph("ph_mar_001", "これ、賞味期限{しょうみきげん}はいつですか。", "Qual é a validade disso?", TM),
    ph("ph_mar_002", "レジ袋{ぶくろ}は不要{ふよう}です。", "Não preciso de sacola.", TM),
    ph("ph_mar_003", "クレジットカードは使{つか}えますか。", "Posso pagar com cartão?", TM),
    ph("ph_mar_004", "この商品{しょうひん}は売{う}り切{き}れですか。", "Este produto está esgotado?", TM)
  );

  const TB = tid("Na Loja de Bicicletas");
  out.push(
    ph("ph_bike_001", "ブレーキの調整{ちょうせい}をお願{ねが}いします。", "Quero ajuste do freio, por favor.", TB),
    ph("ph_bike_002", "パンク修理{しゅうり}はいくらですか。", "Quanto custa consertar pneu furado?", TB),
    ph("ph_bike_003", "チェーンが外{はず}れました。見{み}てもらえますか。", "A corrente soltou. Pode olhar?", TB)
  );

  const TCI = tid("No Cinema");
  out.push(
    ph("ph_cin_001", "この映画{えいが}は何時{なんじ}に始{はじ}まりますか。", "Que horas começa este filme?", TCI),
    ph("ph_cin_002", "字幕{じまく}ですか、吹{ふ}き替{か}えですか。", "É legendado ou dublado?", TCI),
    ph("ph_cin_003", "一番後{いちばんうし}ろの席{せき}は空{あ}いていますか。", "Tem assento livre na última fila?", TCI)
  );

  const TD = tid("Na Loja de Departamentos");
  out.push(
    ph("ph_dep_001", "試着{しちゃく}してもいいですか。", "Posso experimentar?", TD),
    ph("ph_dep_002", "サイズは他{ほか}にもありますか。", "Tem outros tamanhos?", TD),
    ph("ph_dep_003", "返品{へんぴん}・交換{こうかん}は可能{かのう}ですか。", "Posso devolver ou trocar?", TD)
  );

  const TV = tid("Na Viagem");
  out.push(
    ph("ph_trip_001", "この電車{でんしゃ}は急行{きゅうこう}ですか。", "Este trem é expresso?", TV),
    ph("ph_trip_002", "次{つぎ}の駅{えき}で降{お}ります。教{おし}えてください。", "Eu desço na próxima estação. Me avise, por favor.", TV),
    ph("ph_trip_003", "道{みち}に迷{まよ}いました。地図{ちず}で教{おし}えてもらえますか。", "Me perdi. Pode me mostrar no mapa?", TV)
  );

  const TQ = tid("Perguntas e Respostas");
  out.push(
    ph("ph_qa_001", "もう一度{いちど}言{い}ってください。", "Pode repetir, por favor?", TQ),
    ph("ph_qa_002", "それはどういう意味{いみ}ですか。", "O que isso significa?", TQ),
    ph("ph_qa_003", "結論{けつろん}から言{い}うと、こうです。", "Indo direto ao ponto, é assim.", TQ),
    ph("ph_qa_004", "確認{かくにん}して、後{あと}で連絡{れんらく}します。", "Vou confirmar e te aviso depois.", TQ)
  );

  const TDf = tid("Frases aleatórias");
  out.push(
    ph("ph_def_001", "おはようございます。", "Bom dia (formal).", TDf),
    ph("ph_def_002", "お疲{つか}れ様{さま}です。", "Bom trabalho / valeu pelo esforço.", TDf),
    ph("ph_def_003", "ちょっと待{ま}ってください。", "Espera um pouco, por favor.", TDf),
    ph("ph_def_004", "すみません、もう少{すこ}しゆっくりお願{ねが}いします。", "Desculpe, mais devagar, por favor.", TDf),
    ph("ph_def_005", "大丈夫{だいじょうぶ}です。", "Tudo bem / está ok.", TDf)
  );

  return out;
}

/* ---------- state ---------- */
function defaultState() {
  const t = now();
  const topics = seedTopics();
  const phrases = seedPhrasesForTopics(topics);

  const progress = {};
  for (const p of phrases) {
    progress[p.id] = { status:"training", cycleStart:14, count:14, masteredAt:null, history:[] };
  }

  return {
    app: { schemaVersion: 3, createdAt: t, updatedAt: t, packInstalled_v1: true },
    prefs: { audio: { enabled: true, volume: 0.35, unlocked: false }, haptics: { enabled: true } },
    stats: { coins: 0, bestCoins: 0, cyclesDone: 0, phrasesMastered: 0, listens: 0, calls: 0 },
    habit: { firstDay: null, days: {} },
    bank: { topics, phrases },
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
    ui: { lastToast: "", collapsedTopics: {} }
  };
}

let STATE = loadState();

/* =========================================================
   STATE HARDENING (blindagem)
   ========================================================= */
function ensureStateShape(st) {
  if (!st || typeof st !== "object") return defaultState();

  st.app ||= { schemaVersion: 3, createdAt: now(), updatedAt: now(), packInstalled_v1: false };
  st.app.schemaVersion = 3;
  st.app.createdAt ||= now();
  st.app.updatedAt ||= now();
  if (typeof st.app.packInstalled_v1 !== "boolean") st.app.packInstalled_v1 = false;

  st.prefs ||= {};
  st.prefs.audio ||= { enabled: true, volume: 0.35, unlocked: false };
  st.prefs.audio.enabled = !!st.prefs.audio.enabled;
  st.prefs.audio.volume = clamp(Number(st.prefs.audio.volume ?? 0.35), 0, 1);
  st.prefs.audio.unlocked = !!st.prefs.audio.unlocked;

  st.prefs.haptics ||= { enabled: true };
  st.prefs.haptics.enabled = !!st.prefs.haptics.enabled;

  st.stats ||= {};
  st.stats.coins ||= 0;
  st.stats.bestCoins ||= 0;
  st.stats.cyclesDone ||= 0;
  st.stats.phrasesMastered ||= 0;
  st.stats.listens ||= 0;
  st.stats.calls ||= 0;

  st.habit ||= { firstDay: null, days: {} };
  st.habit.days ||= {};

  st.bank ||= {};
  st.bank.topics ||= [];
  st.bank.phrases ||= [];

  if (!Array.isArray(st.bank.topics) || st.bank.topics.length === 0) {
    st.bank.topics = [defaultTopic()];
  } else if (!st.bank.topics.some(t => t && t.id === "topic_default")) {
    st.bank.topics.unshift(defaultTopic());
  }

  if (!Array.isArray(st.bank.phrases)) st.bank.phrases = [];

  st.progress ||= {};
  st.session ||= {};
  st.session.inProgress = !!st.session.inProgress;
  st.session.queue ||= [];
  st.session.index = Number.isFinite(st.session.index) ? st.session.index : 0;
  st.session.phraseId ||= null;
  st.session.callMode = !!st.session.callMode;
  st.session.topicFilter ||= "ALL";
  st.session.study ||= { day: todayKey(), totalMs: 0, running: false, runStartAt: null };
  st.session.study.day ||= todayKey();
  st.session.study.totalMs = Number.isFinite(st.session.study.totalMs) ? st.session.study.totalMs : 0;
  st.session.study.running = !!st.session.study.running;
  st.session.study.runStartAt = Number.isFinite(st.session.study.runStartAt) ? st.session.study.runStartAt : null;

  st.ui ||= {};
  st.ui.lastToast ||= "";
  st.ui.collapsedTopics ||= {};

  // normaliza tópicos
  if (Array.isArray(st.bank.topics)) {
    for (const t of st.bank.topics) {
      if (!t || typeof t !== "object") continue;
      if (!t.id) t.id = uid("topic");
      if (!t.name) t.name = "Tópico";
      if (!t.color) t.color = "tViolet";
      t.createdAt ||= now();
      t.updatedAt ||= now();
    }
  }

  // garante tópico válido
  const def = ensureDefaultTopic(st);
  const topicIds = new Set(st.bank.topics.map(t => t.id));
  for (const p of st.bank.phrases) {
    if (!p || typeof p !== "object") continue;
    if (!p.id) p.id = uid("ph");
    if (!p.topicId || !topicIds.has(p.topicId)) p.topicId = def.id;
    p.createdAt ||= now();
    p.updatedAt ||= now();
  }

  // garante progress
  for (const p of st.bank.phrases) {
    if (!p?.id) continue;
    if (!st.progress[p.id]) st.progress[p.id] = { status:"training", cycleStart:14, count:14, masteredAt:null, history:[] };
  }

  return st;
}

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
  if (!def) st.bank.topics.unshift(defaultTopic());

  for (const p of st.bank.phrases) {
    if (!p.topicId) p.topicId = "topic_default";
  }

  st.stats ||= {};
  st.stats.listens ||= 0;
  st.stats.calls ||= 0;

  st.habit ||= { firstDay: null, days: {} };
  st.habit.days ||= {};
  st.session.study ||= { day: todayKey(), totalMs: 0, running: false, runStartAt: null };
  if (typeof st.app.packInstalled_v1 !== "boolean") st.app.packInstalled_v1 = false;
  return st;
}

function loadState() {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    const parsed = safeJSONParse(raw);
    if (parsed && parsed.app?.schemaVersion === 3) return ensureStateShape(parsed);
  }

  const legacyRaw = localStorage.getItem("jp_105x_v2");
  if (legacyRaw) {
    const parsed = safeJSONParse(legacyRaw);
    if (parsed && parsed.app) {
      const migrated = ensureStateShape(migrateToV3(parsed));
      localStorage.setItem(LS_KEY, JSON.stringify(migrated));
      return migrated;
    }
  }

  return ensureStateShape(defaultState());
}

/* =========================================================
   SAVE OPTIMIZATION (menos writes)
   ========================================================= */
let _saveTimer = null;
let _saveQueued = false;

function saveState(immediate = false) {
  STATE.app.updatedAt = now();

  if (immediate) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(STATE)); } catch {}
    _saveQueued = false;
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = null;
    return;
  }

  _saveQueued = true;
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    if (!_saveQueued) return;
    _saveQueued = false;
    try { localStorage.setItem(LS_KEY, JSON.stringify(STATE)); } catch {}
  }, 700);
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
  saveState(false);
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
  try { navigator.vibrate(pattern); } catch {}
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
  if (soundEl) {
    soundEl.textContent = STATE.prefs.audio.enabled ? "🔊" : "🔇";
    soundEl.setAttribute("aria-pressed", STATE.prefs.audio.enabled ? "true" : "false");
  }

  const vibeEl = $("#hudVibe");
  if (vibeEl) {
    vibeEl.textContent = STATE.prefs.haptics.enabled ? "📳" : "📴";
    vibeEl.setAttribute("aria-pressed", STATE.prefs.haptics.enabled ? "true" : "false");
  }

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
  if (!STATE.habit.days[k]) STATE.habit.days[k] = { ms: 0, cycles: 0, listens: 0, calls: 0 };
  return k;
}

function habitBump(field, amount = 1) {
  const k = ensureHabitToday();
  STATE.habit.days[k][field] = (STATE.habit.days[k][field] || 0) + amount;
  saveState(false);
}

let _habitLastSaveAt = 0;
function syncHabitMs(throttled = true) {
  const k = ensureHabitToday();
  const ms = getStudyMs();
  STATE.habit.days[k].ms = ms;

  if (!throttled) {
    saveState(false);
    _habitLastSaveAt = now();
    return;
  }

  const t = now();
  if (t - _habitLastSaveAt > 12000) {
    saveState(false);
    _habitLastSaveAt = t;
  }
}

/* ---------- topics helpers ---------- */
function ensureDefaultTopic(st = STATE) {
  let def = (st.bank.topics || []).find(t => t && t.id === "topic_default");
  if (!def) {
    def = defaultTopic();
    st.bank.topics ||= [];
    st.bank.topics.unshift(def);
  }
  return def;
}

function getTopic(id) {
  return (STATE.bank.topics || []).find(t => t.id === id) || null;
}
function topicName(id) { return getTopic(id)?.name || "Sem tópico"; }

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
  if (changed) saveState(true);
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
  saveState(true);
  return topic;
}

function deleteTopic(topicId) {
  const def = ensureDefaultTopic();
  if (topicId === def.id) return false;

  for (const p of STATE.bank.phrases) if (p.topicId === topicId) p.topicId = def.id;

  const idx = STATE.bank.topics.findIndex(t => t.id === topicId);
  if (idx >= 0) STATE.bank.topics.splice(idx, 1);

  if (STATE.ui?.collapsedTopics) delete STATE.ui.collapsedTopics[topicId];
  if (STATE.session.topicFilter === topicId) STATE.session.topicFilter = "ALL";

  saveState(true);
  return true;
}

function topicPhraseIds(topicId) {
  return (STATE.bank.phrases || []).filter(p => p.topicId === topicId).map(p => p.id);
}

function clearTopic(topicId) {
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

  saveState(true);
  return ids.size;
}

/* ---------- ✅ UX: colapsar tudo ---------- */
function collapseAllTopics() {
  STATE.ui.collapsedTopics ||= {};
  for (const t of (STATE.bank.topics || [])) STATE.ui.collapsedTopics[t.id] = true;
  saveState(false);
}

/* ---------- progress ---------- */
function getProg(id) {
  if (!STATE.progress[id]) STATE.progress[id] = { status:"training", cycleStart:14, count:14, masteredAt:null, history:[] };
  return STATE.progress[id];
}

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

/* ---------- session / queue ---------- */
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
  saveState(true);
  refreshHUD();
  nav("#/105x");
}

function getPhrase(id) { return STATE.bank.phrases.find(p => p.id === id) || null; }

function resetCountForPhrase(id) {
  const pr = getProg(id);
  const cs = clamp(pr.cycleStart || 14, 1, 14);
  pr.count = cs;
}

function setPhraseById(id) {
  const idx = STATE.session.queue.indexOf(id);
  STATE.session.phraseId = id;
  if (idx >= 0) STATE.session.index = idx;
  resetCountForPhrase(id);
  saveState(true);
}

function addCoins(amount) {
  STATE.stats.coins = (STATE.stats.coins || 0) + amount;
  STATE.stats.bestCoins = Math.max(STATE.stats.bestCoins || 0, STATE.stats.coins);
  saveState(false);
  refreshHUD();
}

function nextPhrase() {
  const q = STATE.session.queue;
  if (!q.length) return;
  STATE.session.index = clamp(STATE.session.index + 1, 0, q.length - 1);
  STATE.session.phraseId = q[STATE.session.index];
  resetCountForPhrase(STATE.session.phraseId);
  saveState(true);
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
  saveState(true);

  toast("pulou. suave. próxima ✅");
  beep("tuk");
}

function resetPhraseToTraining(id) {
  if (!id) return false;
  const pr = getProg(id);
  pr.status = "training";
  pr.cycleStart = 14;
  pr.count = 14;
  pr.masteredAt = null;
  pr.history ||= [];
  pr.history.push({ at: now(), event: "reset_to_training" });
  saveState(true);
  return true;
}

/* ---------- karaoke (sem mudar) ---------- */
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

function estimateDurationMs(text, rate) {
  const clean = (text || "").replace(/\s+/g, "");
  const n = clean.length || 1;
  const base = 110 * n;
  const r = clamp(rate, 0.6, 1.2);
  return base / r;
}

function karaokeStop() {
  karaokePlay._kill?.();
  karaokePlay._kill = null;
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
  karaokeStop();

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

/* ---------- TTS (anti-spam) ---------- */
let TTS_LOCK_UNTIL = 0;
let TTS_SPEAKING = false;

function canSpeakNow() { return now() >= TTS_LOCK_UNTIL; }
function lockSpeak(ms = 350) { TTS_LOCK_UNTIL = now() + ms; }

function ttsStop() {
  karaokeStop();
  if (!("speechSynthesis" in window)) return;
  try { speechSynthesis.cancel(); } catch {}
  TTS_SPEAKING = false;
}

function ttsSpeak(text, rate = 1.0, onStart, onEnd) {
  if (!("speechSynthesis" in window)) return false;
  if (!canSpeakNow()) return false;
  lockSpeak(320);

  if (TTS_SPEAKING) ttsStop();
  try { speechSynthesis.cancel(); } catch {}

  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = clamp(rate, 0.6, 1.2);

  u.onstart = () => { TTS_SPEAKING = true; onStart && onStart(); };
  const done = () => { TTS_SPEAKING = false; onEnd && onEnd(); };
  u.onend = done;
  u.onerror = done;

  try { speechSynthesis.speak(u); return true; }
  catch { TTS_SPEAKING = false; return false; }
}

function speakWithKaraoke(jpRaw, rate, kanaEl) {
  const plain = jpStripFurigana(jpRaw);

  STATE.stats.listens = (STATE.stats.listens || 0) + 1;
  habitBump("listens", 1);

  const ok = ttsSpeak(
    plain,
    rate,
    () => karaokePlay(kanaEl, plain, rate),
    () => {}
  );

  if (!ok) toast("sem áudio agora. tenta de novo em 1s.");
}

function callAndResponse(jpRaw, rate, kanaEl, onDone) {
  const plain = jpStripFurigana(jpRaw);

  STATE.stats.calls = (STATE.stats.calls || 0) + 1;
  habitBump("calls", 1);

  const ok = ttsSpeak(
    plain,
    rate,
    () => karaokePlay(kanaEl, plain, rate),
    () => {}
  );

  const t = estimateDurationMs(plain, rate);
  setTimeout(() => showNowYouSheet(onDone), t + 90);

  if (!ok) toast("sem áudio agora. tenta de novo em 1s.");
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
    saveState(false);
    beep("pop");
    vibrate([8]);
    render105xBodyOnly();
    renderPhraseListOnly();
    return;
  }

  pr.history.push({ at: now(), event: "cycle_done", cycleStart: cs });

  STATE.stats.cyclesDone = (STATE.stats.cyclesDone || 0) + 1;
  habitBump("cycles", 1);

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
  saveState(true);

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

/* ---------- Timer ---------- */
let timerTickId = null;

function ensureStudyDay() {
  const k = todayKey();
  if (!STATE.session.study) STATE.session.study = { day: k, totalMs: 0, running: false, runStartAt: null };

  if (STATE.session.study.day !== k) {
    STATE.session.study.day = k;
    STATE.session.study.totalMs = 0;
    STATE.session.study.running = false;
    STATE.session.study.runStartAt = null;
    saveState(true);
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
      saveState(false);
    }
    stopTimerTick();
    syncHabitMs(false);
    return;
  }

  if (!st.running) {
    st.running = true;
    st.runStartAt = now();
    saveState(false);
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
    syncHabitMs(true);
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

        <button class="bigBtn" id="btnStart" type="button">COMEÇAR AGORA</button>

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
            <button class="btn btn--ghost" type="button" data-nav="#/manage">gerenciar</button>
          </div>

          <div class="small">dica: filtro deixa seu treino mais “limpo”.</div>
        </div>

        <div class="row">
          <button class="btn" type="button" data-nav="#/105x">ir pro treino</button>
          <button class="btn" type="button" data-nav="#/edit">cadastro</button>
          <button class="btn" type="button" data-nav="#/backup">backup</button>
          <button class="btn btn--ghost" type="button" data-nav="#/skills">skills</button>
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
      saveState(true);
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
      <button class="pill ${selectedId==="ALL"?"on":""}" type="button" data-action="topicFilter" data-id="ALL">tudo</button>
      ${topics.map(t => `
        <button class="pill ${t.id===selectedId?"on":""} ${t.color}" type="button" data-action="topicFilter" data-id="${t.id}">
          ${escapeHTML(t.name)}
        </button>
      `).join("")}
    </div>
  `;
}

function render105x() {
  ensurePhrasesHaveValidTopic();

  if (!STATE.session.inProgress) { startAuto(); return; }

  if (!STATE.session.queue || !STATE.session.queue.length) {
    STATE.session.queue = buildQueue();
    STATE.session.index = 0;
    STATE.session.phraseId = STATE.session.queue[0] || null;
    saveState(true);
  }

  if (!STATE.session.phraseId && STATE.session.queue.length) {
    STATE.session.phraseId = STATE.session.queue[0];
    STATE.session.index = 0;
    saveState(true);
  }

  const curPhrase = getPhrase(STATE.session.phraseId);
  const curTopic = curPhrase ? getTopic(curPhrase.topicId) : null;

  APP.innerHTML = `
    <div class="stack">
      <section class="card stack viewRel" id="view105x">

        <div class="studyTop">
          <div class="badge">105x</div>

          <div class="studyActions">
            <button class="miniBtn" type="button" title="skills" aria-label="skills" data-nav="#/skills">🏅</button>
            <button class="miniBtn" type="button" title="editar frases" aria-label="editar frases" data-nav="#/manage">✏️</button>
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

            <button class="btn btn--ghost callBtn" type="button" data-action="toggleCall">
              ${STATE.session.callMode ? "call: on" : "call: off"}
            </button>
          </div>
        </div>

        <div class="phraseArea" aria-label="frase em treino">
          <div class="counterMini" id="counterBox" aria-label="contador">
            <div class="counterVal" id="countVal">-</div>
            <div class="counterSub" id="cycleSub">ciclo</div>
          </div>

          <div class="kana" id="kanaLine" style="word-break:normal;overflow-wrap:anywhere;line-break:strict;"></div>
          <div class="pt" id="ptLine"></div>
        </div>

        <div id="newWordsBox"></div>

        <div class="primaryRow">
          <button class="primaryAction" type="button" data-action="repeat">repeti e entendi ✅</button>
        </div>

        <div class="row">
          <button class="btn btn--muted" type="button" data-action="speak" data-rate="1">ouvir normal</button>
          <button class="btn btn--muted" type="button" data-action="speak" data-rate="0.8">ouvir lento</button>
          <button class="btn btn--muted" type="button" data-action="skip">pular</button>
        </div>

        <div class="row">
          <button class="btn btn--ghost" type="button" data-action="resetThisPhrase">re-treinar esta frase ↺</button>
        </div>

        <div id="cycleSheet" class="sheet stack" style="display:none"></div>

        <div class="row">
          <button class="btn" type="button" data-action="next">próxima frase</button>
          <button class="btn" type="button" data-nav="#/home">sair</button>
        </div>
      </section>

      <section class="card stack">
        <div class="row row--between">
          <div class="badge">todas as frases</div>
          <div class="small">organizado por tópicos</div>
        </div>

        <!-- ✅ Scroll interno -->
        <div class="list" id="phraseList" style="max-height:55vh; overflow:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch;"></div>
      </section>
    </div>
  `;

  render105xBodyOnly();
  renderPhraseListOnly();

  startStudyTimerIfOn105x();
  ensureBackTopButton();
  updateBackTopVisibility();
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
  if (sheet && sheet.style.display === "block" && count > 1) sheet.style.display = "none";
}

/* ---------- list (agrupada) ---------- */
function renderTopicHeader(topic, count, collapsed) {
  return `
    <button class="topicHdr ${topic.color}" type="button" data-action="toggleTopic" data-id="${topic.id}">
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

  const phrases = phrasesByFilter();
  const topics = STATE.bank.topics || [];

  const byTopic = new Map();
  for (const t of topics) byTopic.set(t.id, []);
  for (const p of phrases) (byTopic.get(p.topicId) || byTopic.get("topic_default")).push(p);

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

          // ✅ JP não “quebra em coluna”
          const jpLine = escapeHTML(jpStripFurigana(x.jp));

          return `
            <div class="item">
              <div class="itemTop">
                <div style="min-width:0; flex:1">
                  <p class="itemTitle" style="font-size:18px; line-height:1.25; word-break:normal; overflow-wrap:anywhere; line-break:strict;">
                    ${jpLine}
                  </p>
                  <div class="itemMeta" style="word-break:normal; overflow-wrap:anywhere;">${escapeHTML(x.pt)} • ${st}</div>

                  <div class="pWrap" aria-label="progresso">
                    <div class="pBar"><div class="pFill" style="transform:scaleX(${pct})"></div></div>
                    <div class="pTxt">${pctTxt}%</div>
                  </div>
                </div>
                <button class="btn" type="button" data-action="goto" data-id="${x.id}">IR</button>
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

/* ---------- EDIT (rota perfeita) ---------- */
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
  const sel = selectedId || ensureDefaultTopic().id;
  return `
    <select class="btn selectBtn" id="topicSel" aria-label="selecionar tópico">
      ${topics.map(t => `<option value="${t.id}" ${t.id===sel?"selected":""}>${escapeHTML(t.name)}</option>`).join("")}
    </select>
  `;
}

function renderEdit() {
  ensurePhrasesHaveValidTopic();

  const { params } = routeInfo();
  const editingId = params.id ? String(params.id) : null;
  const preTopic = params.topic ? String(params.topic) : null;
  const from = params.from ? String(params.from) : "#/home"; // ✅ back perfeito

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
          <button class="btn" type="button" data-nav="${escapeHTML(from)}">voltar</button>
        </div>

        <div class="sheet stack">
          ${renderTopicSelect(topicId)}

          <div class="sep"></div>

          <div class="small">jp (furigana manual: 仕事{しごと})</div>
          <input id="inJp" class="btn" style="height:56px; width:100%; text-align:left" placeholder="ex: 私{わたし} の名前{なまえ} は あきおです。" value="${escapeHTML(jpVal)}" />

          <div class="small">pt</div>
          <input id="inPt" class="btn" style="height:56px; width:100%; text-align:left" placeholder="ex: meu nome é Akio." value="${escapeHTML(ptVal)}" />

          <div class="small">palavras novas (opcional) jp=pt, jp=pt</div>
          <input id="inNW" class="btn" style="height:56px; width:100%; text-align:left" placeholder="ex: 名前{なまえ}=nome" value="${escapeHTML(nwVal)}" />

          <button class="btn btn--ok btn--full" type="button"
            data-action="${editing ? "saveEdit" : "addPhrase"}"
            data-id="${editing ? editing.id : ""}"
            data-from="${escapeHTML(from)}">
            ${editing ? "salvar alterações" : "salvar frase"}
          </button>

          <div class="small" id="editMsg"></div>
        </div>
      </section>
    </div>
  `;
}

/* ---------- GERENCIAR ---------- */
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

  saveState(true);
  return true;
}

function renderManage() {
  ensurePhrasesHaveValidTopic();

  const def = ensureDefaultTopic();
  const topics = STATE.bank.topics || [];
  const collapsed = STATE.ui.collapsedTopics || {};

  const byTopic = new Map();
  for (const t of topics) byTopic.set(t.id, []);
  for (const p of STATE.bank.phrases) (byTopic.get(p.topicId) || byTopic.get(def.id)).push(p);

  APP.innerHTML = `
    <div class="stack">
      <section class="card stack">
        <div class="row row--between">
          <div class="badge">gerenciar</div>
          <button class="btn" type="button" data-nav="#/105x">voltar</button>
        </div>

        <div class="sheet stack">
          <div class="small">criar tópico novo</div>
          <div class="row" style="gap:10px; flex-wrap:nowrap">
            <input id="topicNewName2" class="btn" style="flex:1; min-width:0" placeholder="ex: fábrica, segurança, aeroporto..." />
            <button class="btn btn--ok" type="button" data-action="addTopic">adicionar</button>
          </div>
          <div class="small" id="topicMsg"></div>
        </div>

        <div class="sep"></div>

        <div class="row row--between">
          <div class="badge">tópicos + frases</div>
          <button class="btn btn--ghost" type="button" data-nav="#/edit?from=%23%2Fmanage">novo cadastro</button>
        </div>

        <div class="small">furigana usando { }. exemplo: 名前{なまえ}</div>

        <!-- ✅ scroll interno no gerenciar também -->
        <div class="list" id="manageTopics" style="max-height:65vh; overflow:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch;"></div>
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
        <button class="btn btn--ok" type="button" data-action="addPhraseToTopic" data-id="${t.id}">adicionar</button>
        ${hasPhrases ? `<button class="btn btn--muted" type="button" data-action="clearTopic" data-id="${t.id}">limpar</button>` : ``}
        ${canDeleteTopic ? `<button class="btn btn--bad" type="button" data-action="deleteTopic" data-id="${t.id}">excluir</button>` : `<span class="badge">fixo</span>`}
      </div>
    `;

    const bodyHtml = `
      <div class="topicBody ${isCollapsed ? "isCollapsed" : ""}">
        ${toolsHtml}
        ${hasPhrases ? `
          <div class="reorderList" data-topic="${t.id}">
            ${list.map(p => {
              const pr = getProg(p.id);
              const st = pr.status === "mastered" ? "dominada ✓" : "treino";
              const jpLine = escapeHTML(jpStripFurigana(p.jp));
              return `
                <div class="reorderItem" data-topic="${t.id}" data-id="${p.id}">
                  <div class="reorderTop" style="display:flex; gap:10px; align-items:flex-start">
                    <div class="reorderLeft" style="flex:1; min-width:0">
                      <p class="itemTitle" style="font-size:18px; line-height:1.25; word-break:normal; overflow-wrap:anywhere; line-break:strict;">
                        ${jpLine}
                      </p>
                      <div class="itemMeta" style="word-break:normal; overflow-wrap:anywhere;">${escapeHTML(p.pt)} • ${st}</div>
                    </div>

                    <div class="manageBtns" style="display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end">
                      <button class="btn btn--muted" type="button" data-action="resetPhrase" data-id="${p.id}">re-treinar</button>
                      <button class="btn btn--ghost" type="button" data-action="editPhrase" data-id="${p.id}">editar</button>
                      <button class="btn btn--bad" type="button" data-action="deletePhrase" data-id="${p.id}">excluir</button>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        ` : `
          <div class="sheet stack"><div class="small">sem frases aqui ainda.</div></div>
        `}
      </div>
    `;

    wrap.innerHTML = `${headerHtml}${bodyHtml}`;
    frag.appendChild(wrap);
  }

  root.innerHTML = "";
  root.appendChild(frag);

  ensureBackTopButton();
  updateBackTopVisibility();
}

/* =========================================================
   BACKUP / SETTINGS / SKILLS
   (mantidos, mas com handlers funcionando)
   ========================================================= */
function renderBackup() {
  APP.innerHTML = `
    <div class="stack">
      <section class="card stack">
        <div class="row row--between">
          <div class="badge">backup</div>
          <button class="btn" type="button" data-nav="#/home">voltar</button>
        </div>

        <div class="sheet stack">
          <div class="badge">exportar</div>
          <div class="grid2">
            <button class="btn btn--ok btn--full" type="button" data-action="exportCopy">copiar json</button>
            <button class="btn btn--ok btn--full" type="button" data-action="exportFile">baixar arquivo</button>
          </div>
        </div>

        <div class="sheet stack">
          <div class="badge">importar</div>
          <div class="grid2">
            <button class="btn btn--muted btn--full" type="button" data-action="importText">importar do texto</button>
            <button class="btn btn--muted btn--full" type="button" data-action="importFile">importar arquivo</button>
          </div>

          <input id="fileImport" type="file" accept=".json,application/json" style="display:none" />

          <div class="small">cole aqui para importar</div>
          <textarea id="importBox" class="btn" style="height:160px; width:100%; text-align:left; padding:12px; border-radius:18px;"></textarea>
          <div class="small" id="backupMsg"></div>
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
          <button class="btn" type="button" data-nav="#/home">voltar</button>
        </div>

        <div class="grid2">
          <button class="btn btn--full" type="button" data-action="toggleSound">${STATE.prefs.audio.enabled ? "som: ligado" : "som: desligado"}</button>
          <button class="btn btn--full" type="button" data-action="toggleVibe">${STATE.prefs.haptics.enabled ? "vibração: ligada" : "vibração: desligada"}</button>
        </div>

        <div class="sheet stack">
          <div class="small">volume do som</div>
          <input id="vol" type="range" min="0" max="1" step="0.05" value="${STATE.prefs.audio.volume ?? 0.35}" />
          <div class="small">som só toca depois do primeiro toque.</div>
        </div>

        <div class="sep"></div>
        <button class="btn btn--bad btn--full" type="button" data-action="reset">resetar tudo</button>
      </section>
    </div>
  `;

  const vol = $("#vol");
  if (vol) {
    vol.addEventListener("input", () => {
      STATE.prefs.audio.volume = clamp(Number(vol.value), 0, 1);
      saveState(false);
    });
  }
}

/* --- skills (se você já tinha, mantém; aqui eu deixo uma tela simples para não quebrar) --- */
function renderSkills() {
  const days = STATE.habit?.days || {};
  const keys = Object.keys(days);
  const active = keys.filter(k => (days[k]?.ms || 0) > 120000 || (days[k]?.cycles || 0) > 0).length;
  const mins = Math.round(keys.reduce((a,k) => a + ((days[k]?.ms || 0)/60000), 0));

  APP.innerHTML = `
    <div class="stack">
      <section class="card stack">
        <div class="row row--between">
          <div class="badge">skills</div>
          <button class="btn" type="button" data-nav="#/home">voltar</button>
        </div>

        <div class="sheet stack">
          <div class="row row--between"><div class="badge">dias vivos</div><div class="badge">${active}</div></div>
          <div class="row row--between"><div class="badge">minutos</div><div class="badge">${mins}</div></div>
          <div class="row row--between"><div class="badge">ciclos</div><div class="badge">${STATE.stats.cyclesDone || 0}</div></div>
          <div class="row row--between"><div class="badge">dominadas</div><div class="badge">${STATE.stats.phrasesMastered || 0}</div></div>
        </div>
      </section>
    </div>
  `;
}

/* =========================================================
   ✅ INSTALAR PACK (merge) - roda 1x quando falta
   ========================================================= */
function installDefaultPackIfMissing() {
  if (STATE.app.packInstalled_v1) return false;

  const def = ensureDefaultTopic();

  const existingTopicsByName = new Map(
    (STATE.bank.topics || [])
      .filter(t => t && typeof t.name === "string")
      .map(t => [t.name.trim().toLowerCase(), t])
  );

  const packTopics = seedTopics();
  let topicsAdded = 0;

  for (const pt of packTopics) {
    const key = String(pt.name || "").trim().toLowerCase();
    if (!key) continue;
    if (key === "frases aleatórias") continue;
    if (existingTopicsByName.has(key)) continue;

    const t = now();
    const newTopic = {
      id: uid("topic"),
      name: pt.name,
      color: pt.color || pickTopicColor(STATE.bank.topics.length + topicsAdded),
      createdAt: t,
      updatedAt: t
    };
    STATE.bank.topics.push(newTopic);
    existingTopicsByName.set(key, newTopic);
    topicsAdded++;
  }

  const topicsResolved = [...STATE.bank.topics];
  const packPhrases = seedPhrasesForTopics(topicsResolved);

  const existingPhraseIds = new Set((STATE.bank.phrases || []).map(p => p && p.id).filter(Boolean));
  let phrasesAdded = 0;

  for (const p of packPhrases) {
    if (!p || !p.id) continue;
    if (existingPhraseIds.has(p.id)) continue;
    if (!isValidJP(p.jp || "")) continue;
    if (!String(p.pt || "").trim()) continue;

    if (!p.topicId) p.topicId = def.id;

    STATE.bank.phrases.unshift(p);
    existingPhraseIds.add(p.id);

    if (!STATE.progress[p.id]) STATE.progress[p.id] = { status: "training", cycleStart: 14, count: 14, masteredAt: null, history: [] };
    phrasesAdded++;
  }

  for (const p of STATE.bank.phrases) {
    if (p && p.id && !STATE.progress[p.id]) STATE.progress[p.id] = { status: "training", cycleStart: 14, count: 14, masteredAt: null, history: [] };
    if (p && p.id && !p.topicId) p.topicId = def.id;
  }

  STATE.app.packInstalled_v1 = true;

  if (STATE.session?.inProgress) {
    STATE.session.queue = buildQueue();
    STATE.session.index = 0;
    STATE.session.phraseId = STATE.session.queue[0] || null;
  }

  saveState(true);

  if (topicsAdded || phrasesAdded) toast(`pacote instalado ✅ (${topicsAdded} tópicos, ${phrasesAdded} frases)`);
  return true;
}

/* =========================================================
   Voltar ao topo
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
    beep("pop");
    vibrate([8]);
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
   ✅ CRUD: add / edit / delete frases (corrige Bug 3)
   ========================================================= */
function createPhrase({ jp, pt, topicId, newWords }) {
  const def = ensureDefaultTopic();
  const topics = new Set((STATE.bank.topics || []).map(t => t.id));
  const tId = topics.has(topicId) ? topicId : def.id;

  const p = {
    id: uid("ph"),
    jp: jp.trim(),
    pt: pt.trim(),
    newWords: Array.isArray(newWords) ? newWords : [],
    topicId: tId,
    createdAt: now(),
    updatedAt: now()
  };

  STATE.bank.phrases.unshift(p);
  STATE.progress[p.id] = { status: "training", cycleStart: 14, count: 14, masteredAt: null, history: [] };

  // mantém fila atual coerente
  if (STATE.session.inProgress) {
    STATE.session.queue = buildQueue();
    if (!STATE.session.phraseId) {
      STATE.session.index = 0;
      STATE.session.phraseId = STATE.session.queue[0] || null;
    }
  }

  saveState(true);
  return p;
}

function updatePhrase(id, { jp, pt, topicId, newWords }) {
  const p = getPhrase(id);
  if (!p) return false;

  const def = ensureDefaultTopic();
  const topics = new Set((STATE.bank.topics || []).map(t => t.id));
  const tId = topics.has(topicId) ? topicId : def.id;

  p.jp = jp.trim();
  p.pt = pt.trim();
  p.topicId = tId;
  p.newWords = Array.isArray(newWords) ? newWords : [];
  p.updatedAt = now();

  // se estava em treino, mantém
  if (STATE.session.inProgress) STATE.session.queue = buildQueue();

  saveState(true);
  return true;
}

/* =========================================================
   BACKUP handlers
   ========================================================= */
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

  STATE = ensureStateShape(migrateToV3(st));
  installDefaultPackIfMissing();
  saveState(true);
  refreshHUD();

  msgEl.textContent = "importado ✅";
  toast("importado ✅");
  beep("ding");
  nav("#/home");
  return true;
}

/* =========================================================
   Global click delegation
   ========================================================= */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.nav) { nav(btn.dataset.nav); return; }

  const act = btn.dataset.action;

  if (act === "repeat") { onRepeat(); return; }

  if (act === "resetThisPhrase") {
    unlockAudio();
    const pid = STATE.session.phraseId;
    if (!pid) return;
    resetPhraseToTraining(pid);
    toast("frase voltou pro treino ✅");
    beep("ding");
    render105xBodyOnly();
    renderPhraseListOnly();
    return;
  }

  if (act === "skip") { unlockAudio(); skipPhrase(); render105xBodyOnly(); renderPhraseListOnly(); return; }
  if (act === "next") { unlockAudio(); nextPhrase(); toast("próxima ✅"); beep("pop"); render105xBodyOnly(); renderPhraseListOnly(); return; }

  if (act === "goto") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;

    // ✅ fecha todos os tópicos e evita scroll infinito
    collapseAllTopics();

    if (!STATE.session.inProgress) startAuto();
    setPhraseById(id);

    toast("frase carregada ✅");
    beep("pop");

    // garante que a lista fica recolhida após selecionar
    render105xBodyOnly();
    renderPhraseListOnly();
    return;
  }

  if (act === "toggleTopic") {
    const id = btn.dataset.id;
    if (!id) return;
    STATE.ui.collapsedTopics ||= {};
    STATE.ui.collapsedTopics[id] = !STATE.ui.collapsedTopics[id];
    saveState(false);
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

    saveState(true);
    toast(id === "ALL" ? "treino: tudo ✅" : `treino: ${topicName(id)} ✅`);
    beep("ding");
    render();
    return;
  }

  if (act === "toggleCall") {
    unlockAudio();
    STATE.session.callMode = !STATE.session.callMode;
    saveState(false);
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
    if (!topic) { msg.textContent = "nome vazio ou já existe."; toast("tópico inválido"); beep("tuk"); return; }

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
    nav(`#/edit?topic=${encodeURIComponent(id)}&from=${encodeURIComponent("#/manage")}`);
    return;
  }

  if (act === "editPhrase") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;
    nav(`#/edit?id=${encodeURIComponent(id)}&from=${encodeURIComponent("#/manage")}`);
    return;
  }

  if (act === "resetPhrase") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;
    resetPhraseToTraining(id);
    toast("voltou pro treino ✅");
    beep("ding");
    renderManage();
    return;
  }

  if (act === "deletePhrase") {
    unlockAudio();
    const id = btn.dataset.id;
    if (!id) return;
    const ok = confirm("excluir esta frase? (sem desfazer)");
    if (!ok) return;
    const done = deletePhraseById(id);
    toast(done ? "frase excluída ✅" : "não encontrei a frase");
    beep(done ? "tuk" : "tuk");
    renderManage();
    return;
  }

  if (act === "addPhrase" || act === "saveEdit") {
    unlockAudio();
    const msg = $("#editMsg");
    const jpEl = $("#inJp");
    const ptEl = $("#inPt");
    const nwEl = $("#inNW");
    const topicEl = $("#topicSel");

    const from = btn.dataset.from || "#/home";

    if (!jpEl || !ptEl || !topicEl || !msg) return;

    const jp = String(jpEl.value || "").trim();
    const pt = String(ptEl.value || "").trim();
    const newWords = parseNewWords(nwEl ? nwEl.value : "");
    const topicId = String(topicEl.value || "topic_default");

    if (!isValidJP(jp)) {
      msg.textContent = "jp inválido. confira { } e caracteres.";
      toast("jp inválido");
      beep("tuk");
      return;
    }
    if (!pt) {
      msg.textContent = "pt vazio. coloque a tradução.";
      toast("pt vazio");
      beep("tuk");
      return;
    }

    if (act === "addPhrase") {
      createPhrase({ jp, pt, topicId, newWords });
      msg.textContent = "salvo ✅";
      toast("frase salva ✅");
      beep("ding");

      // ✅ volta para onde veio (manage ou home)
      nav(from);
      return;
    }

    if (act === "saveEdit") {
      const id = btn.dataset.id;
      const ok = updatePhrase(id, { jp, pt, topicId, newWords });
      msg.textContent = ok ? "alterado ✅" : "não encontrei a frase.";
      toast(ok ? "alterado ✅" : "erro ao salvar");
      beep(ok ? "ding" : "tuk");

      nav(from);
      return;
    }
  }

  if (act === "exportCopy") {
    unlockAudio();
    const payload = { schema: "jp_105x_backup_v1", exportedAt: now(), state: STATE };
    const text = JSON.stringify(payload);
    navigator.clipboard?.writeText(text).then(() => {
      toast("copiado ✅");
      beep("ding");
    }).catch(() => {
      toast("não consegui copiar. use 'baixar arquivo'.");
      beep("tuk");
    });
    return;
  }

  if (act === "exportFile") {
    unlockAudio();
    const payload = { schema: "jp_105x_backup_v1", exportedAt: now(), state: STATE };
    downloadTextFile(`nihongo321_backup_${todayKey()}.json`, JSON.stringify(payload));
    toast("arquivo baixado ✅");
    beep("ding");
    return;
  }

  if (act === "importText") {
    unlockAudio();
    const box = $("#importBox");
    const msg = $("#backupMsg");
    if (!box || !msg) return;
    const parsed = safeJSONParse(box.value);
    validateAndLoadBackup(parsed, msg);
    return;
  }

  if (act === "importFile") {
    unlockAudio();
    const inp = $("#fileImport");
    if (!inp) return;
    inp.click();
    return;
  }

  if (act === "toggleSound") {
    unlockAudio();
    STATE.prefs.audio.enabled = !STATE.prefs.audio.enabled;
    saveState(true);
    toast(STATE.prefs.audio.enabled ? "som ligado" : "som desligado");
    refreshHUD();
    render();
    return;
  }

  if (act === "toggleVibe") {
    STATE.prefs.haptics.enabled = !STATE.prefs.haptics.enabled;
    saveState(true);
    toast(STATE.prefs.haptics.enabled ? "vibração ligada" : "vibração desligada");
    refreshHUD();
    render();
    return;
  }

  if (act === "reset") {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem("jp_105x_v2");
    STATE = ensureStateShape(defaultState());
    saveState(true);
    toast("resetado. seed voltou ✅");
    beep("ding");
    nav("#/home");
    return;
  }

  if (btn.id === "hudSound") {
    unlockAudio();
    STATE.prefs.audio.enabled = !STATE.prefs.audio.enabled;
    saveState(true);
    refreshHUD();
    toast(STATE.prefs.audio.enabled ? "som ligado" : "som desligado");
    return;
  }

  if (btn.id === "hudVibe") {
    unlockAudio();
    STATE.prefs.haptics.enabled = !STATE.prefs.haptics.enabled;
    saveState(true);
    refreshHUD();
    toast(STATE.prefs.haptics.enabled ? "vibração ligada" : "vibração desligada");
    return;
  }
});

/* file import */
document.addEventListener("change", (e) => {
  const inp = e.target;
  if (!inp || inp.id !== "fileImport") return;
  const file = inp.files && inp.files[0];
  const msg = $("#backupMsg");
  if (!file || !msg) return;

  const reader = new FileReader();
  reader.onload = () => {
    const parsed = safeJSONParse(String(reader.result || ""));
    validateAndLoadBackup(parsed, msg);
  };
  reader.readAsText(file);
  inp.value = "";
});

/* hash change */
window.addEventListener("hashchange", () => {
  ttsStop();
  render();
  startStudyTimerIfOn105x();
  updateBackTopVisibility();
});

/* boot */
(function init() {
  STATE = ensureStateShape(STATE);
  ensureDefaultTopic();
  ensurePhrasesHaveValidTopic();

  // ✅ se tiver usuário antigo, instala pack por cima (1x)
  installDefaultPackIfMissing();

  refreshHUD();
  if (!location.hash) nav("#/home");

  ensureBackTopButton();
  hookBackTopScroll();
  updateBackTopVisibility();

  ensureHabitToday();
  syncHabitMs(false);

  render();
  startStudyTimerIfOn105x();
})();
