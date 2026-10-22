# The Woodley Leaves Center Spread

The games from the print center spread of *The Woodley Leaves*, Maret School's
student newspaper, playable on any device. Live at
<https://woodleyleavescenterspread.com>. Plain HTML, CSS and JavaScript
modules, no build step.

## For editors

Click **Editor access** in the top-right corner and sign in with your Google
account. If your account is on the editor list you get three buttons:

- **+ Add game** opens a form. Pick a type:
  - **Connections**: four categories with four words each.
  - **Word Scramble**: answers one per line; the scramble is generated, or write
    `SCRAMBLED = ANSWER` to choose it.
  - **Spelling Bee**, **Mini Crossword** and **Word Search**: the same built-in
    puzzles as the main Woodley Leaves site, with the same forms.
  - **Custom game**: paste a self-contained game (HTML, CSS and JavaScript in
    one block). It runs in a sandbox and can't touch the rest of the site. The
    box opens with a working example.
  Every game belongs to an **edition** (a name like "June 2026" and a date).
  The front page groups games by edition and can sort newest or oldest first,
  or show a single edition.
  - **Preview**, next to Save, draws the game exactly as readers will see it
    before anything is saved. Works for every type.
  - **Publish** schedules a game. Leave it blank to publish on save, or set a
    date and time to hold it: editors see it marked Scheduled, readers don't
    see it until the time arrives. (The hold is applied in the browser; the
    data is in Firestore from the moment it is saved.)
- **Edit** and **Remove** appear on each card and on each game's page.
- **Editors** lists who can sign in and lets you add another Google account by
  email, or remove one.

## For whoever runs the site

Games and the editor list are stored in Firebase (Google sign-in + Firestore).
`SETUP.md` walks through creating the project; `firestore.rules` is the server
side allowlist. Until Firebase is configured the site runs in demo mode in the
browser only.

```
config.js         public settings: bootstrap editors, Firebase config
games-seed.js     the games that ship with the site
serve.py          local server with caching off (npm run serve)
store.js          shared store: sign-in, editor check, games (Firebase or demo)
validate.js       pure helpers: validation, scrambling, edition grouping (tested)
home.js           front page: editions, sort, filter, cards
play.js           one game, by ?id=
editor.js         dialogs: add/edit game, editors, confirm
editor-bar.js     the Editor access button and signed-in bar
games/            one renderer per game type
editor.css        cards, buttons, dialogs
games.css         game styles
firestore.rules   who may change what
```

## Tests

```
npm test
```

Runs the `validate.js` tests with Node's built-in test runner. No dependencies.
