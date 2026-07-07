const els = {
  connection: document.querySelector("#connection"),
  setupView: document.querySelector("#setupView"),
  gameView: document.querySelector("#gameView"),
  createForm: document.querySelector("#createForm"),
  joinForm: document.querySelector("#joinForm"),
  createName: document.querySelector("#createName"),
  joinName: document.querySelector("#joinName"),
  roomCode: document.querySelector("#roomCode"),
  roomTitle: document.querySelector("#roomTitle"),
  roomCodeLabel: document.querySelector("#roomCodeLabel"),
  copyLink: document.querySelector("#copyLink"),
  leaveRoom: document.querySelector("#leaveRoom"),
  gameStatus: document.querySelector("#gameStatus"),
  playersList: document.querySelector("#playersList"),
  turnEyebrow: document.querySelector("#turnEyebrow"),
  turnTitle: document.querySelector("#turnTitle"),
  startGame: document.querySelector("#startGame"),
  diceTable: document.querySelector("#diceTable"),
  dice3dStage: document.querySelector("#dice3dStage"),
  legacyDiceRow: document.querySelector("#diceRow"),
  activeDiceRow: document.querySelector("#activeDiceRow"),
  heldDiceRow: document.querySelector("#heldDiceRow"),
  activeDiceLabel: document.querySelector("#activeDiceLabel"),
  heldDiceLabel: document.querySelector("#heldDiceLabel"),
  rollDice: document.querySelector("#rollDice"),
  rollMeta: document.querySelector("#rollMeta"),
  diceCustomizer: document.querySelector("#diceCustomizer"),
  soundToggle: document.querySelector("#soundToggle"),
  scoreTable: document.querySelector("#scoreTable"),
  gameLog: document.querySelector("#gameLog"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),
  chatList: document.querySelector("#chatList"),
  sendChat: document.querySelector("#sendChat"),
  toast: document.querySelector("#toast")
};

const state = {
  game: null,
  playerToken: null,
  seatId: null,
  events: null,
  pending: false,
  chatPending: false,
  toastTimer: null,
  isRolling: false,
  animatedDice: [],
  rollTimer: null,
  dice3d: {
    instance: null,
    ready: false,
    loading: false,
    failed: false,
    visible: false,
    initPromise: null,
    startPromise: null,
    rollPromise: null,
    settlePromise: null,
    settleResolve: null,
    rollId: 0,
    hideTimer: null
  },
  soundEnabled: loadSoundEnabled(),
  audioContext: null
};

const DICE_THEMES = new Set(["default", "wooden", "blueGreenMetal", "rock", "smooth", "smooth-pip"]);
const ROLL_ANIMATION_MS = 720;
const DICE_3D_MODULE_PATH = "/vendor/dice-box/dice-box.es.min.js";
const DICE_3D_ASSET_PATH = "/assets/";
const DICE_3D_MIN_ROLL_MS = 980;
const DICE_3D_START_TIMEOUT_MS = 8000;
const DICE_3D_ROLL_TIMEOUT_MS = 16000;
const DICE_3D_SETTLE_PAD_MS = 450;
const DICE_3D_THEME_COLORS = {
  default: "#f8f3e6",
  wooden: "#8b5e34",
  blueGreenMetal: "#4faeaa",
  rock: "#b7aca1",
  smooth: "#f8f3e6",
  "smooth-pip": "#ffffff"
};

const pipMap = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

function roomTokenKey(code) {
  return `yatzy:${code}:token`;
}

function roomSeatKey(code) {
  return `yatzy:${code}:seat`;
}

function saveIdentity(game, playerToken, seatId) {
  localStorage.setItem(roomTokenKey(game.code), playerToken);
  localStorage.setItem(roomSeatKey(game.code), seatId);
  state.playerToken = playerToken;
  state.seatId = seatId;
}

function loadIdentity(code) {
  return {
    playerToken: localStorage.getItem(roomTokenKey(code)),
    seatId: localStorage.getItem(roomSeatKey(code))
  };
}

function saveName(name) {
  localStorage.setItem("yatzy:name", name.trim());
}

function loadName() {
  return localStorage.getItem("yatzy:name") || "";
}

function saveDiceTheme(theme) {
  localStorage.setItem("yatzy:diceTheme", theme);
}

function loadDiceTheme() {
  const theme = localStorage.getItem("yatzy:diceTheme") || "default";
  return DICE_THEMES.has(theme) ? theme : "default";
}

function saveSoundEnabled(enabled) {
  localStorage.setItem("yatzy:sound", enabled ? "on" : "off");
}

function loadSoundEnabled() {
  return localStorage.getItem("yatzy:sound") !== "off";
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2600);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Noe gikk galt.");
  }
  return payload;
}

function setConnection(text) {
  els.connection.textContent = text;
}

