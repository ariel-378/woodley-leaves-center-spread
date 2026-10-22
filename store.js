// The shared store: who is signed in, who is an editor, and the list of games.
//
// Two backends behind one interface:
//   • firebase — Google sign-in + Firestore, when CS_CONFIG.firebase is set.
//     firestore.rules is what enforces the editor allowlist on the server.
//   • demo     — this browser's localStorage, when it is not. Lets the site run
//     and be tested before Firebase exists. Nothing in demo mode is shared.
import { CS_SEED_GAMES } from "./games-seed.js";
import { mergeSeedsAndStored, normalizeEmail } from "./validate.js";

const FIREBASE_VERSION = "11.10.0";
const config = window.CS_CONFIG || {};
const BOOTSTRAP_EDITORS = (config.bootstrapEditors || []).map(normalizeEmail);
const SEED_IDS = new Set(CS_SEED_GAMES.map((g) => g.id));

// One misbehaving listener must not stop the others from hearing about a change.
function notify(listeners, value) {
  listeners.forEach((cb) => { try { cb(value); } catch (e) { reportError("listener", e); } });
}

function reportError(where, error) {
  console.error(`[Center Spread] ${where}:`, error);
  document.dispatchEvent(new CustomEvent("cs-store-error", { detail: { where, message: error?.message || String(error) } }));
}

// ── Demo backend ─────────────────────────────────────────────────────────────
function makeDemoBackend() {
  const KEYS = { games: "cs_games", editors: "cs_editors", user: "cs_demo_user" };
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { reportError("demo save", e); } };
  const listeners = { games: new Set(), auth: new Set() };
  const gamesList = () => Object.values(read(KEYS.games, {}));
  const emitGames = () => notify(listeners.games, gamesList());
  const emitAuth = () => notify(listeners.auth, read(KEYS.user, null));
  return {
    mode: "demo",
    auth: {
      async signIn({ email } = {}) {
        const clean = normalizeEmail(email);
        if (!clean) throw new Error("Enter an email to sign in with.");
        write(KEYS.user, { email: clean, name: clean, verified: true });
        emitAuth();
      },
      async signOut() { localStorage.removeItem(KEYS.user); emitAuth(); },
      onChange(cb) { listeners.auth.add(cb); cb(read(KEYS.user, null)); return () => listeners.auth.delete(cb); },
    },
    games: {
      subscribe(cb) { listeners.games.add(cb); cb(gamesList()); return () => listeners.games.delete(cb); },
      async save(game) { write(KEYS.games, { ...read(KEYS.games, {}), [game.id]: game }); emitGames(); },
      async delete(id) { const { [id]: _gone, ...rest } = read(KEYS.games, {}); write(KEYS.games, rest); emitGames(); },
    },
    editors: {
      async has(email) { return Boolean(read(KEYS.editors, {})[email]); },
      async list() { return Object.values(read(KEYS.editors, {})); },
      async add(entry) { write(KEYS.editors, { ...read(KEYS.editors, {}), [entry.email]: entry }); },
      async remove(email) { const { [email]: _gone, ...rest } = read(KEYS.editors, {}); write(KEYS.editors, rest); },
    },
  };
}

// ── Firebase backend ─────────────────────────────────────────────────────────
async function makeFirebaseBackend(firebaseConfig) {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${base}firebase-app.js`),
    import(`${base}firebase-auth.js`),
    import(`${base}firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const toUser = (u) => (u ? { email: normalizeEmail(u.email), name: u.displayName || u.email, verified: Boolean(u.emailVerified) } : null);
  return {
    mode: "firebase",
    auth: {
      async signIn() {
        const provider = new A.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await A.signInWithPopup(auth, provider);
      },
      signOut: () => A.signOut(auth),
      onChange: (cb) => A.onAuthStateChanged(auth, (u) => cb(toUser(u))),
    },
    games: {
      subscribe: (cb) => F.onSnapshot(F.collection(db, "games"), (snap) => cb(snap.docs.map((d) => d.data())), (e) => reportError("games", e)),
      save: (game) => F.setDoc(F.doc(db, "games", game.id), game),
      delete: (id) => F.deleteDoc(F.doc(db, "games", id)),
    },
    editors: {
      async has(email) { return (await F.getDoc(F.doc(db, "editors", email))).exists(); },
      async list() { return (await F.getDocs(F.collection(db, "editors"))).docs.map((d) => d.data()); },
      add: (entry) => F.setDoc(F.doc(db, "editors", entry.email), entry),
      remove: (email) => F.deleteDoc(F.doc(db, "editors", email)),
    },
  };
}

