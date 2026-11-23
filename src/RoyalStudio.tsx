import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MatchRecord, PlayMode } from './game';
import { loadJSON, saveJSON } from './game';

export const ROYAL_SCREEN_GROUPS = {
  journey: ['splash', 'welcome', 'onboard-play', 'onboard-learn', 'sign-in', 'register'],
  arena: ['home', 'modes', 'match-setup', 'matchmaking', 'gameplay', 'match-result', 'review'],
  competition: ['tournaments', 'tournament-detail', 'bracket', 'daily', 'missions', 'season', 'events', 'news'],
  community: ['friends', 'player-search', 'player-card', 'club', 'invites', 'leaderboard'],
  progression: ['profile', 'stats', 'achievements', 'shop', 'inventory', 'customize', 'membership', 'checkout'],
  preferences: ['settings', 'appearance', 'sound', 'language', 'privacy', 'accessibility', 'help', 'feedback', 'offline', 'empty-state', 'alerts', 'about', 'account'],
} as const;
export type RoyalScreen = typeof ROYAL_SCREEN_GROUPS[keyof typeof ROYAL_SCREEN_GROUPS][number];
export const ROYAL_SCREEN_COUNT = Object.values(ROYAL_SCREEN_GROUPS).reduce((sum, group) => sum + group.length, 0);
type RealPage = 'home' | 'play' | 'game' | 'training' | 'history' | 'profile' | 'settings' | 'online' | 'about';
type Props = {
  screen: RoyalScreen;
  navigate: (screen: RoyalScreen) => void;
  openPage: (page: RealPage) => void;
  begin: (mode: PlayMode, timed: boolean) => void;
  guest: string;
  saveGuest: (value: string) => void;
  history: MatchRecord[];
  solved: string[];
  reducedMotion: boolean;
  hints: boolean;
  flipped: boolean;
  toggleSetting: (key: 'reducedMotion' | 'hints' | 'flipped', value: boolean) => void;
  modelTheme: 'deco' | 'bauhaus' | 'scifi' | 'egypt' | 'classic';
  setModelTheme: (theme: 'deco' | 'bauhaus' | 'scifi' | 'egypt' | 'classic') => void;
  onSkinChange: (skin: 'wood' | 'ivory' | 'onyx' | 'stone') => void;
};
const BUTTONS = {
  home: '⌂', modes: '♘', events: '♛', club: '♟', shop: '♜', back: '‹',
  friends: '♙', leaderboard: '♕', achievements: '✦', notifications: '♧', settings: '⚙',
  missions: '▣', training: '♗', play: '▶', news: '▤', search: '⌕', profile: '♔',
  cup: '♜', star: '★', info: 'ⓘ', review: '▤', shield: '♧', gift: '❖',
};
type SymbolName = keyof typeof BUTTONS;
const SN = ({name}: {name: SymbolName}) => <span className="rv-symbol" aria-hidden="true">{BUTTONS[name]}</span>;
const K = ({children}: {children: ReactNode}) => <span className="rv-kicker">{children}</span>;
const Header = ({eyebrow, title, subtitle, icon}: {eyebrow: string; title: string; subtitle?: string; icon?: SymbolName}) => <header className="rv-page-head">
  {icon && <span className="rv-page-emblem"><SN name={icon}/></span>}
  <K>{eyebrow}</K><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}
</header>;
const Action = ({children, onClick, secondary=false, disabled=false}: {children: ReactNode; onClick:()=>void; secondary?:boolean; disabled?:boolean}) =>
  <button type="button" disabled={disabled} onClick={onClick} className={'rv-action'+(secondary?' rv-outline':'')}>{children}</button>;
const Tile = ({icon, title, detail, onClick, trailing}: {icon: SymbolName;title:string;detail:string;onClick:()=>void;trailing?:string}) =>
  <button type="button" className="rv-tile" onClick={onClick}><span className="rv-tile-icon"><SN name={icon}/></span><span className="rv-tile-copy"><strong>{title}</strong><small>{detail}</small></span><span className="rv-tile-trailing">{trailing || '›'}</span></button>;
const Section = ({title, children, note}: {title:string;children:ReactNode;note?:string})=><section className="rv-section"><div className="rv-section-heading"><h2>{title}</h2>{note&&<small>{note}</small>}</div>{children}</section>;
const Empty = ({symbol, title, text, children}: {symbol:SymbolName;title:string;text:string;children?:ReactNode})=>
  <div className="rv-empty"><span><SN name={symbol}/></span><h3>{title}</h3><p>{text}</p>{children}</div>;
