# Online Yatzy

A small realtime Yatzy app for private rooms. It supports:

- Norwegian Yatzy with 5 dice, 63-point upper bonus, pair/two-pair, fixed straights, house, chance, and Yatzy.
- Maxi Yatzy with 6 dice, 84-point upper bonus, three pairs, five of a kind, full straight, villa, tower, Maxi Yatzy, and saved unused rolls.
- Optional forced mode for both variants, with lower upper-section bonus thresholds, five rolls on the Yatzy round, and early Yatzy scoring that defers the skipped field to the final round.
- Any number of players in the lobby before the game starts.
- Private room links, no accounts, reconnect from the same browser.
- Server-owned turns, dice rolls, scoring, and version checks for stale clicks.
- Dice roll animation, browser-generated sounds, and local dice theme preferences.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

This app currently has no runtime npm dependencies, so `npm install` only creates the lockfile if you want one.

## Online Play

The app is a plain Node server, so deploy it anywhere that runs Node 20+ and supports long-lived HTTP connections for Server-Sent Events.

Good first hosts for this version:

- Render Web Service
- Railway
- Fly.io
- A small VPS

Set the start command to:

```bash
npm start
```

The server stores room state in `data/games.json`. For a hobby/private game this is simple and handy; for a public app, swap that file store for a small database.

## Tests

```bash
npm test
```
