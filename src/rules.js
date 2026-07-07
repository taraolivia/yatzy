const FACES = [1, 2, 3, 4, 5, 6];

const UPPER_CATEGORIES = [
  { id: "ones", label: "Enere", section: "upper", face: 1 },
  { id: "twos", label: "Toere", section: "upper", face: 2 },
  { id: "threes", label: "Treere", section: "upper", face: 3 },
  { id: "fours", label: "Firere", section: "upper", face: 4 },
  { id: "fives", label: "Femmere", section: "upper", face: 5 },
  { id: "sixes", label: "Seksere", section: "upper", face: 6 }
];

const NORMAL_LOWER_CATEGORIES = [
  { id: "onePair", label: "Ett par", section: "lower" },
  { id: "twoPairs", label: "To par", section: "lower" },
  { id: "threeKind", label: "Tre like", section: "lower" },
  { id: "fourKind", label: "Fire like", section: "lower" },
  { id: "smallStraight", label: "Liten straight", section: "lower" },
  { id: "largeStraight", label: "Stor straight", section: "lower" },
  { id: "fullHouse", label: "Hus", section: "lower" },
  { id: "chance", label: "Sjanse", section: "lower" },
  { id: "yatzy", label: "Yatzy", section: "lower" }
];

const MAXI_LOWER_CATEGORIES = [
  { id: "onePair", label: "Ett par", section: "lower" },
  { id: "twoPairs", label: "To par", section: "lower" },
  { id: "threePairs", label: "Tre par", section: "lower" },
  { id: "threeKind", label: "Tre like", section: "lower" },
  { id: "fourKind", label: "Fire like", section: "lower" },
  { id: "fiveKind", label: "Fem like", section: "lower" },
  { id: "smallStraight", label: "Liten straight", section: "lower" },
  { id: "largeStraight", label: "Stor straight", section: "lower" },
  { id: "fullStraight", label: "Full straight", section: "lower" },
  { id: "fullHouse", label: "Hus", section: "lower" },
  { id: "villa", label: "Villa", section: "lower" },
  { id: "tower", label: "T\u00e5rn", section: "lower" },
  { id: "chance", label: "Sjanse", section: "lower" },
  { id: "maxiYatzy", label: "Maxi Yatzy", section: "lower" }
];

const RULESETS = {
  normal: {
    id: "normal",
    name: "Yatzy",
    diceCount: 5,
    baseRolls: 3,
    upperBonusThreshold: 63,
    upperBonus: 50,
    canSaveRolls: false,
    categories: [...UPPER_CATEGORIES, ...NORMAL_LOWER_CATEGORIES]
  },
  maxi: {
    id: "maxi",
    name: "Maxi Yatzy",
    diceCount: 6,
    baseRolls: 3,
    upperBonusThreshold: 84,
    upperBonus: 100,
    canSaveRolls: true,
    categories: [...UPPER_CATEGORIES, ...MAXI_LOWER_CATEGORIES]
  }
};

function getRules(mode) {
  return RULESETS[mode] || RULESETS.normal;
}

function createEmptyScores(mode) {
  return Object.fromEntries(getRules(mode).categories.map((category) => [category.id, null]));
}

function countsFor(dice) {
  const counts = new Map(FACES.map((face) => [face, 0]));
  for (const die of dice) {
    counts.set(die, (counts.get(die) || 0) + 1);
  }
  return counts;
}

function sum(dice) {
  return dice.reduce((total, die) => total + die, 0);
}

function scoreUpper(dice, face) {
  return dice.filter((die) => die === face).reduce((total, die) => total + die, 0);
}

function scoreOfKind(dice, size) {
  const counts = countsFor(dice);
  for (let face = 6; face >= 1; face -= 1) {
    if ((counts.get(face) || 0) >= size) {
      return face * size;
    }
  }
  return 0;
}

function scorePairs(dice, pairCount) {
  const counts = countsFor(dice);
  const pairs = [];
  for (let face = 6; face >= 1; face -= 1) {
    if ((counts.get(face) || 0) >= 2) {
      pairs.push(face * 2);
    }
  }
  return pairs.length >= pairCount ? pairs.slice(0, pairCount).reduce((total, value) => total + value, 0) : 0;
}