const Metric = ({label, value}: {label:string;value:string|number})=><div className="rv-metric"><small>{label}</small><strong>{value}</strong></div>;
const Bar = ({value, total}: {value:number;total:number})=><div className="rv-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(value,total)}><span style={{width:(total?Math.min(100,100*value/total):0)+'%'}}/></div>;
const SKINS=[
  {id:'wood',label:'Classic Wood',note:'Warm original board · available'},
  {id:'ivory',label:'Royal Ivory',note:'Ivory and walnut · available'},
  {id:'onyx',label:'Royal Ebony',note:'Obsidian and stone · available'},
  {id:'stone',label:'Stone Palace',note:'Soft stone board · available'},
] as const;
const MODELS=[
  {id:'deco',name:'Art Deco',notes:'High-detail optional 3D library'},
  {id:'bauhaus',name:'Bauhaus',notes:'Geometric optional 3D library'},
  {id:'scifi',name:'Sci-fi',notes:'Futurist optional 3D library'},
  {id:'egypt',name:'Egyptian',notes:'Historical optional 3D library'},
  {id:'classic',name:'ChessSet Classic',notes:'FBX and PBR materials'},
] as const;
const STORE_KEY = 'gcu.royal-ui.v1';
type LocalUi = {skin:typeof SKINS[number]['id'];haptics:boolean;contrast:boolean;readIds:string[];completedIntro:boolean};
const defaultLocal:LocalUi={skin:'wood',haptics:false,contrast:false,readIds:[],completedIntro:false};
function loadUi():LocalUi {const value=loadJSON<Partial<LocalUi>>(STORE_KEY,{});return {...defaultLocal,...value};}
const descriptions: Record<RoyalScreen,string>={
  splash:'Branded launch experience', welcome:'Welcome to the chess kingdom',
  'onboard-play':'Online and offline ways to play','onboard-learn':'Learn through real tactics',
  'sign-in':'Access options','register':'New local profile',
  home:'Home dashboard', modes:'Chess modes','match-setup':'Match configuration',matchmaking:'Online matchmaking',
  gameplay:'Real 2D and 3D game', 'match-result':'Saved result','review':'Saved match replay',
  tournaments:'Tournaments', 'tournament-detail':'Tournament details',bracket:'Knockout bracket',
  daily:'Daily challenge', missions:'Missions',season:'Seasonal events',events:'Events hub',news:'Announcements',
  friends:'Friends list','player-search':'Search for players','player-card':'Other player profile',
  club:'Clubs and community',invites:'Invitations',leaderboard:'Leaderboards',
  profile:'Player identity',stats:'Activity statistics',achievements:'Achievements',
  shop:'Shop and cosmetics',inventory:'Owned cosmetics',customize:'Customize game',
  membership:'Optional premium account',checkout:'Purchase information',
  settings:'Application preferences',appearance:'Appearance choices',sound:'Sound and haptics',language:'Language',
  privacy:'Privacy and security',accessibility:'Accessibility',help:'Help center',feedback:'Feedback',
  offline:'Offline mode','empty-state':'Empty states',alerts:'Alerts and confirmations',
  about:'About app',account:'Account settings',
};
export { descriptions as ROYAL_SCREEN_DESCRIPTIONS };

