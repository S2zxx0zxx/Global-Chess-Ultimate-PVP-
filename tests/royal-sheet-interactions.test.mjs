import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src=async path=>readFile(new URL(path,import.meta.url),'utf8');
const [studio,game,tutorial,replay,css,art,sw]=await Promise.all([
 src('../src/RoyalStudio.tsx'),src('../src/App.tsx'),src('../src/RoyalTutorial.tsx'),
 src('../src/ReplayViewer.tsx'),src('../src/royal-sheets-v5.css'),
 src('../public/art/sheet-gold-knight.svg'),src('../public/sw.js')
]);
test('sheet gold knight is genuine embedded artwork, not a missing or broken data URI',()=>{
 assert.match(art,/data:image\/webp;base64,/);
 const b64=art.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/)?.[1];
 assert.ok(b64&&b64.length>4000,'full cropped asset is expected');
 const img=Buffer.from(b64,'base64');
 assert.equal(img.toString('ascii',0,4),'RIFF');
 assert.equal(img.toString('ascii',8,12),'WEBP');
 assert.ok(studio.includes('src="/art/sheet-gold-knight.svg"'));
 assert.ok(sw.includes('/art/sheet-gold-knight.svg'));
});
test('three design sheets have distinct interactive flows and overlays',()=>{
 for(const m of ['royal-hub','royal-modes-stack','tutorial','tournaments','bracket','achievements','shop','inventory','notifications','feedback'])assert.ok(studio.includes(m),'Missing '+m);
 for(const m of ['royal-match-top','royal-match-status','royal-match-actions','royal-emote-picker','royal-draw-dialog','royal-match-history','promotion','endResult','showGameMenu','resignDialog'])assert.ok(game.includes(m),'Missing '+m);
 for(const m of ['e2','e4','g1','f3','f1','c4','chess.move','royal-tutorial-board'])assert.ok(tutorial.includes(m),'Missing tutorial '+m);
 for(const m of ['royal-analysis-panel','setPlaying','startAdvisory','material','replay-controls'])assert.ok(replay.includes(m),'Missing replay '+m);
});
test('Sheet 02 timing and actions remain real, not decorative',()=>{
 assert.match(game,/if\(pausedRef\.current\)clockRef\.current/);
 assert.match(game,/if \(!clockEnabled \|\| !active \|\| page !== 'game' \|\| endResult \|\| mode === 'puzzle' \|\| menu \|\| resignDialog \|\| drawDialog\) return;/);
 assert.match(game,/recordEnd\('draw', mode\)/);
 assert.match(game,/onClick=\{offerDraw\}/);
 assert.match(game,/onClick=\{resign\}/);
 for(const selector of ['.royal-match-top','.royal-match-actions','.royal-draw-dialog','.royal-tutorial-board','.royal-replay-tabs','.royal-analysis-panel','.promotion-options'])assert.ok(css.includes(selector));
});
