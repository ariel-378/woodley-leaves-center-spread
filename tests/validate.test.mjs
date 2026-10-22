import test from "node:test";
import assert from "node:assert/strict";
import {
  slugify, normalizeEmail, isValidEmail, scrambleWord, parseScrambleLines,
  validateGame, mergeSeedsAndStored, groupByEdition,
} from "../validate.js";

const fixedRng = () => 0.42;

const connectionsInput = {
  type: "connections", title: "Connections", editionLabel: "June 2026", editionDate: "2026-06-03",
  groups: [
    { name: "A", words: ["1", "2", "3", "4"] }, { name: "B", words: ["5", "6", "7", "8"] },
    { name: "C", words: ["9", "10", "11", "12"] }, { name: "D", words: ["13", "14", "15", "16"] },
  ],
};

test("slugify lowercases and strips punctuation", () => {
  assert.equal(slugify("Summer Word Scramble!"), "summer-word-scramble");
  assert.equal(slugify("  Café  2026 "), "cafe-2026");
});

test("normalizeEmail trims and lowercases; isValidEmail rejects junk", () => {
  assert.equal(normalizeEmail("  Ariel@Maret.org "), "ariel@maret.org");
  assert.equal(isValidEmail("ariel@maret.org"), true);
  assert.equal(isValidEmail("not an email"), false);
});

test("scrambleWord keeps letters and spaces and differs from the answer", () => {
  const out = scrambleWord("ice cream");
  assert.equal(out.length, "ICE CREAM".length);
  assert.equal(out.split("").sort().join(""), "ICE CREAM".split("").sort().join(""));
  assert.notEqual(out, "ICE CREAM");
});

test("parseScrambleLines accepts plain answers and SCRAMBLED = ANSWER lines", () => {
  const words = parseScrambleLines("beach\nCAEHB = BEACH\n\n", fixedRng);
  assert.equal(words.length, 2);
  assert.equal(words[0].answer, "BEACH");
  assert.deepEqual(words[1], { scrambled: "CAEHB", answer: "BEACH" });
});

test("validateGame builds a connections game with a slug id", () => {
  const res = validateGame(connectionsInput);
  assert.equal(res.ok, true, res.errors.join(" "));
  assert.equal(res.game.id, "connections-june-2026");
  assert.equal(res.game.kicker, "Connections");
  assert.equal(res.game.data.groups.length, 4);
});

test("validateGame rejects a duplicate word across connections groups", () => {
  const bad = { ...connectionsInput, groups: connectionsInput.groups.map((g, i) => (i === 1 ? { ...g, words: ["1", "6", "7", "8"] } : g)) };
  const res = validateGame(bad);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('"1" appears')));
});

test("validateGame rejects a missing title and a fake date", () => {
  const res = validateGame({ ...connectionsInput, title: "", editionDate: "2026-02-30" });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes("title")));
  assert.ok(res.errors.some((e) => e.includes("real date")));
});

test("validateGame needs at least three scramble words with matching letters", () => {
  const few = validateGame({ type: "scramble", title: "S", editionLabel: "E", editionDate: "2026-01-01", scrambleText: "beach\nrain" });
  assert.equal(few.ok, false);
  const mismatch = validateGame({ type: "scramble", title: "S", editionLabel: "E", editionDate: "2026-01-01", scrambleText: "beach\nrain\nXYZ = SUN" });
  assert.ok(mismatch.errors.some((e) => e.includes("same letters")));
  const good = validateGame({ type: "scramble", title: "S", editionLabel: "E", editionDate: "2026-01-01", scrambleText: "beach\nrain\nsun" });
  assert.equal(good.ok, true);
  assert.equal(good.game.data.words.length, 3);
});

test("validateGame clamps custom code height and requires code", () => {
  const empty = validateGame({ type: "code", title: "C", editionLabel: "E", editionDate: "2026-01-01", code: "  " });
  assert.equal(empty.ok, false);
  const tall = validateGame({ type: "code", title: "C", editionLabel: "E", editionDate: "2026-01-01", code: "<p>hi</p>", height: "99999" });
  assert.equal(tall.game.data.height, 2000);
  const none = validateGame({ type: "code", title: "C", editionLabel: "E", editionDate: "2026-01-01", code: "<p>hi</p>", height: "" });
  assert.equal(none.game.data.height, 500);
});

test("validateGame keeps an existing id when editing", () => {
  const res = validateGame({ ...connectionsInput, id: "keep-me" });
  assert.equal(res.game.id, "keep-me");
});

test("mergeSeedsAndStored lets stored games override seeds and tombstones hide them", () => {
  const seeds = [{ id: "a", title: "Seed A" }, { id: "b", title: "Seed B" }];
  const stored = [{ id: "a", title: "Edited A" }, { id: "b", deleted: true }, { id: "c", title: "New C" }];
  const out = mergeSeedsAndStored(seeds, stored);
  assert.deepEqual(out.map((g) => g.title), ["Edited A", "New C"]);
});

