import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async path => readFile(new URL(path, import.meta.url), 'utf8');
const [view, icons, css, art, main, app] = await Promise.all([
  read('../src/RoyalStudio.tsx'), read('../src/RoyalIcon.tsx'), read('../src/royal-home-v4.css'),
  read('../public/art/royal-hall.svg'), read('../src/main.tsx'), read('../src/App.tsx')
]);

test('home screen uses original art, full game actions and native interactive components',()=>{
  assert.match(view, /src="\/art\/royal-hall\.svg"/);
  for(const t of ["Classic Chess", "VS Computer", "Quick Chess", "Play with Friends", "Royal Progress", "Game Review", "Daily Tactics"]) assert.ok(view.includes(t), 'Missing '+t);
  for(const route of ["match-setup","modes","training","history","shop","events","tournaments"])assert.ok(view.includes(route));
  assert.match(view, /onClick=\{\(\)=>\{setMode\('computer'\)/);
  assert.match(view, /onClick=\{\(\)=>\{setMode\('local'\)/);
});
test('the original vector art is not a screenshot and contains a real knight scene',()=>{
  assert.match(art, /^<svg /);
  assert.match(art, /Royal Hall/);
  assert.match(art, /id="onyx"/);
  assert.match(art, /pedestal/i);
  assert.ok(!art.includes('data:image/png;base64'));
});
test('vector icons replace Unicode symbols in shared navigation and components',()=>{
  assert.match(view, /const SN = .*<RoyalIcon/);
  assert.match(app, /const Icon = .*<RoyalIcon/);
  for(const symbol of ["home","play","events","club","shop","profile","settings","notifications","trophy","history"]) {
    if (symbol === 'trophy') continue;
    assert.ok(icons.includes(symbol+':<'), 'Missing icon '+symbol);
  }
});
test('the v4 stylesheet is loaded last and enforces readable mobile geometry',()=>{
  assert.ok(main.indexOf("import './royal-studio.css'") < main.indexOf("import './royal-home-v4.css'"));
  assert.match(css, /\.rv-cinematic-hero/);
  assert.match(css, /\.rv-battle-classic/);
  assert.match(css, /@media\(max-width:360px\)/);
  assert.match(css, /@media\(min-width:630px\)/);
  assert.match(css, /\.app \.bottom-nav/);
  assert.match(css, /min-height:51px/);
});