function updateUrl(code) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", code);
  window.history.replaceState({}, "", url);
}

async function createGame(formData) {
  const name = String(formData.get("name") || "").trim();
  const mode = String(formData.get("mode") || "normal");
  saveName(name);
  const payload = await requestJson("/api/games", {
    method: "POST",
    body: JSON.stringify({ name, mode })
  });
  state.game = payload.game;
  saveIdentity(payload.game, payload.playerToken, payload.seatId);
  updateUrl(payload.game.code);
  connectEvents(payload.game.code);
  render();
}

async function joinGame(code, name, playerToken = null) {
  saveName(name);
  const payload = await requestJson(`/api/games/${code}/join`, {
    method: "POST",
    body: JSON.stringify({ name, playerToken })
  });
  state.game = payload.game;
  saveIdentity(payload.game, payload.playerToken, payload.seatId);
  updateUrl(payload.game.code);
  connectEvents(payload.game.code);
  render();
}

async function action(name, extra = {}) {
  if (!state.game || state.pending) return;
  const isRoll = name === "roll";
  const startedAt = Date.now();
  let rollDiceValues = null;
  state.pending = true;
  if (isRoll) {
    startRollAnimation();
    playRollSound();
  } else if (name === "hold") {
    playClickSound();
  }
  render();
  try {
    if (isRoll) {
      rollDiceValues = await diceValuesFromRollVisual();
    }
    const payload = await requestJson(`/api/games/${state.game.code}/${name}`, {
      method: "POST",
      body: JSON.stringify({
        playerToken: state.playerToken,
        version: state.game.version,
        ...(rollDiceValues ? { dice: rollDiceValues } : {}),
        ...extra
      })
    });
    if (isRoll) {
      await waitForRollVisual(startedAt);
      stopRollAnimation();
      state.game = payload.game;
    } else if (name === "score") {
      state.game = payload.game;
      playScoreSound();
    } else if (name === "start") {
      state.game = payload.game;
      playStartSound();
    } else {
      state.game = payload.game;
    }
  } catch (error) {
    showToast(error.message);
  } finally {
    if (isRoll && state.isRolling) stopRollAnimation();
    state.pending = false;
    render();
  }
}

async function sendChat(message) {
  if (!state.game || !state.playerToken || state.chatPending) return;
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) return;

  state.chatPending = true;
  renderChat();
  try {
    const payload = await requestJson(`/api/games/${state.game.code}/chat`, {
      method: "POST",
      body: JSON.stringify({
        playerToken: state.playerToken,
        message: cleanMessage
      })
    });
    state.game = payload.game;
    if (els.chatInput) els.chatInput.value = "";
  } catch (error) {
    showToast(error.message);
  } finally {
    state.chatPending = false;
    render();
  }
}

function connectEvents(code) {
  if (state.events) state.events.close();
  setConnection("Kobler til");
  state.events = new EventSource(`/api/games/${code}/events`);
  state.events.addEventListener("open", () => setConnection("Live"));
  state.events.addEventListener("state", (event) => {
    const nextGame = JSON.parse(event.data);
    const shouldAnimate = shouldAnimateIncomingRoll(state.game, nextGame);
    state.game = nextGame;
    setConnection("Live");
    if (shouldAnimate) void animateIncomingRoll();
    render();
  });
  state.events.addEventListener("error", () => setConnection("Kobler til igjen"));
}

function leaveRoom() {
  if (state.events) state.events.close();
  state.game = null;
  state.playerToken = null;
  state.seatId = null;
  const url = new URL(window.location.href);
  url.searchParams.delete("room");
  window.history.replaceState({}, "", url);
  render();
}

function currentPlayer() {
  if (!state.game) return null;
  return state.game.players.find((player) => player.seatId === state.game.currentSeatId) || null;
}

function me() {
  if (!state.game) return null;
  return state.game.players.find((player) => player.seatId === state.seatId) || null;
}

function isMyTurn() {
  return Boolean(state.game && state.game.status === "playing" && state.game.currentSeatId === state.seatId);
}

