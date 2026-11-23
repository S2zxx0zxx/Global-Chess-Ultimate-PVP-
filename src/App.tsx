import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { chooseComputerMove, FILES, loadJSON, PIECE_GLYPHS, resultOf, saveJSON, shortResult, SQUARES, STORAGE_KEYS, type GameResult, type MatchRecord, type PlayMode } from './game';
import { PUZZLES, PUZZLE_PROGRESS_KEY, isPuzzleSolution, type Puzzle } from './academy';
import RoyalStudio, { type RoyalScreen } from './RoyalStudio';
import { newClock, advanceClock, displayClock } from './clock';

const ChessBoard3D = lazy(() => import('./ChessBoard3D'));
const AnimationShowcase = lazy(() => import('./AnimationShowcase'));
const ReplayViewer = lazy(() => import('./ReplayViewer'));
const PrivateOnline = lazy(() => import('./PrivateOnline'));

type ThreeTheme = 'deco' | 'bauhaus' | 'scifi' | 'egypt' | 'classic';
type Page = 'home' | 'play' | 'game' | 'history' | 'training' | 'profile' | 'settings' | 'about' | 'online' | 'studio';
type Promotion = { from: Square; to: Square };
type Settings = { flipped: boolean; reducedMotion: boolean; hints: boolean; modelTheme?: ThreeTheme; useLibraryAssets?: boolean };
type Snapshot = { fen: string; mode: PlayMode; pgn: string; active: boolean; seconds: [number, number]; timed?: boolean; remainingMs?: [number, number] };
const DEFAULT_SETTINGS: Settings = { flipped: false, reducedMotion: false, hints: true };
const initials = (text: string) => text.trim().slice(0, 2).toUpperCase() || 'GC';
function randomGuest() { return 'Royal Guest ' + Math.floor(1000 + Math.random() * 9000); }
function royalSymbol(piece: string, color: 'w' | 'b') { return PIECE_GLYPHS[color][piece] ?? ''; }

const Icon = ({ name, size = 20 }: { name: string; size?: number }) => {
  const icons: Record<string, string> = {
    crown: '♛', chess: '♞', trophy: '♜', back: '←', menu: '☰',
    home: '⌂', sword: '⚔', book: '◈', profile: '♙',
    settings: '⚙', time: '◷', star: '✦', arrow: '›',
    close: '×', undo: '↶', flip: '⇅', check: '✓', history: '▤',
    pause: 'Ⅱ', play: '▶', flag: '⚑', alert: '!', lock: '◇',
  };
  return <span aria-hidden="true" style={{ fontSize: size, lineHeight: 1 }} className="icon">{icons[name] ?? '✦'}</span>;
};

