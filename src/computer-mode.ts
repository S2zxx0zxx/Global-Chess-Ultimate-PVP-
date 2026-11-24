import type {Chess} from 'chess.js';
import {buildRequest,startJob,configuredStrategy,type Job,type Port} from './ai/client.ts';
import {HARD_GRACE_MS,uci,type Identity,type Strategy} from './ai/protocol.ts';
export type Difficulty='easy'|'medium'|'hard'|'expert';
export type PlayerSide='w'|'b';
export type ComputerOptions={difficulty:Difficulty;playerSide:PlayerSide;thinkingMs:number};
export const PRESETS={
 easy:{label:'Easy',strategy:'foundation',timeMs:100,maxDepth:1,maxNodes:256},
 medium:{label:'Medium',strategy:'advanced',timeMs:300,maxDepth:2,maxNodes:5000},
 hard:{label:'Hard',strategy:'advanced',timeMs:750,maxDepth:3,maxNodes:15000},
 expert:{label:'Expert',strategy:'advanced',timeMs:1500,maxDepth:5,maxNodes:50000}
} as const;
export const DEFAULT_COMPUTER:ComputerOptions={difficulty:'medium',playerSide:'w',thinkingMs:300};
export const THINKING_CHOICES=[100,300,750,1500] as const;
export const COMPUTER_PREF_KEY='gcu.computer-preferences.v1';
export function normalizeComputer(value:unknown):ComputerOptions{
 const x=value&&typeof value==='object'?value as Partial<ComputerOptions>:{};
 const difficulty=typeof x.difficulty==='string'&&Object.hasOwn(PRESETS,x.difficulty)?x.difficulty:'medium';
 const thinkingMs=THINKING_CHOICES.some(n=>n===x.thinkingMs)?Math.min(x.thinkingMs!,PRESETS[difficulty].timeMs):PRESETS[difficulty].timeMs;
 return {difficulty,playerSide:x.playerSide==='b'?'b':'w',thinkingMs};
}
export const otherSide=(side:PlayerSide):PlayerSide=>side==='w'?'b':'w';
export function computerLimits(options:ComputerOptions,remainingMs:number|null,override?:Strategy){
 const o=normalizeComputer(options),p=PRESETS[o.difficulty];
 const strategy:Strategy=override??(p.strategy==='advanced'&&configuredStrategy()==='optimized'?'optimized':p.strategy);
 const budget=remainingMs===null?o.thinkingMs:Math.min(o.thinkingMs,Math.max(1,Math.floor(remainingMs-HARD_GRACE_MS)));
 return {strategy,timeMs:budget,maxDepth:strategy==='legacy'||strategy==='foundation'?1:p.maxDepth,maxNodes:strategy==='legacy'||strategy==='foundation'?256:p.maxNodes};
}
export function computerJob(game:Chess,id:Identity,options:ComputerOptions,remainingMs:number|null,override?:Strategy,factory?:()=>Port):Job{
 const l=computerLimits(options,remainingMs,override);
 const q=buildRequest(game,id,'play',l.strategy,l.timeMs,l.maxNodes,7,l.maxDepth);
 return startJob(q,new Set(game.isGameOver()?[]:game.moves({verbose:true}).map(uci)),game.isGameOver(),factory);
}
export function undoCount(game:Chess,mode:'local'|'computer'|'puzzle',human:PlayerSide):number{
 if(mode==='puzzle')return 0;
 if(mode==='local')return Math.min(1,game.history().length);
 const moves=game.history({verbose:true});
 let lastHuman=-1;for(let i=moves.length-1;i>=0;i--)if(moves[i].color===human){lastHuman=i;break;}
 return lastHuman<0?0:moves.length-lastHuman;
}
export function winForHuman(record:{result:string;playerSide?:PlayerSide}){
 const side=record.playerSide??'w';
 return record.result===(side==='w'?'white':'black')||record.result===(side==='w'?'timeout-black':'timeout-white');
}
