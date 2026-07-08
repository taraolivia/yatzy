const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateTotals,
  createEmptyScores,
  getRules,
  normalizeRuleSettings,
  isForcedYatzyRound,
  nextOpenCategory,
  scoreCategory,
  scorePreview,
  upperBonusThreshold
} = require("../src/rules");

test("scores Norwegian Yatzy lower categories", () => {
  const dice = [6, 6, 5, 5, 5];

  assert.equal(scoreCategory("normal", "onePair", dice), 12);
  assert.equal(scoreCategory("normal", "twoPairs", dice), 22);
  assert.equal(scoreCategory("normal", "threeKind", dice), 15);
  assert.equal(scoreCategory("normal", "fullHouse", dice), 27);
  assert.equal(scoreCategory("normal", "chance", dice), 27);
  assert.equal(scoreCategory("normal", "yatzy", dice), 0);
});

test("scores Norwegian Yatzy straights and yatzy", () => {
  assert.equal(scoreCategory("normal", "smallStraight", [1, 2, 3, 4, 5]), 15);
  assert.equal(scoreCategory("normal", "largeStraight", [2, 3, 4, 5, 6]), 20);
  assert.equal(scoreCategory("normal", "yatzy", [4, 4, 4, 4, 4]), 50);
  assert.equal(scoreCategory("normal", "fullHouse", [4, 4, 4, 4, 4]), 0);
  assert.equal(scoreCategory("normal", "fullHouse", [6, 6, 6, 5, 4]), 0);
});

test("scores Maxi Yatzy categories", () => {
  assert.equal(scoreCategory("maxi", "threePairs", [6, 6, 4, 4, 2, 2]), 24);
  assert.equal(scoreCategory("maxi", "fiveKind", [5, 5, 5, 5, 5, 1]), 25);
  assert.equal(scoreCategory("maxi", "fullStraight", [1, 2, 3, 4, 5, 6]), 21);
  assert.equal(scoreCategory("maxi", "fullHouse", [3, 3, 3, 6, 6, 6]), 27);
  assert.equal(scoreCategory("maxi", "fullHouse", [6, 6, 6, 4, 4, 1]), 0);
  assert.equal(scoreCategory("maxi", "villa", [6, 6, 6, 4, 4, 1]), 26);
  assert.equal(scoreCategory("maxi", "tower", [4, 4, 4, 4, 2, 2]), 20);
  assert.equal(scoreCategory("maxi", "maxiYatzy", [1, 1, 1, 1, 1, 1]), 100);
});

test("lists Maxi Hytte before Hus", () => {
  const lowerIds = getRules("maxi").categories
    .filter((category) => category.section === "lower")
    .map((category) => category.id);

  assert.ok(lowerIds.indexOf("villa") < lowerIds.indexOf("fullHouse"));
});

test("uses custom room rule settings for scoring and bonus", () => {
  const settings = normalizeRuleSettings("maxi", {
    upperBonusThreshold: 70,
    upperBonus: 35,
    yatzyScore: 120,
    fullStraightScore: 30
  });
  assert.equal(scoreCategory("maxi", "fullStraight", [1, 2, 3, 4, 5, 6], settings), 30);
  assert.equal(scoreCategory("maxi", "maxiYatzy", [6, 6, 6, 6, 6, 6], settings), 120);

  const scores = createEmptyScores("maxi");
  scores.ones = 4;
  scores.twos = 8;
  scores.threes = 12;
  scores.fours = 16;
  scores.fives = 20;
  scores.sixes = 24;
  assert.equal(calculateTotals("maxi", scores, { ruleSettings: settings }).bonus, 35);
});

test("calculates upper bonuses", () => {
  const normal = createEmptyScores("normal");
  normal.ones = 3;
  normal.twos = 6;
  normal.threes = 9;
  normal.fours = 12;
  normal.fives = 15;
  normal.sixes = 18;
  assert.equal(calculateTotals("normal", normal).bonus, 50);

  const maxi = createEmptyScores("maxi");
  maxi.ones = 4;
  maxi.twos = 8;
  maxi.threes = 12;
  maxi.fours = 16;
  maxi.fives = 20;
  maxi.sixes = 24;
  assert.equal(calculateTotals("maxi", maxi).bonus, 100);
});

test("uses lower upper bonus thresholds in forced mode", () => {
  const normal = createEmptyScores("normal");
  normal.ones = 2;
  normal.twos = 4;
  normal.threes = 6;
  normal.fours = 8;
  normal.fives = 10;
  normal.sixes = 12;
  assert.equal(upperBonusThreshold("normal", true), 42);
  assert.equal(calculateTotals("normal", normal).bonus, 0);
  assert.equal(calculateTotals("normal", normal, { forcedMode: true }).bonus, 50);

  const maxi = createEmptyScores("maxi");
  maxi.ones = 3;
  maxi.twos = 6;
  maxi.threes = 9;
  maxi.fours = 12;
  maxi.fives = 15;
  maxi.sixes = 18;
  assert.equal(upperBonusThreshold("maxi", true), 63);
  assert.equal(calculateTotals("maxi", maxi).bonus, 0);
  assert.equal(calculateTotals("maxi", maxi, { forcedMode: true }).bonus, 100);
});

test("only previews empty categories", () => {
  const scores = createEmptyScores("normal");
  scores.ones = 3;
  const preview = scorePreview("normal", scores, [1, 1, 1, 4, 5]);

  assert.equal(preview.ones, undefined);
  assert.equal(preview.threes, 0);
  assert.equal(preview.chance, 12);
});

test("finds the next forced category in ruleset order", () => {
  const normal = createEmptyScores("normal");
  assert.equal(nextOpenCategory("normal", normal).id, "ones");
  normal.ones = 0;
  normal.twos = 6;
  assert.equal(nextOpenCategory("normal", normal).id, "threes");

  const maxi = createEmptyScores("maxi");
  maxi.ones = 0;
  maxi.twos = 0;
  maxi.threes = 0;
  maxi.fours = 0;
  maxi.fives = 0;
  maxi.sixes = 0;
  assert.equal(nextOpenCategory("maxi", maxi).id, "onePair");
});

test("skips a deferred forced category until the final Yatzy round", () => {
  const scores = createEmptyScores("normal");
  scores.ones = 2;
  scores.yatzy = 50;

  assert.equal(nextOpenCategory("normal", scores, "twos").id, "threes");
  for (const categoryId of [
    "threes",
    "fours",
    "fives",
    "sixes",
    "onePair",
    "twoPairs",
    "threeKind",
    "fourKind",
    "smallStraight",
    "largeStraight",
    "fullHouse",
    "chance"
  ]) {
    scores[categoryId] = 0;
  }

  assert.equal(nextOpenCategory("normal", scores, "twos").id, "twos");
  assert.equal(isForcedYatzyRound("normal", scores, "twos"), true);
});
