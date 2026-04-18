// Woodley Leaves — demo auth + bookmarks + puzzle stats.
// All data lives in localStorage (per-browser). Not secure — for mockup only.

(function () {
  const LS_CURRENT = "wl_current_user";
  const LS_USERS = "wl_users";

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(LS_USERS) || "{}"); }
    catch { return {}; }
  }
  function saveUsers(u) { localStorage.setItem(LS_USERS, JSON.stringify(u)); }
  function getCurrentUser() { return localStorage.getItem(LS_CURRENT); }
  function setCurrentUser(u) {
    if (u) localStorage.setItem(LS_CURRENT, u);
    else localStorage.removeItem(LS_CURRENT);
  }

  // Anyone signing up as editor must enter this code. Change it to rotate access.
  const EDITOR_CLUB_CODE = "LEAVES2026";

  function defaultUserData() {
    return {
      password: "",
      role: "reader",          // "reader" or "editor"
      created: Date.now(),
      bookmarks: [],
      stats: {
        wordle: { played: 0, won: 0, currentStreak: 0, maxStreak: 0, distribution: [0,0,0,0,0,0] },
        crossword: { attempted: 0, completed: 0, bestTime: null }
      }
    };
  }

  function getUserData() {
    const u = getCurrentUser();
    if (!u) return null;
    const users = getUsers();
    return users[u] || null;
  }
  function updateUserData(fn) {
    const u = getCurrentUser();
    if (!u) return;
    const users = getUsers();
    if (!users[u]) users[u] = defaultUserData();
    // merge in case old data is missing fields
    const merged = { ...defaultUserData(), ...users[u] };
    merged.stats = { ...defaultUserData().stats, ...(users[u].stats || {}) };
    users[u] = fn(merged);
    saveUsers(users);
  }

  // ===== Public API =====
  const WLAuth = {
    currentUser: getCurrentUser,

    signUp(username, password, opts) {
      opts = opts || {};
      username = (username || "").trim();
      if (!username) throw new Error("Username is required");
      if (!password) throw new Error("Password is required");
      if (username.length < 2) throw new Error("Username must be at least 2 characters");
      if (password.length < 4) throw new Error("Password must be at least 4 characters");
      if (opts.role === "editor" && opts.clubCode !== EDITOR_CLUB_CODE) {
        throw new Error("Invalid editor club code");
      }
      const users = getUsers();
      if (users[username]) throw new Error("That username is taken");
      users[username] = defaultUserData();
      users[username].password = password;
      users[username].role = opts.role === "editor" ? "editor" : "reader";
      saveUsers(users);
      setCurrentUser(username);
      renderTopbar();
    },

    signIn(username, password, opts) {
      opts = opts || {};
      username = (username || "").trim();
      const users = getUsers();
      const user = users[username];
      if (!user) throw new Error("No account found with that username");
      if (user.password !== password) throw new Error("Incorrect password");
      if (opts.requireEditor && user.role !== "editor") {
        throw new Error("This account isn't an editor account. Use the regular sign-in.");
      }
      setCurrentUser(username);
      renderTopbar();
    },

    currentRole() {
      const ud = getUserData();
      return ud ? (ud.role || "reader") : null;
    },

    isEditor() {
      const ud = getUserData();
      return !!ud && ud.role === "editor";
    },

    signOut() {
      setCurrentUser(null);
      renderTopbar();
    },

    toggleBookmark(id, title, section) {
      if (!getCurrentUser()) return { needsAuth: true };
      let added = false;
      updateUserData(u => {
        const idx = u.bookmarks.findIndex(b => b.id === id);
        if (idx >= 0) u.bookmarks.splice(idx, 1);
        else { u.bookmarks.push({ id, title, section, savedAt: Date.now() }); added = true; }
        return u;
      });
      return { added };
    },

    isBookmarked(id) {
      const ud = getUserData();
      if (!ud) return false;
      return ud.bookmarks.some(b => b.id === id);
    },

    getBookmarks() {
      const ud = getUserData();
      return ud ? ud.bookmarks : [];
    },

    getStats() {
      const ud = getUserData();
      return ud ? ud.stats : null;
    },

    recordWordleResult(won, guessesUsed) {
      if (!getCurrentUser()) return;
      updateUserData(u => {
        u.stats.wordle.played++;
        if (won) {
          u.stats.wordle.won++;
          u.stats.wordle.currentStreak++;
          u.stats.wordle.maxStreak = Math.max(u.stats.wordle.maxStreak, u.stats.wordle.currentStreak);
          if (guessesUsed >= 1 && guessesUsed <= 6) u.stats.wordle.distribution[guessesUsed - 1]++;
        } else {
          u.stats.wordle.currentStreak = 0;
        }
        return u;
      });
    },

    recordCrosswordAttempt() {
      if (!getCurrentUser()) return;
      updateUserData(u => { u.stats.crossword.attempted++; return u; });
    },
    recordCrosswordComplete(timeSeconds) {
      if (!getCurrentUser()) return;
      updateUserData(u => {
        u.stats.crossword.completed++;
        if (u.stats.crossword.bestTime === null || timeSeconds < u.stats.crossword.bestTime) {
          u.stats.crossword.bestTime = timeSeconds;
        }
        return u;
      });
    },

    showSignIn() { showModal("signin"); },
    showSignUp() { showModal("signup"); },
    showEditorSignIn() { showModal("editor-signin"); },
    showEditorSignUp() { showModal("editor-signup"); }
  };
  window.WLAuth = WLAuth;

  // ===== Topbar rendering =====
  function ensureTopbarSlot() {
    if (document.getElementById("wl-account")) return;
    const topInner = document.querySelector(".topbar-inner");
    if (!topInner) return;
    const right = topInner.children[topInner.children.length - 1];
    if (!right) return;
    if (right.textContent.trim() !== "") {
      right.appendChild(document.createTextNode(" · "));
    }
    const span = document.createElement("span");
    span.id = "wl-account";
    span.className = "topbar-account";
    right.appendChild(span);
  }

  function renderTopbar() {
    ensureTopbarSlot();
    const el = document.getElementById("wl-account");
    if (!el) return;
    const user = getCurrentUser();
    const ud = getUserData();
    const role = ud ? (ud.role || "reader") : null;
    if (user) {
      const homeLink = role === "editor"
        ? `<a href="editor.html">Editor Dashboard</a>`
        : `<a href="account.html">My Account</a>`;
      el.innerHTML = `<span class="topbar-user">${escapeHtml(user)}</span> · ${homeLink} · <a href="#" id="wl-signout">Sign Out</a>`;
      const sb = document.getElementById("wl-signout");
      if (sb) sb.addEventListener("click", (e) => { e.preventDefault(); WLAuth.signOut(); });
    } else {
      el.innerHTML = `<a href="#" id="wl-signin">Sign In</a> · <a href="#" id="wl-editor-signin">Editor Sign In</a>`;
      document.getElementById("wl-signin").addEventListener("click", (e) => { e.preventDefault(); showModal("signin"); });
      document.getElementById("wl-editor-signin").addEventListener("click", (e) => { e.preventDefault(); showModal("editor-signin"); });
    }
    // fire a custom event so pages can re-render bookmark UI etc.
    document.dispatchEvent(new CustomEvent("wl-auth-change", { detail: { user, role } }));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ===== Modal =====
  function createModal() {
    const overlay = document.createElement("div");
    overlay.className = "wl-modal-overlay";
    overlay.id = "wl-modal-overlay";
    overlay.innerHTML = `
      <div class="wl-modal">
        <button class="wl-modal-close" id="wl-modal-close" aria-label="Close">×</button>
        <div id="wl-modal-content"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) hideModal(); });
    document.getElementById("wl-modal-close").addEventListener("click", hideModal);
  }

  function showModal(mode) {
    if (!document.getElementById("wl-modal-overlay")) createModal();
    const c = document.getElementById("wl-modal-content");

    if (mode === "signin") {
      c.innerHTML = `
        <h2>Reader Sign In</h2>
        <p class="wl-demo-note">For students who want to bookmark articles and track puzzle stats. Demo accounts are stored in your browser only.</p>
        <label>Username <input type="text" id="wl-u" autocomplete="username"></label>
        <label>Password <input type="password" id="wl-p" autocomplete="current-password"></label>
        <div class="wl-error" id="wl-err"></div>
        <button class="wl-submit" id="wl-go">Sign In</button>
        <div class="wl-alt">No account? <a href="#" id="wl-to-signup">Sign up</a> &nbsp;·&nbsp; <a href="#" id="wl-to-editor">Editor sign in</a></div>
      `;
      document.getElementById("wl-go").addEventListener("click", () => {
        try {
          WLAuth.signIn(document.getElementById("wl-u").value, document.getElementById("wl-p").value);
          hideModal();
        } catch (err) { document.getElementById("wl-err").textContent = err.message; }
      });
      document.getElementById("wl-to-signup").addEventListener("click", (e) => { e.preventDefault(); showModal("signup"); });
      document.getElementById("wl-to-editor").addEventListener("click", (e) => { e.preventDefault(); showModal("editor-signin"); });
      document.getElementById("wl-u").focus();
    }

    else if (mode === "signup") {
      c.innerHTML = `
        <h2>Create reader account</h2>
        <p class="wl-demo-note">Demo accounts are stored in your browser only. Don't use a real password.</p>
        <label>Username <input type="text" id="wl-u" autocomplete="username"></label>
        <label>Password <input type="password" id="wl-p" autocomplete="new-password"></label>
        <label>Confirm <input type="password" id="wl-p2" autocomplete="new-password"></label>
        <div class="wl-error" id="wl-err"></div>
        <button class="wl-submit" id="wl-go">Create account</button>
        <div class="wl-alt">Have an account? <a href="#" id="wl-to-signin">Sign in</a></div>
      `;
      document.getElementById("wl-go").addEventListener("click", () => {
        const p = document.getElementById("wl-p").value;
        const p2 = document.getElementById("wl-p2").value;
        if (p !== p2) { document.getElementById("wl-err").textContent = "Passwords don't match"; return; }
        try {
          WLAuth.signUp(document.getElementById("wl-u").value, p, { role: "reader" });
          hideModal();
        } catch (err) { document.getElementById("wl-err").textContent = err.message; }
      });
      document.getElementById("wl-to-signin").addEventListener("click", (e) => { e.preventDefault(); showModal("signin"); });
      document.getElementById("wl-u").focus();
    }

    else if (mode === "editor-signin") {
      c.innerHTML = `
        <h2>Editor Sign In</h2>
        <p class="wl-demo-note">For Leaves staff. Editors can add and edit articles from the dashboard.</p>
        <label>Username <input type="text" id="wl-u" autocomplete="username"></label>
        <label>Password <input type="password" id="wl-p" autocomplete="current-password"></label>
        <div class="wl-error" id="wl-err"></div>
        <button class="wl-submit" id="wl-go">Sign In</button>
        <div class="wl-alt">New editor? <a href="#" id="wl-to-editor-signup">Create an editor account</a> &nbsp;·&nbsp; <a href="#" id="wl-to-reader">Reader sign in</a></div>
      `;
      document.getElementById("wl-go").addEventListener("click", () => {
        try {
          WLAuth.signIn(document.getElementById("wl-u").value, document.getElementById("wl-p").value, { requireEditor: true });
          hideModal();
          if (location.pathname.endsWith("editor.html")) location.reload();
          else location.href = "editor.html";
        } catch (err) { document.getElementById("wl-err").textContent = err.message; }
      });
      document.getElementById("wl-to-editor-signup").addEventListener("click", (e) => { e.preventDefault(); showModal("editor-signup"); });
      document.getElementById("wl-to-reader").addEventListener("click", (e) => { e.preventDefault(); showModal("signin"); });
      document.getElementById("wl-u").focus();
    }

    else if (mode === "editor-signup") {
      c.innerHTML = `
        <h2>Create editor account</h2>
        <p class="wl-demo-note">Editors need the club code from the editor-in-chief. Don't use a real password.</p>
        <label>Username <input type="text" id="wl-u" autocomplete="username"></label>
        <label>Password <input type="password" id="wl-p" autocomplete="new-password"></label>
        <label>Confirm <input type="password" id="wl-p2" autocomplete="new-password"></label>
        <label>Club code <input type="text" id="wl-cc"></label>
        <div class="wl-error" id="wl-err"></div>
        <button class="wl-submit" id="wl-go">Create editor account</button>
        <div class="wl-alt">Have an editor account? <a href="#" id="wl-to-editor-signin">Sign in</a></div>
      `;
      document.getElementById("wl-go").addEventListener("click", () => {
        const p = document.getElementById("wl-p").value;
        const p2 = document.getElementById("wl-p2").value;
        const cc = document.getElementById("wl-cc").value;
        if (p !== p2) { document.getElementById("wl-err").textContent = "Passwords don't match"; return; }
        try {
          WLAuth.signUp(document.getElementById("wl-u").value, p, { role: "editor", clubCode: cc });
          hideModal();
          location.href = "editor.html";
        } catch (err) { document.getElementById("wl-err").textContent = err.message; }
      });
      document.getElementById("wl-to-editor-signin").addEventListener("click", (e) => { e.preventDefault(); showModal("editor-signin"); });
      document.getElementById("wl-u").focus();
    }

    // allow Enter to submit
    ["wl-u","wl-p","wl-p2","wl-cc"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("wl-go").click(); });
    });
    document.getElementById("wl-modal-overlay").classList.add("visible");
  }
  function hideModal() {
    const o = document.getElementById("wl-modal-overlay");
    if (o) o.classList.remove("visible");
  }

  // ===== Newsletter subscribe =====
  const LS_SUBSCRIBERS = "wl_subscribers";

  function getSubscribers() {
    try { return JSON.parse(localStorage.getItem(LS_SUBSCRIBERS) || "[]"); }
    catch { return []; }
  }
  function saveSubscriber(entry) {
    const list = getSubscribers();
    list.push(entry);
    localStorage.setItem(LS_SUBSCRIBERS, JSON.stringify(list));
  }

  function showSubscribeModal() {
    if (!document.getElementById("wl-modal-overlay")) createModal();
    const c = document.getElementById("wl-modal-content");
    c.innerHTML = `
      <h2>Weekly Newsletter</h2>
      <p class="wl-demo-note">Get The Woodley Leaves delivered every Friday. Enter your email, phone, or both.</p>
      <label>Email <input type="email" id="sub-email" placeholder="you@example.com" autocomplete="email"></label>
      <label>Phone <input type="tel" id="sub-phone" placeholder="(202) 555-0123" autocomplete="tel"></label>
      <div class="wl-error" id="sub-err"></div>
      <button class="wl-submit" id="sub-go">Subscribe</button>
    `;
    document.getElementById("sub-go").addEventListener("click", () => {
      const email = document.getElementById("sub-email").value.trim();
      const phone = document.getElementById("sub-phone").value.trim();
      const errEl = document.getElementById("sub-err");
      errEl.textContent = "";
      if (!email && !phone) { errEl.textContent = "Please enter your email, phone, or both."; return; }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = "That email doesn't look right."; return;
      }
      if (phone && phone.replace(/\D/g, "").length < 10) {
        errEl.textContent = "Please enter a valid phone number."; return;
      }
      saveSubscriber({ email, phone, joinedAt: Date.now() });
      const delivery = email && phone ? "by email, with a text reminder"
                      : phone ? "by text"
                      : "by email";
      c.innerHTML = `
        <h2>You're on the list</h2>
        <p style="color:#333; font-size:14px; margin: 6px 0 16px;">Thanks — you'll get the next Friday edition of The Woodley Leaves ${delivery}.</p>
        <button class="wl-submit" id="sub-close">Close</button>
      `;
      document.getElementById("sub-close").addEventListener("click", hideModal);
    });
    ["sub-email", "sub-phone"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("keydown", e => {
        if (e.key === "Enter") document.getElementById("sub-go").click();
      });
    });
    document.getElementById("wl-modal-overlay").classList.add("visible");
    document.getElementById("sub-email").focus();
  }

  function wireSubscribeLinks() {
    document.querySelectorAll(".topbar a").forEach(a => {
      if (a.textContent.trim() === "Subscribe") {
        a.setAttribute("href", "#");
        a.addEventListener("click", (e) => { e.preventDefault(); showSubscribeModal(); });
      }
    });
  }

  WLAuth.showSubscribe = showSubscribeModal;
  WLAuth.getSubscribers = getSubscribers;

  // ===== Writers' club ("Interested in writing?") =====
  const LS_WRITERS = "wl_writers";

  function getWriters() {
    try { return JSON.parse(localStorage.getItem(LS_WRITERS) || "[]"); }
    catch { return []; }
  }
  function saveWriter(entry) {
    const list = getWriters();
    list.push(entry);
    localStorage.setItem(LS_WRITERS, JSON.stringify(list));
  }

  function showWritersModal() {
    if (!document.getElementById("wl-modal-overlay")) createModal();
    const c = document.getElementById("wl-modal-content");
    c.innerHTML = `
      <h2>Join the Leaves staff</h2>
      <p class="wl-demo-note">Add your email to the club mailing list. You'll get pitch deadlines, story assignments, and meeting times.</p>
      <label>Email <input type="email" id="wr-email" placeholder="you@example.com" autocomplete="email"></label>
      <div class="wl-error" id="wr-err"></div>
      <button class="wl-submit" id="wr-go">Join the list</button>
    `;
    document.getElementById("wr-go").addEventListener("click", () => {
      const email = document.getElementById("wr-email").value.trim();
      const errEl = document.getElementById("wr-err");
      errEl.textContent = "";
      if (!email) { errEl.textContent = "Please enter your email."; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = "That email doesn't look right."; return;
      }
      saveWriter({ email, joinedAt: Date.now() });
      c.innerHTML = `
        <h2>You're in</h2>
        <p style="color:#333; font-size:14px; margin: 6px 0 16px;">Welcome to the team. An editor will be in touch soon with the next issue's pitch deadline.</p>
        <button class="wl-submit" id="wr-close">Close</button>
      `;
      document.getElementById("wr-close").addEventListener("click", hideModal);
    });
    const emailEl = document.getElementById("wr-email");
    emailEl.addEventListener("keydown", e => {
      if (e.key === "Enter") document.getElementById("wr-go").click();
    });
    document.getElementById("wl-modal-overlay").classList.add("visible");
    emailEl.focus();
  }

  function injectWritersLink() {
    const topInner = document.querySelector(".topbar-inner");
    if (!topInner) return;
    const left = topInner.children[0];
    if (!left) return;
    if (left.querySelector(".wl-writers-link")) return;
    const link = document.createElement("a");
    link.href = "#";
    link.className = "wl-writers-link";
    link.textContent = "Interested in writing?";
    link.addEventListener("click", (e) => { e.preventDefault(); showWritersModal(); });
    left.appendChild(link);
  }

  WLAuth.showWriters = showWritersModal;
  WLAuth.getWriters = getWriters;

  // ===== Init =====
  document.addEventListener("DOMContentLoaded", () => {
    renderTopbar();
    wireSubscribeLinks();
    injectWritersLink();
  });
})();
