import type {Chess,Move,Square} from 'chess.js';
import type {GameResult} from './game.ts';
export type MoveSource='human'|'computer';
export type EventBase={version:1;gameId:string;revision:number;eventId:string};
export type MoveCommitted=EventBase&{kind:'MoveCommitted';from:Square;to:Square;before:string;after:string;san:string;source:MoveSource;rook?:{from:Square;to:Square}};
export type GameplayEvent=MoveCommitted|(EventBase&{kind:'Capture';square:Square;destination:Square;piece:string})|(EventBase&{kind:'Check';side:'w'|'b'})|(EventBase&{kind:'Promotion';square:Square;piece:string})|(EventBase&{kind:'TurnChanged';side:'w'|'b'})|(EventBase&{kind:'MatchEnded';outcome:GameResult});
function base(gameId:string,revision:number,kind:string):EventBase{return {version:1,gameId,revision,eventId:gameId+':'+revision+':'+kind};}
export function committedEvents(game:Chess,move:Move,gameId:string,revision:number,source:MoveSource):GameplayEvent[]{
 if(game.fen()!==move.after||game.history({verbose:true}).at(-1)?.after!==move.after)throw Error('Move event requires committed canonical position');
 const e=(kind:string)=>base(gameId,revision,kind);
 const rank=move.color==='w'?'1':'8';
 const rook=move.isKingsideCastle()?{from:('h'+rank) as Square,to:('f'+rank) as Square}:move.isQueensideCastle()?{from:('a'+rank) as Square,to:('d'+rank) as Square}:undefined;
 const events:GameplayEvent[]=[{...e('MoveCommitted'),kind:'MoveCommitted',from:move.from,to:move.to,before:move.before,after:move.after,san:move.san,source,rook}];
 if(move.captured)events.push({...e('Capture'),kind:'Capture',square:move.isEnPassant()?(move.to[0]+move.from[1]) as Square:move.to,destination:move.to,piece:move.captured});
 if(move.promotion)events.push({...e('Promotion'),kind:'Promotion',square:move.to,piece:move.promotion});
 if(game.isCheck())events.push({...e('Check'),kind:'Check',side:game.turn()});
 events.push({...e('TurnChanged'),kind:'TurnChanged',side:game.turn()});
 return events;
}
export function endedEvent(gameId:string,revision:number,outcome:GameResult):GameplayEvent{return {...base(gameId,revision,'MatchEnded'),kind:'MatchEnded',outcome};}
export type Rect={left:number;top:number;width:number;height:number};
export function squareAt(rect:Rect,x:number,y:number,flipped:boolean):Square|null{
 if(!Number.isFinite(x)||!Number.isFinite(y)||rect.width<=0||rect.height<=0||x<rect.left||y<rect.top||x>=rect.left+rect.width||y>=rect.top+rect.height)return null;
 let c=Math.floor((x-rect.left)*8/rect.width),r=Math.floor((y-rect.top)*8/rect.height);
 if(flipped){c=7-c;r=7-r;}return ('abcdefgh'[c]+(8-r)) as Square;
}
export function squareCenter(rect:Rect,square:Square,flipped:boolean){
 let c='abcdefgh'.indexOf(square[0]),r=8-Number(square[1]);if(flipped){c=7-c;r=7-r;}
 return {x:rect.left+(c+.5)*rect.width/8,y:rect.top+(r+.5)*rect.height/8};
}
export function sameRect(a:Rect,b:Rect){return ['left','top','width','height'].every(k=>Math.abs(a[k as keyof Rect]-b[k as keyof Rect])<.5);}
export function dropAllowed(game:Chess,from:Square,to:Square|null){return to!==null&&!game.isGameOver()&&game.moves({square:from,verbose:true}).some(m=>m.to===to);}
