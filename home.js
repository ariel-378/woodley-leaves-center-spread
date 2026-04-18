// Renders the homepage's story slots from the article store.
// The lede comes from the editor-featured article (or falls back to the most
// recent article if no feature is set). Other slots auto-fill with the latest
// articles, deduplicated against the lede.
(function () {
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function youtubeId(url) {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    return m ? m[1] : null;
  }
  function thumbHtml(a) {
    if (a.photo) {
      return `<img class="card-photo" src="${escapeHtml(a.photo)}" alt="${escapeHtml(a.title)}">`;
    }
    const ytId = youtubeId(a.video);
    if (ytId) {
      return `<div class="card-video">
        <img class="card-photo" src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="${escapeHtml(a.title)}">
        <span class="play-icon" aria-hidden="true">▶</span>
      </div>`;
    }
    if (a.video) {
      return `<div class="card-video"><div class="photo wide"></div><span class="play-icon" aria-hidden="true">▶</span></div>`;
    }
    return `<div class="photo wide"></div>`;
  }

  function getAllSorted() {
    const all = WLArticles.getAll();
    return Object.entries(all)
      .map(([id, a]) => ({ id, ...a }))
      .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  }

  function ledeHtml(a) {
    if (!a) return "";
    const role = a.role ? ` · ${escapeHtml(a.role)}` : "";
    return `
      ${thumbHtml(a)}
      <div class="kicker">${escapeHtml(a.section)}</div>
      <h2><a href="article.html?id=${encodeURIComponent(a.id)}">${escapeHtml(a.title)}</a></h2>
      <p class="summary">${escapeHtml(a.deck)}</p>
      <div class="byline">By ${escapeHtml(a.byline)}${role}</div>
    `;
  }

  function cardHtml(a, withThumb) {
    const media = withThumb ? thumbHtml(a) : "";
    return `
      <article class="story">
        ${media}
        <div class="kicker">${escapeHtml(a.section)}</div>
        <h3><a href="article.html?id=${encodeURIComponent(a.id)}">${escapeHtml(a.title)}</a></h3>
        <p>${escapeHtml(a.deck)}</p>
      </article>
    `;
  }

  function fillSlot(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function render() {
    const featured = WLArticles.getFeatured();
    const sorted = getAllSorted();
    const lede = featured || sorted[0];

    fillSlot("home-lede", ledeHtml(lede));

    const ledeId = lede ? lede.id : null;
    const queue = sorted.filter(a => a.id !== ledeId);

    // Middle column — 3 stories, the first gets a thumbnail
    const middle = queue.slice(0, 3);
    fillSlot("home-middle", middle.map((a, i) => cardHtml(a, i === 0)).join(""));

    // Right column — 2 stories sandwiched between ads
    fillSlot("home-right-1", queue[3] ? cardHtml(queue[3], false) : "");
    fillSlot("home-right-2", queue[4] ? cardHtml(queue[4], false) : "");

    // "More from the newsroom" — 4 stories across two columns
    fillSlot("home-more-1", queue.slice(5, 7).map(a => cardHtml(a, false)).join(""));
    fillSlot("home-more-2", queue.slice(7, 9).map(a => cardHtml(a, false)).join(""));
  }

  document.addEventListener("DOMContentLoaded", render);
  document.addEventListener("wl-articles-change", render);
})();
