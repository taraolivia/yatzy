const els = {
  connection: document.querySelector("#connection"),
  setupView: document.querySelector("#setupView"),
  gameView: document.querySelector("#gameView"),
  createForm: document.querySelector("#createForm"),
  joinForm: document.querySelector("#joinForm"),
  createName: document.querySelector("#createName"),
  joinName: document.querySelector("#joinName"),
  roomCode: document.querySelector("#roomCode"),
  topbarRoom: document.querySelector("#topbarRoom"),
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
  hostControls: document.querySelector("#hostControls"),
  startGame: document.querySelector("#startGame"),
  diceTable: document.querySelector("#diceTable"),
  dice3dStage: document.querySelector("#dice3dStage"),
  legacyDiceRow: document.querySelector("#diceRow"),
  activeDiceRow: document.querySelector("#activeDiceRow"),
  heldDiceRow: document.querySelector("#heldDiceRow"),
  activeDiceLabel: document.querySelector("#activeDiceLabel"),
  heldDiceLabel: document.querySelector("#heldDiceLabel"),
  rollDice: document.querySelector("#rollDice"),
  rollStatus: document.querySelector("#rollStatus"),
  rollMeta: document.querySelector("#rollMeta"),
  syncRecovery: document.querySelector("#syncRecovery"),
  syncRecoveryText: document.querySelector("#syncRecoveryText"),
  syncRecoveryAction: document.querySelector("#syncRecoveryAction"),
  diceCustomizer: document.querySelector("#diceCustomizer"),
  feltCustomizer: document.querySelector("#feltCustomizer"),
  soundToggle: document.querySelector("#soundToggle"),
  scoreLastMove: document.querySelector("#scoreLastMove"),
  scoreTable: document.querySelector("#scoreTable"),
  gameLog: document.querySelector("#gameLog"),
  chatForm: document.querySelector("#chatForm"),
  chatComposePreview: document.querySelector("#chatComposePreview"),
  chatInput: document.querySelector("#chatInput"),
  chatEmojiToggle: document.querySelector("#chatEmojiToggle"),
  chatEmojiPanel: document.querySelector("#chatEmojiPanel"),
  chatShortcutSuggestions: document.querySelector("#chatShortcutSuggestions"),
  chatList: document.querySelector("#chatList"),
  sendChat: document.querySelector("#sendChat"),
  confirmDialog: document.querySelector("#confirmDialog"),
  confirmDialogIcon: document.querySelector("#confirmDialogIcon"),
  confirmDialogEyebrow: document.querySelector("#confirmDialogEyebrow"),
  confirmDialogTitle: document.querySelector("#confirmDialogTitle"),
  confirmDialogMessage: document.querySelector("#confirmDialogMessage"),
  confirmCancel: document.querySelector("#confirmCancel"),
  confirmConfirm: document.querySelector("#confirmConfirm"),
  playScoreResizer: document.querySelector("#playScoreResizer"),
  scoreRoomResizer: document.querySelector("#scoreRoomResizer"),
  chatFlowResizer: document.querySelector("#chatFlowResizer"),
  celebrationLayer: document.querySelector("#celebrationLayer"),
  toast: document.querySelector("#toast"),
};

const state = {
  game: null,
  playerToken: null,
  seatId: null,
  events: null,
  pending: false,
  chatPending: false,
  chatEmojiPanelOpen: false,
  chatShortcutSuggestions: {
    open: false,
    matches: [],
    activeIndex: 0,
    tokenStart: -1,
    tokenEnd: -1,
  },
  pendingIncomingGame: null,
  incomingRollFinishing: false,
  syncIssue: null,
  confirmPrompt: {
    resolve: null,
    previouslyFocused: null,
  },
  playerMenuSeatId: null,
  toastTimer: null,
  celebrationTimer: null,
  activeRollRecoveryTimer: null,
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
    modulePromise: null,
    theme: null,
    startPromise: null,
    rollPromise: null,
    settlePromise: null,
    settleResolve: null,
    forcedValues: [],
    startsAt: null,
    sizeKey: null,
    rollId: 0,
  },
  soundEnabled: loadSoundEnabled(),
  audioContext: null,
  rollAudio: null,
  rollAudioFailed: false,
  effectAudio: new Map(),
  failedEffectAudio: new Set(),
  soundedPlayers: new Set(),
  soundedScores: new Set(),
};

const DICE_THEMES = new Set(["default", "wooden", "blueGreenMetal", "rock", "smooth", "smooth-pip", "lavender", "gold", "glitter", "yellow"]);
const FELT_THEMES = new Set(["tavern", "green", "blue", "red", "mahogany", "steel"]);
const DICE_3D_SURFACE_THEMES = {
  tavern: "taverntable",
  green: "green-felt",
  blue: "blue-felt",
  red: "red-felt",
  mahogany: "mahogany",
  steel: "stainless",
};
const ROLL_SOUND_PATH = "/assets/sounds/dice-roll.mp3";
const SOUND_PATHS = {
  click: "/assets/sounds/click.mp3",
  join: "/assets/sounds/someone-joins-room.mp3",
  write: "/assets/sounds/write-numbers.mp3",
  crossOut: "/assets/sounds/cross-out.mp3",
  crossOutYatzy: "/assets/sounds/someone-crosses-out-yatzy.mp3",
  yatzy: "/assets/sounds/yatzy-yippee.mp3",
};
const DICE_3D_MODULE_PATH = "/vendor/dice-box-threejs/dice-box-threejs.es.js?v=20260719-rounded-d6";
const DICE_3D_ASSET_PATH = "/vendor/dice-box-threejs/";
const DICE_3D_START_TIMEOUT_MS = 8000;
const DICE_3D_ROLL_TIMEOUT_MS = 16000;
const DICE_3D_SETTLE_PAD_MS = 350;
const DICE_3D_SYNC_START_MAX_WAIT_MS = 80;
const ROLL_RESULT_HOLD_MS = 700;
const ACTIVE_ROLL_RECOVERY_READY_MS = 31_000;
const DICE_3D_PHYSICS = {
  framerate: 1 / 50,
  shadows: false,
  sounds: false,
  color_spotlight: 0xfff6df,
  light_intensity: 0.98,
  gravity_multiplier: 370,
  baseScale: 86,
  strength: 1.32,
  theme_surface: "taverntable",
};
const DICE_3D_THROW_BOUNDS = {
  wallX: 0.78,
  wallY: 0.68,
  spawnX: 0.44,
  spawnY: 0.36,
  velocity: 0.98,
  lift: 1.08,
  spin: 1.55,
  lane: 0.24,
};
const DICE_3D_BODY_FEEL = {
  linearDamping: 0.065,
  angularDamping: 0.055,
  sleepSpeedLimit: 34,
  sleepTimeLimit: 1.28,
};
const DICE_3D_DIE_RADIUS = DICE_3D_PHYSICS.baseScale * 1.12;
const DICE_3D_THEMES = {
  default: {
    foreground: "#171614",
    background: "#fffdf7",
    outline: "#f4eadc",
    texture: "none",
    material: "glass",
  },
  wooden: {
    foreground: "#1b0f05",
    background: "#bd7d3f",
    outline: "#f0c28d",
    texture: "wood",
    material: "wood",
  },

  blueGreenMetal: {
    foreground: "#062e2d",
    background: "#70c8c0",
    outline: "#c7fff7",
    texture: "metal",
    material: "metal",
  },

  rock: {
    foreground: "#211e1a",
    background: "#b8aea3",
    outline: "#e2d8cb",
    texture: "stone",
    material: "none",
  },

  smooth: {
    foreground: "#3b1830",
    background: "#f3a3c8",
    outline: "#ffdceb",
    texture: "none",
    material: "plastic",
  },

  "smooth-pip": {
    foreground: "#151515",
    background: "#fffdf8",
    outline: "#f4eadc",
    texture: "none",
    material: "glass",
  },

  lavender: {
    foreground: "#27124d",
    background: "#cdb0ff",
    outline: "#eee4ff",
    texture: "none",
    material: "plastic",
  },

  gold: {
    foreground: "#fffaf0",
    background: "#f2c75c",
    outline: "#6b4307",
    texture: "metal",
    material: "metal",
  },

  glitter: {
    foreground: "#fffdf2",
    background: "#f8d86f",
    outline: "#7a4c08",
    texture: "glitter",
    material: "plastic",
  },

  yellow: {
    foreground: "#4a3400",
    background: "#ffe982",
    outline: "#fffbd3",
    texture: "none",
    material: "glass",
  },
};
const YATZY_CATEGORY_IDS = new Set(["yatzy", "maxiYatzy"]);
const CONFETTI_COLORS = ["#f4bf3f", "#e45c4f", "#1d8a70", "#2f6df6", "#ffffff"];
const SCRIBBY_ICON_BASE = "https://img.icons8.com/scribby/100/";
const SCRIBBY_ICON_SOURCES = {
  heart: { id: "GX9CDrPRBE9L" },
  "dollar-bag": { id: "qsJWlEBemdcF" },
  muscle: { id: "0QFN5n45U90Z" },
  "thumbs-up": { slug: "thumb-up" },
  phoenix: { id: "EY7SaUN366hk" },
  "medal-first-place": { id: "aKKkoJQm8mLA" },
  "broken-heart": { id: "vDnUelr3MyG4" },
  "witchs-hat": { id: "I5mHUSL24Ua5" },
  haze: { id: "w5R7cldc5mEM" },
  "chat-room": { id: "g40gvDEAPg4B" },
  "party-balloon": { id: "DBtM7FgSssCr" },
  "get-quote": { id: "DVT6qzRV4Y93" },
};
const SCRIBBY_AVATAR_ICONS = [
  ["european-dragon", "European dragon"],
  ["giraffe", "Giraffe"],
  ["dinosaur", "Dinosaur"],
  ["unicorn", "Unicorn"],
  ["dog", "Dog"],
  ["corgi", "Corgi"],
  ["frog", "Frog"],
  ["fox", "Fox"],
  ["cute-hamster", "Cute hamster"],
  ["cat", "Cat"],
  ["kawaii-dinosaur", "Kawaii dinosaur"],
  ["owl", "Owl"],
  ["snake", "Snake"],
  ["butterfly", "Butterfly"],
  ["shark", "Shark"],
  ["flamingo", "Flamingo"],
  ["lizard", "Lizard"],
  ["rabbit", "Rabbit"],
  ["elephant", "Elephant"],
  ["parrot", "Parrot"],
  ["octopus", "Octopus"],
  ["whale", "Whale"],
  ["horse", "Horse"],
  ["bumblebee", "Bumblebee"],
  ["chameleon", "Chameleon"],
  ["lion", "Lion"],
  ["cow", "Cow"],
  ["red-panda", "Red panda"],
  ["bear", "Bear"],
  ["mouse-animal", "Mouse"],
  ["giraffe-full-body", "Giraffe full body"],
  ["hedgehog", "Hedgehog"],
  ["hippopotamus", "Hippopotamus"],
  ["jellyfish", "Jellyfish"],
  ["clown-fish", "Clown fish"],
  ["alien", "Alien"],
  ["wizard", "Wizard"],
  ["witch", "Witch"],
  ["mummy", "Mummy"],
  ["frankensteins-monster", "Frankenstein's monster"],
  ["robot", "Robot"],
];
const SCRIBBY_ICON_NAMES = {
  ...Object.fromEntries(SCRIBBY_AVATAR_ICONS),
  action: "Action",
  approval: "Approval",
  book: "Book",
  checkmark: "Checkmark",
  "clear-symbol": "Clear",
  clover: "Clover",
  "code-file": "Code file",
  comments: "Comments",
  confetti: "Confetti",
  cool: "Cool",
  copy: "Copy",
  "angry-eye": "Angry eye",
  baby: "Baby",
  brain: "Brain",
  "broken-heart": "Broken heart",
  canola: "Canola",
  champagne: "Champagne",
  "chamomile-tea": "Chamomile tea",
  "chat-room": "Chat room",
  "chef-hat": "Chef hat",
  "child-tasty": "Child tasty",
  "christmas-star": "Christmas star",
  "clenched-fist": "Clenched fist",
  croissant: "Croissant",
  "crying-baby": "Crying baby",
  dice: "Dice",
  "dollar-bag": "Dollar bag",
  door: "Door",
  drama: "Drama",
  easy: "Easy",
  "edvard-munch": "Edvard Munch",
  evil: "Evil",
  eye: "Eye",
  "firework-explosion": "Firework explosion",
  "fire-heart": "Fire heart",
  "flash-on": "Flash on",
  forward: "Forward",
  "get-quote": "Get quote",
  goal: "Goal",
  "gold-pot": "Gold pot",
  guitar: "Guitar",
  hand: "Hand",
  "hang-10": "Hang 10",
  handshake: "Handshake",
  happy: "Happy",
  heart: "Heart",
  haze: "Haze",
  "high-volume": "Sound on",
  "human-torch": "Human torch",
  idea: "Idea",
  ignore: "Ignore",
  info: "Info",
  "in-love": "In love",
  joystick: "Joystick",
  lips: "Lips",
  lol: "LOL",
  "lol-surprise": "LOL surprise",
  maintenance: "Maintenance",
  "medal-first-place": "Medal first place",
  "medieval-crown": "Medieval crown",
  meeting: "Meeting",
  microphone: "Microphone",
  "monster-face": "Monster face",
  muscle: "Muscle",
  music: "Music",
  "music-record": "Music record",
  "musical-note": "Musical note",
  "nerf-gun": "Nerf gun",
  "no-audio": "Sound off",
  "no-entry": "No entry",
  "old-man": "Old man",
  "old-woman": "Old woman",
  orc: "Orc",
  "paper-plane": "Paper plane",
  "party-balloon": "Party balloon",
  phoenix: "Phoenix",
  pin: "Pin",
  play: "Play",
  redo: "Redo",
  "sad-ghost": "Sad ghost",
  "sad-sun": "Sad sun",
  save: "Save",
  scream: "Scream",
  "send-file": "Send file",
  "small-hearts": "Small hearts",
  "smiling-mouth": "Smiling mouth",
  snail: "Snail",
  "sock-puppet": "Sock puppet",
  sparkling: "Sparkling",
  spring: "Spring",
  star: "Star",
  "stop-sign": "Stop sign",
  "sun-glasses": "Sun glasses",
  sword: "Sword",
  "thumb-up": "Thumb up",
  "thumbs-down": "Thumbs down",
  "thumbs-up": "Thumbs up",
  "thor-hammer": "Thor hammer",
  trophy: "Trophy",
  undo: "Undo",
  volunteering: "Volunteering",
  wrench: "Wrench",
  "witchs-hat": "Witch's hat",
  "year-of-dragon": "Year of dragon",
};
const CHAT_REACTION_ICONS = {
  star: { icon: "star", emoji: "⭐", label: "Star" },
  heart: { icon: "heart", emoji: "❤️", label: "Heart" },
  "dollar-bag": { icon: "dollar-bag", emoji: "💰", label: "Dollar bag" },
  sparkling: { icon: "sparkling", emoji: "✨", label: "Sparkling" },
  handshake: { icon: "handshake", emoji: "🤝", label: "Handshake" },
  goal: { icon: "goal", emoji: "🥅", label: "Goal" },
  dice: { icon: "dice", emoji: "🎲", label: "Dice" },
  "firework-explosion": { icon: "firework-explosion", emoji: "🎆", label: "Firework explosion" },
  brain: { icon: "brain", emoji: "🧠", label: "Brain" },
  muscle: { icon: "muscle", emoji: "💪", label: "Muscle" },
  sword: { icon: "sword", emoji: "⚔️", label: "Sword" },
  "stop-sign": { icon: "stop-sign", emoji: "🛑", label: "Stop sign" },
  volunteering: { icon: "volunteering", emoji: "🤲", label: "Volunteering" },
  "thumbs-up": { icon: "thumbs-up", emoji: "👍", label: "Thumbs up" },
  happy: { icon: "happy", emoji: "😄", label: "Happy" },
  phoenix: { icon: "phoenix", emoji: "🐦‍🔥", label: "Phoenix" },
  spring: { icon: "spring", emoji: "🌱", label: "Spring" },
  door: { icon: "door", emoji: "🚪", label: "Door" },
  orc: { icon: "orc", emoji: "🧌", label: "Orc" },
  canola: { icon: "canola", emoji: "🌼", label: "Canola" },
  lol: { icon: "lol", emoji: "😂", label: "LOL" },
  "medieval-crown": { icon: "medieval-crown", emoji: "👑", label: "Medieval crown" },
  baby: { icon: "baby", emoji: "👶", label: "Baby" },
  lips: { icon: "lips", emoji: "👄", label: "Lips" },
  easy: { icon: "easy", emoji: "😌", label: "Easy" },
  "smiling-mouth": { icon: "smiling-mouth", emoji: "🙂", label: "Smiling mouth" },
  "hang-10": { icon: "hang-10", emoji: "🤙", label: "Hang 10" },
  hand: { icon: "hand", emoji: "👋", label: "Hand" },
  champagne: { icon: "champagne", emoji: "🍾", label: "Champagne" },
  "flash-on": { icon: "flash-on", emoji: "⚡", label: "Flash on" },
  "chamomile-tea": { icon: "chamomile-tea", emoji: "🍵", label: "Chamomile tea" },
  "chef-hat": { icon: "chef-hat", emoji: "👨‍🍳", label: "Chef hat" },
  "thumbs-down": { icon: "thumbs-down", emoji: "👎", label: "Thumbs down" },
  "year-of-dragon": { icon: "year-of-dragon", emoji: "🐉", label: "Year of dragon" },
  "christmas-star": { icon: "christmas-star", emoji: "🌟", label: "Christmas star" },
  "medal-first-place": { icon: "medal-first-place", emoji: "🥇", label: "Medal first place" },
  "edvard-munch": { icon: "edvard-munch", emoji: "😱", label: "Edvard Munch" },
  evil: { icon: "evil", emoji: "😈", label: "Evil" },
  "broken-heart": { icon: "broken-heart", emoji: "💔", label: "Broken heart" },
  "in-love": { icon: "in-love", emoji: "😍", label: "In love" },
  drama: { icon: "drama", emoji: "🎭", label: "Drama" },
  "witchs-hat": { icon: "witchs-hat", emoji: "🧙", label: "Witch's hat" },
  croissant: { icon: "croissant", emoji: "🥐", label: "Croissant" },
  "human-torch": { icon: "human-torch", emoji: "🔥", label: "Human torch" },
  "old-man": { icon: "old-man", emoji: "👴", label: "Old man" },
  "child-tasty": { icon: "child-tasty", emoji: "😋", label: "Child tasty" },
  "angry-eye": { icon: "angry-eye", emoji: "👁️", label: "Angry eye" },
  "thor-hammer": { icon: "thor-hammer", emoji: "🔨", label: "Thor hammer" },
  "gold-pot": { icon: "gold-pot", emoji: "🪙", label: "Gold pot" },
  haze: { icon: "haze", emoji: "🌫️", label: "Haze" },
  snail: { icon: "snail", emoji: "🐌", label: "Snail" },
  "clenched-fist": { icon: "clenched-fist", emoji: "✊", label: "Clenched fist" },
  "sad-sun": { icon: "sad-sun", emoji: "🌥️", label: "Sad sun" },
  "sun-glasses": { icon: "sun-glasses", emoji: "😎", label: "Sun glasses" },
  "lol-surprise": { icon: "lol-surprise", emoji: "🤣", label: "LOL surprise" },
  "crying-baby": { icon: "crying-baby", emoji: "😭", label: "Crying baby" },
  "old-woman": { icon: "old-woman", emoji: "👵", label: "Old woman" },
  "sock-puppet": { icon: "sock-puppet", emoji: "🧦", label: "Sock puppet" },
  action: { icon: "action", emoji: "🎬", label: "Action" },
  ignore: { icon: "ignore", emoji: "🙈", label: "Ignore" },
  "nerf-gun": { icon: "nerf-gun", emoji: "🔫", label: "Nerf gun" },
};
const CHAT_EMOJI_PANEL_SHORTCUTS = [
  "star", "heart", "dollar-bag", "sparkling", "handshake", "goal", "dice", "firework-explosion", "brain", "muscle",
  "sword", "stop-sign", "volunteering", "thumbs-up", "happy", "phoenix", "spring", "door", "orc", "canola",
  "lol", "medieval-crown", "baby", "lips", "easy", "smiling-mouth", "hang-10", "hand", "champagne", "flash-on",
  "chamomile-tea", "chef-hat", "thumbs-down", "year-of-dragon", "christmas-star", "medal-first-place", "edvard-munch", "evil", "broken-heart", "in-love",
  "drama", "witchs-hat", "croissant", "human-torch", "old-man", "child-tasty", "angry-eye", "thor-hammer", "gold-pot", "haze",
  "snail", "clenched-fist", "sad-sun", "sun-glasses", "lol-surprise", "crying-baby", "old-woman", "sock-puppet", "action", "ignore",
  "nerf-gun",
];
Object.assign(CHAT_REACTION_ICONS, {
  cry: { icon: "sad-ghost", emoji: "😢", label: "Cry" },
  sob: { icon: "crying-baby", emoji: "😭", label: "Sob" },
  laugh: { icon: "lol", emoji: "😂", label: "Laugh" },
  smile: { icon: "smiling-mouth", emoji: "🙂", label: "Smile" },
  grin: { icon: "happy", emoji: "😀", label: "Grin" },
  wink: { icon: "in-love", emoji: "😉", label: "Wink" },
  love: { icon: "heart", emoji: "❤️", label: "Love" },
  fire: { icon: "human-torch", emoji: "🔥", label: "Fire" },
  clap: { icon: "hand", emoji: "👏", label: "Clap" },
  party: { icon: "party-balloon", emoji: "🥳", label: "Party" },
  tada: { icon: "firework-explosion", emoji: "🎉", label: "Tada" },
  yatzy: { icon: "dice", emoji: "🎲", label: "Yatzy" },
  yes: { icon: "checkmark", emoji: "✅", label: "Yes" },
  no: { icon: "no-entry", emoji: "❌", label: "No" },
  ok: { icon: "approval", emoji: "👌", label: "OK" },
  thumbsup: { icon: "thumbs-up", emoji: "👍", label: "Thumbs up" },
  "thumb-up": { icon: "thumbs-up", emoji: "👍", label: "Thumb up" },
  thumbs: { icon: "thumbs-up", emoji: "👍", label: "Thumbs up" },
  "+1": { icon: "thumbs-up", emoji: "👍", label: "Thumbs up" },
  "-1": { icon: "thumbs-down", emoji: "👎", label: "Thumbs down" },
  thanks: { icon: "volunteering", emoji: "🙏", label: "Thanks" },
  eyes: { icon: "eye", emoji: "👀", label: "Eyes" },
  thinking: { icon: "brain", emoji: "🤔", label: "Thinking" },
  wow: { icon: "edvard-munch", emoji: "😮", label: "Wow" },
  oops: { icon: "monster-face", emoji: "😬", label: "Oops" },
  cool: { icon: "sun-glasses", emoji: "😎", label: "Cool" },
  lucky: { icon: "clover", emoji: "🍀", label: "Lucky" },
  gg: { icon: "handshake", emoji: "🤝", label: "GG" },
  sparkles: { icon: "sparkling", emoji: "✨", label: "Sparkles" },
  moneybag: { icon: "dollar-bag", emoji: "💰", label: "Money bag" },
  "money-bag": { icon: "dollar-bag", emoji: "💰", label: "Money bag" },
  guitar: { icon: "guitar", emoji: "🎸", label: "Guitar" },
  music: { icon: "music", emoji: "🎵", label: "Music" },
  "musical-note": { icon: "musical-note", emoji: "🎶", label: "Musical note" },
  microphone: { icon: "microphone", emoji: "🎤", label: "Microphone" },
  "music-record": { icon: "music-record", emoji: "💿", label: "Music record" },
});
const CHAT_EMOJI_SHORTCUTS = {
  ...Object.fromEntries(Object.entries(CHAT_REACTION_ICONS).map(([key, entry]) => [key, entry.emoji])),
};
const CHAT_EMOJI_ICON_ENTRIES = Object.values(CHAT_REACTION_ICONS)
  .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.emoji === entry.emoji) === index)
  .sort((a, b) => b.emoji.length - a.emoji.length);
