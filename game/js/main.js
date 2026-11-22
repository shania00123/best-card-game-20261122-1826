// Ember Court — boot, input and screen flow. Wires the engine to the DOM:
// title screen → table → victory / defeat, with mouse and keyboard play.
// Query shortcuts (for screenshots and testing; every state is also reachable
// by playing): ?scene=title|table|win|loss, ?seed=N, ?fast=1 (no AI delays).

import { CARD_BY_ID, makeCardInstance } from './cards.js';
import { mulberry32 } from './deck.js';
import {
  beginPlayerTurn, beginRivalTurn, canAttack, canPlayCard, checkEnd,
  endTurn, newGame, playCard, attack, MAX_BOARD,
} from './engine.js';
import { takeRivalTurn } from './ai.js';
import { renderEnd, renderTable } from './render.js';
import { isMuted, sfx, toggleMute } from './audio.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const FAST = params.get('fast') === '1';
const SEED = Number(params.get('seed') || 20261123);

let game = newGame(SEED);
let screen = 'title';

const ui = {
  selectedHandUid: null,
  selectedAttacker: null,
  pendingEdict: null,
  hint: 'Click a card to play it. Click a ready courtier, then a target, to attack.',
  onHandCard,
  onBoardCard,
  onRivalCard,
};

function showScreen(name) {
  screen = name;
  $('title-screen').classList.toggle('hidden', name !== 'title');
  $('table-screen').classList.toggle('hidden', name !== 'table');
  $('end-screen').classList.toggle('hidden', name !== 'end');
}

function clearTransientFlags() {
  for (const who of ['player', 'rival']) {
    for (const c of game[who].board) { c.justPlayed = false; c.tookHit = false; }
    for (const c of game[who].hand) { c.justPlayed = false; c.tookHit = false; }
  }
}

function refresh() {
  if (screen === 'table') renderTable(game, ui);
  if (game.phase !== 'playing' && screen === 'table') {
    renderEnd(game);
    showScreen('end');
    if (game.phase === 'won') sfx.win(); else sfx.lose();
  }
  clearTransientFlags();
}

function clearSelection() {
  ui.selectedHandUid = null;
  ui.selectedAttacker = null;
  ui.pendingEdict = null;
  ui.hint = 'Click a card to play it. Click a ready courtier, then a target, to attack.';
}

function findCard(uid) {
  return game.player.hand.find((c) => c.uid === uid)
    || game.player.board.find((c) => c.uid === uid)
    || game.rival.board.find((c) => c.uid === uid);
}

function onHandCard(card) {
  if (game.phase !== 'playing' || game.active !== 'player') return;
  // A pending edict that needs a target: clicking another hand card cancels it.
  if (ui.pendingEdict && ui.pendingEdict !== card) { clearSelection(); refresh(); return; }
  if (!canPlayCard(game, 'player', card)) {
    ui.hint = card.cost > game.player.mana
      ? `${card.name} costs ${card.cost} embers — you have ${game.player.mana}.`
      : `${card.name} cannot be played right now.`;
    sfx.error();
    refresh();
    return;
  }
  if (card.kind === 'courtier') {
    playCard(game, 'player', card, null);
    sfx.play();
    clearSelection();
    refresh();
    return;
  }
  if (card.target === 'none') {
    playCard(game, 'player', card, null);
    sfx.play();
    clearSelection();
    refresh();
    return;
  }
  ui.pendingEdict = card;
  ui.selectedHandUid = card.uid;
  ui.hint = card.target === 'friendly-courtier'
    ? `Choose one of your courtiers for ${card.name}. (Esc to cancel)`
    : `Choose a target for ${card.name}. (Esc to cancel)`;
  refresh();
}

function onBoardCard(card) {
  if (game.phase !== 'playing' || game.active !== 'player') return;
  if (ui.pendingEdict) {
    if (ui.pendingEdict.target === 'friendly-courtier') {
      playCard(game, 'player', ui.pendingEdict, card);
      sfx.play();
      clearSelection();
      refresh();
    }
    return;
  }
  if (ui.selectedAttacker === card.uid) { clearSelection(); refresh(); return; }
  if (!canAttack(game, 'player', card)) {
    ui.hint = card.canAttack ? `${card.name} cannot attack yet.` : `${card.name} rests this turn — it was just summoned.`;
    sfx.error();
    refresh();
    return;
  }
  ui.selectedAttacker = card.uid;
  ui.hint = `Attacking with ${card.name} — click a rival courtier or the rival portrait. (Esc to cancel)`;
  refresh();
}

function onRivalCard(card) {
  if (game.phase !== 'playing' || game.active !== 'player') return;
  if (ui.pendingEdict) {
    if (ui.pendingEdict.target === 'enemy-courtier' || ui.pendingEdict.target === 'any') {
      playCard(game, 'player', ui.pendingEdict, card);
      sfx.play();
      clearSelection();
      refresh();
    }
    return;
  }
  if (!ui.selectedAttacker) return;
  const attacker = findCard(ui.selectedAttacker);
  if (!attacker) { clearSelection(); refresh(); return; }
  const guards = game.rival.board.filter((c) => c.keywords.includes('guard'));
  if (guards.length > 0 && !card.keywords.includes('guard')) {
    ui.hint = `A guard stands in the way — ${guards[0].name} must be attacked first.`;
    sfx.error();
    refresh();
    return;
  }
  attack(game, 'player', attacker, card);
  sfx.attack();
  clearSelection();
  refresh();
}

