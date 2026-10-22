// The Center Spread front page: every game, grouped by edition.
import { CSStore } from "./store.js";
import { groupByEdition, isLive, formatPublishAt, TYPE_LABELS } from "./validate.js";
import { escapeHtml } from "./games/dom.js";
import { CSEditor } from "./editor.js";
import "./editor-bar.js";

const PREF_KEY = "cs_home_prefs";
const LIVE_CHECK_MS = 60000; // a scheduled game appears on time without a reload
const el = {
  editions: document.getElementById("cs-editions"),
  sort: document.getElementById("cs-sort"),
  filter: document.getElementById("cs-edition"),
  kicker: document.getElementById("cs-kicker"),
};

function readPrefs() { try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { return {}; } }
function writePrefs(prefs) { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* private mode */ } }

let state = { games: [], order: readPrefs().order || "newest", edition: "", isEditor: false };

function card(game) {
  const href = `play.html?id=${encodeURIComponent(game.id)}`;
  const tools = state.isEditor ? `
    <div class="cs-card-tools">
      <button type="button" class="cs-btn cs-btn-quiet" data-edit="${escapeHtml(game.id)}">Edit</button>
      <button type="button" class="cs-btn cs-btn-quiet" data-remove="${escapeHtml(game.id)}">Remove</button>
    </div>` : "";
  const scheduled = !isLive(game);
  return `
    <div class="cs-card-wrap">
      <a class="cs-card${scheduled ? " cs-card--scheduled" : ""}" href="${href}">
        ${scheduled ? `<span class="cs-badge">Scheduled · ${escapeHtml(formatPublishAt(game.publishAt))}</span>` : ""}
        <div class="kicker">${escapeHtml(game.kicker || TYPE_LABELS[game.type] || "Game")}</div>
        <h3>${escapeHtml(game.title)}</h3>
        ${game.blurb ? `<p class="cs-card-excerpt">${escapeHtml(game.blurb)}</p>` : ""}
        <span class="cs-card-action">Play →</span>
      </a>${tools}
    </div>`;
}

function render() {
  const visible = state.isEditor ? state.games : state.games.filter((g) => isLive(g));
  const editions = groupByEdition(visible, state.order);
  const shown = state.edition ? editions.filter((e) => e.label === state.edition) : editions;

  el.filter.innerHTML = `<option value="">All editions</option>${editions.map((e) =>
    `<option value="${escapeHtml(e.label)}"${e.label === state.edition ? " selected" : ""}>${escapeHtml(e.label)}</option>`).join("")}`;
  el.sort.value = state.order;

  el.kicker.textContent = state.edition ? `${state.edition} edition` : "Every edition";

  el.editions.innerHTML = shown.length === 0 ? '<p class="cs-empty">Nothing here yet.</p>' : shown.map((e) => `
    <section class="cs-edition" aria-labelledby="ed-${escapeHtml(e.date)}">
      <h3 class="cs-edition-title" id="ed-${escapeHtml(e.date)}"><span>${escapeHtml(e.label)}</span> <small>${e.games.length} game${e.games.length === 1 ? "" : "s"}</small></h3>
      <div class="cs-card-grid">${e.games.map(card).join("")}</div>
    </section>`).join("");
}

el.sort.addEventListener("change", () => { state = { ...state, order: el.sort.value }; writePrefs({ order: state.order }); render(); });
el.filter.addEventListener("change", () => { state = { ...state, edition: el.filter.value }; render(); });
el.editions.addEventListener("click", (e) => {
  const button = e.target.closest("[data-edit], [data-remove]");
  if (!button) return;
  const game = state.games.find((g) => g.id === (button.dataset.edit || button.dataset.remove));
  if (!game) return;
  if (button.dataset.edit) CSEditor.openGameForm(game); else CSEditor.removeGame(game);
});

CSStore.games.subscribe((games) => { state = { ...state, games }; render(); });
CSStore.onSession((session) => { state = { ...state, isEditor: session.isEditor }; render(); });
setInterval(render, LIVE_CHECK_MS);
