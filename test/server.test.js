const test = require("node:test");
const assert = require("node:assert/strict");
process.env.ALLOW_TEST_DICE = "true";
const { server } = require("../server");

function listen() {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

function close() {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function post(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  return { response, payload };
}

async function get(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  const payload = await response.json();
  return { response, payload };
}

test("test-only dice fixtures still protect held dice", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    assert.equal(created.response.status, 201);
    let { game, playerToken } = created.payload;

    const started = await post(baseUrl, `/api/games/${game.code}/start`, {
      playerToken,
      version: game.version
    });
    assert.equal(started.response.status, 200);
    game = started.payload.game;

    const rolled = await post(baseUrl, `/api/games/${game.code}/roll`, {
      playerToken,
      version: game.version,
      dice: [1, 2, 3, 4, 5]
    });
    assert.equal(rolled.response.status, 200);
    assert.deepEqual(rolled.payload.game.dice, [1, 2, 3, 4, 5]);
    assert.equal(rolled.payload.game.log[0].type, "roll");
    assert.deepEqual(rolled.payload.game.log[0].rolledDice, [1, 2, 3, 4, 5]);
    game = rolled.payload.game;

    const staleHold = await post(baseUrl, `/api/games/${game.code}/hold`, {
      playerToken,
      version: game.version - 1,
      index: 0
    });
    assert.equal(staleHold.response.status, 409);

    const held = await post(baseUrl, `/api/games/${game.code}/hold`, {
      playerToken,
      version: game.version,
      index: 0
    });
    assert.equal(held.response.status, 200);
    assert.equal(held.payload.game.log[0].type, "hold");
    assert.deepEqual(held.payload.game.log[0].heldDice, [1]);
    game = held.payload.game;

    const invalidRoll = await post(baseUrl, `/api/games/${game.code}/roll`, {
      playerToken,
      version: game.version,
      dice: [6, 2, 3, 4, 5]
    });
    assert.equal(invalidRoll.response.status, 400);
  } finally {
    await close();
  }
});

test("rejects client-supplied dice outside test fixture mode", async () => {
  const baseUrl = await listen();
  const previousSetting = process.env.ALLOW_TEST_DICE;
  delete process.env.ALLOW_TEST_DICE;
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    let { game, playerToken } = created.payload;
    const started = await post(baseUrl, `/api/games/${game.code}/start`, {
      playerToken,
      version: game.version
    });
    game = started.payload.game;

    const forged = await post(baseUrl, `/api/games/${game.code}/roll`, {
      playerToken,
      version: game.version,
      dice: [6, 6, 6, 6, 6]
    });
    assert.equal(forged.response.status, 400);
    assert.match(forged.payload.error, /serveren/);
  } finally {
    process.env.ALLOW_TEST_DICE = previousSetting;
    await close();
  }
});

test("expands chat emoji shortcuts in stored messages", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    const { game, playerToken } = created.payload;

    const chatted = await post(baseUrl, `/api/games/${game.code}/chat`, {
      playerToken,
      message: "Bra kast :cry :lol: :dice :medal-first-place: :thumbs-up:"
    });

    assert.equal(chatted.response.status, 200);
    assert.equal(chatted.payload.game.chat.at(-1).message, "Bra kast 😢 😂 🎲 🥇 👍");
  } finally {
    await close();
  }
});

test("stores generated quote chat messages with quote kind", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    const { game, playerToken } = created.payload;

    const quoted = await post(baseUrl, `/api/games/${game.code}/chat`, {
      playerToken,
      kind: "quote",
      message: "Live, laugh, Yatzy."
    });

    assert.equal(quoted.response.status, 200);
    assert.equal(quoted.payload.game.chat.at(-1).kind, "quote");
    assert.equal(quoted.payload.game.chat.at(-1).message, "Live, laugh, Yatzy.");

    const regular = await post(baseUrl, `/api/games/${game.code}/chat`, {
      playerToken,
      kind: "sparkles",
      message: "Vanlig melding"
    });

    assert.equal(regular.response.status, 200);
    assert.equal(regular.payload.game.chat.at(-1).kind, "message");
  } finally {
    await close();
  }
});

