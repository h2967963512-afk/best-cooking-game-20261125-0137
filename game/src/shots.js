// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays the real
// rules forward from a fresh world, steered by a small autopilot that issues the same
// clicks and key presses a player would (walk to a station, use it, wait for the
// chopping board or a burner), so every frame is what a short game really looks like
// and the same seed always gives the same frame.
import { CHOP_SECONDS, COOK_SECONDS, RECIPES, STATIONS } from './config.js';
import { EVENT_OVER, matchingOrder, neededState } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const STEP = 1 / 60;
const START_SECONDS = 8;
const END_LIMIT_SECONDS = 200;

/** A task the autopilot works through: walk to a station (and use it on arrival). */
function goTask(station, bin) {
  return { type: 'go', station, bin: bin ?? null, issued: false };
}
function waitTask(until, maxSeconds) {
  return { type: 'wait', until, elapsed: 0, max: maxSeconds };
}
function pressTask() {
  return { type: 'press', issued: false };
}

/** The order the plate already fits best, so a half-built dish is not abandoned. */
function bestOrder(state) {
  let best = null;
  let bestScore = -1;
  for (const order of state.orders) {
    const recipe = RECIPES.find((entry) => entry.id === order.recipeId);
    if (!recipe) continue;
    const score = state.plate.items.filter((item) =>
      recipe.needs.some((id) => id === item.id && neededState(id) === item.state),
    ).length;
    if (score > bestScore) {
      bestScore = score;
      best = order;
    }
  }
  return best;
}

/** The tasks that finish one order from the kitchen's current state. */
function planFor(state) {
  const order = bestOrder(state);
  if (!order) return [];
  const recipe = RECIPES.find((entry) => entry.id === order.recipeId);
  const tasks = [];
  const hands = state.hands;
  // Everything already plated, whether the plate sits on the counter or in hand.
  const heldItems = hands && hands.id === 'plate' ? hands.items.map((item) => item.id) : [];
  const onPlate = [...state.plate.items.map((item) => item.id), ...heldItems];
  const stray = onPlate.some((id) => !recipe.needs.includes(id));

  // A finished plate in hand goes straight to the window.
  if (hands && hands.id === 'plate' && matchingOrder(state)) {
    return [goTask('window')];
  }
  // A plate in hand that fits the order goes back on the counter; one that does
  // not gets emptied in the bin first.
  if (hands && hands.id === 'plate') {
    if (stray) {
      tasks.push(goTask('bin'));
      tasks.push(goTask('counter'));
    } else {
      tasks.push(goTask('counter'));
    }
  } else if (hands && hands.id !== 'plate') {
    // A single item in hand: plate it when it belongs, bin it when it does not.
    const belongs =
      recipe.needs.includes(hands.id) &&
      neededState(hands.id) === hands.state &&
      !onPlate.includes(hands.id);
    tasks.push(goTask(belongs ? 'counter' : 'bin'));
  }
  // A stray item on the counter plate means starting that plate over.
  if (stray && (!hands || hands.id !== 'plate')) {
    tasks.push(goTask('counter'));
    tasks.push(goTask('bin'));
    tasks.push(goTask('counter'));
  }
  for (const id of recipe.needs) {
    if (onPlate.includes(id) && !stray) continue;
    const wanted = neededState(id);
    if (wanted === 'chopped') {
      tasks.push(goTask('pantry', id));
      tasks.push(goTask('board'));
      tasks.push(waitTask((s) => s.board.item && s.board.progress >= CHOP_SECONDS, 6));
      tasks.push(pressTask());
      tasks.push(goTask('counter'));
    } else if (wanted === 'cooked') {
      tasks.push(goTask('pantry', id));
      tasks.push(goTask('stove'));
      tasks.push(
        waitTask(
          (s) => s.burners.some((b) => b.item && b.item.id === id && b.done),
          COOK_SECONDS + 6,
        ),
      );
      tasks.push(pressTask());
      tasks.push(goTask('counter'));
    } else {
      tasks.push(goTask('pantry', id));
      tasks.push(goTask('counter'));
    }
  }
  tasks.push(goTask('counter'));
  tasks.push(goTask('window'));
  return tasks;
}

/** One autopilot: it works a queue of tasks and reports the input for this step. */
function createPilot() {
  let tasks = [];
  let planOrderId = null;
  return {
    input(state) {
      const order = bestOrder(state);
      if (!order) return { mx: 0, my: 0 };
      if (tasks.length === 0 || planOrderId !== order.id) {
        tasks = planFor(state);
        planOrderId = order.id;
      }
      const task = tasks[0];
      if (!task) return { mx: 0, my: 0 };
      if (task.type === 'go') {
        if (!task.issued) {
          task.issued = true;
          const approach = STATIONS[task.station].approach;
          return { mx: 0, my: 0, newTarget: { x: approach.x, y: approach.y, station: task.station }, bin: task.bin };
        }
        // Done once the chef is no longer walking to it.
        if (!state.chef.pendingStation && (!state.chef.path || state.chef.path.length === 0)) {
          tasks.shift();
        }
        return { mx: 0, my: 0 };
      }
      if (task.type === 'wait') {
        task.elapsed += STEP;
        if (task.until(state) || task.elapsed >= task.max) tasks.shift();
        return { mx: 0, my: 0 };
      }
      // press
      if (!task.issued) {
        task.issued = true;
        tasks.shift();
        return { mx: 0, my: 0, interact: true };
      }
      return { mx: 0, my: 0 };
    },
  };
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name is start)
 * and return the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { mx: 0, my: 0 }, true);
    }
    return { screen: SCREEN_TITLE };
  }
  const pilot = createPilot();
  const limit = name === 'end' ? END_LIMIT_SECONDS : 120;
  for (let index = 0; index < limit / STEP; index += 1) {
    const events = world.step(STEP, pilot.input(world.state));
    if (events & EVENT_OVER) break;
    if (name === 'play') {
      // A dish mid-assembly: one item on the plate, the next still chopping.
      if (world.state.plate.items.length >= 1 && world.state.board.item) {
        return { screen: SCREEN_PLAY };
      }
    }
    if (name === 'serve') {
      // A plate ready to serve, carried to the window.
      const hands = world.state.hands;
      if (hands && hands.id === 'plate' && world.matchingOrder()) {
        const approach = STATIONS.window.approach;
        const distance = Math.hypot(world.state.chef.x - approach.x, world.state.chef.y - approach.y);
        if (distance < 120) return { screen: SCREEN_PLAY };
      }
    }
  }
  return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY };
}
