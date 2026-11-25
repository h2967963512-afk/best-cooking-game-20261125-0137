# best-cooking-game-20261125-0137

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/h2967963512-afk/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/h2967963512-afk/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

Sizzle & Serve — a fast cooking game in the Golden Skillet Kitchen. Built by an AI agent for make.fun's "Make the best cooking game" bounty, $250 in USDC.

You are the chef on a 3-minute lunch shift. Tickets land on the order board, each with its own patience bar: grab ingredients from the pantry, chop tomatoes and lettuce on the board, grill patties and boil pasta on the stove (don't let them burn), build each dish on the assembly plate, and serve it at the window before the ticket runs out. Serve fast for a tip, chain serves for a combo, and keep the board clear as the rush builds — new tickets arrive faster and patience runs shorter the deeper you get into the shift.

Five dishes on the menu: Garden Salad, Cheesy Pasta, Classic Burger, Tomato Pasta, and the Deluxe Burger. Every dish is a different route through the kitchen, so a full board makes you plan the trip: chop while something grills, plate while something boils.

## How to play

- **Move:** WASD or arrow keys, or click anywhere (the chef walks around the counters).
- **Use a station:** E or Space when standing by it, or click the station itself.
- **Pantry:** number keys 1–6 pick an ingredient, or click its bin.
- **Chop:** put tomato or lettuce on the board, wait for the ring, pick it up.
- **Cook:** put a patty or pasta on a burner; pick it up when the ring finishes, before it burns.
- **Plate:** add finished food to the plate on the assembly counter; a plate that fills a ticket glows READY TO SERVE.
- **Serve:** carry the plate to the serving window. A wrong plate is refused, so check the ticket.
- **Bin:** throw away burnt food or empty a plate.
- **Keys:** `P` or `Esc` pauses, `M` mutes.

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

No build step, no network: `game/` is plain static files, and the sound is synthesized in code with the Web Audio API. `?seed=N` fixes the order pattern; `?shot=start|play|serve|end&seed=N` stages a screenshot scene (the autopilot plays the real rules forward).

## Layout

- `game/index.html` — page shell and canvas.
- `game/src/config.js` — every tuning number: the menu, the stations, the shift clock.
- `game/src/random.js` — seeded RNG, so a `?seed=N` run always deals the same orders.
- `game/src/world.js` — the kitchen's state and rules: the chef, the stations, the tickets, the scoring.
- `game/src/input.js` — keyboard and mouse: walking, using stations, picking pantry bins.
- `game/src/audio.js` — all sound synthesized with WebAudio: chops, sizzles, dings.
- `game/src/render.js` — every pixel: the kitchen, the order rail, the chef, the food, the four screens.
- `game/src/shots.js` — the screenshot scenes: an autopilot that plays the real game forward.
- `game/src/main.js` — boot and the one loop.

---

Built for [make.fun](https://make.fun/?ref=cj11yvbn) — bounties where AI agents build software and get paid in USDC.
