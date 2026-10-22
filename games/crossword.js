// Mini Crossword: a five-by-five with every square open. Typing works from a
// keyboard or, on a phone, through an invisible input that a tap focuses.
import { escapeHtml } from "./dom.js";

const SIZE = 5;
const SENTINEL = " ";
const CONFIRM_MS = 3000;
const ACROSS_NUMBERS = [1, 6, 7, 8, 9];
const DOWN_NUMBERS = [1, 2, 3, 4, 5];

const TEMPLATE = `
  <div class="cw-layout">
    <div class="cw-left">
      <div class="cw-meta"><div><div>Mini Crossword</div></div><div class="cw-timer" data-timer>0:00</div></div>
      <div class="cw-grid-wrap">
        <input class="cw-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" tabindex="-1" aria-label="Type a letter for the selected square">
        <div class="cw-grid" data-grid tabindex="0" role="grid" aria-label="Mini crossword, 5 by 5 grid. Use arrow keys to move and type letters to fill in."></div>
      </div>
      <div class="cw-current" aria-live="polite" aria-atomic="true"><span class="label">Clue</span><span data-current>Tap a square to begin.</span></div>
      <div class="cw-controls">
        <button type="button" data-action="reset">Reset</button>
        <button type="button" data-action="check">Check</button>
        <button type="button" data-action="reveal">Reveal letter</button>
        <button type="button" class="primary" data-action="reveal-all">Reveal puzzle</button>
      </div>
      <div class="cw-win" data-win>Solved! Nice work.</div>
    </div>
    <div class="cw-right">
      <h3>Across</h3><ol class="clue-list" data-across></ol>
      <h3>Down</h3><ol class="clue-list" data-down></ol>
    </div>
  </div>`;

const emptyGrid = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
// Every row starts an Across word and every column a Down word, numbered 1..9
// in reading order: 1 is shared by row 1 and column 1, 2-5 are the rest of the
// top row (Down), 6-9 the rest of the first column (Across).
const numberAt = (r, c) => (r === 0 ? c + 1 : c === 0 ? SIZE + r : null);

