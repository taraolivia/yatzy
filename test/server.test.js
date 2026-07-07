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
