// The kitchen's state and rules: the chef, the stations, the orders on the board and
// the shift clock. It knows nothing about drawing or keys; main.js feeds it input and
// render.js paints what it holds. One fixed step (1/60 s) advances chopping, cooking,
// patience and the clock, and returns the events the step caused, so the loop can
// play a sound or announce them.
import {
  BURN_SECONDS,
  CHEF_SPEED,
  CHEF_START,
  CHOP_SECONDS,
  COOK_SECONDS,
  EXPIRE_PENALTY,
  FLOOR,
  INGREDIENTS,
  MAX_ORDERS,
  ORDER_EVERY,
  ORDER_PATIENCE,
  PANTRY_BINS,
  REACH,
  RECIPES,
  SERVE_COINS,
  SHIFT_SECONDS,
  STATIONS,
  TIP_MAX,
} from './config.js';

export const EVENT_NONE = 0;
export const EVENT_SERVED = 1;
export const EVENT_EXPIRED = 2;
export const EVENT_OVER = 4;
export const EVENT_BURN = 8;
export const EVENT_CHOP_DONE = 16;
export const EVENT_COOK_DONE = 32;
export const EVENT_REFUSED = 64;
export const EVENT_PICKUP = 128;

/** The finished state an ingredient must be in before it can go on a plate. */
export function neededState(id) {
  if (id === 'tomato' || id === 'lettuce') return 'chopped';
  if (id === 'patty' || id === 'pasta') return 'cooked';
  return 'raw';
}

/** The name a finished item shows, from its id and state. */
export function itemName(item) {
  if (item.state === 'burnt') return `Burnt ${INGREDIENTS[item.id].name}`;
  if (item.state === 'chopped') return `Chopped ${INGREDIENTS[item.id].name}`;
  if (item.state === 'cooked') return item.id === 'patty' ? 'Grilled Patty' : 'Cooked Pasta';
  return INGREDIENTS[item.id].name;
}

function plateMatches(plateItems, recipe) {
  if (plateItems.length !== recipe.needs.length) return false;
  const have = plateItems.map((item) => `${item.id}:${item.state}`).sort();
  const want = recipe.needs.map((id) => `${id}:${neededState(id)}`).sort();
  return have.every((entry, index) => entry === want[index]);
}

/** The items on the plate, wherever the plate is: on the counter or in the chef's hands. */
export function plateItems(state) {
  if (state.hands && state.hands.id === 'plate') return state.hands.items;
  return state.plate.items;
}

/** The first active order this plate would fill, or null when it fills none. */
export function matchingOrder(state) {
  const items = plateItems(state);
  for (const order of state.orders) {
    const recipe = RECIPES.find((entry) => entry.id === order.recipeId);
    if (recipe && plateMatches(items, recipe)) return order;
  }
  return null;
}

