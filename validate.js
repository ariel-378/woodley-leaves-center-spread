// Pure helpers for the Center Spread: validation, scrambling, edition grouping.
// No DOM, no storage, so everything here is covered by tests/validate.test.mjs.

export const GAME_TYPES = ["connections", "scramble", "code"];
export const TYPE_LABELS = { connections: "Connections", scramble: "Word Scramble", code: "Custom game" };
export const CONNECTIONS_GROUPS = 4;
export const WORDS_PER_GROUP = 4;
export const MIN_SCRAMBLE_WORDS = 3;
export const CODE_HEIGHT = { min: 200, max: 2000, fallback: 500 };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCRAMBLE_ATTEMPTS = 12;

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

function validateCode(code, height) {
  const errors = [];
  const text = String(code || "").trim();
  if (!text) errors.push("Paste the game's code.");
  const h = Number.parseInt(height, 10);
  const safeHeight = Number.isFinite(h) ? Math.min(CODE_HEIGHT.max, Math.max(CODE_HEIGHT.min, h)) : CODE_HEIGHT.fallback;
  return { errors, data: { code: text, height: safeHeight } };
}

// Turns raw form input into a stored game, or a list of errors. `input` is:
// { id?, type, title, kicker, blurb, intro, editionLabel, editionDate,
//   groups?, scrambleText?, code?, height? }
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

  const typed = type === "connections" ? validateConnections(input.groups)
    : type === "scramble" ? validateScramble(input.scrambleText, rng)
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