function diceCount() {
  if (!state.game) return 5;
  return state.game.mode === "maxi" ? 6 : 5;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

function currentDiceTheme() {
  return document.body.dataset.diceTheme || loadDiceTheme();
}

function dice3dThemeColor(theme = currentDiceTheme()) {
  return DICE_3D_THEME_COLORS[theme] || DICE_3D_THEME_COLORS.default;
}

function prepareDice3d() {
  if (!els.dice3dStage || state.dice3d.ready || state.dice3d.failed || prefersReducedMotion()) return state.dice3d.initPromise;
  if (state.dice3d.loading) return state.dice3d.initPromise;

  state.dice3d.loading = true;
  state.dice3d.initPromise = import(DICE_3D_MODULE_PATH)
    .then(({ default: DiceBox }) => {
      const diceBox = new DiceBox({
        container: "#dice3dStage",
        assetPath: DICE_3D_ASSET_PATH,
        theme: currentDiceTheme(),
        themeColor: dice3dThemeColor(),
        onRollComplete: () => markDice3dRollComplete(),
        offscreen: false,
        // Keep the library dice large enough to read on the table.
        scale: 9
      });
      state.dice3d.instance = diceBox;
      return diceBox.init();
    })
    .then(() => {
      state.dice3d.ready = true;
      syncDice3dTheme();
    })
    .catch((error) => {
      console.warn("3D dice disabled:", error);
      state.dice3d.failed = true;
      setDice3dVisible(false);
    })
    .finally(() => {
      state.dice3d.loading = false;
    });

  return state.dice3d.initPromise;
}

function canUseDice3d() {
  return Boolean(els.dice3dStage && state.dice3d.instance && state.dice3d.ready && !state.dice3d.failed && !prefersReducedMotion());
}

function setDice3dVisible(visible) {
  state.dice3d.visible = visible;
  if (els.diceTable) els.diceTable.classList.toggle("has-3d-roll", visible);
  if (visible) state.dice3d.instance?.resizeWorld?.();
}

function shouldUseDice3dVisual() {
  return Boolean(state.isRolling && els.dice3dStage && !state.dice3d.failed && !prefersReducedMotion());
}

function activeRollCount() {
  if (!state.game) return diceCount();
  const count = diceCount();
  return Array.from({ length: count }, (_, index) => !state.game.held[index]).filter(Boolean).length;
}

function dice3dRollNotation(count, theme = currentDiceTheme()) {
  return theme === "smooth-pip" ? `${count}dpip` : `${count}d6`;
}

async function startDice3dRoll() {
  const rollId = state.dice3d.rollId;
  await prepareDice3d();
  if (rollId !== state.dice3d.rollId) return false;
  if (!state.isRolling) return false;
  if (!canUseDice3d()) return false;

  const count = activeRollCount();
  if (!count) return false;

  window.clearTimeout(state.dice3d.hideTimer);
  setDice3dVisible(true);
  createDice3dSettlePromise(rollId);
  await syncDice3dTheme();
  try {
    const theme = currentDiceTheme();
    state.dice3d.rollPromise = state.dice3d.instance
      .roll(dice3dRollNotation(count, theme), { theme, themeColor: dice3dThemeColor(theme) })
      .catch((error) => {
        console.warn("3D dice roll failed:", error);
        state.dice3d.failed = true;
        setDice3dVisible(false);
        return null;
      });
  } catch (error) {
    console.warn("3D dice roll failed:", error);
    state.dice3d.failed = true;
    setDice3dVisible(false);
    return false;
  }
  return true;
}

function createDice3dSettlePromise(rollId) {
  state.dice3d.settlePromise = new Promise((resolve) => {
    state.dice3d.settleResolve = () => {
      if (rollId !== state.dice3d.rollId) return;
      state.dice3d.settleResolve = null;
      resolve(true);
    };
  });
}

function markDice3dRollComplete() {
  if (state.dice3d.settleResolve) state.dice3d.settleResolve();
}

async function syncDice3dTheme(theme = currentDiceTheme()) {
  if (!canUseDice3d()) return;
  return state.dice3d.instance.updateConfig({ theme, themeColor: dice3dThemeColor(theme) }).catch((error) => {
    console.warn("3D dice theme update failed:", error);
  });
}

async function waitForRollVisual(startedAt) {
  const rollId = state.dice3d.rollId;
  if (state.dice3d.startPromise) {
    const didStart = await Promise.race([state.dice3d.startPromise.catch(() => false), wait(DICE_3D_START_TIMEOUT_MS).then(() => false)]);
    if (!didStart) cancelDice3dRoll(rollId);
  }
  if (state.dice3d.visible && state.dice3d.rollPromise) await waitForDice3dRollToSettle();
  const duration = state.dice3d.visible ? DICE_3D_MIN_ROLL_MS : ROLL_ANIMATION_MS;
  await wait(Math.max(0, duration - (Date.now() - startedAt)));
}

async function diceValuesFromRollVisual() {
  const rollId = state.dice3d.rollId;
  if (state.dice3d.startPromise) {
    const didStart = await Promise.race([state.dice3d.startPromise.catch(() => false), wait(DICE_3D_START_TIMEOUT_MS).then(() => false)]);
    if (!didStart) {
      cancelDice3dRoll(rollId);
      return null;
    }
  }
  if (!state.dice3d.visible || !state.dice3d.rollPromise) return null;

  const results = await waitForDice3dRollToSettle();
  const values = rollResultValues(results);
  if (!values.length) return null;

  return mergeRolledValues(values);
}

async function waitForDice3dRollToSettle() {
  const rollResultsPromise = state.dice3d.rollPromise?.catch(() => null) || Promise.resolve(null);
  const visualSettlePromise = state.dice3d.settlePromise || rollResultsPromise;
  const results = await Promise.race([rollResultsPromise, wait(DICE_3D_ROLL_TIMEOUT_MS).then(() => null)]);
  await Promise.race([visualSettlePromise.catch?.(() => null) || visualSettlePromise, wait(DICE_3D_ROLL_TIMEOUT_MS)]);
  await wait(DICE_3D_SETTLE_PAD_MS);
  return results;
}

function rollResultValues(results) {
  if (!Array.isArray(results)) return [];
  return results
    .flatMap((group) => Array.isArray(group?.rolls) ? group.rolls : [group])
    .map((die) => Number(die?.value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 6);
}

function mergeRolledValues(values) {
  if (!state.game) return values;

  const count = diceCount();
  const firstRoll = state.game.dice.length === 0;
  const nextDice = firstRoll
    ? Array.from({ length: count }, () => 0)
    : state.game.dice.slice(0, count);
  let valueIndex = 0;

  for (let index = 0; index < count; index += 1) {
    if (!firstRoll && state.game.held[index]) continue;
    if (valueIndex >= values.length) return null;
    nextDice[index] = values[valueIndex];
    valueIndex += 1;
  }

  return nextDice.every((value) => Number.isInteger(value) && value >= 1 && value <= 6) ? nextDice : null;
}

function finishDice3dRoll() {
  window.clearTimeout(state.dice3d.hideTimer);
  state.dice3d.rollPromise = null;
  state.dice3d.settlePromise = null;
  state.dice3d.settleResolve = null;
}

function cancelDice3dRoll(rollId = state.dice3d.rollId) {
  if (rollId !== state.dice3d.rollId) return;
  state.dice3d.rollId += 1;
  state.dice3d.startPromise = null;
  state.dice3d.rollPromise = null;
  state.dice3d.settlePromise = null;
  state.dice3d.settleResolve = null;
  setDice3dVisible(false);
  state.dice3d.instance?.clear?.();
}

function clearDice3dStage() {
  window.clearTimeout(state.dice3d.hideTimer);
  state.dice3d.rollId += 1;
  state.dice3d.startPromise = null;
  state.dice3d.rollPromise = null;
  state.dice3d.settlePromise = null;
  state.dice3d.settleResolve = null;
  setDice3dVisible(false);
  state.dice3d.instance?.clear?.();
}

async function startRollAnimation() {
  if (!state.game) return;
  window.clearInterval(state.rollTimer);
  state.dice3d.rollId += 1;
  const count = diceCount();
  const currentDice = state.game.dice.length ? state.game.dice : Array.from({ length: count }, () => randomDie());
  state.animatedDice = currentDice.map((value, index) => (state.game.held[index] ? value : randomDie()));
  state.isRolling = true;
  renderDice();
  state.dice3d.startPromise = startDice3dRoll().then((didStart) => {
    if (state.isRolling) renderDice();
    return didStart;
  });
  state.rollTimer = window.setInterval(() => {
    state.animatedDice = state.animatedDice.map((value, index) => (state.game?.held[index] ? value : randomDie()));
    renderDice();
  }, 62);
}

function stopRollAnimation() {
  window.clearInterval(state.rollTimer);
  state.rollTimer = null;
  state.isRolling = false;
  state.animatedDice = [];
  state.dice3d.startPromise = null;
  finishDice3dRoll();
}

function shouldAnimateIncomingRoll(previous, next) {
  if (!previous || state.pending || state.isRolling) return false;
  if (next.status !== "playing" || !next.dice.length || next.rollsUsed <= 0) return false;
  if (previous.currentSeatId !== next.currentSeatId) return false;
  return previous.dice.join(",") !== next.dice.join(",") && next.rollsUsed >= previous.rollsUsed;
}

async function animateIncomingRoll() {
  const startedAt = Date.now();
  startRollAnimation();
  playRollSound(0.55);
  await waitForRollVisual(startedAt);
  stopRollAnimation();
  render();
}

function ensureAudioContext() {
  if (!state.soundEnabled) return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!state.audioContext) state.audioContext = new AudioContext();
  if (state.audioContext.state === "suspended") state.audioContext.resume();
  return state.audioContext;
}

function playRollSound(volume = 0.72) {
  const audio = ensureAudioContext();
  if (!audio) return;

  const duration = 0.56;
  const sampleCount = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, sampleCount, audio.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    const fade = 1 - index / sampleCount;
    channel[index] = (Math.random() * 2 - 1) * fade * 0.9;
  }

  const source = audio.createBufferSource();
  source.buffer = buffer;

  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1050;
  filter.Q.value = 1.8;

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22 * volume, audio.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);

  source.connect(filter).connect(gain).connect(audio.destination);
  source.start();

  for (let tick = 0; tick < 4; tick += 1) {
    playTone(220 + tick * 45, 0.035, 0.07 * volume, tick * 0.085, "triangle");
  }
}