test("assigns public avatar icons to room players", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    assert.equal(created.response.status, 201);
    let { game } = created.payload;
    assert.match(game.players[0].avatarIcon, /^[a-z0-9-]+$/);

    const joined = await post(baseUrl, `/api/games/${game.code}/join`, {
      name: "Liv"
    });
    assert.equal(joined.response.status, 200);
    game = joined.payload.game;
    assert.equal(game.players.length, 2);
    assert.ok(game.players.every((player) => /^[a-z0-9-]+$/.test(player.avatarIcon)));
    assert.notEqual(game.players[0].avatarIcon, game.players[1].avatarIcon);
  } finally {
    await close();
  }
});

test("chat does not advance the gameplay version", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    let { game, playerToken } = created.payload;

    const started = await post(baseUrl, `/api/games/${game.code}/start`, {
      playerToken,
      version: game.version
    });
    assert.equal(started.response.status, 200);
    game = started.payload.game;
    const gameplayVersion = game.version;

    const chatted = await post(baseUrl, `/api/games/${game.code}/chat`, {
      playerToken,
      message: "Hei!"
    });
    assert.equal(chatted.response.status, 200);
    assert.equal(chatted.payload.game.version, gameplayVersion);
    assert.equal(chatted.payload.game.chat.at(-1).message, "Hei!");

    const rolled = await post(baseUrl, `/api/games/${game.code}/roll`, {
      playerToken,
      version: gameplayVersion,
      dice: [1, 2, 3, 4, 5]
    });
    assert.equal(rolled.response.status, 200);
    assert.deepEqual(rolled.payload.game.dice, [1, 2, 3, 4, 5]);
  } finally {
    await close();
  }
});

test("announces a server-authoritative roll before committing its forced visual result", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    let { game, playerToken } = created.payload;

    const started = await post(baseUrl, `/api/games/${game.code}/start`, {
      playerToken,
      version: game.version
    });
    game = started.payload.game;

    const planned = await post(baseUrl, `/api/games/${game.code}/roll`, {
      playerToken,
      version: game.version
    });
    assert.equal(planned.response.status, 200);
    game = planned.payload.game;
    assert.deepEqual(game.activeRoll.diceIndexes, [0, 1, 2, 3, 4]);
    assert.equal(game.activeRoll.values.length, 5);
    assert.ok(game.activeRoll.values.every((value) => Number.isInteger(value) && value >= 1 && value <= 6));
    assert.deepEqual(game.activeRoll.dice, game.activeRoll.values);
    assert.ok(game.activeRoll.startsAt > Date.parse(game.activeRoll.startedAt));
    assert.deepEqual(game.dice, []);
    assert.equal(game.rollsUsed, 0);
    const plannedDice = [...game.activeRoll.dice];

    const blockedHold = await post(baseUrl, `/api/games/${game.code}/hold`, {
      playerToken,
      version: game.version,
      index: 0
    });
    assert.equal(blockedHold.response.status, 409);

    const completed = await post(baseUrl, `/api/games/${game.code}/complete`, {
      playerToken,
      rollId: game.activeRoll.id,
      dice: [6, 6, 6, 6, 6]
    });
    assert.equal(completed.response.status, 200);
    assert.equal(completed.payload.game.activeRoll, null);
    assert.deepEqual(completed.payload.game.dice, plannedDice);
    assert.equal(completed.payload.game.rollsUsed, 1);
  } finally {
    await close();
  }
});

