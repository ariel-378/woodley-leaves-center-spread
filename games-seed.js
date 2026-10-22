// Games that ship with the site. They show until an editor edits or removes
// them from the website; a stored game with the same id replaces its seed.
export const CS_SEED_GAMES = [
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
