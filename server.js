const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const {
  createEmptyScores,
  getRules,
  scoreCategory,
  scorePreview,
  calculateTotals,
  isScorecardComplete
} = require("./src/rules");

const PORT = Number(process.env.PORT || 5173);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "games.json");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

const games = loadGames();
const streams = new Map();

function loadGames() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return new Map(Object.entries(parsed));
  } catch (error) {
    return new Map();
  }
}

function persistGames() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const payload = JSON.stringify(Object.fromEntries(games), null, 2);
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, payload);
  fs.renameSync(tempFile, DATA_FILE);
}

function jsonResponse(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function textResponse(res, status, message) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function cleanName(name) {
  const fallback = "Spiller";
  if (typeof name !== "string") return fallback;
  const trimmed = name.trim().replace(/\s+/g, " ");
  return trimmed.slice(0, 28) || fallback;
}

function cleanChatMessage(message) {
  if (typeof message !== "string") return "";
  return message.trim().replace(/\s+/g, " ").slice(0, 160);
}

function createCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 5 }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
  } while (games.has(code));
  return code;
}

function createPlayer(name) {
  return {
    seatId: crypto.randomUUID(),
    token: crypto.randomUUID(),
    name: cleanName(name),
    scores: null,
    savedRolls: 0,
    joinedAt: new Date().toISOString()
  };
}

function addLog(game, message) {
  game.log.unshift({
    id: crypto.randomUUID(),
    message,
    at: new Date().toISOString()
  });
  game.log = game.log.slice(0, 16);
}

function createGame({ mode, name }) {
  const rules = getRules(mode);
  const player = createPlayer(name);
  player.scores = createEmptyScores(rules.id);

  const game = {
    code: createCode(),
    mode: rules.id,
    status: "lobby",
    version: 1,
    hostSeatId: player.seatId,
    players: [player],
    currentSeatId: null,
    turnIndex: 0,
    dice: [],
    held: Array.from({ length: rules.diceCount }, () => false),
    rollsUsed: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    log: [],
    chat: []
  };

  addLog(game, `${player.name} opprettet rommet.`);
  games.set(game.code, game);
  persistGames();
  return { game, player };
}

function publicGame(game) {
  const rules = getRules(game.mode);
  const currentPlayer = game.players.find((player) => player.seatId === game.currentSeatId) || null;
  const currentScores = currentPlayer ? currentPlayer.scores : null;
  const rollLimit = currentPlayer ? rules.baseRolls + (rules.canSaveRolls ? currentPlayer.savedRolls : 0) : rules.baseRolls;
  const preview = currentScores ? scorePreview(game.mode, currentScores, game.dice) : {};
  const scoreReadyRolls = 1;

  return {
    code: game.code,
    mode: game.mode,
    modeName: rules.name,
    status: game.status,
    version: game.version,
    hostSeatId: game.hostSeatId,
    currentSeatId: game.currentSeatId,
    turnIndex: game.turnIndex,
    dice: game.dice,
    held: game.held,
    rollsUsed: game.rollsUsed,
    scoreReadyRolls,
    rollLimit,
    rollsLeft: Math.max(0, rollLimit - game.rollsUsed),
    canSaveRolls: rules.canSaveRolls,
    upperBonusThreshold: rules.upperBonusThreshold,
    upperBonus: rules.upperBonus,
    categories: rules.categories,
    scorePreview: preview,
    players: game.players.map((player) => ({
      seatId: player.seatId,
      name: player.name,
      savedRolls: player.savedRolls,
      isHost: player.seatId === game.hostSeatId,
      scores: player.scores,
      totals: calculateTotals(game.mode, player.scores)
    })),
    winners: winnersFor(game),
    log: game.log,
    chat: game.chat || [],
    updatedAt: game.updatedAt
  };
}

function winnersFor(game) {
  if (game.status !== "finished") return [];
  const totals = game.players.map((player) => ({
    seatId: player.seatId,
    name: player.name,
    total: calculateTotals(game.mode, player.scores).total
  }));
  const top = Math.max(...totals.map((player) => player.total));
  return totals.filter((player) => player.total === top);
}

function getPlayerByToken(game, token) {
  if (typeof token !== "string") return null;
  return game.players.find((player) => player.token === token) || null;
}

