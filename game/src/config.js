// The kitchen's fixed numbers: canvas size, the shift clock, the recipes on the menu,
// every ingredient and what the stations do to it. Nothing here moves; world.js owns
// the state that changes while a shift runs.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const SHIFT_SECONDS = 180;
export const BEST_KEY = 'sizzle-and-serve-best';

/** How long a ticket waits before the customer walks out, at the shift's start. */
export const ORDER_PATIENCE = 70;
/** Seconds between new tickets at the shift's start; it shortens as the rush builds. */
export const ORDER_EVERY = 14;
/** At most this many tickets wait on the board at once. */
export const MAX_ORDERS = 4;
/** Coins for a served dish, plus a tip of up to this much for serving it fast. */
export const SERVE_COINS = 20;
export const TIP_MAX = 15;
/** Coins lost when a ticket expires. */
export const EXPIRE_PENALTY = 8;

/** One ingredient: its id, the name the board shows, and how it is drawn and handled. */
export const INGREDIENTS = {
  tomato: { name: 'Tomato', chop: true, cook: null, color: '#e5484d', dark: '#b02e33' },
  lettuce: { name: 'Lettuce', chop: true, cook: null, color: '#58b368', dark: '#2f7d3d' },
  patty: { name: 'Patty', chop: false, cook: 'grilled patty', color: '#8a5a3b', dark: '#5f3a24' },
  bun: { name: 'Bun', chop: false, cook: null, color: '#e8b25c', dark: '#b57e2e' },
  pasta: { name: 'Pasta', chop: false, cook: 'cooked pasta', color: '#f2d06b', dark: '#c39a35' },
  cheese: { name: 'Cheese', chop: false, cook: null, color: '#f7c948', dark: '#d9a514' },
};

/** What a cooked ingredient becomes once its burner finishes. */
export const COOKED_NAME = {
  patty: 'Grilled Patty',
  pasta: 'Cooked Pasta',
};
/** What a chopped ingredient becomes once the board finishes it. */
export const CHOPPED_NAME = {
  tomato: 'Chopped Tomato',
  lettuce: 'Chopped Lettuce',
};

/** The menu: each dish is a set of finished items, named by their ingredient ids. */
export const RECIPES = [
  {
    id: 'salad',
    name: 'Garden Salad',
    needs: ['tomato', 'lettuce'],
    color: '#58b368',
    blurb: 'Fresh, crisp, quick.',
  },
  {
    id: 'pasta',
    name: 'Cheesy Pasta',
    needs: ['pasta', 'cheese'],
    color: '#f2d06b',
    blurb: 'Golden and gooey.',
  },
  {
    id: 'burger',
    name: 'Classic Burger',
    needs: ['bun', 'patty', 'lettuce'],
    color: '#e8b25c',
    blurb: 'The house favourite.',
  },
  {
    id: 'tomato-pasta',
    name: 'Tomato Pasta',
    needs: ['pasta', 'tomato'],
    color: '#e5484d',
    blurb: 'Bright and hearty.',
  },
  {
    id: 'deluxe',
    name: 'Deluxe Burger',
    needs: ['bun', 'patty', 'cheese', 'tomato'],
    color: '#c98a2e',
    blurb: 'The full works.',
  },
];

/** Seconds on the board to chop an ingredient, and on a burner to cook one. */
export const CHOP_SECONDS = 2.0;
export const COOK_SECONDS = 5.0;
/** Seconds after a burner finishes before the food on it burns. */
export const BURN_SECONDS = 7.0;

/** The chef's walking speed, in pixels per second. */
export const CHEF_SPEED = 260;
/** How close the chef must be to a station to use it. */
export const REACH = 78;

/**
 * Where every station sits. The kitchen is one room: the order rail runs under the
 * top bar, the pantry bins run along the left wall, the chopping board and stove
 * along the top, the assembly counter in the middle, and the serving window and bin
 * along the right wall. Each station has a rectangle to draw, an approach point the
 * chef walks to, and a label.
 */
export const STATIONS = {
  pantry: {
    label: 'Pantry',
    rect: { x: 24, y: 170, w: 120, h: 330 },
    approach: { x: 176, y: 335 },
  },
  board: {
    label: 'Chopping Board',
    rect: { x: 220, y: 170, w: 190, h: 74 },
    approach: { x: 315, y: 276 },
  },
  stove: {
    label: 'Stove',
    rect: { x: 470, y: 170, w: 240, h: 74 },
    approach: { x: 590, y: 276 },
  },
  counter: {
    label: 'Assembly Counter',
    rect: { x: 470, y: 380, w: 300, h: 120 },
    approach: { x: 620, y: 532 },
  },
  window: {
    label: 'Serving Window',
    rect: { x: 1136, y: 170, w: 120, h: 220 },
    approach: { x: 1104, y: 280 },
  },
  bin: {
    label: 'Bin',
    rect: { x: 1136, y: 450, w: 120, h: 90 },
    approach: { x: 1104, y: 495 },
  },
};

/** The six pantry bins, top to bottom, as they are drawn inside the pantry. */
export const PANTRY_BINS = ['tomato', 'lettuce', 'patty', 'bun', 'pasta', 'cheese'];

/** The rectangle of one pantry bin, so input and render place them identically. */
export function pantryBinRect(index) {
  const pantry = STATIONS.pantry.rect;
  const height = pantry.h / PANTRY_BINS.length;
  return { x: pantry.x + 8, y: pantry.y + 8 + index * height, w: pantry.w - 16, h: height - 10 };
}

/** Where the chef starts a shift, and the room's walkable bounds. */
export const CHEF_START = { x: 620, y: 580 };
export const FLOOR = { x: 150, y: 260, w: 960, h: 400 };

/** The order rail: the tickets hang here, under the top bar. */
export const ORDER_RAIL = { x: 24, y: 72, w: 1232, h: 84 };
