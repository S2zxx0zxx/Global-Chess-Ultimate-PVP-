import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const view = await readFile(new URL('../src/RoyalStudio.tsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/royal-studio.css', import.meta.url), 'utf8');
const integration = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');

const start = view.indexOf('export const ROYAL_SCREEN_GROUPS = {');
const end = view.indexOf('} as const;', start);
const registry = view.slice(start, end);
const groups = [...registry.matchAll(/\b([a-z]+):\s*\[([^\]]+)\]/g)].map(m => ({
  group: m[1], routes: [...m[2].matchAll(/'([^']+)'/g)].map(p => p[1]),
}));
const routes = groups.flatMap(group => group.routes);

test('both sheets map to a complete unique 49-screen interactive route inventory', () => {
  assert.equal(groups.length, 6);
  assert.equal(routes.length, 49, JSON.stringify(groups.map(g => [g.group,g.routes.length])));
  assert.equal(new Set(routes).size, routes.length, 'duplicate screen registry keys');
  for(const screen of routes) {
    assert.ok(view.includes("case '" + screen + "':"), 'Missing screen renderer: ' + screen);
  }
});
test('all key sheet sections and existing gameplay paths are connected', () => {
  for(const id of ['splash','welcome','home','modes','match-setup','matchmaking','gameplay','match-result','review','profile',
    'friends','leaderboard','achievements','shop','inventory','notifications','settings','tournaments','daily',
    'missions','season','news','club','invites','membership','checkout','privacy','feedback','accessibility']) {
    assert.ok(routes.includes(id), 'Missing required design screen '+id);
  }
  assert.match(integration, /<RoyalStudio/);
  assert.match(integration, /begin=\{\(nextMode,timed\) => start\(nextMode,timed\)\}/);
  assert.match(integration, /onSkinChange=\{skin => setBoardSkin\(skin\)\}/);
  assert.match(integration, /RESUME SAVED MATCH/);
});
test('accessible visual tokens and responsive sheet breakpoints are present', () => {
  for(const token of ['#0d0a07','#281c12','#d4af37','#b8860b','#f5e9d6','#5c4028']) {
    assert.ok(styles.toLowerCase().includes(token), 'Missing exact sheet token '+token);
  }
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media\(max-width:380px\)/);
  assert.match(styles, /@media\(min-width:650px\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /data-board-skin="onyx"/);
});
