// Sizzle & Serve — the hand-in program for best-cooking-game-20261125-0137 (Node 22,
// standard library only). The game itself is plain static files under game/ (index.html plus
// its ES modules, drawn with the canvas 2D API, sounds synthesized with WebAudio, no library
// and no network request at all), and this program is what hands it in: it copies game/ and
// screenshots/ from beside this file into /output and writes /output/dossier.json, the
// summary the judge reads, using the vendored make.fun library. Nothing here is installed,
// downloaded or fetched; the grader runs it twice and both runs must write the same bytes,
// so every step below is a plain deterministic copy plus one deterministic dossier build.
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

// Revision note (play-test round, 2026-11-25): the hand-in itself is unchanged —
// the same copies and the same dossier call — but the game it hands in was fixed
// in three places while play-testing with Playwright: clicks and key presses now
// queue until a world step runs (a frame can outrun the fixed 1/60 s steps, and a
// press consumed by a step-less frame was lost); matching an order now looks at the
// plate in the chef's hands as well as the one on the counter (a held plate never
// matched, so serving was always refused); and the title screen idles in attract
// mode, so the shift clock only starts when the player starts it. Re-running the
// program after this note writes byte-identical output to the run before it.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps (its reference/gate.json): text_max_bytes alone shapes the dossier's
// bytes; the rest refuse an entry the scorer would refuse anyway (more than 4 screenshots
// or one over 256 KiB; more than 993 files in game/ or 48 MiB of game files in all, or a
// path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap,
// alongside screenshots/ and dossier.json), so the build stays inside them by construction.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
