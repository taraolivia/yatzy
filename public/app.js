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
  rulesToggle: document.querySelector("#rulesToggle"),
  rulesPanel: document.querySelector("#rulesPanel"),
  forcedModeOption: document.querySelector("#forcedModeOption"),
  forcedModeToggle: document.querySelector("#forcedModeToggle"),
  forcedYatzyAnywhereOption: document.querySelector("#forcedYatzyAnywhereOption"),
  forcedYatzyAnywhereToggle: document.querySelector("#forcedYatzyAnywhereToggle"),
  bonusThresholdInput: document.querySelector("#bonusThresholdInput"),
  bonusPointsInput: document.querySelector("#bonusPointsInput"),
  yatzyPointsInput: document.querySelector("#yatzyPointsInput"),
  fullStraightPointsInput: document.querySelector("#fullStraightPointsInput"),
  maxiRulesSection: document.querySelector("#maxiRulesSection"),
  saveRules: document.querySelector("#saveRules"),
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
  scoreLastMove: document.querySelector("#scoreLastMove"),
  scoreTable: document.querySelector("#scoreTable"),
  gameLog: document.querySelector("#gameLog"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),
  chatList: document.querySelector("#chatList"),
  sendChat: document.querySelector("#sendChat"),
  celebrationLayer: document.querySelector("#celebrationLayer"),
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
  celebrationTimer: null,
  celebratedYatzies: new Set(),
  rulesPanelOpen: false,
  isRolling: false,
  rollContext: null,
  rollAnimationId: 0,
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
  audioContext: null,
  rollAudio: null,
  rollAudioFailed: false
};

const DICE_THEMES = new Set(["default", "wooden", "blueGreenMetal", "rock", "smooth", "smooth-pip", "lavender", "gold", "glitter", "yellow"]);
const ROLL_ANIMATION_MS = 650;
const ROLL_SOUND_PATH = "/assets/sounds/dice-roll.mp3";
const DICE_3D_MODULE_PATH = "/vendor/dice-box/dice-box.es.min.js";
const DICE_3D_ASSET_PATH = "/assets/";
const DICE_3D_MIN_ROLL_MS = 980;
const DICE_3D_START_TIMEOUT_MS = 8000;
const DICE_3D_ROLL_TIMEOUT_MS = 16000;
const DICE_3D_SETTLE_PAD_MS = 450;
const DICE_3D_PHYSICS = {
  gravity: 2,
  mass: 1,
  friction: 0.8,
  restitution: 0,
  angularDamping: 0.2,
  linearDamping: 0.4,
  spinForce: 6,
  throwForce: 5,
  startingHeight: 8,
  settleTimeout: 5000,
  delay: 100,
  scale: 10
};
const DICE_3D_THEME_COLORS = {
  default: "#f8f3e6",
  wooden: "#8b5e34",
  blueGreenMetal: "#4faeaa",
  rock: "#b7aca1",
  smooth: "#e6a1c7",
  "smooth-pip": "#ffffff",
  lavender: "#c7a7ff",
  gold: "#f1bb45",
  glitter: "#f8d66d",
  yellow: "#ffefaa"
};
const YATZY_CATEGORY_IDS = new Set(["yatzy", "maxiYatzy"]);
const CONFETTI_COLORS = ["#f4bf3f", "#e45c4f", "#1d8a70", "#2f6df6", "#ffffff"];

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
  const previousGame = state.game;
  let rollAnimationId = null;
  let rollDiceValues = null;
  state.pending = true;
  if (isRoll) {
    rollAnimationId = startRollAnimation(state.game, { context: "local" });
    playRollSound();
  } else if (name === "hold") {
    playClickSound();
  } else if (name === "settings") {
    state.game = { ...state.game, ...extra };
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
      stopRollAnimation(rollAnimationId);
      state.game = payload.game;
    } else if (name === "score") {
      maybeCelebrateYatzy(previousGame, payload.game);
      state.game = payload.game;
      playScoreSound();
    } else if (name === "start") {
      state.game = payload.game;
      playStartSound();
    } else if (name === "restart") {
      state.game = payload.game;
      hideOverlay();
      playStartSound();
    } else {
      state.game = payload.game;
    }
  } catch (error) {
    if (name === "settings") state.game = previousGame;
    showToast(error.message);
  } finally {
    if (isRoll && state.rollContext === "local") stopRollAnimation(rollAnimationId);
    state.pending = false;
    render();
  }
}

