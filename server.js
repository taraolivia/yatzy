const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const {
  createEmptyScores,
  defaultRuleSettings,
  getRules,
  normalizeRuleSettings,
  scoreCategory,
  scorePreview,
  yatzyCategory,
  isYatzyCategory,
  nextOpenCategory,
  isForcedYatzyRound,
  upperBonusThreshold,
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
  ".webp": "image/webp",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

const games = loadGames();
const streams = new Map();
const ROLL_START_DELAY_MS = 60;
const ROLL_RECOVERY_TIMEOUT_MS = 30_000;
const CHAT_MAX_LENGTH = 160;
const CHAT_EMOJI_SHORTCUTS = {
  cry: "😢",
  sob: "😭",
  lol: "😂",
  laugh: "😂",
  smile: "🙂",
  happy: "😄",
  grin: "😀",
  wink: "😉",
  heart: "❤️",
  love: "❤️",
  fire: "🔥",
  clap: "👏",
  party: "🥳",
  tada: "🎉",
  dice: "🎲",
  yatzy: "🎲",
  yes: "✅",
  no: "❌",
  ok: "👌",
  thumbsup: "👍",
  thumbs: "👍",
  "+1": "👍",
  "-1": "👎",
  thanks: "🙏",
  eyes: "👀",
  thinking: "🤔",
  wow: "😮",
  oops: "😬",
  cool: "😎",
  gg: "🤝",
  lucky: "🍀",
  star: "⭐",
};

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
  const tempFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
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
  const expanded = expandChatEmojiShortcuts(message).trim().replace(/\s+/g, " ");
  return Array.from(expanded).slice(0, CHAT_MAX_LENGTH).join("");
}

function cleanChatKind(kind) {
  return kind === "quote" ? "quote" : "message";
}

function expandChatEmojiShortcuts(message) {
  return String(message || "").replace(/(^|[^\w&])(:[+\-\w]+:?)(?=$|[^\w])/g, (match, prefix, shortcode) => {
    const key = shortcode.slice(1, shortcode.endsWith(":") ? -1 : undefined).toLowerCase();
    const emoji = CHAT_EMOJI_SHORTCUTS[key];
    return emoji ? `${prefix}${emoji}` : match;
  });
}

function cleanForcedMode(value) {
  return value === true;
}

function ruleSettingsFor(game, forcedMode = Boolean(game.forcedMode)) {
  return normalizeRuleSettings(game.mode, game.ruleSettings, { forcedMode });
}

function ruleSettingsAreEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
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
    forcedDeferredCategoryId: null,
    leftAt: null,
    joinedAt: new Date().toISOString()
  };
}

function addLog(game, message, details = {}) {
  game.log.unshift({
    id: crypto.randomUUID(),
    message,
    at: new Date().toISOString(),
    ...details
  });
  game.log = game.log.slice(0, 48);
}

