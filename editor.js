// Editor dialogs: add/edit a game, manage editors, confirm a removal, and the
// demo-mode sign-in. All built on <dialog>, so focus and Escape just work.
import { CSStore } from "./store.js";
import { validateGame, isValidEmail, normalizeEmail, GAME_TYPES, TYPE_LABELS, CONNECTIONS_GROUPS } from "./validate.js";
import { EXAMPLE_CODE, renderCode } from "./games/code.js";
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

    <fieldset data-type-panel="connections"><legend>Connections</legend>${groupFields()}</fieldset>
    <fieldset data-type-panel="scramble"><legend>Word Scramble</legend>
      <label>Answers, one per line. The scramble is made for you. To choose it yourself write <code>SCRAMBLED = ANSWER</code>.
        <textarea name="scrambleText" rows="8" placeholder="BARBECUE&#10;CEI AECMR = ICE CREAM"></textarea></label>
    </fieldset>
    <fieldset data-type-panel="code"><legend>Custom game</legend>
      <p class="cs-note">Paste a self-contained game: its HTML, CSS and JavaScript in one block. It runs in a sandbox and can't touch the rest of the site. The box starts with a working example.</p>
      <label>Height in pixels <input name="height" type="number" min="200" max="2000" value="500"></label>
      <label>Game code <textarea name="code" rows="14" spellcheck="false"></textarea></label>
      <div class="cs-form-actions cs-form-actions-start">
        <button type="button" class="cs-btn" data-preview>Preview</button>
      </div>
      <div class="cs-code-preview" hidden>
        <p class="cs-note">This is how readers will see it. Change the code and press Refresh preview to see the result.</p>
        <div class="cs-code-preview-frame"></div>
      </div>
    </fieldset>

    <p class="cs-form-error" role="alert"></p>
    <div class="cs-form-actions">
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
    groups: Array.from({ length: CONNECTIONS_GROUPS }, (_, i) => ({ name: f(`cn-name-${i}`), words: f(`cn-words-${i}`).split(",") })),
    scrambleText: f("scrambleText"),
    code: f("code"),
    height: f("height"),
  };
}

// Runs the pasted code in the reader's sandbox, inside the form, so an editor
// can see the game before it is saved.
function previewCode(form) {
  const preview = form.querySelector(".cs-code-preview");
  const error = form.querySelector(".cs-form-error");
  const result = validateGame({ ...readGameForm(form, "preview"), type: "code", title: "preview", editionLabel: "preview", editionDate: "2000-01-01" });
  if (!result.ok) { error.innerHTML = result.errors.map(escapeHtml).join("<br>"); return; }
  error.textContent = "";
  renderCode(preview.querySelector(".cs-code-preview-frame"), result.game.data);
  preview.hidden = false;
  form.querySelector("[data-preview]").textContent = "Refresh preview";
  preview.scrollIntoView({ block: "nearest", behavior: "smooth" });
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
  form.querySelector("[data-preview]").addEventListener("click", () => previewCode(form));
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