function assertVersion(game, version) {
  if (version !== game.version) {
    throw httpError(409, "Rommet har oppdatert seg. Prov igjen.");
  }
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function touch(game) {
  game.version += 1;
  game.updatedAt = new Date().toISOString();
}

function broadcast(game) {
  const clients = streams.get(game.code);
  if (!clients) return;
  const event = `event: state\ndata: ${JSON.stringify(publicGame(game))}\n\n`;
  for (const res of clients) {
    res.write(event);
  }
}

function saveAndBroadcast(game) {
  persistGames();
  broadcast(game);
}

function startGame(game, player, version) {
  assertVersion(game, version);
  if (game.status !== "lobby") throw httpError(400, "Spillet er allerede startet.");
  if (!game.players.some((entry) => entry.seatId === player.seatId)) throw httpError(403, "Du er ikke med i rommet.");
  game.status = "playing";
  game.turnIndex = 0;
  game.currentSeatId = game.players[0].seatId;
  game.dice = [];
  game.held = Array.from({ length: getRules(game.mode).diceCount }, () => false);
  game.rollsUsed = 0;
  addLog(game, `${player.name} startet spillet.`);
  touch(game);
}

function restartGame(game, player, version) {
  assertVersion(game, version);
  if (!game.players.some((entry) => entry.seatId === player.seatId)) throw httpError(403, "Du er ikke med i rommet.");
  if (game.status !== "finished") throw httpError(400, "Arket er ikke ferdig ennå.");

  const rules = getRules(game.mode);
  for (const entry of game.players) {
    entry.scores = createEmptyScores(game.mode);
    entry.savedRolls = 0;
  }

  game.status = "playing";
  game.turnIndex = 0;
  game.currentSeatId = game.players[0]?.seatId || null;
  game.dice = [];
  game.held = Array.from({ length: rules.diceCount }, () => false);
  game.rollsUsed = 0;
  game.log = [];
  addLog(game, `${player.name} startet et nytt ark.`);
  touch(game);
}

function requireActiveTurn(game, player) {
  if (game.status !== "playing") throw httpError(400, "Spillet er ikke i gang.");
  if (game.currentSeatId !== player.seatId) throw httpError(403, "Det er ikke din tur.");
}

function rollDice(game, player, version, dice = null) {
  assertVersion(game, version);
  requireActiveTurn(game, player);

  const rules = getRules(game.mode);
  const rollLimit = rules.baseRolls + (rules.canSaveRolls ? player.savedRolls : 0);
  if (game.rollsUsed >= rollLimit) throw httpError(400, "Du har ikke flere kast igjen.");

  const firstRoll = game.dice.length === 0;
  const nextDice = firstRoll ? Array.from({ length: rules.diceCount }, () => 0) : [...game.dice];

  if (dice !== null) {
    if (!Array.isArray(dice) || dice.length !== rules.diceCount) throw httpError(400, "Ugyldige terninger.");
    for (let index = 0; index < rules.diceCount; index += 1) {
      const value = dice[index];
      if (!Number.isInteger(value) || value < 1 || value > 6) throw httpError(400, "Ugyldige terninger.");
      if (!firstRoll && game.held[index] && value !== game.dice[index]) throw httpError(400, "Holdte terninger kan ikke endres.");
      nextDice[index] = value;
    }
  } else {
    for (let index = 0; index < rules.diceCount; index += 1) {
      if (firstRoll || !game.held[index]) {
        nextDice[index] = crypto.randomInt(1, 7);
      }
    }
  }

  game.dice = nextDice;
  game.rollsUsed += 1;
  addLog(game, `${player.name} kastet terningene.`);
  touch(game);
}

function toggleHold(game, player, version, index) {
  assertVersion(game, version);
  requireActiveTurn(game, player);
  const rules = getRules(game.mode);
  if (!Number.isInteger(index) || index < 0 || index >= rules.diceCount) throw httpError(400, "Ugyldig terning.");
  if (game.rollsUsed === 0) throw httpError(400, "Kast f\u00f8rst, s\u00e5 kan du holde terninger.");
  game.held[index] = !game.held[index];
  addLog(game, `${player.name} ${game.held[index] ? "sparte" : "slapp"} terning ${index + 1}.`);
  touch(game);
}

function scoreTurn(game, player, version, categoryId) {
  assertVersion(game, version);
  requireActiveTurn(game, player);
  const rules = getRules(game.mode);
  const category = rules.categories.find((entry) => entry.id === categoryId);
  if (!category) throw httpError(400, "Ukjent kategori.");
  if (game.rollsUsed === 0) throw httpError(400, "Du m\u00e5 kaste minst en gang f\u00f8r du scorer.");
  if (player.scores[categoryId] !== null) throw httpError(400, "Den kategorien er allerede brukt.");

  const points = scoreCategory(game.mode, categoryId, game.dice);
  player.scores[categoryId] = points;

  if (rules.canSaveRolls) {
    player.savedRolls = Math.max(0, player.savedRolls + rules.baseRolls - game.rollsUsed);
  }

  addLog(game, `${player.name} skrev ${points} p\u00e5 ${category.label}.`);

  const allComplete = game.players.every((entry) => isScorecardComplete(game.mode, entry.scores));
  if (allComplete) {
    game.status = "finished";
    game.currentSeatId = null;
    game.dice = [];
    game.held = Array.from({ length: rules.diceCount }, () => false);
    game.rollsUsed = 0;
    addLog(game, "Spillet er ferdig.");
    touch(game);
    return;
  }

  const nextIndex = findNextPlayerIndex(game);
  game.turnIndex = nextIndex;
  game.currentSeatId = game.players[nextIndex].seatId;
  game.dice = [];
  game.held = Array.from({ length: rules.diceCount }, () => false);
  game.rollsUsed = 0;
  touch(game);
}

function sendChat(game, player, message) {
  const cleanMessage = cleanChatMessage(message);
  if (!cleanMessage) throw httpError(400, "Skriv en melding f\u00f8rst.");
  if (!game.chat) game.chat = [];
  game.chat.push({
    id: crypto.randomUUID(),
    seatId: player.seatId,
    name: player.name,
    message: cleanMessage,
    at: new Date().toISOString()
  });
  game.chat = game.chat.slice(-32);
  touch(game);
}

function findNextPlayerIndex(game) {
  const count = game.players.length;
  for (let offset = 1; offset <= count; offset += 1) {
    const index = (game.turnIndex + offset) % count;
    if (!isScorecardComplete(game.mode, game.players[index].scores)) return index;
  }
  return game.turnIndex;
}

async function handleApi(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/games") {
    const body = await parseBody(req);
    const { game, player } = createGame({ mode: body.mode, name: body.name });
    return jsonResponse(res, 201, { game: publicGame(game), playerToken: player.token, seatId: player.seatId });
  }

  const match = url.pathname.match(/^\/api\/games\/([A-Z0-9]{5})(?:\/([a-z]+))?$/);
  if (!match) return jsonResponse(res, 404, { error: "Ikke funnet." });

  const code = match[1];
  const action = match[2] || "";
  const game = games.get(code);
  if (!game) return jsonResponse(res, 404, { error: "Fant ikke rommet." });

  if (req.method === "GET" && !action) {
    return jsonResponse(res, 200, { game: publicGame(game) });
  }

  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Metoden er ikke tillatt." });
  }

  const body = await parseBody(req);

  if (action === "join") {
    const existing = getPlayerByToken(game, body.playerToken);
    if (existing) {
      existing.name = cleanName(body.name || existing.name);
      addLog(game, `${existing.name} kom tilbake.`);
      touch(game);
      saveAndBroadcast(game);
      return jsonResponse(res, 200, { game: publicGame(game), playerToken: existing.token, seatId: existing.seatId });
    }

    if (game.status !== "lobby") {
      throw httpError(400, "Spillet er startet. Bare spillere som allerede er med kan komme tilbake.");
    }

    const player = createPlayer(body.name);
    player.scores = createEmptyScores(game.mode);
    game.players.push(player);
    addLog(game, `${player.name} ble med i rommet.`);
    touch(game);
    saveAndBroadcast(game);
    return jsonResponse(res, 200, { game: publicGame(game), playerToken: player.token, seatId: player.seatId });
  }

  const player = getPlayerByToken(game, body.playerToken);
  if (!player) throw httpError(403, "Denne nettleseren er ikke med i rommet.");

  if (action === "start") {
    startGame(game, player, body.version);
  } else if (action === "restart") {
    restartGame(game, player, body.version);
  } else if (action === "roll") {
    rollDice(game, player, body.version, body.dice ?? null);
  } else if (action === "hold") {
    toggleHold(game, player, body.version, body.index);
  } else if (action === "score") {
    scoreTurn(game, player, body.version, body.categoryId);
  } else if (action === "chat") {
    sendChat(game, player, body.message);
  } else {
    return jsonResponse(res, 404, { error: "Ukjent handling." });
  }

  saveAndBroadcast(game);
  return jsonResponse(res, 200, { game: publicGame(game) });
}

