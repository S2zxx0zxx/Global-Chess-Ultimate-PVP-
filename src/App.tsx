import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square, type Move } from 'chess.js';
import { FILES, loadJSON , resultOf, saveJSON, shortResult, SQUARES, STORAGE_KEYS, type GameResult, type MatchRecord, type PlayMode } from './game';
import { PUZZLES, PUZZLE_PROGRESS_KEY, isPuzzleSolution, type Puzzle } from './academy';
import RoyalStudio, { type RoyalScreen } from './RoyalStudio';
import RoyalIcon from './RoyalIcon';
import { newClock, advanceClock, displayClock } from './clock';
import { startAdvisory, searchId, liveCandidate, type Job } from './ai/client';
import { legalHint } from './match-analysis';
import ReviewPractice from './ReviewPractice';
import { committedEvents, endedEvent, dropAllowed, type GameplayEvent, type MoveCommitted } from './gameplay-events';
import { useBoardDrag } from './use-board-drag';
import { computerJob, normalizeComputer, otherSide, undoCount, DEFAULT_COMPUTER, PRESETS, type ComputerOptions } from './computer-mode';

const ChessBoard3D = lazy(() => import('./ChessBoard3D'));
const AnimationShowcase = lazy(() => import('./AnimationShowcase'));
const ReplayViewer = lazy(() => import('./ReplayViewer'));
const PrivateOnline = lazy(() => import('./PrivateOnline'));

type ThreeTheme = 'deco' | 'bauhaus' | 'scifi' | 'egypt' | 'classic';
type Page = 'home' | 'play' | 'game' | 'history' | 'training' | 'profile' | 'settings' | 'about' | 'online' | 'studio';
type Promotion = { from: Square; to: Square };
type Settings = { flipped: boolean; reducedMotion: boolean; hints: boolean; modelTheme?: ThreeTheme; useLibraryAssets?: boolean };
type Snapshot = { fen: string; mode: PlayMode; pgn: string; active: boolean; seconds: [number, number]; timed?: boolean; remainingMs?: [number, number]; computer?: ComputerOptions };
const DEFAULT_SETTINGS: Settings = { flipped: false, reducedMotion: false, hints: true };
const initials = (text: string) => text.trim().slice(0, 2).toUpperCase() || 'GC';
function randomGuest() { return 'Chess Guest ' + Math.floor(1000 + Math.random() * 9000); }

const Icon = ({name,size=20}:{name:string;size?:number})=><RoyalIcon name={name} size={size}/>;