function playClickSound() {
  playTone(360, 0.055, 0.08, 0, "sine");
}

function playScoreSound() {
  playTone(520, 0.07, 0.09, 0, "sine");
  playTone(780, 0.08, 0.08, 0.075, "sine");
}

function playStartSound() {
  playTone(300, 0.08, 0.08, 0, "triangle");
  playTone(450, 0.08, 0.08, 0.08, "triangle");
}

function playTone(frequency, duration, volume, delay = 0, type = "sine") {
  const audio = ensureAudioContext();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function applyDiceTheme(theme) {
  const safeTheme = DICE_THEMES.has(theme) ? theme : "default";
  document.body.dataset.diceTheme = safeTheme;
  saveDiceTheme(safeTheme);
  syncDice3dTheme(safeTheme);
  if (!els.diceCustomizer) return;
  els.diceCustomizer.querySelectorAll("[data-dice-theme]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.diceTheme === safeTheme);
  });
}

function renderSoundToggle() {
  if (!els.soundToggle) return;
  els.soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
  els.soundToggle.textContent = state.soundEnabled ? "Lyd p\u00e5" : "Lyd av";
}

function render() {
  const hasGame = Boolean(state.game);
  document.body.classList.toggle("in-game", hasGame);
  els.setupView.classList.toggle("is-hidden", hasGame);
  els.gameView.classList.toggle("is-hidden", !hasGame);
  els.createName.value ||= loadName();
  els.joinName.value ||= loadName();

  if (!hasGame) {
    clearDice3dStage();
    return;
  }

  renderRoom();
  renderPlayers();
  renderTurn();
  renderDice();
  renderScoreTable();
  renderLog();
  renderChat();
  prepareDice3d();
}

