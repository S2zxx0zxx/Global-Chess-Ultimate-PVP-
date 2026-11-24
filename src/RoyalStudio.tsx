import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MatchRecord, PlayMode } from './game';
import { loadJSON, saveJSON } from './game';
import RoyalIcon from './RoyalIcon';
import RoyalTutorial from './RoyalTutorial';
import { PRESETS, THINKING_CHOICES, COMPUTER_PREF_KEY, normalizeComputer, winForHuman, type ComputerOptions, type Difficulty } from './computer-mode';

export const ROYAL_SCREEN_GROUPS = {
  journey: ['splash', 'welcome', 'onboard-play', 'onboard-learn', 'tutorial', 'sign-in', 'register'],
  arena: ['home', 'modes', 'match-setup', 'matchmaking', 'gameplay', 'match-result', 'review'],
  competition: ['tournaments', 'tournament-detail', 'bracket', 'daily', 'missions', 'season', 'events', 'news'],
  community: ['friends', 'player-search', 'player-card', 'club', 'invites', 'leaderboard'],
  progression: ['profile', 'stats', 'achievements', 'shop', 'inventory', 'customize', 'membership', 'checkout'],
  preferences: ['settings', 'appearance', 'sound', 'language', 'privacy', 'accessibility', 'notifications', 'help', 'feedback', 'offline', 'empty-state', 'alerts', 'about', 'account'],
} as const;
export type RoyalScreen = typeof ROYAL_SCREEN_GROUPS[keyof typeof ROYAL_SCREEN_GROUPS][number];
export const ROYAL_SCREEN_COUNT = Object.values(ROYAL_SCREEN_GROUPS).reduce((sum, group) => sum + group.length, 0);
type RealPage = 'home' | 'play' | 'game' | 'training' | 'history' | 'profile' | 'settings' | 'online' | 'about';
type Props = {
  screen: RoyalScreen;
  navigate: (screen: RoyalScreen) => void;
  openPage: (page: RealPage) => void;
  begin: (mode: PlayMode, timed: boolean, options?:ComputerOptions) => void;
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
const SN = ({name}: {name: SymbolName}) => <RoyalIcon name={name} size={22}/>;
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
type LocalUi = {skin:typeof SKINS[number]['id'];haptics:boolean;contrast:boolean;readIds:string[];completedIntro:boolean;avatar:'king'|'knight'|'queen';frame:'gold'|'bronze'|'onyx'};
const defaultLocal:LocalUi={skin:'wood',haptics:false,contrast:false,readIds:[],completedIntro:false,avatar:'king',frame:'gold'};
function loadUi():LocalUi {const value=loadJSON<Partial<LocalUi>>(STORE_KEY,{});return {...defaultLocal,...value};}
const descriptions: Record<RoyalScreen,string>={
  splash:'Branded launch experience', welcome:'Welcome to the chess kingdom',tutorial:'Interactive chess tutorial',
  'onboard-play':'Online and offline ways to play','onboard-learn':'Learn through real tactics',
  'sign-in':'Access options','register':'New local profile',
  home:'Home dashboard', modes:'Chess modes','match-setup':'Match configuration',matchmaking:'Online matchmaking',
  gameplay:'Real 2D and 3D game', 'match-result':'Saved result','review':'Saved match replay',
  tournaments:'Tournaments', 'tournament-detail':'Tournament details',bracket:'Knockout bracket',
  daily:'Daily challenge', missions:'Missions',season:'Seasonal events',events:'Events hub',news:'Announcements',
  friends:'Friends list','player-search':'Search for players','player-card':'Other player profile',
  club:'Clubs and community',invites:'Invitations',leaderboard:'Leaderboards',
  notifications:'Activity notifications',
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
  const [computer,setComputer]=useState(()=>normalizeComputer(loadJSON(COMPUTER_PREF_KEY,null)));
  const updateComputer=(next:ComputerOptions)=>{const c=normalizeComputer(next);setComputer(c);if(!saveJSON(COMPUTER_PREF_KEY,c))setToast('Preferences could not be saved on this device.');};
  const [minutes,setMinutes]=useState<'untimed'|'10'>('untimed');
  const [leaderboardTab,setLeaderboardTab]=useState<'global'|'country'|'friends'>('global');
  const [profileTab,setProfileTab]=useState<'overview'|'stats'|'avatars'|'frames'>('overview');
  const [shopTab,setShopTab]=useState<'boards'|'pieces'|'frames'|'avatars'>('boards');
  const [tournamentTab,setTournamentTab]=useState<'all'|'live'|'upcoming'|'finished'>('all');
  const [missionTab,setMissionTab]=useState<'daily'|'weekly'|'achievements'>('daily');
  const [toast,setToast]=useState('');
  const save=(next:LocalUi)=>{setLocal(next);saveJSON(STORE_KEY,next);};
  const setSkin=(skin:LocalUi['skin'])=>{save({...local,skin});onSkinChange(skin);setToast('Board appearance saved. New matches use the selected skin.');};
  const avatarOptions=[{id:'king',label:'Royal King',file:'k'},{id:'knight',label:'Knight',file:'n'},{id:'queen',label:'Royal Queen',file:'q'}] as const;
  const frameOptions=[{id:'gold',label:'Royal Gold'},{id:'bronze',label:'Classic Bronze'},{id:'onyx',label:'Stone Onyx'}] as const;
  const renderAvatars=()=> <div className="rv-grid royal-avatar-picker">{avatarOptions.map(option=><button type="button" key={option.id} className={local.avatar===option.id?'active':''} aria-pressed={local.avatar===option.id} onClick={()=>{save({...local,avatar:option.id});setToast(option.label+' avatar saved locally.');}}>
    <img src={'/pieces/w-'+option.file+'.svg'} alt=""/><strong>{option.label}</strong><small>{local.avatar===option.id?'✓ SELECTED':'CHOOSE'}</small></button>)}</div>;
  const renderFrames=()=> <div className="rv-grid royal-frame-picker">{frameOptions.map(option=><button type="button" key={option.id} className={'frame-'+option.id+(local.frame===option.id?' active':'')} aria-pressed={local.frame===option.id} onClick={()=>{save({...local,frame:option.id});setToast(option.label+' frame selected.');}}>
    <span>♛</span><strong>{option.label}</strong><small>{local.frame===option.id?'✓ SELECTED':'CHOOSE'}</small></button>)}</div>;
  const doneIntro=()=>{save({...local,completedIntro:true});navigate('home');};
  const moves=history.reduce((acc,h)=>acc+h.moves,0);
  const computerWins=history.filter(h=>h.mode==='computer'&&winForHuman(h)).length;
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
  const start=()=>{useHaptics();if(mode==='online')openPage('online');else begin(mode,minutes==='10',computer);};
  const link=(name:RoyalScreen, icon:SymbolName, label:string, detail:string)=> <Tile title={label} detail={detail} icon={icon} onClick={()=>navigateTo(name)}/>;
  const renderMissions=(items=missionList)=><div className="rv-list">{items.map(item=><article key={item.name} className="rv-progress-card"><div className="rv-progress-copy"><strong>{item.name}</strong><span>{Math.min(item.value,item.total)}/{item.total}</span></div><p>{item.desc}</p><Bar value={item.value} total={item.total}/>{item.value>=item.total&&<small className="rv-complete">✓ Completed from real local activity</small>}</article>)}</div>;
  const renderSkins=()=> <div className="rv-grid rv-skins">{SKINS.map(skin=><button type="button" className={'rv-skin'+(local.skin===skin.id?' selected':'')} key={skin.id} onClick={()=>setSkin(skin.id)} aria-pressed={local.skin===skin.id}>
    <span className={'rv-skin-preview rv-skin-'+skin.id}><span className="rv-mini-chess">♜ ♞ ♛ ♚</span></span><strong>{skin.label}</strong><small>{local.skin===skin.id?'✓ Selected':'Apply'}</small>
  </button>)}</div>;
  const renderModels=()=> <div className="rv-grid rv-skins">{MODELS.map(item=><button type="button" className={'rv-model'+(modelTheme===item.id?' selected':'')} key={item.id} onClick={()=>{setModelTheme(item.id);setToast('3D style selected. Available models load on demand when 3D board is enabled.');}}>
    <span className="rv-model-knight"><img src="/art/sheet-gold-knight.svg" alt=""/></span><strong>{item.name}</strong><small>{modelTheme===item.id?'✓ Selected':'Select style'}</small>
  </button>)}</div>;
  const actionFeedback=()=>{if(!feedback.trim()){setToast('Write your feedback first.');return;}navigator.clipboard?.writeText(feedback).then(()=>setToast('Feedback copied. No message was sent.')).catch(()=>setToast('Copy unavailable. Select and copy your feedback manually.'));};
  const accountSave=()=>{const next=draftName.trim();if(next){saveGuest(next);setToast('Local display name saved on this device.');}else setToast('Enter a display name.');};
  const resetData=()=>{if(!window.confirm('Delete local chess history, puzzles, profile and preferences from this browser? This cannot be undone.'))return;['gcu.guest.v1','gcu.lastMatch.v1','gcu.history.v1','gcu.settings.v1','gcu.puzzles.solved.v1',STORE_KEY,COMPUTER_PREF_KEY,'gcu.private-room.v1'].forEach(key=>{try{localStorage.removeItem(key);sessionStorage.removeItem(key);}catch{}});window.location.reload();};

  let content:ReactNode=null;
  switch(screen) {
    case 'splash':
      content=<div className="rv-splash"><div className="rv-crown">♛</div><div className="rv-splash-figure"><img src="/art/sheet-gold-knight.svg" alt="Original golden knight artwork from your UI design sheet"/></div><div className="royal-splash-backdrop" aria-hidden="true"><span>♜</span><span>♔</span><span>♟</span></div><K>PREMIUM CHESS EXPERIENCE</K><h1>GLOBAL CHESS<br/><span>ULTIMATE</span></h1><p>Think · Play · Improve</p><Action onClick={()=>navigateTo('welcome')}>ENTER THE KINGDOM ›</Action><small>No account needed to play</small></div>;
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
      content=<div className="rv-onboarding"><div className={'rv-onboard-illustration onboarding-art-'+index}>
          {index===0?<img src="/art/sheet-gold-knight.svg" alt="Gold knight from the supplied Royal design sheet"/>:
          index===1?<div className="royal-onboard-trio"><img src="/pieces/w-k.svg" alt=""/><img src="/pieces/b-n.svg" alt=""/><img src="/pieces/w-q.svg" alt=""/></div>:
          <span className="royal-onboard-book" aria-hidden="true">♜ ♗ ♘</span>}
        </div><K>INTRODUCTION · {index+1} / 3</K><h1>{pages[index].title}</h1><p>{pages[index].description}</p><div className="rv-dots">{pages.map((_,i)=><span key={i} className={i===index?'active':''}/>)}</div><div className="rv-two-actions"><Action secondary onClick={()=>navigateTo('tutorial')}>TUTORIAL</Action><Action secondary onClick={doneIntro}>SKIP</Action><Action onClick={()=>index===2?navigateTo('register'):navigateTo(['onboard-play','onboard-learn'][index] as RoyalScreen)}>{index===2?'CONTINUE':'NEXT ›'}</Action></div></div>;
      break;
    }
    case 'tutorial':
      content=<RoyalTutorial onComplete={()=>navigateTo('modes')}/>;
      break;
    case 'sign-in':
    case 'register':
    case 'account':
      content=<><Header icon="profile" eyebrow="IDENTITY & ACCESS" title={screen==='register'?'Create a Local Profile':screen==='sign-in'?'Access Your Account':'Account Settings'} subtitle="Guest-first chess. Cloud sign-in is not yet configured; your display name is stored on this device."/>
        <div className="rv-panel rv-form"><label htmlFor="rv-name">DISPLAY NAME</label><input id="rv-name" value={draftName} onChange={e=>setDraftName(e.target.value)} maxLength={25}/><Action onClick={()=>{accountSave();if(screen==='register')doneIntro();}}>SAVE LOCAL PROFILE</Action>
        <div className="rv-note"><strong>Google / Email sign-in unavailable</strong><p>Cloud credentials, password handling and cross-device sync have not been deployed. We do not collect passwords in this preview.</p></div><Action secondary onClick={doneIntro}>CONTINUE AS GUEST</Action><button type="button" className="rv-text-link" onClick={()=>navigateTo(screen==='sign-in'?'register':'sign-in')}>{screen==='sign-in'?'CREATE A LOCAL PROFILE':'SEE SIGN-IN STATUS'}</button></div></>;
      break;
    case 'home':
      content=<div className="royal-hub">
        <div className="royal-player-panel">
          <button className="royal-player-identity" type="button" onClick={()=>navigateTo('profile')}>
            <span className="royal-avatar">{guest.slice(0,1).toUpperCase()}</span>
            <span className="royal-identity-name"><strong>{guest}</strong><small>★ Beginner · Guest player</small></span>
          </button>
          <div className="royal-player-controls">
            <button type="button" aria-label="Achievements" onClick={()=>navigateTo('achievements')}><RoyalIcon name="star" size={22}/></button>
            <button type="button" aria-label="Notifications" onClick={()=>navigateTo('notifications')}><RoyalIcon name="notifications" size={21}/>{unread>0&&<i>{unread}</i>}</button>
            <button type="button" aria-label="Settings" onClick={()=>navigateTo('settings')}><RoyalIcon name="settings" size={21}/></button>
          </div>
        </div>
        <div className="royal-hub-emblem"><div className="royal-hub-crown"><RoyalIcon name="crown" size={27}/><span>GLOBAL CHESS</span></div><strong>ULTIMATE</strong><span>♟ &nbsp; PLAY • LEARN • COMPETE &nbsp; ♟</span></div>
        <div className="royal-mode-primary">
          <button className="royal-classic" type="button" onClick={()=>{setMode('local');setMinutes('untimed');navigateTo('match-setup');}}>
            <span className="royal-mode-figure"><img src="/art/sheet-gold-knight.svg" alt=""/></span>
            <span><small>THE ROYAL ARENA</small><strong>Classic Chess</strong><em>Standard rules · Pass &amp; Play</em></span>
            <RoyalIcon name="arrow" size={21}/>
          </button>
          <button className="royal-quick" type="button" onClick={()=>{setMode('local');setMinutes('10');navigateTo('match-setup');}}>
            <RoyalIcon name="time" size={27}/><span><strong>Quick Chess</strong><small>10-minute local match</small></span><RoyalIcon name="arrow" size={19}/>
          </button>
        </div>
        <div className="royal-mode-secondary">
          <button type="button" onClick={()=>{setMode('computer');setMinutes('untimed');navigateTo('match-setup');}}><span className="royal-small-pict"><img src="/pieces/b-k.svg" alt=""/></span><strong>VS. Computer</strong><small>Offline bot</small></button>
          <button type="button" onClick={()=>navigateTo('modes')}><RoyalIcon name="friends" size={30}/><strong>Play With Friends</strong><small>Local or invite</small></button>
        </div>
        <div className="royal-hub-rewards">
          <button type="button" onClick={()=>navigateTo('missions')}><RoyalIcon name="gift" size={25}/><strong>Daily Reward</strong><small>View missions</small></button>
          <button type="button" onClick={()=>navigateTo('shop')}><img className="royal-reward-chest" src="/art/sheet-reward-chest.svg" alt="" loading="lazy"/><strong>Lucky Box</strong><small>Free cosmetics</small></button>
          <button type="button" onClick={()=>navigateTo('events')}><RoyalIcon name="events" size={25}/><strong>Events</strong><small>Explore</small></button>
        </div>
        <div className="royal-home-divider"><span>CHOOSE YOUR NEXT CHALLENGE</span></div>
        <div className="royal-hub-quests">
          <button type="button" onClick={()=>navigateTo('daily')}><RoyalIcon name="training" size={22}/><span><strong>Daily Challenge</strong><small>{solved.length} of 5 real tactics solved</small></span><RoyalIcon name="arrow" size={17}/></button>
          <button type="button" onClick={()=>navigateTo('tournaments')}><RoyalIcon name="cup" size={22}/><span><strong>Tournaments</strong><small>No live events scheduled</small></span><RoyalIcon name="arrow" size={17}/></button>
          <button type="button" onClick={()=>openPage('history')}><RoyalIcon name="history" size={22}/><span><strong>Game Review</strong><small>{history.length} completed games</small></span><RoyalIcon name="arrow" size={17}/></button>
        </div>
        <div className="royal-hub-stats"><div><small>GAMES</small><strong>{history.length}</strong></div><div><small>COMPUTER WINS</small><strong>{computerWins}</strong></div><div><small>TACTICS</small><strong>{solved.length}<em>/5</em></strong></div></div>
      </div>;
      break;
    case 'modes':
      content=<div className="royal-modes-page"><Header eyebrow="THE ROYAL ARENA" title="Play Chess" subtitle="Choose a mode. Every available local option starts the real chess engine." icon="play"/>
        <div className="royal-modes-stack">
          <button type="button" onClick={()=>{setMode('local');setMinutes('untimed');navigateTo('match-setup');}}><span><img src="/art/sheet-gold-knight.svg" alt=""/></span><div><strong>Classic Chess</strong><small>Standard rules · No clock</small></div><RoyalIcon name="arrow"/></button>
          <button type="button" onClick={()=>{setMode('local');setMinutes('10');navigateTo('match-setup');}}><span><RoyalIcon name="time" size={34}/></span><div><strong>Quick Chess</strong><small>Fast &amp; exciting · 10 min</small></div><RoyalIcon name="arrow"/></button>
          <button type="button" onClick={()=>{setMode('computer');setMinutes('untimed');navigateTo('match-setup');}}><span><img src="/pieces/b-n.svg" alt=""/></span><div><strong>VS. Computer</strong><small>Offline · Four difficulty levels</small></div><RoyalIcon name="arrow"/></button>
          <button type="button" onClick={()=>navigateTo('matchmaking')}><span><RoyalIcon name="friends" size={35}/></span><div><strong>Online Match</strong><small>Private invites · Server required</small></div><RoyalIcon name="arrow"/></button>
          <button type="button" onClick={()=>{setMode('local');setMinutes('untimed');navigateTo('match-setup');}}><span><RoyalIcon name="friends" size={35}/></span><div><strong>Play With Friends</strong><small>Two players on one device</small></div><RoyalIcon name="arrow"/></button>
        </div></div>;
      break;
    case 'match-setup':
      content=<><Header eyebrow="GAME CONFIGURATION" title="Match Setup" icon="play" subtitle="Choose your side, computer search budget and optional local clock."/><div className="rv-panel rv-form">
        <label htmlFor="rv-mode">MODE</label><select id="rv-mode" value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="local">Two Players · Local</option><option value="computer">VS Computer · Offline</option><option value="online">Private Online</option></select>
        <label htmlFor="rv-time">TIME CONTROL</label><select id="rv-time" value={minutes} onChange={e=>setMinutes(e.target.value as typeof minutes)} disabled={mode==='online'}><option value="untimed">No clock</option><option value="10">10 min · Each side</option></select>
        {mode==='computer'&&<>
        <label htmlFor="rv-difficulty">DIFFICULTY</label><select id="rv-difficulty" value={computer.difficulty} onChange={e=>{const difficulty=e.target.value as Difficulty;updateComputer({...computer,difficulty,thinkingMs:PRESETS[difficulty].timeMs});}}>{Object.entries(PRESETS).map(([id,p])=><option key={id} value={id}>{p.label} · up to {p.timeMs} ms</option>)}</select>
        <label htmlFor="rv-side">YOUR SIDE</label><select id="rv-side" value={computer.playerSide} onChange={e=>updateComputer({...computer,playerSide:e.target.value==='b'?'b':'w'})}><option value="w">White</option><option value="b">Black</option></select>
        <label htmlFor="rv-thinking">THINKING TIME CAP</label><select id="rv-thinking" value={computer.thinkingMs} onChange={e=>updateComputer({...computer,thinkingMs:Number(e.target.value)})}>{THINKING_CHOICES.filter(n=>n<=PRESETS[computer.difficulty].timeMs).map(n=><option key={n} value={n}>{n} ms</option>)}</select>
        <div className="rv-note">Difficulty is a search budget, not an Elo rating. On slower devices the computer may return an earlier completed result.</div></>}
        <div className="rv-note">Local clocks pause in match menus and when saved. Online clocks remain separate.</div>
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
      content=<><Header eyebrow="COMPETITION" title="Tournaments" icon="cup" subtitle="This is a real tournament browser shell; no tournaments have been published through a connected service."/><div className="rv-tabs">{(['all','live','upcoming','finished'] as const).map(t=><button type="button" key={t} className={tournamentTab===t?'active':''} onClick={()=>setTournamentTab(t)}>{t.toUpperCase()}</button>)}</div>
        <Empty symbol="cup" title="No Verified Tournaments" text={'No '+tournamentTab+' tournament records are available. We do not invent competition dates, prize pools or participants.'}/>
        <div className="rv-list"><Tile icon="cup" title="Tournament Details" detail="Preview the real empty-data detail layout" onClick={()=>navigateTo('tournament-detail')}/><Tile icon="review" title="Knockout Bracket" detail="No players have been enrolled" onClick={()=>navigateTo('bracket')}/></div></>;
      break;
    case 'tournament-detail':
      content=<><Header eyebrow="TOURNAMENT RECORD" title="Tournament Details" icon="cup" subtitle="A tournament needs a published schedule and authoritative participant list."/><div className="rv-panel rv-tournament-detail"><span className="rv-cup-symbol">♜</span><K>NO EVENT SELECTED</K><h2>Global Chess Ultimate Events</h2><div className="rv-metrics"><Metric label="FORMAT" value="—"/><Metric label="TIME CONTROL" value="—"/><Metric label="PLAYERS" value="—"/></div><p>No live event data has been received. Joining an unpublished tournament is disabled rather than claiming enrollment.</p><Action secondary onClick={()=>navigateTo('tournaments')}>BROWSE TOURNAMENTS</Action><Action secondary onClick={()=>navigateTo('bracket')}>VIEW EMPTY BRACKET</Action></div></>;
      break;
    case 'bracket':
      content=<><Header eyebrow="KNOCKOUT STRUCTURE" title="Tournament Bracket" icon="cup" subtitle="Responsive quarterfinal, semifinal and final lanes. Empty slots are not fabricated entrants."/><div className="rv-bracket">
        {(['QUARTERFINALS','SEMIFINALS','FINAL'] as const).map((round,i)=><div className="rv-bracket-round" key={round}><strong>{round}</strong>
          {Array.from({length:Math.max(1,4/2**i)},(_,match)=><div className="rv-bracket-match" key={match}><span>— No entrant</span><span>— No entrant</span></div>)}
        </div>)}
      </div><div className="rv-note">The bracket structure is functional UI only. Tournament registration, draws, match advancement and real participant names require server-side event records.</div><Action secondary onClick={()=>navigateTo('tournaments')}>BACK TO TOURNAMENTS</Action></>;
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
      content=<div className="royal-profile-page">
        <Header eyebrow="ROYAL PLAYER IDENTITY" title={screen==='stats'?'My Statistics':'My Profile'} icon="profile"/>
        <div className="royal-profile-card">
          <div className={'royal-profile-photo frame-'+local.frame}><img src={'/pieces/w-'+({king:'k',knight:'n',queen:'q'}[local.avatar])+'.svg'} alt="Selected chess profile avatar"/></div>
          <div className="royal-profile-identity"><strong>{guest}</strong><span>Guest Player</span><small>Rank: Beginner · Offline</small></div>
          <button type="button" onClick={()=>navigateTo('account')} aria-label="Edit local profile">✎</button>
        </div>
        <div className="royal-profile-progress"><div><span>LOCAL CHESS PROGRESS</span><b>{Math.min(history.length,10)} / 10 matches</b></div><Bar value={history.length} total={10}/></div>
        <div className="rv-tabs royal-profile-tabs">{(['overview','stats','avatars','frames'] as const).map(tab=><button key={tab} type="button" onClick={()=>setProfileTab(tab)} className={profileTab===tab||screen==='stats'&&tab==='stats'?'active':''}>{tab.toUpperCase()}</button>)}</div>
        {screen==='stats'||profileTab==='stats'?<div className="rv-metrics"><Metric label="TOTAL GAMES" value={history.length}/><Metric label="BOT WINS" value={computerWins}/><Metric label="TACTICS" value={solved.length}/><Metric label="TOTAL PLIES" value={moves}/></div>
        :profileTab==='avatars'?renderAvatars():profileTab==='frames'?renderFrames()
        :<div className="royal-profile-summary">
          <div><span>Completed Games</span><strong>{history.length}</strong></div>
          <div><span>Computer Wins</span><strong>{computerWins}</strong></div>
          <div><span>Win Rate vs Bot</span><strong>{history.filter(h=>h.mode==='computer').length?Math.round(100*computerWins/history.filter(h=>h.mode==='computer').length)+'%':'—'}</strong></div>
          <div><span>Completed Tactics</span><strong>{solved.length} / 5</strong></div>
        </div>}
        <Section title="Your Kingdom"><div className="rv-list">{link('achievements','achievements','Achievements','Based on saved games')}{link('inventory','shop','Chess Collection','Boards, avatars and frames')}{link('friends','friends','Friends','Private online invites')}{link('account','profile','Edit Profile','Change local nickname')}<Tile icon="play" title="3D Character Animation Studio" detail="Open existing animation preview" onClick={()=>openPage('profile')}/></div></Section>
      </div>;
      break;
    case 'achievements':
      content=<><Header eyebrow="COLLECTION & PROGRESS" title="Achievements" icon="achievements" subtitle="Earned statuses reflect your actual stored records."/><div className="rv-metrics"><Metric label="COMPLETED" value={achievementList.filter(a=>a.value>=a.total).length}/><Metric label="AVAILABLE" value={achievementList.length}/></div>{renderMissions(achievementList)}</>;
      break;
    case 'shop':
    case 'inventory':
    case 'customize':
      content=<div className="royal-shop-page">
        <Header eyebrow="ROYAL COLLECTION" title={screen==='shop'?'Chess Shop':screen==='inventory'?'My Inventory':'Customize Your Game'} icon="shop" subtitle="Four free chessboard styles, your original chess pieces and local cosmetic selections."/>
        <div className="rv-tabs royal-shop-tabs">{(['pieces','boards','frames','avatars'] as const).map(tab=><button type="button" key={tab} className={shopTab===tab?'active':''} onClick={()=>setShopTab(tab)}>{tab.toUpperCase()}</button>)}</div>
        {screen==='inventory'&&<div className="royal-inventory-summary">
          <div><RoyalIcon name="check" size={20}/><span>Active board</span><strong>{SKINS.find(x=>x.id===local.skin)?.label||'Classic Wood'}</strong></div>
          <div><RoyalIcon name="profile" size={20}/><span>Avatar</span><strong>{avatarOptions.find(x=>x.id===local.avatar)?.label}</strong></div>
          <div><RoyalIcon name="star" size={20}/><span>Frame</span><strong>{frameOptions.find(x=>x.id===local.frame)?.label}</strong></div>
        </div>}
        {shopTab==='pieces'?<Section title="Royal Chess Pieces" note="Original, always free">
          <div className="royal-shop-showcase"><div><img src="/pieces/w-k.svg" alt="White king"/><img src="/pieces/w-q.svg" alt="White queen"/><img src="/pieces/w-n.svg" alt="White knight"/></div><strong>Global Chess Original Set</strong><small>Already equipped in your real playable game</small></div>
          <div className="rv-note">Alternate 3D models load only when the corresponding asset packs are installed. No unverified purchases or wallet balances.</div>
          <Action onClick={()=>navigateTo('customize')}>3D MODEL FAMILIES</Action>
        </Section>
        :shopTab==='boards'?<Section title="Select Your Board">{renderSkins()}</Section>
        :shopTab==='frames'?<Section title="Profile Frames">{renderFrames()}</Section>
        :<Section title="Player Avatars">{renderAvatars()}</Section>}
        {screen==='customize'&&<Section title="3D Piece Families" note="Availability depends on installed models">{renderModels()}</Section>}
        <div className="royal-shop-footer"><Action secondary onClick={()=>navigateTo('inventory')}>MY INVENTORY</Action><Action secondary onClick={()=>navigateTo('profile')}>VIEW PROFILE</Action></div>
      </div>;
      break;
    case 'membership':
    case 'checkout':
      content=<><Header eyebrow="MEMBERSHIP" title={screen==='checkout'?'Purchase Options':'Membership'} icon="star" subtitle="Subscriptions are not currently sold. No fictional prices, payment methods or entitlements are presented."/><div className="rv-membership"><span>♛</span><h2>Global Chess Ultimate</h2><p>Free guest access includes offline chess, basic computer play, match history and training.</p><small>Premium billing not connected</small></div><Empty symbol="star" title="Purchases are unavailable" text="Payments need a verified processor, transaction handling, entitlements, disclosures and release acceptance."><Action secondary onClick={()=>navigateTo('shop')}>VIEW FREE COSMETICS</Action></Empty></>;
      break;
    case 'notifications':
      content=<><Header eyebrow="GAME ACTIVITY" title="Notifications" icon="notifications" subtitle="Only real events derived from your local chess history are displayed."/><Action secondary onClick={()=>save({...local,readIds:events.map(e=>e.id)})}>MARK ALL AS READ ({unread})</Action>{events.length===0?<Empty symbol="notifications" title="You're all caught up" text="Complete a match or puzzle to produce a local activity item."/>:<div className="rv-list">{events.map(event=><article className={'rv-notice-item'+(!local.readIds.includes(event.id)?' unread':'')} key={event.id}><span className="rv-bell">♛</span><div><strong>{event.kind}</strong><p>{event.label}</p><small>{event.date?new Date(event.date).toLocaleDateString():'Saved locally'}</small></div></article>)}</div>}</>;
      break;
    case 'settings':
      content=<><Header eyebrow="PREFERENCES" title="Settings" icon="settings" subtitle="All controls either update real local preferences or clearly identify unavailable services."/><div className="rv-list">{link('account','profile','Account','Guest name and local data')}{link('appearance','settings','Appearance','Board, piece skins, contrast')}{link('sound','settings','Sound & Haptics','Vibration support; voice excluded')}{link('language','settings','Language','Current localization availability')}{link('accessibility','settings','Accessibility','Motion, visibility and legal hints')}{link('privacy','shield','Privacy & Security','Delete or export your local records')}{link('help','info','Help Center','Instructions and troubleshooting')}{link('feedback','info','Feedback','Prepare a copyable feedback message')}{link('about','info','About','Game build and independent identity')}<Tile icon="settings" title="Advanced Game Settings" detail="Preserved 3D library and piece controls" onClick={()=>openPage('settings')}/></div></>;
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
        ['Can I practice the rules interactively?','Open the five-step Move Tutorial from Onboarding or the Learn section.'],
        ['How does computer chess work?','The offline opponent uses bounded search in a worker. Difficulty controls time and depth, not an Elo rating.'],
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
      content=<><Header eyebrow="OFFLINE FIRST" title="Play Offline" icon="play" subtitle="Local chess, the basic computer opponent and cached training do not need a live multiplayer server."/><div className="rv-halo"><span>♜</span></div><Action onClick={()=>begin('computer',false,computer)}>PLAY OFFLINE VS COMPUTER</Action><Action secondary onClick={()=>openPage('training')}>OPEN TRAINING</Action></>;
      break;
    case 'empty-state':
      content=<><Header eyebrow="EMPTY STATE LIBRARY" title="No Games Yet" icon="review" subtitle="These designs are functional zero-data states; they do not populate fake matches."/><Empty symbol="review" title="Start your first game" text="Complete a match to populate history, progress, notifications and achievements."><Action onClick={()=>navigateTo('modes')}>PLAY NOW</Action></Empty></>;
      break;
    case 'alerts':
      content=<><Header eyebrow="FEEDBACK SYSTEM" title="Alerts & Confirmations" icon="notifications" subtitle="Real interactions return actionable status and require consent for destructive operations."/><div className="rv-list"><Tile icon="review" title="View recent match status" detail="Opens saved result, if one exists" onClick={()=>navigateTo('match-result')}/><Tile icon="shield" title="Delete local data" detail="Requires explicit confirmation" onClick={resetData}/><Tile icon="settings" title="Saved board settings" detail="Opens the active appearance controls" onClick={()=>navigateTo('appearance')}/></div></>;
      break;
    case 'about':
      content=<><Header eyebrow="THE DESIGN SYSTEM" title="Global Chess Ultimate" icon="info" subtitle="Independent playable web beta with original Global Chess Ultimate branding."/><div className="rv-panel"><h2>Design System · v3</h2><p>Deep brown/black surfaces, royal gold accents, ivory typography, 8-point spacing, 16-pixel card radius, original chess SVGs, no neon and no gradient chrome.</p><p>{ROYAL_SCREEN_COUNT} mapped reference screens across onboarding, chess, community, seasons, progress and settings.</p><p>Not yet released: server-backed social systems, subscriptions, ranked matchmaking, Android signed AAB and GPU/device certification.</p></div><Section title="All Design Screens" note="Navigation and component inspection"><div className="rv-screen-index">{Object.entries(ROYAL_SCREEN_GROUPS).map(([group,screens])=><details key={group}><summary>{group.toUpperCase()} · {screens.length} screens</summary><div>{screens.map(route=><button type="button" onClick={()=>navigateTo(route as RoyalScreen)} key={route}>{route.replace(/-/g,' ')}</button>)}</div></details>)}</div></Section></>;
      break;
  }

  return <section className={'rv-screen'+(local.contrast?' rv-high-contrast':'')} data-rv-screen={screen} data-skin={local.skin}>
    {screen!=='home' && screen!=='splash' && <nav className="rv-breadcrumb" aria-label="Page path"><button type="button" onClick={()=>navigateTo('home')}>⌂ Home</button><span>/</span><span>{descriptions[screen]}</span></nav>}
    {content}
    {toast&&<div role="status" className="rv-toast">{toast}<button type="button" aria-label="Dismiss notification" onClick={()=>setToast('')}>×</button></div>}
  </section>;
}