test("canceling a planned roll still commits the planned dice", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    let { game, playerToken } = created.payload;

    const started = await post(baseUrl, `/api/games/${game.code}/start`, {
      playerToken,
      version: game.version
    });
    game = started.payload.game;

    const planned = await post(baseUrl, `/api/games/${game.code}/roll`, {
      playerToken,
      version: game.version
    });
    assert.equal(planned.response.status, 200);
    game = planned.payload.game;
    const plannedDice = [...game.activeRoll.dice];

    const canceled = await post(baseUrl, `/api/games/${game.code}/cancel`, {
      playerToken,
      rollId: game.activeRoll.id
    });
    assert.equal(canceled.response.status, 200);
    assert.equal(canceled.payload.game.activeRoll, null);
    assert.deepEqual(canceled.payload.game.dice, plannedDice);
    assert.equal(canceled.payload.game.rollsUsed, 1);
    assert.equal(canceled.payload.game.log[0].type, "roll");
  } finally {
    await close();
  }
});

test("expired planned rolls are committed instead of discarded", async () => {
  const baseUrl = await listen();
  const originalNow = Date.now;
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    let { game, playerToken } = created.payload;

    const started = await post(baseUrl, `/api/games/${game.code}/start`, {
      playerToken,
      version: game.version
    });
    game = started.payload.game;

    const planned = await post(baseUrl, `/api/games/${game.code}/roll`, {
      playerToken,
      version: game.version
    });
    assert.equal(planned.response.status, 200);
    game = planned.payload.game;
    const plannedDice = [...game.activeRoll.dice];
    const expiredRollTime = Date.parse(game.activeRoll.startedAt) + 31_000;
    Date.now = () => expiredRollTime;

    const fetched = await get(baseUrl, `/api/games/${game.code}`);
    assert.equal(fetched.response.status, 200);
    assert.equal(fetched.payload.game.activeRoll, null);
    assert.deepEqual(fetched.payload.game.dice, plannedDice);
    assert.equal(fetched.payload.game.rollsUsed, 1);
    game = fetched.payload.game;

    const left = await post(baseUrl, `/api/games/${game.code}/leave`, {
      playerToken,
      version: game.version
    });
    assert.equal(left.response.status, 200);
    assert.equal(left.payload.game.activeRoll, null);
    assert.equal(left.payload.game.players[0].isActive, false);
  } finally {
    Date.now = originalNow;
    await close();
  }
});

test("uses Maxi saved rolls only when a chip is spent", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "maxi" });
    assert.equal(created.response.status, 201);
    let { game, playerToken } = created.payload;
    const code = game.code;

    const started = await post(baseUrl, `/api/games/${code}/start`, {
      playerToken,
      version: game.version
    });
    assert.equal(started.response.status, 200);
    game = started.payload.game;

    const quickRoll = await post(baseUrl, `/api/games/${code}/roll`, {
      playerToken,
      version: game.version,
      dice: [1, 1, 1, 2, 3, 4]
    });
    assert.equal(quickRoll.response.status, 200);
    game = quickRoll.payload.game;

    const quickScore = await post(baseUrl, `/api/games/${code}/score`, {
      playerToken,
      version: game.version,
      categoryId: "ones"
    });
    assert.equal(quickScore.response.status, 200);
    game = quickScore.payload.game;
    assert.equal(game.players[0].savedRolls, 2);

    for (const dice of [
      [2, 2, 2, 3, 4, 5],
      [2, 2, 3, 3, 4, 5],
      [2, 3, 3, 4, 4, 5]
    ]) {
      const rolled = await post(baseUrl, `/api/games/${code}/roll`, {
        playerToken,
        version: game.version,
        dice
      });
      assert.equal(rolled.response.status, 200);
      game = rolled.payload.game;
    }

    assert.equal(game.rollLimit, 3);
    assert.equal(game.rollsUsed, 3);
    assert.equal(game.rollsLeft, 0);
    assert.equal(game.canUseSavedRoll, true);
    assert.equal(game.players[0].savedRolls, 2);

    const plainFourthRoll = await post(baseUrl, `/api/games/${code}/roll`, {
      playerToken,
      version: game.version,
      dice: [2, 2, 2, 2, 4, 5]
    });
    assert.equal(plainFourthRoll.response.status, 400);

    const chipRoll = await post(baseUrl, `/api/games/${code}/roll`, {
      playerToken,
      version: game.version,
      useSavedRoll: true,
      dice: [2, 2, 2, 2, 4, 5]
    });
    assert.equal(chipRoll.response.status, 200);
    game = chipRoll.payload.game;

    assert.equal(game.rollLimit, 3);
    assert.equal(game.rollsUsed, 4);
    assert.equal(game.extraRollsUsed, 1);
    assert.equal(game.players[0].savedRolls, 1);

    const scored = await post(baseUrl, `/api/games/${code}/score`, {
      playerToken,
      version: game.version,
      categoryId: "twos"
    });
    assert.equal(scored.response.status, 200);
    game = scored.payload.game;
    assert.equal(game.players[0].savedRolls, 1);
  } finally {
    await close();
  }
});

