// Pure helpers for the Center Spread: validation, scrambling, edition grouping.
// No DOM, no storage, so everything here is covered by tests/validate.test.mjs.

export const GAME_TYPES = ["connections", "scramble", "bee", "crossword", "wordsearch", "code"];
export const TYPE_LABELS = { connections: "Connections", scramble: "Word Scramble", bee: "Spelling Bee", crossword: "Mini Crossword", wordsearch: "Word Search", code: "Custom game" };
export const BEE_OUTER = 6;
export const BEE_MIN_WORD = 4;
export const CROSSWORD_DEFAULT = 5;
export const CROSSWORD_MIN = 3;
export const CROSSWORD_MAX = 9;
export const WORDSEARCH_MIN = 3;
export const WORDSEARCH_MAX_LETTERS = 16;
export const CONNECTIONS_GROUPS = 4;
export const WORDS_PER_GROUP = 4;
export const MIN_SCRAMBLE_WORDS = 3;
export const CODE_HEIGHT = { min: 200, max: 2000, fallback: 500 };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCRAMBLE_ATTEMPTS = 12;
const DATE_FORMAT = { dateStyle: "medium", timeStyle: "short" };

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email) {
  return EMAIL_RE.test(normalizeEmail(email));
}

function isRealDate(iso) {
  if (!DATE_RE.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

// Shuffle the letters of each word, keeping spaces where they are. Retries so
// the result is not the answer itself (short words can shuffle back to it).
export function scrambleWord(answer, rng = Math.random) {
  const clean = String(answer).toUpperCase();
  const shuffleOnce = () => clean.split(" ").map((word) => {
    const letters = word.split("");
    const out = letters.reduce((acc, _, i) => {
      const j = Math.floor(rng() * (i + 1));
      const next = acc.slice();
      next[i] = next[j];
      next[j] = letters[i];
      return next;
    }, []);
    return out.join("");
  }).join(" ");
  for (let attempt = 0; attempt < SCRAMBLE_ATTEMPTS; attempt += 1) {
    const candidate = shuffleOnce();
    if (candidate !== clean) return candidate;
  }
  return shuffleOnce();
}

// One entry per line: "ANSWER", or "SCRAMBLED = ANSWER" to pick the scramble.
export function parseScrambleLines(text, rng = Math.random) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [left, right] = line.split("=").map((part) => part.trim().toUpperCase());
      if (right) return { scrambled: left, answer: right };
      return { scrambled: scrambleWord(left, rng), answer: left };
    });
}

function validateConnections(groups) {
  const errors = [];
  const list = Array.isArray(groups) ? groups : [];
  if (list.length !== CONNECTIONS_GROUPS) errors.push(`Connections needs exactly ${CONNECTIONS_GROUPS} groups.`);
  const seen = new Set();
  list.forEach((group, i) => {
    const name = String(group?.name || "").trim();
    const words = (Array.isArray(group?.words) ? group.words : []).map((w) => String(w).trim()).filter(Boolean);
    if (!name) errors.push(`Group ${i + 1} needs a category name.`);
    if (words.length !== WORDS_PER_GROUP) errors.push(`Group ${i + 1} needs exactly ${WORDS_PER_GROUP} words (has ${words.length}).`);
    words.forEach((w) => {
      const key = w.toUpperCase();
      if (seen.has(key)) errors.push(`"${w}" appears in more than one group.`);
      seen.add(key);
    });
  });
  const data = { groups: list.map((g) => ({ name: String(g?.name || "").trim(), words: (g?.words || []).map((w) => String(w).trim()).filter(Boolean) })) };
  return { errors, data };
}