test("groupByEdition sorts editions newest first and games by title", () => {
  const games = [
    { id: "1", title: "Zed", edition: { label: "June 2026", date: "2026-06-03" } },
    { id: "2", title: "Alpha", edition: { label: "June 2026", date: "2026-06-03" } },
    { id: "3", title: "Old", edition: { label: "March 2026", date: "2026-03-01" } },
  ];
  const newest = groupByEdition(games);
  assert.deepEqual(newest.map((e) => e.label), ["June 2026", "March 2026"]);
  assert.deepEqual(newest[0].games.map((g) => g.title), ["Alpha", "Zed"]);
  assert.deepEqual(groupByEdition(games, "oldest").map((e) => e.label), ["March 2026", "June 2026"]);
});

test("parsePublishAt: blank means now, junk is an error, a time becomes ISO", async () => {
  const { parsePublishAt } = await import("../validate.js");
  assert.deepEqual(parsePublishAt(""), { iso: null });
  assert.ok(parsePublishAt("next tuesday").error);
  assert.equal(parsePublishAt("2026-11-03T07:00").iso, new Date("2026-11-03T07:00").toISOString());
});

test("isLive hides a game until its publish time", async () => {
  const { isLive } = await import("../validate.js");
  const now = Date.parse("2026-10-22T12:00:00Z");
  assert.equal(isLive({ publishAt: null }, now), true);
  assert.equal(isLive({ publishAt: "2026-10-22T11:59:00Z" }, now), true);
  assert.equal(isLive({ publishAt: "2026-10-22T12:01:00Z" }, now), false);
});

test("validateGame stores the publish time and rejects a bad one", () => {
  const scheduled = validateGame({ ...connectionsInput, publishAt: "2030-01-01T09:00" });
  assert.equal(scheduled.ok, true);
  assert.equal(scheduled.game.publishAt, new Date("2030-01-01T09:00").toISOString());
  assert.equal(validateGame(connectionsInput).game.publishAt, null);
  assert.ok(validateGame({ ...connectionsInput, publishAt: "soon" }).errors.some((e) => e.includes("Publish time")));
});

const base = { title: "P", editionLabel: "E", editionDate: "2026-01-01" };

test("validateGame builds a spelling bee and rejects words that break the rules", () => {
  const good = validateGame({ ...base, type: "bee", beeCenter: "t", beeOuter: "aerlin", beeWords: "ante\nlate\nlate\ntrail" });
  assert.equal(good.ok, true, good.errors.join(" "));
  assert.deepEqual(good.game.data.center, "T");
  assert.deepEqual(good.game.data.words, ["ANTE", "LATE", "TRAIL"]);
  const bad = validateGame({ ...base, type: "bee", beeCenter: "t", beeOuter: "aerlin", beeWords: "rain" });
  assert.ok(bad.errors.some((e) => e.includes('"RAIN"')));
  const dup = validateGame({ ...base, type: "bee", beeCenter: "a", beeOuter: "aerlin", beeWords: "lane" });
  assert.ok(dup.errors.some((e) => e.includes("different")));
});

test("validateGame builds a crossword and needs five rows and ten clues", () => {
  const rows = ["BASIC", "ARENA", "SEEDS", "INDIE", "CASES"];
  const clues = ["a", "b", "c", "d", "e"];
  const good = validateGame({ ...base, type: "crossword", cwRows: rows.map((r) => r.toLowerCase()), cwAcross: clues, cwDown: clues });
  assert.equal(good.ok, true, good.errors.join(" "));
  assert.deepEqual(good.game.data.rows, rows);
  assert.deepEqual(Object.keys(good.game.data.across), ["1", "6", "7", "8", "9"]);
  const short = validateGame({ ...base, type: "crossword", cwRows: ["BASI", ...rows.slice(1)], cwAcross: clues, cwDown: clues });
  assert.ok(short.errors.some((e) => e.includes("5 letters")));
  const missing = validateGame({ ...base, type: "crossword", cwRows: rows, cwAcross: clues, cwDown: ["a", "b"] });
  assert.ok(missing.errors.some((e) => e.includes("clues")));
});

test("validateGame builds a word search and limits word length", () => {
  const good = validateGame({ ...base, type: "wordsearch", wsWords: "Cherry Blossoms\nBees, Sunshine" });
  assert.equal(good.ok, true, good.errors.join(" "));
  assert.deepEqual(good.game.data.words, ["Cherry Blossoms", "Bees", "Sunshine"]);
  const few = validateGame({ ...base, type: "wordsearch", wsWords: "Bees" });
  assert.equal(few.ok, false);
  const long = validateGame({ ...base, type: "wordsearch", wsWords: "a\nb\nsupercalifragilisticexpialidocious" });
  assert.ok(long.errors.some((e) => e.includes("too long")));
});
