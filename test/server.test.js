const test = require("node:test");
const assert = require("node:assert/strict");
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

test("accepts visual dice results but protects held dice", async () => {
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
    game = rolled.payload.game;

    const held = await post(baseUrl, `/api/games/${game.code}/hold`, {
      playerToken,
      version: game.version,
      index: 0
    });
    assert.equal(held.response.status, 200);
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