test("restarts a finished sheet in the same room", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    assert.equal(created.response.status, 201);
    let { game, playerToken } = created.payload;
    const code = game.code;

    const started = await post(baseUrl, `/api/games/${code}/start`, {
      playerToken,
      version: game.version
    });
    assert.equal(started.response.status, 200);
    game = started.payload.game;

    for (const category of game.categories) {
      const rolled = await post(baseUrl, `/api/games/${code}/roll`, {
        playerToken,
        version: game.version,
        dice: [1, 2, 3, 4, 5]
      });
      assert.equal(rolled.response.status, 200);
      game = rolled.payload.game;

      const scored = await post(baseUrl, `/api/games/${code}/score`, {
        playerToken,
        version: game.version,
        categoryId: category.id
      });
      assert.equal(scored.response.status, 200);
      game = scored.payload.game;
    }

    assert.equal(game.status, "finished");
    assert.equal(game.code, code);
    assert.ok(game.players[0].totals.filled > 0);

    const restarted = await post(baseUrl, `/api/games/${code}/restart`, {
      playerToken,
      version: game.version
    });
    assert.equal(restarted.response.status, 200);
    game = restarted.payload.game;

    assert.equal(game.code, code);
    assert.equal(game.status, "playing");
    assert.equal(game.currentSeatId, game.players[0].seatId);
    assert.equal(game.players[0].totals.filled, 0);
    assert.equal(game.players[0].totals.remaining, game.categories.length);
    assert.deepEqual(game.dice, []);
  } finally {
    await close();
  }
});

test("forced mode requires scoring the next open category", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    assert.equal(created.response.status, 201);
    let { game, playerToken } = created.payload;

    const settings = await post(baseUrl, `/api/games/${game.code}/settings`, {
      playerToken,
      version: game.version,
      forcedMode: true
    });
    assert.equal(settings.response.status, 200);
    assert.equal(settings.payload.game.forcedMode, true);
    game = settings.payload.game;

    const started = await post(baseUrl, `/api/games/${game.code}/start`, {
      playerToken,
      version: game.version
    });
    assert.equal(started.response.status, 200);
    game = started.payload.game;

    const rolled = await post(baseUrl, `/api/games/${game.code}/roll`, {
      playerToken,
      version: game.version,
      dice: [1, 2, 2, 3, 4]
    });
    assert.equal(rolled.response.status, 200);
    assert.equal(rolled.payload.game.nextForcedCategoryId, "ones");
    assert.equal(rolled.payload.game.scorePreview.twos, undefined);
    game = rolled.payload.game;

    const skipped = await post(baseUrl, `/api/games/${game.code}/score`, {
      playerToken,
      version: game.version,
      categoryId: "twos"
    });
    assert.equal(skipped.response.status, 400);

    const scoredOnes = await post(baseUrl, `/api/games/${game.code}/score`, {
      playerToken,
      version: game.version,
      categoryId: "ones"
    });
    assert.equal(scoredOnes.response.status, 200);
    assert.equal(scoredOnes.payload.game.nextForcedCategoryId, "twos");
  } finally {
    await close();
  }
});