const CHAT_PRIMARY_SHORTCUT_SET = new Set(CHAT_EMOJI_PANEL_SHORTCUTS);
const CHAT_SHORTCUT_SUGGESTION_KEYS = [
  ...CHAT_EMOJI_PANEL_SHORTCUTS,
  ...Object.keys(CHAT_REACTION_ICONS).filter((key) => !CHAT_PRIMARY_SHORTCUT_SET.has(key)).sort((a, b) => a.localeCompare(b)),
];
const CHAT_SHORTCUT_SUGGESTION_LIMIT = 8;
const TONES_YATZY_LYRIC_ICON_KEY = "guitar";
// Add short user-provided lyric excerpts here; the button sends them in order.
const TONES_YATZY_LYRIC_LINES = [
  "Sitta tett innte, trilla terningane, og kos' okke ",
  "akkurat som om me va på hytto",
  "Skal me spela yatzy, skal me spela yatzy",
  "åååååh, skal me spela yatzy",
  "Dar e plass te ein te i sofaen, trekk i hoba, så begynne me, komman",
  "Ett par i to, ett par i to, blir det mesten ingen poeng utav",
  "Og stor straight, det må du mesten få på fyssta kastet",
  "Hvis du ikkje he sjansen igjen, te å ha det på",
  "Hvis det sko skjæra seg e det bare ein ting å sei, det e galskap",
  "Og stor straight, det må du mesten få på fyssta kastet",
  "Du må gjerna styrka noge, du må gjerna stryka noge",
  "Du he brukt opp sjansen: kå ska du stryka då?",
  "Då kan du for eksempel stryka einarane",
  "Å ja du he ett par, å nei du he'kje ett par",
  "Du må'kje røra terningane før eg he sitt på di",
  "Du får trilla om igjen",
  "Åh, det e vanskelig å få, alle fem like i yatzy. Det e vanskelig å få, alle fem like i yatzy",
  "Det gjelde å få tri av kver sort, der oppe. Då fer du bonus, den e'kje dum å ha",
  "Nei, det gjelde ikkje på golvet",
  "Hus e noge drid å sitta igjen med, vanskelig å få",
  "Når det nimma seg slutten, og det begynne å røyne på",
  "Hus e noge drid å sitta igjen med då",
  "Åh, det e vanskelig å få, alle fem like i yatzy. ",
  "Det e vanskelig å få, alle fem like i yatzy",
  "Åh, du kan sei at hvis du fer yatzy, og de andre ikkje fer det he du nesten garantert vonne",
  "Åh, fer du ikkje bonus, det vil sei tre av kver sort der oppe,",
  "he du så godt som taaaaapt",
];
const CHAT_CRINGY_QUOTES = [
  "You miss 100% of the shots you don't take.",
  "What if I fall? Oh my darling, but what if you fly?",
  "Live, laugh, Yatzy.",
  "Throw kindness around like confetti.",
  "Dream big, roll bigger.",
  "Good vibes only, bad dice temporarily.",
  "The comeback is always stronger than the setback.",
  "Be the energy you want at the table.",
  "Stars can't shine without darkness.",
  "Believe you can, then roll like you do.",
  "Your vibe attracts your tribe.",
  "Every roll is a fresh start.",
  "Stay humble, sparkle hard.",
  "If opportunity doesn't knock, roll the dice.",
  "You didn't come this far to only come this far.",
  "Manifesting sixes and inner peace.",
  "Slay the day.",
  "The only bad roll is the one you didn't believe in.",
  "In my Yatzy era.",
  "Let go and let dice.",
  "Stay calm and roll on.",
  "Family Rules: Laugh a lot! Love more! Tell the Truth! Family First! Work Hard! Have Fun! Be yourself! When you don't know, pray!",
  "Bless this mess!",
  "Not all who wander are lost.",
  "Dance like no ones watching, sing like no ones listening, live each day like it's your last",
  "Hadde det vore lett hadde addle fått det",
  "When life gives you dice, make Yatzy.",
  "Keep your friends close and your sixes closer.",
  "Roll with your heart, score with your soul.",
  "Some call it luck, I call it table energy.",
  "Born to roll, forced to calculate.",
  "You are one throw away from a personality change.",
  "If the dice are cold, warm them with belief.",
  "Big points, soft heart.",
  "Trust the process, blame the dice.",
  "Today is a good day to be statistically unreasonable.",
  "Throw like nobody is judging the scorecard.",
  "You can't spell Yatzy without zesty.",
  "May your rolls be high and your drama be low.",
  "A little luck looks good on you.",
  "Roll first, overthink later.",
  "Sparkle like a bonus you barely earned.",
  "Every champion once crossed out a category.",
  "Good things come to those who shake.",
  "Be brave enough to chase the upper bonus.",
  "Manifest, roll, repeat.",
  "This table runs on hope and snacks.",
  "If you can dream it, you can probably roll three twos instead.",
  "Let the dice decide, then take credit.",
  "Confidence is silent. Yatzy is loud.",
  "Your future is bright and possibly full of fives.",
  "When in doubt, save the sixes.",
  "The scorecard believes in you.",
  "Chin up, dice cup out.",
  "Tiny cubes, huge feelings.",
  "Rolls before woes.",
  "You bring the sparkle, the dice bring the suspense.",
  "Luck is just preparation wearing glitter.",
  "A full house starts with an open heart.",
  "Keep calm and pretend this was the plan.",
  "Sixes are temporary, friendship is forever.",
  "Dreams don't work unless you shake them.",
  "Your destiny has pips on it.",
  "Be the reason someone says, wow, rude roll.",
  "No risk, no ridiculous victory speech.",
  "Soft hearts, sharp pencils, hot dice.",
  "Bloom where you're planted, even if the pot is weird.",
  "Your sparkle has excellent timing.",
  "Progress counts, even in slippers.",
  "Kindness is always in season.",
  "Tiny steps still move mountains eventually.",
  "Collect moments, not excuses.",
  "Today deserves your best messy try.",
  "Be a little kinder than necessary.",
  "Let your weird be your wisdom.",
  "Sunshine looks good on a stubborn heart.",
  "You are enough, and then some.",
  "Make today so sweet it needs a warning label.",
  "Big dreams love small starts.",
  "Good energy is a group project.",
  "Your comfort zone called; it misses your sparkle.",
  "Do it scared, but do it with snacks.",
  "Life is short; make it unnecessarily charming.",
  "Confidence is just hope with better posture.",
  "Turn the page, underline the lesson.",
  "Be the plot twist you hoped for.",
  "Some days are soup; bring a spoon.",
  "Keep going. Future you is already bragging.",
  "Your best is allowed to look different today.",
  "Dreams need deadlines and decent coffee.",
  "Choose joy, but keep receipts.",
  "Small wins are still wins.",
  "Let today be suspiciously nice.",
  "You glow different when you stop explaining yourself.",
  "Make space for magic and clean socks.",
  "Romanticize the errand.",
  "Be soft, stay stubborn.",
  "Your courage can start at very low volume.",
  "Water your own garden first.",
  "Bad days make good stories later.",
  "Smile like you know the Wi-Fi password.",
  "Everything is figureoutable with snacks and a chair.",
  "The comeback can be in sweatpants.",
  "Be the main character in your grocery list.",
  "Life is a group chat; send something kind.",
  "Grow through what you go through, preferably hydrated.",
  "You have survived 100 percent of your awkward phases.",
  "Rest is part of the sparkle strategy.",
  "Put a little glitter on the agenda.",
  "Start where you are, with what you have, and maybe a snack.",
  "Do less doom, more bloom.",
  "Joy looks good on everybody.",
  "Your heart has good taste.",
  "Let the little things be loudly lovely.",
  "Some miracles are just good timing and clean laundry.",
  "Be brave enough to be cringe.",
  "You are not behind; you are buffering with style.",
  "Today's forecast: partly chaotic, fully lovable.",
  "Keep your hopes high and your standards higher.",
  "One tiny yes can change the room.",
  "The best view comes after the weird uphill part.",
  "Your sparkle is not a limited resource.",
  "Mistakes are just plot development.",
  "Make peace with the pace.",
  "Good things can still find your address.",
  "Blessed, stressed, and doing my best.",
  "Be the calm in your own tiny weather system.",
  "Every day is a fresh sticky note.",
  "Less perfection, more participation.",
  "Don't quit before the good bit.",
  "Your future self sent a tiny thumbs up.",
  "When nothing goes right, add cheese.",
  "Soft launch your confidence.",
  "Big heart, small panic, onward.",
  "The vibe is recovery and snacks.",
  "Hustle gently.",
  "May your coffee be strong and your boundaries stronger.",
  "Keep it cute, keep it moving.",
  "Your ordinary day is someone's dream day.",
  "Look at you, becoming and everything.",
  "Hope is a practical accessory.",
  "Make room for the nice surprise.",
  "Stay golden, stay hydrated.",
  "You are the secret ingredient.",
  "Let joy be slightly embarrassing.",
  "The universe loves a dramatic entrance.",
  "High standards, low drama.",
  "Do the thing. Wear the outfit.",
  "Your peace is worth the awkward conversation.",
  "A little delusion can be seasoning.",
  "Be sincere. It confuses the algorithm.",
  "You are doing better than your browser tabs suggest.",
  "Today's mantra: more sparkle, less spiral.",
  "Rise, shine, and mildly overcommit.",
  "Never underestimate a fresh notebook.",
  "Keep your chin up and your snacks nearby.",
  "Your dream called; it said stop ghosting it.",
  "Normal is a setting on appliances.",
  "May your day be gentle and your leftovers excellent.",
  "Let the lesson be lighter than the guilt.",
  "Somebody has to be iconic; might as well be you.",
  "Your magic is in the trying.",
  "Make the mundane flirt back.",
  "Drink water and cause a small amount of wonder.",
  "Create the vibe you hoped someone else would bring.",
  "You can be a masterpiece and a work in progress with laundry to fold.",
  "Keep showing up for the person you're becoming.",
  "Main character energy, responsible bedtime edition.",
  "Cry a little, sparkle a lot.",
  "Brighter days are taking attendance.",
  "The heart wants what it wants, and sometimes it wants fries.",
  "Go where the good energy grows.",
  "Self-care, but make it slightly impractical.",
  "You're allowed to outgrow your old excuses.",
];