export function createWorld(random) {
  const state = {
    chef: { x: CHEF_START.x, y: CHEF_START.y, tx: null, ty: null, face: 1, pendingStation: null, path: null },
    hands: null,
    pantryPick: 'tomato',
    board: { item: null, progress: 0 },
    burners: [
      { item: null, progress: 0, done: false, burnt: false },
      { item: null, progress: 0, done: false, burnt: false },
    ],
    plate: { items: [] },
    plateHeld: false,
    orders: [],
    orderSeq: 0,
    nextOrderIn: 6,
    coins: 0,
    served: 0,
    lost: 0,
    combo: 0,
    bestCombo: 0,
    timeLeft: SHIFT_SECONDS,
    over: false,
    shake: 0,
    flash: null,
  };

  function reset() {
    state.chef.x = CHEF_START.x;
    state.chef.y = CHEF_START.y;
    state.chef.tx = null;
    state.chef.ty = null;
    state.chef.face = 1;
    state.chef.pendingStation = null;
    state.chef.path = null;
    state.hands = null;
    state.pantryPick = 'tomato';
    state.board = { item: null, progress: 0 };
    state.burners = [
      { item: null, progress: 0, done: false, burnt: false },
      { item: null, progress: 0, done: false, burnt: false },
    ];
    state.plate = { items: [] };
    state.plateHeld = false;
    state.orders = [];
    state.orderSeq = 0;
    state.nextOrderIn = 6;
    state.coins = 0;
    state.served = 0;
    state.lost = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.timeLeft = SHIFT_SECONDS;
    state.over = false;
    state.shake = 0;
    state.flash = null;
    spawnOrder();
  }

  function spawnOrder() {
    if (state.orders.length >= MAX_ORDERS) return;
    const recipe = random.pick(RECIPES);
    const progress = 1 - state.timeLeft / SHIFT_SECONDS;
    const patience = ORDER_PATIENCE * (1 - 0.25 * progress);
    state.orderSeq += 1;
    state.orders.push({
      id: state.orderSeq,
      recipeId: recipe.id,
      patience,
      maxPatience: patience,
    });
  }

  function nearestStation() {
    let best = null;
    let bestDistance = Infinity;
    for (const [key, station] of Object.entries(STATIONS)) {
      const dx = state.chef.x - station.approach.x;
      const dy = state.chef.y - station.approach.y;
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = key;
      }
    }
    return bestDistance <= REACH ? best : null;
  }

  /** What the E key (or a click on a station) does where the chef stands. */
  function interact() {
    const station = nearestStation();
    if (!station) return EVENT_NONE;
    const hands = state.hands;

    if (station === 'pantry') {
      if (hands) return EVENT_NONE;
      const id = PANTRY_BINS.includes(state.pantryPick) ? state.pantryPick : 'tomato';
      state.hands = { id, state: 'raw' };
      return EVENT_PICKUP;
    }

    if (station === 'board') {
      const board = state.board;
      if (!board.item && hands && hands.id !== 'plate' && INGREDIENTS[hands.id].chop && hands.state === 'raw') {
        board.item = hands;
        board.progress = 0;
        state.hands = null;
        return EVENT_PICKUP;
      }
      if (board.item && board.progress >= CHOP_SECONDS && !hands) {
        state.hands = { id: board.item.id, state: 'chopped' };
        state.board = { item: null, progress: 0 };
        return EVENT_PICKUP;
      }
      return EVENT_NONE;
    }

    if (station === 'stove') {
      if (hands && hands.id !== 'plate' && INGREDIENTS[hands.id].cook && hands.state === 'raw') {
        const free = state.burners.find((burner) => !burner.item);
        if (!free) return EVENT_NONE;
        free.item = hands;
        free.progress = 0;
        free.done = false;
        free.burnt = false;
        state.hands = null;
        return EVENT_PICKUP;
      }
      if (!hands) {
        const ready = state.burners.find((burner) => burner.item && (burner.done || burner.burnt));
        if (!ready) return EVENT_NONE;
        state.hands = { id: ready.item.id, state: ready.burnt ? 'burnt' : 'cooked' };
        ready.item = null;
        ready.progress = 0;
        ready.done = false;
        ready.burnt = false;
        return EVENT_PICKUP;
      }
      return EVENT_NONE;
    }

    if (station === 'counter') {
      if (hands && hands.id === 'plate') {
        state.plateHeld = false;
        state.hands = null;
        return EVENT_PICKUP;
      }
      if (hands && hands.id !== 'plate') {
        if (hands.state !== neededState(hands.id)) return EVENT_REFUSED;
        if (state.plate.items.some((item) => item.id === hands.id)) return EVENT_REFUSED;
        state.plate.items.push(hands);
        state.hands = null;
        return EVENT_PICKUP;
      }
      if (!hands && !state.plateHeld && state.plate.items.length > 0) {
        state.hands = { id: 'plate', items: state.plate.items };
        state.plate = { items: [] };
        state.plateHeld = true;
        return EVENT_PICKUP;
      }
      return EVENT_NONE;
    }

    if (station === 'window') {
      if (!hands || hands.id !== 'plate') return EVENT_NONE;
      const order = matchingOrder(state);
      if (!order) {
        state.shake = 0.35;
        return EVENT_REFUSED;
      }
      const tip = Math.round((order.patience / order.maxPatience) * TIP_MAX);
      state.coins += SERVE_COINS + tip;
      state.served += 1;
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.orders = state.orders.filter((entry) => entry.id !== order.id);
      state.hands = null;
      state.plateHeld = false;
      state.flash = { text: `+${SERVE_COINS + tip} coins`, time: 1.2 };
      return EVENT_SERVED;
    }

    if (station === 'bin') {
      if (!hands) return EVENT_NONE;
      if (hands.id === 'plate') {
        state.hands = { id: 'plate', items: [] };
      } else {
        state.hands = null;
      }
      return EVENT_PICKUP;
    }
    return EVENT_NONE;
  }

  /**
   * A tiny A* over the floor grid, so a click walks the chef around the counters
   * instead of into them. Cells are 20 px; a cell is blocked when its centre falls
   * inside a station (expanded by the chef's radius). Returns waypoints, or null
   * when the target cannot be reached.
   */
  const CELL = 20;
  function cellBlocked(cx, cy) {
    const x = FLOOR.x + cx * CELL + CELL / 2;
    const y = FLOOR.y + cy * CELL + CELL / 2;
    return Object.values(STATIONS).some((station) => {
      const r = station.rect;
      return x > r.x - 14 && x < r.x + r.w + 14 && y > r.y - 14 && y < r.y + r.h + 14;
    });
  }
  function findPath(from, to) {
    const cols = Math.floor(FLOOR.w / CELL);
    const rows = Math.floor(FLOOR.h / CELL);
    const start = {
      x: Math.max(0, Math.min(cols - 1, Math.floor((from.x - FLOOR.x) / CELL))),
      y: Math.max(0, Math.min(rows - 1, Math.floor((from.y - FLOOR.y) / CELL))),
    };
    const goal = {
      x: Math.max(0, Math.min(cols - 1, Math.floor((to.x - FLOOR.x) / CELL))),
      y: Math.max(0, Math.min(rows - 1, Math.floor((to.y - FLOOR.y) / CELL))),
    };
    const key = (x, y) => `${x},${y}`;
    const open = [{ ...start, g: 0, f: 0, parent: null }];
    const best = new Map([[key(start.x, start.y), 0]]);
    const closed = new Set();
    const heuristic = (x, y) => Math.abs(x - goal.x) + Math.abs(y - goal.y);
    while (open.length > 0) {
      let lowest = 0;
      for (let i = 1; i < open.length; i += 1) if (open[i].f < open[lowest].f) lowest = i;
      const node = open.splice(lowest, 1)[0];
      if (node.x === goal.x && node.y === goal.y) {
        const cells = [];
        let current = node;
        while (current) {
          cells.push(current);
          current = current.parent;
        }
        cells.reverse();
        const points = cells.map((cell) => ({
          x: FLOOR.x + cell.x * CELL + CELL / 2,
          y: FLOOR.y + cell.y * CELL + CELL / 2,
        }));
        points.push({ x: to.x, y: to.y });
        return points;
      }
      closed.add(key(node.x, node.y));
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = node.x + dx;
        const ny = node.y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (closed.has(key(nx, ny)) || cellBlocked(nx, ny)) continue;
        const g = node.g + 1;
        if (best.has(key(nx, ny)) && best.get(key(nx, ny)) <= g) continue;
        best.set(key(nx, ny), g);
        open.push({ x: nx, y: ny, g, f: g + heuristic(nx, ny), parent: node });
      }
    }
    return null;
  }

  /** Move the chef one step toward a click target, or by a key direction. A click on a
   * station also arms an auto-interact: once the chef is close enough, the station is
   * used without another key press. Returns EVENT bits an auto-interact caused. */
  function moveChef(dt, input) {
    const chef = state.chef;
    let events = EVENT_NONE;
    if (input.newTarget) {
      chef.pendingStation = input.newTarget.station ?? null;
      chef.path = findPath({ x: chef.x, y: chef.y }, { x: input.newTarget.x, y: input.newTarget.y });
      chef.tx = input.newTarget.x;
      chef.ty = input.newTarget.y;
    }
    let dx = 0;
    let dy = 0;
    if ((input.mx || input.my) && !(chef.path && chef.path.length > 0)) {
      // Keys steer directly and cancel a click walk.
      chef.path = null;
      chef.tx = null;
      chef.ty = null;
      chef.pendingStation = null;
      dx = input.mx || 0;
      dy = input.my || 0;
      const length = Math.hypot(dx, dy);
      if (length > 0) {
        dx /= length;
        dy /= length;
      }
    } else if (chef.path && chef.path.length > 0) {
      const target = chef.path[0];
      const distX = target.x - chef.x;
      const distY = target.y - chef.y;
      const distance = Math.hypot(distX, distY);
      if (distance < 8) {
        chef.path.shift();
      } else {
        dx = distX / distance;
        dy = distY / distance;
      }
    }
    if (dx !== 0) chef.face = dx > 0 ? 1 : -1;
    const next = { x: chef.x + dx * CHEF_SPEED * dt, y: chef.y + dy * CHEF_SPEED * dt };
    next.x = Math.max(FLOOR.x, Math.min(FLOOR.x + FLOOR.w, next.x));
    next.y = Math.max(FLOOR.y, Math.min(FLOOR.y + FLOOR.h, next.y));
    // The counters are solid: slide along them instead of walking through.
    const blocked = (x, y) =>
      Object.values(STATIONS).some((station) => {
        const r = station.rect;
        return x > r.x - 14 && x < r.x + r.w + 14 && y > r.y - 14 && y < r.y + r.h + 14;
      });
    if (!blocked(next.x, chef.y)) chef.x = next.x;
    if (!blocked(chef.x, next.y)) chef.y = next.y;
    // Arrived at a station the player clicked: use it once, then stop waiting.
    if (chef.pendingStation) {
      const station = STATIONS[chef.pendingStation];
      const distance = Math.hypot(chef.x - station.approach.x, chef.y - station.approach.y);
      if (distance <= REACH) {
        chef.pendingStation = null;
        chef.path = null;
        chef.tx = null;
        chef.ty = null;
        events |= interact();
      }
    }
    return events;
  }

  /** Advance the kitchen one fixed step. `input` is {mx, my, newTarget, interact, bin}.
   * In attract mode (the title screen idling behind) the clock, the tickets and the
   * arrivals are frozen: the shift starts only when the player starts it. */
  function step(dt, input, attract = false) {
    if (state.over) return EVENT_NONE;
    let events = EVENT_NONE;
    if (input.bin) state.pantryPick = input.bin;
    events |= moveChef(dt, input);
    if (input.interact) events |= interact();

    // Chopping finishes on the board.
    if (state.board.item && state.board.progress < CHOP_SECONDS) {
      state.board.progress += dt;
      if (state.board.progress >= CHOP_SECONDS) events |= EVENT_CHOP_DONE;
    }
    // Burners cook, then burn.
    for (const burner of state.burners) {
      if (!burner.item) continue;
      burner.progress += dt;
      if (!burner.done && burner.progress >= COOK_SECONDS) {
        burner.done = true;
        events |= EVENT_COOK_DONE;
      } else if (burner.done && !burner.burnt && burner.progress >= COOK_SECONDS + BURN_SECONDS) {
        burner.burnt = true;
        events |= EVENT_BURN;
      }
    }
    if (attract) return events;
    // Tickets wait, then walk out.
    for (const order of state.orders) order.patience -= dt;
    const expired = state.orders.filter((order) => order.patience <= 0);
    if (expired.length > 0) {
      state.orders = state.orders.filter((order) => order.patience > 0);
      state.lost += expired.length;
      state.combo = 0;
      state.coins = Math.max(0, state.coins - EXPIRE_PENALTY * expired.length);
      events |= EVENT_EXPIRED;
    }
    // New tickets arrive faster as the rush builds.
    state.nextOrderIn -= dt;
    if (state.nextOrderIn <= 0) {
      const progress = 1 - state.timeLeft / SHIFT_SECONDS;
      spawnOrder();
      state.nextOrderIn = ORDER_EVERY * (1 - 0.4 * progress);
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
    if (state.flash) {
      state.flash.time -= dt;
      if (state.flash.time <= 0) state.flash = null;
    }
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  return { state, reset, step, interact, nearestStation, matchingOrder: () => matchingOrder(state) };
}
