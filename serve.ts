// Ember Court — a tiny static server for local play-testing only.
// Serves game/ on http://localhost:8080 (or --port N). Development
// convenience, not part of the entry: the game itself is plain static files.
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const portArg = process.argv.indexOf('--port');
const port = portArg === -1 ? 8080 : Number(process.argv[portArg + 1]) || 8080;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  const file = join(root, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  try {
    if (!statSync(file).isFile()) throw new Error('not a file');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found\n');
  }
}).listen(port, () => console.log(`Ember Court at http://localhost:${port}/`));
