// Editor dialogs: add/edit a game, manage editors, confirm a removal, and the
// demo-mode sign-in. All built on <dialog>, so focus and Escape just work.
import { CSStore } from "./store.js";
import { validateGame, isValidEmail, normalizeEmail, GAME_TYPES, TYPE_LABELS, CONNECTIONS_GROUPS } from "./validate.js";
import { EXAMPLE_CODE } from "./games/code.js";
import { renderGame } from "./games/index.js";
import { escapeHtml } from "./games/dom.js";

const TOAST_MS = 4500;
const GROUP_COLORS = ["yellow", "green", "blue", "purple"];

function dialog(id, html) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const d = document.createElement("dialog");
  d.id = id;
  d.className = "cs-dialog";
  d.innerHTML = html;
  document.body.appendChild(d);
  d.querySelectorAll("[data-cancel]").forEach((b) => b.addEventListener("click", () => d.close("cancel")));
  d.addEventListener("click", (e) => { if (e.target === d) d.close("cancel"); });
  return d;
}

function toast(message) {
  const el = document.createElement("div");
  el.className = "cs-toast";
  el.setAttribute("role", "status");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), TOAST_MS);
}

function confirmDialog(message, confirmLabel = "Remove") {
  return new Promise((resolve) => {
    const d = dialog("cs-confirm", `
      <form method="dialog" class="cs-form cs-form-narrow">
        <p>${escapeHtml(message)}</p>
        <div class="cs-form-actions">
          <button type="button" class="cs-btn" data-cancel>Cancel</button>
          <button type="submit" class="cs-btn cs-btn-danger" value="ok">${escapeHtml(confirmLabel)}</button>
        </div>
      </form>`);
    d.addEventListener("close", () => resolve(d.returnValue === "ok"), { once: true });
    d.showModal();
  });
}

function askDemoEmail() {
  return new Promise((resolve) => {
    const d = dialog("cs-demo-signin", `
      <form method="dialog" class="cs-form cs-form-narrow">
        <h2>Demo sign-in</h2>
        <p class="cs-note">Firebase isn't configured yet, so there is no Google sign-in. Enter an email to act as that editor in this browser only. See SETUP.md to turn on the real thing.</p>
        <label>Email <input name="email" type="email" required autocomplete="off"></label>
        <div class="cs-form-actions">
          <button type="button" class="cs-btn" data-cancel>Cancel</button>
          <button type="submit" class="cs-btn cs-btn-primary" value="ok">Sign in</button>
        </div>
      </form>`);
    const input = d.querySelector("input");
    d.addEventListener("close", () => resolve(d.returnValue === "ok" ? input.value : null), { once: true });
    d.showModal();
  });
}

// ── Game form ────────────────────────────────────────────────────────────────
const groupFields = () => Array.from({ length: CONNECTIONS_GROUPS }, (_, i) => `
  <div class="cs-group cs-group-${GROUP_COLORS[i]}">
    <label>Group ${i + 1} category <input name="cn-name-${i}" placeholder="${i === 0 ? "___Berry" : ""}"></label>
    <label>Four words, comma separated <input name="cn-words-${i}" placeholder="${i === 0 ? "Blue, Cran, Rasp, Straw" : ""}"></label>
  </div>`).join("");

