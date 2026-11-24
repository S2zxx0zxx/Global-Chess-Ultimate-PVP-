import { useEffect, useMemo, useRef, useState } from 'react';
import { replayTimeline, replayPosition } from './chess-state';
import type { ReplayTimeline } from './chess-state';
import type { MatchRecord } from './game';
import { positionOf, uci } from './ai/protocol';
import { AnalysisSession, AnalysisCache, scoreLabel, whiteShare, practiceFrom, addPractice, BATCH, type Report } from './match-analysis';

type Props = { record: MatchRecord; onClose: () => void; startAnalysis?: boolean };
const glyph = (color: string, type: string) => '/pieces/' + color + '-' + type + '.svg';
const files = 'abcdefgh';

export default function ReplayViewer({ record, onClose, startAnalysis=false }: Props) {
  const replay = useMemo(() => {
    try {
      const timeline = replayTimeline(record.pgn);
      return { timeline, moves: timeline.moves.map(move => move.san), error: null as string | null };
    } catch {
      return { timeline: null as ReplayTimeline | null, moves: [], error: 'The saved PGN could not be decoded.' };
    }
  }, [record.pgn]);
  const [ply, setPly] = useState(replay.moves.length);
  const [playing, setPlaying] = useState(false);
  const [analysis, setAnalysis] = useState(startAnalysis);
  useEffect(() => { setPly(replay.moves.length); setPlaying(false); }, [replay]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {stopReview();position.current?.cancel();onClose();}
      if (event.key === 'ArrowLeft') {stopReview();setPly(n => Math.max(0, n - 1));}
      if (event.key === 'ArrowRight') {stopReview();setPly(n => Math.min(replay.moves.length, n + 1));}
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [onClose, replay.moves.length]);
  const game = useMemo(() => replay.timeline ? replayPosition(replay.timeline, Math.min(ply, replay.moves.length)) : null, [replay, ply]);
  const squares = game?.board() ?? [];
  const insight = useMemo(() => {
    if (!game) return null;
    const points:Record<string,number>={p:1,n:3,b:3.25,r:5,q:9,k:0};
    const material=game.board().flat().reduce((total,piece)=>total+(piece?points[piece.type]*(piece.color==='w'?1:-1):0),0);
    return { material, turn:game.turn()==='w'?'White':'Black' };
  },[game]);
  const cache=useMemo(()=>new AnalysisCache(),[record.id,record.pgn]);
  const [entry,setEntry]=useState<{game:typeof game;report:Report}|null>(null);
  const [alternatives,setAlternatives]=useState(false);
  const [rows,setRows]=useState<Record<number,Report>>({});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const review=useRef<AnalysisSession|null>(null),position=useRef<AnalysisSession|null>(null);
  const stopReview=()=>{review.current?.cancel();review.current=null;setBusy(false);};
  const current=analysis&&!playing&&entry?.game===game?entry.report:null;
  useEffect(()=>()=>{review.current?.cancel();position.current?.cancel();},[record.id,record.pgn]);
  useEffect(()=>{
    if(!analysis||!game||playing||busy)return;
    const session=new AnalysisSession(record.id,cache);position.current=session;let disposed=false;
    const actual=replay.timeline?.moves[ply];
    void session.inspect(positionOf(game),ply,actual?uci(actual):null,alternatives).then(report=>{if(!disposed)setEntry({game,report});}).catch(()=>{if(!disposed)setMessage('Analysis unavailable.');});
    return()=>{disposed=true;session.cancel();if(position.current===session)position.current=null;};
  },[analysis,game,ply,alternatives,playing,busy,cache,record.id,replay.timeline]);
  useEffect(()=>{if(!analysis)stopReview();},[analysis]);
  const reviewNext=()=>{
    if(!replay.timeline||busy)return;
    const first=Array.from({length:replay.moves.length},(_,i)=>i).find(i=>!rows[i]);if(first===undefined)return;
    position.current?.cancel();setPlaying(false);setBusy(true);setMessage('Review in progress…');
    const session=new AnalysisSession(record.id,cache);review.current=session;
    void session.review(replay.timeline,first,(index,report)=>{if(review.current===session)setRows(old=>({...old,[index]:report}));}).then(()=>{if(review.current===session)setMessage('Batch finished.');}).catch(()=>{if(review.current===session)setMessage('Review interrupted.');}).finally(()=>{if(review.current===session){review.current=null;setBusy(false);}});
  };
  const savePractice=(r:Report)=>{const p=practiceFrom(r);setMessage(p&&addPractice(p)?'Saved to Academy practice.':'Practice not saved.');};
  const highlight=current?.best?.move,score=current?.score??null,share=whiteShare(score);
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
        <div><p className="eyebrow">{analysis?'LOCAL ENGINE ANALYSIS':'MATCH REPLAY'}</p><h2>{analysis?'Study the Position':'Move by Move'}</h2></div>
        <button type="button" onClick={onClose} aria-label="Close replay">×</button>
      </header>
      {replay.error ? <p role="alert">{replay.error}</p> : <>
        <div className="replay-board" role="grid" aria-label="Replayed chessboard">
          {squares.flat().map((piece, i) => {
            const row = Math.floor(i / 8), col = i % 8;
            const square = files[col] + (8 - row);
            return <div role="gridcell" key={square} aria-label={square + (piece ? ' ' + piece.color + piece.type : '')} className={'replay-square ' + ((row + col) % 2 === 0 ? 'light' : 'dark')+(analysis&&highlight?.slice(0,2)===square?' analysis-from':'')+(analysis&&highlight?.slice(2,4)===square?' analysis-to':'')}>
              {piece && <img src={glyph(piece.color, piece.type)} alt="" draggable={false}/>}
            </div>;
          })}
        </div>
        <div className="replay-counter">Move {ply} / {replay.moves.length} {ply > 0 ? ' · ' + replay.moves[ply - 1] : ' · Starting position'}</div>
        <div className="royal-replay-tabs"><button type="button" className={!analysis?'active':''} onClick={()=>{stopReview();position.current?.cancel();setAnalysis(false);}}>REPLAY</button><button type="button" className={analysis?'active':''} onClick={()=>setAnalysis(true)}>ANALYSIS</button></div>
        <div className="replay-controls" role="group" aria-label="Replay controls">
          <button type="button" onClick={() => {stopReview();setPly(0);}} disabled={ply === 0} aria-label="First move">|◀</button>
          <button type="button" onClick={() => {stopReview();setPly(n => Math.max(0,n-1));}} disabled={ply === 0} aria-label="Previous move">◀</button>
          <button type="button" onClick={() => {stopReview();setPly(n => Math.min(replay.moves.length,n+1));}} disabled={ply === replay.moves.length} aria-label="Next move">▶</button>
          <button type="button" onClick={() => {stopReview();setPly(replay.moves.length);}} disabled={ply === replay.moves.length} aria-label="Last move">▶|</button>
          <button type="button" onClick={() => {stopReview();if(ply===replay.moves.length)setPly(0);setPlaying(v=>!v);}} aria-label={playing?'Pause replay':'Autoplay replay'}>{playing?'Ⅱ':'AUTO'}</button>
        </div>
        {analysis && insight && <div className="royal-analysis-panel" aria-label="Local engine analysis">
          <strong>LOCAL ENGINE · WHITE PERSPECTIVE</strong>
          <span>Material balance: {insight.material===0?'Equal':insight.material.toFixed(2)}</span>
          <span data-analysis-score>{scoreLabel(score)} · {insight.turn} to move</span>
          {share!==null&&<div className="analysis-eval" role="img" aria-label={'White-relative evaluation '+scoreLabel(score)}><div style={{width:share+'%'}}/></div>}
          <span data-analysis-status role="status">{playing?'Paused during autoplay':busy?'Reviewing saved moves…':!current?'Analyzing…':current.status==='terminal'?'Terminal position':current.best?'Depth '+current.depth+' · '+(current.status==='complete'?'Completed':'Budget-limited result'):'No reliable score or best line'}</span>
          {current?.best&&<><span data-best-move>Best found: {current.best.san}</span><span data-principal-variation>PV: {current.best.sanPV.join(' ')}</span></>}
          <small>Finite-depth estimate, not win probability, Elo or official accuracy.</small>
          <button type="button" className="btn btn-secondary" disabled={playing||busy||!current?.best} onClick={()=>{setEntry(null);setAlternatives(v=>!v);}}>{alternatives?'HIDE ALTERNATIVES':'COMPARE ALTERNATIVES'}</button>
          {alternatives&&current&&<div data-alternatives><small>{current.examined} / {current.legalCount} legal candidates examined; sampled, not exhaustive MultiPV. {current.alternatives.length<current.examined?'Some candidates incomplete.':''}</small>{current.alternatives.map(l=><p key={l.move}>{l.san} · {scoreLabel(l.score)} · {l.complete?'Depth '+l.depth:'Incomplete'} · {l.sanPV.join(' ')}</p>)}{current.played&&<span data-classification>Played: {current.classification}{current.lossCp!==null?' · '+current.lossCp+' cp loss':''} (heuristic)</span>}{practiceFrom(current)&&<button type="button" className="btn btn-secondary" onClick={()=>savePractice(current)}>SAVE POSITION TO PRACTICE</button>}</div>}
          <div className="analysis-review"><span data-review-progress>Reviewed {Object.keys(rows).length} / {replay.moves.length} plies</span><progress max={Math.max(1,replay.moves.length)} value={Object.keys(rows).length}/>{busy?<button type="button" className="btn btn-secondary" onClick={()=>{stopReview();setMessage('Review cancelled. Completed rows retained.');}}>CANCEL REVIEW</button>:<button type="button" className="btn btn-secondary" disabled={Object.keys(rows).length>=replay.moves.length} onClick={reviewNext}>REVIEW NEXT {BATCH} MOVES</button>}
          {Object.entries(rows).sort(([a],[b])=>Number(a)-Number(b)).map(([i,r])=><div className="analysis-row" key={i}><button type="button" onClick={()=>{stopReview();setPly(Number(i));}}>{Number(i)+1}. {replay.moves[Number(i)]} · {r.classification}</button>{practiceFrom(r)&&<button type="button" onClick={()=>savePractice(r)}>PRACTICE</button>}</div>)}</div>
          {message&&<small role="status">{message}</small>}
        </div>}
        <div className="replay-moves">{replay.moves.map((san, i) => <button type="button" key={i} onClick={() => {stopReview();setPly(i+1);}} className={ply === i + 1 ? 'active' : ''} aria-label={'Jump to move ' + (i + 1) + ' ' + san}>{i % 2 === 0 ? Math.floor(i / 2) + 1 + '.' : ''} {san}</button>)}</div>
        <button type="button" className="btn btn-secondary" onClick={copyPGN}>COPY PGN</button>
      </>}
    </section>
  </div>;
}
