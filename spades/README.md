# Spades Score Tracker

A mobile-first, zero-dependency PWA for keeping score in a game of Spades. Open `index.html` in any modern browser — no build step, no npm, no CDN.

## Features

- **Standard Spades scoring** — bid × 10 for a made contract, −bid × 10 for a set, +1 per overtrick.
- **Bags (sandbagging)** — overtricks accumulate as bags; every 10 bags triggers a −100 penalty and the counter rolls over to the remainder.
- **Nil & Blind Nil (per-player)** — check the ♠ Nil box and the bid stepper becomes the **partner's bid**. A small "Nil Took" stepper slides in so you can record whether the nil player broke (took any tricks). Nil component is ±100 (±200 Blind); partner's contract is scored against the team's total tricks; overtricks still accrue as bags. Leave Nil unchecked for a plain team bid.
- **Two-team layout** — side-by-side columns, editable team names, large touch-friendly ±steppers (long-press to repeat). - **Configurable end conditions** — default win at 500, lose at −200; both editable in Game Settings.
- **Round history** — scrollable, collapsible log showing bid/tricks, per-round delta, cumulative score, and bag gains for every round. - **Undo** — pops the last round and restores its values into the entry form for correction.
- **Persistence** — full game state (rounds, entry-in-progress, names, settings, theme) is saved to `localStorage`; refresh or close the tab and pick up where you left off.
- **Dark mode** — follows `prefers-color-scheme` by default; theme button cycles auto → dark → light.
- **Installable PWA** — web manifest + cache-first service worker; add to home screen and use offline.

## Running locally

Service workers require a real origin (not `file://`). Serve the folder with any static server:

```sh
cd spades-tracker
python3 -m http.server 8000
```

Then open <http://localhost:8000/> on your phone or desktop. To test on a phone over LAN, use your machine's IP (e.g.
`http://192.168.1.42:8000/`).

## Deploying

Any static host works — GitHub Pages, Netlify, Cloudflare Pages, an S3 bucket, or a folder on your own server. Just upload the three files:

- `index.html`
- `manifest.json`
- `sw.js`

## Scoring reference

### Team contract (Nil unchecked)

| Situation                       | Score                          | Bags | | ------------------------------- | ------------------------------ | ---- | | tricks ≥ bid                    | bid × 10 + (tricks − bid)      | +overtricks |
| tricks < bid                    | −(bid × 10)                    | 0    | | Every 10 cumulative bags        | −100, counter ← counter mod 10 |      |

### Partner Nil (Nil checked)

`bid` = the non-nil partner's bid. `tricks` = team's total tricks. `nilTook` = tricks the nil player personally took.

| Situation                         | Score
          | Bags |
| --------------------------------- |
------------------------------------------ | ---- | | nilTook = 0, tricks ≥ bid         | +100 + bid×10 + (tricks − bid)
          | +overtricks |
| nilTook = 0, tricks < bid         | +100 − bid×10
          | 0    |
| nilTook > 0, tricks ≥ bid         | −100 + bid×10 + (tricks − bid)
          | +overtricks |
| nilTook > 0, tricks < bid         | −100 − bid×10
          | 0    |
| *Blind Nil*                       | ±200 instead of ±100 for the nil component |      |
| *Double Nil* (bid = 0 with Nil ✓) | ±200 (±400 blind), bags = tricks if failed |      |

## Verifying the math

Open the browser console and use `__spades.scoreTeam(bid, tricks, blind, nil, nilTook)` or `__spades.applyBagPenalty(before, gained)` to spot-check any scenario. Run `node test-scoring.js` for the headless suite.
