// Ember Court — the Ashen Rival's brain. A readable heuristic, not a wall
// of weights: play on curve, chain the same element for resonance, guard
// when hurt, trade up, and go for the throat when lethal is on the board.

import { attack, attackTargets, canPlayCard, guardOnBoard, playCard } from './engine.js';

function playableCards(game) {
  return game.rival.hand.filter((c) => canPlayCard(game, 'rival', c));
}

function bestEdictTarget(game, card) {
  const foeBoard = game.player.board;
  if (card.target === 'enemy-courtier') {
    if (foeBoard.length === 0) return null;
    // Hit the biggest threat it can kill, else the biggest threat at all.
    const killable = foeBoard.filter((c) => c.health <= card.attack);
    const pool = killable.length > 0 ? killable : foeBoard;
    return [...pool].sort((a, b) => b.attack - a.attack || b.health - a.health)[0];
  }
  if (card.target === 'any') {
    const killable = foeBoard.filter((c) => c.health <= card.attack);
    if (killable.length > 0) return [...killable].sort((a, b) => b.attack - a.attack)[0];
    // Lethal on the mage beats a board trade.
    if (game.player.life <= card.attack && !guardOnBoard(game.player)) return 'hero';
    return [...foeBoard].sort((a, b) => b.attack - a.attack)[0] || 'hero';
  }
  if (card.target === 'friendly-courtier') {
    if (game.rival.board.length === 0) return null;
    return [...game.rival.board].sort((a, b) => b.attack + b.health - (a.attack + a.health))[0];
  }
  return null; // 'none' — no target needed
}

function playPhase(game) {
  // Keep playing while something good is affordable. Prefer courtiers on
  // curve, then edicts with a real target, then card draw when the hand is thin.
  let guard = 0;
  while (guard < 12) {
    guard += 1;
    const cards = playableCards(game);
    if (cards.length === 0) break;
    const hurt = game.rival.life <= 12;
    const scored = cards
      .map((card) => {
        let score = card.cost * 2 + (card.kind === 'courtier' ? card.attack + card.health : 0);
        if (card.kind === 'courtier' && card.keywords.includes('guard') && hurt) score += 6;
        if (card.kind === 'courtier' && game.rival.lastElementPlayed === card.element) score += 4;
        if (card.kind === 'edict' && card.target === 'none') score += card.defId === 'courts-favor' && game.rival.hand.length <= 3 ? 5 : 1;
        return { card, score };
      })
      .sort((a, b) => b.score - a.score);
    let played = false;
    for (const { card } of scored) {
      if (card.kind === 'courtier') {
        if (game.rival.board.length >= 5) continue;
        playCard(game, 'rival', card, null);
        played = true;
        break;
      }
      const target = bestEdictTarget(game, card);
      if (card.target === 'none' || target) {
        playCard(game, 'rival', card, target);
        played = true;
        break;
      }
    }
    if (!played) break;
  }
}

function attackPhase(game) {
  const attackers = [...game.rival.board].filter((c) => c.canAttack);
  // Biggest hitters first, so a trade never wastes the best attacker.
  attackers.sort((a, b) => b.attack - a.attack);
  for (const attacker of attackers) {
    if (game.phase !== 'playing') break;
    if (!game.rival.board.includes(attacker)) continue;
    if (attacker.health <= 0) continue;
    const targets = attackTargets(game, 'rival');
    const lethalOnBoard = game.rival.board
      .filter((c) => c.canAttack)
      .reduce((sum, c) => sum + c.attack, 0);
    if (!guardOnBoard(game.player) && lethalOnBoard >= game.player.life) {
      attack(game, 'rival', attacker, 'hero');
      continue;
    }
    if (targets.length === 0) {
      attack(game, 'rival', attacker, 'hero');
      continue;
    }
    // Trade up: kill a bigger courtier if we can, else hit the weakest guard.
    const killable = targets.filter((t) => t.health <= attacker.attack);
    let target;
    if (killable.length > 0) {
      target = [...killable].sort((a, b) => b.attack - a.attack)[0];
    } else if (guardOnBoard(game.player)) {
      target = [...targets].sort((a, b) => a.health - b.health)[0];
    } else {
      // No guard and no good trade: go face when ahead on board, else chip the biggest threat.
      const ahead = game.rival.board.length >= game.player.board.length;
      target = ahead ? 'hero' : [...targets].sort((a, b) => b.attack - a.attack)[0];
    }
    attack(game, 'rival', attacker, target);
  }
}

// One full rival turn. `step` is called after each action so the UI can
// repaint (and the screenshot scenes can run it instantly).
export function takeRivalTurn(game, step) {
  playPhase(game);
  if (step) step();
  attackPhase(game);
  if (step) step();
}
