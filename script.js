// Splash screen — shown once per browser session
(function () {
  if (sessionStorage.getItem("wl_splash_seen")) return;
  sessionStorage.setItem("wl_splash_seen", "1");
  if (!document.body) return; // safety
  const splash = document.createElement("div");
  splash.className = "wl-splash";
  splash.innerHTML = `
    <div class="wl-splash-stack">
      <div class="wl-splash-mark">MARET</div>
      <div class="wl-splash-sub">The Woodley Leaves</div>
    </div>
  `;
  document.body.appendChild(splash);

  setTimeout(() => splash.classList.add("fade-out"), 2200);
  setTimeout(() => { if (splash.parentNode) splash.remove(); }, 2900);
})();

// Dynamic dateline: today's date in the masthead
document.addEventListener("DOMContentLoaded", () => {
  const dateEl = document.querySelector(".dateline");
  if (dateEl) {
    const now = new Date();
    const formatted = now.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    }).toUpperCase();
    dateEl.innerHTML = `${formatted} &nbsp;·&nbsp; MARET SCHOOL`;
  }
});

// Breaking news popup — shows once per session
document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("breaking-popup");
  const banner = document.getElementById("breaking-banner");
  const closeBtn = document.getElementById("popup-close");

  if (!overlay) return;

  const alreadySeen = sessionStorage.getItem("breakingSeen");
  if (!alreadySeen) {
    setTimeout(() => overlay.classList.add("visible"), 600);
  }

  const close = () => {
    overlay.classList.remove("visible");
    sessionStorage.setItem("breakingSeen", "1");
  };

  closeBtn?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  banner?.addEventListener("click", () => overlay.classList.add("visible"));
});