const pipMap = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
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
    seatId: localStorage.getItem(roomSeatKey(code)),
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

function saveFeltTheme(theme) {
  localStorage.setItem("yatzy:feltTheme", theme);
}

function loadFeltTheme() {
  const theme = localStorage.getItem("yatzy:feltTheme") || "tavern";
  return FELT_THEMES.has(theme) ? theme : "tavern";
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
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "Noe gikk galt.");
    error.status = response.status;
    error.payload = payload;
    throw error;
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
    body: JSON.stringify({ name, mode }),
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
    body: JSON.stringify({ name, playerToken }),
  });
  state.game = payload.game;
  saveIdentity(payload.game, payload.playerToken, payload.seatId);
  updateUrl(payload.game.code);
  connectEvents(payload.game.code);
  render();
}

async function action(name, extra = {}) {
  if (!state.game || state.pending) return;
  if (name === "roll") {
    await synchronizedRoll(extra);
    return;
  }

  const previousGame = state.game;
  state.pending = true;
  state.syncIssue = null;
  if (name === "settings") {
    state.game = { ...state.game, ...extra };
  }
  render();
  try {
    const payload = await requestJson(`/api/games/${state.game.code}/${name}`, {
      method: "POST",
      body: JSON.stringify({
        playerToken: state.playerToken,
        version: state.game.version,
        ...extra,
      }),
    });
    if (name === "score" || name === "undo") {
      playGameTransitionSounds(previousGame, payload.game);
      maybeCelebrateYatzy(previousGame, payload.game);
      state.game = payload.game;
    } else if (name === "start") {
      state.game = payload.game;
      playStartSound();
    } else if (name === "restart") {
      playGameTransitionSounds(previousGame, payload.game);
      state.game = payload.game;
      hideOverlay();
      playStartSound();
    } else {
      state.game = payload.game;
    }
  } catch (error) {
    if (name === "settings") state.game = previousGame;
    if (error.status === 409) {
      await recoverFromDesync(name);
    } else {
      showToast(error.message);
    }
  } finally {
    state.pending = false;
    render();
  }
}

async function synchronizedRoll(extra = {}) {
  if (!state.game || state.pending || state.isRolling || !isMyTurn()) return;
  if (state.game.activeRoll) {
    await recoverActiveRollLock("Kastet hang, men rommet er hentet inn. Du kan fortsette.");
    return;
  }
  const rollExtra = rollRequestExtra(extra);
  if (!canRollDice(rollExtra)) return;
  const previousGame = state.game;
  let rollPlan = null;
  let animationId = null;
  state.pending = true;
  state.syncIssue = null;
  render();

  try {
    const planned = await requestJson(`/api/games/${previousGame.code}/roll`, {
      method: "POST",
      body: JSON.stringify({
        playerToken: state.playerToken,
        version: previousGame.version,
        ...rollExtra,
      }),
    });
    rollPlan = planned.game.activeRoll;
    if (!rollPlan) throw new Error("Serveren opprettet ikke terningkastet.");

    state.game = planned.game;
    animationId = startRollAnimation(planned.game, { context: "local" });
    playRollSound();
    render();

    const visualDice = await diceValuesFromRollVisual();
    if (!visualDice || !isCurrentRollAnimation(animationId)) {
      throw new Error("Fantastic Dice fullf\u00f8rte ikke det serverbestemte kastet.");
    }

    stopRollAnimation(animationId);
    const completed = await requestJson(`/api/games/${previousGame.code}/complete`, {
      method: "POST",
      body: JSON.stringify({
        playerToken: state.playerToken,
        rollId: rollPlan.id,
      }),
    });
    state.game = completed.game;
    const queuedGame = takeQueuedIncomingGame(completed.game.version);
    if (queuedGame) state.game = queuedGame;
  } catch (error) {
    if (animationId !== null && isCurrentRollAnimation(animationId)) {
      stopRollAnimation(animationId);
    }
    if (rollPlan) await cancelSynchronizedRoll(rollPlan.id);
    if (error.status === 409) {
      await recoverFromDesync("roll");
    } else {
      showToast(error.message);
    }
  } finally {
    state.pending = false;
    render();
  }
}

async function cancelSynchronizedRoll(rollId) {
  if (!state.game || !rollId) return;
  try {
    const payload = await requestJson(`/api/games/${state.game.code}/cancel`, {
      method: "POST",
      body: JSON.stringify({ playerToken: state.playerToken, rollId }),
    });
    state.game = payload.game;
  } catch {
    // The server may already have repaired or completed the roll.
  }
}

async function recoverActiveRollLock(message = null) {
  if (!state.game?.activeRoll) return true;
  let recovered = false;
  state.pending = true;
  render();
  try {
    const nextGame = await refreshGameState();
    recovered = Boolean(nextGame && !nextGame.activeRoll);
    if (recovered) {
      showToast("Kastet er hentet inn.");
    } else {
      showToast("Vent til terningkastet er ferdig.");
    }
  } catch (error) {
    showToast(error.message);
  } finally {
    state.pending = false;
    if (recovered && message) {
      state.syncIssue = {
        canRetryRoll: canRollDice(),
        message,
      };
    }
    render();
  }
  return recovered;
}

async function recoverFromDesync(actionName) {
  if (!state.game) return;
  try {
    const payload = await requestJson(`/api/games/${state.game.code}`);
    cancelIncomingRollAnimation();
    state.game = payload.game;
    const canRetryRoll = actionName === "roll" && payload.game.status === "playing" && payload.game.currentSeatId === state.seatId && (payload.game.rollsLeft > 0 || payload.game.canUseSavedRoll) && !payload.game.activeRoll;
    state.syncIssue = {
      canRetryRoll,
      message: canRetryRoll ? "En oppdatering kom samtidig. Ingen kast ble brukt — du kan kaste på nytt." : "Spillet var ute av takt. Siste servertilstand er hentet inn.",
    };
    showToast("Synkronisert med rommet.");
  } catch (error) {
    state.syncIssue = {
      canRetryRoll: false,
      message: "Kunne ikke reparere automatisk. Kobler til rommet igjen.",
    };
    connectEvents(state.game.code);
  }
}

async function refreshGameState() {
  if (!state.game) return null;
  const payload = await requestJson(`/api/games/${state.game.code}`);
  cancelIncomingRollAnimation();
  state.game = payload.game;
  return payload.game;
}

async function sendChat(message, options = {}) {
  if (!state.game || !state.playerToken || state.chatPending) return;
  const { clearInput = true, kind = "message" } = options;
  const cleanMessage = expandChatEmojiShortcuts(message).trim();
  if (!cleanMessage) return;

  const shouldRefocus = document.activeElement === els.chatInput || document.activeElement === els.sendChat;
  state.chatPending = true;
  renderChat();
  try {
    const payload = await requestJson(`/api/games/${state.game.code}/chat`, {
      method: "POST",
      body: JSON.stringify({
        playerToken: state.playerToken,
        kind,
        message: cleanMessage,
      }),
    });
    state.game = payload.game;
    if (clearInput && els.chatInput) {
      els.chatInput.value = "";
      closeChatShortcutSuggestions();
      updateChatComposePreview();
    }
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
    receiveGameState(nextGame);
  });
  state.events.addEventListener("error", () => setConnection("Kobler til igjen"));
}

function receiveGameState(nextGame) {
  setConnection("Live");
  if (shouldQueueIncomingGame(nextGame)) {
    queueIncomingGame(nextGame);
    return;
  }
  applyIncomingGame(nextGame);
}

function shouldQueueIncomingGame(nextGame) {
  if (!state.game || state.game.code !== nextGame.code) return false;
  return state.isRolling || state.incomingRollFinishing;
}

function queueIncomingGame(nextGame) {
  if (!state.pendingIncomingGame || nextGame.version >= state.pendingIncomingGame.version) {
    state.pendingIncomingGame = nextGame;
  }
}

function takeQueuedIncomingGame(afterVersion) {
  const queuedGame = state.pendingIncomingGame;
  if (!queuedGame) return null;
  state.pendingIncomingGame = null;
  return queuedGame.version > afterVersion ? queuedGame : null;
}

function applyIncomingGame(nextGame) {
  const previousGame = state.game;
  if (previousGame && previousGame.code === nextGame.code && nextGame.version < previousGame.version) return;

  const shouldAnimate = shouldAnimateIncomingRoll(previousGame, nextGame);
  playGameTransitionSounds(previousGame, nextGame);
  maybeCelebrateYatzy(previousGame, nextGame);
  if (shouldAnimate) {
    void animateIncomingRoll(previousGame, nextGame);
    return;
  }

  cancelIncomingRollAnimation();
  state.game = nextGame;
  render();
}

function leaveRoomLocally() {
  if (state.events) state.events.close();
  clearActiveRollRecoveryRefresh();
  state.game = null;
  state.playerToken = null;
  state.seatId = null;
  state.pendingIncomingGame = null;
  state.incomingRollFinishing = false;
  state.celebratedYatzies.clear();
  state.soundedPlayers.clear();
  state.soundedScores.clear();
  state.rulesPanelOpen = false;
  hideOverlay();
  const url = new URL(window.location.href);
  url.searchParams.delete("room");
  window.history.replaceState({}, "", url);
  render();
}

async function leaveRoom() {
  if (!state.game || !state.playerToken) {
    leaveRoomLocally();
    return;
  }
  if (state.pending || state.isRolling) {
    showToast("Vent til terningkastet er ferdig.");
    return;
  }
  if (state.game.activeRoll && !(await recoverActiveRollLock())) return;
  if (state.game.status !== "lobby" && !(await confirmLeaveRoom())) return;

  state.pending = true;
  render();
  try {
    await requestJson(`/api/games/${state.game.code}/leave`, {
      method: "POST",
      body: JSON.stringify({
        playerToken: state.playerToken,
        version: state.game.version,
      }),
    });
    leaveRoomLocally();
    showToast("Du gikk ut av rommet.");
  } catch (error) {
    showToast(error.message);
  } finally {
    state.pending = false;
    render();
  }
}

function confirmLeaveRoom() {
  return showConfirmDialog({
    eyebrow: "Spillrom",
    title: "Forlate spillet?",
    message: "Du kan komme tilbake fra samme nettleser.",
    icon: "door",
    cancelLabel: "Bli her",
    confirmLabel: "Gå ut",
    confirmIcon: "door",
  });
}

function showConfirmDialog(options) {
  if (!els.confirmDialog || !els.confirmDialogEyebrow || !els.confirmDialogTitle || !els.confirmDialogMessage || !els.confirmDialogIcon || !els.confirmCancel || !els.confirmConfirm) {
    showToast(options.message || options.title || "Bekreftelse mangler.");
    return Promise.resolve(false);
  }

  if (state.confirmPrompt.resolve) {
    closeConfirmDialog(false, { restoreFocus: false });
  }

  const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  state.confirmPrompt.previouslyFocused = previouslyFocused;
  els.confirmDialogEyebrow.textContent = options.eyebrow || "";
  els.confirmDialogTitle.textContent = options.title || "";
  els.confirmDialogMessage.textContent = options.message || "";
  els.confirmDialogIcon.innerHTML = renderScribbyIcon(options.icon || "info", options.title || "Info", "scribby-icon confirm-dialog-icon");
  els.confirmCancel.innerHTML = renderIconButtonContent(options.cancelIcon || "undo", options.cancelLabel || "Avbryt");
  els.confirmConfirm.innerHTML = renderIconButtonContent(options.confirmIcon || "checkmark", options.confirmLabel || "OK");
  els.confirmDialog.removeAttribute("inert");
  els.confirmDialog.inert = false;
  els.confirmDialog.classList.add("is-visible");
  els.confirmDialog.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    state.confirmPrompt.resolve = resolve;
    window.requestAnimationFrame(() => {
      els.confirmCancel?.focus({ preventScroll: true });
    });
  });
}

