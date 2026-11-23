import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';

type Seat = 'w' | 'b';
type Session = { roomId: string; token: string; side: Seat };
type RoomState = { type: 'state'; fen: string; pgn: string; turn: Seat; side: Seat; status: 'waiting'|'active'|'finished'; revision: number; isCheck: boolean; isGameOver: boolean; result: string|null };
const KEY = 'gcu.private-room.v1';
const ENDPOINT = (import.meta.env.VITE_CHESS_ROOM_API || '').replace(/\/+$/, '');
const FILES = 'abcdefgh';
const SQUARES = Array.from({length:64},(_,i)=>(FILES[i%8]+(8-Math.floor(i/8))) as Square);
const readSession = ():Session|null => {
  try { const s = sessionStorage.getItem(KEY); return s ? JSON.parse(s) as Session : null; } catch { return null; }
};
const writeSession=(value:Session|null)=>{try{if(value)sessionStorage.setItem(KEY,JSON.stringify(value));else sessionStorage.removeItem(KEY);}catch{}};
export default function PrivateOnline(){
  const [session,setSession]=useState<Session|null>(readSession);
  const [code,setCode]=useState(()=>new URLSearchParams(location.search).get('room')?.toUpperCase()||'');
  const [state,setState]=useState<RoomState|null>(null);
  const [selected,setSelected]=useState<Square|null>(null);
  const [status,setStatus]=useState(ENDPOINT?'Create a room or enter your friend invite code.':'Online service has not been deployed. Local chess still works.');
  const [busy,setBusy]=useState(false);
  const [connected,setConnected]=useState(false);
  const socket=useRef<WebSocket|null>(null);
  const game=useMemo(()=>{try{return state?new Chess(state.fen):new Chess();}catch{return new Chess();}},[state?.fen]);
  const legal=useMemo(()=>selected?game.moves({square:selected,verbose:true}).map(m=>m.to):[],[game,selected]);
  const ready=Boolean(session&&connected&&state?.status==='active'&&state.turn===session.side&&!state.isGameOver);
  const api=async(path:string,body:unknown={})=>{
    const response=await fetch(ENDPOINT+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    const payload=await response.json();
    if(!response.ok)throw Error(payload.error||'Unable to connect to online service');
    return payload;
  };
  const create=async()=>{
    if(!ENDPOINT||busy)return;
    setBusy(true);
    try{
      const result=await api('/api/rooms');
      const next:Session={roomId:result.roomId,token:result.token,side:'w'};
      writeSession(next);setSession(next);setStatus('Room created. Share the code with your opponent.');
      history.replaceState(null,'',location.pathname+'?room='+result.roomId);
    }catch(e){setStatus(e instanceof Error?e.message:'Could not create room');}
    finally{setBusy(false);}
  };
  const join=async()=>{
    const normalized=code.trim().toUpperCase();
    if(!ENDPOINT||busy||!/^[A-Z0-9]{12}$/.test(normalized)){setStatus('Enter a valid 12-character invite code.');return;}
    setBusy(true);
    try{
      const result=await api('/api/rooms/'+normalized+'/join');
      const next:Session={roomId:normalized,token:result.token,side:result.seat};
      writeSession(next);setSession(next);setStatus('Joining the room…');
      history.replaceState(null,'',location.pathname+'?room='+normalized);
    }catch(e){setStatus(e instanceof Error?e.message:'Could not join room');}
    finally{setBusy(false);}
  };
  useEffect(()=>{
    if(!session||!ENDPOINT)return;
    let stopped=false,attempt=0,reconnect:ReturnType<typeof setTimeout>|null=null;
    const connect=()=>{
      if(stopped)return;
      const url=ENDPOINT.replace(/^http/,'ws')+'/api/rooms/'+session.roomId+'/socket';
      const ws=new WebSocket(url,['gcu-v1','seat.'+session.token]);
      socket.current=ws;
      ws.onopen=()=>{setConnected(true);setStatus('Connected to secure private room');attempt=0;};
      ws.onmessage=event=>{
        try{
          const body=JSON.parse(event.data);
          if(body.type==='state'){setState(body as RoomState);setSelected(null);}
          else if(body.type==='error')setStatus('Server: '+String(body.error));
        }catch{setStatus('Invalid message from match server');}
      };
      ws.onerror=()=>setStatus('Room connection interrupted.');
      ws.onclose=()=>{
        setConnected(false);
        if(!stopped&&attempt<8){attempt++;reconnect=setTimeout(connect,Math.min(15000,500*2**attempt));}
        else if(!stopped)setStatus('Reconnect limit reached. Reopen the room to retry.');
      };
    };
    connect();
    return()=>{stopped=true;if(reconnect)clearTimeout(reconnect);socket.current?.close(1000,'Leaving page');socket.current=null;setConnected(false);};
  },[session?.roomId,session?.token]);
  const submit=(from:Square,to:Square)=>{
    if(!ready||!socket.current||socket.current.readyState!==WebSocket.OPEN||!state)return;
    const moving=game.get(from);
    const promoting=moving?.type==='p'&&(to.endsWith('8')||to.endsWith('1'));
    const id=crypto.randomUUID().replace(/-/g,'');
    socket.current.send(JSON.stringify({type:'move',id,from,to,promotion:promoting?'q':undefined,revision:state.revision}));
    setSelected(null);
  };
  const choose=(square:Square)=>{
    if(!ready)return;
    if(selected&&legal.includes(square)){submit(selected,square);return;}
    const piece=game.get(square);
    setSelected(piece&&piece.color===session?.side?square:null);
  };
  const abandon=()=>{socket.current?.close();socket.current=null;writeSession(null);setSession(null);setState(null);setSelected(null);setConnected(false);history.replaceState(null,'',location.pathname);setStatus('Left private room.');};
  const share=async()=>{if(!session)return;try{await navigator.clipboard.writeText(location.origin+location.pathname+'?room='+session.roomId);setStatus('Invite link copied. Your private seat token is never included.');}catch{setStatus('Copy unavailable. Share room code '+session.roomId);}};
  const ranks=session?.side==='b'?[...SQUARES].reverse():SQUARES;
  return <section className="private-online">
    <div className="heading-block"><p className="eyebrow">PRIVATE ONLINE · BETA</p><h1>Challenge a <em>Friend.</em></h1><p>Server-validated games with private invite codes. Ranked matchmaking is not available.</p></div>
    {!session?<div className="private-lobby">
      <button type="button" className="btn btn-primary" onClick={create} disabled={!ENDPOINT||busy}>CREATE PRIVATE ROOM</button>
      <label htmlFor="joincode">OR JOIN WITH A ROOM CODE</label>
      <div className="name-row"><input id="joincode" value={code} maxLength={12} placeholder="12-character code" onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}/><button type="button" className="btn btn-small" onClick={join} disabled={!ENDPOINT||busy}>JOIN</button></div>
    </div>:<>
      <div className="private-room-meta"><div><small>ROOM CODE</small><strong>{session.roomId}</strong><small>Playing as {session.side==='w'?'White':'Black'} · {connected?'Connected':'Connecting'}</small></div><button type="button" className="btn btn-small" onClick={share}>COPY INVITE</button><button type="button" className="private-leave" onClick={abandon}>LEAVE</button></div>
      {state&&<><p className="private-status">{state.status==='waiting'?'Waiting for your opponent':state.status==='finished'?'Match finished · '+(state.result||'Draw'):ready?'Your move':state.turn===session.side?'Reconnecting…':'Opponent to move'} {state.isCheck?' · Check!':''}</p>
        <div className="board-surround"><div className="board" role="grid" aria-label="Online chessboard">
          {ranks.map((square,i)=>{
            const piece=game.get(square),row=Math.floor(i/8),col=i%8;
            const isLight=(FILES.indexOf(square[0])+(8-Number(square[1])))%2===0;
            return <button type="button" key={square} role="gridcell" onClick={()=>choose(square)} disabled={!ready} aria-selected={selected===square} aria-label={square+(piece?' '+(piece.color==='w'?'White':'Black')+' '+piece.type:' empty')} className={'square '+(isLight?'light':'dark')+(selected===square?' selected':'')}>
              {piece&&<img alt="" draggable={false} className="piece-img" src={'/pieces/'+piece.color+'-'+piece.type+'.svg'}/>}
              {legal.includes(square)&&<span className={piece?'legal-capture':'legal-dot'}/>}
              {col===0&&<span className="rank-label">{square[1]}</span>}{row===7&&<span className="file-label">{square[0]}</span>}
            </button>;
          })}
        </div></div>
        <div className="private-moves">{game.history().join(' · ')||'No moves yet'}</div>
      </>}
    </>}
    <p role="status" className="private-connection-status">{status}</p>
  </section>;
}
