// A small seeded random number generator (mulberry32), so a ?seed=N run of the game
// always deals the same orders and the same screenshot scenes.
export function createRandom(seed) {
  let value = seed >>> 0;
  return {
    next() {
      value = (value + 0x6d2b79f5) | 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(max) {
      return Math.floor(this.next() * max);
    },
    pick(list) {
      return list[this.int(list.length)];
    },
  };
}