function closeConfirmDialog(result, { restoreFocus = true } = {}) {
  if (!state.confirmPrompt.resolve) return;
  const resolve = state.confirmPrompt.resolve;
  const previouslyFocused = state.confirmPrompt.previouslyFocused;
  state.confirmPrompt.resolve = null;
  state.confirmPrompt.previouslyFocused = null;
  els.confirmDialog.classList.remove("is-visible");
  els.confirmDialog.setAttribute("aria-hidden", "true");
  els.confirmDialog.inert = true;
  els.confirmDialog.setAttribute("inert", "");
  resolve(Boolean(result));

  if (restoreFocus && previouslyFocused?.isConnected) {
    window.requestAnimationFrame(() => {
      previouslyFocused.focus({ preventScroll: true });
    });
  }
}

function isConfirmDialogOpen() {
  return Boolean(els.confirmDialog?.classList.contains("is-visible"));
}

function confirmDialogFocusableControls() {
  if (!els.confirmDialog) return [];
  return Array.from(els.confirmDialog.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"))
    .filter((control) => control instanceof HTMLElement && !control.matches(":disabled, [aria-disabled='true']"));
}

function handleConfirmDialogClick(event) {
  if (!(event.target instanceof Element)) return;
  const actionButton = event.target.closest("[data-confirm-action]");
  if (actionButton) {
    closeConfirmDialog(actionButton.dataset.confirmAction === "confirm");
    return;
  }

  if (event.target === els.confirmDialog) {
    closeConfirmDialog(false);
  }
}

function handleConfirmDialogKeydown(event) {
  if (!isConfirmDialogOpen()) return;

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeConfirmDialog(false);
    return;
  }

  if (event.key !== "Tab") return;
  const controls = confirmDialogFocusableControls();
  if (!controls.length) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const firstControl = controls[0];
  const lastControl = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === firstControl) {
    event.preventDefault();
    event.stopPropagation();
    lastControl.focus({ preventScroll: true });
  } else if (!event.shiftKey && document.activeElement === lastControl) {
    event.preventDefault();
    event.stopPropagation();
    firstControl.focus({ preventScroll: true });
  }
}

function currentPlayer() {
  if (!state.game) return null;
  return state.game.players.find((player) => player.seatId === state.game.currentSeatId) || null;
}

function me() {
  if (!state.game) return null;
  return state.game.players.find((player) => player.seatId === state.seatId) || null;
}

function amHost() {
  return Boolean(me()?.isHost || (state.game && state.game.hostSeatId === state.seatId));
}

function isActivePlayer(player) {
  return player?.isActive !== false;
}

function isMyTurn() {
  return Boolean(state.game && state.game.status === "playing" && state.game.currentSeatId === state.seatId);
}

function activeRollAge(activeRoll) {
  const startedAt = new Date(activeRoll?.startedAt).getTime();
  return Number.isFinite(startedAt) ? Date.now() - startedAt : 0;
}

function isActiveRollRecoverable(activeRoll = state.game?.activeRoll) {
  return Boolean(activeRoll && activeRollAge(activeRoll) >= ACTIVE_ROLL_RECOVERY_READY_MS);
}

function clearActiveRollRecoveryRefresh() {
  window.clearTimeout(state.activeRollRecoveryTimer);
  state.activeRollRecoveryTimer = null;
}

function scheduleActiveRollRecoveryRefresh(game = state.game) {
  clearActiveRollRecoveryRefresh();
  if (!game?.activeRoll || !isMyTurn()) return;
  const delay = Math.max(0, ACTIVE_ROLL_RECOVERY_READY_MS - activeRollAge(game.activeRoll) + 50);
  state.activeRollRecoveryTimer = window.setTimeout(() => {
    state.activeRollRecoveryTimer = null;
    if (!state.game?.activeRoll || !isMyTurn() || state.pending || state.isRolling) return;
    void recoverActiveRollLock("Kastet hang, men rommet er hentet inn. Du kan fortsette.");
  }, delay);
}

function canSeeLastScoreUndo() {
  const undo = state.game?.lastScoreUndo;
  if (!undo) return false;
  return undo.playerSeatId === state.seatId;
}

function canUndoLastScore() {
  return Boolean(canSeeLastScoreUndo() && !state.pending && !state.isRolling && !state.game?.activeRoll);
}

function canRollDice(extra = {}) {
  const baseRollAvailable = state.game?.rollsLeft > 0 && extra.useSavedRoll !== true;
  const savedRollAvailable = state.game?.canUseSavedRoll && (extra.useSavedRoll === true || state.game?.rollsLeft <= 0);
  return Boolean(
    state.game
    && isMyTurn()
    && (baseRollAvailable || savedRollAvailable)
    && !state.pending
    && !state.isRolling
  );
}

function rollRequestExtra(extra = {}) {
  if (state.game?.rollsLeft <= 0 && state.game?.canUseSavedRoll) {
    return { ...extra, useSavedRoll: true };
  }
  return extra;
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

function currentDiceTheme() {
  return document.body.dataset.diceTheme || loadDiceTheme();
}

function currentFeltTheme() {
  return document.body.dataset.feltTheme || loadFeltTheme();
}

function dice3dSurfaceTheme(theme = currentFeltTheme()) {
  return DICE_3D_SURFACE_THEMES[theme] || DICE_3D_SURFACE_THEMES.tavern;
}

function dice3dThemeConfig(theme = currentDiceTheme()) {
  const selected = DICE_3D_THEMES[theme] || DICE_3D_THEMES.default;
  return {
    theme_customColorset: {
      name: `yatzy-${theme}`,
      foreground: selected.foreground,
      background: selected.background,
      outline: selected.outline,
      texture: selected.texture,
      material: selected.material,
    },
    theme_colorset: "white",
    theme_texture: selected.texture,
    theme_material: selected.material,
  };
}

function preloadDice3dModule() {
  if (!els.dice3dStage || state.dice3d.modulePromise || state.dice3d.failed) return state.dice3d.modulePromise;
  state.dice3d.modulePromise = import(DICE_3D_MODULE_PATH).catch((error) => {
    state.dice3d.modulePromise = null;
    console.warn("3D dice preload failed:", error);
    return null;
  });
  return state.dice3d.modulePromise;
}

function scheduleDice3dPreload() {
  if (!els.dice3dStage || state.dice3d.modulePromise || state.dice3d.ready || state.dice3d.failed) return;
  const preload = () => preloadDice3dModule();
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(preload, { timeout: 1200 });
  } else {
    window.setTimeout(preload, 250);
  }
}