export default function App() {
  const game = useRef(new Chess());
  const clockRef = useRef(newClock(Date.now()));
  const endedRef = useRef(false);
  const aiEpoch=useRef(0);
  const aiGameId=useRef('game-'+searchId());
  const botJob=useRef<Job|null>(null);
  const hintJob=useRef<Job|null>(null);
  const invalidateAI=()=>{aiEpoch.current++;botJob.current?.cancel();hintJob.current?.cancel();botJob.current=null;hintJob.current=null;};
  const stored = useRef(loadJSON<Snapshot | null>(STORAGE_KEYS.lastMatch, null));
  const [page, setPage] = useState<Page>(() => new URLSearchParams(location.search).has('room') ? 'online' : (loadJSON<{completedIntro?:boolean}>('gcu.royal-ui.v1',{}).completedIntro ? 'home' : 'studio'));
  const [studioScreen, setStudioScreen] = useState<RoyalScreen>('splash');
  const [boardSkin, setBoardSkin] = useState<'wood'|'ivory'|'onyx'|'stone'>(() => loadJSON<{skin?:'wood'|'ivory'|'onyx'|'stone'}>('gcu.royal-ui.v1',{}).skin || 'wood');
  const [mode, setMode] = useState<PlayMode>('local');
  const [computer,setComputer]=useState<ComputerOptions>(DEFAULT_COMPUTER);
  const computerRef=useRef<ComputerOptions>(DEFAULT_COMPUTER);
  const pausedRef=useRef(false);
  const [aiStatus,setAIStatus]=useState('');
  const [view3D, setView3D] = useState(false);
  const [showAvatarAnimations, setShowAvatarAnimations] = useState(false);
  const [replayRecord, setReplayRecord] = useState<MatchRecord | null>(null);
  const [replayAnalysis, setReplayAnalysis] = useState(false);
  const [fen, setFen] = useState(game.current.fen());
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [settings, setSettings] = useState<Settings>(() => loadJSON(STORAGE_KEYS.settings, DEFAULT_SETTINGS));
  const [guest, setGuest] = useState(() => {
    const saved=loadJSON<string>(STORAGE_KEYS.guest,randomGuest());
    const autoName=/^Royal Guest (\d{4})$/.exec(saved);
    return autoName ? 'Chess Guest '+autoName[1] : saved;
  });
  const [history, setHistory] = useState<MatchRecord[]>(() => loadJSON(STORAGE_KEYS.history, []));
  const [seconds, setSeconds] = useState<[number, number]>([600, 600]);
  const [endResult, setEndResult] = useState<GameResult | null>(null);
  const [message, setMessage] = useState('');
  const [menu, setMenu] = useState(false);
  const [resignDialog, setResignDialog] = useState(false);
  const [drawDialog, setDrawDialog] = useState(false);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [emoteFeedback, setEmoteFeedback] = useState('');
  const [puzzleDone, setPuzzleDone] = useState(false);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle>(PUZZLES[0]);
  const [solvedPuzzles, setSolvedPuzzles] = useState<string[]>(() => loadJSON<string[]>(PUZZLE_PROGRESS_KEY, []));
  const [newName, setNewName] = useState(guest);
  const [clockEnabled, setClockEnabled] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [lastMove, setLastMove] = useState<[Square, Square] | null>(null);
  const [moveEvents,setMoveEvents]=useState<GameplayEvent[]>([]);
  const [terminalEvent,setTerminalEvent]=useState<GameplayEvent|null>(null);
  const [captureEffect,setCaptureEffect]=useState<{id:string;square:Square}|null>(null);
  const eventRevision=useRef(0);
  const motion=moveEvents.find((e):e is MoveCommitted=>e.kind==='MoveCommitted');
  const publishMove=(m:Move,source:'human'|'computer')=>setMoveEvents(committedEvents(game.current,m,aiGameId.current,++eventRevision.current,source));
  const resetMotion=()=>{setMoveEvents([]);setTerminalEvent(null);setCaptureEffect(null);};
  useEffect(()=>{const c=moveEvents.find(e=>e.kind==='Capture');if(!c||settings.reducedMotion){setCaptureEffect(null);return;}setCaptureEffect({id:c.eventId,square:c.destination});const timer=window.setTimeout(()=>setCaptureEffect(null),600);return()=>window.clearTimeout(timer);},[moveEvents,settings.reducedMotion]);

  const turn = game.current.turn();
  const botSide=otherSide(computer.playerSide);
  const legal = useMemo(() => selected ? game.current.moves({ square: selected, verbose: true }).map(m => m.to) : [], [selected, fen]);
  const board = game.current.board();
  const inCheck = game.current.isCheck();
  const gameOver = game.current.isGameOver();

  const notify = (text: string) => { setMessage(text); };
  const persist = (currentMode: PlayMode, currentActive: boolean, currentSeconds: [number, number], timed = clockEnabled) => {
    const next: Snapshot = { fen: game.current.fen(), pgn: game.current.pgn(), mode: currentMode, active: currentActive, seconds: timed ? [Math.ceil(clockRef.current.remainingMs[0]/1000),Math.ceil(clockRef.current.remainingMs[1]/1000)] : currentSeconds, timed, remainingMs: [...clockRef.current.remainingMs], ...(currentMode==='computer'?{computer:computerRef.current}:{}) };
    stored.current = next;
    if (!saveJSON(STORAGE_KEYS.lastMatch, next)) setStorageWarning(true);
  };
  const recordEnd = (outcome: GameResult, currentMode: PlayMode) => {
    if (endedRef.current) return;
    endedRef.current = true;
    setTerminalEvent(endedEvent(aiGameId.current,++eventRevision.current,outcome));
    invalidateAI();
    const id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const item: MatchRecord = { id, endedAt: new Date().toISOString(), mode: currentMode, result: outcome, pgn: game.current.pgn(), moves: game.current.history().length, ...(currentMode==='computer'?{playerSide:computerRef.current.playerSide,difficulty:computerRef.current.difficulty}:{}) };
    setHistory(old => {
      const next = [item, ...old].slice(0, 100);
      if (!saveJSON(STORAGE_KEYS.history, next)) setStorageWarning(true);
      return next;
    });
    pausedRef.current=true;setAIStatus('');
    setEndResult(outcome);
    setActive(false);
    persist(currentMode, false, seconds);
  };
  const refresh = (currentMode: PlayMode, moving = true) => {
    setFen(game.current.fen());
    setSelected(null);
    setPromotion(null);
    setLastMove(() => {
      const hist = game.current.history({ verbose: true });
      return hist.length ? [hist[hist.length - 1].from, hist[hist.length - 1].to] : null;
    });
    if (moving) persist(currentMode, true, seconds);
    const outcome = resultOf(game.current);
    if (outcome && currentMode !== 'puzzle') recordEnd(outcome, currentMode);
  };
  const start = (nextMode: PlayMode, timed = false, puzzle: Puzzle = currentPuzzle, options:ComputerOptions=computerRef.current) => {
    invalidateAI(); aiGameId.current='game-'+searchId();eventRevision.current=0;resetMotion();
    pausedRef.current=false;setAIStatus('');setResignDialog(false);
    if(nextMode==='computer'){const c=normalizeComputer(options);computerRef.current=c;setComputer(c);setSettings(s=>({...s,flipped:c.playerSide==='b'}));}
    if (nextMode === 'puzzle') setCurrentPuzzle(puzzle);
    game.current = nextMode === 'puzzle' ? new Chess(puzzle.fen) : new Chess();
    setMode(nextMode);
    setFen(game.current.fen());
    setSelected(null);
    setEndResult(null);
    endedRef.current = false;
    clockRef.current = newClock(Date.now());
    setPromotion(null);
    setPuzzleDone(false);
    setSeconds([600, 600]);
    setClockEnabled(timed && nextMode !== 'puzzle');
    setActive(true);
    setLastMove(null);
    resetMotion();
    setPage('game');
    setMenu(false);
    setDrawDialog(false);
    setEmoteOpen(false);
    setEmoteFeedback('');
    setMessage('');
    persist(nextMode, true, [600, 600], timed && nextMode !== 'puzzle');
  };
  const resume = () => {
    const old = stored.current;
    if (!old || !old.active) return;
    try {
      const restored = new Chess();
      if (old.pgn) restored.loadPgn(old.pgn);
      else restored.load(old.fen);
      invalidateAI(); aiGameId.current='game-'+searchId();eventRevision.current=0;resetMotion();
      if(restored.fen()!==old.fen||restored.isGameOver())throw Error('Invalid or ended saved match');
      const c=normalizeComputer(old.computer??{difficulty:'easy',playerSide:'w'});computerRef.current=c;setComputer(c);
      if(old.mode==='computer')setSettings(s=>({...s,flipped:c.playerSide==='b'}));
      pausedRef.current=false;setAIStatus('');setEndResult(null);setMenu(false);setResignDialog(false);setDrawDialog(false);setSelected(null);setPromotion(null);setPuzzleDone(false);
      game.current = restored;
      setFen(restored.fen());
      setMode(old.mode);
      setActive(true);
      setSeconds(old.seconds || [600, 600]);
      const raw=old.remainingMs??(old.seconds??[600,600]).map(x=>x*1000);
      const ms:[number,number]=[0,1].map(i=>Number.isFinite(raw[i])?Math.max(0,Math.min(600000,raw[i])):600000) as [number,number];
      setSeconds([Math.ceil(ms[0]/1000),Math.ceil(ms[1]/1000)]);
      clockRef.current = { remainingMs: [...ms], turn: restored.turn(), lastAt: Date.now() };
      endedRef.current = false;
      setClockEnabled(Boolean(old.timed));
      setLastMove(null);
      setPage('game');
    } catch { notify('Saved game could not be restored. Your other games are untouched.'); }
  };

  const execute = (from: Square, to: Square, promote: string = 'q') => {
    if (!active || endedRef.current || endResult || pausedRef.current || puzzleDone || (mode === 'computer' && game.current.turn() === botSide)) return;
    if (mode === 'puzzle' && !isPuzzleSolution(currentPuzzle, from, to, promote)) {
      notify('Not quite. ' + currentPuzzle.prompt);
      setSelected(null);
      return;
    }
    try {
      if (clockEnabled) {
        const ticked = advanceClock(clockRef.current, Date.now());
        clockRef.current = ticked.state;
        if (ticked.flagged) { recordEnd(ticked.flagged === 'w' ? 'timeout-white' : 'timeout-black', mode); return; }
      }
      const moved = game.current.move({ from, to, promotion: promote });
      if (!moved) { setSelected(null); return; }
      publishMove(moved,'human');
      invalidateAI();
      clockRef.current = { ...clockRef.current, turn: game.current.turn(), lastAt: Date.now() };
      if (mode === 'puzzle') {
        setPuzzleDone(true);
        setSolvedPuzzles(old => {
          if (old.includes(currentPuzzle.id)) return old;
          const next = [...old, currentPuzzle.id];
          if (!saveJSON(PUZZLE_PROGRESS_KEY, next)) setStorageWarning(true);
          return next;
        });
        notify('Tactic solved! ' + currentPuzzle.explanation);
      }
      refresh(mode);
    } catch {
      notify('That move is not legal.');
      setSelected(null);
    }
  };
  const onSquare = (square: Square) => {
    if (!active || endedRef.current || endResult || pausedRef.current || promotion || (mode === 'computer' && game.current.turn() === botSide) || puzzleDone) return;
    const piece = game.current.get(square);
    if (selected && legal.includes(square)) {
      const sourcePiece = game.current.get(selected);
      const needsPromotion = sourcePiece?.type === 'p' && (square.endsWith('8') || square.endsWith('1'));
      if (needsPromotion) { setPromotion({ from: selected, to: square }); return; }
      execute(selected, square);
      return;
    }
    if (piece && piece.color === turn) { setSelected(square); setMessage(''); }
    else setSelected(null);
  };

  const canDrag=page==='game'&&!view3D&&active&&!endResult&&!endedRef.current&&!pausedRef.current&&!menu&&!resignDialog&&!drawDialog&&!promotion&&!puzzleDone&&!gameOver&&(mode!=='computer'||turn!==botSide);
  const drag=useBoardDrag({token:aiGameId.current+':'+aiEpoch.current+':'+fen+':'+page+':'+view3D,flipped:settings.flipped,enabled:canDrag,reducedMotion:settings.reducedMotion,piece:s=>{const p=game.current.get(s);return p?.color===game.current.turn()?p.color+'-'+p.type:null;},drop:(from,to)=>{
    if(!canDrag||pausedRef.current||endedRef.current||!to||!dropAllowed(game.current,from,to))return false;
    const moves=game.current.moves({square:from,verbose:true}).filter(m=>m.to===to);
    if(moves.some(m=>m.promotion)){setSelected(from);setPromotion({from,to});return true;}
    execute(from,to);return true;
  }});
  // Both strategies execute in a dedicated worker. Foundation scoring is opt-in.
  useEffect(() => {
    if (page !== 'game' || mode !== 'computer' || !active || turn !== botSide || endResult || gameOver || menu || resignDialog || drawDialog) return;
    const root=game.current,revision=aiEpoch.current,gameId=aiGameId.current;
    setAIStatus('Computer thinking…');
    let disposed=false,job:Job|undefined;
    const timer=window.setTimeout(()=>{
      if(disposed||endedRef.current||pausedRef.current||aiEpoch.current!==revision||game.current!==root)return;
      const identity={searchId:searchId(),gameId,revision};
      if(clockEnabled){const ticked=advanceClock(clockRef.current,Date.now());clockRef.current=ticked.state;if(ticked.flagged){recordEnd(ticked.flagged==='w'?'timeout-white':'timeout-black','computer');return;}}
      job=computerJob(root,identity,computerRef.current,clockEnabled?clockRef.current.remainingMs[botSide==='w'?0:1]:null);
      botJob.current=job;
      const ownJob=job;
      void ownJob.promise.then(response=>{
        if(botJob.current===ownJob)botJob.current=null;
        if(disposed||endedRef.current||aiEpoch.current!==revision||aiGameId.current!==gameId||game.current!==root||pausedRef.current||root.turn()!==botSide)return;
        const next=liveCandidate(root,ownJob.request,response,identity);
        if(!next){setAIStatus('Computer move unavailable');return;}
        setAIStatus(response.status==='fallback'||response.completedDepth===0&&response.status==='timeout'?'Legal fallback used':response.status==='timeout'?'Time budget reached · last completed search':'Computer move ready');
        if(clockEnabled){
          const ticked=advanceClock(clockRef.current,Date.now());
          clockRef.current=ticked.state;
          if(ticked.flagged){recordEnd(ticked.flagged==='w'?'timeout-white':'timeout-black','computer');return;}
        }
        const played=root.move(next);
        publishMove(played,'computer');
        invalidateAI();
        clockRef.current={...clockRef.current,turn:root.turn(),lastAt:Date.now()};
        refresh('computer');
      });
    }, 80);
    return ()=>{disposed=true;window.clearTimeout(timer);job?.cancel();if(botJob.current===job)botJob.current=null;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, mode, active, page, endResult, gameOver, turn, menu, resignDialog, drawDialog, clockEnabled, botSide, computer]);
  useEffect(()=>()=>{botJob.current?.cancel();hintJob.current?.cancel();},[]);

  // Local clocks are wall-time reconciled to avoid drift after a throttled/background tab.
  // Network/rated clocks must still use a server-authoritative clock.
  useEffect(() => {
    if (!clockEnabled || !active || page !== 'game' || endResult || mode === 'puzzle' || menu || resignDialog || drawDialog) return;
    const tick = () => {
      if(pausedRef.current||endedRef.current)return;
      const current = advanceClock(clockRef.current, Date.now());
      clockRef.current = current.state;
      setSeconds([Math.ceil(current.state.remainingMs[0] / 1000), Math.ceil(current.state.remainingMs[1] / 1000)]);
      if (current.flagged) recordEnd(current.flagged === 'w' ? 'timeout-white' : 'timeout-black', mode);
    };
    const timer = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockEnabled, active, page, mode, endResult, menu, resignDialog, drawDialog]);

  useEffect(() => { if (!saveJSON(STORAGE_KEYS.settings, settings)) setStorageWarning(true); }, [settings]);
  useEffect(() => { if (!saveJSON(STORAGE_KEYS.guest, guest)) setStorageWarning(true); }, [guest]);

  const hint = () => {
    if (!active || endResult || pausedRef.current || puzzleDone || (mode === 'computer' && game.current.turn() === botSide)) return;
    if (mode === 'puzzle') {
      const suggested=legalHint(game.current,currentPuzzle.from+currentPuzzle.to+(currentPuzzle.promotion??''));
      if(!suggested){notify('No verified hint for this position.');return;}
      setSelected(suggested.from);
      notify('Tactics hint: consider the piece on ' + suggested.from + '.');
      return;
    }
    hintJob.current?.cancel();
    const root=game.current,identity={searchId:searchId(),gameId:aiGameId.current,revision:aiEpoch.current};
    const job=startAdvisory(root,identity,'analysis');
    hintJob.current=job;
    void job.promise.then(response=>{
      if(hintJob.current!==job)return;
      hintJob.current=null;
      if(endedRef.current||game.current!==root||aiEpoch.current!==identity.revision||aiGameId.current!==identity.gameId)return;
      const suggested=liveCandidate(root,job.request,response,identity);
      if(!suggested){notify('No legal move available.');return;}
      setSelected(suggested.from);
      notify('Suggestion: '+suggested.from+' → '+suggested.to+(response.status==='fallback'?'. Legal fallback, not engine analysis.':'. This is a basic heuristic, not engine analysis.'));
    });
  };
  const pauseMatch=()=>{
    invalidateAI();setAIStatus('');
    if(!pausedRef.current&&clockEnabled&&active&&!endedRef.current&&mode!=='puzzle'){
      const t=advanceClock(clockRef.current,Date.now());clockRef.current=t.state;
      setSeconds([Math.ceil(t.state.remainingMs[0]/1000),Math.ceil(t.state.remainingMs[1]/1000)]);
      if(t.flagged)recordEnd(t.flagged==='w'?'timeout-white':'timeout-black',mode);
    }
    pausedRef.current=true;
  };
  const resign = () => {
    if (!active || mode === 'puzzle' || endResult) return;
    pauseMatch();
    if(endedRef.current)return;
    setMenu(false);
    setResignDialog(true);
  };
  const confirmResign = () => {
    if (!active || mode === 'puzzle' || endResult) { setResignDialog(false); return; }
    setResignDialog(false);
    recordEnd((mode==='computer'?computer.playerSide:game.current.turn()) === 'w' ? 'black' : 'white', mode);
  };
  const showGameMenu=()=>{pauseMatch();if(!endedRef.current)setMenu(true);};
  useEffect(()=>{
    if(page==='game'&&active&&!menu&&!resignDialog&&!drawDialog&&!endedRef.current){
      if(pausedRef.current)clockRef.current={...clockRef.current,lastAt:Date.now()};
      pausedRef.current=false;
    }
  },[menu,resignDialog,drawDialog,page,active]);
  const offerDraw = () => {
    if (!active || mode === 'puzzle' || endResult) return;
    if (mode === 'computer') { notify('The offline computer does not support draw negotiation.'); return; }
    pauseMatch();if(!endedRef.current)setDrawDialog(true);
  };
  const confirmDraw = () => {
    if (!active || mode !== 'local' || endResult) { setDrawDialog(false); return; }
    setDrawDialog(false);
    recordEnd('draw', mode);
  };
  const sendLocalEmote = (emoji: string) => {
    setEmoteOpen(false);
    setEmoteFeedback(emoji);
    notify('Local emote: ' + emoji + ' (not sent online)');
  };
  const undo = () => {
    if (!active || mode === 'puzzle') return;
    const rewind = undoCount(game.current,mode,computer.playerSide);
    if(!rewind)return;
    if(clockEnabled&&!pausedRef.current){const t=advanceClock(clockRef.current,Date.now());clockRef.current=t.state;setSeconds([Math.ceil(t.state.remainingMs[0]/1000),Math.ceil(t.state.remainingMs[1]/1000)]);if(t.flagged){recordEnd(t.flagged==='w'?'timeout-white':'timeout-black',mode);return;}}
    invalidateAI();
    let changed = false;
    for (let i = 0; i < rewind; i++) changed = Boolean(game.current.undo()) || changed;
    if (changed) { resetMotion();setAIStatus('');clockRef.current = { ...clockRef.current, turn: game.current.turn(), lastAt: Date.now() }; setEndResult(null); refresh(mode); }
  };
  const saveAndExit = () => {
    invalidateAI();
    pauseMatch();
    persist(mode, active&&!endedRef.current, seconds);
    setMenu(false);
    setPage('home');
  };

  const formatTime = (secs: number) => displayClock(secs * 1000);
  const openLatestReplay=(analyze=false)=>{
    const latest=history[0];
    if(!latest){notify('Complete a recorded match first.');return;}
    setReplayAnalysis(analyze);
    setReplayRecord(latest);
  };
  const labelResult = (result: GameResult) => result === 'draw' ? 'A royal draw' : result.startsWith('timeout') ? 'Time expired' : result === 'white' ? 'White triumphs' : 'Black triumphs';

  const screen = (target: Page) => { if(target==='online')setReplayRecord(null); if(page==='game'&&target!=='game'){pauseMatch();persist(mode,active&&!endedRef.current,seconds);}else invalidateAI(); setPage(target); setMenu(false); setMessage(''); };
  const openRoyal = (target: RoyalScreen) => {
    if(page==='game'){pauseMatch();persist(mode,active&&!endedRef.current,seconds);}else invalidateAI();
    setStudioScreen(target);
    setMessage('');
    setMenu(false);
    if (target === 'home') setPage('home');
    else if (target === 'modes') setPage('play');
    else setPage('studio');
  };
  const royalTab = (target: RoyalScreen, icon: string, label: string) => {
    const current = target === 'home' ? page === 'home' :
      target === 'modes' ? page === 'play' || page === 'game' || page === 'online' :
      page === 'studio' && studioScreen === target;
    return <button type="button" onClick={() => openRoyal(target)} className={'nav-tab ' + (current ? 'current' : '')} aria-current={current ? 'page' : undefined} aria-label={label}>
      <Icon name={icon} size={23}/><span>{label}</span>
    </button>;
  };

  return <div data-board-skin={boardSkin} className={'app ' + (settings.reducedMotion ? 'reduce-motion' : '') + (page === 'studio' && ['splash','welcome','onboard-play','onboard-learn'].includes(studioScreen) ? ' intro-stage' : '')}>
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <div className="app-frame">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => screen('home')} aria-label="Go home">
          <span className="brand-crest"><Icon name="crown" size={27}/></span>
          <span className="brand-copy"><b>GLOBAL CHESS</b><small>ULTIMATE</small></span>
        </button>
        <button type="button" className="top-avatar" onClick={() => openRoyal('profile')} aria-label="Open redesigned player profile">{initials(guest)}</button>
      </header>

      {storageWarning && <div role="alert" className="notice warn">Private mode or browser storage prevented saving. This session may not persist.</div>}
      {message && <div role="status" className="notice"><Icon name="star" size={15}/>{message}<button type="button" onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}

      <main id="main">
        {page === 'home' && stored.current?.active && <button type="button" className="resume-banner" onClick={resume}><Icon name="play"/> RESUME SAVED MATCH <Icon name="arrow"/></button>}
        {(page === 'home' || page === 'play' || page === 'studio') && <RoyalStudio
          screen={page === 'home' ? 'home' : page === 'play' ? 'modes' : studioScreen}
          navigate={openRoyal}
          openPage={screen}
          begin={(nextMode,timed,options) => start(nextMode,timed,currentPuzzle,options)}
          guest={guest}
          saveGuest={(value) => { setGuest(value); setNewName(value); }}
          history={history}
          solved={solvedPuzzles}
          reducedMotion={settings.reducedMotion}
          hints={settings.hints}
          flipped={settings.flipped}
          toggleSetting={(key,value) => setSettings(prev => ({...prev,[key]:value}))}
          modelTheme={settings.modelTheme || 'deco'}
          setModelTheme={theme => setSettings(prev => ({...prev,modelTheme:theme}))}
          onSkinChange={skin => setBoardSkin(skin)}
        />}

        {page === 'game' && <>
          <div className="royal-match-panel">
            <div className="royal-match-top">
              <button className="royal-match-back" type="button" onClick={saveAndExit} aria-label="Save game and return home"><Icon name="back" size={20}/></button>
              <div className="royal-match-player"><span className="royal-match-avatar">♙</span><span><strong>{mode === 'puzzle' ? 'Scholar' : mode==='computer'&&computer.playerSide==='b'?'Computer':guest}</strong><small>★ {mode === 'puzzle' ? 'Training' : mode==='computer'&&computer.playerSide==='b'?PRESETS[computer.difficulty].label:'White'}</small></span><b className={turn==='w'?'active-clock':''}>{mode==='puzzle'?'—':clockEnabled?formatTime(seconds[0]):'∞'}</b></div>
              <span className="royal-match-crown">♛</span>
              <div className="royal-match-player opponent"><span><strong>{mode==='computer'?(computer.playerSide==='w'?'Computer':guest):mode==='puzzle'?'Tactic':'Black'}</strong><small>{mode==='computer'?(computer.playerSide==='w'?PRESETS[computer.difficulty].label:'Black'):'Opponent'}</small></span><b className={turn==='b'?'active-clock':''}>{mode==='puzzle'?'—':clockEnabled?formatTime(seconds[1]):'∞'}</b><span className="royal-match-avatar">♟</span></div>
              <button className="royal-match-back" type="button" aria-label="Open match settings" onClick={showGameMenu}><Icon name="menu" size={19}/></button>
            </div>
            <div className="royal-display-switch" role="group" aria-label="Choose board rendering">
              <button type="button" className={!view3D?'active':''} onClick={()=>setView3D(false)} aria-pressed={!view3D}>2D BOARD</button>
              <button type="button" className={view3D?'active':''} onClick={()=>setView3D(true)} aria-pressed={view3D}>3D BOARD</button>
            </div>
          {view3D ? <Suspense fallback={<div className="board3d-loading" role="status">Loading 3D renderer…</div>}><ChessBoard3D fen={fen} selected={selected} legal={settings.hints ? legal : []} lastMove={lastMove} motion={motion} theme={settings.modelTheme || "deco"} useLibraryAssets={Boolean(settings.useLibraryAssets)} flipped={settings.flipped} reducedMotion={settings.reducedMotion} onSquare={onSquare}/></Suspense> : <div className="board-surround">
            <div ref={drag.ref} {...drag.handlers} className="board gcu-drag-board" role="grid" aria-label="Chess board. Select a piece then a destination, or drag a piece." data-event-id={motion?.eventId} data-ended-event={terminalEvent?.eventId} data-reduced-motion={settings.reducedMotion}>
              {Array.from({ length: 64 }, (_, idx) => {
                const r = Math.floor(idx / 8), c = idx % 8;
                const row = settings.flipped ? 7 - r : r;
                const col = settings.flipped ? 7 - c : c;
                const square = SQUARES[row * 8 + col];
                const piece = board[row][col];
                const light = (r + c) % 2 === 0;
                const isSelected = selected === square;
                const isLast = lastMove?.includes(square);
                const isLegal = settings.hints && legal.includes(square);
                const checkingKing = Boolean(inCheck && piece?.type === 'k' && piece.color === turn);
                return <button type="button" role="gridcell" aria-selected={isSelected} key={square} data-square={square} onClick={() => onSquare(square)} className={'square ' + (light ? 'light' : 'dark') + (isSelected ? ' selected' : '') + (isLast ? ' last-move' : '') + (checkingKing ? ' in-check' : '')} aria-label={square + (piece ? ': ' + (piece.color === 'w' ? 'White ' : 'Black ') + piece.type : ': empty') }>
                  {c === 0 && <span className="rank-label">{8 - row}</span>}
                  {r === 7 && <span className="file-label">{FILES[col]}</span>}
                  {piece && <img key={motion&&(motion.to===square||motion.rook?.to===square)?motion.eventId:square} alt="" draggable={false} className={'piece-img'+(drag.ghost?.source===square?' drag-source':'')} src={'/pieces/' + piece.color + '-' + piece.type + '.svg'} style={!settings.reducedMotion&&motion?.after===fen&&(motion.to===square||motion.rook?.to===square)?{animation:'gcu-committed-slide .22s ease-out both','--move-x':((FILES.indexOf((motion.to===square?motion.from:motion.rook!.from)[0])-FILES.indexOf(square[0]))*(settings.flipped?-1:1)*106)+'%','--move-y':((Number(square[1])-Number((motion.to===square?motion.from:motion.rook!.from)[1]))*(settings.flipped?-1:1)*106)+'%'} as React.CSSProperties:undefined} />}
                  {isLegal && <span className={piece ? 'legal-capture' : 'legal-dot'} />}
                  {captureEffect?.square===square && !settings.reducedMotion && <span key={captureEffect.id} className="royal-capture-smoke" aria-hidden="true"/>}
                </button>;
              })}
              {drag.ghost&&<img aria-hidden="true" alt="" draggable={false} className={'gcu-drag-ghost'+(drag.ghost.returning?' returning':'')} src={'/pieces/'+drag.ghost.piece+'.svg'} style={{left:drag.ghost.x,top:drag.ghost.y,width:drag.ghost.size,height:drag.ghost.size}}/>}
            </div>
          </div>}
          <div className={'royal-match-status '+(inCheck?'is-check':'')+(endResult?' is-ended':'')} role="status">
            {puzzleDone?'♛ Tactic Solved!':endResult?labelResult(endResult):gameOver?'Match Finished':inCheck?'⚠ Check!':mode==='puzzle'?currentPuzzle.prompt:turn==='w'?'● White to Move':'● Black to Move'}
          </div>
          {mode==='computer'&&aiStatus&&!endResult&&<p role="status" className="royal-emote-last" data-ai-status>{aiStatus}</p>}
          <div className="royal-match-actions" aria-label="In-game interaction controls">
            <button type="button" onClick={()=>notify('Online chat is unavailable for this local game.')}><span>☷</span>Chat</button>
            <button type="button" onClick={()=>setEmoteOpen(v=>!v)} disabled={!active||Boolean(endResult)}><span>☺</span>Emote</button>
            <button type="button" onClick={offerDraw} disabled={!active||mode!=='local'||Boolean(endResult)}><span>♧</span>Draw</button>
            <button type="button" onClick={resign} disabled={!active||mode==='puzzle'||Boolean(endResult)}><Icon name="flag" size={22}/>Resign</button>
            <button type="button" onClick={showGameMenu}><Icon name="menu" size={22}/>Menu</button>
          </div>
          {emoteOpen && <div className="royal-emote-picker" role="group" aria-label="Local chess emotes">{['👍','👏','🔥','😎','🤔','😄','😮','😠'].map(emoji=><button type="button" key={emoji} onClick={()=>sendLocalEmote(emoji)} aria-label={'Show local emote '+emoji}>{emoji}</button>)}</div>}
          {emoteFeedback && <p className="royal-emote-last" role="status">Last local emote: {emoteFeedback}</p>}
          <div className="royal-match-history"><h3><Icon name="history" size={19}/> Move History <small>{game.current.history().length} plies</small></h3>
            <div className="royal-pgn-moves">{game.current.history().length?game.current.history().map((m,i)=><span key={i}>{i%2===0?Math.floor(i/2)+1+'. ':''}{m} </span>):<p>Move a piece to begin the record.</p>}</div>
            <button type="button" onClick={undo} disabled={!active||mode==='puzzle'||undoCount(game.current,mode,computer.playerSide)===0}>↶ UNDO</button>
            <button type="button" onClick={hint} disabled={!active||Boolean(endResult)||puzzleDone||(mode==='computer'&&turn===botSide)}>✦ HINT</button>
          </div>
        </div>
          {endResult && <div className="result-overlay" role="alertdialog" aria-modal="true" aria-label="Match result"><div className="result-card"><span className="result-crown">♛</span><p className="eyebrow">GAME COMPLETE</p><h2>{labelResult(endResult)}</h2><p>{shortResult(endResult)}</p><button type="button" className="btn btn-primary" onClick={() => start(mode === 'puzzle' ? 'local' : mode, clockEnabled)}>REMATCH</button><button type="button" className="btn btn-secondary" onClick={() => openLatestReplay(false)}>REPLAY</button><button type="button" className="btn btn-secondary" onClick={() => openLatestReplay(true)}>ANALYSIS</button><button type="button" className="btn btn-secondary" onClick={saveAndExit}>BACK TO LOBBY</button></div></div>}
          {puzzleDone && <div className="result-overlay" role="alertdialog" aria-modal="true" aria-label="Puzzle completed"><div className="result-card"><span className="result-crown">✦</span><h2>Royal Tactic Solved</h2><p>{currentPuzzle.explanation}</p><button type="button" className="btn btn-primary" onClick={() => { setPuzzleDone(false); screen('training'); }}>COLLECT PROGRESS</button></div></div>}
        </>}

        {page === 'online' && <Suspense fallback={<p role="status">Loading private online arena…</p>}><PrivateOnline/></Suspense>}

        {page === 'history' && <><section className="heading-block"><p className="eyebrow">THE ARCHIVES</p><h1>Match <em>History.</em></h1><p>Recent results are stored locally in this browser only.</p></section>
          {history.length === 0 ? <div className="empty-state"><span>♜</span><h3>No matches yet</h3><p>Finish a game to build your legacy.</p><button type="button" className="btn btn-primary" onClick={() => screen('play')}>PLAY A MATCH</button></div> :
            <div className="history-list">{history.map(record => <article key={record.id} className="history-card"><span className="history-token">{record.result === 'draw' ? '½' : '♛'}</span><div><strong>{record.mode === 'computer' ? 'VS Computer' : 'Pass & Play'}</strong><small>{new Date(record.endedAt).toLocaleDateString()} · {record.moves} plies</small></div><span className="history-score">{shortResult(record.result)}</span><button type="button" onClick={() => { navigator.clipboard?.writeText(record.pgn).then(() => notify('PGN copied.')).catch(() => notify('Clipboard unavailable in this browser.')); }} aria-label="Copy game PGN">COPY PGN</button><button type="button" onClick={() => setReplayRecord(record)} aria-label="Replay saved game">REPLAY GAME</button></article>)}</div>}
        </>}

        {page === 'training' && <><section className="heading-block"><p className="eyebrow">THE ACADEMY</p><h1>Sharpen your <em>Mind.</em></h1><p>{solvedPuzzles.length} of {PUZZLES.length} original tactics solved. Progress is saved on this device.</p></section><div className="puzzle-list">{PUZZLES.map((puzzle, index) => <article className="puzzle-entry" key={puzzle.id}><div className="puzzle-number">{String(index + 1).padStart(2, '0')}</div><div><span className="eyebrow">{puzzle.level.toUpperCase()}{solvedPuzzles.includes(puzzle.id) ? ' · SOLVED' : ''}</span><h3>{puzzle.title}</h3><p>{puzzle.prompt}</p></div><button type="button" className="btn btn-small" onClick={() => start('puzzle', false, puzzle)}>{solvedPuzzles.includes(puzzle.id) ? 'REPLAY' : 'PLAY'}</button></article>)}</div><ReviewPractice/></>}

        {page === 'profile' && <><section className="heading-block"><p className="eyebrow">THE ROYAL PROFILE</p><h1>Your <em>Legacy.</em></h1></section><div className="profile-card"><div className="profile-crest">{initials(guest)}</div><h2>{guest}</h2><p>Local guest profile · No sign-in needed</p></div><div className="stats-grid"><div className="stat"><span>MATCHES</span><strong>{history.length}</strong></div><div className="stat"><span>TACTICS</span><strong>{solvedPuzzles.length}</strong></div><div className="stat"><span>ONLINE ELO</span><strong>—</strong></div></div><label className="form-label" htmlFor="playername">Display name</label><div className="name-row"><input id="playername" value={newName} maxLength={25} onChange={e => setNewName(e.target.value)}/><button type="button" className="btn btn-small" onClick={() => { const value = newName.trim(); if (value) { setGuest(value); notify('Display name saved locally.'); } }}>SAVE</button></div><section className="avatar-animation-entry"><h3>Royal Character Animation Studio</h3><p>Preview the supplied 43 humanoid animations; downloads only when opened.</p><button type="button" className="btn btn-secondary" onClick={() => setShowAvatarAnimations(v => !v)}>{showAvatarAnimations ? 'CLOSE' : 'OPEN'} ANIMATION STUDIO</button>{showAvatarAnimations && <Suspense fallback={<p>Loading 3D animation studio…</p>}><AnimationShowcase/></Suspense>}</section></>}

        {page === 'settings' && <><section className="heading-block"><p className="eyebrow">PREFERENCES</p><h1>Your <em>Kingdom.</em></h1></section><div className="setting-group"><label><span><strong>Flip board</strong><small>Show Black at the bottom</small></span><input type="checkbox" checked={settings.flipped} onChange={e => setSettings(p => ({ ...p, flipped: e.target.checked }))}/></label><label><span><strong>Reduce motion</strong><small>Disable ornamental effects</small></span><input type="checkbox" checked={settings.reducedMotion} onChange={e => setSettings(p => ({ ...p, reducedMotion: e.target.checked }))}/></label><label><span><strong>Legal move hints</strong><small>Highlight valid destinations</small></span><input type="checkbox" checked={settings.hints} onChange={e => setSettings(p => ({ ...p, hints: e.target.checked }))}/></label><label><span><strong>Premium 3D theme</strong><small>Choose one of the supplied chess sets</small></span><select value={settings.modelTheme || "deco"} onChange={e => setSettings(s => ({...s,modelTheme:e.target.value as ThreeTheme}))}><option value="deco">Art Deco</option><option value="bauhaus">Bauhaus</option><option value="scifi">Sci-fi</option><option value="egypt">Egyptian</option><option value="classic">ChessSet FBX</option></select></label><label><span><strong>Load supplied 3D library</strong><small>Use optimized installed assets; fall back if unavailable</small></span><input type="checkbox" checked={Boolean(settings.useLibraryAssets)} onChange={e => setSettings(s => ({...s,useLibraryAssets:e.target.checked}))}/></label></div><div className="disclaimer"><strong>Privacy</strong><p>Matches, preferences and guest name are stored locally on your device. No account, voice access, microphone permission, analytics or advertising SDK is included in this build.</p></div><button className="btn btn-secondary" type="button" onClick={() => screen('about')}>ABOUT & LICENSES</button></>}
        {page === 'about' && <><section className="heading-block"><p className="eyebrow">ABOUT THE PROJECT</p><h1>Built to <em>Play.</em></h1><p>Global Chess Ultimate · Royal UI Beta 0.3</p></section><div className="disclaimer"><h3>What's working</h3><p>Local chess, legal-move validation via chess.js, a basic computer opponent, five offline chess tactics, PGN replay and local heuristic analysis, the three-sheet responsive design system and installable PWA shell.</p><h3>What's not production-ready</h3><p>Public multiplayer, ranked ratings, full computer engine, monetization, production puzzle catalog, cloud accounts, Android AAB signing and device acceptance.</p><h3>Attribution</h3><p>chess.js is an open-source project licensed under BSD-2-Clause. Verify all dependency notices before distribution. This original UI is not affiliated with Miniclip or Chess Clash.</p></div></>}
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {royalTab('home','home','Home')}{royalTab('modes','sword','Play')}{royalTab('events','trophy','Events')}{royalTab('club','profile','Club')}{royalTab('shop','star','Store')}
      </nav>
    </div>
    {page!=='online'&&replayRecord && <Suspense fallback={<div role="status">Loading match replay…</div>}><ReplayViewer key={replayRecord.id+(replayAnalysis?'-analysis':'-replay')} record={replayRecord} startAnalysis={replayAnalysis} onClose={() => setReplayRecord(null)}/></Suspense>}
    {menu && <div className="modal-mask" onClick={() => setMenu(false)}><div className="action-sheet" role="dialog" aria-modal="true" aria-label="Match menu" onClick={e => e.stopPropagation()}><div className="sheet-heading"><h2>Game Paused</h2><button onClick={() => setMenu(false)} aria-label="Close menu"><Icon name="close" size={28}/></button></div><button type="button" className="royal-resume-action" onClick={()=>setMenu(false)}>▶ Resume Game</button><button type="button" onClick={() => { setMenu(false); undo(); }} disabled={!active || mode === 'puzzle'}>↶ Undo last move</button><button type="button" onClick={() => { setMenu(false); setSettings(p => ({ ...p, flipped: !p.flipped })); }}>⇅ Flip board</button><button type="button" onClick={saveAndExit}>▤ Save and exit</button><button type="button" onClick={()=>start(mode,clockEnabled,currentPuzzle,computerRef.current)}>↻ Restart match</button><button type="button" className="destructive" onClick={() => { if (mode === 'puzzle') saveAndExit(); else resign(); }}>{mode === 'puzzle' ? '↩ Exit puzzle' : '⚑ Resign match'}</button></div></div>}
    {drawDialog && <div className="modal-mask" onClick={()=>setDrawDialog(false)}>
      <section className="rv-resign-dialog royal-draw-dialog" role="alertdialog" aria-modal="true" aria-labelledby="royal-draw-title" onClick={e=>e.stopPropagation()}>
        <span className="rv-resign-emblem" aria-hidden="true">♛</span>
        <h2 id="royal-draw-title">Offer Draw?</h2>
        <p>In Pass &amp; Play, the other player must agree on this device. No online request is sent.</p>
        <div className="rv-resign-actions">
          <button type="button" autoFocus onClick={()=>setDrawDialog(false)}>DECLINE</button>
          <button type="button" onClick={confirmDraw}>ACCEPT DRAW</button>
        </div>
      </section>
    </div>}
    {resignDialog && <div className="modal-mask" onClick={() => setResignDialog(false)}>
      <section className="rv-resign-dialog" role="alertdialog" aria-modal="true" aria-labelledby="resign-dialog-title" aria-describedby="resign-dialog-desc" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Escape") setResignDialog(false); }}>
        <span className="rv-resign-emblem" aria-hidden="true">⚑</span>
        <h2 id="resign-dialog-title">Leave this match?</h2>
        <p id="resign-dialog-desc">Resigning ends the current match and records a loss for the side whose turn it is. You can still review the recorded moves.</p>
        <div className="rv-resign-actions">
          <button type="button" autoFocus onClick={() => setResignDialog(false)}>CANCEL</button>
          <button type="button" onClick={confirmResign}>RESIGN MATCH</button>
        </div>
      </section>
    </div>}
    {promotion && <div className="modal-mask"><div className="promotion-modal" role="dialog" aria-modal="true" aria-label="Choose a promotion piece"><h2>ROYAL PROMOTION</h2><p>Choose a piece</p><div className="promotion-options">{(['q','r','b','n'] as const).map(type => <button type="button" key={type} onClick={() => { const { from, to } = promotion; setPromotion(null); execute(from, to, type); }} aria-label={'Promote to ' + ({q:'queen',r:'rook',b:'bishop',n:'knight'}[type])}><img className="royal-promotion-piece" src={'/pieces/'+turn+'-'+type+'.svg'} alt="" /><small>{({q:'Queen',r:'Rook',b:'Bishop',n:'Knight'}[type])}</small></button>)}</div><button type="button" className="btn btn-secondary" onClick={()=>{setPromotion(null);setSelected(null);}}>CANCEL PROMOTION</button></div></div>}
  </div>;
}