function validateScramble(scrambleText, rng) {
  const words = parseScrambleLines(scrambleText, rng);
  const errors = [];
  if (words.length < MIN_SCRAMBLE_WORDS) errors.push(`Add at least ${MIN_SCRAMBLE_WORDS} words, one per line.`);
  words.forEach((w) => {
    if (!/^[A-Z0-9' ]+$/.test(w.answer)) errors.push(`"${w.answer}" should be letters, numbers and spaces only.`);
    const same = (s) => s.replace(/\s+/g, "").split("").sort().join("");
    if (same(w.scrambled) !== same(w.answer)) errors.push(`"${w.scrambled}" does not use the same letters as "${w.answer}".`);
  });
  return { errors, data: { words } };
}

const splitLines = (text) => String(text || "").split(/[\r\n,]+/).map((w) => w.trim()).filter(Boolean);
export const wordsearchForm = (w) => String(w).toUpperCase().replace(/[^A-Z0-9]/g, "");

function validateBee(input) {
  const errors = [];
  const center = String(input?.beeCenter || "").trim().toUpperCase();
  const outer = String(input?.beeOuter || "").toUpperCase().replace(/[^A-Z]/g, "").split("");
  const words = splitLines(input?.beeWords).map((w) => w.toUpperCase());
  if (!/^[A-Z]$/.test(center)) errors.push("Center must be a single letter.");
  if (outer.length !== BEE_OUTER) errors.push(`Outer letters must be exactly ${BEE_OUTER} letters.`);
  if (new Set([center, ...outer]).size !== BEE_OUTER + 1) errors.push("All seven letters must be different.");
  if (words.length === 0) errors.push("Add at least one valid word, one per line.");
  const allowed = new Set([center, ...outer]);
  const bad = words.find((w) => w.length < BEE_MIN_WORD || !w.includes(center) || [...w].some((ch) => !allowed.has(ch)));
  if (bad) errors.push(`"${bad}" isn't valid: words need ${BEE_MIN_WORD}+ letters, the center letter, and only the seven letters.`);
  return { errors, data: { center, outer, words: [...new Set(words)] } };
}

// An all-open grid numbers its squares in reading order: 1 is the top-left,
// the rest of the top row starts the other Down words, the rest of the first
// column starts the other Across words.
export function crosswordNumbers(rowCount, colCount) {
  return {
    across: Array.from({ length: rowCount }, (_, r) => (r === 0 ? 1 : colCount + r)),
    down: Array.from({ length: colCount }, (_, c) => c + 1),
  };
}

export function crosswordSize(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(CROSSWORD_MAX, Math.max(CROSSWORD_MIN, n)) : CROSSWORD_DEFAULT;
}

function validateCrossword(input) {
  const errors = [];
  const rowCount = crosswordSize(input?.cwRowCount);
  const colCount = crosswordSize(input?.cwColCount);
  const rows = Array.from({ length: rowCount }, (_, i) => String(input?.cwRows?.[i] || "").trim().toUpperCase());
  if (!rows.every((r) => new RegExp(`^[A-Z]{${colCount}}$`).test(r))) errors.push(`Each of the ${rowCount} rows must be exactly ${colCount} letters.`);
  const numbers = crosswordNumbers(rowCount, colCount);
  const clueMap = (list, values) => Object.fromEntries(list.map((n, i) => [n, String(values?.[i] || "").trim()]).filter(([, v]) => v));
  const across = clueMap(numbers.across, input?.cwAcross);
  const down = clueMap(numbers.down, input?.cwDown);
  if (Object.keys(across).length !== rowCount || Object.keys(down).length !== colCount) errors.push(`Fill in all ${rowCount} Across and all ${colCount} Down clues.`);
  return { errors, data: { rows, across, down } };
}

function validateWordsearch(input) {
  const errors = [];
  const words = splitLines(input?.wsWords).filter((w) => wordsearchForm(w).length >= 2);
  if (words.length < WORDSEARCH_MIN) errors.push(`Enter at least ${WORDSEARCH_MIN} words, one per line.`);
  const tooLong = words.find((w) => wordsearchForm(w).length > WORDSEARCH_MAX_LETTERS);
  if (tooLong) errors.push(`"${tooLong}" is too long. Keep words to ${WORDSEARCH_MAX_LETTERS} letters or fewer.`);
  return { errors, data: { words } };
}

function validateCode(code, height) {
  const errors = [];
  const text = String(code || "").trim();
  if (!text) errors.push("Paste the game's code.");
  const h = Number.parseInt(height, 10);
  const safeHeight = Number.isFinite(h) ? Math.min(CODE_HEIGHT.max, Math.max(CODE_HEIGHT.min, h)) : CODE_HEIGHT.fallback;
  return { errors, data: { code: text, height: safeHeight } };
}

// A publish time from the form (datetime-local, read as local time) or from
// storage (ISO). Blank means "publish now". Returns { iso } or { error }.
export function parsePublishAt(value) {
  const text = String(value || "").trim();
  if (!text) return { iso: null };
  const ms = Date.parse(text);
  if (Number.isNaN(ms)) return { error: "Publish time isn't a valid date and time." };
  return { iso: new Date(ms).toISOString() };
}

// Readers see a game once its publish time has passed; no time means now.
export function isLive(game, now = Date.now()) {
  if (!game?.publishAt) return true;
  const at = Date.parse(game.publishAt);
  return Number.isNaN(at) || at <= now;
}

export function formatPublishAt(iso) {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "" : new Intl.DateTimeFormat(undefined, DATE_FORMAT).format(ms);
}

// Turns raw form input into a stored game, or a list of errors. `input` is:
// { id?, type, title, kicker, blurb, intro, editionLabel, editionDate,
//   publishAt?, groups?, scrambleText?, code?, height? }
export function validateGame(input, rng = Math.random) {
  const errors = [];
  const type = GAME_TYPES.includes(input?.type) ? input.type : null;
  if (!type) errors.push("Choose a game type.");
  const title = String(input?.title || "").trim();
  if (!title) errors.push("Give the game a title.");
  const editionLabel = String(input?.editionLabel || "").trim();
  const editionDate = String(input?.editionDate || "").trim();
  if (!editionLabel) errors.push("Name the edition, for example June 2026.");
  if (!isRealDate(editionDate)) errors.push("Edition date must be a real date (YYYY-MM-DD).");
  const publish = parsePublishAt(input?.publishAt);
  if (publish.error) errors.push(publish.error);

  const typed = type === "connections" ? validateConnections(input.groups)
    : type === "scramble" ? validateScramble(input.scrambleText, rng)
    : type === "bee" ? validateBee(input)
    : type === "crossword" ? validateCrossword(input)
    : type === "wordsearch" ? validateWordsearch(input)
    : type === "code" ? validateCode(input.code, input.height)
    : { errors: [], data: {} };
  const allErrors = [...errors, ...typed.errors];
  if (allErrors.length) return { ok: false, errors: allErrors, game: null };

  const id = String(input.id || "").trim() || `${slugify(title)}-${slugify(editionLabel)}`;
  return {
    ok: true,
    errors: [],
    game: {
      id,
      type,
      title,
      kicker: String(input.kicker || "").trim() || TYPE_LABELS[type],
      blurb: String(input.blurb || "").trim(),
      intro: String(input.intro || "").trim(),
      edition: { label: editionLabel, date: editionDate },
      publishAt: publish.iso,
      data: typed.data,
    },
  };
}

// Stored games replace a seed with the same id; a stored tombstone hides it.
export function mergeSeedsAndStored(seeds, stored) {
  const byId = new Map(seeds.map((g) => [g.id, g]));
  (stored || []).forEach((g) => { if (g && g.id) byId.set(g.id, g); });
  return [...byId.values()].filter((g) => !g.deleted);
}

// Groups games under their edition, newest edition first by default.
export function groupByEdition(games, order = "newest") {
  const byKey = new Map();
  games.forEach((g) => {
    const key = `${g.edition?.date || ""}|${g.edition?.label || ""}`;
    const bucket = byKey.get(key) || { label: g.edition?.label || "Undated", date: g.edition?.date || "", games: [] };
    byKey.set(key, { ...bucket, games: [...bucket.games, g] });
  });
  const sign = order === "oldest" ? 1 : -1;
  return [...byKey.values()]
    .map((b) => ({ ...b, games: [...b.games].sort((a, c) => a.title.localeCompare(c.title)) }))
    .sort((a, b) => sign * (a.date.localeCompare(b.date) || a.label.localeCompare(b.label)));
}
