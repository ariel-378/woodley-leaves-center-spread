// One game, chosen by ?id=, rendered from the store.
import { CSStore } from "./store.js";
import { renderGame } from "./games/index.js";
import { TYPE_LABELS } from "./validate.js";
import { escapeHtml } from "./games/dom.js";
import { CSEditor } from "./editor.js";
import "./editor-bar.js";

const id = new URLSearchParams(location.search).get("id");
const el = { piece: document.getElementById("cs-play"), dateline: document.querySelector(".dateline") };
let current = { game: null, signature: "", isEditor: false };

function renderMissing() {
  document.title = "Game not found — The Centerspread";
  el.piece.innerHTML = `
    <div class="print-piece-head"><div class="kicker">Centerspread</div><h3>Game not found</h3></div>
    <p class="print-piece-intro">That game isn't on the Center Spread any more. <a href="index.html">See every game →</a></p>`;
}

function renderTools() {
  const old = el.piece.querySelector(".cs-piece-tools");
  if (old) old.remove();
  if (!current.isEditor || !current.game) return;
  const tools = document.createElement("div");
  tools.className = "cs-piece-tools";
  tools.innerHTML = `
    <button type="button" class="cs-btn cs-btn-quiet" data-edit>Edit game</button>
    <button type="button" class="cs-btn cs-btn-quiet" data-remove>Remove game</button>`;
  tools.querySelector("[data-edit]").addEventListener("click", () => CSEditor.openGameForm(current.game));
  tools.querySelector("[data-remove]").addEventListener("click", async () => { await CSEditor.removeGame(current.game); });
  el.piece.prepend(tools);
}

function renderPiece(game) {
  document.title = `${game.title} — The Centerspread`;
  if (el.dateline) el.dateline.textContent = `MARET SCHOOL · ${game.edition.label.toUpperCase()} EDITION`;
  el.piece.innerHTML = `
    <div class="print-piece-head">
      <div class="kicker">${escapeHtml(game.kicker || TYPE_LABELS[game.type] || "Game")} · ${escapeHtml(game.edition.label)}</div>
      <h3>${escapeHtml(game.title)}</h3>
    </div>
    ${game.intro ? `<p class="print-piece-intro">${escapeHtml(game.intro)}</p>` : ""}
    <div class="cs-game-root"></div>`;
  renderGame(el.piece.querySelector(".cs-game-root"), game);
  renderTools();
}

CSStore.games.subscribe((games) => {
  const game = games.find((g) => g.id === id) || null;
  if (!game) { current = { ...current, game: null, signature: "" }; renderMissing(); return; }
  // Only redraw when the game itself changed, so a store refresh doesn't reset play.
  const signature = JSON.stringify({ t: game.title, k: game.kicker, i: game.intro, e: game.edition, d: game.data, y: game.type });
  if (signature === current.signature) return;
  current = { ...current, game, signature };
  renderPiece(game);
});

CSStore.onSession((session) => {
  current = { ...current, isEditor: session.isEditor };
  renderTools();
});
