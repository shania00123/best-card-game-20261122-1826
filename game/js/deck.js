// Ember Court — seeded random numbers and deck building, so a demo table
// (and a screenshot) can be reproduced exactly from a seed.

import { CATALOGUE, makeCardInstance } from './cards.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleInPlace(list, rng) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

let uidCounter = 0;
export function freshUid() {
  uidCounter += 1;
  return `c${uidCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// Two copies of every catalogue card: a 34-card deck.
export function buildDeck(rng) {
  const defs = [];
  for (const def of CATALOGUE) defs.push(def, def);
  shuffleInPlace(defs, rng);
  return defs.map((def) => makeCardInstance(def, freshUid()));
}

export function drawCards(deck, hand, count) {
  const drawn = [];
  for (let i = 0; i < count && deck.length > 0; i += 1) drawn.push(deck.pop());
  hand.push(...drawn);
  return drawn;
}
