// Tiny DOM helpers shared by the game renderers.
export function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function shuffled(list, rng = Math.random) {
  return list.reduce((acc, item, i) => {
    const j = Math.floor(rng() * (i + 1));
    const next = acc.slice();
    next[i] = next[j];
    next[j] = item;
    return next;
  }, []);
}
