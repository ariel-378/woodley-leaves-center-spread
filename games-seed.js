// Games that ship with the site. They show until an editor edits or removes
// them from the website; a stored game with the same id replaces its seed.
// The four puzzles the main Woodley Leaves site ships with, so the Center
// Spread offers them from day one. Change the edition, or the puzzles, with Edit.
const WEBSITE_EDITION = { label: "Spring 2026", date: "2026-04-01" };

export const CS_SEED_GAMES = [
  {
    id: "spelling-bee-spring-2026",
    type: "bee",
    edition: WEBSITE_EDITION,
    kicker: "Spelling Bee",
    title: "Spelling Bee",
    blurb: "Make as many words as you can from seven letters. Every word uses the center.",
    intro: "Make as many words as you can from these letters. Every word must include the green center letter and be at least four letters long. Letters can be reused.",
    data: {
      center: "T",
      outer: ["A", "E", "R", "L", "I", "N"],
      words: [
        "ANTE", "ANTI", "LATE", "LENT", "LITE", "NEAT", "RANT", "RATE", "RENT", "RITE",
        "TAIL", "TALE", "TARE", "TARN", "TEAL", "TEAR", "TEEN", "TENT", "TERN", "TIER",
        "TILE", "TILT", "TINE", "TINT", "TIRE", "TREE",
        "ALERT", "ALTER", "ELATE", "ENTER", "INERT", "INTER", "IRATE", "LATER", "LITER",
        "NATAL", "TIARA", "TILER", "TITAN", "TRAIL", "TRAIN", "TRAIT", "TRIAL",
        "ATTAIN", "ATTIRE", "LATTER", "LITTER", "NEATER", "RATTAN", "RATTLE", "RELATE",
        "RENTAL", "RETAIL", "RETAIN", "RETINA", "TALENT", "TATTER",
        "ENTRAIL", "LATRINE", "LITERAL", "RATLINE", "RETINAL",
      ],
    },
  },
  {
    id: "mini-crossword-spring-2026",
    type: "crossword",
    edition: WEBSITE_EDITION,
    kicker: "Mini Crossword",
    title: "Mini Crossword",
    blurb: "A five-by-five. Tap a square to begin, or click a clue.",
    intro: "A five-by-five from the puzzle team. Tap a square to begin, or click a clue.",
    data: {
      rows: ["BASIC", "ARENA", "SEEDS", "INDIE", "CASES"],
      across: {
        1: "Fundamental; no frills",
        6: "Venue for a big game or concert",
        7: "What birds peck from a feeder",
        8: "Low-budget film, informally",
        9: "Legal matters in court",
      },
      down: {
        1: "Cable channel tier, or beginner-friendly programming language",
        2: "The Colosseum, for one",
        3: "Sesame or poppy grains on a bagel",
        4: "Describes a small record label or film studio",
        5: "Boxes of wine or packs of water",
      },
    },
  },
  {
    id: "connections-spring-2026",
    type: "connections",
    edition: WEBSITE_EDITION,
    kicker: "Connections",
    title: "Connections",
    blurb: "Find the four groups of four. You'll know it when you see it.",
    intro: "Find the four groups of four. Each group shares something in common. Tap four tiles, then hit Submit; five mistakes and the answers are revealed.",
    data: {
      groups: [
        { name: "Woodley Leaves sections", words: ["News", "Features", "Style", "Sports"] },
        { name: "Parts of a frog", words: ["Leg", "Eye", "Tongue", "Toe"] },
        { name: "Shades of green", words: ["Moss", "Olive", "Emerald", "Lime"] },
        { name: "___ leaf", words: ["Maple", "Tea", "Gold", "Bay"] },
      ],
    },
  },
  {
    id: "spring-word-search-spring-2026",
    type: "wordsearch",
    edition: WEBSITE_EDITION,
    kicker: "Word Search",
    title: "Spring Word Search",
    blurb: "Fourteen signs of spring hidden in the grid.",
    intro: "Drag across letters to select a word. Horizontal, vertical, and diagonal selections all count.",
    data: {
      words: ["Allergies", "April Fools Day", "Bees", "Cherry Blossoms", "Cleaning",
        "Daylight Savings", "Flowers", "Gardening", "March", "May",
        "Picnic", "Rain", "Spring Break", "Sunshine"],
    },
  },
  {
    id: "connections-june-2026",
    type: "connections",
    edition: { label: "June 2026", date: "2026-06-03" },
    kicker: "Game",
    title: "Connections",
    blurb: "Sixteen words. Four hidden categories. Group them all to win.",
    intro: "Tap four tiles you think share a category, then hit Submit. Find all four groups, but you only get five mistakes before the answers are revealed.",
    data: {
      groups: [
        { name: "___Berry", words: ["Blue", "Cran", "Rasp", "Straw"] },
        { name: "___Mile", words: ["6 Minute", "Extra", "Si", "The Green"] },
        { name: "Pop___", words: ["Corn", "Culture", "Sicle", "Tart"] },
        { name: "(K)NE(E)", words: ["Cap", "Doh", "Ling", "Mo"] },
      ],
    },
  },
  {
    id: "summer-word-scramble",
    type: "scramble",
    edition: { label: "June 2026", date: "2026-06-03" },
    kicker: "Word Scramble",
    title: "Summer Word Scramble",
    blurb: "Unscramble all 15 summer-themed words. Answers check as you type.",
    intro: "Get ready for the sunny season by unscrambling all 15 summer-themed words. Type your guesses below. Answers check automatically.",
    data: {
      words: [
        { scrambled: "EEBRBCAU", answer: "BARBECUE" },
        { scrambled: "OHTFUR FO LUYJ", answer: "FOURTH OF JULY" },
        { scrambled: "ACTVONAI", answer: "VACATION" },
        { scrambled: "CEI AECMR", answer: "ICE CREAM" },
        { scrambled: "CAEHB", answer: "BEACH" },
        { scrambled: "RAOD PTRI", answer: "ROAD TRIP" },
        { scrambled: "FESIELRIF", answer: "FIREFLIES" },
        { scrambled: "SECNUSREN", answer: "SUNSCREEN" },
        { scrambled: "AGESLSNSSU", answer: "SUNGLASSES" },
        { scrambled: "RDSENHTMTSRUO", answer: "THUNDERSTORMS" },
        { scrambled: "MTEWLNAOER", answer: "WATERMELON" },
        { scrambled: "RBUADROFS", answer: "SURFBOARD" },
        { scrambled: "WEAYPSEAL PACM", answer: "SLEEPAWAY CAMP" },
        { scrambled: "LENDMEOA", answer: "LEMONADE" },
        { scrambled: "ADGREN", answer: "GARDEN" },
      ],
    },
  },
];