function hasFaces(dice, faces) {
  const values = new Set(dice);
  return faces.every((face) => values.has(face));
}

function scoreFullHouse(dice) {
  const counts = countsFor(dice);
  let best = 0;
  for (let triple = 6; triple >= 1; triple -= 1) {
    if ((counts.get(triple) || 0) < 3) continue;
    for (let pair = 6; pair >= 1; pair -= 1) {
      if (pair !== triple && (counts.get(pair) || 0) >= 2) {
        best = Math.max(best, triple * 3 + pair * 2);
      }
    }
  }
  return best;
}

function scoreVilla(dice) {
  const counts = countsFor(dice);
  const triples = [];
  for (let face = 6; face >= 1; face -= 1) {
    if ((counts.get(face) || 0) >= 3) {
      triples.push(face * 3);
    }
  }
  return triples.length >= 2 ? triples.slice(0, 2).reduce((total, value) => total + value, 0) : 0;
}

function scoreTower(dice) {
  const counts = countsFor(dice);
  let best = 0;
  for (let four = 6; four >= 1; four -= 1) {
    if ((counts.get(four) || 0) < 4) continue;
    for (let pair = 6; pair >= 1; pair -= 1) {
      if (pair !== four && (counts.get(pair) || 0) >= 2) {
        best = Math.max(best, four * 4 + pair * 2);
      }
    }
  }
  return best;
}

function scoreCategory(mode, categoryId, dice) {
  const rules = getRules(mode);
  const category = rules.categories.find((entry) => entry.id === categoryId);
  if (!category || dice.length !== rules.diceCount) return 0;

  if (category.section === "upper") {
    return scoreUpper(dice, category.face);
  }

  switch (categoryId) {
    case "onePair":
      return scorePairs(dice, 1);
    case "twoPairs":
      return scorePairs(dice, 2);
    case "threePairs":
      return scorePairs(dice, 3);
    case "threeKind":
      return scoreOfKind(dice, 3);
    case "fourKind":
      return scoreOfKind(dice, 4);
    case "fiveKind":
      return scoreOfKind(dice, 5);
    case "smallStraight":
      return hasFaces(dice, [1, 2, 3, 4, 5]) ? 15 : 0;
    case "largeStraight":
      return hasFaces(dice, [2, 3, 4, 5, 6]) ? 20 : 0;
    case "fullStraight":
      return hasFaces(dice, [1, 2, 3, 4, 5, 6]) ? 21 : 0;
    case "fullHouse":
      return scoreFullHouse(dice);
    case "villa":
      return scoreVilla(dice);
    case "tower":
      return scoreTower(dice);
    case "chance":
      return sum(dice);
    case "yatzy":
      return new Set(dice).size === 1 ? 50 : 0;
    case "maxiYatzy":
      return new Set(dice).size === 1 ? 100 : 0;
    default:
      return 0;
  }
}

function scorePreview(mode, scores, dice) {
  const rules = getRules(mode);
  if (!Array.isArray(dice) || dice.length !== rules.diceCount) return {};
  return Object.fromEntries(
    rules.categories
      .filter((category) => scores[category.id] === null)
      .map((category) => [category.id, scoreCategory(mode, category.id, dice)])
  );
}

function calculateTotals(mode, scores) {
  const rules = getRules(mode);
  const upperIds = rules.categories.filter((category) => category.section === "upper").map((category) => category.id);
  const lowerIds = rules.categories.filter((category) => category.section === "lower").map((category) => category.id);
  const upper = upperIds.reduce((total, id) => total + (scores[id] ?? 0), 0);
  const lower = lowerIds.reduce((total, id) => total + (scores[id] ?? 0), 0);
  const bonus = upper >= rules.upperBonusThreshold ? rules.upperBonus : 0;
  const filled = rules.categories.filter((category) => scores[category.id] !== null).length;

  return {
    upper,
    lower,
    bonus,
    total: upper + lower + bonus,
    filled,
    remaining: rules.categories.length - filled
  };
}

function isScorecardComplete(mode, scores) {
  return calculateTotals(mode, scores).remaining === 0;
}

module.exports = {
  FACES,
  RULESETS,
  getRules,
  createEmptyScores,
  scoreCategory,
  scorePreview,
  calculateTotals,
  isScorecardComplete
};
