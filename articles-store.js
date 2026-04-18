// Merges static articles (from articles.js / window.WL_ARTICLES) with editor changes
// stored in localStorage. Provides a single CRUD API used by article.html, section
// pages, and the editor dashboard.
window.WLArticles = (function () {
  const LS_CUSTOM = "wl_articles_custom";   // edits + new articles, keyed by id
  const LS_DELETED = "wl_articles_deleted"; // ids of static articles editors removed

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }
  function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function getAll() {
    const base = window.WL_ARTICLES || {};
    const custom = readJSON(LS_CUSTOM, {});
    const deleted = readJSON(LS_DELETED, []);
    const merged = {};
    Object.keys(base).forEach(id => {
      if (!deleted.includes(id)) merged[id] = base[id];
    });
    Object.keys(custom).forEach(id => { merged[id] = custom[id]; });
    return merged;
  }

  function getById(id) { return getAll()[id]; }

  function bySection(section) {
    const all = getAll();
    return Object.entries(all)
      .filter(([_, a]) => a.section === section)
      .map(([id, a]) => ({ id, ...a }))
      .sort((a, b) => {
        // newest first using parsed date
        const da = Date.parse(a.date) || 0;
        const db = Date.parse(b.date) || 0;
        return db - da;
      });
  }

  function save(id, data) {
    const custom = readJSON(LS_CUSTOM, {});
    custom[id] = data;
    writeJSON(LS_CUSTOM, custom);
    // un-delete if previously deleted
    const deleted = readJSON(LS_DELETED, []).filter(x => x !== id);
    writeJSON(LS_DELETED, deleted);
    document.dispatchEvent(new CustomEvent("wl-articles-change"));
  }

  function remove(id) {
    const custom = readJSON(LS_CUSTOM, {});
    if (custom[id]) { delete custom[id]; writeJSON(LS_CUSTOM, custom); }
    const base = window.WL_ARTICLES || {};
    if (base[id]) {
      const deleted = readJSON(LS_DELETED, []);
      if (!deleted.includes(id)) { deleted.push(id); writeJSON(LS_DELETED, deleted); }
    }
    document.dispatchEvent(new CustomEvent("wl-articles-change"));
  }

  function isCustom(id) {
    const custom = readJSON(LS_CUSTOM, {});
    return id in custom;
  }

  function reset() {
    localStorage.removeItem(LS_CUSTOM);
    localStorage.removeItem(LS_DELETED);
    localStorage.removeItem(LS_FEATURED);
    document.dispatchEvent(new CustomEvent("wl-articles-change"));
  }

  // ===== Featured article (homepage lede) =====
  const LS_FEATURED = "wl_featured_article";
  function getFeaturedId() { return localStorage.getItem(LS_FEATURED) || null; }
  function setFeatured(id) {
    if (id) localStorage.setItem(LS_FEATURED, id);
    else localStorage.removeItem(LS_FEATURED);
    document.dispatchEvent(new CustomEvent("wl-articles-change"));
  }
  function getFeatured() {
    const id = getFeaturedId();
    if (!id) return null;
    const a = getById(id);
    return a ? { id, ...a } : null;
  }

  return { getAll, getById, bySection, save, remove, isCustom, reset, getFeatured, getFeaturedId, setFeatured };
})();
