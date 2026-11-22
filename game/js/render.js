// Ember Court — the table renderer. Pure DOM from game state: every frame
// rebuilds the two boards, the hands, the life and ember counters, the log
// and the end screen from the engine's state, so the screen can never drift
// from the rules. Cards are big and legible at thumbnail size on purpose.

import { ELEMENTS, elementBeats } from './cards.js';

export function elementGlyph(element) {
  return ELEMENTS[element].glyph;
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function manaPips(node, mana, maxMana) {
  node.textContent = '';
  for (let i = 0; i < 10; i += 1) {
    const pip = el('span', 'mana-pip' + (i < mana ? ' full' : ''));
    node.appendChild(pip);
  }
  void maxMana;
}

export function cardNode(card, opts = {}) {
  const node = el('div', `card el-${card.element}${card.kind === 'edict' ? ' spell' : ''}`);
  node.dataset.uid = card.uid;
  node.appendChild(el('div', 'cost', String(card.cost)));
  node.appendChild(el('div', 'element', elementGlyph(card.element)));
  node.appendChild(el('div', 'card-name', card.name));
  node.appendChild(el('div', 'card-art', card.art));
  // One short kind line, so it never wraps and never pushes the text off
  // the card: a guard or swift card names its keyword, the rest name kind.
  const tagWord = card.keywords.includes('guard') ? 'GUARD' : card.keywords.includes('swift') ? 'SWIFT' : null;
  const kindText = tagWord
    ? `${ELEMENTS[card.element].name} · ${tagWord}`
    : `${ELEMENTS[card.element].name} ${card.kind}`;
  node.appendChild(el('div', 'card-kind', kindText));
  node.appendChild(el('div', 'card-text', card.text));
  if (card.kind === 'courtier') {
    node.appendChild(el('div', 'stat atk', `⚔${card.attack}`));
    node.appendChild(el('div', 'stat hp', `♥${card.health}`));
  } else if (card.attack > 0) {
    node.appendChild(el('div', 'stat atk', `✦${card.attack}`));
  }
  if (opts.canAttack) node.appendChild(el('div', 'ready-tag', 'READY'));
  if (opts.ready) node.classList.add('ready');
  if (opts.canAttack) node.classList.add('can-attack');
  if (opts.selected) node.classList.add('selected', 'selected-attacker');
  if (opts.targetable) node.classList.add('targetable');
  if (opts.unplayable) node.classList.add('unplayable');
  if (opts.justPlayed) node.classList.add('just-played');
  if (card.tookHit) node.classList.add('took-hit');
  return node;
}

export function renderTable(game, ui) {
  const $ = (id) => document.getElementById(id);
  const player = game.player;
  const rival = game.rival;

  $('player-life').textContent = String(Math.max(0, player.life));
  $('rival-life').textContent = String(Math.max(0, rival.life));
  $('player-deck').textContent = `${player.deck.length} cards in deck`;
  $('rival-deck').textContent = `${rival.deck.length} cards in deck`;
  $('rival-hand-count').textContent = `${rival.hand.length} in hand`;
  manaPips($('player-mana'), player.mana, player.maxMana);
  manaPips($('rival-mana'), rival.mana, rival.maxMana);

  const banner = $('turn-banner');
  if (game.phase !== 'playing') {
    banner.textContent = game.phase === 'won' ? 'Victory' : 'Defeat';
  } else if (game.active === 'player') {
    banner.textContent = `Your turn · Turn ${game.turn}`;
    banner.classList.remove('enemy');
  } else {
    banner.textContent = 'Rival thinking…';
    banner.classList.add('enemy');
  }

  // Rival hand: face-down backs, count only.
  const rivalHand = $('rival-hand');
  rivalHand.textContent = '';
  for (let i = 0; i < rival.hand.length; i += 1) {
    rivalHand.appendChild(el('div', 'mini-card', '✦'));
  }

  // Boards.
  renderBoard($('rival-board'), rival.board, game, ui, 'rival');
  renderBoard($('player-board'), player.board, game, ui, 'player');

  // Player hand.
  const hand = $('player-hand');
  hand.textContent = '';
  player.hand.forEach((card, index) => {
    const unplayable = game.active !== 'player' || card.cost > player.mana
      || (card.kind === 'courtier' && player.board.length >= 5);
    const node = cardNode(card, {
      unplayable,
      selected: ui.selectedHandUid === card.uid,
      justPlayed: card.justPlayed,
    });
    node.title = `${card.name} — ${index + 1} to play`;
    node.addEventListener('click', () => ui.onHandCard(card));
    hand.appendChild(node);
  });

  // Log: last line large, earlier lines dimmed away by the engine's cap.
  $('battle-log').textContent = game.log[game.log.length - 1] || '';

  const endBtn = $('btn-end-turn');
  endBtn.disabled = game.active !== 'player' || game.phase !== 'playing';
  endBtn.textContent = game.active === 'player' ? 'End Turn ⏎  (E)' : 'Rival turn…';

  $('rival-portrait').classList.toggle(
    'targetable',
    !!ui.selectedAttacker && game.phase === 'playing' && !game.rival.board.some((c) => c.keywords.includes('guard')),
  );
  $('hint').textContent = ui.hint;
}

function renderBoard(node, board, game, ui, who) {
  node.textContent = '';
  if (board.length === 0) {
    node.appendChild(el('div', 'board-empty', who === 'player' ? 'Your court is empty — play a courtier.' : 'The rival court is empty.'));
    return;
  }
  for (const card of board) {
    const isPlayer = who === 'player';
    const ready = isPlayer && game.active === 'player' && card.canAttack && game.phase === 'playing';
    const targetable = !isPlayer && !!ui.selectedAttacker
      && game.phase === 'playing'
      && (game.rival.board.filter((c) => c.keywords.includes('guard')).length === 0
        || card.keywords.includes('guard'));
    const opts = {
      ready,
      canAttack: ready,
      selected: ui.selectedAttacker === card.uid,
      targetable,
      justPlayed: card.justPlayed,
    };
    const cardEl = cardNode(card, opts);
    if (isPlayer) cardEl.addEventListener('click', () => ui.onBoardCard(card));
    else cardEl.addEventListener('click', () => ui.onRivalCard(card));
    node.appendChild(cardEl);
  }
}

export function renderEnd(game) {
  const $ = (id) => document.getElementById(id);
  const won = game.phase === 'won';
  $('end-screen').classList.toggle('defeat', !won);
  $('end-mark').textContent = won ? '♚' : '♛';
  $('end-title').textContent = won ? 'VICTORY' : 'DEFEAT';
  $('end-sub').textContent = won
    ? 'The Ashen Rival bows. The Ember Court is yours.'
    : 'Your embers gutter out. The rival takes the court.';
  const s = game.stats;
  $('end-stats').innerHTML =
    `Turns played: <b>${s.turnsTaken}</b> &nbsp;·&nbsp; Cards played: <b>${s.cardsPlayed}</b><br>` +
    `Damage dealt: <b>${s.damageDealt}</b> &nbsp;·&nbsp; Kindled plays: <b>${s.kindled}</b><br>` +
    `Final life — You <b>${Math.max(0, game.player.life)}</b> : Rival <b>${Math.max(0, game.rival.life)}</b>`;
}

export { elementBeats };
