const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateTotals, createEmptyScores, scoreCategory, scorePreview } = require("../src/rules");

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
});

test("scores Maxi Yatzy categories", () => {
  assert.equal(scoreCategory("maxi", "threePairs", [6, 6, 4, 4, 2, 2]), 24);
  assert.equal(scoreCategory("maxi", "fiveKind", [5, 5, 5, 5, 5, 1]), 25);
  assert.equal(scoreCategory("maxi", "fullStraight", [1, 2, 3, 4, 5, 6]), 21);
  assert.equal(scoreCategory("maxi", "villa", [3, 3, 3, 6, 6, 6]), 27);
  assert.equal(scoreCategory("maxi", "tower", [4, 4, 4, 4, 2, 2]), 20);
  assert.equal(scoreCategory("maxi", "maxiYatzy", [1, 1, 1, 1, 1, 1]), 100);
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

test("only previews empty categories", () => {
  const scores = createEmptyScores("normal");
  scores.ones = 3;
  const preview = scorePreview("normal", scores, [1, 1, 1, 4, 5]);

  assert.equal(preview.ones, undefined);
  assert.equal(preview.threes, 0);
  assert.equal(preview.chance, 12);
});
