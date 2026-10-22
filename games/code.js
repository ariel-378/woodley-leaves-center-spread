// Custom game: pasted HTML/CSS/JS runs inside a sandboxed iframe. Scripts are
// allowed, same-origin access is not, so the code cannot reach this page, its
// storage, or the signed-in editor's session.
import { CODE_HEIGHT } from "../validate.js";

const HEIGHT_MESSAGE = "csGameHeight";

export function renderCode(root, data) {
  const frame = document.createElement("iframe");
  frame.className = "cs-code-frame";
  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("title", "Custom game");
  frame.style.height = `${data?.height || 500}px`;
  frame.srcdoc = data?.code || "";
  root.innerHTML = "";
  root.appendChild(frame);

  // A game may post {csGameHeight: px} to size its frame to its content. The
  // value is clamped so a game reporting 0 before layout can't collapse itself.
  window.addEventListener("message", (e) => {
    const h = Number(e.data?.[HEIGHT_MESSAGE]);
    if (e.source !== frame.contentWindow || !(h > 0)) return;
    frame.style.height = `${Math.min(CODE_HEIGHT.max, Math.max(CODE_HEIGHT.min, Math.ceil(h)))}px`;
  });
}

export const EXAMPLE_CODE = `<!doctype html>
<style>
  body { font-family: Georgia, serif; text-align: center; padding: 24px; color: #1a1a1a; }
  button { font: inherit; padding: 10px 22px; border-radius: 999px; border: 1px solid #1a1a1a; background: #fff; cursor: pointer; }
  button:hover { background: #1a1a1a; color: #fff; }
  .score { font-size: 48px; margin: 12px 0; }
</style>
<p>How many taps can you get in ten seconds?</p>
<div class="score" id="score">0</div>
<button id="tap">Tap!</button>
<script>
  let score = 0, started = false;
  const tap = document.getElementById("tap");
  tap.addEventListener("click", () => {
    if (!started) { started = true; setTimeout(() => { tap.disabled = true; tap.textContent = "Time!"; }, 10000); }
    score += 1;
    document.getElementById("score").textContent = score;
  });
  // Optional: once everything has drawn, tell the page how tall this game is.
  window.addEventListener("load", () => {
    parent.postMessage({ csGameHeight: document.documentElement.scrollHeight + 24 }, "*");
  });
</script>`;
