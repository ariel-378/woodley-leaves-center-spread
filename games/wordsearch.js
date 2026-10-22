// Word Search: words hidden in a generated grid; drag across letters to find them.
import { escapeHtml } from "./dom.js";

const SIZE = 16;
const PLACE_ATTEMPTS = 400;
const GRID_ATTEMPTS = 30;
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
export const gridForm = (w) => String(w).toUpperCase().replace(/[^A-Z0-9]/g, "");

const randomLetter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));

function tryPlace(grid, word) {
  for (let attempt = 0; attempt < PLACE_ATTEMPTS; attempt += 1) {
    const [dr, dc] = DIRS[Math.floor(Math.random() * DIRS.length)];
    const r0 = Math.floor(Math.random() * SIZE);
    const c0 = Math.floor(Math.random() * SIZE);
    const rEnd = r0 + dr * (word.length - 1);
    const cEnd = c0 + dc * (word.length - 1);
    if (rEnd < 0 || rEnd >= SIZE || cEnd < 0 || cEnd >= SIZE) continue;
    const cells = [...word].map((_, i) => [r0 + dr * i, c0 + dc * i]);
    if (cells.some(([r, c], i) => grid[r][c] !== "" && grid[r][c] !== word[i])) continue;
    const next = grid.map((row) => row.slice());
    cells.forEach(([r, c], i) => { next[r][c] = word[i]; });
    return { grid: next, cells };
  }
  return null;
}

function tryGenerate(words) {
  const sorted = [...words].sort((a, b) => b.length - a.length);
  let grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
  const placements = [];
  for (const word of sorted) {
    const placed = tryPlace(grid, word);
    if (!placed) return null;
    grid = placed.grid;
    placements.push({ word, cells: placed.cells });
  }
  return { grid: grid.map((row) => row.map((ch) => ch || randomLetter())), placements };
}

function generate(words) {
  for (let i = 0; i < GRID_ATTEMPTS; i += 1) {
    const result = tryGenerate(words);
    if (result) return result;
  }
  return { grid: Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, randomLetter)), placements: [] };
}

function linearCells([r1, c1], [r2, c2]) {
  const dr = r2 - r1, dc = c2 - c1;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const len = Math.max(Math.abs(dr), Math.abs(dc));
  return Array.from({ length: len + 1 }, (_, i) => [r1 + Math.sign(dr) * i, c1 + Math.sign(dc) * i]);
}

export function renderWordsearch(root, data) {
  const display = {};
  (data?.words || []).forEach((w) => { const key = gridForm(w); if (key) display[key] = String(w).trim(); });
  const words = Object.keys(display);

  root.innerHTML = `
    <div class="wordsearch-layout">
      <div class="wordsearch-panel">
        <div class="wordsearch-grid" data-grid aria-label="Word search grid"></div>
        <div class="wordsearch-controls">
          <span class="wordsearch-status" data-status></span>
          <button class="btn-toggle-solution" type="button" data-action="reveal">Reveal all</button>
          <button class="btn-toggle-solution btn-toggle-solution--ghost" type="button" data-action="reset">New grid</button>
        </div>
      </div>
      <ul class="wordsearch-list" data-list></ul>
    </div>
    <div class="ws-done" data-done hidden>All ${words.length} words found. Nice work.</div>`;
  const el = { grid: root.querySelector("[data-grid]"), list: root.querySelector("[data-list]"), status: root.querySelector("[data-status]"), done: root.querySelector("[data-done]") };

  let state = { ...generate(words), found: [], drag: null };
  const cellEl = ([r, c]) => el.grid.querySelector(`.ws-cell[data-r="${r}"][data-c="${c}"]`);

  function renderGrid() {
    el.grid.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
    el.grid.innerHTML = state.grid.map((row, r) => row.map((ch, c) => `<div class="ws-cell" data-r="${r}" data-c="${c}">${ch}</div>`).join("")).join("");
  }
  function renderList() {
    el.list.innerHTML = words.slice().sort((a, b) => display[a].localeCompare(display[b])).map((w) =>
      `<li data-word="${escapeHtml(w)}"${state.found.includes(w) ? ' class="found"' : ""}>${escapeHtml(display[w])}</li>`).join("");
  }
  function renderStatus() {
    el.status.textContent = `${state.found.length} of ${words.length} found`;
    el.done.hidden = state.found.length !== words.length;
  }
  function markFound(word, cells) {
    state = { ...state, found: [...state.found, word] };
    cells.forEach((pos) => cellEl(pos)?.classList.add("found"));
    el.list.querySelector(`li[data-word="${word}"]`)?.classList.add("found");
    renderStatus();
  }
  function highlight(cells) {
    el.grid.querySelectorAll(".ws-cell.selecting").forEach((c) => c.classList.remove("selecting"));
    (cells || []).forEach((pos) => cellEl(pos)?.classList.add("selecting"));
  }
  function cellAt(x, y) {
    const cell = document.elementFromPoint(x, y)?.closest(".ws-cell");
    return cell && el.grid.contains(cell) ? [Number(cell.dataset.r), Number(cell.dataset.c)] : null;
  }
  function finish() {
    const drag = state.drag;
    state = { ...state, drag: null };
    highlight(null);
    if (!drag) return;
    const cells = linearCells(drag.start, drag.end);
    if (!cells) return;
    const picked = cells.map(([r, c]) => state.grid[r][c]).join("");
    const reversed = [...picked].reverse().join("");
    const match = words.find((w) => (w === picked || w === reversed) && !state.found.includes(w));
    if (match) markFound(match, cells);
  }

  el.grid.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const pos = cellAt(e.clientX, e.clientY);
    if (!pos) return;
    state = { ...state, drag: { start: pos, end: pos } };
    highlight([pos]);
    el.grid.setPointerCapture(e.pointerId);
  });
  el.grid.addEventListener("pointermove", (e) => {
    if (!state.drag) return;
    const pos = cellAt(e.clientX, e.clientY);
    if (!pos) return;
    state = { ...state, drag: { ...state.drag, end: pos } };
    highlight(linearCells(state.drag.start, pos));
  });
  el.grid.addEventListener("pointerup", finish);
  el.grid.addEventListener("pointercancel", finish);
  root.querySelector('[data-action="reveal"]').addEventListener("click", () => {
    state.placements.forEach((p) => { if (!state.found.includes(p.word)) markFound(p.word, p.cells); });
  });
  root.querySelector('[data-action="reset"]').addEventListener("click", () => {
    state = { ...generate(words), found: [], drag: null };
    renderGrid(); renderList(); renderStatus();
  });

  renderGrid(); renderList(); renderStatus();
}
