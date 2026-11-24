import { useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';
type Props={onComplete:()=>void};
const STEPS=[
  {from:'e2',to:'e4',title:'Move the Pawn',desc:'Select the pawn on e2. Then move it two squares ahead to e4.'},
  {from:'e7',to:'e5',title:'Respond with Black',desc:'Select the black pawn on e7, then move it to e5.'},
  {from:'g1',to:'f3',title:'Develop Your Knight',desc:'Knights leap in an L. Select the knight at g1 and move to f3.'},
  {from:'b8',to:'c6',title:'Learn from Both Sides',desc:'Develop the black knight from b8 to c6.'},
  {from:'f1',to:'c4',title:'Use the Bishop',desc:'Select the bishop at f1. Travel diagonally to c4.'},
] as const;
const FILES='abcdefgh';
export default function RoyalTutorial({onComplete}:Props){
  const [step,setStep]=useState(0);
  const [fen,setFen]=useState(()=>new Chess().fen());
  const [selected,setSelected]=useState<Square|null>(null);
  const [message,setMessage]=useState('Tap the highlighted piece.');
  const chess=useMemo(()=>new Chess(fen),[fen]);
  const legal=useMemo(()=>selected?chess.moves({square:selected,verbose:true}).map(m=>m.to):[],[selected,chess]);
  const current=STEPS[step];
  const choose=(square:Square)=>{
    if(!current)return;
    if(!selected){
      if(square!==current.from){setMessage('Start with '+current.from+'.');return;}
      setSelected(square);setMessage('Now choose '+current.to+'.');return;
    }
    if(selected!==current.from||square!==current.to||!legal.includes(square)){
      setSelected(null);setMessage('Try '+current.from+' → '+current.to+'.');return;
    }
    try{
      chess.move({from:selected,to:square});
      setFen(chess.fen());setSelected(null);setStep(x=>x+1);
      setMessage(step+1===STEPS.length?'Tutorial complete!':'Great move. Continue with the next piece.');
    }catch{setMessage('That move is not legal.');setSelected(null);}
  };
  const restart=()=>{setFen(new Chess().fen());setStep(0);setSelected(null);setMessage('Tap the highlighted piece.');};
  return <section className="royal-tutorial">
    <div className="royal-tutorial-header"><span>♛ CHESS ACADEMY</span><strong>Learn to Move</strong><p>{current?.desc||'You completed all five interactive lessons.'}</p></div>
    <div className="royal-tutorial-progress"><span>LESSON {Math.min(step+1,5)} / 5</span><div><i style={{width:(step/5*100)+'%'}}/></div></div>
    <div className="royal-tutorial-board" role="grid" aria-label="Interactive chess tutorial">
      {Array.from({length:64},(_,i)=>{
        const square=(FILES[i%8]+(8-Math.floor(i/8))) as Square;
        const piece=chess.get(square), light=(Math.floor(i/8)+i%8)%2===0;
        const target=current?.to===square,from=current?.from===square,possible=legal.includes(square);
        return <button key={square} type="button" role="gridcell" onClick={()=>choose(square)} aria-label={square+(piece?' '+piece.color+piece.type:' empty')} aria-selected={selected===square}
          className={'royal-tutorial-square '+(light?'light':'dark')+(selected===square?' selected':'')+(target&&selected?' destination':'')}>
          {piece&&<img src={'/pieces/'+piece.color+'-'+piece.type+'.svg'} alt=""/>}
          {possible&&<span className="royal-tutorial-dot"/>}{from&&<span className="royal-tutorial-frame"/>}
        </button>;
      })}
    </div>
    <p className="royal-tutorial-feedback" role="status">{message}</p>
    <div className="royal-tutorial-actions">
      <button type="button" onClick={restart}>RESTART</button>
      <button type="button" onClick={onComplete}>{step>=STEPS.length?'PLAY CHESS':'EXIT TUTORIAL'}</button>
    </div>
  </section>;
}
