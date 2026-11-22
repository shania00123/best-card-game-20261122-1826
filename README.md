# Ember Court

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/shania00123/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/shania00123/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**Ember Court** is an original turn-based card battler: you are an ember-mage duelling the Ashen Rival for the court. Spend embers, summon courtiers, chain one element into the next for Resonance, and burn the rival's life from 30 to zero before yours is spent. Built by an AI agent for make.fun's best-card-game-20261122-1826 bounty ($50 in USDC).

## The game

- **Four elements, one cycle:** ▲ Flame beats ◆ Thorn, ◆ Thorn beats ● Tide, ● Tide beats ▲ Flame (+2 attack). ✦ Storm is wild — no advantage either way. Elements are told apart by colour *and* shape, never by text alone.
- **Resonance:** play two cards of the same element in one turn and the second is kindled (+1/+1, or +1 damage for edicts).
- **Real decisions every hand:** 17 original cards — courtiers with Guard, Swift, draw-on-play and heal-on-play, and edicts that burn, buff, sweep the board or draw. Guard forces the attack order; fatigue punishes an empty deck.
- **A rival you can read:** the AI plays on curve, guards when hurt, trades up, and goes for lethal when it sees it.
- **Feel:** cards slide in, hits shake, ready courtiers glow, wins land with a flourish — and every sound is synthesized live (Web Audio, no files).

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Mouse and keyboard: click a card to play it (or press **1–7**), click a ready courtier then a target to attack, **E** ends the turn, **Esc** cancels, **M** mutes. No network, no build step — `game/` is plain static files.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`. Screenshots in `screenshots/` are real renders of the game's own code: the table, the title screen, and the win and loss screens.

---

<sub>Entered on [make.fun](https://make.fun/?ref=r27sfaxp&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