export default function App() {
  const game = useRef(new Chess());
  const clockRef = useRef(newClock(Date.now()));
  const endedRef = useRef(false);
  const stored = useRef(loadJSON<Snapshot | null>(STORAGE_KEYS.lastMatch, null));
  const [page, setPage] = useState<Page>(() => new URLSearchParams(location.search).has('room') ? 'online' : (loadJSON<{completedIntro?:boolean}>('gcu.royal-ui.v1',{}).completedIntro ? 'home' : 'studio'));
  const [studioScreen, setStudioScreen] = useState<RoyalScreen>('splash');
  const [boardSkin, setBoardSkin] = useState<'wood'|'ivory'|'onyx'|'stone'>(() => loadJSON<{skin?:'wood'|'ivory'|'onyx'|'stone'}>('gcu.royal-ui.v1',{}).skin || 'wood');
  const [mode, setMode] = useState<PlayMode>('local');
  const [view3D, setView3D] = useState(false);
  const [showAvatarAnimations, setShowAvatarAnimations] = useState(false);
  const [replayRecord, setReplayRecord] = useState<MatchRecord | null>(null);
  const [fen, setFen] = useState(game.current.fen());
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [settings, setSettings] = useState<Settings>(() => loadJSON(STORAGE_KEYS.settings, DEFAULT_SETTINGS));
  const [guest, setGuest] = useState(() => loadJSON(STORAGE_KEYS.guest, randomGuest()));
  const [history, setHistory] = useState<MatchRecord[]>(() => loadJSON(STORAGE_KEYS.history, []));
  const [seconds, setSeconds] = useState<[number, number]>([600, 600]);
  const [endResult, setEndResult] = useState<GameResult | null>(null);
  const [message, setMessage] = useState('');
  const [menu, setMenu] = useState(false);
  const [puzzleDone, setPuzzleDone] = useState(false);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle>(PUZZLES[0]);
  const [solvedPuzzles, setSolvedPuzzles] = useState<string[]>(() => loadJSON<string[]>(PUZZLE_PROGRESS_KEY, []));
  const [newName, setNewName] = useState(guest);
  const [clockEnabled, setClockEnabled] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [lastMove, setLastMove] = useState<[Square, Square] | null>(null);

  const turn = game.current.turn();
  const legal = useMemo(() => selected ? game.current.moves({ square: selected, verbose: true }).map(m => m.to) : [], [selected, fen]);
  const board = game.current.board();
  const inCheck = game.current.isCheck();
  const gameOver = game.current.isGameOver();

  const notify = (text: string) => { setMessage(text); };
  const persist = (currentMode: PlayMode, currentActive: boolean, currentSeconds: [number, number], timed = clockEnabled) => {
    const next: Snapshot = { fen: game.current.fen(), pgn: game.current.pgn(), mode: currentMode, active: currentActive, seconds: currentSeconds, timed, remainingMs: [...clockRef.current.remainingMs] };
    stored.current = next;
    if (!saveJSON(STORAGE_KEYS.lastMatch, next)) setStorageWarning(true);
  };
  const recordEnd = (outcome: GameResult, currentMode: PlayMode) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const item: MatchRecord = { id, endedAt: new Date().toISOString(), mode: currentMode, result: outcome, pgn: game.current.pgn(), moves: game.current.history().length };
    setHistory(old => {
      const next = [item, ...old].slice(0, 100);
      if (!saveJSON(STORAGE_KEYS.history, next)) setStorageWarning(true);
      return next;
    });
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
  const start = (nextMode: PlayMode, timed = false, puzzle: Puzzle = currentPuzzle) => {
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
    setPage('game');
    setMenu(false);
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
      game.current = restored;
      setFen(restored.fen());
      setMode(old.mode);
      setActive(true);
      setSeconds(old.seconds || [600, 600]);
      const ms = old.remainingMs || [old.seconds[0] * 1000, old.seconds[1] * 1000];
      clockRef.current = { remainingMs: [...ms], turn: restored.turn(), lastAt: Date.now() };
      endedRef.current = false;
      setClockEnabled(Boolean(old.timed));
      setLastMove(null);
      setPage('game');
    } catch { notify('Saved game could not be restored. Your other games are untouched.'); }
  };

  const execute = (from: Square, to: Square, promote: string = 'q') => {
    if (!active || endResult || (mode === 'computer' && turn === 'b')) return;
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
    if (!active || endResult || (mode === 'computer' && turn === 'b') || puzzleDone) return;
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

  // Computer turns are intentionally single-worker-free and use a bounded deterministic
  // shallow material heuristic. This is not an engine-strength or anti-cheat claim.
  useEffect(() => {
    if (page !== 'game' || mode !== 'computer' || !active || turn !== 'b' || endResult || gameOver) return;
    const timer = window.setTimeout(() => {
      const next = chooseComputerMove(game.current);
      if (next) {
        if (clockEnabled) {
          const ticked = advanceClock(clockRef.current, Date.now());
          clockRef.current = ticked.state;
          if (ticked.flagged) { recordEnd('timeout-black', 'computer'); return; }
        }
        game.current.move(next);
        clockRef.current = { ...clockRef.current, turn: game.current.turn(), lastAt: Date.now() };
        refresh('computer');
      }
    }, 480);
    return () => window.clearTimeout(timer);
    // fen is required: the new position triggers one computer turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, mode, active, page, endResult, gameOver, turn]);

  // Local clocks are wall-time reconciled to avoid drift after a throttled/background tab.
  // Network/rated clocks must still use a server-authoritative clock.
  useEffect(() => {
    if (!clockEnabled || !active || page !== 'game' || endResult || mode === 'puzzle') return;
    const tick = () => {
      const current = advanceClock(clockRef.current, Date.now());
      clockRef.current = current.state;
      setSeconds([Math.ceil(current.state.remainingMs[0] / 1000), Math.ceil(current.state.remainingMs[1] / 1000)]);
      if (current.flagged) recordEnd(current.flagged === 'w' ? 'timeout-white' : 'timeout-black', mode);
    };
    const timer = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockEnabled, active, page, mode, endResult]);

  useEffect(() => { if (!saveJSON(STORAGE_KEYS.settings, settings)) setStorageWarning(true); }, [settings]);
  useEffect(() => { if (!saveJSON(STORAGE_KEYS.guest, guest)) setStorageWarning(true); }, [guest]);

  const undo = () => {
    if (!active || mode === 'puzzle') return;
    const rewind = mode === 'computer' && game.current.turn() === 'w' ? 2 : 1;
    let changed = false;
    for (let i = 0; i < rewind; i++) changed = Boolean(game.current.undo()) || changed;
    if (changed) { clockRef.current = { ...clockRef.current, turn: game.current.turn(), lastAt: Date.now() }; setEndResult(null); refresh(mode); }
  };
  const saveAndExit = () => {
    if (clockEnabled && active) clockRef.current = advanceClock(clockRef.current, Date.now()).state;
    persist(mode, active, seconds);
    setMenu(false);
    setPage('home');
  };
  const abandon = () => { setMenu(false); if (active && mode !== 'puzzle') recordEnd(turn === 'w' ? 'black' : 'white', mode); setActive(false); setPage('home'); };
  const formatTime = (secs: number) => displayClock(secs * 1000);
  const labelResult = (result: GameResult) => result === 'draw' ? 'A royal draw' : result.startsWith('timeout') ? 'Time expired' : result === 'white' ? 'White triumphs' : 'Black triumphs';

  const screen = (target: Page) => { setPage(target); setMenu(false); setMessage(''); };
  const openRoyal = (target: RoyalScreen) => {
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
        <button type="button" className="top-avatar" onClick={() => screen('profile')} aria-label="Open profile">{initials(guest)}</button>
      </header>

      {storageWarning && <div role="alert" className="notice warn">Private mode or browser storage prevented saving. This session may not persist.</div>}
      {message && <div role="status" className="notice"><Icon name="star" size={15}/>{message}<button type="button" onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}

      <main id="main">
        {page === 'home' && stored.current?.active && <button type="button" className="resume-banner" onClick={resume}><Icon name="play"/> RESUME SAVED MATCH <Icon name="arrow"/></button>}
        {(page === 'home' || page === 'play' || page === 'studio') && <RoyalStudio
          screen={page === 'home' ? 'home' : page === 'play' ? 'modes' : studioScreen}
          navigate={openRoyal}
          openPage={screen}
          begin={(nextMode,timed) => start(nextMode,timed)}
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
          <div className="game-heading">
            <button className="icon-button" type="button" onClick={saveAndExit} aria-label="Back to home"><Icon name="back"/></button>
            <div><small>{mode === 'puzzle' ? 'ROYAL TRAINING' : mode === 'computer' ? 'COMPUTER DUEL' : 'CLASSIC CHESS'}</small><strong>{mode === 'puzzle' ? 'Master the Tactic' : 'The Royal Board'}</strong></div>
            <button className="icon-button" type="button" onClick={() => setMenu(true)} aria-label="Open game menu"><Icon name="menu"/></button>
          </div>

          <div className="player-strip opponent"><span className="player-shield">{mode === 'computer' ? '♞' : 'B'}</span><div><strong>{mode === 'computer' ? 'Royal Computer' : 'Black Monarch'}</strong><small>{turn === 'b' ? '● To move' : 'Waiting'}</small></div><span className={'clock ' + (turn === 'b' ? 'running' : '')}>{mode === 'puzzle' ? '—' : clockEnabled ? formatTime(seconds[1]) : '∞'}</span></div>
          <div className="render-switch" role="group" aria-label="Board display mode"><button type="button" className={!view3D ? "active" : ""} onClick={() => setView3D(false)} aria-pressed={!view3D}>2D BOARD</button><button type="button" className={view3D ? "active" : ""} onClick={() => setView3D(true)} aria-pressed={view3D}>3D BOARD</button></div>
          {view3D ? <Suspense fallback={<div className="board3d-loading" role="status">Loading 3D renderer…</div>}><ChessBoard3D fen={fen} selected={selected} legal={settings.hints ? legal : []} lastMove={lastMove} theme={settings.modelTheme || "deco"} useLibraryAssets={Boolean(settings.useLibraryAssets)} flipped={settings.flipped} reducedMotion={settings.reducedMotion} onSquare={onSquare}/></Suspense> : <div className="board-surround">
            <div className="board" role="grid" aria-label="Chess board. Select a piece then a destination.">
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
                return <button type="button" role="gridcell" aria-selected={isSelected} key={square} onClick={() => onSquare(square)} className={'square ' + (light ? 'light' : 'dark') + (isSelected ? ' selected' : '') + (isLast ? ' last-move' : '') + (checkingKing ? ' in-check' : '')} aria-label={square + (piece ? ': ' + (piece.color === 'w' ? 'White ' : 'Black ') + piece.type : ': empty') }>
                  {c === 0 && <span className="rank-label">{8 - row}</span>}
                  {r === 7 && <span className="file-label">{FILES[col]}</span>}
                  {piece && <img alt="" draggable={false} className="piece-img" src={'/pieces/' + piece.color + '-' + piece.type + '.svg'} />}
                  {isLegal && <span className={piece ? 'legal-capture' : 'legal-dot'} />}
                </button>;
              })}
            </div>
          </div>}
          <div className="player-strip self"><span className="player-shield light-shield">{mode === 'puzzle' ? '♙' : 'W'}</span><div><strong>{mode === 'puzzle' ? 'Royal Scholar' : guest}</strong><small>{turn === 'w' ? '● To move' : 'Waiting'}</small></div><span className={'clock ' + (turn === 'w' ? 'running' : '')}>{mode === 'puzzle' ? '—' : clockEnabled ? formatTime(seconds[0]) : '∞'}</span></div>
          <div className="board-status">{puzzleDone ? '✦ TACTIC SOLVED ✦' : endResult ? labelResult(endResult) : gameOver ? 'Match finished' : inCheck ? 'CHECK — defend your king' : mode === 'puzzle' ? currentPuzzle.prompt : turn === 'w' ? 'White to move' : 'Black to move'}</div>
          <div className="game-actions">
            <button type="button" onClick={undo} disabled={!active || mode === 'puzzle' || game.current.history().length === 0}><Icon name="undo"/> Undo</button>
            <button type="button" onClick={() => setSettings(old => ({ ...old, flipped: !old.flipped }))}><Icon name="flip"/> Flip</button>
            <button type="button" onClick={() => setMenu(true)}><Icon name="menu"/> Menu</button>
          </div>
          <div className="moves-panel"><h3>MOVE RECORD <small>{game.current.history().length} plies</small></h3><div className="move-list">{game.current.history().length ? game.current.history().map((m, i) => <span key={i}><small>{i % 2 === 0 ? Math.floor(i / 2) + 1 + '.' : ' '}</small>{m}</span>) : <p>Match begins with your first move.</p>}</div></div>
          {endResult && <div className="result-overlay" role="alertdialog" aria-modal="true" aria-label="Match result"><div className="result-card"><span className="result-crown">♛</span><p className="eyebrow">GAME COMPLETE</p><h2>{labelResult(endResult)}</h2><p>{shortResult(endResult)}</p><button type="button" className="btn btn-primary" onClick={() => start(mode === 'puzzle' ? 'local' : mode, clockEnabled)}>PLAY AGAIN</button><button type="button" className="btn btn-secondary" onClick={saveAndExit}>BACK TO LOBBY</button></div></div>}
          {puzzleDone && <div className="result-overlay" role="alertdialog" aria-modal="true" aria-label="Puzzle completed"><div className="result-card"><span className="result-crown">✦</span><h2>Royal Tactic Solved</h2><p>{currentPuzzle.explanation}</p><button type="button" className="btn btn-primary" onClick={() => { setPuzzleDone(false); screen('training'); }}>COLLECT PROGRESS</button></div></div>}
        </>}

        {page === 'online' && <Suspense fallback={<p role="status">Loading private online arena…</p>}><PrivateOnline/></Suspense>}

        {page === 'history' && <><section className="heading-block"><p className="eyebrow">THE ARCHIVES</p><h1>Match <em>History.</em></h1><p>Recent results are stored locally in this browser only.</p></section>
          {history.length === 0 ? <div className="empty-state"><span>♜</span><h3>No matches yet</h3><p>Finish a game to build your legacy.</p><button type="button" className="btn btn-primary" onClick={() => screen('play')}>PLAY A MATCH</button></div> :
            <div className="history-list">{history.map(record => <article key={record.id} className="history-card"><span className="history-token">{record.result === 'draw' ? '½' : '♛'}</span><div><strong>{record.mode === 'computer' ? 'VS Computer' : 'Pass & Play'}</strong><small>{new Date(record.endedAt).toLocaleDateString()} · {record.moves} plies</small></div><span className="history-score">{shortResult(record.result)}</span><button type="button" onClick={() => { navigator.clipboard?.writeText(record.pgn).then(() => notify('PGN copied.')).catch(() => notify('Clipboard unavailable in this browser.')); }} aria-label="Copy game PGN">COPY PGN</button><button type="button" onClick={() => setReplayRecord(record)} aria-label="Replay saved game">REPLAY GAME</button></article>)}</div>}
        </>}

        {page === 'training' && <><section className="heading-block"><p className="eyebrow">THE ACADEMY</p><h1>Sharpen your <em>Mind.</em></h1><p>{solvedPuzzles.length} of {PUZZLES.length} original tactics solved. Progress is saved on this device.</p></section><div className="puzzle-list">{PUZZLES.map((puzzle, index) => <article className="puzzle-entry" key={puzzle.id}><div className="puzzle-number">{String(index + 1).padStart(2, '0')}</div><div><span className="eyebrow">{puzzle.level.toUpperCase()}{solvedPuzzles.includes(puzzle.id) ? ' · SOLVED' : ''}</span><h3>{puzzle.title}</h3><p>{puzzle.prompt}</p></div><button type="button" className="btn btn-small" onClick={() => start('puzzle', false, puzzle)}>{solvedPuzzles.includes(puzzle.id) ? 'REPLAY' : 'PLAY'}</button></article>)}</div></>}

        {page === 'profile' && <><section className="heading-block"><p className="eyebrow">THE ROYAL PROFILE</p><h1>Your <em>Legacy.</em></h1></section><div className="profile-card"><div className="profile-crest">{initials(guest)}</div><h2>{guest}</h2><p>Local guest profile · No sign-in needed</p></div><div className="stats-grid"><div className="stat"><span>MATCHES</span><strong>{history.length}</strong></div><div className="stat"><span>TACTICS</span><strong>{solvedPuzzles.length}</strong></div><div className="stat"><span>ONLINE ELO</span><strong>—</strong></div></div><label className="form-label" htmlFor="playername">Display name</label><div className="name-row"><input id="playername" value={newName} maxLength={25} onChange={e => setNewName(e.target.value)}/><button type="button" className="btn btn-small" onClick={() => { const value = newName.trim(); if (value) { setGuest(value); notify('Display name saved locally.'); } }}>SAVE</button></div><section className="avatar-animation-entry"><h3>Royal Character Animation Studio</h3><p>Preview the supplied 43 humanoid animations; downloads only when opened.</p><button type="button" className="btn btn-secondary" onClick={() => setShowAvatarAnimations(v => !v)}>{showAvatarAnimations ? 'CLOSE' : 'OPEN'} ANIMATION STUDIO</button>{showAvatarAnimations && <Suspense fallback={<p>Loading 3D animation studio…</p>}><AnimationShowcase/></Suspense>}</section></>}

        {page === 'settings' && <><section className="heading-block"><p className="eyebrow">PREFERENCES</p><h1>Your <em>Kingdom.</em></h1></section><div className="setting-group"><label><span><strong>Flip board</strong><small>Show Black at the bottom</small></span><input type="checkbox" checked={settings.flipped} onChange={e => setSettings(p => ({ ...p, flipped: e.target.checked }))}/></label><label><span><strong>Reduce motion</strong><small>Disable ornamental effects</small></span><input type="checkbox" checked={settings.reducedMotion} onChange={e => setSettings(p => ({ ...p, reducedMotion: e.target.checked }))}/></label><label><span><strong>Legal move hints</strong><small>Highlight valid destinations</small></span><input type="checkbox" checked={settings.hints} onChange={e => setSettings(p => ({ ...p, hints: e.target.checked }))}/></label><label><span><strong>Premium 3D theme</strong><small>Choose one of the supplied chess sets</small></span><select value={settings.modelTheme || "deco"} onChange={e => setSettings(s => ({...s,modelTheme:e.target.value as ThreeTheme}))}><option value="deco">Art Deco</option><option value="bauhaus">Bauhaus</option><option value="scifi">Sci-fi</option><option value="egypt">Egyptian</option><option value="classic">ChessSet FBX</option></select></label><label><span><strong>Load supplied 3D library</strong><small>Use optimized installed assets; fall back if unavailable</small></span><input type="checkbox" checked={Boolean(settings.useLibraryAssets)} onChange={e => setSettings(s => ({...s,useLibraryAssets:e.target.checked}))}/></label></div><div className="disclaimer"><strong>Privacy</strong><p>Matches, preferences and guest name are stored locally on your device. No account, voice access, microphone permission, analytics or advertising SDK is included in this build.</p></div><button className="btn btn-secondary" type="button" onClick={() => screen('about')}>ABOUT & LICENSES</button></>}
        {page === 'about' && <><section className="heading-block"><p className="eyebrow">ABOUT THE PROJECT</p><h1>Built to <em>Play.</em></h1><p>Global Chess Ultimate · Prototype 0.1.0</p></section><div className="disclaimer"><h3>What's working</h3><p>Local chess, legal-move validation via chess.js, a basic computer opponent, one tactics position, PGN history export, original responsive visual design and installable PWA shell.</p><h3>What's not production-ready</h3><p>Public multiplayer, ranked ratings, full computer engine, monetization, production puzzle catalog, cloud accounts, Android AAB signing and device acceptance.</p><h3>Attribution</h3><p>chess.js is an open-source project licensed under BSD-2-Clause. Verify all dependency notices before distribution. This original UI is not affiliated with Miniclip or Chess Clash.</p></div></>}
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {royalTab('home','home','Home')}{royalTab('modes','sword','Play')}{royalTab('events','trophy','Events')}{royalTab('club','profile','Club')}{royalTab('shop','star','Store')}
      </nav>
    </div>
    {replayRecord && <Suspense fallback={<div role="status">Loading match replay…</div>}><ReplayViewer key={replayRecord.id} record={replayRecord} onClose={() => setReplayRecord(null)}/></Suspense>}
    {menu && <div className="modal-mask" onClick={() => setMenu(false)}><div className="action-sheet" role="dialog" aria-modal="true" aria-label="Match menu" onClick={e => e.stopPropagation()}><div className="sheet-heading"><h2>Match Menu</h2><button onClick={() => setMenu(false)} aria-label="Close menu"><Icon name="close" size={28}/></button></div><button type="button" onClick={() => { setMenu(false); undo(); }} disabled={!active || mode === 'puzzle'}>↶ Undo last move</button><button type="button" onClick={() => { setMenu(false); setSettings(p => ({ ...p, flipped: !p.flipped })); }}>⇅ Flip board</button><button type="button" onClick={saveAndExit}>▤ Save and exit</button><button type="button" className="destructive" onClick={() => { if (window.confirm('Resign or leave this match?')) abandon(); }}>⚑ Resign / abandon</button></div></div>}
    {promotion && <div className="modal-mask"><div className="promotion-modal" role="dialog" aria-modal="true" aria-label="Choose a promotion piece"><h2>ROYAL PROMOTION</h2><p>Choose a piece</p><div className="promotion-options">{(['q','r','b','n'] as const).map(type => <button type="button" key={type} onClick={() => { const { from, to } = promotion; setPromotion(null); execute(from, to, type); }} aria-label={'Promote to ' + ({q:'queen',r:'rook',b:'bishop',n:'knight'}[type])}>{royalSymbol(type, turn)}</button>)}</div></div></div>}
  </div>;
}