test("forced mode lets Yatzy score early and saves the skipped field for the final round", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    assert.equal(created.response.status, 201);
    let { game, playerToken } = created.payload;
    const code = game.code;

    const settings = await post(baseUrl, `/api/games/${code}/settings`, {
      playerToken,
      version: game.version,
      forcedMode: true
    });
    assert.equal(settings.response.status, 200);
    game = settings.payload.game;

    const started = await post(baseUrl, `/api/games/${code}/start`, {
      playerToken,
      version: game.version
    });
    assert.equal(started.response.status, 200);
    game = started.payload.game;

    let rolled = await post(baseUrl, `/api/games/${code}/roll`, {
      playerToken,
      version: game.version,
      dice: [1, 1, 2, 3, 4]
    });
    assert.equal(rolled.response.status, 200);
    game = rolled.payload.game;

    let scored = await post(baseUrl, `/api/games/${code}/score`, {
      playerToken,
      version: game.version,
      categoryId: "ones"
    });
    assert.equal(scored.response.status, 200);
    game = scored.payload.game;
    assert.equal(game.nextForcedCategoryId, "twos");

    rolled = await post(baseUrl, `/api/games/${code}/roll`, {
      playerToken,
      version: game.version,
      dice: [6, 6, 6, 6, 6]
    });
    assert.equal(rolled.response.status, 200);
    game = rolled.payload.game;
    assert.equal(game.scorePreview.twos, 0);
    assert.equal(game.scorePreview.yatzy, 50);

    scored = await post(baseUrl, `/api/games/${code}/score`, {
      playerToken,
      version: game.version,
      categoryId: "yatzy"
    });
    assert.equal(scored.response.status, 200);
    game = scored.payload.game;
    assert.equal(game.players[0].scores.yatzy, 50);
    assert.equal(game.players[0].scores.twos, null);
    assert.equal(game.nextForcedCategoryId, "threes");

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
      rolled = await post(baseUrl, `/api/games/${code}/roll`, {
        playerToken,
        version: game.version,
        dice: [1, 2, 3, 4, 5]
      });
      assert.equal(rolled.response.status, 200);
      game = rolled.payload.game;

      scored = await post(baseUrl, `/api/games/${code}/score`, {
        playerToken,
        version: game.version,
        categoryId
      });
      assert.equal(scored.response.status, 200);
      game = scored.payload.game;
    }

    assert.equal(game.nextForcedCategoryId, "twos");
    assert.equal(game.rollLimit, 5);

    for (const dice of [
      [2, 2, 1, 3, 4],
      [2, 2, 2, 3, 4],
      [2, 2, 2, 2, 4],
      [2, 2, 2, 2, 5],
      [2, 2, 2, 2, 6]
    ]) {
      rolled = await post(baseUrl, `/api/games/${code}/roll`, {
        playerToken,
        version: game.version,
        dice
      });
      assert.equal(rolled.response.status, 200);
      game = rolled.payload.game;
    }
    assert.equal(game.rollsUsed, 5);
    assert.equal(game.rollsLeft, 0);

    const extraRoll = await post(baseUrl, `/api/games/${code}/roll`, {
      playerToken,
      version: game.version,
      dice: [2, 2, 2, 2, 2]
    });
    assert.equal(extraRoll.response.status, 400);

    scored = await post(baseUrl, `/api/games/${code}/score`, {
      playerToken,
      version: game.version,
      categoryId: "twos"
    });
    assert.equal(scored.response.status, 200);
    assert.equal(scored.payload.game.status, "finished");
  } finally {
    await close();
  }
});

