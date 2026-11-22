// Ember Court — the rules engine. Pure state, no DOM: a game is a plain
// object (players, boards, hands, decks, turn, log) and these functions move it.
// Both mages start at 30 life; embers grow +1 a turn to a cap of 10; a card
// drawn each turn; an empty deck deals rising fatigue damage.

import { CARD_BY_ID, elementBeats, makeCardInstance } from './cards.js';
import { buildDeck, drawCards, mulberry32 } from './deck.js';

export const MAX_LIFE = 30;
export const MAX_MANA = 10;
export const MAX_BOARD = 5;
export const MAX_HAND = 8;
export const START_HAND = 4;

export function newSide(deck) {
  return {
    life: MAX_LIFE,
    maxMana: 0,
    mana: 0,
    deck,
    hand: [],
    board: [],
    fatigue: 0,
    lastElementPlayed: null,
  };
}

export function newGame(seed) {
  const rng = mulberry32(seed >>> 0 || 20261123);
  const game = {
    seed,
    turn: 1,
    phase: 'playing', // 'playing' | 'won' | 'lost'
    active: 'player', // whose turn it is
    player: newSide(buildDeck(rng)),
    rival: newSide(buildDeck(rng)),
    log: ['The duel begins. Your move, mage.'],
    stats: { turnsTaken: 0, cardsPlayed: 0, damageDealt: 0, kindled: 0 },
    winner: null,
  };
  drawCards(game.player.deck, game.player.hand, START_HAND);
  drawCards(game.rival.deck, game.rival.hand, START_HAND);
  startTurn(game, 'player');
  return game;
}

export function log(game, text) {
  game.log.push(text);
  if (game.log.length > 6) game.log.shift();
}

export function startTurn(game, who) {
  const side = game[who];
  game.active = who;
  side.maxMana = Math.min(MAX_MANA, side.maxMana + 1);
  side.mana = side.maxMana;
  side.lastElementPlayed = null;
  for (const c of side.board) c.canAttack = true;
  if (side.deck.length === 0) {
    side.fatigue += 1;
    side.life -= side.fatigue;
    log(game, `${who === 'player' ? 'You' : 'The rival'} draw${who === 'player' ? '' : 's'} from an empty deck and take${who === 'player' ? '' : 's'} ${side.fatigue} fatigue.`);
  } else {
    drawCards(side.deck, side.hand, 1);
  }
  if (who === 'player') {
    game.stats.turnsTaken += 1;
    log(game, `Turn ${game.turn}: your embers rise to ${side.mana}.`);
  }
  checkEnd(game);
}

export function endTurn(game) {
  if (game.phase !== 'playing' || game.active !== 'player') return false;
  game.active = 'rival';
  return true;
}

export function beginRivalTurn(game) {
  if (game.phase !== 'playing') return;
  startTurn(game, 'rival');
}

export function beginPlayerTurn(game) {
  if (game.phase !== 'playing') return;
  game.turn += 1;
  startTurn(game, 'player');
}

export function guardOnBoard(side) {
  return side.board.some((c) => c.keywords.includes('guard'));
}

export function canPlayCard(game, who, card) {
  const side = game[who];
  if (game.phase !== 'playing' || game.active !== who) return false;
  if (!side.hand.includes(card)) return false;
  if (card.cost > side.mana) return false;
  if (card.kind === 'courtier' && side.board.length >= MAX_BOARD) return false;
  return true;
}

// Resonance: a second card of the same element in one turn is kindled.
function applyResonance(game, who, card) {
  const side = game[who];
  if (side.lastElementPlayed !== card.element) return false;
  if (card.kind === 'courtier') {
    card.attack += 1;
    card.health += 1;
    card.maxHealth += 1;
  } else {
    card.attack += 1;
  }
  card.kindled = true;
  game.stats.kindled += 1;
  return true;
}

export function playCourtier(game, who, card) {
  const side = game[who];
  side.mana -= card.cost;
  side.hand.splice(side.hand.indexOf(card), 1);
  const kindled = applyResonance(game, who, card);
  card.justPlayed = true;
  card.canAttack = card.keywords.includes('swift');
  side.board.push(card);
  game.stats.cardsPlayed += 1;
  side.lastElementPlayed = card.element;
  if (card.keywords.includes('draw-on-play')) {
    drawCards(side.deck, side.hand, 1);
    log(game, `${card.name} draws a card.`);
  }
  if (card.keywords.includes('heal-on-play')) {
    side.life = Math.min(MAX_LIFE, side.life + 3);
    log(game, `${card.name} restores 3 life.`);
  }
  if (card.keywords.includes('kindled-attack') && kindled) card.attack += 1;
  log(game, `${who === 'player' ? 'You play' : 'The rival plays'} ${card.name}${kindled ? ' — kindled!' : ''}.`);
  checkEnd(game);
  return true;
}