function attackHero() {
  if (game.phase !== 'playing' || game.active !== 'player') return;
  if (ui.pendingEdict && ui.pendingEdict.target === 'any') {
    playCard(game, 'player', ui.pendingEdict, 'hero');
    sfx.play();
    clearSelection();
    refresh();
    return;
  }
  if (!ui.selectedAttacker) return;
  const attacker = findCard(ui.selectedAttacker);
  if (!attacker) { clearSelection(); refresh(); return; }
  if (game.rival.board.some((c) => c.keywords.includes('guard'))) {
    ui.hint = 'A guard stands in the way — it must be attacked first.';
    sfx.error();
    refresh();
    return;
  }
  attack(game, 'player', attacker, 'hero');
  sfx.attack();
  clearSelection();
  refresh();
}

function doEndTurn() {
  if (game.phase !== 'playing' || game.active !== 'player') return;
  clearSelection();
  endTurn(game);
  sfx.turn();
  refresh();
  const runRival = () => {
    if (game.phase !== 'playing') { refresh(); return; }
    beginRivalTurn(game);
    takeRivalTurn(game, () => refresh());
    if (game.phase !== 'playing') { refresh(); return; }
    beginPlayerTurn(game);
    refresh();
  };
  if (FAST) runRival();
  else window.setTimeout(runRival, 900);
}

function startNewGame(seed) {
  game = newGame(seed);
  clearSelection();
  showScreen('table');
  refresh();
}

// ---- demo scenes: a fixed mid-game table built through the engine itself,
// so a screenshot shows a real, legal position (used with ?scene=table etc.)
function pullCard(who, defId) {
  const side = game[who];
  let idx = side.hand.findIndex((c) => c.defId === defId);
  if (idx >= 0) return side.hand.splice(idx, 1)[0];
  idx = side.deck.findIndex((c) => c.defId === defId);
  if (idx >= 0) return side.deck.splice(idx, 1)[0];
  return makeCardInstance(CARD_BY_ID[defId], `demo-${who}-${defId}`);
}

function demoTable() {
  game = newGame(SEED);
  game.turn = 6;
  const put = (who, defId, canAttack) => {
    const card = pullCard(who, defId);
    card.canAttack = canAttack;
    card.justPlayed = false;
    game[who].board.push(card);
    return card;
  };
  put('player', 'ash-knight', false);
  put('player', 'cinder-hound', true);
  put('player', 'tidecaller', false);
  put('player', 'storm-crow', true);
  put('rival', 'reef-guardian', false);
  put('rival', 'pyre-phoenix', false);
  put('rival', 'thorn-sprout', false);
  // A full, readable hand for the player.
  game.player.hand = [
    'ember-volley', 'lightning-call', 'grove-ancient',
    'tempest-djinn', 'thornsnare', 'ember-imp',
  ].map((id) => pullCard('player', id));
  game.player.life = 30;
  game.player.maxMana = 8;
  game.player.mana = 7;
  game.rival.life = 22;
  game.rival.maxMana = 7;
  game.rival.mana = 2;
  // Top the rival's hand back up to 5 face-down cards for the shot.
  while (game.rival.hand.length < 5 && game.rival.deck.length > 0) {
    game.rival.hand.push(game.rival.deck.pop());
  }
  game.log = [
    'The rival played Pyre Phoenix.',
    'Turn 6: your embers rise to 7.',
    'Flame beats Thorn — Cinder Hound is ready to strike.',
  ];
  game.active = 'player';
  checkEnd(game);
  clearSelection();
  ui.hint = 'Cinder Hound is ready — click it, then the rival, to attack.';
  showScreen('table');
  refresh();
}

function demoEnd(won) {
  demoTable();
  if (won) {
    game.rival.life = 0;
    game.stats.damageDealt = 31;
  } else {
    game.player.life = 0;
    game.stats.damageDealt = 18;
  }
  game.stats.turnsTaken = 6;
  game.stats.cardsPlayed = 14;
  game.stats.kindled = 3;
  checkEnd(game);
  renderEnd(game);
  showScreen('end');
}

function bind() {
  $('btn-play').addEventListener('click', () => { sfx.turn(); startNewGame(SEED); });
  $('btn-howto').addEventListener('click', () => $('howto').classList.toggle('hidden'));
  $('btn-close-howto').addEventListener('click', () => $('howto').classList.add('hidden'));
  $('btn-end-turn').addEventListener('click', doEndTurn);
  $('btn-mute').addEventListener('click', () => {
    const muted = toggleMute();
    $('btn-mute').textContent = muted ? 'Sound: off' : 'Sound: on';
  });
  $('btn-quit').addEventListener('click', () => { clearSelection(); showScreen('title'); });
  $('rival-portrait').addEventListener('click', attackHero);
  $('btn-again').addEventListener('click', () => startNewGame(Date.now() % 100000));
  $('btn-title').addEventListener('click', () => showScreen('title'));

  window.addEventListener('keydown', (ev) => {
    if (screen !== 'table') {
      if (ev.key === 'Enter' && screen === 'title') startNewGame(SEED);
      return;
    }
    if (ev.key >= '1' && ev.key <= '7') {
      const card = game.player.hand[Number(ev.key) - 1];
      if (card) onHandCard(card);
    } else if (ev.key === 'e' || ev.key === 'E' || ev.key === 'Enter') {
      doEndTurn();
    } else if (ev.key === 'Escape') {
      clearSelection();
      refresh();
    } else if (ev.key === 'm' || ev.key === 'M') {
      const muted = toggleMute();
      $('btn-mute').textContent = muted ? 'Sound: off' : 'Sound: on';
    }
  });
  window.__emberCourt = { get game() { return game; }, startNewGame, demoTable, demoEnd };
}

bind();
const scene = params.get('scene') || 'title';
if (scene === 'table') demoTable();
else if (scene === 'win') demoEnd(true);
else if (scene === 'loss') demoEnd(false);
else showScreen('title');