async function sendChat(message) {
  if (!state.game || !state.playerToken || state.chatPending) return;
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) return;

  const shouldRefocus = document.activeElement === els.chatInput || document.activeElement === els.sendChat;
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
    if (shouldRefocus) focusChatInput();
  }
}

function connectEvents(code) {
  if (state.events) state.events.close();
  setConnection("Kobler til");
  state.events = new EventSource(`/api/games/${code}/events`);
  state.events.addEventListener("open", () => setConnection("Live"));
  state.events.addEventListener("state", (event) => {
    const nextGame = JSON.parse(event.data);
    const previousGame = state.game;
    const shouldAnimate = shouldAnimateIncomingRoll(previousGame, nextGame);
    maybeCelebrateYatzy(previousGame, nextGame);
    setConnection("Live");
    if (shouldAnimate) {
      void animateIncomingRoll(previousGame, nextGame);
      return;
    }
    cancelIncomingRollAnimation();
    state.game = nextGame;
    render();
  });
  state.events.addEventListener("error", () => setConnection("Kobler til igjen"));
}

function leaveRoom() {
  if (state.events) state.events.close();
  state.game = null;
  state.playerToken = null;
  state.seatId = null;
  state.celebratedYatzies.clear();
  state.rulesPanelOpen = false;
  hideOverlay();
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

function canRollDice() {
  return Boolean(state.game && isMyTurn() && state.game.rollsLeft > 0 && !state.pending && !state.isRolling);
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
        ...dice3dConfig(),
        onRollComplete: () => markDice3dRollComplete(),
        offscreen: false
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

function dice3dConfig(theme = currentDiceTheme()) {
  return {
    ...DICE_3D_PHYSICS,
    theme,
    themeColor: dice3dThemeColor(theme)
  };
}

async function startDice3dRoll() {
  const rollId = state.dice3d.rollId;
  clearStaticDice3d();
  setDice3dVisible(true);
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
      .roll(dice3dRollNotation(count, theme), { theme, themeColor: dice3dThemeColor(theme), newStartPoint: true })
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
  return state.dice3d.instance.updateConfig(dice3dConfig(theme)).catch((error) => {
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

function isCurrentRollAnimation(animationId) {
  return state.isRolling && animationId === state.rollAnimationId;
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
  clearStaticDice3d();
  if (state.game?.dice.length) setDice3dVisible(true);
}

function cancelDice3dRoll(rollId = state.dice3d.rollId) {
  if (rollId !== state.dice3d.rollId) return;
  state.dice3d.rollId += 1;
  state.dice3d.startPromise = null;
  state.dice3d.rollPromise = null;
  state.dice3d.settlePromise = null;
  state.dice3d.settleResolve = null;
  setDice3dVisible(false);
  clearDice3dInstance();
}

function clearDice3dStage() {
  window.clearTimeout(state.dice3d.hideTimer);
  state.dice3d.rollId += 1;
  state.dice3d.startPromise = null;
  state.dice3d.rollPromise = null;
  state.dice3d.settlePromise = null;
  state.dice3d.settleResolve = null;
  clearStaticDice3d();
  setDice3dVisible(false);
  clearDice3dInstance();
}

function clearDice3dInstance() {
  try {
    state.dice3d.instance?.clear?.();
  } catch (error) {
    // Dice-box can briefly expose an instance before its world clear API is ready.
  }
}

function clearStaticDice3d() {
  if (!els.dice3dStage) return;
  els.dice3dStage.classList.remove("has-static-dice");
  els.dice3dStage.querySelector(".dice-3d-static")?.remove();
}

function syncDice3dVisualState() {
  clearStaticDice3d();
}

function startRollAnimation(animationGame = state.game, { context = "local" } = {}) {
  if (!animationGame) return;
  window.clearInterval(state.rollTimer);
  clearStaticDice3d();
  state.rollAnimationId += 1;
  const animationId = state.rollAnimationId;
  state.rollContext = context;
  state.dice3d.rollId += 1;
  const count = animationGame.mode === "maxi" ? 6 : 5;
  const held = animationGame.held.slice(0, count);
  const currentDice = animationGame.dice.length ? animationGame.dice : Array.from({ length: count }, () => randomDie());
  state.animatedDice = currentDice.map((value, index) => (held[index] ? value : randomDie()));
  state.isRolling = true;
  renderDice();
  state.dice3d.startPromise = startDice3dRoll().then((didStart) => {
    if (isCurrentRollAnimation(animationId)) renderDice();
    return didStart;
  });
  state.rollTimer = window.setInterval(() => {
    if (!isCurrentRollAnimation(animationId)) return;
    state.animatedDice = state.animatedDice.map((value, index) => (held[index] ? value : randomDie()));
    renderDice();
  }, 62);
  return animationId;
}

function stopRollAnimation(animationId = null) {
  if (animationId !== null && animationId !== state.rollAnimationId) return false;
  window.clearInterval(state.rollTimer);
  state.rollTimer = null;
  state.isRolling = false;
  state.rollContext = null;
  state.animatedDice = [];
  state.dice3d.startPromise = null;
  finishDice3dRoll();
  return true;
}

function cancelIncomingRollAnimation() {
  if (state.rollContext !== "incoming") return;
  state.rollAnimationId += 1;
  stopRollAnimation();
}

function shouldAnimateIncomingRoll(previous, next) {
  if (!previous || state.pending || state.isRolling) return false;
  if (next.status !== "playing" || !next.dice.length || next.rollsUsed <= 0) return false;
  if (previous.currentSeatId !== next.currentSeatId) return false;
  return previous.dice.join(",") !== next.dice.join(",") && next.rollsUsed >= previous.rollsUsed;
}

async function animateIncomingRoll(previousGame, nextGame) {
  const startedAt = Date.now();
  if (!previousGame || !nextGame) return;
  state.game = previousGame;
  const animationId = startRollAnimation(previousGame, { context: "incoming" });
  playRollSound(0.55);
  await waitForRollVisual(startedAt);
  if (!isCurrentRollAnimation(animationId)) return;
  stopRollAnimation(animationId);
  if (state.game && state.game.version > nextGame.version) return;
  state.game = nextGame;
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

function ensureRollAudio() {
  if (state.rollAudio || state.rollAudioFailed || !window.Audio) return state.rollAudio;

  state.rollAudio = new Audio(ROLL_SOUND_PATH);
  state.rollAudio.preload = "auto";
  state.rollAudio.addEventListener("error", () => {
    state.rollAudioFailed = true;
  }, { once: true });
  return state.rollAudio;
}

function playRollSound(volume = 1) {
  if (!state.soundEnabled) return;
  const rollAudio = ensureRollAudio();
  if (rollAudio && !state.rollAudioFailed) {
    rollAudio.pause();
    rollAudio.currentTime = 0;
    rollAudio.volume = Math.max(0, Math.min(1, volume));
    const playback = rollAudio.play();
    if (playback?.catch) {
      playback.catch((error) => {
        if (error?.name !== "NotAllowedError") {
          state.rollAudioFailed = true;
          playSyntheticRollSound(volume);
        }
      });
    }
    return;
  }

  playSyntheticRollSound(volume);
}

function playSyntheticRollSound(volume = 0.72) {
  const audio = ensureAudioContext();
  if (!audio) return;

  [0, 0.055, 0.12, 0.2, 0.31, 0.43].forEach((delay, index) => {
    const strength = (0.18 - index * 0.014) * volume;
    playNoiseBurst(audio, delay, 0.045 + index * 0.004, Math.max(0.06, strength));
    playTone(175 + Math.random() * 95, 0.04, 0.045 * volume, delay, index % 2 ? "triangle" : "square");
  });
}

function playNoiseBurst(audio, delay, duration, volume) {
  const sampleCount = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, sampleCount, audio.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    const fade = 1 - index / sampleCount;
    channel[index] = (Math.random() * 2 - 1) * fade;
  }

  const source = audio.createBufferSource();
  source.buffer = buffer;

  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 850 + Math.random() * 650;
  filter.Q.value = 2.4;

  const gain = audio.createGain();
  const start = audio.currentTime + delay;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter).connect(gain).connect(audio.destination);
  source.start(start);
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

function playYatzySound() {
  [523, 659, 784, 1047].forEach((note, index) => {
    playTone(note, 0.13, 0.09, index * 0.075, "triangle");
  });
  playTone(1319, 0.2, 0.075, 0.34, "sine");
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
  if (!state.isRolling) {
    clearDice3dStage();
    syncDice3dTheme(safeTheme);
    if (state.game) renderDice();
  }
  renderDiceCustomizer();
}

function renderDiceCustomizer() {
  if (!els.diceCustomizer) return;
  const theme = currentDiceTheme();
  const disabled = state.pending || state.isRolling;
  els.diceCustomizer.querySelectorAll("[data-dice-theme]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.diceTheme === theme);
    button.disabled = disabled;
  });
}

function renderSoundToggle() {
  if (!els.soundToggle) return;
  const label = state.soundEnabled ? "Lyd på" : "Lyd av";
  els.soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
  els.soundToggle.setAttribute("aria-label", label);
  els.soundToggle.setAttribute("title", label);
  els.soundToggle.innerHTML = `<span aria-hidden="true">${state.soundEnabled ? "&#128266;" : "&#128263;"}</span>`;
}

function render() {
  const hasGame = Boolean(state.game);
  const myTurn = hasGame && isMyTurn();
  document.body.classList.toggle("in-game", hasGame);
  document.body.classList.toggle("is-my-turn", myTurn);
  els.setupView.classList.toggle("is-hidden", hasGame);
  els.gameView.classList.toggle("is-hidden", !hasGame);
  els.gameView.classList.toggle("is-my-turn", myTurn);
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
  renderDiceCustomizer();
  renderGameOverOverlay();
}

function renderRoom() {
  const game = state.game;
  els.roomTitle.textContent = `${game.modeName}${game.forcedMode ? " · Tvungen" : ""}`;
  els.roomCodeLabel.textContent = game.code;
  els.gameStatus.textContent = statusText(game.status);
  els.gameStatus.style.background = game.status === "playing" ? "#e9f8f1" : game.status === "finished" ? "#eaf1ff" : "#fff7db";
  renderRulesPanel();
  els.startGame.classList.toggle("is-hidden", game.status !== "lobby");
  els.startGame.classList.toggle("maxi-button", game.mode === "maxi");
  els.startGame.textContent = game.mode === "maxi" ? "Start Maxi Yatzy" : "Start spill";
  els.startGame.disabled = state.pending || game.players.length === 0;
}

function renderRulesPanel() {
  if (!els.rulesToggle || !els.rulesPanel || !state.game) return;

  const game = state.game;
  const showRules = game.status === "lobby";
  if (!showRules) state.rulesPanelOpen = false;
  els.rulesToggle.classList.toggle("is-hidden", !showRules);
  els.rulesToggle.setAttribute("aria-expanded", String(state.rulesPanelOpen && showRules));
  els.rulesToggle.disabled = state.pending;
  els.rulesToggle.classList.toggle("is-active", state.rulesPanelOpen && showRules);
  els.rulesPanel.classList.toggle("is-hidden", !(state.rulesPanelOpen && showRules));

  const settings = effectiveRuleSettings(game);
  const isEditingRules = els.rulesPanel.contains(document.activeElement) && !state.pending;
  if (!isEditingRules) {
    if (els.forcedModeToggle) els.forcedModeToggle.checked = Boolean(game.forcedMode);
    if (els.forcedYatzyAnywhereToggle) els.forcedYatzyAnywhereToggle.checked = settings.forcedYatzyAnywhere !== false;
    if (els.bonusThresholdInput) els.bonusThresholdInput.value = settings.upperBonusThreshold;
    if (els.bonusPointsInput) els.bonusPointsInput.value = settings.upperBonus;
    if (els.yatzyPointsInput) els.yatzyPointsInput.value = settings.yatzyScore;
    if (els.fullStraightPointsInput) els.fullStraightPointsInput.value = settings.fullStraightScore;
  }

  const formDisabled = !showRules || state.pending;
  els.rulesPanel.querySelectorAll("input, button").forEach((control) => {
    control.disabled = formDisabled;
  });
  if (els.maxiRulesSection) els.maxiRulesSection.classList.toggle("is-hidden", game.mode !== "maxi");
  syncForcedRuleDraft();
}

function effectiveRuleSettings(game = state.game) {
  const fallback = defaultRuleSettingsForGame(game, Boolean(game?.forcedMode));
  const preset = game?.rulePresets?.[game.forcedMode ? "forced" : "normal"] || fallback;
  return {
    upperBonusThreshold: Number(game?.ruleSettings?.upperBonusThreshold ?? preset.upperBonusThreshold),
    upperBonus: Number(game?.ruleSettings?.upperBonus ?? preset.upperBonus),
    yatzyScore: Number(game?.ruleSettings?.yatzyScore ?? preset.yatzyScore),
    fullStraightScore: Number(game?.ruleSettings?.fullStraightScore ?? preset.fullStraightScore),
    forcedYatzyAnywhere: game?.ruleSettings?.forcedYatzyAnywhere !== false
  };
}

function defaultRuleSettingsForGame(game = state.game, forcedMode = Boolean(game?.forcedMode)) {
  const isMaxi = game?.mode === "maxi";
  return {
    upperBonusThreshold: forcedMode ? (isMaxi ? 63 : 42) : (isMaxi ? 84 : 63),
    upperBonus: isMaxi ? 100 : 50,
    yatzyScore: isMaxi ? 100 : 50,
    fullStraightScore: 21,
    forcedYatzyAnywhere: true
  };
}

function rulePresetFor(forcedMode) {
  return state.game?.rulePresets?.[forcedMode ? "forced" : "normal"] || defaultRuleSettingsForGame(state.game, forcedMode);
}

function cleanRuleInput(input, fallback) {
  const value = Number(input?.value);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(999, Math.trunc(value)));
}

function collectRuleSettings() {
  const current = effectiveRuleSettings();
  return {
    forcedMode: Boolean(els.forcedModeToggle?.checked),
    ruleSettings: {
      upperBonusThreshold: cleanRuleInput(els.bonusThresholdInput, current.upperBonusThreshold),
      upperBonus: cleanRuleInput(els.bonusPointsInput, current.upperBonus),
      yatzyScore: cleanRuleInput(els.yatzyPointsInput, current.yatzyScore),
      fullStraightScore: cleanRuleInput(els.fullStraightPointsInput, current.fullStraightScore),
      forcedYatzyAnywhere: els.forcedYatzyAnywhereToggle?.checked !== false
    }
  };
}

function syncForcedRuleDraft() {
  const forced = Boolean(els.forcedModeToggle?.checked);
  if (els.forcedYatzyAnywhereOption) els.forcedYatzyAnywhereOption.classList.toggle("is-disabled", !forced);
  if (els.forcedYatzyAnywhereToggle) els.forcedYatzyAnywhereToggle.disabled = state.pending || !forced;
}

function handleForcedModeDraftChange() {
  const nextForced = Boolean(els.forcedModeToggle?.checked);
  const previousPreset = rulePresetFor(!nextForced);
  const nextPreset = rulePresetFor(nextForced);
  const currentThreshold = cleanRuleInput(els.bonusThresholdInput, previousPreset.upperBonusThreshold);
  if (currentThreshold === previousPreset.upperBonusThreshold && els.bonusThresholdInput) {
    els.bonusThresholdInput.value = nextPreset.upperBonusThreshold;
  }
  syncForcedRuleDraft();
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
      const saved = game.canSaveRolls ? `, ${savedRollText(player.savedRolls)}` : "";
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
    els.turnEyebrow.textContent = "Din tur!";
    els.turnTitle.textContent = game.rollsUsed > 0 ? "Velg score eller kast igjen" : "Kast terningene";
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

  syncDice3dVisualState();

  if (hasSplitDiceLayout()) {
    renderSplitDice(diceEntries, canHold, count);
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

  els.rollDice.disabled = !canRollDice();
  els.rollDice.textContent = rollButtonText(game);
  renderRollMeta(game);
}

function hasSplitDiceLayout() {
  return Boolean(els.diceTable && els.activeDiceLabel && els.heldDiceLabel && els.activeDiceRow && els.heldDiceRow);
}

function renderSplitDice(diceEntries, canHold, count) {
  const activeCount = diceEntries.filter((entry) => !entry.held).length;
  const heldCount = diceEntries.length - activeCount;
  els.diceTable.classList.toggle("is-rolling", state.isRolling);
  els.diceTable.classList.toggle("is-3d-roll-visual", shouldUseDice3dVisual());
  els.diceTable.classList.toggle("has-3d-roll", state.dice3d.visible);
  els.activeDiceRow.style.setProperty("--dice-count", count);
  els.heldDiceRow.style.setProperty("--dice-count", count);
  els.activeDiceLabel.textContent = `${activeCount}/${count}`;
  els.heldDiceLabel.textContent = `${heldCount}/${count}`;
  els.activeDiceRow.innerHTML = renderDiceSlots(diceEntries, canHold, "active", (entry) => !entry.held);
  els.heldDiceRow.innerHTML = renderDiceSlots(diceEntries, canHold, "held", (entry) => entry.held);
}

function renderDiceSlots(diceEntries, canHold, lane, shouldShowDie) {
  return diceEntries
    .map((entry) => `
      <span class="dice-slot ${shouldShowDie(entry) ? "" : "is-empty"}">
        ${shouldShowDie(entry) ? renderDieButton(entry, canHold, lane) : renderDieGhost()}
      </span>
    `)
    .join("");
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
  return Array.from({ length: count }, () => renderDieGhost()).join("");
}

function renderDieGhost() {
  return '<span class="die-ghost" aria-hidden="true"></span>';
}

function isKeyboardControlTarget(target) {
  if (!(target instanceof Element)) return false;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("input, textarea, select, button, a, [role='button']"));
}

function handleRollShortcut(event) {
  const isSpace = event.code === "Space" || event.key === " " || event.key === "Spacebar";
  if (!isSpace || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  if (isKeyboardControlTarget(event.target)) return;
  if (!canRollDice()) return;

  event.preventDefault();
  void action("roll");
}

function renderEmptyFelt(label) {
  return `<div class="empty-felt">${escapeHtml(label)}</div>`;
}


function rollMetaText(game) {
  if (game.status !== "playing") return "Venter p\u00e5 start";
  const baseUsed = Math.min(game.rollsUsed, game.rollLimit);
  const extraUsed = game.extraRollsUsed || Math.max(0, game.rollsUsed - game.rollLimit);
  const extra = extraUsed ? ` + ${savedRollText(extraUsed)} brukt` : "";
  const saved = savedRollMetaHtml(game);
  const ready = game.rollsUsed >= game.scoreReadyRolls ? " - blokka er klar" : "";
  return `${baseUsed}/${game.rollLimit} kast brukt${extra}${ready}${saved}`;
}

function renderRollMeta(game) {
  if (!els.rollMeta) return;
  els.rollMeta.innerHTML = rollMetaText(game);
  els.rollMeta.querySelector("[data-use-saved-roll]")?.addEventListener("click", () => {
    void action("roll", { useSavedRoll: true });
  });
}

function rollButtonText(game) {
  if (state.isRolling) return "Ruller";
  if (game.rollsUsed === 0) return "Kast";
  return game.rollsLeft > 0 ? "Kast igjen" : "Ingen kast";
}

function savedRollText(count) {
  return `${count} sjetong${count === 1 ? "" : "er"}`;
}

function savedRollInlineHtml(count) {
  return `<span class="roll-meta-chip-icon" aria-hidden="true"></span><span>${escapeHtml(savedRollText(count))}</span>`;
}

function savedRollMetaHtml(game) {
  const player = currentPlayer();
  if (!game.canSaveRolls || !player) return "";
  const count = player.savedRolls;
  const enabled = isMyTurn() && game.canUseSavedRoll && !state.pending && !state.isRolling;
  const title = enabled ? "Bruk sjetong til ekstra kast" : game.rollsLeft > 0 ? "Bruk vanlige kast f\u00f8rst" : "Ekstra kast";
  const text = savedRollText(count);
  if (!enabled) return ` - <span class="roll-meta-saved-label">${savedRollInlineHtml(count)}</span>`;
  return ` - <button class="roll-meta-saved" type="button" data-use-saved-roll title="${escapeHtml(title)}" aria-label="${escapeHtml(`${text}. Bruk en sjetong til ekstra kast`)}">${savedRollInlineHtml(count)}</button>`;
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
  const latestMove = latestMoveMessage(game);
  renderScoreLastMove(latestMove);
  const header = `
    <caption>
      <span class="score-caption-inner">
        <span class="score-brand">${escapeHtml(title)}</span>
      </span>
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
      ${summaryRow("Bonus", (player) => player.totals.bonus, "total-row", bonusInfoText(game))}
      ${lower.map((category) => scoreRow(category)).join("")}
      ${summaryRow("Totalsum", (player) => player.totals.total, "grand-total")}
    </tbody>
  `;
  els.scoreTable.innerHTML = header + body;
  els.scoreTable.querySelectorAll("[data-score]").forEach((button) => {
    button.addEventListener("click", () => action("score", { categoryId: button.dataset.score }));
  });
}

function renderScoreLastMove(message) {
  if (!els.scoreLastMove) return;
  els.scoreLastMove.textContent = message;
  els.scoreLastMove.classList.toggle("is-empty", !message);
}

function scoreGridColumnCount() {
  return state.game.players.length;
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

function summaryRow(label, getter, extraClass = "total-row", info = "") {
  const fillerCount = Math.max(0, scoreGridColumnCount() - state.game.players.length);
  return `
    <tr class="${extraClass}">
      <td>${renderScoreLineLabel(label, "", info)}</td>
      ${state.game.players.map((player) => `<td class="${scorePlayerClass(player)}"><span class="summary-value">${getter(player)}</span></td>`).join("")}
      ${emptyScoreCells(fillerCount)}
    </tr>
  `;
}

function scoreRow(category) {
  const playable = isCategoryPlayable(category);
  const forcedNext = isForcedNextCategory(category);
  const fillerCount = Math.max(0, scoreGridColumnCount() - state.game.players.length);
  const classes = [
    "score-entry-row",
    `score-${category.section}`,
    `score-row-${category.id}`,
    playable ? "is-playable-row" : "",
    forcedNext ? "is-forced-next" : "",
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
  const previewAvailable = Object.prototype.hasOwnProperty.call(game.scorePreview, category.id);
  return (
    isMyTurn()
    && game.rollsUsed >= game.scoreReadyRolls
    && me()?.scores?.[category.id] === null
    && (!game.forcedMode || game.nextForcedCategoryId === category.id || previewAvailable)
  );
}

function isForcedNextCategory(category) {
  const game = state.game;
  return Boolean(game?.forcedMode && game.nextForcedCategoryId === category.id);
}

function renderCategoryLabel(category) {
  const note = categoryNote(category);
  return renderScoreLineLabel(classicCategoryLabel(category), categoryIconHtml(category), categoryInfoText(category), note);
}

function renderScoreLineLabel(label, prefix = "", info = "", note = "") {
  return `
    <span class="score-line-label">
      ${prefix}
      <span class="score-label-text">${escapeHtml(label)}</span>
      ${note ? ` <small>${escapeHtml(note)}</small>` : ""}
      ${info ? renderScoreInfo(info) : ""}
    </span>
  `;
}

function renderScoreInfo(info) {
  const safeInfo = escapeHtml(info);
  return `
    <span class="score-info">
      <button class="score-info-button" type="button" aria-label="${safeInfo}">?</button>
      <span class="score-info-popover" role="tooltip">${safeInfo}</span>
    </span>
  `;
}

function categoryIconHtml(category) {
  if (category.section !== "upper" || !category.face) return "";
  return `<span class="score-die-icon" aria-hidden="true">&#${9855 + category.face};</span>`;
}

function latestMoveMessage(game) {
  const log = game?.log || [];
  const latestMove = log.find((entry) => (
    entry.message.includes("kastet")
    || entry.message.includes("skrev")
    || entry.message.includes("sparte")
    || entry.message.includes("slapp")
  ));
  return latestMove?.message || "";
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

function bonusInfoText(game) {
  const settings = effectiveRuleSettings(game);
  return `Trenger ${settings.upperBonusThreshold} poeng på øvre del. Gir ${settings.upperBonus} bonuspoeng.`;
}

function categoryInfoText(category) {
  const settings = effectiveRuleSettings();
  if (category.id === "yatzy") return `Fem like gir ${settings.yatzyScore} poeng.`;
  if (category.id === "maxiYatzy") return `Seks like gir ${settings.yatzyScore} poeng.`;
  if (category.id === "fullStraight") return `Full straight gir ${settings.fullStraightScore} poeng.`;
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

  const canScore = isCategoryPlayable(category) && player.seatId === state.seatId;
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

function focusChatInput() {
  if (!els.chatInput) return;
  window.requestAnimationFrame(() => {
    if (!els.chatInput || els.chatInput.disabled) return;
    els.chatInput.focus({ preventScroll: true });
    els.chatInput.setSelectionRange(els.chatInput.value.length, els.chatInput.value.length);
  });
}

function maybeCelebrateYatzy(previous, next) {
  if (!previous || !next || previous.code !== next.code) return;
  for (const nextPlayer of next.players || []) {
    const previousPlayer = previous.players?.find((player) => player.seatId === nextPlayer.seatId);
    for (const categoryId of YATZY_CATEGORY_IDS) {
      const score = nextPlayer.scores?.[categoryId];
      const previousScore = previousPlayer?.scores?.[categoryId];
      const key = `${next.code}:${nextPlayer.seatId}:${categoryId}`;
      if (Number(score) > 0 && previousScore !== score && !state.celebratedYatzies.has(key)) {
        state.celebratedYatzies.add(key);
        showYatzyCelebration(nextPlayer.name, score, categoryId === "maxiYatzy" ? "Maxiyatzy" : "Yatzy");
        return;
      }
    }
  }
}

function showYatzyCelebration(playerName, points, label) {
  if (!els.celebrationLayer) {
    showToast(`${label}! ${playerName} fikk ${points}.`);
    playYatzySound();
    return;
  }

  window.clearTimeout(state.celebrationTimer);
  els.celebrationLayer.classList.remove("is-game-over");
  els.celebrationLayer.setAttribute("aria-hidden", "false");
  els.celebrationLayer.innerHTML = `
    ${renderConfetti()}
    <div class="celebration-banner">
      <strong>${escapeHtml(label)}!</strong>
      <span>${escapeHtml(playerName)} fikk ${points}</span>
    </div>
  `;
  els.celebrationLayer.classList.add("is-visible");
  playYatzySound();

  state.celebrationTimer = window.setTimeout(() => {
    hideYatzyCelebration();
  }, 2800);
}

function hideYatzyCelebration() {
  if (!els.celebrationLayer) return;
  if (els.celebrationLayer.classList.contains("is-game-over")) return;
  hideOverlay();
}

function hideOverlay() {
  if (!els.celebrationLayer) return;
  window.clearTimeout(state.celebrationTimer);
  els.celebrationLayer.classList.remove("is-visible", "is-game-over");
  els.celebrationLayer.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!els.celebrationLayer.classList.contains("is-visible")) {
      els.celebrationLayer.innerHTML = "";
    }
  }, 260);
}

function renderConfetti() {
  return Array.from({ length: 44 }, (_, index) => {
    const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
    const left = Math.round(Math.random() * 100);
    const drift = Math.round(Math.random() * 180 - 90);
    const spin = Math.round(Math.random() * 720 - 360);
    const delay = (Math.random() * 0.34).toFixed(2);
    return `<i class="confetti-piece" style="--x:${left}vw;--drift:${drift}px;--spin:${spin}deg;--delay:${delay}s;--color:${color};"></i>`;
  }).join("");
}

function renderGameOverOverlay() {
  if (!els.celebrationLayer || !state.game) return;
  if (state.game.status !== "finished") {
    if (els.celebrationLayer.classList.contains("is-game-over")) hideOverlay();
    return;
  }

  window.clearTimeout(state.celebrationTimer);
  const winners = state.game.winners || [];
  const winnerNames = winners.map((winner) => winner.name).join(", ");
  const winnerTitle = winners.length > 1 ? "Uavgjort!" : `${winnerNames || "Vinneren"} vant!`;
  const sortedPlayers = [...state.game.players].sort((a, b) => b.totals.total - a.totals.total);

  els.celebrationLayer.innerHTML = `
    <div class="game-over-dialog" role="dialog" aria-modal="true" aria-labelledby="gameOverTitle">
      <p class="eyebrow">Ferdig ark</p>
      <h2 id="gameOverTitle">${escapeHtml(winnerTitle)}</h2>
      <div class="final-scoreboard">
        ${sortedPlayers.map((player, index) => `
          <div class="final-score-row ${winners.some((winner) => winner.seatId === player.seatId) ? "is-winner" : ""}">
            <span>${index + 1}</span>
            <strong>${escapeHtml(player.name)}</strong>
            <b>${player.totals.total}</b>
          </div>
        `).join("")}
      </div>
      <button class="primary action-button" type="button" data-play-again ${state.pending ? "disabled" : ""}>Spill igjen</button>
    </div>
  `;
  els.celebrationLayer.classList.add("is-visible", "is-game-over");
  els.celebrationLayer.setAttribute("aria-hidden", "false");
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
if (els.rulesToggle) {
  els.rulesToggle.addEventListener("click", () => {
    state.rulesPanelOpen = !state.rulesPanelOpen;
    playClickSound();
    render();
  });
}
if (els.rulesPanel) {
  els.rulesPanel.addEventListener("submit", async (event) => {
    event.preventDefault();
    await action("settings", collectRuleSettings());
  });
}
if (els.forcedModeToggle) {
  els.forcedModeToggle.addEventListener("change", handleForcedModeDraftChange);
}
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
if (els.celebrationLayer) {
  els.celebrationLayer.addEventListener("click", (event) => {
    const button = event.target.closest("[data-play-again]");
    if (!button) return;
    action("restart");
  });
}
document.addEventListener("pointerdown", () => ensureAudioContext(), { once: true });
document.addEventListener("keydown", () => ensureAudioContext(), { once: true });
document.addEventListener("keydown", handleRollShortcut);
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