test("custom room rule settings affect scoring and totals", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "maxi" });
    assert.equal(created.response.status, 201);
    let { game, playerToken } = created.payload;
    const code = game.code;

    const settings = await post(baseUrl, `/api/games/${code}/settings`, {
      playerToken,
      version: game.version,
      forcedMode: false,
      ruleSettings: {
        upperBonusThreshold: 0,
        upperBonus: 35,
        yatzyScore: 120,
        fullStraightScore: 30,
        forcedYatzyAnywhere: true
      }
    });
    assert.equal(settings.response.status, 200);
    game = settings.payload.game;
    assert.equal(game.upperBonusThreshold, 0);
    assert.equal(game.upperBonus, 35);
    assert.equal(game.ruleSettings.fullStraightScore, 30);

    const started = await post(baseUrl, `/api/games/${code}/start`, {
      playerToken,
      version: game.version
    });
    assert.equal(started.response.status, 200);
    game = started.payload.game;

    let rolled = await post(baseUrl, `/api/games/${code}/roll`, {
      playerToken,
      version: game.version,
      dice: [1, 2, 3, 4, 5, 6]
    });
    assert.equal(rolled.response.status, 200);
    game = rolled.payload.game;
    assert.equal(game.scorePreview.fullStraight, 30);

    let scored = await post(baseUrl, `/api/games/${code}/score`, {
      playerToken,
      version: game.version,
      categoryId: "fullStraight"
    });
    assert.equal(scored.response.status, 200);
    game = scored.payload.game;
    assert.equal(game.players[0].scores.fullStraight, 30);
    assert.equal(game.players[0].totals.bonus, 35);

    rolled = await post(baseUrl, `/api/games/${code}/roll`, {
      playerToken,
      version: game.version,
      dice: [6, 6, 6, 6, 6, 6]
    });
    assert.equal(rolled.response.status, 200);
    game = rolled.payload.game;
    assert.equal(game.scorePreview.maxiYatzy, 120);

    scored = await post(baseUrl, `/api/games/${code}/score`, {
      playerToken,
      version: game.version,
      categoryId: "maxiYatzy"
    });
    assert.equal(scored.response.status, 200);
    assert.equal(scored.payload.game.players[0].scores.maxiYatzy, 120);
  } finally {
    await close();
  }
});

test("forced mode can disable early Yatzy placement", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    assert.equal(created.response.status, 201);
    let { game, playerToken } = created.payload;
    const code = game.code;

    const settings = await post(baseUrl, `/api/games/${code}/settings`, {
      playerToken,
      version: game.version,
      forcedMode: true,
      ruleSettings: {
        forcedYatzyAnywhere: false
      }
    });
    assert.equal(settings.response.status, 200);
    game = settings.payload.game;
    assert.equal(game.forcedMode, true);
    assert.equal(game.ruleSettings.forcedYatzyAnywhere, false);

    const started = await post(baseUrl, `/api/games/${code}/start`, {
      playerToken,
      version: game.version
    });
    assert.equal(started.response.status, 200);
    game = started.payload.game;

    const rolled = await post(baseUrl, `/api/games/${code}/roll`, {
      playerToken,
      version: game.version,
      dice: [6, 6, 6, 6, 6]
    });
    assert.equal(rolled.response.status, 200);
    game = rolled.payload.game;
    assert.equal(game.nextForcedCategoryId, "ones");
    assert.equal(game.scorePreview.ones, 0);
    assert.equal(game.scorePreview.yatzy, undefined);

    const scored = await post(baseUrl, `/api/games/${code}/score`, {
      playerToken,
      version: game.version,
      categoryId: "yatzy"
    });
    assert.equal(scored.response.status, 400);
  } finally {
    await close();
  }
});

