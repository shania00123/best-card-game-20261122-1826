// Ember Court — the entry program (Node 22, standard library only).
//
// It hands the game in: it copies this repository's game/ and screenshots/
// into the grader's output directory and writes /output/dossier.json with
// buildDossier from the vendored make.fun library, so the sealed scorer can
// re-derive the same dossier byte for byte.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The run is deterministic: the same repository always writes the same
// bytes, so the grader's two runs agree.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Where this file lives is the repository root; the grader runs it from a
// read-only copy of the submitted commit, so everything is read from here.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps for this bounty (gate rows game_files / screenshots /
// dossier_matches): the game stays small, the screenshots few and light.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

function countEntries(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    total += 1;
    if (statSync(path).isDirectory()) total += countEntries(path);
  }
  return total;
}

function checkInputs(): void {
  const gameDir = join(repoRoot, 'game');
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(join(gameDir, 'index.html'))) {
    throw new Error('game/index.html is missing — the entry has no playable game');
  }
  if (!existsSync(shotsDir) || readdirSync(shotsDir).length === 0) {
    throw new Error('screenshots/ is empty — the entry needs 3 or 4 screenshots');
  }
  // Fail loudly here, with the same numbers the scorer would refuse on,
  // instead of writing an output the gate rejects.
  if (countEntries(gameDir) > DOSSIER_CAPS.game_max_files) {
    throw new Error(`game/ holds more than ${DOSSIER_CAPS.game_max_files} entries`);
  }
}

function handIn(): void {
  checkInputs();
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
  const dossier = buildDossier(outputDir, DOSSIER_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  const shotCount = readdirSync(join(outputDir, 'screenshots')).length;
  const gameCount = countEntries(join(outputDir, 'game'));
  console.log(`Ember Court handed in: ${gameCount} game entries, ${shotCount} screenshots, dossier ${dossier.length} bytes -> ${outputDir}`);
}

handIn();