export function playEdict(game, who, card, target) {
  const side = game[who];
  const foe = game[who === 'player' ? 'rival' : 'player'];
  side.mana -= card.cost;
  side.hand.splice(side.hand.indexOf(card), 1);
  const kindled = applyResonance(game, who, card);
  game.stats.cardsPlayed += 1;
  side.lastElementPlayed = card.element;
  const dmg = card.attack;
  const whoName = who === 'player' ? 'You cast' : 'The rival casts';
  switch (card.defId) {
    case 'ember-volley':
    case 'lightning-call':
      if (target === 'hero') {
        foe.life -= dmg;
        if (who === 'player') game.stats.damageDealt += dmg;
        log(game, `${whoName} ${card.name} at the rival mage for ${dmg}.`);
      } else {
        damageCourtier(game, foe, target, dmg);
        log(game, `${whoName} ${card.name} on ${target.name} for ${dmg}.`);
      }
      break;
    case 'tidal-surge':
      for (const c of [...foe.board]) damageCourtier(game, foe, c, dmg);
      log(game, `${whoName} ${card.name}: a wave hits every rival courtier for ${dmg}.`);
      drawCards(side.deck, side.hand, 1);
      break;
    case 'thornsnare':
      target.attack += 2;
      target.health += 2;
      target.maxHealth += 2;
      log(game, `${whoName} ${card.name} on ${target.name}: +2/+2.`);
      break;
    case 'courts-favor':
      drawCards(side.deck, side.hand, 2);
      log(game, `${whoName} ${card.name} and draw${who === 'player' ? '' : 's'} 2 cards.`);
      break;
    default:
      break;
  }
  if (kindled) log(game, `${card.name} was kindled (+1).`);
  checkEnd(game);
  return true;
}

export function playCard(game, who, card, target) {
  if (!canPlayCard(game, who, card)) return false;
  if (card.kind === 'courtier') return playCourtier(game, who, card);
  return playEdict(game, who, card, target);
}

export function damageCourtier(game, ownerSide, card, amount) {
  card.health -= amount;
  card.tookHit = true;
  if (card.health <= 0) {
    ownerSide.board.splice(ownerSide.board.indexOf(card), 1);
    log(game, `${card.name} is destroyed.`);
  }
}

export function attackDamage(attacker, defender) {
  let dmg = attacker.attack;
  if (elementBeats(attacker.element, defender.element)) dmg += 2;
  return dmg;
}

export function canAttack(game, who, attacker) {
  const side = game[who];
  if (game.phase !== 'playing' || game.active !== who) return false;
  if (!side.board.includes(attacker)) return false;
  if (!attacker.canAttack) return false;
  return true;
}

export function attackTargets(game, who) {
  const foe = game[who === 'player' ? 'rival' : 'player'];
  const guards = foe.board.filter((c) => c.keywords.includes('guard'));
  return guards.length > 0 ? guards : foe.board;
}

export function attack(game, who, attacker, target) {
  // target: a courtier object on the foe board, or the string 'hero'
  if (!canAttack(game, who, attacker)) return false;
  const foe = game[who === 'player' ? 'rival' : 'player'];
  if (target === 'hero' && guardOnBoard(foe)) return false;
  attacker.canAttack = false;
  if (target === 'hero') {
    const dmg = attacker.attack;
    foe.life -= dmg;
    if (who === 'player') game.stats.damageDealt += dmg;
    log(game, `${attacker.name} strikes ${who === 'player' ? 'the rival' : 'you'} for ${dmg}.`);
  } else {
    const dmg = attackDamage(attacker, target);
    const back = attackDamage(target, attacker);
    const adv = elementBeats(attacker.element, target.element) ? ' (elemental edge!)' : '';
    damageCourtier(game, foe, target, dmg);
    damageCourtier(game, game[who], attacker, back);
    if (who === 'player') game.stats.damageDealt += dmg;
    log(game, `${attacker.name} hits ${target.name} for ${dmg}${adv}; ${target.name} answers for ${back}.`);
  }
  checkEnd(game);
  return true;
}

export function checkEnd(game) {
  if (game.phase !== 'playing') return;
  if (game.rival.life <= 0 && game.player.life <= 0) {
    game.phase = 'won';
    game.winner = 'player';
    log(game, 'Both mages fall — but the court names you victor.');
  } else if (game.rival.life <= 0) {
    game.phase = 'won';
    game.winner = 'player';
    log(game, 'The Ashen Rival is spent. Victory is yours.');
  } else if (game.player.life <= 0) {
    game.phase = 'lost';
    game.winner = 'rival';
    log(game, 'Your embers gutter out. The rival takes the court.');
  }
}

// Rebuild a game object from a saved snapshot (used by the demo scenes).
export function reviveGame(snapshot) {
  const game = snapshot;
  for (const who of ['player', 'rival']) {
    for (const c of game[who].board) c.tookHit = false;
    for (const c of game[who].hand) c.tookHit = false;
  }
  return game;
}

export { CARD_BY_ID, makeCardInstance };
