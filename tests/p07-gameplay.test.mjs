import test from 'node:test';import assert from 'node:assert/strict';import {Chess} from 'chess.js';
import {committedEvents,endedEvent,squareAt,squareCenter,sameRect,dropAllowed} from '../src/gameplay-events.ts';
test('P07 canonical committed move event, capture, turn, check and stable ids',()=>{
 const g=new Chess('4k3/8/8/3q4/8/3R4/8/4K3 w - - 0 1'),m=g.move('Rxd5'),events=committedEvents(g,m,'g',1,'human');
 assert.deepEqual(events.map(e=>e.kind),['MoveCommitted','Capture','TurnChanged']);assert.equal(events[1].square,'d5');assert.equal(new Set(events.map(e=>e.eventId)).size,events.length);assert.deepEqual(events,committedEvents(g,m,'g',1,'human'));g.undo();assert.throws(()=>committedEvents(g,m,'g',1,'human'));
 const mate=new Chess();for(const s of ['f3','e5','g4'])mate.move(s);const last=mate.move('Qh4#');assert.ok(committedEvents(mate,last,'g',2,'computer').some(e=>e.kind==='Check'));assert.equal(endedEvent('g',3,'black').kind,'MatchEnded');
});
test('P07 coordinate map all squares both orientations and edge rejection',()=>{
 const r={left:10,top:20,width:320,height:320};for(const flipped of [false,true])for(const f of 'abcdefgh')for(let rank=1;rank<=8;rank++){const sq=f+rank,c=squareCenter(r,sq,flipped);assert.equal(squareAt(r,c.x,c.y,flipped),sq);}
 assert.equal(squareAt(r,330,30,false),null);assert.equal(squareAt(r,20,340,false),null);assert.equal(squareAt(r,9,20,false),null);assert.equal(squareAt(r,NaN,20,false),null);assert.equal(sameRect(r,{...r,top:21}),false);
});
test('P07 legal drop and special move event payloads',()=>{
 const g=new Chess();assert.equal(dropAllowed(g,'e2','e4'),true);assert.equal(dropAllowed(g,'e7','e5'),false);assert.equal(dropAllowed(g,'e2',null),false);assert.equal(dropAllowed(g,'e2','e5'),false);
 const ep=new Chess();for(const s of ['e4','a6','e5','d5'])ep.move(s);const e=committedEvents(ep,ep.move('exd6'),'ep',1,'human').find(x=>x.kind==='Capture');assert.equal(e.square,'d5');assert.equal(e.destination,'d6');
 const castle=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');assert.deepEqual(committedEvents(castle,castle.move('O-O'),'c',1,'human')[0].rook,{from:'h1',to:'f1'});
 const promotion=new Chess('1r5k/P7/8/8/8/8/8/7K w - - 0 1');const p=committedEvents(promotion,promotion.move('axb8=N'),'p',1,'human');assert.ok(p.some(x=>x.kind==='Promotion'&&x.piece==='n'));assert.ok(p.some(x=>x.kind==='Capture'));
});
