import { Chess } from 'chess.js';
// Ephemeral, casual-room-only message. Never mutates the canonical match.
export function validatedSelection(match,seat,command){
 if(!match||match.status!=='active'||!['w','b'].includes(seat)||!command||command.type!=='selection'||!Number.isSafeInteger(command.revision)||command.revision!==match.revision)return null;
 if(command.square!==null&&(typeof command.square!=='string'||!/^[a-h][1-8]$/.test(command.square)))return null;
 try{
  const game=new Chess();if(match.pgn)game.loadPgn(match.pgn);
  if(game.isGameOver()||game.turn()!==seat)return null;
  if(command.square!==null&&game.get(command.square)?.color!==seat)return null;
  return {type:'selection',side:seat,revision:match.revision,square:command.square};
 }catch{return null;}
}