const GAME_FORM = `
  <form class="cs-form" novalidate>
    <h2 data-title>Add a game</h2>
    <label>Game type
      <select name="type">${GAME_TYPES.map((t) => `<option value="${t}">${TYPE_LABELS[t]}</option>`).join("")}</select>
    </label>
    <div class="cs-grid2">
      <label>Edition name <input name="editionLabel" placeholder="June 2026" required></label>
      <label>Edition date <input name="editionDate" type="date" required></label>
    </div>
    <label>Title <input name="title" required></label>
    <div class="cs-grid2">
      <label>Kicker <input name="kicker" placeholder="Game"></label>
      <label>Card blurb <input name="blurb" placeholder="One line shown on the card"></label>
    </div>
    <label>Intro, shown above the game <textarea name="intro" rows="2"></textarea></label>
    <label>Publish <input name="publishAt" type="datetime-local">
      <span class="cs-note">Leave blank to publish as soon as it's saved. Set a date and time to hold it until then: editors see it marked Scheduled, readers don't see it at all.</span>
    </label>

    <fieldset data-type-panel="connections"><legend>Connections</legend>${groupFields()}</fieldset>
    <fieldset data-type-panel="scramble"><legend>Word Scramble</legend>
      <label>Answers, one per line. The scramble is made for you. To choose it yourself write <code>SCRAMBLED = ANSWER</code>.
        <textarea name="scrambleText" rows="8" placeholder="BARBECUE&#10;CEI AECMR = ICE CREAM"></textarea></label>
    </fieldset>
    <fieldset data-type-panel="code"><legend>Custom game</legend>
      <p class="cs-note">Paste a self-contained game: its HTML, CSS and JavaScript in one block. It runs in a sandbox and can't touch the rest of the site. The box starts with a working example.</p>
      <label>Height in pixels <input name="height" type="number" min="200" max="2000" value="500"></label>
      <label>Game code <textarea name="code" rows="14" spellcheck="false"></textarea></label>
    </fieldset>

    <section class="cs-preview" hidden aria-live="polite">
      <h3 class="cs-preview-title">Preview <small class="cs-note">how readers will see it. Change anything and press Refresh preview.</small></h3>
      <div class="cs-preview-piece">
        <div class="print-piece-head"><div class="kicker" data-preview-kicker></div><h3 data-preview-heading></h3></div>
        <p class="print-piece-intro" data-preview-intro></p>
        <div class="cs-preview-root"></div>
      </div>
    </section>

    <p class="cs-form-error" role="alert"></p>
    <div class="cs-form-actions">
      <button type="button" class="cs-btn" data-preview>Preview</button>
      <span class="cs-form-actions-gap"></span>
      <button type="button" class="cs-btn" data-cancel>Cancel</button>
      <button type="submit" class="cs-btn cs-btn-primary">Save game</button>
    </div>
  </form>`;

function fillGameForm(form, game) {
  const set = (name, value) => { const f = form.elements[name]; if (f) f.value = value ?? ""; };
  set("type", game?.type || "connections");
  set("editionLabel", game?.edition?.label);
  set("editionDate", game?.edition?.date);
  set("title", game?.title);
  set("kicker", game?.kicker);
  set("blurb", game?.blurb);
  set("intro", game?.intro);
  set("publishAt", toLocalInput(game?.publishAt));
  (game?.data?.groups || []).forEach((g, i) => { set(`cn-name-${i}`, g.name); set(`cn-words-${i}`, (g.words || []).join(", ")); });
  set("scrambleText", (game?.data?.words || []).map((w) => `${w.scrambled} = ${w.answer}`).join("\n"));
  set("height", game?.data?.height ?? 500);
  set("code", game?.type === "code" ? game.data.code : EXAMPLE_CODE);
}

function readGameForm(form, existingId) {
  const f = (name) => form.elements[name]?.value ?? "";
  return {
    id: existingId || "",
    type: f("type"),
    editionLabel: f("editionLabel"),
    editionDate: f("editionDate"),
    title: f("title"),
    kicker: f("kicker"),
    blurb: f("blurb"),
    intro: f("intro"),
    publishAt: f("publishAt"),
    groups: Array.from({ length: CONNECTIONS_GROUPS }, (_, i) => ({ name: f(`cn-name-${i}`), words: f(`cn-words-${i}`).split(",") })),
    scrambleText: f("scrambleText"),
    code: f("code"),
    height: f("height"),
  };
}

// An ISO time becomes the local "YYYY-MM-DDTHH:MM" a datetime-local input wants.
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Draws the game exactly as a reader would get it, inside the form, before it
// is saved. Title and edition may still be blank at this point, so the preview
// fills them in; the game data itself must validate.
function previewGame(form) {
  const preview = form.querySelector(".cs-preview");
  const error = form.querySelector(".cs-form-error");
  const raw = readGameForm(form, "preview");
  const result = validateGame({
    ...raw,
    title: raw.title || "Untitled game",
    editionLabel: raw.editionLabel || "Edition",
    editionDate: raw.editionDate || "2000-01-01",
  });
  if (!result.ok) { error.innerHTML = result.errors.map(escapeHtml).join("<br>"); return; }
  error.textContent = "";
  const { game } = result;
  preview.querySelector("[data-preview-kicker]").textContent = `${game.kicker} · ${game.edition.label}`;
  preview.querySelector("[data-preview-heading]").textContent = game.title;
  preview.querySelector("[data-preview-intro]").textContent = game.intro;
  renderGame(preview.querySelector(".cs-preview-root"), game);
  preview.hidden = false;
  form.querySelector("[data-preview]").textContent = "Refresh preview";
  preview.scrollIntoView({ block: "start", behavior: "smooth" });
}