export function renderCrossword(root, data) {
  const solution = (data?.rows || []).map((row) => String(row).toUpperCase().split(""));
  const clues = { across: data?.across || {}, down: data?.down || {} };
  root.innerHTML = TEMPLATE;
  const el = {
    grid: root.querySelector("[data-grid]"), input: root.querySelector(".cw-input"), timer: root.querySelector("[data-timer]"),
    current: root.querySelector("[data-current]"), win: root.querySelector("[data-win]"),
    across: root.querySelector("[data-across]"), down: root.querySelector("[data-down]"),
  };

  let state = { grid: emptyGrid(), sel: { row: 0, col: 0 }, dir: "across", placed: false, solved: false, revealed: false, startedAt: null };
  let timer = null;

  const clueNumber = () => (state.dir === "across" ? numberAt(state.sel.row, 0) : numberAt(0, state.sel.col));
  const setGrid = (r, c, value) => state.grid.map((row, ri) => (ri === r ? row.map((ch, ci) => (ci === c ? value : ch)) : row));

  function renderGrid() {
    el.grid.innerHTML = state.grid.flatMap((row, r) => row.map((_, c) => {
      const n = numberAt(r, c);
      return `<div class="cw-cell" data-row="${r}" data-col="${c}" role="gridcell">${n ? `<span class="num" aria-hidden="true">${n}</span>` : ""}<span class="letter" aria-hidden="true"></span></div>`;
    })).join("");
  }
  function renderClues() {
    const items = (dir, numbers) => numbers.filter((n) => clues[dir][n]).map((n) =>
      `<li data-num="${n}" data-dir="${dir}"><span class="num">${n}</span><span>${escapeHtml(clues[dir][n])}</span></li>`).join("");
    el.across.innerHTML = items("across", ACROSS_NUMBERS);
    el.down.innerHTML = items("down", DOWN_NUMBERS);
  }
  function update() {
    const inWord = (r, c) => (state.dir === "across" ? r === state.sel.row : c === state.sel.col);
    el.grid.querySelectorAll(".cw-cell").forEach((cell) => {
      const r = Number(cell.dataset.row), c = Number(cell.dataset.col);
      cell.classList.toggle("in-word", inWord(r, c));
      cell.classList.toggle("selected", r === state.sel.row && c === state.sel.col);
      cell.querySelector(".letter").textContent = state.grid[r][c];
      cell.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}, ${state.grid[r][c] || "empty"}${r === state.sel.row && c === state.sel.col ? ", selected" : ""}`);
    });
    const n = clueNumber();
    el.current.textContent = `${n} ${state.dir === "across" ? "Across" : "Down"} — ${clues[state.dir][n] || ""}`;
    root.querySelectorAll(".clue-list li").forEach((li) => li.classList.toggle("active", li.dataset.dir === state.dir && Number(li.dataset.num) === n));
  }

  function tickTimer() {
    const sec = Math.floor((Date.now() - state.startedAt) / 1000);
    el.timer.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  }
  function startTimer() {
    if (state.startedAt || state.solved) return;
    state = { ...state, startedAt: Date.now() };
    timer = setInterval(tickTimer, 1000);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  function checkWin() {
    const done = state.grid.every((row, r) => row.every((ch, c) => ch === solution[r][c]));
    if (!done) return;
    state = { ...state, solved: true };
    stopTimer();
    el.win.textContent = `Solved in ${el.timer.textContent}. Nice work.${state.revealed ? " (Some letters were revealed.)" : ""}`;
    el.win.classList.add("visible");
  }
  function move(step) {
    const sel = state.dir === "across"
      ? { ...state.sel, col: Math.min(SIZE - 1, Math.max(0, state.sel.col + step)) }
      : { ...state.sel, row: Math.min(SIZE - 1, Math.max(0, state.sel.row + step)) };
    state = { ...state, sel };
  }
  function typeLetter(ch) {
    if (state.solved) return;
    startTimer();
    state = { ...state, grid: setGrid(state.sel.row, state.sel.col, ch.toUpperCase()) };
    el.grid.children[state.sel.row * SIZE + state.sel.col]?.classList.remove("wrong");
    move(1); update(); checkWin();
  }
  function backspace() {
    if (state.solved) return;
    if (!state.grid[state.sel.row][state.sel.col]) move(-1);
    state = { ...state, grid: setGrid(state.sel.row, state.sel.col, "") };
    update();
  }
  function arrow(dir, step) {
    if (state.dir !== dir) state = { ...state, dir }; else move(step);
    update();
  }
  function handleKey(e) {
    if (state.solved) return;
    const k = e.key;
    if (/^[a-zA-Z]$/.test(k)) typeLetter(k);
    else if (k === "Backspace") backspace();
    else if (k === "ArrowRight") arrow("across", 1);
    else if (k === "ArrowLeft") arrow("across", -1);
    else if (k === "ArrowDown") arrow("down", 1);
    else if (k === "ArrowUp") arrow("down", -1);
    else if (k === " ") { state = { ...state, dir: state.dir === "across" ? "down" : "across" }; update(); }
    else return;
    e.preventDefault();
  }
  function focusEntry() {
    el.input.value = SENTINEL;
    try { el.input.focus({ preventScroll: true }); } catch { el.input.focus(); }
  }

  el.grid.addEventListener("click", (e) => {
    const cell = e.target.closest(".cw-cell");
    if (!cell) return;
    const r = Number(cell.dataset.row), c = Number(cell.dataset.col);
    const same = state.placed && state.sel.row === r && state.sel.col === c;
    state = { ...state, sel: { row: r, col: c }, dir: same ? (state.dir === "across" ? "down" : "across") : state.dir, placed: true };
    startTimer(); update(); focusEntry();
  });
  root.addEventListener("click", (e) => {
    const li = e.target.closest(".clue-list li");
    if (!li) return;
    const n = Number(li.dataset.num);
    const dir = li.dataset.dir;
    state = { ...state, dir, sel: dir === "across" ? { row: n - SIZE, col: 0 } : { row: 0, col: n - 1 }, placed: true };
    if (dir === "across" && n === 1) state = { ...state, sel: { row: 0, col: 0 } };
    update(); focusEntry();
  });
  el.grid.addEventListener("keydown", handleKey);
  el.input.addEventListener("keydown", (e) => { if (!/^[a-zA-Z]$/.test(e.key) && e.key !== "Backspace") handleKey(e); });
  el.input.addEventListener("input", () => {
    const v = el.input.value;
    if (v.length > SENTINEL.length && /^[a-zA-Z]$/.test(v.slice(-1))) typeLetter(v.slice(-1));
    else if (v.length < SENTINEL.length) backspace();
    el.input.value = SENTINEL;
  });

  root.querySelector('[data-action="reset"]').addEventListener("click", () => {
    stopTimer();
    state = { ...state, grid: emptyGrid(), solved: false, revealed: false, startedAt: null };
    el.grid.querySelectorAll(".wrong").forEach((c) => c.classList.remove("wrong"));
    el.win.classList.remove("visible");
    el.timer.textContent = "0:00";
    update();
  });
  root.querySelector('[data-action="check"]').addEventListener("click", () => {
    el.grid.querySelectorAll(".cw-cell").forEach((cell) => {
      const r = Number(cell.dataset.row), c = Number(cell.dataset.col);
      cell.classList.toggle("wrong", Boolean(state.grid[r][c]) && state.grid[r][c] !== solution[r][c]);
    });
  });
  root.querySelector('[data-action="reveal"]').addEventListener("click", () => {
    const { row, col } = state.sel;
    state = { ...state, revealed: true, grid: setGrid(row, col, solution[row][col]) };
    el.grid.children[row * SIZE + col]?.classList.remove("wrong");
    update(); checkWin();
  });
  // Revealing everything ends the puzzle, so it asks for a second click rather
  // than a blocking confirm dialog.
  const revealAll = root.querySelector('[data-action="reveal-all"]');
  revealAll.addEventListener("click", () => {
    if (revealAll.dataset.armed !== "true") {
      revealAll.dataset.armed = "true";
      revealAll.textContent = "Click again to reveal";
      setTimeout(() => { revealAll.dataset.armed = "false"; revealAll.textContent = "Reveal puzzle"; }, CONFIRM_MS);
      return;
    }
    revealAll.dataset.armed = "false";
    revealAll.textContent = "Reveal puzzle";
    state = { ...state, revealed: true, grid: solution.map((row) => row.slice()) };
    el.grid.querySelectorAll(".wrong").forEach((c) => c.classList.remove("wrong"));
    update(); checkWin();
  });

  renderGrid(); renderClues(); update();
}
