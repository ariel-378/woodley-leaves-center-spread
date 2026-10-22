// Connections: sixteen tiles, four hidden groups, five mistakes.
import { escapeHtml, shuffled } from "./dom.js";

const MAX_MISTAKES = 5;
const GROUP_SIZE = 4;
const SHAKE_MS = 500;
const REVEAL_DELAY_MS = 550;

const TEMPLATE = `
  <div class="conn-game">
    <div class="conn-solved-rows" aria-live="polite"></div>
    <div class="conn-grid" role="grid" aria-label="Connections puzzle tiles"></div>
    <div class="conn-status-bar">
      <span class="conn-mistakes-label">Mistakes remaining: <span class="conn-hearts" aria-label="Mistakes remaining"></span></span>
      <span class="conn-message" aria-live="polite"></span>
    </div>
    <div class="conn-controls">
      <button class="conn-btn" data-action="shuffle" type="button">Shuffle</button>
      <button class="conn-btn" data-action="deselect" type="button" disabled>Deselect all</button>
      <button class="conn-btn conn-btn-primary" data-action="submit" type="button" disabled>Submit</button>
    </div>
  </div>`;

export function renderConnections(root, data) {
  const groups = (data?.groups || []).map((g, i) => ({ ...g, level: i + 1 }));
  root.innerHTML = TEMPLATE;
  const el = {
    grid: root.querySelector(".conn-grid"),
    solved: root.querySelector(".conn-solved-rows"),
    message: root.querySelector(".conn-message"),
    hearts: root.querySelector(".conn-hearts"),
    submit: root.querySelector('[data-action="submit"]'),
    deselect: root.querySelector('[data-action="deselect"]'),
    shuffle: root.querySelector('[data-action="shuffle"]'),
  };

  // Game state. Each step replaces the object rather than editing it in place.
  let state = {
    tiles: shuffled(groups.flatMap((g, gi) => g.words.map((word) => ({ word, group: gi })))),
    selected: [],
    mistakes: 0,
    solved: [],
    over: false,
  };

  const solvedRow = (g, revealed) => `
    <div class="conn-solved-row cat-${g.level}${revealed ? " is-revealed" : ""}">
      <div class="conn-solved-name">${escapeHtml(g.name)}</div>
      <div class="conn-solved-words">${g.words.map(escapeHtml).join(" · ")}</div>
    </div>`;

  function setMessage(text, kind) {
    el.message.textContent = text;
    el.message.dataset.kind = kind || "";
  }

  function render() {
    el.hearts.innerHTML = Array.from({ length: MAX_MISTAKES }, (_, i) =>
      `<span class="conn-heart" data-active="${i < MAX_MISTAKES - state.mistakes}">●</span>`).join("");
    el.grid.innerHTML = state.tiles.map((t, i) =>
      `<button type="button" class="conn-tile${state.selected.includes(i) ? " is-selected" : ""}" data-idx="${i}"${state.over ? " disabled" : ""}>${escapeHtml(t.word)}</button>`).join("");
    el.submit.disabled = state.selected.length !== GROUP_SIZE || state.over;
    el.deselect.disabled = state.selected.length === 0 || state.over;
    el.shuffle.disabled = state.over;
  }

  function lockGroup(groupIndex) {
    el.solved.insertAdjacentHTML("beforeend", solvedRow(groups[groupIndex], false));
    const solved = [...state.solved, groupIndex];
    const over = solved.length === groups.length;
    state = { ...state, tiles: state.tiles.filter((t) => t.group !== groupIndex), selected: [], solved, over };
    setMessage(over ? "Solved! Nicely done." : "Correct!", "win");
    render();
  }

  function revealRemaining() {
    groups.forEach((g, gi) => { if (!state.solved.includes(gi)) el.solved.insertAdjacentHTML("beforeend", solvedRow(g, true)); });
    state = { ...state, tiles: [], selected: [], over: true };
    setMessage("Out of guesses. Answers revealed.", "lose");
    render();
  }

  function submit() {
    if (state.selected.length !== GROUP_SIZE || state.over) return;
    const picks = state.selected.map((i) => state.tiles[i]);
    const counts = picks.reduce((acc, p) => ({ ...acc, [p.group]: (acc[p.group] || 0) + 1 }), {});
    const best = Math.max(...Object.values(counts));
    if (best === GROUP_SIZE) { lockGroup(picks[0].group); return; }

    state = { ...state, mistakes: state.mistakes + 1 };
    el.grid.querySelectorAll(".is-selected").forEach((tile) => {
      tile.classList.add("is-shake");
      setTimeout(() => tile.classList.remove("is-shake"), SHAKE_MS);
    });
    setMessage(best === GROUP_SIZE - 1 ? "One away…" : "Not quite.", "warn");
    render();
    if (state.mistakes >= MAX_MISTAKES) setTimeout(revealRemaining, REVEAL_DELAY_MS);
  }

  el.grid.addEventListener("click", (e) => {
    const tile = e.target.closest(".conn-tile");
    if (!tile || state.over) return;
    const i = Number(tile.dataset.idx);
    const selected = state.selected.includes(i) ? state.selected.filter((s) => s !== i)
      : state.selected.length < GROUP_SIZE ? [...state.selected, i] : state.selected;
    state = { ...state, selected };
    render();
  });
  el.submit.addEventListener("click", submit);
  el.deselect.addEventListener("click", () => { state = { ...state, selected: [] }; render(); });
  el.shuffle.addEventListener("click", () => { if (!state.over) { state = { ...state, tiles: shuffled(state.tiles), selected: [] }; render(); } });

  render();
}