function createGame({ mode, name }) {
  const rules = getRules(mode);
  const player = createPlayer(name);
  player.scores = createEmptyScores(rules.id);

  const game = {
    code: createCode(),
    mode: rules.id,
    forcedMode: false,
    ruleSettings: defaultRuleSettings(rules.id, false),
    status: "lobby",
    version: 1,
    hostSeatId: player.seatId,
    players: [player],
    currentSeatId: null,
    turnIndex: 0,
    dice: [],
    held: Array.from({ length: rules.diceCount }, () => false),
    rollsUsed: 0,
    activeRoll: null,
    lastScoreUndo: null,
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
  const forcedMode = Boolean(game.forcedMode);
  const ruleSettings = ruleSettingsFor(game, forcedMode);
  const rollLimit = currentPlayer ? turnBaseRolls(game, currentPlayer, rules) : rules.baseRolls;
  const nextForcedCategory = forcedMode && currentPlayer ? nextForcedCategoryForPlayer(game, currentPlayer) : null;
  let preview = currentScores ? scorePreview(game.mode, currentScores, game.dice, ruleSettings) : {};
  const scoreReadyRolls = 1;
  const extraRollsUsed = Math.max(0, game.rollsUsed - rollLimit);
  if (forcedMode && currentPlayer) {
    const forcedPreview = {};
    if (nextForcedCategory && Object.prototype.hasOwnProperty.call(preview, nextForcedCategory.id)) {
      forcedPreview[nextForcedCategory.id] = preview[nextForcedCategory.id];
    }
    const earlyYatzy = earlyYatzyCategory(game, currentPlayer, nextForcedCategory);
    if (earlyYatzy && Object.prototype.hasOwnProperty.call(preview, earlyYatzy.id)) {
      forcedPreview[earlyYatzy.id] = preview[earlyYatzy.id];
    }
    preview = forcedPreview;
  }

  return {
    code: game.code,
    mode: game.mode,
    modeName: rules.name,
    forcedMode,
    ruleSettings,
    rulePresets: {
      normal: defaultRuleSettings(game.mode, false),
      forced: defaultRuleSettings(game.mode, true)
    },
    nextForcedCategoryId: nextForcedCategory?.id || null,
    status: game.status,
    version: game.version,
    hostSeatId: game.hostSeatId,
    currentSeatId: game.currentSeatId,
    turnIndex: game.turnIndex,
    dice: game.dice,
    held: game.held,
    rollsUsed: game.rollsUsed,
    activeRoll: game.activeRoll || null,
    lastScoreUndo: publicLastScoreUndo(game),
    scoreReadyRolls,
    baseRolls: rollLimit,
    rollLimit,
    rollsLeft: Math.max(0, rollLimit - game.rollsUsed),
    extraRollsUsed,
    canSaveRolls: rules.canSaveRolls,
    canUseSavedRoll: currentPlayer ? canSpendSavedRoll(game, currentPlayer, rules) : false,
    upperBonusThreshold: upperBonusThreshold(game.mode, forcedMode, ruleSettings),
    upperBonus: ruleSettings.upperBonus,
    categories: rules.categories,
    scorePreview: preview,
    activePlayerCount: game.players.filter(isPlayerActive).length,
    players: game.players.map((player) => ({
      seatId: player.seatId,
      name: player.name,
      savedRolls: player.savedRolls,
      isHost: player.seatId === game.hostSeatId,
      isActive: isPlayerActive(player),
      leftAt: player.leftAt || null,
      scores: player.scores,
      totals: calculateTotals(game.mode, player.scores, { forcedMode, ruleSettings })
    })),
    winners: winnersFor(game),
    log: game.log,
    chat: game.chat || [],
    updatedAt: game.updatedAt
  };
}

function publicLastScoreUndo(game) {
  const undo = game.lastScoreUndo;
  if (!undo) return null;
  return {
    id: undo.id,
    playerSeatId: undo.playerSeatId,
    playerName: undo.playerName,
    categoryId: undo.categoryId,
    categoryLabel: undo.categoryLabel,
    points: undo.points
  };
}

function winnersFor(game) {
  if (game.status !== "finished") return [];
  const ruleSettings = ruleSettingsFor(game);
  const eligiblePlayers = game.players.filter(isPlayerActive);
  if (!eligiblePlayers.length) return [];
  const totals = eligiblePlayers.map((player) => ({
    seatId: player.seatId,
    name: player.name,
    total: calculateTotals(game.mode, player.scores, { forcedMode: Boolean(game.forcedMode), ruleSettings }).total
  }));
  const top = Math.max(...totals.map((player) => player.total));
  return totals.filter((player) => player.total === top);
}

function getPlayerByToken(game, token) {
  if (typeof token !== "string") return null;
  return game.players.find((player) => player.token === token) || null;
}

function isPlayerActive(player) {
  return !player.leftAt;
}

function requireActiveMember(player) {
  if (!isPlayerActive(player)) throw httpError(403, "Du har forlatt spillet. Bli med igjen for \u00e5 fortsette.");
}

function isHost(game, player) {
  return player.seatId === game.hostSeatId;
}

function requireHost(game, player) {
  if (!isHost(game, player)) throw httpError(403, "Bare host kan gj\u00f8re dette.");
}

function activePlayers(game) {
  return game.players.filter(isPlayerActive);
}

function activeIncompletePlayers(game) {
  return game.players.filter((player) => isPlayerActive(player) && !isScorecardComplete(game.mode, player.scores));
}

function playerIndexBySeat(game, seatId) {
  return game.players.findIndex((player) => player.seatId === seatId);
}

function assignHostIfNeeded(game) {
  if (game.hostSeatId && game.players.some((player) => player.seatId === game.hostSeatId && isPlayerActive(player))) return;
  const nextHost = activePlayers(game)[0] || null;
  game.hostSeatId = nextHost?.seatId || null;
}

function resetTurnState(game, rules = getRules(game.mode)) {
  game.dice = [];
  game.held = Array.from({ length: rules.diceCount }, () => false);
  game.rollsUsed = 0;
  game.activeRoll = null;
}

function setTurnIndex(game, index) {
  game.turnIndex = index;
  game.currentSeatId = index >= 0 && game.players[index] ? game.players[index].seatId : null;
}

function clearLastScoreUndo(game) {
  game.lastScoreUndo = null;
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

function touchChat(game) {
  // Chat is live room metadata and must not stale gameplay actions.
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
  requireActiveMember(player);
  if (!game.players.some((entry) => entry.seatId === player.seatId)) throw httpError(403, "Du er ikke med i rommet.");
  const firstPlayerIndex = findNextPlayerIndex(game, -1);
  if (firstPlayerIndex === -1) throw httpError(400, "Ingen aktive spillere er klare.");
  game.status = "playing";
  setTurnIndex(game, firstPlayerIndex);
  resetTurnState(game);
  clearLastScoreUndo(game);
  addLog(game, `${player.name} startet spillet.`);
  touch(game);
}

function updateGameSettings(game, player, version, settings) {
  assertVersion(game, version);
  if (game.status !== "lobby") throw httpError(400, "Innstillingene kan bare endres før spillet starter.");
  requireActiveMember(player);
  if (!game.players.some((entry) => entry.seatId === player.seatId)) throw httpError(403, "Du er ikke med i rommet.");

  const forcedMode = Object.prototype.hasOwnProperty.call(settings, "forcedMode")
    ? cleanForcedMode(settings.forcedMode)
    : Boolean(game.forcedMode);
  const forcedModeChanged = Boolean(game.forcedMode) !== forcedMode;
  const hasIncomingRuleSettings = settings.ruleSettings && typeof settings.ruleSettings === "object";
  const ruleSource = hasIncomingRuleSettings
    ? settings.ruleSettings
    : forcedModeChanged
      ? defaultRuleSettings(game.mode, forcedMode)
      : game.ruleSettings;
  const nextRuleSettings = normalizeRuleSettings(game.mode, ruleSource, { forcedMode });
  const currentRuleSettings = ruleSettingsFor(game, forcedMode);

  if (!forcedModeChanged && ruleSettingsAreEqual(currentRuleSettings, nextRuleSettings)) return;

  game.forcedMode = forcedMode;
  game.ruleSettings = nextRuleSettings;
  if (forcedModeChanged) {
    addLog(game, `${player.name} slo ${forcedMode ? "på" : "av"} tvungen modus.`);
  } else {
    addLog(game, `${player.name} oppdaterte reglene.`);
  }
  touch(game);
}

function restartGame(game, player, version) {
  assertVersion(game, version);
  requireActiveMember(player);
  if (!game.players.some((entry) => entry.seatId === player.seatId)) throw httpError(403, "Du er ikke med i rommet.");
  if (game.status !== "finished") throw httpError(400, "Arket er ikke ferdig ennå.");

  const rules = getRules(game.mode);
  for (const entry of game.players) {
    entry.scores = createEmptyScores(game.mode);
    entry.savedRolls = 0;
    entry.forcedDeferredCategoryId = null;
  }

  game.status = "playing";
  setTurnIndex(game, findNextPlayerIndex(game, -1));
  resetTurnState(game, rules);
  clearLastScoreUndo(game);
  game.log = [];
  addLog(game, `${player.name} startet et nytt ark.`);
  touch(game);
}

function requireActiveTurn(game, player) {
  if (game.status !== "playing") throw httpError(400, "Spillet er ikke i gang.");
  requireActiveMember(player);
  if (game.currentSeatId !== player.seatId) throw httpError(403, "Det er ikke din tur.");
}

function nextForcedCategoryForPlayer(game, player) {
  return nextOpenCategory(game.mode, player.scores, player.forcedDeferredCategoryId);
}

function turnBaseRolls(game, player, rules = getRules(game.mode)) {
  if (game.forcedMode && isForcedYatzyRound(game.mode, player.scores, player.forcedDeferredCategoryId)) {
    return 5;
  }
  return rules.baseRolls;
}

function canSpendSavedRoll(game, player, rules = getRules(game.mode)) {
  return rules.canSaveRolls && player.savedRolls > 0 && game.rollsUsed >= turnBaseRolls(game, player, rules);
}

function earlyYatzyCategory(game, player, nextCategory = nextForcedCategoryForPlayer(game, player)) {
  if (!game.forcedMode || !nextCategory || isYatzyCategory(game.mode, nextCategory.id)) return null;
  const ruleSettings = ruleSettingsFor(game);
  if (!ruleSettings.forcedYatzyAnywhere) return null;

  const yatzy = yatzyCategory(game.mode);
  if (!yatzy || player.scores[yatzy.id] !== null) return null;
  return scoreCategory(game.mode, yatzy.id, game.dice, ruleSettings) > 0 ? yatzy : null;
}

function activeRollAge(activeRoll) {
  const startedAt = new Date(activeRoll?.startedAt).getTime();
  if (!Number.isFinite(startedAt)) return 0;
  return Date.now() - startedAt;
}

function commitActiveRoll(game, activeRoll = game.activeRoll) {
  if (!activeRoll || game.activeRoll?.id !== activeRoll.id) return false;
  const player = game.players.find((entry) => entry.seatId === activeRoll.seatId);
  if (!player) throw httpError(409, "Spilleren som kastet finnes ikke lenger.");

  game.activeRoll = null;
  try {
    rollDice(game, player, game.version, activeRoll.dice, activeRoll.useSavedRoll);
  } catch (error) {
    game.activeRoll = activeRoll;
    throw error;
  }
  return true;
}

function commitExpiredActiveRoll(game) {
  if (!game.activeRoll) return false;
  if (activeRollAge(game.activeRoll) <= ROLL_RECOVERY_TIMEOUT_MS) return false;
  return commitActiveRoll(game, game.activeRoll);
}

function rollDice(game, player, version, dice = null, useSavedRoll = false) {
  assertVersion(game, version);
  requireActiveTurn(game, player);

  const rules = getRules(game.mode);
  const rollLimit = turnBaseRolls(game, player, rules);
  const baseRollAvailable = game.rollsUsed < rollLimit;
  const spendsSavedRoll = Boolean(useSavedRoll);

  if (spendsSavedRoll) {
    if (!rules.canSaveRolls) throw httpError(400, "Denne varianten har ikke ekstra kast.");
    if (baseRollAvailable) throw httpError(400, "Bruk de vanlige kastene f\u00f8rst.");
    if (!canSpendSavedRoll(game, player, rules)) throw httpError(400, "Du har ingen sjetonger igjen.");
  } else if (!baseRollAvailable) {
    const message = rules.canSaveRolls ? "Bruk en sjetong for ekstra kast." : "Du har ikke flere kast igjen.";
    throw httpError(400, message);
  }

  clearLastScoreUndo(game);
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

  if (spendsSavedRoll) {
    player.savedRolls -= 1;
  }

  const rolledDice = nextDice.filter((value, index) => firstRoll || !game.held[index]);
  const keptDice = nextDice.filter((value, index) => !firstRoll && game.held[index]);
  game.dice = nextDice;
  game.rollsUsed += 1;
  addLog(
    game,
    spendsSavedRoll ? `${player.name} brukte en sjetong og kastet.` : `${player.name} kastet.`,
    {
      type: "roll",
      playerName: player.name,
      rollNumber: game.rollsUsed,
      dice: [...nextDice],
      rolledDice,
      keptDice,
      usedSavedRoll: spendsSavedRoll
    }
  );
  touch(game);
}

function beginSynchronizedRoll(game, player, version, useSavedRoll = false) {
  assertVersion(game, version);
  requireActiveTurn(game, player);

  if (game.activeRoll) {
    throw httpError(409, "Et terningkast er allerede i gang.");
  }

  const rules = getRules(game.mode);
  const rollLimit = turnBaseRolls(game, player, rules);
  const baseRollAvailable = game.rollsUsed < rollLimit;
  const spendsSavedRoll = Boolean(useSavedRoll);
  if (spendsSavedRoll) {
    if (!rules.canSaveRolls) throw httpError(400, "Denne varianten har ikke ekstra kast.");
    if (baseRollAvailable) throw httpError(400, "Bruk de vanlige kastene f\u00f8rst.");
    if (!canSpendSavedRoll(game, player, rules)) throw httpError(400, "Du har ingen sjetonger igjen.");
  } else if (!baseRollAvailable) {
    const message = rules.canSaveRolls ? "Bruk en sjetong for ekstra kast." : "Du har ikke flere kast igjen.";
    throw httpError(400, message);
  }

  clearLastScoreUndo(game);
  const firstRoll = game.dice.length === 0;
  const diceIndexes = Array.from(
    { length: rules.diceCount },
    (_, index) => index
  ).filter((index) => firstRoll || !game.held[index]);
  const values = diceIndexes.map(() => crypto.randomInt(1, 7));
  const dice = firstRoll
    ? Array.from({ length: rules.diceCount }, () => 0)
    : [...game.dice];
  diceIndexes.forEach((index, valueIndex) => {
    dice[index] = values[valueIndex];
  });

  if (!diceIndexes.length || dice.some((value) => !Number.isInteger(value) || value < 1 || value > 6)) {
    throw httpError(400, "Kunne ikke planlegge terningkastet.");
  }

  const startedAt = Date.now();
  game.activeRoll = {
    id: crypto.randomUUID(),
    seatId: player.seatId,
    held: [...game.held],
    diceIndexes,
    values,
    dice,
    useSavedRoll: spendsSavedRoll,
    startedAt: new Date(startedAt).toISOString(),
    startsAt: startedAt + ROLL_START_DELAY_MS
  };
  touch(game);
}

function completeSynchronizedRoll(game, player, rollId) {
  const activeRoll = game.activeRoll;
  if (!activeRoll || activeRoll.id !== rollId) throw httpError(409, "Kastet finnes ikke lenger.");
  if (activeRoll.seatId !== player.seatId) throw httpError(403, "Bare spilleren som kastet kan fullf\u00f8re kastet.");
  commitActiveRoll(game, activeRoll);
}

function cancelSynchronizedRoll(game, player, rollId) {
  const activeRoll = game.activeRoll;
  if (!activeRoll || activeRoll.id !== rollId) return;
  if (activeRoll.seatId !== player.seatId) throw httpError(403, "Bare spilleren som kastet kan avbryte kastet.");
  commitActiveRoll(game, activeRoll);
}

function toggleHold(game, player, version, index) {
  assertVersion(game, version);
  requireActiveTurn(game, player);
  if (game.activeRoll) throw httpError(409, "Vent til terningkastet er ferdig.");
  const rules = getRules(game.mode);
  if (!Number.isInteger(index) || index < 0 || index >= rules.diceCount) throw httpError(400, "Ugyldig terning.");
  if (game.rollsUsed === 0) throw httpError(400, "Kast f\u00f8rst, s\u00e5 kan du holde terninger.");
  clearLastScoreUndo(game);
  game.held[index] = !game.held[index];
  addLog(
    game,
    `${player.name} ${game.held[index] ? "sparte" : "slapp"} ${game.dice[index]}.`,
    {
      type: "hold",
      playerName: player.name,
      dieIndex: index,
      dieValue: game.dice[index],
      held: game.held[index],
      heldDice: game.dice.filter((value, dieIndex) => game.held[dieIndex])
    }
  );
  touch(game);
}

function scoreTurn(game, player, version, categoryId) {
  assertVersion(game, version);
  requireActiveTurn(game, player);
  if (game.activeRoll) throw httpError(409, "Vent til terningkastet er ferdig.");
  const rules = getRules(game.mode);
  const category = rules.categories.find((entry) => entry.id === categoryId);
  if (!category) throw httpError(400, "Ukjent kategori.");
  if (game.rollsUsed === 0) throw httpError(400, "Du m\u00e5 kaste minst en gang f\u00f8r du scorer.");
  if (player.scores[categoryId] !== null) throw httpError(400, "Den kategorien er allerede brukt.");
  const rollLimit = turnBaseRolls(game, player, rules);
  const nextCategory = game.forcedMode ? nextForcedCategoryForPlayer(game, player) : null;
  const earlyYatzy = game.forcedMode ? earlyYatzyCategory(game, player, nextCategory) : null;
  if (game.forcedMode) {
    if (nextCategory && nextCategory.id !== categoryId && earlyYatzy?.id !== categoryId) {
      throw httpError(400, `I tvungen modus m\u00e5 du score ${nextCategory.label}.`);
    }
  }

  const points = scoreCategory(game.mode, categoryId, game.dice, ruleSettingsFor(game));
  game.lastScoreUndo = {
    id: crypto.randomUUID(),
    playerSeatId: player.seatId,
    playerName: player.name,
    categoryId,
    categoryLabel: category.label,
    points,
    previousScore: player.scores[categoryId],
    previousSavedRolls: player.savedRolls,
    previousForcedDeferredCategoryId: player.forcedDeferredCategoryId,
    previousStatus: game.status,
    previousCurrentSeatId: game.currentSeatId,
    previousTurnIndex: game.turnIndex,
    previousDice: [...game.dice],
    previousHeld: [...game.held],
    previousRollsUsed: game.rollsUsed,
    previousLog: game.log.map((entry) => ({ ...entry }))
  };
  player.scores[categoryId] = points;
  if (earlyYatzy?.id === categoryId && nextCategory) {
    player.forcedDeferredCategoryId = nextCategory.id;
  } else if (player.forcedDeferredCategoryId === categoryId) {
    player.forcedDeferredCategoryId = null;
  }

  if (rules.canSaveRolls) {
    const unusedBaseRolls = Math.max(0, rollLimit - game.rollsUsed);
    player.savedRolls = Math.max(0, player.savedRolls + unusedBaseRolls);
  }

  addLog(
    game,
    `${player.name} skrev ${points} p\u00e5 ${category.label}.`,
    {
      type: "score",
      playerName: player.name,
      category: category.label,
      categoryId,
      points,
      dice: [...game.dice],
      rollsUsed: game.rollsUsed
    }
  );

  if (!activeIncompletePlayers(game).length && activePlayers(game).length > 0) {
    game.status = "finished";
    game.currentSeatId = null;
    resetTurnState(game, rules);
    addLog(game, "Spillet er ferdig.");
    touch(game);
    return;
  }

  const nextIndex = findNextPlayerIndex(game);
  setTurnIndex(game, nextIndex);
  resetTurnState(game, rules);
  touch(game);
}

function sendChat(game, player, message, kind = "message") {
  const cleanMessage = cleanChatMessage(message);
  if (!cleanMessage) throw httpError(400, "Skriv en melding f\u00f8rst.");
  const cleanKind = cleanChatKind(kind);
  if (!game.chat) game.chat = [];
  game.chat.push({
    id: crypto.randomUUID(),
    seatId: player.seatId,
    name: player.name,
    kind: cleanKind,
    message: cleanMessage,
    at: new Date().toISOString()
  });
  game.chat = game.chat.slice(-32);
  touchChat(game);
}

function leaveGame(game, player, version) {
  assertVersion(game, version);
  if (game.activeRoll) throw httpError(409, "Vent til terningkastet er ferdig.");

  if (game.status === "lobby") {
    const index = playerIndexBySeat(game, player.seatId);
    if (index === -1) throw httpError(403, "Du er ikke med i rommet.");
    game.players.splice(index, 1);
    assignHostIfNeeded(game);
    addLog(game, `${player.name} forlot rommet.`);
    touch(game);
    return;
  }

  requireActiveMember(player);
  clearLastScoreUndo(game);
  player.leftAt = new Date().toISOString();
  addLog(game, `${player.name} forlot spillet.`);
  assignHostIfNeeded(game);
  if (game.currentSeatId === player.seatId) advanceTurn(game, game.turnIndex);
  touch(game);
}

function transferHost(game, player, version, seatId) {
  assertVersion(game, version);
  requireActiveMember(player);
  requireHost(game, player);
  const nextHost = game.players.find((entry) => entry.seatId === seatId);
  if (!nextHost) throw httpError(404, "Fant ikke spilleren.");
  if (!isPlayerActive(nextHost)) throw httpError(400, "Spilleren har forlatt spillet.");
  if (nextHost.seatId === game.hostSeatId) return;
  game.hostSeatId = nextHost.seatId;
  addLog(game, `${nextHost.name} er host n\u00e5.`);
  touch(game);
}

function removePlayer(game, player, version, seatId) {
  assertVersion(game, version);
  requireActiveMember(player);
  requireHost(game, player);
  if (game.activeRoll) throw httpError(409, "Vent til terningkastet er ferdig.");
  if (seatId === player.seatId) throw httpError(400, "Bruk G\u00e5 ut for deg selv.");
  const targetIndex = playerIndexBySeat(game, seatId);
  if (targetIndex === -1) throw httpError(404, "Fant ikke spilleren.");
  const target = game.players[targetIndex];

  clearLastScoreUndo(game);
  if (game.status === "lobby") {
    game.players.splice(targetIndex, 1);
    assignHostIfNeeded(game);
    addLog(game, `${target.name} ble fjernet fra rommet.`);
    touch(game);
    return;
  }

  if (!isPlayerActive(target)) return;
  target.leftAt = new Date().toISOString();
  assignHostIfNeeded(game);
  addLog(game, `${target.name} ble tatt ut av spillet.`);
  if (game.currentSeatId === target.seatId) advanceTurn(game, targetIndex);
  touch(game);
}

function skipTurn(game, player, version) {
  assertVersion(game, version);
  requireActiveMember(player);
  requireHost(game, player);
  if (game.status !== "playing") throw httpError(400, "Spillet er ikke i gang.");
  if (game.activeRoll) throw httpError(409, "Vent til terningkastet er ferdig.");
  const skipped = game.players.find((entry) => entry.seatId === game.currentSeatId);
  if (!skipped) throw httpError(400, "Ingen spiller har turen akkurat n\u00e5.");
  clearLastScoreUndo(game);
  addLog(game, `${skipped.name} ble hoppet over.`);
  advanceTurn(game, playerIndexBySeat(game, skipped.seatId));
  touch(game);
}

function undoLastScore(game, player, version) {
  assertVersion(game, version);
  requireActiveMember(player);
  if (game.activeRoll) throw httpError(409, "Vent til terningkastet er ferdig.");
  const undo = game.lastScoreUndo;
  if (!undo) throw httpError(400, "Det er ingen scoring \u00e5 angre.");
  if (undo.playerSeatId !== player.seatId) {
    throw httpError(403, "Bare spilleren som scoret kan angre.");
  }
  const target = game.players.find((entry) => entry.seatId === undo.playerSeatId);
  if (!target) throw httpError(404, "Fant ikke spilleren.");

  target.scores[undo.categoryId] = undo.previousScore;
  target.savedRolls = Number(undo.previousSavedRolls) || 0;
  target.forcedDeferredCategoryId = undo.previousForcedDeferredCategoryId || null;
  game.status = undo.previousStatus;
  game.currentSeatId = undo.previousCurrentSeatId;
  game.turnIndex = undo.previousTurnIndex;
  game.dice = Array.isArray(undo.previousDice) ? [...undo.previousDice] : [];
  game.held = Array.isArray(undo.previousHeld) ? [...undo.previousHeld] : Array.from({ length: getRules(game.mode).diceCount }, () => false);
  game.rollsUsed = Number(undo.previousRollsUsed) || 0;
  game.activeRoll = null;
  game.log = Array.isArray(undo.previousLog) ? undo.previousLog.map((entry) => ({ ...entry })) : game.log;
  game.lastScoreUndo = null;
  addLog(game, `${player.name} angret scoringen p\u00e5 ${undo.categoryLabel}.`, {
    type: "undo",
    playerName: player.name,
    targetName: undo.playerName,
    category: undo.categoryLabel,
    categoryId: undo.categoryId,
    points: undo.points
  });
  touch(game);
}

function advanceTurn(game, fromIndex = game.turnIndex) {
  const rules = getRules(game.mode);
  const activeCount = activePlayers(game).length;
  const remainingCount = activeIncompletePlayers(game).length;
  if (activeCount > 0 && remainingCount === 0) {
    game.status = "finished";
    game.currentSeatId = null;
    resetTurnState(game, rules);
    addLog(game, "Spillet er ferdig.");
    return;
  }

  const nextIndex = findNextPlayerIndex(game, fromIndex);
  setTurnIndex(game, nextIndex);
  resetTurnState(game, rules);
  if (nextIndex === -1) addLog(game, "Spillet venter p\u00e5 at noen kommer tilbake.");
}

function findNextPlayerIndex(game, fromIndex = game.turnIndex) {
  const count = game.players.length;
  if (!count) return -1;
  for (let offset = 1; offset <= count; offset += 1) {
    const index = (((fromIndex + offset) % count) + count) % count;
    const player = game.players[index];
    if (isPlayerActive(player) && !isScorecardComplete(game.mode, player.scores)) return index;
  }
  return -1;
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
  if (commitExpiredActiveRoll(game)) saveAndBroadcast(game);

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
      const wasAway = !isPlayerActive(existing);
      const previousName = existing.name;
      existing.name = cleanName(body.name || existing.name);
      existing.leftAt = null;
      assignHostIfNeeded(game);
      if (game.status === "playing" && !game.currentSeatId && !isScorecardComplete(game.mode, existing.scores)) {
        setTurnIndex(game, playerIndexBySeat(game, existing.seatId));
        resetTurnState(game);
      }
      if (wasAway) {
        addLog(game, `${existing.name} kom tilbake.`);
        touch(game);
        saveAndBroadcast(game);
      } else if (existing.name !== previousName) {
        touch(game);
        saveAndBroadcast(game);
      }
      return jsonResponse(res, 200, { game: publicGame(game), playerToken: existing.token, seatId: existing.seatId });
    }

    if (game.status !== "lobby") {
      throw httpError(400, "Spillet er startet. Bare spillere som allerede er med kan komme tilbake.");
    }

    const player = createPlayer(body.name);
    player.scores = createEmptyScores(game.mode);
    game.players.push(player);
    assignHostIfNeeded(game);
    addLog(game, `${player.name} ble med i rommet.`);
    touch(game);
    saveAndBroadcast(game);
    return jsonResponse(res, 200, { game: publicGame(game), playerToken: player.token, seatId: player.seatId });
  }

  const player = getPlayerByToken(game, body.playerToken);
  if (!player) throw httpError(403, "Denne nettleseren er ikke med i rommet.");

  if (action === "start") {
    startGame(game, player, body.version);
  } else if (action === "settings") {
    updateGameSettings(game, player, body.version, body);
  } else if (action === "restart") {
    restartGame(game, player, body.version);
  } else if (action === "leave") {
    leaveGame(game, player, body.version);
  } else if (action === "transfer") {
    transferHost(game, player, body.version, body.seatId);
  } else if (action === "remove") {
    removePlayer(game, player, body.version, body.seatId);
  } else if (action === "skip") {
    skipTurn(game, player, body.version);
  } else if (action === "undo") {
    undoLastScore(game, player, body.version);
  } else if (action === "roll") {
    if (body.dice !== undefined) {
      if (process.env.ALLOW_TEST_DICE !== "true") {
        throw httpError(400, "Terningresultatet bestemmes av serveren.");
      }
      rollDice(game, player, body.version, body.dice, body.useSavedRoll === true);
    } else {
      beginSynchronizedRoll(game, player, body.version, body.useSavedRoll === true);
    }
  } else if (action === "complete") {
    completeSynchronizedRoll(game, player, body.rollId);
  } else if (action === "cancel") {
    cancelSynchronizedRoll(game, player, body.rollId);
  } else if (action === "hold") {
    toggleHold(game, player, body.version, body.index);
  } else if (action === "score") {
    scoreTurn(game, player, body.version, body.categoryId);
  } else if (action === "chat") {
    sendChat(game, player, body.message, body.kind);
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
  if (commitExpiredActiveRoll(game)) saveAndBroadcast(game);

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
