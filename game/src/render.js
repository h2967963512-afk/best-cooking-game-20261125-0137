// Every pixel the game shows: the kitchen, the order rail, the stations, the chef,
// the food and the four screens. It reads the world's state and paints it; it never
// changes the state. All art is drawn with canvas shapes, so the game needs no files
// beyond its own source.
import {
  BURN_SECONDS,
  CHOP_SECONDS,
  COOK_SECONDS,
  INGREDIENTS,
  ORDER_RAIL,
  PANTRY_BINS,
  RECIPES,
  STATIONS,
  VIEW,
  pantryBinRect,
} from './config.js';
import { itemName, neededState } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const WOOD = '#8a5a33';
const WOOD_DARK = '#6f4525';
const WOOD_LIGHT = '#a9743f';
const CREAM = '#f7ead0';
const WALL = '#f2dfba';
const TILE_A = '#d9a05b';
const TILE_B = '#c98f4e';
const INK = '#3a2a1a';
const GOLD = '#f7c948';
const RED = '#e5484d';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, size, color, weight = 'bold', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

/** One ingredient, drawn at (x, y) in a box of `size`, in the given state. */
export function drawIngredient(ctx, id, stateName, x, y, size) {
  const half = size / 2;
  const def = INGREDIENTS[id];
  ctx.save();
  ctx.translate(x, y);
  if (id === 'tomato') {
    if (stateName === 'chopped') {
      for (let i = -1; i <= 1; i += 1) {
        ctx.fillStyle = i === 0 ? def.color : def.dark;
        ctx.beginPath();
        ctx.arc(i * half * 0.55, 0, half * 0.52, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f2b8a0';
        ctx.beginPath();
        ctx.arc(i * half * 0.55, 0, half * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, half * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.dark;
      ctx.beginPath();
      ctx.arc(-half * 0.3, -half * 0.3, half * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#58b368';
      ctx.beginPath();
      ctx.ellipse(0, -half * 0.85, half * 0.3, half * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'lettuce') {
    if (stateName === 'chopped') {
      ctx.fillStyle = def.color;
      for (let i = 0; i < 5; i += 1) {
        const angle = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(angle) * half * 0.4, Math.sin(angle) * half * 0.4, half * 0.42, half * 0.2, angle, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, half * 0.95, half * 0.75, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-half * 0.6, half * 0.2);
      ctx.quadraticCurveTo(0, -half * 0.5, half * 0.6, half * 0.1);
      ctx.stroke();
    }
  } else if (id === 'patty') {
    ctx.fillStyle = stateName === 'burnt' ? '#241d18' : stateName === 'cooked' ? def.color : '#c98d7a';
    roundRect(ctx, -half * 0.95, -half * 0.55, size * 0.95, size * 0.55, half * 0.25);
    ctx.fill();
    if (stateName === 'cooked') {
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * half * 0.5 - half * 0.2, -half * 0.5);
        ctx.lineTo(i * half * 0.5 + half * 0.2, half * 0.5);
        ctx.stroke();
      }
    }
  } else if (id === 'bun') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, half * 0.25, half * 0.9, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = def.dark;
    ctx.fillRect(-half * 0.9, half * 0.2, size * 0.9, half * 0.28);
    ctx.fillStyle = '#fff3d6';
    for (const [sx, sy] of [[-0.4, -0.35], [0, -0.55], [0.4, -0.35]]) {
      ctx.beginPath();
      ctx.ellipse(sx * half, sy * half, 2.5, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'pasta') {
    ctx.strokeStyle = stateName === 'cooked' ? '#e8a93c' : def.color;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, half * (0.35 + i * 0.28), 0.3 + i, 4.4 + i);
      ctx.stroke();
    }
  } else if (id === 'cheese') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(-half * 0.9, half * 0.7);
    ctx.lineTo(half * 0.9, half * 0.7);
    ctx.lineTo(half * 0.9, -half * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = def.dark;
    for (const [hx, hy] of [[-0.4, 0.25], [0.3, 0.35], [0.55, -0.1]]) {
      ctx.beginPath();
      ctx.arc(hx * half, hy * half, half * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A plate with the items on it, drawn at (x, y) with radius `r`. */
function drawPlate(ctx, items, x, y, r) {
  ctx.fillStyle = '#fdfdf8';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8d2c0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e9e4d2';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.68, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  items.forEach((item, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, items.length)) * Math.PI * 2;
    const ix = x + Math.cos(angle) * r * 0.34;
    const iy = y + Math.sin(angle) * r * 0.2;
    drawIngredient(ctx, item.id, item.state, ix, iy, r * 0.62);
  });
}

function drawProgressRing(ctx, x, y, r, fraction, color) {
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, fraction));
  ctx.stroke();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let walkPhase = 0;
  let lastChef = null;

  function drawBackground() {
    // Wall and floor.
    ctx.fillStyle = WALL;
    ctx.fillRect(0, 0, VIEW.width, 168);
    ctx.fillStyle = '#e3cda0';
    ctx.fillRect(0, 160, VIEW.width, 8);
    for (let ty = 0; ty < 9; ty += 1) {
      for (let tx = 0; tx < 16; tx += 1) {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? TILE_A : TILE_B;
        ctx.fillRect(tx * 80, 168 + ty * 62, 80, 62);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let ty = 0; ty < 9; ty += 1) ctx.fillRect(0, 168 + ty * 62, VIEW.width, 2);
    // A sunny window and a hanging lamp for the kitchen's own look.
    ctx.fillStyle = '#bfe3f2';
    roundRect(ctx, 780, 176, 150, 60, 8);
    ctx.fill();
    ctx.strokeStyle = WOOD_DARK;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(855, 176);
    ctx.lineTo(855, 236);
    ctx.moveTo(780, 206);
    ctx.lineTo(930, 206);
    ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(810, 196, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTopBar(state, best) {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, VIEW.width, 64);
    text(ctx, 'SIZZLE & SERVE', 24, 33, 26, GOLD);
    text(ctx, 'Golden Skillet Kitchen', 280, 35, 15, '#d8c9a8', 'normal');
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = Math.floor(state.timeLeft % 60);
    const urgent = state.timeLeft <= 30 && !state.over;
    const timerColor = urgent ? RED : '#ffffff';
    // A small clock face, drawn rather than an emoji (fonts vary by machine).
    ctx.strokeStyle = timerColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(596, 32, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(596, 32);
    ctx.lineTo(596, 22);
    ctx.moveTo(596, 32);
    ctx.lineTo(604, 32);
    ctx.stroke();
    text(ctx, `${minutes}:${String(seconds).padStart(2, '0')}`, 616, 33, 30, timerColor, 'bold', 'left');
    if (urgent) text(ctx, 'RUSH!', 640, 56, 11, RED, 'bold', 'center');
    // A gold coin, drawn rather than an emoji.
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(884, 32, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b57e2e';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, String(state.coins), 902, 33, 24, '#ffffff', 'bold', 'left');
    text(ctx, `Served ${state.served}`, 1040, 33, 18, '#d8c9a8', 'bold', 'center');
    text(ctx, `Best ${best}`, 1180, 33, 18, '#d8c9a8', 'bold', 'center');
    if (state.combo >= 2) {
      text(ctx, `Combo x${state.combo}`, 760, 33, 18, '#ff9d5c', 'bold', 'center');
    }
  }

  function drawOrderRail(state) {
    ctx.fillStyle = WOOD;
    roundRect(ctx, ORDER_RAIL.x, ORDER_RAIL.y, ORDER_RAIL.w, ORDER_RAIL.h, 10);
    ctx.fill();
    ctx.fillStyle = WOOD_DARK;
    roundRect(ctx, ORDER_RAIL.x, ORDER_RAIL.y, ORDER_RAIL.w, 10, 5);
    ctx.fill();
    text(ctx, 'ORDER BOARD', 40, ORDER_RAIL.y + 26, 13, '#ffe9b8');
    text(ctx, 'serve what the ticket asks', 40, ORDER_RAIL.y + 48, 11, '#e8cfa0', 'normal');
    const ticketW = 236;
    const gap = 14;
    state.orders.forEach((order, index) => {
      const recipe = RECIPES.find((entry) => entry.id === order.recipeId);
      const x = 170 + index * (ticketW + gap);
      const y = ORDER_RAIL.y + 6;
      const fraction = order.patience / order.maxPatience;
      const urgent = order.patience < 15;
      ctx.fillStyle = urgent ? '#ffe1de' : '#fff8e6';
      roundRect(ctx, x, y, ticketW, 72, 8);
      ctx.fill();
      ctx.strokeStyle = urgent ? RED : '#d8c9a8';
      ctx.lineWidth = urgent ? 3 : 1.5;
      ctx.stroke();
      text(ctx, `#${order.id}  ${recipe.name}`, x + 10, y + 16, 15, INK);
      recipe.needs.forEach((id, needIndex) => {
        drawIngredient(ctx, id, neededState(id), x + 24 + needIndex * 34, y + 44, 26);
      });
      text(ctx, `${Math.ceil(order.patience)}s`, x + ticketW - 12, y + 44, 14, urgent ? RED : '#7a5a30', 'bold', 'right');
      ctx.fillStyle = '#e5dcc4';
      ctx.fillRect(x + 10, y + 62, ticketW - 20, 6);
      ctx.fillStyle = fraction > 0.5 ? '#58b368' : fraction > 0.25 ? '#f2a93c' : RED;
      ctx.fillRect(x + 10, y + 62, (ticketW - 20) * Math.max(0, fraction), 6);
    });
    if (state.orders.length === 0) {
      text(ctx, 'No orders yet — the lunch rush is coming…', 170, ORDER_RAIL.y + 42, 16, '#e8cfa0', 'normal');
    }
  }

  function drawPantry(state) {
    const rect = STATIONS.pantry.rect;
    ctx.fillStyle = WOOD;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    text(ctx, 'PANTRY', rect.x + rect.w / 2, rect.y + rect.h + 16, 13, '#fff3d6', 'bold', 'center');
    PANTRY_BINS.forEach((id, index) => {
      const binRect = pantryBinRect(index);
      const picked = state.pantryPick === id;
      ctx.fillStyle = picked ? '#ffe9b8' : '#f7ead0';
      roundRect(ctx, binRect.x, binRect.y, binRect.w, binRect.h, 6);
      ctx.fill();
      ctx.strokeStyle = picked ? GOLD : '#d8c9a8';
      ctx.lineWidth = picked ? 3 : 1;
      ctx.stroke();
      drawIngredient(ctx, id, 'raw', binRect.x + 22, binRect.y + binRect.h / 2, 30);
      text(ctx, INGREDIENTS[id].name, binRect.x + 42, binRect.y + binRect.h / 2, 13, INK);
      text(ctx, String(index + 1), binRect.x + binRect.w - 10, binRect.y + binRect.h / 2, 12, '#7a5a30', 'bold', 'right');
    });
  }

  function drawBoard(state) {
    const rect = STATIONS.board.rect;
    ctx.fillStyle = WOOD_LIGHT;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.strokeStyle = WOOD_DARK;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, 'CHOPPING BOARD', rect.x + rect.w / 2, rect.y + rect.h + 16, 13, '#fff3d6', 'bold', 'center');
    const board = state.board;
    if (board.item) {
      const done = board.progress >= CHOP_SECONDS;
      drawIngredient(ctx, board.item.id, done ? 'chopped' : 'raw', rect.x + rect.w / 2, rect.y + rect.h / 2, 46);
      if (!done) {
        drawProgressRing(ctx, rect.x + rect.w / 2, rect.y + rect.h / 2, 30, board.progress / CHOP_SECONDS, '#58b368');
      } else {
        text(ctx, '✓ ready', rect.x + rect.w - 8, rect.y + 16, 12, '#2f7d3d', 'bold', 'right');
      }
    } else {
      text(ctx, 'chop tomato · lettuce here', rect.x + rect.w / 2, rect.y + rect.h / 2, 13, '#8a6a42', 'normal', 'center');
    }
  }

  function drawStove(state) {
    const rect = STATIONS.stove.rect;
    ctx.fillStyle = '#4a4a52';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#2c2c33';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, 'STOVE', rect.x + rect.w / 2, rect.y + rect.h + 16, 13, '#fff3d6', 'bold', 'center');
    state.burners.forEach((burner, index) => {
      const cx = rect.x + 60 + index * 120;
      const cy = rect.y + rect.h / 2;
      ctx.fillStyle = '#33333a';
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = burner.item ? '#c96a2e' : '#55555e';
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fill();
      if (burner.item) {
        const itemState = burner.burnt ? 'burnt' : burner.done ? 'cooked' : 'raw';
        drawIngredient(ctx, burner.item.id, itemState, cx, cy, 34);
        if (!burner.done) {
          drawProgressRing(ctx, cx, cy, 32, burner.progress / COOK_SECONDS, '#f2a93c');
        } else if (burner.burnt) {
          text(ctx, 'BURNT!', cx, cy - 44, 13, RED, 'bold', 'center');
        } else {
          text(ctx, '✓ done', cx, cy - 44, 12, '#2f7d3d', 'bold', 'center');
        }
      }
    });
  }

  function drawCounter(state, readyOrder) {
    const rect = STATIONS.counter.rect;
    ctx.fillStyle = WOOD;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.fill();
    ctx.strokeStyle = WOOD_DARK;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, 'ASSEMBLY COUNTER', rect.x + rect.w / 2, rect.y + rect.h + 16, 13, '#fff3d6', 'bold', 'center');
    if (!state.plateHeld) {
      drawPlate(ctx, state.plate.items, rect.x + rect.w / 2, rect.y + rect.h / 2 + 6, 58);
      if (state.plate.items.length === 0) {
        text(ctx, 'add finished food to the plate', rect.x + rect.w / 2, rect.y + rect.h - 12, 12, '#e8cfa0', 'normal', 'center');
      }
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.ellipse(rect.x + rect.w / 2, rect.y + rect.h / 2 + 6, 58, 36, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (readyOrder) {
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 180);
      ctx.fillStyle = `rgba(247,201,72,${0.85 * pulse})`;
      roundRect(ctx, rect.x + rect.w / 2 - 78, rect.y - 40, 156, 24, 12);
      ctx.fill();
      text(ctx, '✓ READY TO SERVE', rect.x + rect.w / 2, rect.y - 27, 13, INK, 'bold', 'center');
    }
  }

  function drawWindow(state, holdingReady) {
    const rect = STATIONS.window.rect;
    ctx.fillStyle = WOOD;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.fillStyle = '#2c2c33';
    roundRect(ctx, rect.x + 10, rect.y + 10, rect.w - 20, 110, 6);
    ctx.fill();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(rect.x + rect.w / 2, rect.y + 160, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(rect.x + rect.w / 2, rect.y + 160, 6, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, 'SERVING', rect.x + rect.w / 2, rect.y + 196, 13, '#fff3d6', 'bold', 'center');
    text(ctx, 'WINDOW', rect.x + rect.w / 2, rect.y + 212, 13, '#fff3d6', 'bold', 'center');
    if (holdingReady) {
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 180);
      ctx.strokeStyle = `rgba(247,201,72,${pulse})`;
      ctx.lineWidth = 5;
      roundRect(ctx, rect.x - 6, rect.y - 6, rect.w + 12, rect.h + 12, 12);
      ctx.stroke();
    }
  }

  function drawBin() {
    const rect = STATIONS.bin.rect;
    ctx.fillStyle = '#6b7280';
    roundRect(ctx, rect.x + 18, rect.y, rect.w - 36, rect.h, 8);
    ctx.fill();
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(rect.x + 10, rect.y - 6, rect.w - 20, 14);
    text(ctx, 'BIN', rect.x + rect.w / 2, rect.y + rect.h / 2, 14, '#ffffff', 'bold', 'center');
  }

  function drawChef(state, heldLabel) {
    const chef = state.chef;
    if (lastChef && (lastChef.x !== chef.x || lastChef.y !== chef.y)) walkPhase += 0.35;
    lastChef = { x: chef.x, y: chef.y };
    const bob = Math.abs(Math.sin(walkPhase)) * 3;
    const x = chef.x;
    const y = chef.y - bob;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(chef.x, chef.y + 22, 24, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body and apron.
    ctx.fillStyle = '#fdfdf8';
    roundRect(ctx, x - 18, y - 6, 36, 34, 10);
    ctx.fill();
    ctx.fillStyle = '#e5484d';
    ctx.fillRect(x - 18, y + 8, 36, 6);
    // Head and tall chef hat.
    ctx.fillStyle = '#f2c79b';
    ctx.beginPath();
    ctx.arc(x, y - 18, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 8, y - 32, 9, 0, Math.PI * 2);
    ctx.arc(x, y - 36, 10, 0, Math.PI * 2);
    ctx.arc(x + 8, y - 32, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 13, y - 32, 26, 8);
    // Eyes look the way the chef faces.
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x + chef.face * 4 - 4, y - 19, 1.8, 0, Math.PI * 2);
    ctx.arc(x + chef.face * 4 + 4, y - 19, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // What the hands hold, carried overhead.
    if (state.hands) {
      if (state.hands.id === 'plate') {
        drawPlate(ctx, state.hands.items, x, y - 58, 34);
      } else {
        drawIngredient(ctx, state.hands.id, state.hands.state, x, y - 58, 36);
      }
      if (heldLabel) text(ctx, heldLabel, x, y - 84, 12, INK, 'bold', 'center');
    }
  }

  function drawHint(nearest) {
    if (!nearest) return;
    const labels = {
      pantry: 'E — take ingredient (1–6 picks)',
      board: 'E — chop / pick up',
      stove: 'E — cook / pick up',
      counter: 'E — add to plate / pick plate up',
      window: 'E — serve the plate',
      bin: 'E — throw it away',
    };
    text(ctx, labels[nearest] ?? '', VIEW.width / 2, VIEW.height - 18, 15, '#fff3d6', 'bold', 'center');
  }

  function drawOverlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(20,12,6,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#fff8e6';
    roundRect(ctx, 340, 150, 600, 400, 16);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.stroke();
    text(ctx, title, 640, 210, 40, INK, 'bold', 'center');
    lines.forEach((line, index) => {
      text(ctx, line, 640, 270 + index * 34, 18, line.startsWith('★') ? '#b57e2e' : '#5a4632', line.startsWith('★') ? 'bold' : 'normal', 'center');
    });
  }

  function draw(state, screen, best, extra) {
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 8 * state.shake * 3, (Math.random() - 0.5) * 8 * state.shake * 3);
    }
    drawBackground();
    drawTopBar(state, best);
    drawOrderRail(state);
    drawPantry(state);
    drawBoard(state);
    drawStove(state);
    const readyOrder = !state.plateHeld && state.plate.items.length > 0 ? extra.matchingOrder : null;
    drawCounter(state, readyOrder);
    const holdingReady = state.hands && state.hands.id === 'plate' && extra.matchingOrder;
    drawWindow(state, holdingReady);
    drawBin();
    const heldLabel = !state.hands
      ? null
      : state.hands.id === 'plate'
        ? extra.matchingOrder
          ? `${RECIPES.find((entry) => entry.id === extra.matchingOrder.recipeId).name} — serve it!`
          : 'Plate'
        : itemName(state.hands);
    drawChef(state, heldLabel);
    if (screen === SCREEN_PLAY) drawHint(extra.nearest);
    if (state.flash) {
      ctx.globalAlpha = Math.min(1, state.flash.time);
      text(ctx, state.flash.text, state.chef.x, state.chef.y - 100, 22, GOLD, 'bold', 'center');
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (screen === SCREEN_TITLE) {
      drawOverlay('SIZZLE & SERVE', [
        'Run the Golden Skillet Kitchen through the lunch rush.',
        'Grab ingredients, chop and grill them, build each order on the plate,',
        'then serve it at the window before the ticket runs out.',
        '',
        '★ Move: WASD / arrows or click  ·  Use: E or Space  ·  Pantry: 1–6',
        '★ P or Esc pauses  ·  M mutes',
        '',
        'Press Space or click to start',
      ], GOLD);
      if (best > 0) text(ctx, `Best shift: ${best} coins`, 640, 500, 18, '#b57e2e', 'bold', 'center');
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay('PAUSED', ['Take a breath — the tickets are waiting.', '', 'Press P or Space to keep cooking'], GOLD);
    } else if (screen === SCREEN_OVER) {
      drawOverlay('SHIFT COMPLETE!', [
        `You earned ${state.coins} coins and served ${state.served} dish${state.served === 1 ? '' : 'es'}.`,
        `${state.lost} order${state.lost === 1 ? '' : 's'} walked out.  Best combo x${state.bestCombo}.`,
        best > state.coins ? `Best shift: ${best} coins` : '★ New best shift! ★',
        '',
        'Press Space or click to cook again',
      ], GOLD);
    }
  }

  return { draw };
}
