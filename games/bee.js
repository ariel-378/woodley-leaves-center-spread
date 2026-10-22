// Spelling Bee: make words from seven letters; every word uses the center.
import { escapeHtml, shuffled } from "./dom.js";

const MIN_WORD = 4;
const MAX_GUESS = 20;
const FLASH_MS = 1500;
const PANGRAM_BONUS = 7;
const RANKS = [["Beginner", 0], ["Good Start", 2], ["Moving Up", 5], ["Good", 8], ["Solid", 15], ["Nice", 25], ["Great", 40], ["Amazing", 50], ["Genius", 70], ["Queen Bee", 100]];

const TEMPLATE = `
  <div class="sb-layout" tabindex="0" aria-label="Spelling Bee. Type letters, Backspace to delete, Enter to submit.">
    <div class="sb-left">
      <div class="sb-status"><span data-rank>Beginner</span><span class="sb-score-num" data-score>0</span></div>
      <div class="sb-msg" data-msg aria-live="polite" aria-atomic="true"></div>
      <div class="sb-guess" data-guess></div>
      <div class="sb-honeycomb" data-honeycomb></div>
      <div class="sb-controls">
        <button type="button" data-action="delete">Delete</button>
        <button type="button" data-action="shuffle">Shuffle</button>
        <button type="button" class="sb-enter" data-action="enter">Enter</button>
      </div>
    </div>
    <div class="sb-right">
      <h3>Found <span data-found-count>0</span></h3>
      <ul class="sb-found-list" data-found></ul>
    </div>
  </div>`;

export function renderBee(root, data) {
  const center = String(data?.center || "").toUpperCase();
  const outer = (data?.outer || []).map((l) => String(l).toUpperCase());
  const words = (data?.words || []).map((w) => String(w).toUpperCase());
  const letters = new Set([center, ...outer]);
  const storageKey = `cs_bee_found_${center}${outer.join("")}`;

  const isPangram = (word) => [...letters].every((l) => word.includes(l));
  const pointsFor = (word) => (word.length === MIN_WORD ? 1 : word.length) + (isPangram(word) ? PANGRAM_BONUS : 0);
  const maxPoints = words.reduce((sum, w) => sum + pointsFor(w), 0);
  const rankFor = (score) => RANKS.reduce((name, [n, pct]) => (score >= Math.floor(maxPoints * pct / 100) ? n : name), "Beginner");

  root.innerHTML = TEMPLATE;
  const el = {
    layout: root.querySelector(".sb-layout"),
    honeycomb: root.querySelector("[data-honeycomb]"),
    guess: root.querySelector("[data-guess]"),
    msg: root.querySelector("[data-msg]"),
    found: root.querySelector("[data-found]"),
    foundCount: root.querySelector("[data-found-count]"),
    score: root.querySelector("[data-score]"),
    rank: root.querySelector("[data-rank]"),
  };

  const loadFound = () => { try { return (JSON.parse(localStorage.getItem(storageKey)) || []).filter((w) => words.includes(w)); } catch { return []; } };
  let state = { found: loadFound(), guess: "", order: outer.slice() };
  const saveFound = () => { try { localStorage.setItem(storageKey, JSON.stringify(state.found)); } catch { /* private mode */ } };

  function renderHoneycomb() {
    const [a, b, c, d, e, f] = state.order;
    const rows = [[a, b], [c, center, d], [e, f]];
    el.honeycomb.innerHTML = rows.map((row) => `<div class="sb-row">${row.map((l) =>
      `<button type="button" class="sb-cell${l === center ? " sb-center" : ""}" data-letter="${escapeHtml(l)}" aria-label="${escapeHtml(l === center ? `${l}, center letter, required in every word` : l)}">${escapeHtml(l)}</button>`).join("")}</div>`).join("");
  }
  function renderGuess() {
    el.guess.innerHTML = [...state.guess].map((ch) =>
      `<span class="${ch === center ? "sb-center-letter" : letters.has(ch) ? "" : "sb-bad-letter"}">${escapeHtml(ch)}</span>`).join("");
  }
  function renderFound() {
    el.foundCount.textContent = state.found.length;
    el.found.innerHTML = state.found.length === 0
      ? '<li class="sb-found-empty" style="grid-column: 1 / -1">Words you find appear here.</li>'
      : [...state.found].sort().map((w) => `<li${isPangram(w) ? ' class="pangram"' : ""}>${escapeHtml(w.toLowerCase())}</li>`).join("");
    const score = state.found.reduce((sum, w) => sum + pointsFor(w), 0);
    el.score.textContent = score;
    el.rank.textContent = rankFor(score);
  }
  function flash(text) {
    el.msg.textContent = text;
    setTimeout(() => { if (el.msg.textContent === text) el.msg.textContent = ""; }, FLASH_MS);
  }
  function shake() {
    el.guess.classList.remove("shake");
    void el.guess.offsetWidth;
    el.guess.classList.add("shake");
  }

  function addLetter(letter) {
    if (state.guess.length >= MAX_GUESS) return;
    state = { ...state, guess: state.guess + letter };
    renderGuess();
  }
  function backspace() { state = { ...state, guess: state.guess.slice(0, -1) }; renderGuess(); }
  function submit() {
    const word = state.guess;
    if (!word) return;
    if (word.length < MIN_WORD) { flash("Too short"); shake(); return; }
    if (!word.includes(center)) { flash("Missing center letter"); shake(); return; }
    if ([...word].some((ch) => !letters.has(ch))) { flash("Bad letters"); shake(); return; }
    if (state.found.includes(word)) { flash("Already found"); return; }
    if (!words.includes(word)) { flash("Not in word list"); shake(); return; }
    const pts = pointsFor(word);
    flash(isPangram(word) ? `Pangram! +${pts}` : word.length >= 7 ? `Awesome! +${pts}` : word.length >= 5 ? `Nice! +${pts}` : `+${pts}`);
    state = { ...state, found: [...state.found, word], guess: "" };
    saveFound();
    renderGuess();
    renderFound();
  }

  el.honeycomb.addEventListener("click", (e) => {
    const cell = e.target.closest("[data-letter]");
    if (cell) addLetter(cell.dataset.letter);
  });
  root.querySelector('[data-action="delete"]').addEventListener("click", backspace);
  root.querySelector('[data-action="shuffle"]').addEventListener("click", () => { state = { ...state, order: shuffled(state.order) }; renderHoneycomb(); });
  root.querySelector('[data-action="enter"]').addEventListener("click", submit);
  // The keyboard works once the reader has clicked or tabbed into the game.
  el.layout.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (/^[a-zA-Z]$/.test(e.key)) { addLetter(e.key.toUpperCase()); e.preventDefault(); }
    else if (e.key === "Backspace") { backspace(); e.preventDefault(); }
    else if (e.key === "Enter") { submit(); e.preventDefault(); }
  });

  renderHoneycomb();
  renderGuess();
  renderFound();
}
