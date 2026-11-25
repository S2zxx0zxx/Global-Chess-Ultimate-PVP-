import {Chess} from 'chess.js';
import {PRESETS,computerLimits} from '../src/computer-mode.ts';
import {buildRequest} from '../src/ai/client.ts';
import {runSearch} from '../src/ai/search.ts';
import {moveInput,legalPV,validResponse,uci} from '../src/ai/protocol.ts';
import {tacticalCorpus} from './p03-tactical-corpus.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const search=(g,d)=>{const l=computerLimits({difficulty:d,playerSide:'w',thinkingMs:PRESETS[d].timeMs},null);const q=buildRequest(g,{searchId:'p05',gameId:'bench',revision:g.history().length},'play',l.strategy,l.timeMs,l.maxNodes,7,l.maxDepth);const x=runSearch(q);assert.ok(x.move&&validResponse(x,q,new Set(g.moves({verbose:true}).map(uci)),false));assert.ok(legalPV(q,x.pv));return x;};
const tactical=[];
for(const d of Object.keys(PRESETS)){const rows=[];for(const f of tacticalCorpus){const g=f.fen?new Chess(f.fen):new Chess();for(const m of f.moves||[])g.move(m);const x=search(g,d);rows.push({id:f.id,correct:f.expected?f.expected.includes(x.move):!f.avoid.includes(x.move),depth:x.completedDepth,elapsed:x.elapsedMs,status:x.status});}const a=rows.map(r=>r.elapsed).sort((a,b)=>a-b);tactical.push({difficulty:d,correct:rows.filter(x=>x.correct).length,total:rows.length,p50:a[Math.ceil(a.length*.5)-1],p95:a[Math.ceil(a.length*.95)-1],rows});}
const selfPlay=[];
for(const white of ['easy','hard']){const black=white==='easy'?'hard':'easy',g=new Chess();const rows=[];for(let i=0;i<16&&!g.isGameOver();i++){const d=g.turn()==='w'?white:black,x=search(g,d);rows.push({side:g.turn(),difficulty:d,elapsed:x.elapsedMs,depth:x.completedDepth});g.move(moveInput(x.move));}selfPlay.push({white,black,plies:rows.length,terminal:g.isGameOver(),result:g.isGameOver()?(g.isCheckmate()?g.turn()==='w'?'black':'white':'draw'):'unfinished',rows});}
const report={commit:process.env.GITHUB_SHA||'local',tactical,selfPlay,note:'Fixed seven positions; two short color-swapped self-play games, no Elo or strength claim'};
await mkdir('reports',{recursive:true});await writeFile('reports/p05-difficulty.json',JSON.stringify(report,null,2)+'\n');console.log('P05_DIFFICULTY '+JSON.stringify(report));