test("leaving during your turn marks you inactive and advances to the next active player", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    let { game, playerToken: taraToken, seatId: taraSeatId } = created.payload;
    const code = game.code;

    const joined = await post(baseUrl, `/api/games/${code}/join`, { name: "Liv" });
    assert.equal(joined.response.status, 200);
    const livToken = joined.payload.playerToken;
    const livSeatId = joined.payload.seatId;
    game = joined.payload.game;

    const started = await post(baseUrl, `/api/games/${code}/start`, {
      playerToken: taraToken,
      version: game.version
    });
    assert.equal(started.response.status, 200);
    game = started.payload.game;
    assert.equal(game.currentSeatId, taraSeatId);

    const left = await post(baseUrl, `/api/games/${code}/leave`, {
      playerToken: taraToken,
      version: game.version
    });
    assert.equal(left.response.status, 200);
    game = left.payload.game;
    assert.equal(game.players.find((player) => player.seatId === taraSeatId).isActive, false);
    assert.equal(game.currentSeatId, livSeatId);
    assert.equal(game.hostSeatId, livSeatId);

    const rolled = await post(baseUrl, `/api/games/${code}/roll`, {
      playerToken: livToken,
      version: game.version,
      dice: [1, 2, 3, 4, 5]
    });
    assert.equal(rolled.response.status, 200);
    game = rolled.payload.game;

    const rejoined = await post(baseUrl, `/api/games/${code}/join`, {
      name: "Tara",
      playerToken: taraToken
    });
    assert.equal(rejoined.response.status, 200);
    game = rejoined.payload.game;
    assert.equal(game.players.find((player) => player.seatId === taraSeatId).isActive, true);
    assert.equal(game.currentSeatId, livSeatId);
  } finally {
    await close();
  }
});

test("host can transfer host, skip a turn, and remove a player", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    let { game, playerToken: taraToken, seatId: taraSeatId } = created.payload;
    const code = game.code;

    const joined = await post(baseUrl, `/api/games/${code}/join`, { name: "Liv" });
    const livToken = joined.payload.playerToken;
    const livSeatId = joined.payload.seatId;
    game = joined.payload.game;

    const transferred = await post(baseUrl, `/api/games/${code}/transfer`, {
      playerToken: taraToken,
      version: game.version,
      seatId: livSeatId
    });
    assert.equal(transferred.response.status, 200);
    game = transferred.payload.game;
    assert.equal(game.hostSeatId, livSeatId);

    const started = await post(baseUrl, `/api/games/${code}/start`, {
      playerToken: livToken,
      version: game.version
    });
    assert.equal(started.response.status, 200);
    game = started.payload.game;
    assert.equal(game.currentSeatId, taraSeatId);

    const skipped = await post(baseUrl, `/api/games/${code}/skip`, {
      playerToken: livToken,
      version: game.version
    });
    assert.equal(skipped.response.status, 200);
    game = skipped.payload.game;
    assert.equal(game.currentSeatId, livSeatId);

    const removed = await post(baseUrl, `/api/games/${code}/remove`, {
      playerToken: livToken,
      version: game.version,
      seatId: taraSeatId
    });
    assert.equal(removed.response.status, 200);
    game = removed.payload.game;
    assert.equal(game.players.find((player) => player.seatId === taraSeatId).isActive, false);
    assert.equal(game.currentSeatId, livSeatId);
  } finally {
    await close();
  }
});

