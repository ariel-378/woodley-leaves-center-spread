import { renderConnections } from "./connections.js";
import { renderScramble } from "./scramble.js";
import { renderCode } from "./code.js";

const RENDERERS = { connections: renderConnections, scramble: renderScramble, code: renderCode };

// Draws a game into `root`. Returns false when the type is unknown.
export function renderGame(root, game) {
  const render = RENDERERS[game?.type];
  if (!render) return false;
  try {
    render(root, game.data);
    return true;
  } catch (error) {
    console.error(`[Center Spread] "${game.id}" failed to render`, error);
    root.innerHTML = '<p class="cs-error">This game could not be loaded.</p>';
    return false;
  }
}
