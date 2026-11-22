// Ember Court — the card catalogue. Every card is original: four elements
// (Flame ▲, Tide ●, Thorn ◆, Storm ✦) with an advantage cycle
// Flame > Thorn > Tide > Flame; Storm is wild (no advantage either way).
// Kinds: 'courtier' (a creature that stays on the board) and 'edict' (a spell).
// Keywords: guard (must be attacked first), swift (attacks the turn it is played),
// kindled (bonus when played right after a card of the same element).
// Card art uses plain text glyphs (DejaVu-safe) so the game renders anywhere.
// Card text is kept to two short lines so it never spills off a card.

export const ELEMENTS = {
  flame: { glyph: '▲', name: 'Flame', beats: 'thorn' },
  tide: { glyph: '●', name: 'Tide', beats: 'flame' },
  thorn: { glyph: '◆', name: 'Thorn', beats: 'tide' },
  storm: { glyph: '✦', name: 'Storm', beats: null },
};

export function elementBeats(a, b) {
  return ELEMENTS[a] && ELEMENTS[a].beats === b;
}

// id, name, element, cost, kind, attack, health, art, text, target, keywords
export const CATALOGUE = [
  { id: 'ember-imp', name: 'Ember Imp', element: 'flame', cost: 1, kind: 'courtier', attack: 2, health: 1, art: '♨', text: 'A spark with teeth.', target: null, keywords: [] },
  { id: 'cinder-hound', name: 'Cinder Hound', element: 'flame', cost: 2, kind: 'courtier', attack: 3, health: 2, art: '♞', text: 'It hunts by the smell of smoke.', target: null, keywords: [] },
  { id: 'ash-knight', name: 'Ash Knight', element: 'flame', cost: 3, kind: 'courtier', attack: 4, health: 3, art: '⚔', text: 'Guard. His oath burns bright.', target: null, keywords: ['guard'] },
  { id: 'pyre-phoenix', name: 'Pyre Phoenix', element: 'flame', cost: 5, kind: 'courtier', attack: 5, health: 4, art: '☀', text: 'Kindled: +2 attack after Flame.', target: null, keywords: ['kindled-attack'] },
  { id: 'tidecaller', name: 'Tidecaller', element: 'tide', cost: 2, kind: 'courtier', attack: 2, health: 3, art: '♓', text: 'Draw a card when she enters.', target: null, keywords: ['draw-on-play'] },
  { id: 'reef-guardian', name: 'Reef Guardian', element: 'tide', cost: 3, kind: 'courtier', attack: 2, health: 5, art: '♜', text: 'Guard. The reef does not yield.', target: null, keywords: ['guard'] },
  { id: 'deep-leviathan', name: 'Deep Leviathan', element: 'tide', cost: 6, kind: 'courtier', attack: 6, health: 6, art: '♒', text: 'The whole sea, wearing a crown.', target: null, keywords: [] },
  { id: 'thorn-sprout', name: 'Thorn Sprout', element: 'thorn', cost: 1, kind: 'courtier', attack: 1, health: 2, art: '✿', text: 'Small. Sharp. Patient.', target: null, keywords: [] },
  { id: 'briar-warden', name: 'Briar Warden', element: 'thorn', cost: 3, kind: 'courtier', attack: 3, health: 4, art: '♣', text: 'Guard. Every branch, a locked door.', target: null, keywords: ['guard'] },
  { id: 'grove-ancient', name: 'Grove Ancient', element: 'thorn', cost: 5, kind: 'courtier', attack: 4, health: 7, art: '☘', text: 'Restore 3 life when it enters.', target: null, keywords: ['heal-on-play'] },
  { id: 'storm-crow', name: 'Storm Crow', element: 'storm', cost: 2, kind: 'courtier', attack: 3, health: 1, art: '✦', text: 'Swift. It strikes at once.', target: null, keywords: ['swift'] },
  { id: 'tempest-djinn', name: 'Tempest Djinn', element: 'storm', cost: 4, kind: 'courtier', attack: 4, health: 3, art: '☁', text: 'Three wishes, all lightning.', target: null, keywords: [] },
  { id: 'ember-volley', name: 'Ember Volley', element: 'flame', cost: 2, kind: 'edict', attack: 3, health: 0, art: '▲', text: 'Deal 3 damage to a courtier.', target: 'enemy-courtier', keywords: [] },
  { id: 'tidal-surge', name: 'Tidal Surge', element: 'tide', cost: 3, kind: 'edict', attack: 2, health: 0, art: '≈', text: 'Hit all rival courtiers for 2. Draw 1.', target: 'none', keywords: [] },
  { id: 'thornsnare', name: 'Thornsnare', element: 'thorn', cost: 2, kind: 'edict', attack: 2, health: 2, art: '◆', text: 'Give a friendly courtier +2/+2.', target: 'friendly-courtier', keywords: [] },
  { id: 'lightning-call', name: 'Lightning Call', element: 'storm', cost: 4, kind: 'edict', attack: 4, health: 0, art: '⚡', text: 'Deal 4 damage to any target.', target: 'any', keywords: [] },
  { id: 'courts-favor', name: "Court's Favor", element: 'storm', cost: 1, kind: 'edict', attack: 0, health: 0, art: '♛', text: 'Draw 2 cards.', target: 'none', keywords: [] },
];

export const CARD_BY_ID = Object.fromEntries(CATALOGUE.map((c) => [c.id, c]));

export function makeCardInstance(def, uid) {
  return {
    uid,
    defId: def.id,
    name: def.name,
    element: def.element,
    cost: def.cost,
    kind: def.kind,
    attack: def.attack,
    health: def.health,
    maxHealth: def.health,
    art: def.art,
    text: def.text,
    target: def.target,
    keywords: [...def.keywords],
    canAttack: false,
    justPlayed: false,
    kindled: false,
  };
}
