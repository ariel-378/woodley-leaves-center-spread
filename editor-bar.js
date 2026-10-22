// The "Editor access" button in the top-right corner of the masthead, and the
// bar that replaces it once an editor has signed in with Google.
import { CSStore } from "./store.js";
import { escapeHtml } from "./games/dom.js";
import { CSEditor } from "./editor.js";

const DENIED_MESSAGE = (email) => `${email} doesn't have editor access. Ask an editor to add it.`;

function slot() {
  const masthead = document.querySelector(".masthead");
  if (!masthead) return null;
  const existing = masthead.querySelector(".cs-editor-bar");
  if (existing) return existing;
  const bar = document.createElement("div");
  bar.className = "cs-editor-bar";
  masthead.appendChild(bar);
  return bar;
}

function render(session) {
  const bar = slot();
  if (!bar) return;
  if (session.isEditor) {
    bar.innerHTML = `
      <span class="cs-editor-user" title="${escapeHtml(session.user.email)}">${escapeHtml(session.user.name)}</span>
      <button type="button" class="cs-btn cs-btn-primary" data-action="add">+ Add game</button>
      <button type="button" class="cs-btn" data-action="editors">Editors</button>
      <button type="button" class="cs-btn cs-btn-quiet" data-action="signout">Sign out</button>`;
  } else {
    bar.innerHTML = `
      <button type="button" class="cs-btn" data-action="signin">Editor access</button>
      ${session.denied ? `<span class="cs-editor-denied" role="alert">${escapeHtml(DENIED_MESSAGE(session.denied))}</span>` : ""}`;
  }
}

async function signIn() {
  try {
    if (CSStore.mode === "demo") {
      const email = await CSEditor.askDemoEmail();
      if (email) await CSStore.auth.signIn({ email });
    } else {
      await CSStore.auth.signIn();
    }
  } catch (error) {
    if (error?.code === "auth/popup-closed-by-user") return;
    CSEditor.toast(error?.message || "Sign-in failed.");
  }
}

document.addEventListener("click", (e) => {
  const button = e.target.closest(".cs-editor-bar [data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "signin") signIn();
  if (action === "signout") CSStore.auth.signOut().catch((err) => CSEditor.toast(err.message));
  if (action === "add") CSEditor.openGameForm(null);
  if (action === "editors") CSEditor.openEditors();
});

document.addEventListener("cs-store-error", (e) => CSEditor.toast(`Something went wrong (${e.detail.where}): ${e.detail.message}`));

CSStore.onSession(render);
