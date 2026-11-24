import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { perft, divide } from './helpers/perft.mjs';
import { resultOf, chooseComputerMove } from '../src/game.ts';
import { replayTimeline, replayPosition } from '../src/chess-state.ts';
import { initialMatch, applyMove, publicMatchState } from '../server/src/rules.mjs';

// Canonical fixtures independently cross-checked against Chess Programming Wiki and Chess-Plisco.
// https://www.chessprogramming.org/Perft_Results
// https://github.com/gflohr/Chess-Plisco/blob/main/t/05perft.t
const kiwi = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
const snapshot = g => ({ fen:g.fen(), pgn:g.pgn(), history:g.history(), turn:g.turn(), repetition:g.isThreefoldRepetition(), over:g.isGameOver() });
function play(g, moves) { for (const move of moves) g.move(move); return g; }

test('perft starting position depths 0–4: BigInt and state preservation', () => {
  const g = new Chess(), before = snapshot(g);
  for (const [d,n] of [1n,20n,400n,8902n,197281n].entries()) {
    assert.equal(perft(g,d),n);
    assert.deepEqual(snapshot(g),before);
  }
  const branches = divide(g,3);
  assert.equal(branches.size,20);
  assert.equal([...branches.values()].reduce((a,b)=>a+b,0n),8902n);
  assert.equal(branches.get('e2e4'),600n);
  assert.deepEqual(snapshot(g),before);
  assert.throws(()=>perft(g,-1),RangeError);
  assert.throws(()=>divide(g,0),RangeError);
});

test('canonical Kiwipete depths 1–3: castles and complex legal moves', () => {
  const g = new Chess(kiwi), before = snapshot(g);
  for (const [d,n] of [48n,2039n,97862n].entries()) {
    assert.equal(perft(g,d+1),n);
    assert.deepEqual(snapshot(g),before);
  }
});

test('castling through check, pinned piece, and irreversible rook rights', () => {
  const g = new Chess('r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1');
  assert.ok(!g.moves().includes('O-O'));
  assert.ok(g.moves().includes('O-O-O'));
  const pinned = new Chess('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1');
  assert.ok(!pinned.moves({square:'e2',verbose:true}).some(m=>m.to==='d2'));
  const rights = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const before = snapshot(rights);
  play(rights,['Rh2','Rh7','Rh1','Rh8']);
  assert.equal(rights.fen().split(' ')[2],'Qq');
  for(let i=0;i<4;i++)rights.undo();
  assert.deepEqual(snapshot(rights),before);
});

test('en passant white and black, expiry, and discovered-check rejection', () => {
  const w=play(new Chess(),['e4','a6','e5','d5']);
  const wb=snapshot(w); const wm=w.move('exd6');
  assert.ok(wm.isEnPassant()); assert.equal(w.get('d5'),undefined);
  w.undo();assert.deepEqual(snapshot(w),wb);
  play(w,['Nf3','a5']);assert.ok(!w.moves().includes('exd6'));
  const b=play(new Chess(),['a3','e5','a4','e4','d4']);
  const bb=snapshot(b);const bm=b.move('exd3');
  assert.ok(bm.isEnPassant());assert.equal(b.get('d4'),undefined);
  b.undo();assert.deepEqual(snapshot(b),bb);
  const discovered=new Chess('8/8/8/r4pPK/8/8/8/4k3 w - f6 0 1');
  assert.ok(!discovered.moves({verbose:true}).some(m=>m.from==='g5'&&m.to==='f6'));
  assert.throws(()=>discovered.move({from:'g5',to:'f6'}));
});

test('all promotions including captures, both colors and undo', () => {
  for (const [fen,from,targets,color] of [
    ['1r5k/P7/8/8/8/8/8/7K w - - 0 1','a7',['a8','b8'],'w'],
    ['7k/8/8/8/8/8/p7/1R5K b - - 0 1','a2',['a1','b1'],'b']
  ]) {
    const g=new Chess(fen), before=snapshot(g);
    for(const to of targets)for(const promotion of ['q','r','b','n']){
      const m=g.move({from,to,promotion});
      assert.equal(g.get(to).type,promotion);
      assert.equal(g.get(to).color,color);
      assert.equal(Boolean(m.captured),to[0]==='b');
      g.undo(); assert.deepEqual(snapshot(g),before);
    }
  }
});