export default function RoyalStudio({screen,navigate,openPage,begin,guest,saveGuest,history,solved,reducedMotion,hints,flipped,toggleSetting,modelTheme,setModelTheme,onSkinChange}:Props) {
  const [local,setLocal]=useState<LocalUi>(loadUi);
  const [draftName,setDraftName]=useState(guest);
  const [feedback,setFeedback]=useState('');
  const [lookup,setLookup]=useState('');
  const [mode,setMode]=useState<'local'|'computer'|'online'>('local');
  const [minutes,setMinutes]=useState<'untimed'|'10'>('untimed');
  const [leaderboardTab,setLeaderboardTab]=useState<'global'|'country'|'friends'>('global');
  const [tournamentTab,setTournamentTab]=useState<'all'|'live'|'upcoming'|'finished'>('all');
  const [missionTab,setMissionTab]=useState<'daily'|'weekly'|'achievements'>('daily');
  const [toast,setToast]=useState('');
  const save=(next:LocalUi)=>{setLocal(next);saveJSON(STORE_KEY,next);};
  const setSkin=(skin:LocalUi['skin'])=>{save({...local,skin});onSkinChange(skin);setToast('Board appearance saved. New matches use the selected skin.');};
  const doneIntro=()=>{save({...local,completedIntro:true});navigate('home');};
  const moves=history.reduce((acc,h)=>acc+h.moves,0);
  const computerWins=history.filter(h=>h.mode==='computer'&&h.result==='white').length;
  const achievementList=[
    {name:'First Match',desc:'Complete your first chess game',value:history.length,total:1},
    {name:'Win Streak',desc:'Win three computer games',value:computerWins,total:3},
    {name:'Puzzle Solver',desc:'Solve one tactics challenge',value:solved.length,total:1},
    {name:'Tactics Scholar',desc:'Complete all five offline puzzles',value:solved.length,total:5},
    {name:'Rapid Master',desc:'Finish ten matches',value:history.length,total:10},
  ];
  const missionList=[
    {name:'Play Three Games',desc:'Complete three games in this browser',value:history.length,total:3},
    {name:'Beat the Computer',desc:'Win a computer duel',value:computerWins,total:1},
    {name:'Solve a Tactic',desc:'Complete any training puzzle',value:solved.length,total:1},
  ];
  const events=useMemo(()=>[
    ...history.slice(0,10).map(h=>({id:'game-'+h.id,kind:'Match recorded',label:h.mode==='computer'?'Computer duel finished':'Local game finished',date:h.endedAt})),
    ...solved.map(id=>({id:'puzzle-'+id,kind:'Tactic completed',label:id.replace(/-/g,' '),date:''})),
  ],[history,solved]);
  const unread=events.filter(event=>!local.readIds.includes(event.id)).length;
  const navigateTo=(page:RoyalScreen)=>{setToast('');navigate(page);};
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),5500);return()=>clearTimeout(t);}},[toast]);
  const useHaptics=()=>{if(local.haptics&&'vibrate' in navigator)navigator.vibrate(15);};
  const start=()=>{useHaptics();if(mode==='online')openPage('online');else begin(mode,minutes==='10'&&mode==='local');};
  const link=(name:RoyalScreen, icon:SymbolName, label:string, detail:string)=> <Tile title={label} detail={detail} icon={icon} onClick={()=>navigateTo(name)}/>;
  const renderMissions=(items=missionList)=><div className="rv-list">{items.map(item=><article key={item.name} className="rv-progress-card"><div className="rv-progress-copy"><strong>{item.name}</strong><span>{Math.min(item.value,item.total)}/{item.total}</span></div><p>{item.desc}</p><Bar value={item.value} total={item.total}/>{item.value>=item.total&&<small className="rv-complete">✓ Completed from real local activity</small>}</article>)}</div>;
  const renderSkins=()=> <div className="rv-grid rv-skins">{SKINS.map(skin=><button type="button" className={'rv-skin'+(local.skin===skin.id?' selected':'')} key={skin.id} onClick={()=>setSkin(skin.id)} aria-pressed={local.skin===skin.id}>
    <span className={'rv-skin-preview rv-skin-'+skin.id}><span className="rv-mini-chess">♜ ♞ ♛ ♚</span></span><strong>{skin.label}</strong><small>{local.skin===skin.id?'✓ Selected':'Apply'}</small>
  </button>)}</div>;
  const renderModels=()=> <div className="rv-grid rv-skins">{MODELS.map(item=><button type="button" className={'rv-model'+(modelTheme===item.id?' selected':'')} key={item.id} onClick={()=>{setModelTheme(item.id);setToast('3D style selected. Available models load on demand when 3D board is enabled.');}}>
    <span className="rv-model-knight"><img src="/pieces/w-n.svg" alt=""/></span><strong>{item.name}</strong><small>{modelTheme===item.id?'✓ Selected':'Select style'}</small>
  </button>)}</div>;
  const navigateMain=(page:RoyalScreen)=>()=>navigateTo(page);
  const actionFeedback=()=>{if(!feedback.trim()){setToast('Write your feedback first.');return;}navigator.clipboard?.writeText(feedback).then(()=>setToast('Feedback copied. No message was sent.')).catch(()=>setToast('Copy unavailable. Select and copy your feedback manually.'));};
  const accountSave=()=>{const next=draftName.trim();if(next){saveGuest(next);setToast('Local display name saved on this device.');}else setToast('Enter a display name.');};
  const resetData=()=>{if(!window.confirm('Delete local chess history, puzzles, profile and preferences from this browser? This cannot be undone.'))return;['gcu.guest.v1','gcu.lastMatch.v1','gcu.history.v1','gcu.settings.v1','gcu.puzzles.solved.v1',STORE_KEY,'gcu.private-room.v1'].forEach(key=>{try{localStorage.removeItem(key);sessionStorage.removeItem(key);}catch{}});window.location.reload();};

  let content:ReactNode=null;
  switch(screen) {
    case 'splash':
      content=<div className="rv-splash"><div className="rv-crown">♛</div><div className="rv-splash-figure"><img src="/pieces/w-k.svg" alt="Original Global Chess Ultimate king piece"/></div><K>PREMIUM CHESS EXPERIENCE</K><h1>GLOBAL CHESS<br/><span>ULTIMATE</span></h1><p>Think · Play · Improve</p><Action onClick={()=>navigateTo('welcome')}>ENTER THE KINGDOM ›</Action><small>No account needed to play</small></div>;
      break;
    case 'welcome':
    case 'onboard-play':
    case 'onboard-learn': {
      const index=['welcome','onboard-play','onboard-learn'].indexOf(screen);
      const pages=[
        {title:'Welcome to Global Chess Ultimate',description:'A classic strategy game with an independent, warm royal identity.',symbol:'♛'},
        {title:'Play Your Way',description:'Play offline with friends, challenge the computer or enter a private online room when its server is available.',symbol:'♞'},
        {title:'Learn & Grow',description:'Complete real chess puzzles, review local matches and track progress from actual games.',symbol:'♗'},
      ];
      content=<div className="rv-onboarding"><div className="rv-onboard-illustration"><span>{pages[index].symbol}</span></div><K>INTRODUCTION · {index+1} / 3</K><h1>{pages[index].title}</h1><p>{pages[index].description}</p><div className="rv-dots">{pages.map((_,i)=><span key={i} className={i===index?'active':''}/>)}</div><div className="rv-two-actions"><Action secondary onClick={doneIntro}>SKIP</Action><Action onClick={()=>index===2?navigateTo('register'):navigateTo(['onboard-play','onboard-learn'][index] as RoyalScreen)}>{index===2?'CONTINUE':'NEXT ›'}</Action></div></div>;
      break;
    }
    case 'sign-in':
    case 'register':
    case 'account':
      content=<><Header icon="profile" eyebrow="IDENTITY & ACCESS" title={screen==='register'?'Create a Local Profile':screen==='sign-in'?'Access Your Account':'Account Settings'} subtitle="Guest-first chess. Cloud sign-in is not yet configured; your display name is stored on this device."/>
        <div className="rv-panel rv-form"><label htmlFor="rv-name">DISPLAY NAME</label><input id="rv-name" value={draftName} onChange={e=>setDraftName(e.target.value)} maxLength={25}/><Action onClick={()=>{accountSave();if(screen==='register')doneIntro();}}>SAVE LOCAL PROFILE</Action>
        <div className="rv-note"><strong>Google / Email sign-in unavailable</strong><p>Cloud credentials, password handling and cross-device sync have not been deployed. We do not collect passwords in this preview.</p></div><Action secondary onClick={doneIntro}>CONTINUE AS GUEST</Action></div></>;
      break;
    case 'home':
      content=<><div className="rv-userline"><button onClick={navigateMain('profile')} type="button" className="rv-account-pill"><span>{guest.slice(0,1).toUpperCase()}</span><b>{guest}</b><small>Guest · Local</small></button><div className="rv-user-actions"><button type="button" aria-label="Notifications" onClick={navigateMain('notifications')}><SN name="notifications"/>{unread>0&&<span className="rv-unread">{unread}</span>}</button><button type="button" aria-label="Settings" onClick={()=>openPage('settings')}><SN name="settings"/></button></div></div>
        <div className="rv-hero"><div className="rv-hero-chess"><img src="/pieces/b-n.svg" alt="Original obsidian chess knight"/></div><K>THE KINGDOM AWAITS</K><h1>Rule the Board.</h1><p>Play, learn and improve your strategy with every match.</p><Action onClick={()=>navigateTo('modes')}>♞ &nbsp; PLAY CHESS ›</Action></div>
        <div className="rv-grid rv-shortcuts">{link('tournaments','cup','Tournaments','View competition status')}{link('daily','star','Daily Challenge','Solve a real puzzle')}{link('missions','missions','Missions','Progress from your games')}{link('events','events','Events','Activities and updates')}</div>
        <Section title="Quick Battle" note="Available modes"><div className="rv-list">
          <Tile icon="play" title="Classic Chess" detail="Local 10-minute chess or no-clock mode" onClick={()=>{setMode('local');navigateTo('match-setup');}}/>
          <Tile icon="training" title="VS. Computer" detail="Real offline opponent · basic difficulty" onClick={()=>{setMode('computer');navigateTo('match-setup');}}/>
          <Tile icon="friends" title="Play with a Friend" detail="Pass & Play or private invite room" onClick={()=>navigateTo('modes')}/>
        </div></Section>
        <Section title="Your Progress"><div className="rv-metrics"><Metric label="MATCHES PLAYED" value={history.length}/><Metric label="TACTICS SOLVED" value={solved.length}/><Metric label="COMPUTER WINS" value={computerWins}/></div></Section></>;
      break;
    case 'modes':
      content=<><Header eyebrow="THE ARENA" title="Play Chess" subtitle="Choose a fully supported local mode, or open private online rooms if the service is configured." icon="play"/><div className="rv-list">
        <Tile icon="play" title="Classic Chess" detail="Standard rules · 10-minute local clocks" onClick={()=>{setMode('local');setMinutes('10');navigateTo('match-setup');}}/>
        <Tile icon="cup" title="Quick Chess" detail="10-minute local chess" onClick={()=>{setMode('local');setMinutes('10');navigateTo('match-setup');}}/>
        <Tile icon="training" title="VS. Computer" detail="Offline basic opponent" onClick={()=>{setMode('computer');navigateTo('match-setup');}}/>
        <Tile icon="friends" title="Online Match" detail="Private invite rooms · service deployment required" onClick={()=>navigateTo('matchmaking')}/>
        <Tile icon="friends" title="Play with Friends" detail="Two players on one device" onClick={()=>{setMode('local');setMinutes('untimed');navigateTo('match-setup');}}/>
      </div></>;
      break;
    case 'match-setup':
      content=<><Header eyebrow="GAME CONFIGURATION" title="Match Setup" icon="play" subtitle="These controls change the real chess mode. Computer games do not claim unavailable time settings."/><div className="rv-panel rv-form">
        <label htmlFor="rv-mode">MODE</label><select id="rv-mode" value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="local">Two Players · Local</option><option value="computer">VS Computer · Offline</option><option value="online">Private Online</option></select>
        <label htmlFor="rv-time">TIME CONTROL</label><select id="rv-time" value={mode==='computer'?'untimed':minutes} onChange={e=>setMinutes(e.target.value as typeof minutes)} disabled={mode==='computer'||mode==='online'}><option value="untimed">No clock</option><option value="10">10 min · Each side</option></select>
        <div className="rv-note">The current computer opponent plays Black; local mode includes both sides. Rated match and player-side randomization require a live match server.</div>
        <Action onClick={start}>{mode==='online'?'OPEN PRIVATE ONLINE':'START MATCH'} ›</Action></div></>;
      break;
    case 'matchmaking':
      content=<><Header eyebrow="ONLINE ARENA" title="Finding an Opponent" icon="friends" subtitle="Public matchmaking is not enabled. Private room creation and invite codes are available in the separate online interface once its backend is deployed."/><div className="rv-halo"><span>♞</span></div><Empty symbol="friends" title="No public queue is running" text="We do not display invented opponent counts, fake match timers or fictional connected players."><Action onClick={()=>openPage('online')}>OPEN PRIVATE ROOMS</Action></Empty></>;
      break;
    case 'gameplay':
      content=<><Header eyebrow="ACTUAL CHESS ENGINE" title="Gameplay" subtitle="2D chess, optional 3D visuals, promotion, legal moves and replay are integrated with the existing chess.js engine." icon="play"/><div className="rv-board-preview"><img src="/pieces/w-k.svg" alt="White king"/><img src="/pieces/b-q.svg" alt="Black queen"/><img src="/pieces/w-n.svg" alt="White knight"/></div><Action onClick={()=>begin('local',false)}>OPEN PLAYABLE BOARD</Action></>;
      break;
    case 'match-result':
    case 'review':
      content=<><Header eyebrow="MATCH ARCHIVE" title={screen==='review'?'Game Review':'Match Result'} subtitle="Outcomes and PGN are based on saved games—not demonstration scores." icon="review"/>{history.length===0?<Empty symbol="review" title="No finished game recorded" text="Complete your first game to unlock the results screen and move-by-move replay."><Action onClick={()=>begin('local',false)}>PLAY A MATCH</Action></Empty>:<><div className="rv-panel"><K>LATEST SAVED RESULT</K><h2>{history[0].result==='draw'?'Draw':history[0].result==='white'?'White won':'Black won'}</h2><p>{history[0].moves} plies · {history[0].mode==='computer'?'Computer':'Local'} match</p></div><Action onClick={()=>openPage('history')}>OPEN MATCH HISTORY & REPLAY</Action></>}</>;
      break;
    case 'tournaments':
    case 'tournament-detail':
    case 'bracket':
      content=<><Header eyebrow="COMPETITION" title={screen==='bracket'?'Knockout Brackets':screen==='tournament-detail'?'Tournament Details':'Tournaments'} icon="cup" subtitle="Tournament lists, enrollment and brackets require a live competition service."/><div className="rv-tabs">{(['all','live','upcoming','finished'] as const).map(t=><button type="button" key={t} className={tournamentTab===t?'active':''} onClick={()=>setTournamentTab(t)}>{t.toUpperCase()}</button>)}</div><Empty symbol="cup" title="No verified tournaments" text={'No '+tournamentTab+' events are available from a connected tournament service. We will not invent brackets, prize pools or participant numbers.'}><Action secondary onClick={()=>navigateTo('daily')}>PRACTICE WITH A REAL PUZZLE</Action></Empty></>;
      break;
    case 'daily':
      content=<><Header eyebrow="CHALLENGE BOARD" title="Daily Challenge" icon="training" subtitle="Training uses the five real offline chess tactics. No fictitious daily prizes or progress."/><div className="rv-panel rv-challenge"><K>PUZZLE COLLECTION</K><span>♗</span><h2>{solved.length} / 5 complete</h2><p>Practice tactical captures, promotion and basic mating patterns.</p><Bar value={solved.length} total={5}/><Action onClick={()=>openPage('training')}>SOLVE CHALLENGE</Action></div></>;
      break;
    case 'missions':
      content=<><Header eyebrow="TRACKABLE PROGRESS" title="Missions" icon="missions" subtitle="Every progress bar is derived from actual locally saved matches and puzzles."/><div className="rv-tabs">{(['daily','weekly','achievements'] as const).map(t=><button className={missionTab===t?'active':''} type="button" onClick={()=>setMissionTab(t)} key={t}>{t.toUpperCase()}</button>)}</div>{missionTab==='achievements'?renderMissions(achievementList):renderMissions()}<div className="rv-note">Daily and weekly resets are not active; no fake XP or coins are granted.</div></>;
      break;
    case 'season':
    case 'events':
      content=<><Header eyebrow="EVENT SYSTEM" title={screen==='season'?'Seasonal Events':'Events & Challenges'} icon="events" subtitle="Live seasons and tournaments have not been created yet."/><div className="rv-banner"><span>♛</span><h2>Global Chess Ultimate</h2><p>Seasonal competition will appear here when a verified backend exists.</p></div><div className="rv-list">{link('daily','star','Daily Challenge','Real offline puzzles')}{link('missions','missions','Missions','Progress from actual game data')}{link('tournaments','cup','Tournaments','Live service not configured')}{link('season','events','Season Rewards','Not available')}</div></>;
      break;
    case 'news':
      content=<><Header eyebrow="OFFICIAL UPDATES" title="News & Announcements" icon="news" subtitle="Announcements need verified publication data. Nothing is invented."/><Empty symbol="news" title="No announcements published" text="Your game is in the web beta stage. There is no connected content/news feed yet."/><Action secondary onClick={()=>navigateTo('home')}>BACK HOME</Action></>;
      break;
    case 'friends':
    case 'player-search':
    case 'player-card':
    case 'club':
    case 'invites':
      content=<><Header eyebrow="SOCIAL & COMMUNITY" title={{friends:'Friends', 'player-search':'Player Search','player-card':'Player Profile',club:'Clubs & Community',invites:'Invitations'}[screen]} icon="friends" subtitle="No online social directory or club identity service is connected."/>
        {screen==='player-search'&&<div className="rv-form"><label htmlFor="rv-search">SEARCH PLAYERS</label><input id="rv-search" value={lookup} onChange={e=>setLookup(e.target.value)} placeholder="Enter username"/></div>}
        {screen==='friends'&&<div className="rv-tabs"><button className="active" type="button">MY FRIENDS (0)</button><button type="button" onClick={()=>navigateTo('invites')}>REQUESTS (0)</button></div>}
        {screen==='club'&&<div className="rv-panel"><K>YOUR CLUB</K><h2>No Club Joined</h2><p>Real clubs, club chat and membership require online user accounts and moderation.</p></div>}
        <Empty symbol="friends" title={screen==='invites'?'No verified invitations':screen==='player-search'?'No searchable player directory':'No connected players'} text={screen==='player-search'&&lookup?'Search is local UI only. There is no live directory to return results.':'Friends, chat, clubs and friend requests are not fictionalized for an offline profile.'}><Action onClick={()=>openPage('online')}>OPEN PRIVATE INVITE CHESS</Action></Empty>
      </>;
      break;
    case 'leaderboard':
      content=<><Header eyebrow="COMPETITIVE CHESS" title="Leaderboards" icon="leaderboard" subtitle="A ranked board must be backed by server-verified ratings, not made-up names and scores."/><div className="rv-tabs">{(['global','country','friends'] as const).map(t=><button key={t} type="button" onClick={()=>setLeaderboardTab(t)} className={leaderboardTab===t?'active':''}>{t.toUpperCase()}</button>)}</div><Empty symbol="leaderboard" title="No verified ranked results" text={'The '+leaderboardTab+' leaderboard needs rated online play and anti-cheat. It is not populated with demo players.'}/></>;
      break;
    case 'profile':
    case 'stats':
      content=<><Header eyebrow="PLAYER IDENTITY" title={screen==='stats'?'Game Statistics':'My Profile'} icon="profile" subtitle="Verified local records, with no fabricated Elo rating or online stats."/><div className="rv-profile-banner"><div className="rv-profile-portrait">{guest.slice(0,1).toUpperCase()}</div><div><h2>{guest}</h2><p>Guest · Local profile</p><small>Online Rank: Unrated</small></div><button type="button" onClick={()=>navigateTo('account')} aria-label="Edit profile">✎</button></div><div className="rv-metrics"><Metric label="MATCHES" value={history.length}/><Metric label="COMPUTER WINS" value={computerWins}/><Metric label="TACTICS" value={solved.length}/><Metric label="TOTAL PLIES" value={moves}/></div><div className="rv-list">{link('achievements','achievements','Achievements','Based on local progress')}{link('inventory','shop','Avatars, Boards, Pieces','Available cosmetic selection')}{link('friends','friends','Friends','Private invites available')}{link('account','profile','Edit Profile','Change local nickname')}</div></>;
      break;
    case 'achievements':
      content=<><Header eyebrow="COLLECTION & PROGRESS" title="Achievements" icon="achievements" subtitle="Earned statuses reflect your actual stored records."/><div className="rv-metrics"><Metric label="COMPLETED" value={achievementList.filter(a=>a.value>=a.total).length}/><Metric label="AVAILABLE" value={achievementList.length}/></div>{renderMissions(achievementList)}</>;
      break;
    case 'shop':
    case 'inventory':
    case 'customize':
      content=<><Header eyebrow="COSMETICS" title={screen==='shop'?'Chess Shop':screen==='inventory'?'My Inventory':'Customize Your Game'} icon="shop" subtitle="All four board palettes are free local CSS themes. Paid purchases and locked items are not simulated."/><div className="rv-tabs"><button className={screen==='shop'?'active':''} onClick={()=>navigateTo('shop')}>BOARDS</button><button onClick={()=>navigateTo('inventory')} className={screen==='inventory'?'active':''}>MY INVENTORY</button><button onClick={()=>navigateTo('customize')} className={screen==='customize'?'active':''}>3D PIECES</button></div><Section title="Available Board Themes">{renderSkins()}</Section><Section title="3D Model Families" note="On-demand models">{renderModels()}</Section><div className="rv-note">The premium GLB/FBX files must be installed on the hosting origin before the 3D family can render. The base SVG chess set always remains available.</div></>;
      break;
    case 'membership':
    case 'checkout':
      content=<><Header eyebrow="MEMBERSHIP" title={screen==='checkout'?'Purchase Options':'Membership'} icon="star" subtitle="Subscriptions are not currently sold. No fictional prices, payment methods or entitlements are presented."/><div className="rv-membership"><span>♛</span><h2>Global Chess Ultimate</h2><p>Free guest access includes offline chess, basic computer play, match history and training.</p><small>Premium billing not connected</small></div><Empty symbol="star" title="Purchases are unavailable" text="Payments need a verified processor, transaction handling, entitlements, disclosures and release acceptance."><Action secondary onClick={()=>navigateTo('shop')}>VIEW FREE COSMETICS</Action></Empty></>;
      break;
    case 'notifications':
      content=<><Header eyebrow="GAME ACTIVITY" title="Notifications" icon="notifications" subtitle="Only real events derived from your local chess history are displayed."/><Action secondary onClick={()=>save({...local,readIds:events.map(e=>e.id)})}>MARK ALL AS READ ({unread})</Action>{events.length===0?<Empty symbol="notifications" title="You're all caught up" text="Complete a match or puzzle to produce a local activity item."/>:<div className="rv-list">{events.map(event=><article className={'rv-notice-item'+(!local.readIds.includes(event.id)?' unread':'')} key={event.id}><span className="rv-bell">♛</span><div><strong>{event.kind}</strong><p>{event.label}</p><small>{event.date?new Date(event.date).toLocaleDateString():'Saved locally'}</small></div></article>)}</div>}</>;
      break;
    case 'settings':
      content=<><Header eyebrow="PREFERENCES" title="Settings" icon="settings" subtitle="All controls either update real local preferences or clearly identify unavailable services."/><div className="rv-list">{link('account','profile','Account','Guest name and local data')}{link('appearance','settings','Appearance','Board, piece skins, contrast')}{link('sound','settings','Sound & Haptics','Vibration support; voice excluded')}{link('language','settings','Language','Current localization availability')}{link('accessibility','settings','Accessibility','Motion, visibility and legal hints')}{link('privacy','shield','Privacy & Security','Delete or export your local records')}{link('help','info','Help Center','Instructions and troubleshooting')}{link('feedback','info','Feedback','Prepare a copyable feedback message')}{link('about','info','About','Game build and independent identity')}</div></>;
      break;
    case 'appearance':
      content=<><Header eyebrow="VISUAL SYSTEM" title="Appearance" icon="settings" subtitle="Change the real CSS chessboard palette or the optional 3D model family."/><Section title="Board Palettes">{renderSkins()}</Section><Section title="3D Pieces">{renderModels()}</Section></>;
      break;
    case 'sound':
      content=<><Header eyebrow="SENSORY SETTINGS" title="Sound & Haptics" icon="settings" subtitle="No microphone, voice, chat recording or spoken audio is included."/><div className="rv-setting"><div><strong>Haptic Feedback</strong><small>Use supported device vibration on selected controls</small></div><input type="checkbox" checked={local.haptics} disabled={!('vibrate' in navigator)} onChange={e=>save({...local,haptics:e.target.checked})}/></div><div className="rv-note">Chess piece sound effects and background music are not included in this build. Their switches remain absent rather than pretending to work.</div></>;
      break;
    case 'language':
      content=<><Header eyebrow="LANGUAGE & REGION" title="Language" icon="settings" subtitle="Only the English interface is translated across current screens."/><div className="rv-panel rv-form"><label htmlFor="rv-language">APPLICATION LANGUAGE</label><select id="rv-language" value="en" onChange={()=>{}}><option value="en">English — Active</option></select><p>Hindi, Urdu, Bengali, Tamil and Telugu require complete translations and QA before they can be enabled.</p></div></>;
      break;
    case 'privacy':
      content=<><Header eyebrow="PLAYER PRIVACY" title="Privacy & Security" icon="shield" subtitle="No password or financial data is stored by this browser-only profile."/><div className="rv-list">
        <Tile icon="review" title="Export Local History" detail="Save match records as JSON" onClick={()=>{const blob=new Blob([JSON.stringify(history,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='global-chess-ultimate-match-history.json';a.click();URL.revokeObjectURL(url);}}/>
        <Tile icon="shield" title="Account Deletion" detail="Delete guest data, matches and settings from this device" onClick={resetData}/>
        <Tile icon="info" title="Cloud Account Security" detail="No cloud account is currently active" onClick={()=>setToast('No cloud account exists for this local guest profile.')}/>
      </div><div className="rv-note">Local data deletion does not delete backend accounts; none are created by the guest profile.</div></>;
      break;
    case 'accessibility':
      content=<><Header eyebrow="INCLUSIVE CHESS" title="Accessibility" icon="settings" subtitle="Touch targets, focus rings, reduced motion and contrast options are supported."/><div className="rv-list">{[
        {key:'reducedMotion' as const,title:'Reduce Motion',desc:'Disable ornamental and 3D move effects',value:reducedMotion},
        {key:'hints' as const,title:'Legal Move Hints',desc:'Show selectable squares on the game board',value:hints},
        {key:'flipped' as const,title:'Flip Board',desc:'Show Black at the bottom',value:flipped},
      ].map(item=><label className="rv-setting" key={item.key}><span><strong>{item.title}</strong><small>{item.desc}</small></span><input type="checkbox" checked={item.value} onChange={e=>toggleSetting(item.key,e.target.checked)}/></label>)}<label className="rv-setting"><span><strong>High Contrast</strong><small>Increase panel and text contrast</small></span><input type="checkbox" checked={local.contrast} onChange={e=>save({...local,contrast:e.target.checked})}/></label></div></>;
      break;
    case 'help':
      content=<><Header eyebrow="ASSISTANCE" title="Help Center" icon="info" subtitle="Documented guidance for implemented features."/><div className="rv-list">{[
        ['How do I make a move?','Tap a piece, then a highlighted legal destination. Your move record updates after the move.'],
        ['How does computer chess work?','The offline opponent uses a simple chess.js-based move heuristic; it is not an expert chess engine.'],
        ['How do I replay my games?','Finish a match and open History. Select REPLAY GAME, then navigate through moves.'],
        ['How do I use 3D models?','Open a match and select 3D BOARD. Installed optional 3D models are loaded on demand.'],
        ['Is online chess ready?','The private room backend must be deployed and configured before online friends can connect.'],
        ['How do I save my progress?','Local games and puzzles save in this browser where storage is permitted.'],
      ].map(([q,a])=><details className="rv-faq" key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></>;
      break;
    case 'feedback':
      content=<><Header eyebrow="YOUR FEEDBACK" title="Feedback" icon="info" subtitle="Copy your message to share it. There is no connected support ticket endpoint."/><div className="rv-panel rv-form"><label htmlFor="rv-feedback">SUGGESTION / BUG REPORT</label><textarea rows={7} id="rv-feedback" value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="What should we improve?"/><Action onClick={actionFeedback}>COPY FEEDBACK</Action></div></>;
      break;
    case 'offline':
      content=<><Header eyebrow="OFFLINE FIRST" title="Play Offline" icon="play" subtitle="Local chess, the basic computer opponent and cached training do not need a live multiplayer server."/><div className="rv-halo"><span>♜</span></div><Action onClick={()=>begin('computer',false)}>PLAY OFFLINE VS COMPUTER</Action><Action secondary onClick={()=>openPage('training')}>OPEN TRAINING</Action></>;
      break;
    case 'empty-state':
      content=<><Header eyebrow="EMPTY STATE LIBRARY" title="No Games Yet" icon="review" subtitle="These designs are functional zero-data states; they do not populate fake matches."/><Empty symbol="review" title="Start your first game" text="Complete a match to populate history, progress, notifications and achievements."><Action onClick={()=>navigateTo('modes')}>PLAY NOW</Action></Empty></>;
      break;
    case 'alerts':
      content=<><Header eyebrow="FEEDBACK SYSTEM" title="Alerts & Confirmations" icon="notifications" subtitle="Real interactions return actionable status and require consent for destructive operations."/><div className="rv-list"><Tile icon="review" title="View recent match status" detail="Opens saved result, if one exists" onClick={()=>navigateTo('match-result')}/><Tile icon="shield" title="Delete local data" detail="Requires explicit confirmation" onClick={resetData}/><Tile icon="settings" title="Saved board settings" detail="Opens the active appearance controls" onClick={()=>navigateTo('appearance')}/></div></>;
      break;
    case 'about':
      content=<><Header eyebrow="THE DESIGN SYSTEM" title="Global Chess Ultimate" icon="info" subtitle="Independent playable web beta. Original identity, not named Royal Chess."/><div className="rv-panel"><h2>Design System · v3</h2><p>Deep brown/black surfaces, royal gold accents, ivory typography, 8-point spacing, 16-pixel card radius, original chess SVGs, no neon and no gradient chrome.</p><p>{ROYAL_SCREEN_COUNT} mapped reference screens across onboarding, chess, community, seasons, progress and settings.</p><p>Not yet released: server-backed social systems, subscriptions, ranked matchmaking, Android signed AAB and GPU/device certification.</p></div></>;
      break;
  }

  return <section className={'rv-screen'+(local.contrast?' rv-high-contrast':'')} data-rv-screen={screen} data-skin={local.skin}>
    {screen!=='home' && screen!=='splash' && <nav className="rv-breadcrumb" aria-label="Page path"><button type="button" onClick={()=>navigateTo('home')}>⌂ Home</button><span>/</span><span>{descriptions[screen]}</span></nav>}
    {content}
    {toast&&<div role="status" className="rv-toast">{toast}<button type="button" aria-label="Dismiss notification" onClick={()=>setToast('')}>×</button></div>}
  </section>;
}