function handleEvents(req, res, url) {
  const match = url.pathname.match(/^\/api\/games\/([A-Z0-9]{5})\/events$/);
  if (!match) return false;
  const code = match[1];
  const game = games.get(code);
  if (!game) {
    jsonResponse(res, 404, { error: "Fant ikke rommet." });
    return true;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  res.write(`event: state\ndata: ${JSON.stringify(publicGame(game))}\n\n`);

  if (!streams.has(code)) streams.set(code, new Set());
  streams.get(code).add(res);

  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 20_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    const clients = streams.get(code);
    if (!clients) return;
    clients.delete(res);
    if (clients.size === 0) streams.delete(code);
  });
  return true;
}

function serveStatic(req, res, url) {
  const routePath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, routePath));
  if (!filePath.startsWith(PUBLIC_DIR)) return textResponse(res, 403, "Forbidden");

  fs.readFile(filePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (indexError, indexContent) => {
        if (indexError) return textResponse(res, 404, "Not found");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(indexContent);
      });
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (handleEvents(req, res, url)) return;
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return serveStatic(req, res, url);
  } catch (error) {
    const status = error.status || 500;
    const message = status === 500 ? "Noe gikk galt p\u00e5 serveren." : error.message;
    if (status === 500) console.error(error);
    return jsonResponse(res, status, { error: message });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Online Yatzy kj\u00f8rer p\u00e5 http://localhost:${PORT}`);
  });
}

module.exports = { server, publicGame };