test('terminal outcomes, automatic claim policy, and move counters', () => {
  const mate=play(new Chess(),['f3','e5','g4','Qh4#']);
  assert.ok(mate.isCheckmate());assert.equal(resultOf(mate),'black');
  const stale=new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  assert.ok(stale.isStalemate()); assert.equal(resultOf(stale),'draw');
  const insufficient=new Chess('7k/8/8/8/8/8/8/7K w - - 0 1');
  assert.ok(insufficient.isInsufficientMaterial());assert.equal(resultOf(insufficient),'draw');
  const g=play(new Chess(),['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8']);
  assert.ok(g.isThreefoldRepetition());assert.equal(resultOf(g),'draw');
  assert.equal(new Chess(g.fen()).isThreefoldRepetition(),false);
  const fifty=new Chess('7k/8/8/8/8/8/R7/7K b - - 99 42');
  assert.equal(resultOf(fifty),null);fifty.move('Kg8');
  assert.equal(fifty.fen().split(' ').slice(4).join(' '),'100 43');
  assert.ok(fifty.isDrawByFiftyMoves());assert.equal(resultOf(fifty),'draw');
  const counters=new Chess();play(counters,['Nf3','Nf6','e4']);
  assert.equal(counters.fen().split(' ').slice(4).join(' '),'0 2');
});

test('PGN replay preserves custom setup, history and repetition context', () => {
  for(const g of [
    play(new Chess('7k/8/8/8/8/8/P7/7K w - - 0 1'),['a4','Kg8']),
    play(new Chess(),['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8']),
    new Chess('7k/8/8/8/8/8/P7/7K w - - 0 1')
  ]) {
    const timeline=replayTimeline(g.pgn());
    const rebuilt=replayPosition(timeline,timeline.moves.length);
    assert.equal(rebuilt.fen(),g.fen());
    assert.deepEqual(rebuilt.history(),g.history());
    assert.equal(rebuilt.isThreefoldRepetition(),g.isThreefoldRepetition());
    assert.equal(replayPosition(timeline,0).fen(),timeline.initialFen);
    assert.throws(()=>replayPosition(timeline,-1),RangeError);
    assert.throws(()=>replayPosition(timeline,timeline.moves.length+1),RangeError);
  }
});

test('seeded legal walks, FEN/PGN restore and full undo invariants', () => {
  let seed=0x32afab19;
  const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(let i=0;i<8;i++){
    const g=i%2?new Chess(kiwi):new Chess(),root=snapshot(g),states=[];
    for(let j=0;j<36&&!g.isGameOver();j++){
      const moves=g.moves({verbose:true});
      if(!moves.length)break;
      states.push(snapshot(g));
      const m=moves[rng()%moves.length];
      g.move({from:m.from,to:m.to,promotion:m.promotion});
      assert.equal(new Chess(g.fen()).fen(),g.fen());
    }
    const restored=new Chess();restored.loadPgn(g.pgn());
    assert.deepEqual(snapshot(restored),snapshot(g));
    while(states.length){g.undo();assert.deepEqual(snapshot(g),states.pop());}
    assert.deepEqual(snapshot(g),root);
  }
});

test('server and local chess.js agree on special moves and terminal repetition', () => {
  for(const sequence of [
    ['e4','a6','e5','d5','exd6'],
    ['e4','e5','Nf3','Nc6','Bc4','Nf6','O-O'],
    ['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8'],
    ['f3','e5','g4','Qh4#']
  ]){
    let match={...initialMatch('host',123456),status:'active'};
    const local=new Chess();
    for(const [i,san] of sequence.entries()){
      const side=local.turn(),m=local.move(san);
      const prior=structuredClone(match);
      const res=applyMove(match,side,{type:'move',id:'parity-'+String(i).padStart(3,'0'),from:m.from,to:m.to,promotion:m.promotion,revision:i});
      assert.ok(res.ok,JSON.stringify(res));assert.deepEqual(match,prior);
      match=res.next;
      const publicState=publicMatchState(match,side);
      assert.equal(publicState.fen,local.fen());assert.equal(publicState.result,resultOf(local));
      assert.equal(publicState.isGameOver,local.isGameOver());
    }
  }
});

test('heuristic remains advisory and does not mutate live history or FEN',()=>{
  const g=play(new Chess(),['Nf3','Nf6','Ng1','Ng8','e4','e5']);
  const before=snapshot(g),m=chooseComputerMove(g);
  assert.ok(m&&g.moves({verbose:true}).some(x=>x.lan===m.lan));
  assert.deepEqual(snapshot(g),before);
});