function showPanel(form) {
  const type = form.elements.type.value;
  form.querySelectorAll("[data-type-panel]").forEach((p) => { p.hidden = p.dataset.typePanel !== type; });
}

function openGameForm(game) {
  const d = dialog("cs-game-dialog", GAME_FORM);
  const form = d.querySelector("form");
  const error = form.querySelector(".cs-form-error");
  d.querySelector("[data-title]").textContent = game ? `Edit “${game.title}”` : "Add a game";
  fillGameForm(form, game);
  showPanel(form);
  form.elements.type.addEventListener("change", () => showPanel(form));
  form.querySelector("[data-preview]").addEventListener("click", () => previewGame(form));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = validateGame(readGameForm(form, game?.id));
    if (!result.ok) { error.innerHTML = result.errors.map(escapeHtml).join("<br>"); return; }
    try {
      await CSStore.games.save(result.game);
      d.close("saved");
      toast(game ? "Game updated." : "Game added.");
    } catch (err) {
      error.textContent = err?.message || "Could not save the game.";
    }
  });
  d.showModal();
}

async function removeGame(game) {
  const ok = await confirmDialog(`Remove “${game.title}” from the Center Spread? Readers won't see it any more.`);
  if (!ok) return;
  try { await CSStore.games.remove(game.id); toast("Game removed."); }
  catch (err) { toast(err?.message || "Could not remove the game."); }
}

// ── Editors ──────────────────────────────────────────────────────────────────
async function openEditors() {
  const d = dialog("cs-editors-dialog", `
    <form class="cs-form" novalidate>
      <h2>Editors</h2>
      <p class="cs-note">These Google accounts can sign in and change games. Anyone here can add another account.</p>
      <ul class="cs-editor-list" aria-live="polite"><li>Loading…</li></ul>
      <label>Add an editor by Google account email <input name="email" type="email" placeholder="name@maret.org" autocomplete="off"></label>
      <p class="cs-form-error" role="alert"></p>
      <div class="cs-form-actions">
        <button type="button" class="cs-btn" data-cancel>Close</button>
        <button type="submit" class="cs-btn cs-btn-primary">Add editor</button>
      </div>
    </form>`);
  const form = d.querySelector("form");
  const list = d.querySelector(".cs-editor-list");
  const error = d.querySelector(".cs-form-error");
  const me = CSStore.session.user?.email;

  async function refresh() {
    try {
      const editors = await CSStore.editors.list();
      list.innerHTML = editors.map((ed) => `
        <li>
          <span>${escapeHtml(ed.email)}${ed.email === me ? " (you)" : ""}${ed.builtIn ? ' <small class="cs-note">built in</small>' : ""}</span>
          ${ed.builtIn || ed.email === me ? "" : `<button type="button" class="cs-btn cs-btn-quiet" data-remove="${escapeHtml(ed.email)}">Remove</button>`}
        </li>`).join("");
    } catch (err) {
      list.innerHTML = `<li class="cs-error">Could not load editors: ${escapeHtml(err?.message || err)}</li>`;
    }
  }

  list.addEventListener("click", async (e) => {
    const button = e.target.closest("[data-remove]");
    if (!button) return;
    const email = button.dataset.remove;
    if (!(await confirmDialog(`Remove ${email} from the editors?`))) return;
    try { await CSStore.editors.remove(email); toast(`${email} removed.`); refresh(); }
    catch (err) { error.textContent = err?.message || "Could not remove that editor."; }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    error.textContent = "";
    const email = normalizeEmail(form.elements.email.value);
    if (!isValidEmail(email)) { error.textContent = "That doesn't look like an email address."; return; }
    try {
      await CSStore.editors.add(email);
      form.elements.email.value = "";
      toast(`${email} can now sign in as an editor.`);
      refresh();
    } catch (err) {
      error.textContent = err?.message || "Could not add that editor.";
    }
  });

  d.showModal();
  refresh();
}

export const CSEditor = { openGameForm, removeGame, openEditors, askDemoEmail, toast, confirmDialog };
window.CSEditor = CSEditor;