const backend = config.firebase ? await makeFirebaseBackend(config.firebase) : makeDemoBackend();

// ── Session: signed-in user + whether they are an editor ─────────────────────
let session = { user: null, isEditor: false, denied: null, ready: false };
const sessionListeners = new Set();
function setSession(next) {
  session = { ...session, ...next, ready: true };
  notify(sessionListeners, session);
}

async function isEditorEmail(email) {
  if (!email) return false;
  if (BOOTSTRAP_EDITORS.includes(email)) return true;
  try { return await backend.editors.has(email); } catch (e) { reportError("editor check", e); return false; }
}

backend.auth.onChange(async (user) => {
  if (!user) { setSession({ user: null, isEditor: false }); return; }
  if (!user.verified) { await backend.auth.signOut(); setSession({ user: null, isEditor: false, denied: user.email }); return; }
  const editor = await isEditorEmail(user.email);
  if (!editor) { await backend.auth.signOut(); setSession({ user: null, isEditor: false, denied: user.email }); return; }
  setSession({ user, isEditor: true, denied: null });
});

export const CSStore = {
  mode: backend.mode,
  bootstrapEditors: BOOTSTRAP_EDITORS,
  get session() { return session; },
  onSession(cb) { sessionListeners.add(cb); if (session.ready) cb(session); return () => sessionListeners.delete(cb); },
  auth: {
    signIn: (opts) => backend.auth.signIn(opts),
    signOut: () => backend.auth.signOut(),
  },
  games: {
    // cb receives the merged list: seeds, overridden or hidden by stored games.
    subscribe: (cb) => backend.games.subscribe((stored) => cb(mergeSeedsAndStored(CS_SEED_GAMES, stored))),
    async save(game) {
      if (!session.isEditor) throw new Error("Sign in as an editor to save games.");
      const stamp = new Date().toISOString();
      await backend.games.save({ ...game, updatedAt: stamp, updatedBy: session.user.email });
    },
    // A seed game cannot be deleted from the database it was never in, so it
    // gets a tombstone instead; everything else is simply removed.
    async remove(id) {
      if (!session.isEditor) throw new Error("Sign in as an editor to remove games.");
      if (SEED_IDS.has(id)) await backend.games.save({ id, deleted: true, updatedAt: new Date().toISOString(), updatedBy: session.user.email });
      else await backend.games.delete(id);
    },
  },
  editors: {
    async list() {
      const added = await backend.editors.list();
      const builtIn = BOOTSTRAP_EDITORS.map((email) => ({ email, builtIn: true }));
      return [...builtIn, ...added.filter((e) => !BOOTSTRAP_EDITORS.includes(e.email))];
    },
    async add(email) {
      if (!session.isEditor) throw new Error("Sign in as an editor to add editors.");
      const clean = normalizeEmail(email);
      await backend.editors.add({ email: clean, addedBy: session.user.email, addedAt: new Date().toISOString() });
    },
    async remove(email) {
      if (!session.isEditor) throw new Error("Sign in as an editor to remove editors.");
      if (email === session.user.email) throw new Error("You can't remove yourself.");
      await backend.editors.remove(email);
    },
  },
};
window.CSStore = CSStore;
