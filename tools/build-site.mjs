// Puts the web version together in site/ (README.md "Auf dem Handy"): the page, its script and rules from app/, the
// design kit from app/kit/, and the web-only parts from web/ (the bridge, the manifest, the icons, the offline helper,
// config.json with the web client id when it is there). GitHub Pages serves site/ (.github/workflows/pages.yml).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const FROM = {
  app: ['index.html', 'app.mjs', 'app.css', 'lists.mjs', 'google-api.mjs'],
  'app/kit': ['ui_base.css', 'ui_base.js', 'archon_ui.css', 'archon_ui.js', 'UnifrakturMaguntia.OFL.txt'],
  web: ['web-api.mjs', 'manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png', 'config.json'],
};
await fs.rm(SITE, { recursive: true, force: true });
await fs.mkdir(SITE, { recursive: true });
for (const [dir, names] of Object.entries(FROM)) {
  for (const name of names) {
    try { await fs.copyFile(path.join(ROOT, dir, name), path.join(SITE, name)); }
    catch (e) { if (name !== 'config.json') throw e; }   // no web client id yet: it can be typed in (Settings)
  }
}
await fs.copyFile(path.join(ROOT, 'app/kit/UnifrakturMaguntia.ttf'), path.join(SITE, 'fraktur.ttf'));   // the name the page asks for
console.log('site/ ready:', (await fs.readdir(SITE)).length, 'files');