test("last score can be undone until the next turn starts", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "maxi" });
    let { game, playerToken } = created.payload;
    const code = game.code;

    const started = await post(baseUrl, `/api/games/${code}/start`, {
      playerToken,
      version: game.version
    });
    game = started.payload.game;

    const rolled = await post(baseUrl, `/api/games/${code}/roll`, {
      playerToken,
      version: game.version,
      dice: [1, 1, 2, 3, 4, 5]
    });
    game = rolled.payload.game;

    const scored = await post(baseUrl, `/api/games/${code}/score`, {
      playerToken,
      version: game.version,
      categoryId: "ones"
    });
    assert.equal(scored.response.status, 200);
    game = scored.payload.game;
    assert.equal(game.players[0].scores.ones, 2);
    assert.equal(game.players[0].savedRolls, 2);
    assert.equal(game.lastScoreUndo.categoryId, "ones");

    const undone = await post(baseUrl, `/api/games/${code}/undo`, {
      playerToken,
      version: game.version
    });
    assert.equal(undone.response.status, 200);
    game = undone.payload.game;
    assert.equal(game.players[0].scores.ones, null);
    assert.equal(game.players[0].savedRolls, 0);
    assert.deepEqual(game.dice, [1, 1, 2, 3, 4, 5]);
    assert.equal(game.rollsUsed, 1);
    assert.equal(game.currentSeatId, game.players[0].seatId);
    assert.equal(game.lastScoreUndo, null);

    const rescored = await post(baseUrl, `/api/games/${code}/score`, {
      playerToken,
      version: game.version,
      categoryId: "ones"
    });
    assert.equal(rescored.response.status, 200);
    game = rescored.payload.game;

    const nextRoll = await post(baseUrl, `/api/games/${code}/roll`, {
      playerToken,
      version: game.version,
      dice: [2, 2, 3, 4, 5, 6]
    });
    assert.equal(nextRoll.response.status, 200);
    game = nextRoll.payload.game;
    assert.equal(game.lastScoreUndo, null);

    const tooLate = await post(baseUrl, `/api/games/${code}/undo`, {
      playerToken,
      version: game.version
    });
    assert.equal(tooLate.response.status, 400);
  } finally {
    await close();
  }
});

test("host cannot undo another player's last score", async () => {
  const baseUrl = await listen();
  try {
    const created = await post(baseUrl, "/api/games", { name: "Tara", mode: "normal" });
    let { game, playerToken: taraToken } = created.payload;
    const code = game.code;

    const joined = await post(baseUrl, `/api/games/${code}/join`, { name: "Liv" });
    const livToken = joined.payload.playerToken;
    game = joined.payload.game;

    const started = await post(baseUrl, `/api/games/${code}/start`, {
      playerToken: taraToken,
      version: game.version
    });
    assert.equal(started.response.status, 200);
    game = started.payload.game;

    const taraRolled = await post(baseUrl, `/api/games/${code}/roll`, {
      playerToken: taraToken,
      version: game.version,
      dice: [1, 1, 2, 3, 4]
    });
    assert.equal(taraRolled.response.status, 200);
    game = taraRolled.payload.game;

    const taraScored = await post(baseUrl, `/api/games/${code}/score`, {
      playerToken: taraToken,
      version: game.version,
      categoryId: "ones"
    });
    assert.equal(taraScored.response.status, 200);
    game = taraScored.payload.game;

    const livRolled = await post(baseUrl, `/api/games/${code}/roll`, {
      playerToken: livToken,
      version: game.version,
      dice: [2, 2, 3, 4, 5]
    });
    assert.equal(livRolled.response.status, 200);
    game = livRolled.payload.game;

    const livScored = await post(baseUrl, `/api/games/${code}/score`, {
      playerToken: livToken,
      version: game.version,
      categoryId: "twos"
    });
    assert.equal(livScored.response.status, 200);
    game = livScored.payload.game;
    assert.equal(game.players[1].scores.twos, 4);
    assert.equal(game.lastScoreUndo.playerSeatId, game.players[1].seatId);

    const hostUndo = await post(baseUrl, `/api/games/${code}/undo`, {
      playerToken: taraToken,
      version: game.version
    });
    assert.equal(hostUndo.response.status, 403);

    const unchanged = await get(baseUrl, `/api/games/${code}`);
    assert.equal(unchanged.response.status, 200);
    game = unchanged.payload.game;
    assert.equal(game.players[1].scores.twos, 4);
    assert.equal(game.lastScoreUndo.categoryId, "twos");

    const livUndo = await post(baseUrl, `/api/games/${code}/undo`, {
      playerToken: livToken,
      version: game.version
    });
    assert.equal(livUndo.response.status, 200);
    game = livUndo.payload.game;
    assert.equal(game.players[1].scores.twos, null);
  } finally {
    await close();
  }
});
