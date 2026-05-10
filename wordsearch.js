  // ===== Interactive Spring Word Search =====
  (function () {
    const WORDS = [
      "ALLERGIES", "APRILFOOLSDAY", "BEES", "CHERRYBLOSSOMS", "CLEANING",
      "DAYLIGHTSAVINGS", "FLOWERS", "GARDENING", "MARCH", "MAY",
      "PICNIC", "RAIN", "SPRINGBREAK", "SUNSHINE"
    ];
    const DISPLAY = {
      ALLERGIES: "Allergies", APRILFOOLSDAY: "April Fools Day", BEES: "Bees",
      CHERRYBLOSSOMS: "Cherry Blossoms", CLEANING: "Cleaning",
      DAYLIGHTSAVINGS: "Daylight Savings", FLOWERS: "Flowers", GARDENING: "Gardening",
      MARCH: "March", MAY: "May", PICNIC: "Picnic", RAIN: "Rain",
      SPRINGBREAK: "Spring Break", SUNSHINE: "Sunshine"
    };
    const SIZE = 16;
    const DIRS = [
      [-1, -1], [-1, 0], [-1, 1],
      [ 0, -1],          [ 0, 1],
      [ 1, -1], [ 1, 0], [ 1, 1]
    ];

    const gridEl = document.getElementById("ws-grid");
    const listEl = document.getElementById("ws-list");
    const statusEl = document.getElementById("ws-status");
    const doneEl = document.getElementById("ws-done");
    const revealBtn = document.getElementById("ws-reveal");
    const resetBtn = document.getElementById("ws-reset");
    if (!gridEl) return;

    let grid = [];           // SIZE x SIZE letters
    let placements = [];     // [{word, cells: [[r,c],…]}]
    let found = new Set();   // found word strings

    // ---- Grid generation ----
    function tryGenerate() {
      const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
      const plcs = [];
      // Place longer words first — they're harder to fit
      const sorted = [...WORDS].sort((a, b) => b.length - a.length);
      for (const word of sorted) {
        let placed = false;
        for (let attempt = 0; attempt < 400 && !placed; attempt++) {
          const [dr, dc] = DIRS[Math.floor(Math.random() * DIRS.length)];
          const r0 = Math.floor(Math.random() * SIZE);
          const c0 = Math.floor(Math.random() * SIZE);
          const rEnd = r0 + dr * (word.length - 1);
          const cEnd = c0 + dc * (word.length - 1);
          if (rEnd < 0 || rEnd >= SIZE || cEnd < 0 || cEnd >= SIZE) continue;
          let ok = true;
          for (let i = 0; i < word.length; i++) {
            const r = r0 + dr * i, c = c0 + dc * i;
            if (g[r][c] !== "" && g[r][c] !== word[i]) { ok = false; break; }
          }
          if (!ok) continue;
          const cells = [];
          for (let i = 0; i < word.length; i++) {
            const r = r0 + dr * i, c = c0 + dc * i;
            g[r][c] = word[i];
            cells.push([r, c]);
          }
          plcs.push({ word, cells });
          placed = true;
        }
        if (!placed) return null;  // retry whole grid
      }
      // Fill empty with random letters
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (g[r][c] === "") g[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }
      return { g, plcs };
    }

    function generate() {
      for (let tries = 0; tries < 30; tries++) {
        const result = tryGenerate();
        if (result) { grid = result.g; placements = result.plcs; return; }
      }
      // Should never happen, but if it does fall through with a less-populated grid
      const result = tryGenerate();
      if (result) { grid = result.g; placements = result.plcs; }
    }

    // ---- Rendering ----
    function renderGrid() {
      gridEl.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
      gridEl.innerHTML = "";
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const cell = document.createElement("div");
          cell.className = "ws-cell";
          cell.textContent = grid[r][c];
          cell.dataset.r = r;
          cell.dataset.c = c;
          gridEl.appendChild(cell);
        }
      }
    }

    function renderList() {
      listEl.innerHTML = "";
      Object.keys(DISPLAY).sort((a, b) => DISPLAY[a].localeCompare(DISPLAY[b])).forEach(word => {
        const li = document.createElement("li");
        li.textContent = DISPLAY[word];
        li.dataset.word = word;
        if (found.has(word)) li.classList.add("found");
        listEl.appendChild(li);
      });
    }

    function updateStatus() {
      statusEl.textContent = `${found.size} of ${WORDS.length} found`;
      if (found.size === WORDS.length) doneEl.hidden = false;
      else doneEl.hidden = true;
    }

    // ---- Selection (pointer events) ----
    let dragging = false;
    let startCell = null;   // [r, c]
    let endCell = null;     // [r, c]

    function cellFromPoint(x, y) {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      const td = el.closest(".ws-cell");
      if (!td || !gridEl.contains(td)) return null;
      return [+td.dataset.r, +td.dataset.c];
    }

    function linearCells(start, end) {
      const [r1, c1] = start, [r2, c2] = end;
      const dr = r2 - r1, dc = c2 - c1;
      if (dr === 0 && dc === 0) return [[r1, c1]];
      if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;  // not a line
      const len = Math.max(Math.abs(dr), Math.abs(dc));
      const sr = Math.sign(dr), sc = Math.sign(dc);
      const cells = [];
      for (let i = 0; i <= len; i++) cells.push([r1 + sr * i, c1 + sc * i]);
      return cells;
    }

    function clearSelecting() {
      gridEl.querySelectorAll(".ws-cell.selecting").forEach(el => el.classList.remove("selecting"));
    }

    function highlightSelection(cells) {
      clearSelecting();
      if (!cells) return;
      cells.forEach(([r, c]) => {
        const el = gridEl.querySelector(`.ws-cell[data-r="${r}"][data-c="${c}"]`);
        if (el) el.classList.add("selecting");
      });
    }

    function markFoundCells(cells) {
      cells.forEach(([r, c]) => {
        const el = gridEl.querySelector(`.ws-cell[data-r="${r}"][data-c="${c}"]`);
        if (el) el.classList.add("found");
      });
    }

    function finalizeSelection() {
      const s = startCell, e = endCell;
      clearSelecting();
      dragging = false;
      startCell = null;
      endCell = null;
      if (!s || !e) return;
      const cells = linearCells(s, e);
      if (!cells) return;
      const selected = cells.map(([r, c]) => grid[r][c]).join("");
      const reversed = selected.split("").reverse().join("");
      const match = WORDS.find(w => (w === selected || w === reversed) && !found.has(w));
      if (match) {
        found.add(match);
        markFoundCells(cells);
        const li = listEl.querySelector(`li[data-word="${match}"]`);
        if (li) li.classList.add("found");
        updateStatus();
      }
    }

    gridEl.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const pos = cellFromPoint(e.clientX, e.clientY);
      if (!pos) return;
      dragging = true;
      startCell = pos;
      endCell = pos;
      highlightSelection([pos]);
      gridEl.setPointerCapture(e.pointerId);
    });
    gridEl.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const pos = cellFromPoint(e.clientX, e.clientY);
      if (!pos) return;
      endCell = pos;
      const cells = linearCells(startCell, endCell);
      highlightSelection(cells);
    });
    gridEl.addEventListener("pointerup", finalizeSelection);
    gridEl.addEventListener("pointercancel", finalizeSelection);

    // Reveal all — fill in remaining words
    revealBtn.addEventListener("click", () => {
      placements.forEach(p => {
        if (!found.has(p.word)) {
          found.add(p.word);
          markFoundCells(p.cells);
          const li = listEl.querySelector(`li[data-word="${p.word}"]`);
          if (li) li.classList.add("found");
        }
      });
      updateStatus();
    });

    // New grid — regenerate
    resetBtn.addEventListener("click", () => {
      found = new Set();
      generate();
      renderGrid();
      renderList();
      updateStatus();
    });

    // Initial render
    generate();
    renderGrid();
    renderList();
    updateStatus();
  })();
