import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { chooseComputerMove, type MatchRecord } from './game';

type Props = { record: MatchRecord; onClose: () => void; startAnalysis?: boolean };
const glyph = (color: string, type: string) => '/pieces/' + color + '-' + type + '.svg';
const files = 'abcdefgh';

export default function ReplayViewer({ record, onClose, startAnalysis=false }: Props) {
  const replay = useMemo(() => {
    try {
      const match = new Chess();
      match.loadPgn(record.pgn);
      const moves = match.history({ verbose: true });
      const step = new Chess();
      const positions = [step.fen()];
      for (const move of moves) {
        step.move(move);
        positions.push(step.fen());
      }
      return { positions, moves: moves.map(move => move.san), error: null as string | null };
    } catch {
      return { positions: [], moves: [], error: 'The saved PGN could not be decoded.' };
    }
  }, [record.pgn]);
  const [ply, setPly] = useState(replay.moves.length);
  const [playing, setPlaying] = useState(false);
  const [analysis, setAnalysis] = useState(startAnalysis);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') setPly(n => Math.max(0, n - 1));
      if (event.key === 'ArrowRight') setPly(n => Math.min(replay.moves.length, n + 1));
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [onClose, replay.moves.length]);
  const game = useMemo(() => replay.positions.length ? new Chess(replay.positions[ply]) : null, [replay.positions, ply]);
  const squares = game?.board() ?? [];
  const insight = useMemo(() => {
    if (!game) return null;
    const points:Record<string,number>={p:1,n:3,b:3.25,r:5,q:9,k:0};
    const material=game.board().flat().reduce((total,piece)=>total+(piece?points[piece.type]*(piece.color==='w'?1:-1):0),0);
    const next=game.isGameOver()?null:chooseComputerMove(game);
    return { material, next:next?.san||'None', turn:game.turn()==='w'?'White':'Black' };
  },[game]);
  useEffect(()=>{
    if(!playing || replay.error)return;
    if(ply>=replay.moves.length){setPlaying(false);return;}
    const timer=window.setTimeout(()=>setPly(v=>Math.min(replay.moves.length,v+1)),620);
    return()=>window.clearTimeout(timer);
  },[playing,ply,replay.moves.length,replay.error]);
  const copyPGN = async () => {
    try { await navigator.clipboard.writeText(record.pgn); }
    catch { /* Clipboard may be denied; source record is still accessible in browser storage. */ }
  };
  return <div className="replay-backdrop" role="presentation">
    <section className="replay-dialog" role="dialog" aria-modal="true" aria-label="Saved game replay">
      <header className="replay-heading">
        <div><p className="eyebrow">{analysis?'BASIC POSITION ANALYSIS':'MATCH REPLAY'}</p><h2>{analysis?'Study the Position':'Move by Move'}</h2></div>
        <button type="button" onClick={onClose} aria-label="Close replay">×</button>
      </header>
      {replay.error ? <p role="alert">{replay.error}</p> : <>
        <div className="replay-board" role="grid" aria-label="Replayed chessboard">
          {squares.flat().map((piece, i) => {
            const row = Math.floor(i / 8), col = i % 8;
            const square = files[col] + (8 - row);
            return <div role="gridcell" key={square} aria-label={square + (piece ? ' ' + piece.color + piece.type : '')} className={'replay-square ' + ((row + col) % 2 === 0 ? 'light' : 'dark')}>
              {piece && <img src={glyph(piece.color, piece.type)} alt="" draggable={false}/>}
            </div>;
          })}
        </div>
        <div className="replay-counter">Move {ply} / {replay.moves.length} {ply > 0 ? ' · ' + replay.moves[ply - 1] : ' · Starting position'}</div>
        <div className="royal-replay-tabs"><button type="button" className={!analysis?'active':''} onClick={()=>setAnalysis(false)}>REPLAY</button><button type="button" className={analysis?'active':''} onClick={()=>setAnalysis(true)}>ANALYSIS</button></div>
        <div className="replay-controls" role="group" aria-label="Replay controls">
          <button type="button" onClick={() => setPly(0)} disabled={ply === 0} aria-label="First move">|◀</button>
          <button type="button" onClick={() => setPly(n => Math.max(0, n - 1))} disabled={ply === 0} aria-label="Previous move">◀</button>
          <button type="button" onClick={() => setPly(n => Math.min(replay.moves.length, n + 1))} disabled={ply === replay.moves.length} aria-label="Next move">▶</button>
          <button type="button" onClick={() => setPly(replay.moves.length)} disabled={ply === replay.moves.length} aria-label="Last move">▶|</button>
          <button type="button" onClick={() => {if(ply===replay.moves.length)setPly(0);setPlaying(v=>!v);}} aria-label={playing?'Pause replay':'Autoplay replay'}>{playing?'Ⅱ':'AUTO'}</button>
        </div>
        {analysis && insight && <div className="royal-analysis-panel">
          <strong>LOCAL HEURISTIC · NOT STOCKFISH</strong>
          <span>Material balance: {insight.material===0?'Equal':(insight.material>0?'+':'')+insight.material.toFixed(2)} (White perspective)</span>
          <span>{insight.turn} to move · Suggested move: {insight.next}</span>
          <small>This is a single-ply material/move heuristic, not a depth-18 engine or an official rating.</small>
        </div>}
        <div className="replay-moves">{replay.moves.map((san, i) => <button type="button" key={i} onClick={() => setPly(i + 1)} className={ply === i + 1 ? 'active' : ''} aria-label={'Jump to move ' + (i + 1) + ' ' + san}>{i % 2 === 0 ? Math.floor(i / 2) + 1 + '.' : ''} {san}</button>)}</div>
        <button type="button" className="btn btn-secondary" onClick={copyPGN}>COPY PGN</button>
      </>}
    </section>
  </div>;
}
