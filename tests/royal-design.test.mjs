import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const view = await readFile(new URL('../src/RoyalStudio.tsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/royal-sheets-v5.css', import.meta.url), 'utf8');
const integration = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');

const start = view.indexOf('export const ROYAL_SCREEN_GROUPS = {');
const end = view.indexOf('} as const;', start);
const registry = view.slice(start, end);
const groups = [...registry.matchAll(/\b([a-z]+):\s*\[([^\]]+)\]/g)].map(m => ({
  group: m[1], routes: [...m[2].matchAll(/'([^']+)'/g)].map(p => p[1]),
}));
const routes = groups.flatMap(group => group.routes);

test('all three sheets map to a complete unique 50-screen interactive route inventory', () => {
  assert.equal(groups.length, 6);
  assert.equal(routes.length, 50, JSON.stringify(groups.map(g => [g.group,g.routes.length])));
  assert.equal(new Set(routes).size, routes.length, 'duplicate screen registry keys');
  for(const screen of routes) {
    assert.ok(view.includes("case '" + screen + "':"), 'Missing screen renderer: ' + screen);
  }
});
test('all key sheet sections and existing gameplay paths are connected', () => {
  for(const id of ['splash','welcome','tutorial','home','modes','match-setup','matchmaking','gameplay','match-result','review','profile',
    'friends','leaderboard','achievements','shop','inventory','notifications','settings','tournaments','daily',
    'missions','season','news','club','invites','membership','checkout','privacy','feedback','accessibility']) {
    assert.ok(routes.includes(id), 'Missing required design screen '+id);
  }
  assert.match(integration, /<RoyalStudio/);
  assert.match(integration, /begin=\{\(nextMode,timed\) => start\(nextMode,timed\)\}/);
  assert.match(integration, /onSkinChange=\{skin => setBoardSkin\(skin\)\}/);
  assert.match(integration, /RESUME SAVED MATCH/);
  assert.match(integration, /role="alertdialog"/);
  assert.match(integration, /onClick=\{confirmResign\}/);
});
test('accessible visual tokens and responsive sheet breakpoints are present', () => {
  for(const token of ['#180e0a','#281c12','#d4af37','#b8860b','#f5e9d6','#5c4028']) {
    assert.ok(styles.toLowerCase().includes(token), 'Missing exact sheet token '+token);
  }
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media\s*\(max-width:360px\)/);
  assert.match(styles, /@media\s*\(min-width:640px\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /data-board-skin=onyx/);
});

test('legacy CSS is replaced, while existing chess game interaction code stays operational', async () => {
  const main = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8');
  assert.match(main, /royal-sheets-v5\.css/);
  assert.doesNotMatch(main, /import '.\/style\.css'/);
  assert.doesNotMatch(main, /import '.\/royal-studio\.css'/);
  for (const marker of ['royal-match-panel','royal-match-status','royal-emote-picker','offerDraw','confirmDraw','resignDialog','promotion','ChessBoard3D','ReplayViewer']) {
    assert.ok(integration.includes(marker), 'Missing actual gameplay wiring '+marker);
  }
  for (const selector of ['.royal-hub','.royal-mode-primary','.royal-modes-stack','.royal-match-top','.royal-match-actions','.promotion-options','.rv-bracket','.rv-skins']) {
    assert.ok(styles.includes(selector), 'Missing original sheet-specific style '+selector);
  }
});
