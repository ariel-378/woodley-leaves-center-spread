// Center Spread settings. Everything here is public: a Firebase web config is
// not a secret (access is enforced by firestore.rules, not by hiding this).
window.CS_CONFIG = {
  paper: "The Woodley Leaves",

  // Google accounts that are editors from day one, before anyone has been added
  // in the "Editors" panel. Keep this list identical to the one in
  // firestore.rules, which is what the server actually enforces.
  bootstrapEditors: ["arielp2027@maret.org"],

  // Paste the web-app config from the Firebase console here (see SETUP.md).
  // While it is null the site runs in DEMO MODE: games and editors live only in
  // this browser, and "Editor access" asks for an email instead of Google.
  firebase: {
    apiKey: "AIzaSyCnDOxHJ5GodcktcMjz15GpYW-HzwBvEyI",
    authDomain: "wlcenterspread.firebaseapp.com",
    projectId: "wlcenterspread",
    storageBucket: "wlcenterspread.firebasestorage.app",
    messagingSenderId: "41593826716",
    appId: "1:41593826716:web:52815cb779f94b6b34ac59"
  },
};
 