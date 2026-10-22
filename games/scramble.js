// Word Scramble: one row per word, answers check as you type.
import { escapeHtml } from "./dom.js";

const normalize = (s) => s.toUpperCase().replace(/\s+/g, " ").trim();

export function renderScramble(root, data) {
  const words = data?.words || [];
  root.innerHTML = `
    <div class="ws-controls">
      <span class="ws-status">0 of ${words.length} solved</span>
      <button class="ws-reveal-all-btn" type="button">Reveal all</button>
    </div>
    <ul class="ws-list">
      ${words.map((w, i) => `
        <li class="ws-row" data-i="${i}">
          <span class="ws-num">${String(i + 1).padStart(2, "0")}</span>
          <span class="ws-scramble">${escapeHtml(w.scrambled)}</span>
          <input class="ws-input" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Your guess for ${escapeHtml(w.scrambled)}">
          <button class="ws-show" type="button" aria-label="Reveal answer">show</button>
          <span class="ws-status-icon" aria-hidden="true"></span>
        </li>`).join("")}
    </ul>`;
  const status = root.querySelector(".ws-status");
  const rows = [...root.querySelectorAll(".ws-row")];

  function updateStatus() {
    const found = rows.filter((r) => r.dataset.solved === "true").length;
    status.textContent = `${found} of ${words.length} solved`;
  }
  function markSolved(row) {
    if (row.dataset.solved) return;
    row.dataset.solved = "true";
    const input = row.querySelector(".ws-input");
    input.disabled = true;
    input.classList.add("is-correct");
    row.querySelector(".ws-status-icon").textContent = "✓";
    updateStatus();
  }
  function reveal(row) {
    if (row.dataset.solved) return;
    row.dataset.solved = "revealed";
    const input = row.querySelector(".ws-input");
    input.value = words[Number(row.dataset.i)].answer;
    input.disabled = true;
    input.classList.add("is-revealed");
    row.querySelector(".ws-status-icon").textContent = "○";
  }

  rows.forEach((row) => {
    const answer = words[Number(row.dataset.i)].answer;
    const input = row.querySelector(".ws-input");
    input.addEventListener("input", () => { if (normalize(input.value) === answer) markSolved(row); });
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (normalize(input.value) === answer) markSolved(row); else input.classList.add("is-wrong");
    });
    input.addEventListener("focus", () => input.classList.remove("is-wrong"));
    row.querySelector(".ws-show").addEventListener("click", () => reveal(row));
  });
  root.querySelector(".ws-reveal-all-btn").addEventListener("click", () => rows.forEach(reveal));
}
