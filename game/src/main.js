// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the order pattern. ?shot=start|play|serve|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY, CHOP_SECONDS, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_BURN,
  EVENT_CHOP_DONE,
  EVENT_COOK_DONE,
  EVENT_EXPIRED,
  EVENT_OVER,
  EVENT_PICKUP,
  EVENT_REFUSED,
  EVENT_SERVED,
} from './world.js';
import { ACTION_CONFIRM, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
world.reset();
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  const best = name === 'end' ? Math.max(readBest(), world.state.coins) : readBest();
  // For play-testing: the staged state, read-only from the console.
  window.__game = {
    screen: scene.screen,
    coins: world.state.coins,
    served: world.state.served,
    orders: world.state.orders.map((order) => order.recipeId),
    timeLeft: Math.round(world.state.timeLeft),
    chef: { x: Math.round(world.state.chef.x), y: Math.round(world.state.chef.y) },
    hands: world.state.hands,
    plate: world.state.plate.items.map((item) => `${item.id}:${item.state}`),
    over: world.state.over,
  };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, best, {
      matchingOrder: world.matchingOrder(),
      nearest: world.nearestStation(),
    });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let queued = { click: null, bin: null, interact: false };

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Serve the orders before their tickets run out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.coins > best) {
      best = world.state.coins;
      saveBest(best);
    }
    audio.over();
    announce(`Shift complete. ${world.state.coins} coins, ${world.state.served} dishes served.`);
  }

  function playSounds(events) {
    if (events & EVENT_SERVED) audio.serve();
    if (events & EVENT_EXPIRED) audio.expired();
    if (events & EVENT_CHOP_DONE) audio.chop();
    if (events & EVENT_COOK_DONE) audio.cookDone();
    if (events & EVENT_REFUSED) audio.refused();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_BURN) audio.refused();
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Clicks and key presses queue up until a world step runs: frames can outrun
    // the fixed 1/60 s steps, and a press consumed by a step-less frame would be lost.
    const freshActions = input.takeActions();
    const freshClick = input.takeClick();
    const freshBin = input.takeBin();
    if (freshClick) queued.click = freshClick;
    if (freshBin) queued.bin = freshBin;
    if (freshActions & ACTION_INTERACT) queued.interact = true;
    const actions = freshActions | (queued.interact ? ACTION_INTERACT : 0);
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM) audio.unlock();

    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }

    if (screen === SCREEN_TITLE) {
      // The kitchen idles behind the title: the clock and tickets are frozen.
      while (accumulator >= STEP) {
        world.step(STEP, { mx: 0, my: 0 }, true);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      let firstStep = true;
      while (accumulator >= STEP) {
        const direction = input.direction();
        // A click, a bin pick and an E press act once: on the frame's first step.
        const events = world.step(STEP, {
          mx: direction.mx,
          my: direction.my,
          newTarget: firstStep ? queued.click : null,
          interact: firstStep && queued.interact,
          bin: firstStep ? queued.bin : null,
        });
        if (firstStep) queued = { click: null, bin: null, interact: false };
        firstStep = false;
        playSounds(events);
        accumulator -= STEP;
      }
      const cooking = world.state.burners.some((burner) => burner.item && !burner.done);
      audio.updateSizzle(cooking);
    } else {
      accumulator = 0;
    }

    // For play-testing and debugging: the live state, read-only from the console.
    window.__game = {
      screen,
      coins: world.state.coins,
      served: world.state.served,
      orders: world.state.orders.map((order) => order.recipeId),
      timeLeft: Math.round(world.state.timeLeft),
      chef: { x: Math.round(world.state.chef.x), y: Math.round(world.state.chef.y) },
      hands: world.state.hands,
      plate: world.state.plate.items.map((item) => `${item.id}:${item.state}`),
      board: world.state.board.item
        ? { id: world.state.board.item.id, done: world.state.board.progress >= CHOP_SECONDS }
        : null,
      pathLen: world.state.chef.path ? world.state.chef.path.length : 0,
      pendingStation: world.state.chef.pendingStation,
    };
    renderer.draw(world.state, screen, best, {
      matchingOrder: world.matchingOrder(),
      nearest: world.nearestStation(),
    });
  }

  // Leaving the tab pauses a running game rather than letting tickets expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