function renderRoom() {
  const game = state.game;
  els.roomTitle.textContent = game.modeName;
  els.roomCodeLabel.textContent = game.code;
  els.gameStatus.textContent = statusText(game.status);
  els.gameStatus.style.background = game.status === "playing" ? "#e9f8f1" : game.status === "finished" ? "#eaf1ff" : "#fff7db";
  els.startGame.classList.toggle("is-hidden", game.status !== "lobby");
  els.startGame.classList.toggle("maxi-button", game.mode === "maxi");
  els.startGame.textContent = game.mode === "maxi" ? "Start Maxi Yatzy" : "Start spill";
  els.startGame.disabled = state.pending || game.players.length === 0;
}

function statusText(status) {
  if (status === "lobby") return "Lobby";
  if (status === "playing") return "Spiller";
  if (status === "finished") return "Ferdig";
  return status;
}

function renderPlayers() {
  const game = state.game;
  els.playersList.innerHTML = game.players
    .map((player) => {
      const host = player.isHost ? "vert" : "spiller";
      const turn = player.seatId === game.currentSeatId ? "tur" : host;
      const mine = player.seatId === state.seatId ? " deg" : "";
      const saved = game.canSaveRolls ? `, ${player.savedRolls} spart` : "";
      return `
        <div class="player-item ${player.seatId === game.currentSeatId ? "is-current" : ""}">
          <div class="avatar">${escapeHtml(initials(player.name))}</div>
          <div>
            <div class="player-name">${escapeHtml(player.name)}${mine ? `<span class="player-meta">${mine}</span>` : ""}</div>
            <div class="player-meta">${turn} &middot; ${player.totals.total} poeng &middot; ${player.totals.remaining} igjen${saved}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderTurn() {
  const game = state.game;
  const player = currentPlayer();
  const winnerText = game.winners.length ? game.winners.map((winner) => `${winner.name} (${winner.total})`).join(", ") : "";

  if (game.status === "lobby") {
    els.turnEyebrow.textContent = `${game.players.length} spiller${game.players.length === 1 ? "" : "e"}`;
    els.turnTitle.textContent = "Klar ved bordet";
  } else if (game.status === "finished") {
    els.turnEyebrow.textContent = "Vinner";
    els.turnTitle.textContent = winnerText || "Ferdig";
  } else if (isMyTurn()) {
    els.turnEyebrow.textContent = "Din tur";
    els.turnTitle.textContent = "Kast terningene";
  } else {
    els.turnEyebrow.textContent = "Venter";
    els.turnTitle.textContent = player ? `${player.name} sin tur` : "Spillet er i gang";
  }
}

function renderDice() {
  const game = state.game;
  const count = diceCount();
  const canHold = isMyTurn() && game.rollsUsed > 0;
  if (!state.isRolling && !game.dice.length) {
    clearDice3dStage();
  }
  const dice = state.isRolling
    ? state.animatedDice
    : game.dice.length
      ? game.dice
      : Array.from({ length: count }, () => 0);

  const diceEntries = dice.map((value, index) => ({
    value,
    index,
    held: Boolean(game.held[index])
  }));
  const activeDice = diceEntries.filter((entry) => !entry.held);
  const heldDice = diceEntries.filter((entry) => entry.held);

  if (hasSplitDiceLayout()) {
    renderSplitDice(activeDice, heldDice, canHold, count);
  } else if (ensureLegacyDiceRow()) {
    renderLegacyDice(diceEntries, canHold);
  } else {
    return;
  }

  const diceRoot = els.diceTable || els.legacyDiceRow;
  if (diceRoot) {
    diceRoot.querySelectorAll("[data-hold]").forEach((button) => {
      button.addEventListener("click", () => action("hold", { index: Number(button.dataset.hold) }));
    });
  }

  const canRoll = isMyTurn() && game.rollsLeft > 0;
  els.rollDice.disabled = state.pending || !canRoll;
  els.rollDice.textContent = state.isRolling ? "Ruller" : game.rollsUsed === 0 ? "Kast" : "Kast igjen";
  els.rollMeta.textContent = rollMetaText(game);
}

function hasSplitDiceLayout() {
  return Boolean(els.diceTable && els.activeDiceLabel && els.heldDiceLabel && els.activeDiceRow && els.heldDiceRow);
}

function renderSplitDice(activeDice, heldDice, canHold, count) {
  els.diceTable.classList.toggle("is-rolling", state.isRolling);
  els.diceTable.classList.toggle("is-3d-roll-visual", shouldUseDice3dVisual());
  els.diceTable.classList.toggle("has-3d-roll", state.dice3d.visible);
  els.activeDiceLabel.textContent = `${activeDice.length}/${count}`;
  els.heldDiceLabel.textContent = `${heldDice.length}/${count}`;
  els.activeDiceRow.innerHTML = activeDice.length
    ? activeDice.map((entry) => renderDieButton(entry, canHold, "active")).join("")
    : renderEmptyFelt("Alle spart");
  els.heldDiceRow.innerHTML = heldDice.length
    ? heldDice.map((entry) => renderDieButton(entry, canHold, "held")).join("")
    : renderGhostDice(Math.min(count, 6));
}

function ensureLegacyDiceRow() {
  if (els.legacyDiceRow) return els.legacyDiceRow;
  if (!els.diceTable) return null;

  const row = document.createElement("div");
  row.id = "diceRow";
  row.className = "dice-row active-dice";
  els.diceTable.replaceChildren(row);
  els.legacyDiceRow = row;
  return row;
}

function renderLegacyDice(diceEntries, canHold) {
  els.legacyDiceRow.innerHTML = diceEntries
    .map((entry) => renderDieButton(entry, canHold, entry.held ? "held" : "active"))
    .join("");
}

function renderDieButton(entry, canHold, lane) {
  const held = entry.held ? "is-held" : "";
  const saved = lane === "held" && !state.isRolling ? "is-saved" : "";
  const empty = entry.value ? "" : "is-empty";
  const rolling = state.isRolling && !entry.held && !shouldUseDice3dVisual() ? "is-rolling" : "";
  const disabled = canHold && !state.isRolling ? "" : "disabled";
  const motion = throwStyle(entry.index);
  const value = entry.value ? `, verdi ${entry.value}` : "";
  const label = entry.held ? `Spart terning ${entry.index + 1}${value}` : `Terning ${entry.index + 1}${value}`;
  return `<button class="die ${held} ${saved} ${empty} ${rolling}" style="${motion}" type="button" data-hold="${entry.index}" ${disabled} aria-label="${label}">${renderPips(entry.value)}</button>`;
}

function throwStyle(index) {
  const x = [-18, 14, -10, 20, -15, 11][index] || 0;
  const y = [-12, 8, 14, -7, 10, -15][index] || 0;
  const spin = [260, -230, 310, -280, 240, -320][index] || 240;
  return `--throw-x:${x}px;--throw-y:${y}px;--spin:${spin}deg;`;
}

function renderGhostDice(count) {
  return Array.from({ length: count }, () => '<span class="die-ghost" aria-hidden="true"></span>').join("");
}

function renderEmptyFelt(label) {
  return `<div class="empty-felt">${escapeHtml(label)}</div>`;
}


function rollMetaText(game) {
  if (game.status !== "playing") return "Venter p\u00e5 start";
  const saved = game.canSaveRolls && currentPlayer() ? ` - ${currentPlayer().savedRolls} spart` : "";
  const ready = game.rollsUsed >= game.scoreReadyRolls ? " - blokka er klar" : "";
  return `${game.rollsUsed}/${game.rollLimit} kast brukt${ready}${saved}`;
}

function renderPips(value) {
  const active = new Set(pipMap[value] || []);
  return Array.from({ length: 9 }, (_, index) => `<span class="pip ${active.has(index) ? "is-on" : ""}"></span>`).join("");
}

function renderScoreTable() {
  const game = state.game;
  const upper = game.categories.filter((category) => category.section === "upper");
  const lower = game.categories.filter((category) => category.section === "lower");
  const title = game.mode === "maxi" ? "MAXI YATZY" : "YATZY";
  const scoreColumnCount = scoreGridColumnCount();
  const fillerCount = Math.max(0, scoreColumnCount - game.players.length);
  const header = `
    <caption>
      <span class="score-brand">${escapeHtml(title)}</span>
    </caption>
    <colgroup>
      <col class="score-label-col">
      ${game.players.map((player) => `<col class="${scorePlayerClass(player)}">`).join("")}
      ${Array.from({ length: fillerCount }, () => "<col>").join("")}
    </colgroup>
    <thead>
      <tr>
        <th scope="col"></th>
        ${game.players.map((player) => scorePlayerHeader(player)).join("")}
        ${emptyScoreCells(fillerCount, "th")}
      </tr>
    </thead>
  `;
  const body = `
    <tbody>
      ${upper.map((category) => scoreRow(category)).join("")}
      ${summaryRow("Sum", (player) => player.totals.upper)}
      ${summaryRow("Bonus", (player) => player.totals.bonus)}
      ${lower.map((category) => scoreRow(category)).join("")}
      ${summaryRow("Totalsum", (player) => player.totals.total, "grand-total")}
    </tbody>
  `;
  els.scoreTable.innerHTML = header + body;
  els.scoreTable.querySelectorAll("[data-score]").forEach((button) => {
    button.addEventListener("click", () => action("score", { categoryId: button.dataset.score }));
  });
}

function scoreGridColumnCount() {
  return Math.max(state.game.players.length, 4);
}

function scorePlayerHeader(player) {
  const classes = scorePlayerClass(player);
  return `
    <th scope="col" class="${classes}" title="${escapeHtml(player.name)}">
      <span class="score-player-initial">${escapeHtml(firstInitial(player.name))}</span>
    </th>
  `;
}

function scorePlayerClass(player) {
  const classes = [];
  if (player.seatId === state.seatId) classes.push("is-me");
  if (player.seatId === state.game.currentSeatId) classes.push("is-current-player");
  return classes.join(" ");
}

function emptyScoreCells(count, tag = "td") {
  return Array.from({ length: count }, () => `<${tag} class="score-filler-cell"></${tag}>`).join("");
}

function summaryRow(label, getter, extraClass = "total-row") {
  const fillerCount = Math.max(0, scoreGridColumnCount() - state.game.players.length);
  return `
    <tr class="${extraClass}">
      <td>${escapeHtml(label)}</td>
      ${state.game.players.map((player) => `<td class="${scorePlayerClass(player)}"><span class="summary-value">${getter(player)}</span></td>`).join("")}
      ${emptyScoreCells(fillerCount)}
    </tr>
  `;
}

function scoreRow(category) {
  const playable = isCategoryPlayable(category);
  const fillerCount = Math.max(0, scoreGridColumnCount() - state.game.players.length);
  const classes = [
    "score-entry-row",
    `score-${category.section}`,
    `score-row-${category.id}`,
    playable ? "is-playable-row" : "",
    category.id.toLowerCase().includes("yatzy") ? "is-yatzy-row" : ""
  ].filter(Boolean).join(" ");
  return `
    <tr class="${classes}">
      <td class="score-label">${renderCategoryLabel(category)}</td>
      ${state.game.players.map((player) => scoreCell(player, category)).join("")}
      ${emptyScoreCells(fillerCount)}
    </tr>
  `;
}

function isCategoryPlayable(category) {
  const game = state.game;
  return isMyTurn() && game.rollsUsed >= game.scoreReadyRolls && me()?.scores?.[category.id] === null;
}

function renderCategoryLabel(category) {
  const note = categoryNote(category);
  return `<span class="score-line-label">${escapeHtml(classicCategoryLabel(category))}${note ? ` <small>${escapeHtml(note)}</small>` : ""}</span>`;
}

function classicCategoryLabel(category) {
  const labels = {
    onePair: "1 par",
    twoPairs: "2 par",
    threePairs: "3 par",
    threeKind: "3 like",
    fourKind: "4 like",
    fiveKind: "5 like",
    smallStraight: "Liten straight",
    largeStraight: "Stor straight",
    fullStraight: "Full straight",
    fullHouse: "Hus",
    villa: "Hytte",
    tower: "T\u00e5rn",
    chance: "Sjanse",
    yatzy: "Yatzy",
    maxiYatzy: "Maxiyatzy"
  };
  return labels[category.id] || category.label;
}

function categoryNote(category) {
  if (category.id === "villa") return "2+3 like";
  if (category.id === "fullHouse" && state.game.mode === "maxi") return "3+3 like";
  if (category.id === "tower") return "2+4 like";
  return "";
}

function scoreCell(player, category) {
  const game = state.game;
  const value = player.scores[category.id];
  const classes = ["score-player-cell", scorePlayerClass(player)];
  if (value !== null) {
    const content = value === 0
      ? '<span class="score-value is-struck">0</span>'
      : `<span class="score-value">${value}</span>`;
    return `<td class="${classes.concat("is-filled").join(" ")}">${content}</td>`;
  }

  const canScore = isMyTurn() && player.seatId === state.seatId && game.rollsUsed >= game.scoreReadyRolls;
  if (!canScore) return `<td class="${classes.join(" ")}"><span class="empty-cell"></span></td>`;

  const preview = game.scorePreview[category.id] ?? 0;
  const label = String(preview);
  const ariaLabel = `F\u00f8r ${preview} p\u00e5 ${category.label}`;
  return `
    <td class="${classes.concat("is-score-choice").join(" ")}">
      <button class="score-button ${preview === 0 ? "is-zero" : ""}" type="button" data-score="${category.id}" aria-label="${escapeHtml(ariaLabel)}">${label}</button>
    </td>
  `;
}

function renderLog() {
  const log = state.game.log || [];
  els.gameLog.innerHTML = log.length
    ? log.map((entry) => `<li>${escapeHtml(entry.message)}</li>`).join("")
    : "<li>Ingen trekk enn&aring;.</li>";
}

function renderChat() {
  if (!els.chatList) return;
  const chat = state.game?.chat || [];
  els.chatList.innerHTML = chat.length
    ? chat.map((entry) => renderChatMessage(entry)).join("")
    : '<p class="chat-empty">Ingen meldinger enn&aring;.</p>';
  els.chatList.scrollTop = els.chatList.scrollHeight;

  const disabled = !state.game || !state.playerToken || state.chatPending;
  if (els.chatInput) els.chatInput.disabled = disabled;
  if (els.sendChat) els.sendChat.disabled = disabled;
}

function renderChatMessage(entry) {
  const mine = entry.seatId === state.seatId ? "is-mine" : "";
  return `
    <div class="chat-message ${mine}">
      <strong>${escapeHtml(entry.name)}</strong>
      <span>${escapeHtml(entry.message)}</span>
    </div>
  `;
}

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function firstInitial(name) {
  return initials(name).slice(0, 1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await createGame(new FormData(els.createForm));
  } catch (error) {
    showToast(error.message);
  }
});

els.joinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = String(els.roomCode.value || "").trim().toUpperCase();
  try {
    await joinGame(code, String(els.joinName.value || "").trim(), loadIdentity(code).playerToken);
  } catch (error) {
    showToast(error.message);
  }
});

els.startGame.addEventListener("click", () => action("start"));
els.rollDice.addEventListener("click", () => action("roll"));
els.leaveRoom.addEventListener("click", leaveRoom);
if (els.diceCustomizer) {
  els.diceCustomizer.addEventListener("click", (event) => {
    const button = event.target.closest("[data-dice-theme]");
    if (!button) return;
    applyDiceTheme(button.dataset.diceTheme);
    playClickSound();
  });
}
if (els.soundToggle) {
  els.soundToggle.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    saveSoundEnabled(state.soundEnabled);
    renderSoundToggle();
    if (state.soundEnabled) playStartSound();
  });
}
if (els.chatForm) {
  els.chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendChat(els.chatInput?.value);
  });
}
els.copyLink.addEventListener("click", async () => {
  if (!state.game) return;
  const link = `${window.location.origin}/?room=${state.game.code}`;
  try {
    await navigator.clipboard.writeText(link);
    showToast("Link kopiert.");
  } catch (error) {
    showToast(link);
  }
});

els.roomCode.addEventListener("input", () => {
  els.roomCode.value = els.roomCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
});

async function boot() {
  applyDiceTheme(loadDiceTheme());
  renderSoundToggle();
  const params = new URLSearchParams(window.location.search);
  const code = String(params.get("room") || "").trim().toUpperCase();
  els.createName.value = loadName();
  els.joinName.value = loadName();
  if (!code) {
    render();
    return;
  }

  els.roomCode.value = code;
  const identity = loadIdentity(code);
  if (!identity.playerToken) {
    render();
    return;
  }

  try {
    await joinGame(code, loadName(), identity.playerToken);
  } catch (error) {
    showToast(error.message);
    render();
  }
}

boot();