function prepareDice3d() {
  if (!els.dice3dStage || state.dice3d.ready || state.dice3d.failed) return state.dice3d.initPromise;
  if (state.dice3d.loading) return state.dice3d.initPromise;

  state.dice3d.loading = true;
  state.dice3d.initPromise = preloadDice3dModule()
    .then((module) => {
      if (!module?.default) throw new Error("Fantastic Dice-modulen ble ikke lastet.");
      const { default: DiceBox } = module;
      const diceBox = new DiceBox("#dice3dStage", {
        assetPath: DICE_3D_ASSET_PATH,
        ...dice3dConfig(),
        onRollComplete: () => markDice3dRollComplete(),
      });
      state.dice3d.instance = diceBox;
      return diceBox.initialize();
    })
    .then(async () => {
      state.dice3d.ready = true;
      bindDice3dThrowBounds();
      bindDice3dRollFeel();
      bindDice3dContextFallback();
      await synchronizeDice3dSize();
      await syncDice3dTheme();
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
  const canvas = els.dice3dStage?.querySelector("canvas");
  return Boolean(canvas && canvas.clientWidth > 1 && canvas.clientHeight > 1 && state.dice3d.instance && state.dice3d.ready && !state.dice3d.failed);
}

function setDice3dVisible(visible) {
  state.dice3d.visible = visible;
  if (els.diceTable) els.diceTable.classList.toggle("has-3d-roll", visible);
}

function shouldUseDice3dVisual() {
  return Boolean(state.isRolling && state.dice3d.visible && state.dice3d.ready && state.dice3d.instance && !state.dice3d.failed);
}

function shouldShow2dRollAnimation() {
  return Boolean(state.isRolling && !shouldUseDice3dVisual());
}

function activeRollCount() {
  if (!state.game) return diceCount();
  const count = diceCount();
  return Array.from({ length: count }, (_, index) => !state.game.held[index]).filter(Boolean).length;
}

function dice3dRollNotation(values) {
  return `${values.length}dpip@${values.join(",")}`;
}

function dice3dConfig(theme = currentDiceTheme()) {
  return {
    ...DICE_3D_PHYSICS,
    theme_surface: dice3dSurfaceTheme(),
    ...dice3dThemeConfig(theme),
  };
}

async function synchronizeDice3dSize() {
  // Dice-box registers its actual resize work on the window event; resizeWorld()
  // only adds another listener, so dispatch once after the responsive layout settles.
  await nextAnimationFrame();
  if (!state.dice3d.ready || !state.dice3d.visible || !dice3dCanvasHasSize()) return;
  const sizeKey = dice3dStageSizeKey();
  if (sizeKey && sizeKey !== state.dice3d.sizeKey) {
    window.dispatchEvent(new Event("resize"));
    await nextAnimationFrame();
    await nextAnimationFrame();
    state.dice3d.sizeKey = dice3dStageSizeKey() || sizeKey;
  }
  constrainDice3dWorld();
  keepSettledDice3dInView();
}

function dice3dStageSizeKey() {
  if (!els.dice3dStage) return "";
  return `${els.dice3dStage.clientWidth}x${els.dice3dStage.clientHeight}`;
}

function dice3dCanvasHasSize() {
  const canvas = els.dice3dStage?.querySelector("canvas");
  return Boolean(canvas && canvas.clientWidth > 1 && canvas.clientHeight > 1);
}

function nextAnimationFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function bindDice3dContextFallback() {
  const canvas = els.dice3dStage?.querySelector("canvas");
  if (!canvas || canvas.dataset.contextFallbackBound) return;
  canvas.dataset.contextFallbackBound = "true";
  canvas.addEventListener(
    "webglcontextlost",
    () => {
      state.dice3d.failed = true;
      setDice3dVisible(false);
      if (state.game) renderDice();
    },
    { once: true },
  );
}

function bindDice3dThrowBounds() {
  const diceBox = state.dice3d.instance;
  if (!diceBox || diceBox.yatzyThrowBoundsBound || typeof diceBox.startClickThrow !== "function") return;

  const originalStartClickThrow = diceBox.startClickThrow.bind(diceBox);
  diceBox.startClickThrow = (notation) => {
    constrainDice3dWorld();
    const notationVectors = originalStartClickThrow(notation);
    return constrainDice3dNotationVectors(notationVectors, diceBox);
  };
  diceBox.yatzyThrowBoundsBound = true;
}

function bindDice3dRollFeel() {
  const diceBox = state.dice3d.instance;
  if (!diceBox || diceBox.yatzyRollFeelBound || typeof diceBox.spawnDice !== "function") return;

  const originalSpawnDice = diceBox.spawnDice.bind(diceBox);
  diceBox.spawnDice = (notation, reroll) => {
    const result = originalSpawnDice(notation, reroll);
    const dice = reroll || diceBox.diceList?.at?.(-1);
    tuneDice3dBody(dice?.body);
    return result;
  };
  diceBox.yatzyRollFeelBound = true;
}

function tuneDice3dBody(body) {
  if (!body) return;
  body.linearDamping = DICE_3D_BODY_FEEL.linearDamping;
  body.angularDamping = DICE_3D_BODY_FEEL.angularDamping;
  body.sleepSpeedLimit = DICE_3D_BODY_FEEL.sleepSpeedLimit;
  body.sleepTimeLimit = DICE_3D_BODY_FEEL.sleepTimeLimit;
}

function dice3dThrowLimits(diceBox = state.dice3d.instance) {
  const stageWidth = els.dice3dStage?.clientWidth || 0;
  const stageHeight = els.dice3dStage?.clientHeight || 0;
  const width = stageWidth || Number(diceBox?.display?.containerWidth) || 0;
  const height = stageHeight || Number(diceBox?.display?.containerHeight) || 0;
  const radius = DICE_3D_DIE_RADIUS;

  return {
    wallX: clamp(width * DICE_3D_THROW_BOUNDS.wallX, radius * 1.15, width - radius * 1.1),
    wallY: clamp(height * DICE_3D_THROW_BOUNDS.wallY, radius, height - radius * 1.08),
    spawnX: clamp(width * DICE_3D_THROW_BOUNDS.spawnX, radius * 0.9, width - radius * 1.45),
    spawnY: clamp(height * DICE_3D_THROW_BOUNDS.spawnY, radius * 0.72, height - radius * 1.45),
    minZ: radius * 1.8,
    maxZ: radius * 3.2,
  };
}

function constrainDice3dWorld() {
  const diceBox = state.dice3d.instance;
  if (!diceBox?.box_body || !diceBox.display) return;

  const { wallX, wallY } = dice3dThrowLimits(diceBox);
  diceBox.box_body.leftWall?.position.set(wallX, 0, 0);
  diceBox.box_body.rightWall?.position.set(-wallX, 0, 0);
  diceBox.box_body.topWall?.position.set(0, wallY, 0);
  diceBox.box_body.bottomWall?.position.set(0, -wallY, 0);
}

function keepSettledDice3dInView(diceBox = state.dice3d.instance) {
  if (state.isRolling || !state.dice3d.visible || !diceBox?.diceList?.length) return;

  const { wallX, wallY } = dice3dThrowLimits(diceBox);
  const edgePad = DICE_3D_DIE_RADIUS * 0.72;
  const maxX = Math.max(DICE_3D_DIE_RADIUS * 0.16, wallX - edgePad);
  const maxY = Math.max(DICE_3D_DIE_RADIUS * 0.16, wallY - edgePad);
  let moved = false;

  diceBox.diceList.forEach((die) => {
    const body = die?.body;
    if (!body?.position) return;
    const x = clamp(body.position.x, -maxX, maxX);
    const y = clamp(body.position.y, -maxY, maxY);
    if (x === body.position.x && y === body.position.y) return;

    body.position.set(x, y, body.position.z);
    body.aabbNeedsUpdate = true;
    die.position?.set?.(body.position.x, body.position.y, body.position.z);
    moved = true;
  });

  if (moved) diceBox.renderer?.render?.(diceBox.scene, diceBox.camera);
}

function constrainDice3dNotationVectors(notationVectors, diceBox = state.dice3d.instance) {
  if (!notationVectors?.vectors?.length) return notationVectors;

  const limits = dice3dThrowLimits(diceBox);
  const center = (notationVectors.vectors.length - 1) / 2;
  notationVectors.vectors.forEach((vector, index) => {
    if (!vector?.pos || !vector?.velocity || !vector?.angle) return;
    const laneOffset = (index - center) * DICE_3D_PHYSICS.baseScale * DICE_3D_THROW_BOUNDS.lane;

    vector.pos.x = clamp(vector.pos.x * 0.84, -limits.spawnX, limits.spawnX);
    vector.pos.y = clamp(vector.pos.y * 0.78 + laneOffset, -limits.spawnY, limits.spawnY);
    vector.pos.z = clamp(vector.pos.z, limits.minZ, limits.maxZ);
    vector.velocity.x *= DICE_3D_THROW_BOUNDS.velocity;
    vector.velocity.y *= DICE_3D_THROW_BOUNDS.velocity;
    vector.velocity.z *= DICE_3D_THROW_BOUNDS.lift;
    vector.angle.x *= DICE_3D_THROW_BOUNDS.spin;
    vector.angle.y *= DICE_3D_THROW_BOUNDS.spin;
    vector.angle.z = (vector.angle.z || 0) + (index % 2 === 0 ? 1 : -1) * DICE_3D_THROW_BOUNDS.spin;
  });

  return notationVectors;
}

async function startDice3dRoll() {
  const rollId = state.dice3d.rollId;
  setDice3dVisible(true);
  await prepareDice3d();
  if (rollId !== state.dice3d.rollId) return false;
  if (!state.isRolling) return false;
  if (!canUseDice3d()) return false;
  const delay = Math.min(DICE_3D_SYNC_START_MAX_WAIT_MS, Math.max(0, Number(state.dice3d.startsAt || 0) - Date.now()));
  if (delay) await wait(delay);
  if (rollId !== state.dice3d.rollId || !state.isRolling || !canUseDice3d()) return false;
  await synchronizeDice3dSize();
  if (rollId !== state.dice3d.rollId || !state.isRolling || !canUseDice3d()) return false;

  const count = activeRollCount();
  const values = state.dice3d.forcedValues;
  if (!count || values.length !== count) return false;

  setDice3dVisible(true);
  createDice3dSettlePromise(rollId);
  await syncDice3dTheme();
  try {
    state.dice3d.rollPromise = state.dice3d.instance.roll(dice3dRollNotation(values)).catch((error) => {
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
  if (state.dice3d.theme === theme) return;
  const config = dice3dThemeConfig(theme);
  Object.assign(state.dice3d.instance, config);
  return state.dice3d.instance
    .loadTheme({
      colorset: config.theme_colorset,
      texture: config.theme_texture,
      material: config.theme_material,
    })
    .then(() => {
      state.dice3d.theme = theme;
    })
    .catch((error) => {
      console.warn("3D dice theme update failed:", error);
    });
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
  if (values.length !== state.dice3d.forcedValues.length || values.some((value, index) => value !== state.dice3d.forcedValues[index])) {
    return null;
  }
  els.dice3dStage.dataset.rollValues = values.join(",");

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
  const groups = Array.isArray(results) ? results : results?.sets;
  if (!Array.isArray(groups)) return [];
  return groups
    .flatMap((group) => (Array.isArray(group?.rolls) ? group.rolls : [group]))
    .map((die) => Number(die?.value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 6);
}

function mergeRolledValues(values) {
  if (!state.game) return values;

  const count = diceCount();
  const firstRoll = state.game.dice.length === 0;
  const nextDice = firstRoll ? Array.from({ length: count }, () => 0) : state.game.dice.slice(0, count);
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
  state.dice3d.rollPromise = null;
  state.dice3d.settlePromise = null;
  state.dice3d.settleResolve = null;
  if (state.game?.dice.length) setDice3dVisible(true);
}

function cancelDice3dRoll(rollId = state.dice3d.rollId) {
  if (rollId !== state.dice3d.rollId) return;
  state.dice3d.rollId += 1;
  state.dice3d.startPromise = null;
  state.dice3d.rollPromise = null;
  state.dice3d.settlePromise = null;
  state.dice3d.settleResolve = null;
  state.dice3d.forcedValues = [];
  state.dice3d.startsAt = null;
  setDice3dVisible(false);
  clearDice3dInstance();
}

function clearDice3dStage() {
  state.dice3d.rollId += 1;
  state.dice3d.startPromise = null;
  state.dice3d.rollPromise = null;
  state.dice3d.settlePromise = null;
  state.dice3d.settleResolve = null;
  state.dice3d.forcedValues = [];
  state.dice3d.startsAt = null;
  setDice3dVisible(false);
  clearDice3dInstance();
}

function clearDice3dInstance() {
  try {
    state.dice3d.instance?.clearDice?.();
  } catch (error) {
    // Dice-box can briefly expose an instance before its scene is ready.
  }
}

function startRollAnimation(animationGame = state.game, { context = "local" } = {}) {
  if (!animationGame) return;
  window.clearInterval(state.rollTimer);
  state.rollAnimationId += 1;
  const animationId = state.rollAnimationId;
  state.rollContext = context;
  state.dice3d.forcedValues = Array.isArray(animationGame.activeRoll?.values) ? [...animationGame.activeRoll.values] : [];
  state.dice3d.startsAt = animationGame.activeRoll?.startsAt || null;
  state.dice3d.rollId += 1;
  delete els.dice3dStage.dataset.rollValues;
  const count = animationGame.mode === "maxi" ? 6 : 5;
  const held = animationGame.held.slice(0, count);
  const currentDice = animationGame.dice.length ? animationGame.dice : Array.from({ length: count }, () => randomDie());
  state.animatedDice = currentDice.map((value, index) => (held[index] ? value : randomDie()));
  state.isRolling = true;
  renderDice();
  if (context === "local" || context === "incoming") {
    state.dice3d.startPromise = startDice3dRoll().then((didStart) => {
      if (isCurrentRollAnimation(animationId)) renderDice();
      return didStart;
    });
  } else {
    state.dice3d.startPromise = null;
    setDice3dVisible(false);
    clearDice3dInstance();
  }
  state.rollTimer = window.setInterval(() => {
    if (!isCurrentRollAnimation(animationId)) return;
    if (shouldUseDice3dVisual()) return;
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
  if (!previous || state.pending || state.isRolling || state.incomingRollFinishing) return false;
  if (next.status !== "playing" || !next.activeRoll) return false;
  if (previous.currentSeatId !== next.currentSeatId) return false;
  return previous.activeRoll?.id !== next.activeRoll.id;
}

async function animateIncomingRoll(previousGame, rollPlanGame) {
  if (!previousGame || !rollPlanGame?.activeRoll) return;
  state.game = rollPlanGame;
  const animationId = startRollAnimation(rollPlanGame, { context: "incoming" });
  playRollSound(0.55);
  const visualDice = await diceValuesFromRollVisual();
  if (!isCurrentRollAnimation(animationId)) return;
  state.incomingRollFinishing = true;
  stopRollAnimation(animationId);
  try {
    const queuedGame = takeQueuedIncomingGame(rollPlanGame.version);
    if (queuedGame) {
      state.game = queuedGame;
      if (visualDice && queuedGame.dice.length && visualDice.join(",") !== queuedGame.dice.join(",")) {
        state.syncIssue = {
          canRetryRoll: false,
          message: "3D-kastet avvek fra rommet. Kastet må repareres før spillet fortsetter.",
        };
      }
    } else if (visualDice) {
      state.game = {
        ...rollPlanGame,
        dice: visualDice,
        rollsUsed: rollPlanGame.rollsUsed + 1,
      };
    }
    render();
  } finally {
    state.incomingRollFinishing = false;
  }
}

async function flushQueuedIncomingGame(displayedGame) {
  const queuedGame = takeQueuedIncomingGame(displayedGame.version);
  if (!queuedGame) return;

  if (shouldHoldRollResult(displayedGame, queuedGame)) {
    await wait(ROLL_RESULT_HOLD_MS);
  }

  state.incomingRollFinishing = false;
  applyIncomingGame(queuedGame);

  while (!state.isRolling) {
    const nextQueuedGame = takeQueuedIncomingGame(state.game?.version ?? queuedGame.version);
    if (!nextQueuedGame) return;
    applyIncomingGame(nextQueuedGame);
  }
}

function shouldHoldRollResult(displayedGame, queuedGame) {
  return Boolean(displayedGame.dice.length && (!queuedGame.dice.length || queuedGame.currentSeatId !== displayedGame.currentSeatId));
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
  state.rollAudio.addEventListener(
    "error",
    () => {
      state.rollAudioFailed = true;
    },
    { once: true },
  );
  return state.rollAudio;
}

function preloadEffectAudio() {
  Object.keys(SOUND_PATHS).forEach((name) => ensureEffectAudio(name));
}

function ensureEffectAudio(name) {
  if (state.effectAudio.has(name) || state.failedEffectAudio.has(name) || !window.Audio) {
    return state.effectAudio.get(name) || null;
  }

  const path = SOUND_PATHS[name];
  if (!path) return null;
  const audio = new Audio(path);
  audio.preload = "auto";
  audio.addEventListener(
    "error",
    () => {
      state.failedEffectAudio.add(name);
      state.effectAudio.delete(name);
    },
    { once: true },
  );
  state.effectAudio.set(name, audio);
  return audio;
}

function playEffectSound(name, volume = 1) {
  if (!state.soundEnabled) return;
  const template = ensureEffectAudio(name);
  if (!template || state.failedEffectAudio.has(name)) return;

  const audio = template.paused || template.ended ? template : template.cloneNode(true);
  audio.currentTime = 0;
  audio.volume = Math.max(0, Math.min(1, volume));
  const playback = audio.play();
  if (playback?.catch) {
    playback.catch((error) => {
      if (error?.name !== "NotAllowedError") state.failedEffectAudio.add(name);
    });
  }
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
  playEffectSound("click", 0.72);
}

function playStartSound() {
  playTone(300, 0.08, 0.08, 0, "triangle");
  playTone(450, 0.08, 0.08, 0.08, "triangle");
}

function playYatzySound() {
  playEffectSound("yatzy");
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
    if (!state.game?.dice.length) syncDice3dTheme(safeTheme);
    if (state.game) renderDice();
  }
  renderDiceCustomizer();
}

function applyFeltTheme(theme) {
  const safeTheme = FELT_THEMES.has(theme) ? theme : "tavern";
  document.body.dataset.feltTheme = safeTheme;
  saveFeltTheme(safeTheme);
  if (state.dice3d.instance && !state.isRolling) {
    state.dice3d.instance.theme_surface = dice3dSurfaceTheme(safeTheme);
  }
  renderFeltCustomizer();
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

function renderFeltCustomizer() {
  if (!els.feltCustomizer) return;
  const theme = currentFeltTheme();
  const disabled = state.pending || state.isRolling;
  els.feltCustomizer.querySelectorAll("[data-felt-theme]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.feltTheme === theme);
    button.disabled = disabled;
  });
}

function renderSoundToggle() {
  if (!els.soundToggle) return;
  const label = state.soundEnabled ? "Lyd på" : "Lyd av";
  els.soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
  els.soundToggle.setAttribute("aria-label", label);
  els.soundToggle.setAttribute("title", label);
  els.soundToggle.innerHTML = renderScribbyIcon(state.soundEnabled ? "high-volume" : "no-audio", label, "scribby-icon button-icon");
}

function cleanScribbySlug(slug) {
  const cleanSlug = String(slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  return SCRIBBY_ICON_NAMES[cleanSlug] ? cleanSlug : "";
}

function scribbyIconUrl(slug) {
  const source = SCRIBBY_ICON_SOURCES[slug];
  if (source?.id) {
    return `https://img.icons8.com/?size=100&id=${encodeURIComponent(source.id)}&format=png`;
  }
  return `${SCRIBBY_ICON_BASE}${encodeURIComponent(source?.slug || slug)}.png`;
}

function renderScribbyIcon(slug, label = "", className = "scribby-icon") {
  const safeSlug = cleanScribbySlug(slug);
  if (!safeSlug) return "";
  const title = label || SCRIBBY_ICON_NAMES[safeSlug] || safeSlug;
  return `<img class="${escapeHtml(className)}" src="${scribbyIconUrl(safeSlug)}" alt="" aria-hidden="true" loading="lazy" decoding="async" title="${escapeHtml(title)}" onerror="this.remove()">`;
}

function renderIconButtonContent(icon, label) {
  return `${renderScribbyIcon(icon, label, "scribby-icon button-icon")}<span>${escapeHtml(label)}</span>`;
}

function playerAvatarSlug(player) {
  const cleanSlug = cleanScribbySlug(player?.avatarIcon);
  return cleanSlug || fallbackAvatarSlug(player);
}

function fallbackAvatarSlug(player) {
  const key = String(player?.seatId || player?.name || "player");
  let hash = 0;
  for (const char of key) {
    hash = ((hash * 31) + char.codePointAt(0)) >>> 0;
  }
  return SCRIBBY_AVATAR_ICONS[hash % SCRIBBY_AVATAR_ICONS.length][0];
}

function renderPlayerAvatar(player, className = "avatar") {
  const slug = playerAvatarSlug(player);
  const label = SCRIBBY_ICON_NAMES[slug] || "Avatar";
  const name = player?.name || "Spiller";
  return `
    <span class="${escapeHtml(className)}" title="${escapeHtml(`${name} · ${label}`)}">
      ${renderScribbyIcon(slug, label, "avatar-icon")}
      <span class="avatar-fallback">${escapeHtml(initials(name))}</span>
    </span>
  `;
}

function renderChatContent(message) {
  const text = expandChatEmojiShortcuts(message);
  let html = "";
  for (let index = 0; index < text.length;) {
    const match = CHAT_EMOJI_ICON_ENTRIES.find((entry) => text.startsWith(entry.emoji, index));
    if (match) {
      const label = SCRIBBY_ICON_NAMES[match.icon] || "Reaction";
      const iconClass = match.icon === TONES_YATZY_LYRIC_ICON_KEY ? "scribby-icon chat-inline-icon chat-tone-lyric-inline-icon" : "scribby-icon chat-inline-icon";
      html += `${renderScribbyIcon(match.icon, label, iconClass)}<span class="sr-only">${escapeHtml(match.emoji)}</span>`;
      index += match.emoji.length;
      continue;
    }

    const char = Array.from(text.slice(index))[0] || "";
    html += escapeHtml(char);
    index += char.length || 1;
  }
  return html;
}

function render() {
  const hasGame = Boolean(state.game);
  const myTurn = hasGame && isMyTurn();
  document.body.classList.toggle("in-game", hasGame);
  document.body.classList.toggle("is-my-turn", myTurn);
  els.setupView.classList.toggle("is-hidden", hasGame);
  els.gameView.classList.toggle("is-hidden", !hasGame);
  els.topbarRoom?.classList.toggle("is-hidden", !hasGame);
  els.gameView.classList.toggle("is-my-turn", myTurn);
  els.gameView.classList.toggle("is-playing", hasGame && state.game.status === "playing");
  els.gameView.classList.toggle("is-lobby", hasGame && state.game.status === "lobby");
  els.gameView.classList.toggle("is-finished", hasGame && state.game.status === "finished");
  els.createName.value ||= loadName();
  els.joinName.value ||= loadName();

  if (!hasGame) {
    clearActiveRollRecoveryRefresh();
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
  renderSyncRecovery();
  renderDiceCustomizer();
  renderFeltCustomizer();
  renderGameOverOverlay();
}

function renderRoom() {
  const game = state.game;
  els.roomTitle.textContent = `${game.modeName}${game.forcedMode ? " · Tvungen" : ""}`;
  els.roomCodeLabel.textContent = game.code;
  els.gameStatus.textContent = statusText(game.status);
  els.gameStatus.style.background = game.status === "playing" ? "#e9f8f1" : game.status === "finished" ? "#eaf1ff" : "#fff7db";
  renderRulesPanel();
  renderHostControls();
  els.startGame.classList.toggle("is-hidden", game.status !== "lobby");
  els.startGame.classList.toggle("maxi-button", game.mode === "maxi");
  els.startGame.innerHTML = renderIconButtonContent("play", game.mode === "maxi" ? "Start Maxi Yatzy" : "Start spill");
  els.startGame.disabled = state.pending || (game.activePlayerCount ?? game.players.length) === 0;
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

function renderHostControls() {
  if (!els.hostControls || !state.game) return;
  const game = state.game;
  const controls = [];
  const busy = state.pending || state.isRolling || Boolean(game.activeRoll);

  if (amHost() && game.status !== "finished") {
    const player = currentPlayer();
    if (game.status === "playing" && player && player.seatId !== state.seatId) {
      controls.push(`<button class="secondary small" type="button" data-host-skip ${busy ? "disabled" : ""}>${renderIconButtonContent("forward", "Hopp over")}</button>`);
    }
  }

  els.hostControls.innerHTML = controls.join("");
  els.hostControls.classList.toggle("is-hidden", controls.length === 0);
  els.gameView?.classList.toggle("has-host-controls", controls.length > 0);
  if (!controls.length) return;

  els.hostControls.querySelector("[data-host-skip]")?.addEventListener("click", () => {
    void action("skip");
  });
}

function effectiveRuleSettings(game = state.game) {
  const fallback = defaultRuleSettingsForGame(game, Boolean(game?.forcedMode));
  const preset = game?.rulePresets?.[game.forcedMode ? "forced" : "normal"] || fallback;
  return {
    upperBonusThreshold: Number(game?.ruleSettings?.upperBonusThreshold ?? preset.upperBonusThreshold),
    upperBonus: Number(game?.ruleSettings?.upperBonus ?? preset.upperBonus),
    yatzyScore: Number(game?.ruleSettings?.yatzyScore ?? preset.yatzyScore),
    fullStraightScore: Number(game?.ruleSettings?.fullStraightScore ?? preset.fullStraightScore),
    forcedYatzyAnywhere: game?.ruleSettings?.forcedYatzyAnywhere !== false,
  };
}

function defaultRuleSettingsForGame(game = state.game, forcedMode = Boolean(game?.forcedMode)) {
  const isMaxi = game?.mode === "maxi";
  return {
    upperBonusThreshold: forcedMode ? (isMaxi ? 63 : 42) : isMaxi ? 84 : 63,
    upperBonus: isMaxi ? 100 : 50,
    yatzyScore: isMaxi ? 100 : 50,
    fullStraightScore: 21,
    forcedYatzyAnywhere: true,
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
      forcedYatzyAnywhere: els.forcedYatzyAnywhereToggle?.checked !== false,
    },
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
  if (!game.players.some((player) => player.seatId === state.playerMenuSeatId && canManagePlayer(player))) {
    state.playerMenuSeatId = null;
  }

  els.playersList.innerHTML = game.players
    .map((player) => {
      const mine = player.seatId === state.seatId ? "deg" : "";
      const host = player.isHost ? "host" : "";
      const away = isActivePlayer(player) ? "" : "ute";
      const meta = [mine, host, away].filter(Boolean).join(" · ");
      const classes = [
        "player-item",
        player.seatId === game.currentSeatId ? "is-current" : "",
        isActivePlayer(player) ? "" : "is-away",
      ].filter(Boolean).join(" ");
      const title = `${player.name}${player.seatId === game.currentSeatId ? " · spiller nå" : ""}${away ? " · har gått ut" : ""}`;
      const manageable = canManagePlayer(player);
      const menuOpen = manageable && state.playerMenuSeatId === player.seatId;
      return `
        <div class="${classes}" title="${escapeHtml(title)}">
          <button class="player-avatar-button" type="button" data-player-menu="${escapeHtml(player.seatId)}" ${manageable ? `aria-haspopup="menu" aria-expanded="${menuOpen}"` : "disabled"} aria-label="${escapeHtml(manageable ? `${player.name}. Flere valg` : title)}">
            ${renderPlayerAvatar(player)}
          </button>
          ${menuOpen ? `
            <div class="player-action-menu" role="menu">
              <button class="player-kick-button" type="button" role="menuitem" data-player-remove="${escapeHtml(player.seatId)}">Kast ut</button>
            </div>
          ` : ""}
          <div class="player-copy">
            <div class="player-name">${escapeHtml(player.name)}${meta ? `<span class="player-meta">${escapeHtml(meta)}</span>` : ""}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

function canManagePlayer(player) {
  return Boolean(
    state.game
    && amHost()
    && player
    && player.seatId !== state.seatId
    && isActivePlayer(player)
    && state.game.status !== "finished"
    && !state.pending
    && !state.isRolling
    && !state.game.activeRoll
  );
}

function closePlayerMenu() {
  if (!state.playerMenuSeatId) return;
  state.playerMenuSeatId = null;
  renderPlayers();
}

function handlePlayerMenuOutsidePointerDown(event) {
  if (!state.playerMenuSeatId || !(event.target instanceof Element)) return;
  if (event.target.closest("#playersList")) return;
  closePlayerMenu();
}

function handlePlayerMenuClick(event) {
  if (!(event.target instanceof Element)) return;

  const removeButton = event.target.closest("[data-player-remove]");
  if (removeButton) {
    const seatId = removeButton.dataset.playerRemove;
    state.playerMenuSeatId = null;
    renderPlayers();
    if (seatId) void action("remove", { seatId });
    return;
  }

  const menuButton = event.target.closest("[data-player-menu]");
  if (!menuButton || menuButton.disabled) return;
  const seatId = menuButton.dataset.playerMenu;
  const player = state.game?.players.find((entry) => entry.seatId === seatId);
  if (!canManagePlayer(player)) return;
  state.playerMenuSeatId = state.playerMenuSeatId === seatId ? null : seatId;
  renderPlayers();
}

function renderTurn() {
  const game = state.game;
  const player = currentPlayer();
  const winnerText = game.winners.length ? game.winners.map((winner) => `${winner.name} (${winner.total})`).join(", ") : "";

  if (game.status === "lobby") {
    const activeCount = game.activePlayerCount ?? game.players.filter(isActivePlayer).length;
    els.turnEyebrow.textContent = `${activeCount} spiller${activeCount === 1 ? "" : "e"}`;
    els.turnTitle.textContent = "Klar ved bordet";
  } else if (game.status === "finished") {
    els.turnEyebrow.textContent = "Vinner";
    els.turnTitle.textContent = winnerText || "Ferdig";
  } else if (isMyTurn()) {
    els.turnEyebrow.textContent = "Din tur!";
    els.turnTitle.textContent = game.rollsUsed > 0 ? "Velg score eller kast igjen" : "Kast terningene";
  } else {
    els.turnEyebrow.textContent = "Venter";
    els.turnTitle.textContent = player ? `${player.name} sin tur` : "Venter p\u00e5 spillere";
  }
}

function rollStatusText(game = state.game) {
  if (!game) return "";
  if (game.status === "lobby") return "Venter på start";
  if (game.status === "finished") return "Ferdig";
  if (isMyTurn()) return "Din tur";
  const player = currentPlayer();
  return player ? `${player.name} sin tur` : "Venter på spillere";
}

function renderDice() {
  const game = state.game;
  const count = diceCount();
  const canHold = isMyTurn() && game.rollsUsed > 0;
  if (!state.isRolling && !game.dice.length) {
    clearDice3dStage();
  }
  const dice = state.isRolling ? state.animatedDice : game.dice.length ? game.dice : Array.from({ length: count }, () => 0);

  const diceEntries = dice.map((value, index) => ({
    value,
    index,
    held: Boolean(game.held[index]),
  }));

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
  els.rollDice.innerHTML = renderIconButtonContent("dice", rollButtonText(game));
  if (els.rollStatus) els.rollStatus.textContent = rollStatusText(game);
  scheduleActiveRollRecoveryRefresh(game);
  renderRollMeta(game);
}

function hasSplitDiceLayout() {
  return Boolean(els.diceTable && els.activeDiceLabel && els.heldDiceLabel && els.activeDiceRow && els.heldDiceRow);
}

function renderSplitDice(diceEntries, canHold, count) {
  const heldCount = diceEntries.filter((entry) => entry.held).length;
  els.diceTable.classList.toggle("is-rolling", state.isRolling);
  els.diceTable.classList.toggle("is-3d-roll-visual", shouldUseDice3dVisual());
  els.diceTable.classList.toggle("has-3d-roll", state.dice3d.visible);
  els.activeDiceRow.style.setProperty("--dice-count", count);
  els.heldDiceRow.style.setProperty("--dice-count", count);
  els.activeDiceLabel.textContent = "";
  els.heldDiceLabel.textContent = `${heldCount}/${count}`;
  els.activeDiceRow.innerHTML = renderDiceSlots(diceEntries, canHold, "active", (entry) => !entry.held);
  els.heldDiceRow.innerHTML = renderDiceSlots(diceEntries, canHold, "held", (entry) => entry.held);
}

function renderDiceSlots(diceEntries, canHold, lane, shouldShowDie) {
  return diceEntries
    .map((entry) => {
      const isVisible = shouldShowDie(entry);
      return `
        <span class="dice-slot ${isVisible ? "" : "is-empty"}">
          ${isVisible ? renderDieButton(entry, canHold, lane) : renderDieGhost()}
        </span>
      `;
    })
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
  els.legacyDiceRow.innerHTML = diceEntries.map((entry) => renderDieButton(entry, canHold, entry.held ? "held" : "active")).join("");
}

function renderDieButton(entry, canHold, lane) {
  const held = entry.held ? "is-held" : "";
  const saved = lane === "held" && !state.isRolling ? "is-saved" : "";
  const empty = entry.value ? "" : "is-empty";
  const rolling = shouldShow2dRollAnimation() && !entry.held ? "is-rolling" : "";
  const disabled = canHold && !state.isRolling ? "" : "disabled";
  const motion = throwStyle(entry.index);
  const value = entry.value ? `, verdi ${entry.value}` : "";
  const label = entry.held ? `Spart terning ${entry.index + 1}${value}` : `Terning ${entry.index + 1}${value}`;
  const shortcut = lane === "held" ? heldDieShortcut(entry.index) : String(entry.index + 1);
  const shortcutAction = lane === "held" ? "Slipp" : "Spar";
  return `<button class="die ${held} ${saved} ${empty} ${rolling}" style="${motion}" type="button" data-hold="${entry.index}" ${disabled} aria-label="${label}. Hurtigtast ${shortcut}" title="${shortcutAction} med tast ${shortcut.toUpperCase()}">${renderPips(entry.value)}<kbd class="die-hotkey" aria-hidden="true">${shortcut.toUpperCase()}</kbd></button>`;
}

function heldDieShortcut(index) {
  return "qwerty"[index] || "";
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
  if (isConfirmDialogOpen()) return;
  if (isKeyboardControlTarget(event.target)) return;
  if (!canRollDice()) return;

  event.preventDefault();
  void action("roll");
}

function handleDieShortcut(event) {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  if (isConfirmDialogOpen()) return;
  if (isKeyboardControlTarget(event.target)) return;
  if (!state.game || !isMyTurn() || state.game.rollsUsed === 0 || state.pending || state.isRolling) return;
  const numericIndex = Number(event.key) - 1;
  let index = null;
  if (Number.isInteger(numericIndex) && numericIndex >= 0 && numericIndex < diceCount()) {
    if (state.game.held[numericIndex]) return;
    index = numericIndex;
  } else {
    const heldPosition = "qwerty".indexOf(String(event.key).toLowerCase());
    if (heldPosition < 0) return;
    if (!state.game.held[heldPosition]) return;
    index = heldPosition;
  }

  event.preventDefault();
  void action("hold", { index });
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
  return `${baseUsed}/${game.rollLimit} kast brukt${extra}${saved}`;
}

function renderRollMeta(game) {
  if (!els.rollMeta) return;
  els.rollMeta.innerHTML = rollMetaText(game);
  els.rollMeta.querySelector("[data-use-saved-roll]")?.addEventListener("click", () => {
    void action("roll", { useSavedRoll: true });
  });
}

function renderSyncRecovery() {
  if (!els.syncRecovery) return;
  const issue = state.syncIssue;
  els.syncRecovery.classList.toggle("is-hidden", !issue);
  if (!issue) return;
  els.syncRecoveryText.textContent = issue.message;
  els.syncRecoveryAction.classList.toggle("is-hidden", !issue.canRetryRoll);
  els.syncRecoveryAction.disabled = !issue.canRetryRoll || !canRollDice();
}

function rollButtonText(game) {
  if (state.isRolling) return "Ruller";
  if (game.status !== "playing") return "Kast";
  if (!isMyTurn()) return "Venter";
  if (game.activeRoll) return isActiveRollRecoverable(game.activeRoll) ? "Hent kast" : "Venter på kast";
  if (game.rollsUsed === 0) return "Kast";
  if (game.rollsLeft > 0) return "Kast igjen";
  return game.canUseSavedRoll ? "Bruk sjetong" : "Ingen kast";
}

function savedRollText(count) {
  return `${count} sjetong${count === 1 ? "" : "er"}`;
}

function savedRollInlineHtml(count) {
  return `${renderScribbyIcon("star", "Sjetong", "scribby-icon roll-meta-chip-icon")}<span>${escapeHtml(savedRollText(count))}</span>`;
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
  renderScoreLastMove(game);
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
  bindScoreUndoButtons(els.scoreTable);
  bindScoreUndoButtons(els.scoreLastMove);
}

function bindScoreUndoButtons(root) {
  root?.querySelectorAll("[data-undo-score]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!canUndoLastScore()) return;
      void action("undo");
    });
  });
}

function isLastUndoCell(player, category) {
  const undo = state.game?.lastScoreUndo;
  return Boolean(undo && canSeeLastScoreUndo() && undo.playerSeatId === player.seatId && undo.categoryId === category.id);
}

function renderUndoScoreButton(player, category, value) {
  const label = `Angre ${value} p\u00e5 ${category.label} for ${player.name}`;
  const disabled = canUndoLastScore() ? "" : " disabled";
  return `
    <button class="score-undo-cell" type="button" data-undo-score${disabled} aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
      <span class="score-value ${value === 0 ? "is-struck" : ""}">${value}</span>
      <span class="score-undo-text">Angre</span>
    </button>
  `;
}

function renderScoreLastMove(game) {
  if (!els.scoreLastMove) return;
  const message = latestMoveMessage(game);
  const undo = game.lastScoreUndo;
  const fallback = undo ? `${undo.playerName} skrev ${undo.points} p\u00e5 ${undo.categoryLabel}.` : "";
  const text = message || fallback;
  const showUndo = canSeeLastScoreUndo();
  const undoLabel = undo ? `Angre ${undo.points} p\u00e5 ${undo.categoryLabel} for ${undo.playerName}` : "Angre siste score";
  els.scoreLastMove.innerHTML = `
    <span class="score-last-move-text">${escapeHtml(text)}</span>
    ${showUndo ? `<button class="score-last-move-undo" type="button" data-undo-score${canUndoLastScore() ? "" : " disabled"} aria-label="${escapeHtml(undoLabel)}">${renderIconButtonContent("undo", "Angre")}</button>` : ""}
  `;
  els.scoreLastMove.classList.toggle("is-empty", !text && !showUndo);
}

function scoreGridColumnCount() {
  return state.game.players.length;
}

function scorePlayerHeader(player) {
  const classes = scorePlayerClass(player);
  const title = `${player.name}${isActivePlayer(player) ? "" : " · ute"}`;
  return `
    <th scope="col" class="${classes}" title="${escapeHtml(title)}">
      ${renderPlayerAvatar(player, "score-player-avatar")}
    </th>
  `;
}

function scorePlayerClass(player) {
  const classes = [];
  if (player.seatId === state.seatId) classes.push("is-me");
  if (player.seatId === state.game.currentSeatId) classes.push("is-current-player");
  if (!isActivePlayer(player)) classes.push("is-left-player");
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
  const classes = ["score-entry-row", `score-${category.section}`, `score-row-${category.id}`, playable ? "is-playable-row" : "", forcedNext ? "is-forced-next" : "", category.id.toLowerCase().includes("yatzy") ? "is-yatzy-row" : ""].filter(Boolean).join(" ");
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
  return isMyTurn() && game.rollsUsed >= game.scoreReadyRolls && me()?.scores?.[category.id] === null && (!game.forcedMode || game.nextForcedCategoryId === category.id || previewAvailable);
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
      <button class="score-info-button" type="button" aria-label="${safeInfo}">${renderScribbyIcon("info", "Info", "scribby-icon score-info-icon")}</button>
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
  const latestMove = log.find((entry) => !isHoldLogMessage(entry.message) && (entry.message.includes("kastet") || entry.message.includes("skrev")));
  return latestMove?.message || "";
}

function isHoldLogMessage(message) {
  return message.includes("sparte") || message.includes("slapp");
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
    maxiYatzy: "Maxiyatzy",
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
    const content = isLastUndoCell(player, category)
      ? renderUndoScoreButton(player, category, value)
      : value === 0
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
  els.gameLog.innerHTML = log.length ? log.map((entry) => renderLogEntry(entry)).join("") : "<li>Ingen trekk enn&aring;.</li>";
}

function renderLogEntry(entry) {
  if (entry.type === "roll") {
    const rolled = formatDiceValues(entry.rolledDice);
    const kept = formatDiceValues(entry.keptDice);
    const detail = [rolled ? `<span class="log-dice">Kastet ${rolled}</span>` : "", kept ? `beholdt ${kept}` : "", entry.usedSavedRoll ? "brukte sjetong" : ""].filter(Boolean).join(" · ");
    return `
      <li>
        <span class="log-heading">${renderScribbyIcon("dice", "Kast", "scribby-icon log-icon")} ${escapeHtml(entry.playerName || "Spiller")} · kast ${Number(entry.rollNumber) || 1}</span>
        <span class="log-detail">${detail}</span>
      </li>
    `;
  }

  if (entry.type === "hold") {
    const kept = formatDiceValues(entry.heldDice);
    return `
      <li>
        <span class="log-heading">${renderScribbyIcon(entry.held ? "pin" : "undo", entry.held ? "Spart" : "Slapp", "scribby-icon log-icon")} ${escapeHtml(entry.message)}</span>
        ${kept ? `<span class="log-detail">Spart nå: <span class="log-dice">${kept}</span></span>` : ""}
      </li>
    `;
  }

  if (entry.type === "score") {
    const dice = formatDiceValues(entry.dice);
    const isYatzyScore = YATZY_CATEGORY_IDS.has(entry.categoryId);
    return `
      <li>
        <span class="log-heading">${renderScribbyIcon(isYatzyScore ? "star" : "save", isYatzyScore ? "Yatzy" : "Score", "scribby-icon log-icon")} ${escapeHtml(entry.playerName || "Spiller")} skrev ${Number(entry.points) || 0} på ${escapeHtml(entry.category || "")}</span>
        ${dice ? `<span class="log-detail">Etter ${Number(entry.rollsUsed) || 1} kast · <span class="log-dice">${dice}</span></span>` : ""}
      </li>
    `;
  }

  const genericIcon = logIconForEntry(entry);
  return `<li><span class="log-heading">${renderScribbyIcon(genericIcon.icon, genericIcon.label, "scribby-icon log-icon")} ${escapeHtml(entry.message)}</span></li>`;
}

function logIconForEntry(entry) {
  const message = String(entry?.message || "").toLowerCase();
  if (message.includes("ble med") || message.includes("kom tilbake") || message.includes("opprettet rommet")) {
    return { icon: "party-balloon", label: "Ble med" };
  }
  if (message.includes("forlot")) {
    return { icon: "door", label: "Forlot" };
  }
  return { icon: "comments", label: "Info" };
}

function formatDiceValues(values) {
  if (!Array.isArray(values) || !values.length) return "";
  return [...values].sort((a, b) => a - b).join(" · ");
}

function renderChat() {
  if (!els.chatList) return;
  const chat = state.game?.chat || [];
  els.chatList.innerHTML = chat.length ? chat.map((entry) => renderChatMessage(entry)).join("") : '<p class="chat-empty">Ingen meldinger enn&aring;.</p>';
  els.chatList.scrollTop = els.chatList.scrollHeight;

  const disabled = !state.game || !state.playerToken || state.chatPending;
  if (disabled) state.chatEmojiPanelOpen = false;
  if (disabled) closeChatShortcutSuggestions();
  if (els.chatInput) els.chatInput.disabled = disabled;
  if (els.chatEmojiToggle) els.chatEmojiToggle.disabled = disabled;
  if (els.sendChat) els.sendChat.disabled = disabled;
  syncChatEmojiPanel();
  renderChatShortcutSuggestions();
  updateChatComposePreview();
}

function focusChatInput() {
  if (!els.chatInput) return;
  window.requestAnimationFrame(() => {
    if (!els.chatInput || els.chatInput.disabled) return;
    els.chatInput.focus({ preventScroll: true });
    els.chatInput.setSelectionRange(els.chatInput.value.length, els.chatInput.value.length);
  });
}

function renderChatEmojiPanel() {
  if (!els.chatEmojiPanel) return;
  const quoteButton = `<button class="chat-quote-button" type="button" data-chat-quote>${renderIconButtonContent("get-quote", "Random cheesy quote")}</button>`;
  const toneLyricButton = `
    <button class="chat-tone-lyric-button" type="button" data-chat-tone-lyric title="Neste Tønes-linje" aria-label="Neste Tønes-linje">
      <img class="chat-tone-lyric-photo" src="/assets/t%C3%B8nes.jpeg" alt="" aria-hidden="true" loading="lazy" decoding="async">
      <span class="sr-only">Neste Tønes-linje</span>
    </button>
  `;
  const specialButtons = `<div class="chat-special-actions">${quoteButton}${toneLyricButton}</div>`;
  const emojiButtons = CHAT_EMOJI_PANEL_SHORTCUTS.map((shortcut) => {
    const emoji = CHAT_EMOJI_SHORTCUTS[shortcut];
    const reaction = CHAT_REACTION_ICONS[shortcut] || { icon: "comments" };
    const shortcutLabel = `:${shortcut}:`;
    const label = reaction.label || SCRIBBY_ICON_NAMES[reaction.icon] || shortcutLabel;
    const title = `${label} (${shortcutLabel})`;
    return `<button class="chat-emoji-option" type="button" data-chat-emoji="${escapeHtml(emoji)}" data-chat-shortcut="${escapeHtml(shortcutLabel)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${renderScribbyIcon(reaction.icon, label, "scribby-icon chat-reaction-icon")}<span class="chat-emoji-tooltip" aria-hidden="true">${escapeHtml(shortcutLabel)}</span></button>`;
  }).join("");
  els.chatEmojiPanel.innerHTML = `${specialButtons}${emojiButtons}`;
}

function syncChatEmojiPanel() {
  if (els.chatEmojiPanel) {
    els.chatEmojiPanel.classList.toggle("is-hidden", !state.chatEmojiPanelOpen);
  }
  if (els.chatEmojiToggle) {
    els.chatEmojiToggle.setAttribute("aria-expanded", String(state.chatEmojiPanelOpen));
  }
}

function toggleChatEmojiPanel(forceOpen = !state.chatEmojiPanelOpen) {
  state.chatEmojiPanelOpen = Boolean(forceOpen && !els.chatEmojiToggle?.disabled);
  if (state.chatEmojiPanelOpen) closeChatShortcutSuggestions();
  syncChatEmojiPanel();
}

function insertChatText(text, options = {}) {
  if (!els.chatInput || els.chatInput.disabled) return;
  const { closeSuggestions = true } = options;
  const value = els.chatInput.value || "";
  const start = Number.isInteger(els.chatInput.selectionStart) ? els.chatInput.selectionStart : value.length;
  const end = Number.isInteger(els.chatInput.selectionEnd) ? els.chatInput.selectionEnd : start;
  els.chatInput.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
  els.chatInput.focus({ preventScroll: true });
  const nextCursor = start + text.length;
  els.chatInput.setSelectionRange(nextCursor, nextCursor);
  if (closeSuggestions) closeChatShortcutSuggestions();
  else updateChatShortcutSuggestions();
  updateChatComposePreview();
}

function chatMessageHasScribbyPreview(message) {
  const text = expandChatEmojiShortcuts(message);
  return CHAT_EMOJI_ICON_ENTRIES.some((entry) => text.includes(entry.emoji));
}

function updateChatComposePreview() {
  if (!els.chatComposePreview || !els.chatInput || els.chatInput.disabled || !chatMessageHasScribbyPreview(els.chatInput.value)) {
    if (els.chatComposePreview) {
      els.chatComposePreview.classList.add("is-hidden");
      els.chatComposePreview.innerHTML = "";
    }
    return;
  }

  els.chatComposePreview.innerHTML = renderChatContent(els.chatInput.value);
  els.chatComposePreview.classList.remove("is-hidden");
}

function handleChatInputChanged() {
  updateChatShortcutSuggestions();
  updateChatComposePreview();
}

function chatShortcutTokenAtCursor() {
  if (!els.chatInput) return null;
  const value = els.chatInput.value || "";
  const start = Number.isInteger(els.chatInput.selectionStart) ? els.chatInput.selectionStart : value.length;
  const end = Number.isInteger(els.chatInput.selectionEnd) ? els.chatInput.selectionEnd : start;
  if (start !== end) return null;

  const beforeCursor = value.slice(0, start);
  const match = /(^|[^\w&])(:[+\-\w]*)$/.exec(beforeCursor);
  if (!match) return null;
  const token = match[2];
  if (!token || (token.length > 1 && token.endsWith(":"))) return null;
  return {
    query: token.slice(1).toLowerCase(),
    start: start - token.length,
    end,
  };
}

function chatShortcutSuggestionLabel(key) {
  const reaction = CHAT_REACTION_ICONS[key] || {};
  return reaction.label || SCRIBBY_ICON_NAMES[reaction.icon] || key;
}

function matchingChatShortcutSuggestions(query) {
  const normalized = String(query || "").toLowerCase();
  return CHAT_SHORTCUT_SUGGESTION_KEYS
    .map((key, index) => {
      const reaction = CHAT_REACTION_ICONS[key] || {};
      const label = chatShortcutSuggestionLabel(key);
      const haystack = `${key} ${label} ${reaction.icon || ""}`.toLowerCase();
      let score = 0;
      if (!normalized || key.startsWith(normalized)) {
        score = 0;
      } else if (label.toLowerCase().startsWith(normalized)) {
        score = 1;
      } else if (haystack.includes(normalized)) {
        score = 2;
      } else {
        return null;
      }
      return { key, reaction, label, score, index };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, CHAT_SHORTCUT_SUGGESTION_LIMIT);
}

function updateChatShortcutSuggestions() {
  if (!els.chatInput || els.chatInput.disabled) {
    closeChatShortcutSuggestions();
    return;
  }

  const token = chatShortcutTokenAtCursor();
  if (!token) {
    closeChatShortcutSuggestions();
    return;
  }

  const matches = matchingChatShortcutSuggestions(token.query);
  if (!matches.length) {
    closeChatShortcutSuggestions();
    return;
  }

  const currentKey = state.chatShortcutSuggestions.matches[state.chatShortcutSuggestions.activeIndex]?.key;
  const nextActiveIndex = Math.max(0, matches.findIndex((match) => match.key === currentKey));
  state.chatShortcutSuggestions = {
    open: true,
    matches,
    activeIndex: nextActiveIndex,
    tokenStart: token.start,
    tokenEnd: token.end,
  };
  state.chatEmojiPanelOpen = false;
  syncChatEmojiPanel();
  renderChatShortcutSuggestions();
}

function closeChatShortcutSuggestions() {
  if (!state.chatShortcutSuggestions.open && !state.chatShortcutSuggestions.matches.length) return;
  state.chatShortcutSuggestions = {
    open: false,
    matches: [],
    activeIndex: 0,
    tokenStart: -1,
    tokenEnd: -1,
  };
  renderChatShortcutSuggestions();
}

function renderChatShortcutSuggestions() {
  if (!els.chatShortcutSuggestions) return;
  const { open, matches, activeIndex } = state.chatShortcutSuggestions;
  const visible = Boolean(open && matches.length && !els.chatInput?.disabled);
  els.chatShortcutSuggestions.classList.toggle("is-hidden", !visible);
  if (els.chatInput) {
    els.chatInput.setAttribute("aria-expanded", String(visible));
    if (visible) {
      els.chatInput.setAttribute("aria-activedescendant", `chatShortcutSuggestion-${activeIndex}`);
    } else {
      els.chatInput.removeAttribute("aria-activedescendant");
    }
  }
  if (!visible) {
    els.chatShortcutSuggestions.innerHTML = "";
    return;
  }

  els.chatShortcutSuggestions.innerHTML = matches.map((match, index) => {
    const shortcut = `:${match.key}:`;
    const isActive = index === activeIndex;
    const icon = match.reaction.icon || "comments";
    return `
      <button
        class="chat-shortcut-suggestion ${isActive ? "is-active" : ""}"
        id="chatShortcutSuggestion-${index}"
        type="button"
        role="option"
        aria-selected="${isActive}"
        data-chat-shortcut-pick="${escapeHtml(match.key)}"
      >
        ${renderScribbyIcon(icon, match.label, "scribby-icon chat-suggestion-icon")}
        <span class="chat-shortcut-main">${escapeHtml(shortcut)}</span>
        <span class="chat-shortcut-label">${escapeHtml(match.label)}</span>
      </button>
    `;
  }).join("");
}

function moveChatShortcutSuggestion(delta) {
  if (!state.chatShortcutSuggestions.open || !state.chatShortcutSuggestions.matches.length) return;
  const count = state.chatShortcutSuggestions.matches.length;
  state.chatShortcutSuggestions.activeIndex = (state.chatShortcutSuggestions.activeIndex + delta + count) % count;
  renderChatShortcutSuggestions();
}

function completeChatShortcut(index = state.chatShortcutSuggestions.activeIndex) {
  if (!els.chatInput || !state.chatShortcutSuggestions.open) return false;
  const match = state.chatShortcutSuggestions.matches[index];
  if (!match) return false;
  const value = els.chatInput.value || "";
  const start = state.chatShortcutSuggestions.tokenStart;
  const end = state.chatShortcutSuggestions.tokenEnd;
  if (start < 0 || end < start) return false;

  const nextChar = value.slice(end, end + 1);
  const replacement = `:${match.key}:` + (nextChar && /\s/.test(nextChar) ? "" : " ");
  els.chatInput.value = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
  const cursor = start + replacement.length;
  els.chatInput.focus({ preventScroll: true });
  els.chatInput.setSelectionRange(cursor, cursor);
  closeChatShortcutSuggestions();
  updateChatComposePreview();
  return true;
}

function handleChatShortcutKeydown(event) {
  if (!state.chatShortcutSuggestions.open) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    event.stopPropagation();
    moveChatShortcutSuggestion(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    event.stopPropagation();
    moveChatShortcutSuggestion(-1);
  } else if (event.key === "Enter" || event.key === "Tab") {
    event.preventDefault();
    event.stopPropagation();
    completeChatShortcut();
  } else if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeChatShortcutSuggestions();
  }
}

function handleChatShortcutSuggestionClick(event) {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest("[data-chat-shortcut-pick]");
  if (!button) return;
  const key = button.dataset.chatShortcutPick;
  const index = state.chatShortcutSuggestions.matches.findIndex((match) => match.key === key);
  if (index >= 0) completeChatShortcut(index);
}

function randomChatQuote() {
  return CHAT_CRINGY_QUOTES[Math.floor(Math.random() * CHAT_CRINGY_QUOTES.length)];
}

function toneYatzyLyricEmoji() {
  return CHAT_REACTION_ICONS[TONES_YATZY_LYRIC_ICON_KEY]?.emoji || "🎸";
}

function toneYatzyLyricTextFromMessage(message) {
  const text = String(message || "").trim();
  const icon = toneYatzyLyricEmoji();
  if (!text.startsWith(icon)) return "";
  return text.slice(icon.length).trim();
}

function isToneYatzyLyricMessage(entry) {
  const lyricText = toneYatzyLyricTextFromMessage(entry?.message);
  return Boolean(lyricText && TONES_YATZY_LYRIC_LINES.includes(lyricText));
}

function sentToneYatzyLyricCount() {
  return (state.game?.chat || []).filter(isToneYatzyLyricMessage).length;
}

function nextToneYatzyLyricMessage() {
  if (!TONES_YATZY_LYRIC_LINES.length) return "";
  const line = TONES_YATZY_LYRIC_LINES[sentToneYatzyLyricCount() % TONES_YATZY_LYRIC_LINES.length];
  return `${toneYatzyLyricEmoji()} ${line}`;
}

function handleChatEmojiOutsidePointerDown(event) {
  if ((!state.chatEmojiPanelOpen && !state.chatShortcutSuggestions.open) || !(event.target instanceof Element)) return;
  if (event.target.closest(".chat-form")) return;
  toggleChatEmojiPanel(false);
  closeChatShortcutSuggestions();
}

function handleChatEmojiEscape(event) {
  if ((!state.chatEmojiPanelOpen && !state.chatShortcutSuggestions.open) || event.key !== "Escape") return;
  const shouldFocusInput = state.chatShortcutSuggestions.open && !state.chatEmojiPanelOpen;
  event.preventDefault();
  toggleChatEmojiPanel(false);
  closeChatShortcutSuggestions();
  if (shouldFocusInput) els.chatInput?.focus({ preventScroll: true });
  else els.chatEmojiToggle?.focus({ preventScroll: true });
}

function playGameTransitionSounds(previous, next) {
  if (!previous || !next || previous.code !== next.code) return;
  if (previous.status === "finished" && next.status === "playing") {
    state.soundedScores.clear();
    state.celebratedYatzies.clear();
    return;
  }

  for (const nextPlayer of next.players || []) {
    const previousPlayer = previous.players?.find((player) => player.seatId === nextPlayer.seatId);
    if (!previousPlayer) {
      const joinKey = `${next.code}:${nextPlayer.seatId}`;
      if (nextPlayer.seatId !== state.seatId && !state.soundedPlayers.has(joinKey)) {
        state.soundedPlayers.add(joinKey);
        playEffectSound("join");
      }
      continue;
    }

    for (const [categoryId, score] of Object.entries(nextPlayer.scores || {})) {
      if (score === null && previousPlayer.scores?.[categoryId] !== null) {
        state.soundedScores.delete(`${next.code}:${nextPlayer.seatId}:${categoryId}`);
        continue;
      }
      if (score === null || previousPlayer.scores?.[categoryId] === score) continue;
      const scoreKey = `${next.code}:${nextPlayer.seatId}:${categoryId}`;
      if (state.soundedScores.has(scoreKey)) continue;
      state.soundedScores.add(scoreKey);

      if (YATZY_CATEGORY_IDS.has(categoryId)) {
        if (Number(score) === 0) playEffectSound("crossOutYatzy");
        continue;
      }
      playEffectSound(Number(score) === 0 ? "crossOut" : "write");
    }
  }
}

function maybeCelebrateYatzy(previous, next) {
  if (!previous || !next || previous.code !== next.code) return;
  for (const nextPlayer of next.players || []) {
    const previousPlayer = previous.players?.find((player) => player.seatId === nextPlayer.seatId);
    for (const categoryId of YATZY_CATEGORY_IDS) {
      const score = nextPlayer.scores?.[categoryId];
      const previousScore = previousPlayer?.scores?.[categoryId];
      const key = `${next.code}:${nextPlayer.seatId}:${categoryId}`;
      if (score === null && previousScore !== null) {
        state.celebratedYatzies.delete(key);
        continue;
      }
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
      <span class="celebration-icon-row" aria-hidden="true">
        ${renderScribbyIcon("star", "Yatzy", "scribby-icon celebration-icon")}
        ${renderScribbyIcon("firework-explosion", "Feiring", "scribby-icon celebration-icon")}
      </span>
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
      <h2 id="gameOverTitle">${renderScribbyIcon("medal-first-place", "Vinner", "scribby-icon game-over-icon")}<span>${escapeHtml(winnerTitle)}</span></h2>
      <div class="final-scoreboard">
        ${sortedPlayers
          .map(
            (player, index) => {
              const isWinner = winners.some((winner) => winner.seatId === player.seatId);
              return `
          <div class="final-score-row ${isWinner ? "is-winner" : ""}">
            <span class="final-rank">${isWinner ? renderScribbyIcon("medal-first-place", "Vinner", "scribby-icon final-rank-icon") : index + 1}</span>
            ${renderPlayerAvatar(player, "final-player-avatar")}
            <strong>${escapeHtml(player.name)}</strong>
            <b>${player.totals.total}</b>
          </div>
        `;
            },
          )
          .join("")}
      </div>
      <button class="primary action-button" type="button" data-play-again ${state.pending ? "disabled" : ""}>Spill igjen</button>
    </div>
  `;
  els.celebrationLayer.classList.add("is-visible", "is-game-over");
  els.celebrationLayer.setAttribute("aria-hidden", "false");
}

function renderChatMessage(entry) {
  const mine = entry.seatId === state.seatId ? "is-mine" : "";
  const player = state.game?.players.find((entryPlayer) => entryPlayer.seatId === entry.seatId) || { seatId: entry.seatId, name: entry.name };
  const authorName = entry.name || player.name || "Spiller";
  return `
    <div class="chat-message ${mine}">
      <strong class="chat-author">${renderPlayerAvatar(player, "chat-avatar")}<span>${escapeHtml(authorName)}</span></strong>
      <span class="chat-bubble">${renderChatContent(entry.message)}</span>
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
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function expandChatEmojiShortcuts(message) {
  return String(message || "").replace(/(^|[^\w&])(:[+\-\w]+:?)(?=$|[^\w])/g, (match, prefix, shortcode) => {
    const key = shortcode.slice(1, shortcode.endsWith(":") ? -1 : undefined).toLowerCase();
    const emoji = CHAT_EMOJI_SHORTCUTS[key];
    return emoji ? `${prefix}${emoji}` : match;
  });
}

function handleGlobalClickSound(event) {
  if (!(event.target instanceof Element)) return;
  const control = event.target.closest("button, a[href], select, summary, [role='button'], input[type='button'], input[type='submit'], input[type='reset'], input[type='checkbox'], input[type='radio']");
  if (!control || control.matches(":disabled, [aria-disabled='true']")) return;
  playClickSound();
}

function loadWorkspaceLayout() {
  if (!els.gameView) return;
  const playWidth = Number(localStorage.getItem("yatzy:layout:playWidth"));
  const roomWidth = Number(localStorage.getItem("yatzy:layout:roomWidth"));
  const chatHeight = Number(localStorage.getItem("yatzy:layout:chatHeight"));
  if (playWidth > 0) els.gameView.style.setProperty("--play-column-width", `${playWidth}px`);
  if (roomWidth > 0) els.gameView.style.setProperty("--room-column-width", `${roomWidth}px`);
  if (chatHeight > 0) els.gameView.style.setProperty("--chat-height", `${chatHeight}px`);
}

function bindWorkspaceResizers() {
  bindColumnResizer(els.playScoreResizer, "play");
  bindColumnResizer(els.scoreRoomResizer, "room");
  bindFlowResizer();
}

function bindColumnResizer(handle, target) {
  if (!handle || !els.gameView) return;

  const resizeBy = (delta) => {
    const play = els.gameView.querySelector(".play-column");
    const score = els.gameView.querySelector(".score-wrap");
    const room = els.gameView.querySelector(".room-flow-panel");
    if (!play || !score || !room) return;
    const available = play.offsetWidth + score.offsetWidth + room.offsetWidth;
    if (target === "play") {
      const next = clamp(play.offsetWidth + delta, 360, available - room.offsetWidth - 260);
      els.gameView.style.setProperty("--play-column-width", `${next}px`);
      localStorage.setItem("yatzy:layout:playWidth", String(Math.round(next)));
    } else {
      const next = clamp(room.offsetWidth - delta, 220, available - play.offsetWidth - 260);
      els.gameView.style.setProperty("--room-column-width", `${next}px`);
      localStorage.setItem("yatzy:layout:roomWidth", String(Math.round(next)));
    }
    void synchronizeDice3dSize();
  };

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    let previousX = event.clientX;
    handle.classList.add("is-dragging");
    handle.setPointerCapture(event.pointerId);
    const onMove = (moveEvent) => {
      resizeBy(moveEvent.clientX - previousX);
      previousX = moveEvent.clientX;
    };
    const onEnd = () => {
      handle.classList.remove("is-dragging");
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onEnd);
      handle.removeEventListener("pointercancel", onEnd);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onEnd);
    handle.addEventListener("pointercancel", onEnd);
  });

  handle.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    resizeBy(event.key === "ArrowRight" ? 16 : -16);
  });
}

function bindFlowResizer() {
  const handle = els.chatFlowResizer;
  if (!handle || !els.gameView) return;

  const resizeBy = (delta) => {
    const panel = handle.closest(".room-flow-panel");
    const chat = panel?.querySelector(".chat-section");
    const flow = panel?.querySelector(".flow-section");
    if (!panel || !chat || !flow) return;
    const next = clamp(chat.offsetHeight + delta, 120, panel.clientHeight - 132);
    els.gameView.style.setProperty("--chat-height", `${next}px`);
    localStorage.setItem("yatzy:layout:chatHeight", String(Math.round(next)));
  };

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    let previousY = event.clientY;
    handle.classList.add("is-dragging");
    handle.setPointerCapture(event.pointerId);
    const onMove = (moveEvent) => {
      resizeBy(moveEvent.clientY - previousY);
      previousY = moveEvent.clientY;
    };
    const onEnd = () => {
      handle.classList.remove("is-dragging");
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onEnd);
      handle.removeEventListener("pointercancel", onEnd);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onEnd);
    handle.addEventListener("pointercancel", onEnd);
  });

  handle.addEventListener("keydown", (event) => {
    if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    resizeBy(event.key === "ArrowDown" ? 16 : -16);
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

window.addEventListener("resize", () => {
  if (!state.dice3d.visible) return;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      constrainDice3dWorld();
      keepSettledDice3dInView();
      state.dice3d.sizeKey = dice3dStageSizeKey();
    });
  });
});

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
  const code = String(els.roomCode.value || "")
    .trim()
    .toUpperCase();
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
els.leaveRoom.addEventListener("click", () => {
  void leaveRoom();
});
if (els.diceCustomizer) {
  els.diceCustomizer.addEventListener("click", (event) => {
    const button = event.target.closest("[data-dice-theme]");
    if (!button) return;
    applyDiceTheme(button.dataset.diceTheme);
  });
}
if (els.feltCustomizer) {
  els.feltCustomizer.addEventListener("click", (event) => {
    const button = event.target.closest("[data-felt-theme]");
    if (!button) return;
    applyFeltTheme(button.dataset.feltTheme);
  });
}
if (els.soundToggle) {
  els.soundToggle.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    saveSoundEnabled(state.soundEnabled);
    renderSoundToggle();
  });
}
if (els.celebrationLayer) {
  els.celebrationLayer.addEventListener("click", (event) => {
    const button = event.target.closest("[data-play-again]");
    if (!button) return;
    action("restart");
  });
}
if (els.confirmDialog) {
  els.confirmDialog.addEventListener("click", handleConfirmDialogClick);
}
document.addEventListener("pointerdown", () => ensureAudioContext(), { once: true });
document.addEventListener("pointerdown", handleChatEmojiOutsidePointerDown);
document.addEventListener("pointerdown", handlePlayerMenuOutsidePointerDown);
document.addEventListener("keydown", () => ensureAudioContext(), { once: true });
document.addEventListener("keydown", handleConfirmDialogKeydown, true);
document.addEventListener("keydown", handleRollShortcut);
document.addEventListener("keydown", handleDieShortcut);
document.addEventListener("keydown", handleChatEmojiEscape);
document.addEventListener("click", handleGlobalClickSound);
if (els.syncRecoveryAction) {
  els.syncRecoveryAction.addEventListener("click", () => {
    state.syncIssue = null;
    void action("roll");
  });
}
if (els.playersList) {
  els.playersList.addEventListener("click", handlePlayerMenuClick);
}
if (els.chatForm) {
  els.chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendChat(els.chatInput?.value);
    toggleChatEmojiPanel(false);
    closeChatShortcutSuggestions();
  });
}
if (els.chatInput) {
  els.chatInput.addEventListener("input", handleChatInputChanged);
  els.chatInput.addEventListener("click", handleChatInputChanged);
  els.chatInput.addEventListener("keyup", (event) => {
    if (["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)) return;
    handleChatInputChanged();
  });
  els.chatInput.addEventListener("keydown", handleChatShortcutKeydown);
}
if (els.chatEmojiToggle) {
  els.chatEmojiToggle.addEventListener("click", () => {
    toggleChatEmojiPanel();
  });
}
if (els.chatShortcutSuggestions) {
  els.chatShortcutSuggestions.addEventListener("click", handleChatShortcutSuggestionClick);
}
if (els.chatEmojiPanel) {
  els.chatEmojiPanel.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) return;
    const quoteButton = event.target.closest("[data-chat-quote]");
    if (quoteButton) {
      toggleChatEmojiPanel(false);
      await sendChat(randomChatQuote(), { clearInput: false, kind: "quote" });
      return;
    }

    const toneLyricButton = event.target.closest("[data-chat-tone-lyric]");
    if (toneLyricButton) {
      toggleChatEmojiPanel(false);
      const lyricMessage = nextToneYatzyLyricMessage();
      if (!lyricMessage) {
        showToast("Legg inn korte Tønes-linjer først.");
        return;
      }
      await sendChat(lyricMessage, { clearInput: false, kind: "quote" });
      return;
    }

    const button = event.target.closest("[data-chat-emoji]");
    if (!button) return;
    const shortcut = button.dataset.chatShortcut || "";
    insertChatText(shortcut ? `${shortcut} ` : button.dataset.chatEmoji || "");
    toggleChatEmojiPanel(false);
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
  els.roomCode.value = els.roomCode.value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
});

async function boot() {
  preloadEffectAudio();
  loadWorkspaceLayout();
  bindWorkspaceResizers();
  applyDiceTheme(loadDiceTheme());
  applyFeltTheme(loadFeltTheme());
  renderSoundToggle();
  renderChatEmojiPanel();
  syncChatEmojiPanel();
  scheduleDice3dPreload();
  const params = new URLSearchParams(window.location.search);
  const code = String(params.get("room") || "")
    .trim()
    .toUpperCase();
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
