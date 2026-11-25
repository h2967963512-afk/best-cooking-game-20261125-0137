// Keyboard and mouse: WASD or arrows walk, E or Space uses the nearest station,
// number keys pick a pantry bin, P pauses, M mutes, and a click walks the chef to
// the spot (or to a station, which is then used on arrival). Actions are edge
// triggered: takeActions() returns what was pressed since the last call, then clears.
import { PANTRY_BINS, STATIONS, pantryBinRect } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_MUTE = 8;

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

/** Which station, if any, a canvas point falls on (pantry bins count as the pantry). */
export function stationAt(x, y) {
  for (const [key, station] of Object.entries(STATIONS)) {
    if (pointInRect(x, y, station.rect)) return key;
  }
  return null;
}

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let click = null;
  let bin = null;
  let pointer = { x: 0, y: 0, inside: false };

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM | ACTION_INTERACT;
      event.preventDefault();
    }
    if (event.code === 'KeyE') actions |= ACTION_INTERACT;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (/^Digit[1-6]$/.test(event.code)) bin = PANTRY_BINS[Number(event.code.slice(5)) - 1];
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const station = stationAt(point.x, point.y);
    if (station === 'pantry') {
      // A click on a bin picks that ingredient; anywhere else in the pantry walks over.
      for (let index = 0; index < PANTRY_BINS.length; index += 1) {
        if (pointInRect(point.x, point.y, pantryBinRect(index))) {
          bin = PANTRY_BINS[index];
          break;
        }
      }
      click = { x: STATIONS.pantry.approach.x, y: STATIONS.pantry.approach.y, station: 'pantry' };
    } else if (station) {
      click = { x: STATIONS[station].approach.x, y: STATIONS[station].approach.y, station };
    } else {
      click = { x: point.x, y: point.y, station: null };
    }
    actions |= ACTION_CONFIRM;
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', (event) => {
    pointer = { ...canvasPoint(event), inside: true };
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.inside = false;
  });

  /** The walk direction the held keys give, each axis -1, 0 or 1. */
  function direction() {
    const left = keys.has('KeyA') || keys.has('ArrowLeft');
    const right = keys.has('KeyD') || keys.has('ArrowRight');
    const up = keys.has('KeyW') || keys.has('ArrowUp');
    const down = keys.has('KeyS') || keys.has('ArrowDown');
    return { mx: (right ? 1 : 0) - (left ? 1 : 0), my: (down ? 1 : 0) - (up ? 1 : 0) };
  }

  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  /** The click since the last call, if any, then cleared. */
  function takeClick() {
    const taken = click;
    click = null;
    return taken;
  }

  /** The pantry bin a number key or a bin click picked since the last call. */
  function takeBin() {
    const taken = bin;
    bin = null;
    return taken;
  }

  return { direction, takeActions, takeClick, takeBin, pointer: () => pointer };
}
