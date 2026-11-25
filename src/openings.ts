import { Chess } from 'chess.js';
// Source scope: 30 distinct names from the supplied opening excerpt. Legal SAN
// lines corrected against lichess-org/chess-openings (CC0); no recovered app code.
export const OPENINGS = [
 ['C60','Ruy Lopez','e4 e5 Nf3 Nc6 Bb5'],
 ['B20','Sicilian Defense','e4 c5'],
 ['C00','French Defense','e4 e6'],
 ['B10','Caro-Kann Defense','e4 c6'],
 ['C50','Italian Game','e4 e5 Nf3 Nc6 Bc4'],
 ['D06',"Queen's Gambit",'d4 d5 c4'],
 ['E61',"King's Indian Defense",'d4 Nf6 c4 g6 Nc3'],
 ['E20','Nimzo-Indian Defense','d4 Nf6 c4 e6 Nc3 Bb4'],
 ['A10','English Opening','c4'],
 ['A09','Réti Opening','Nf3 d5 c4'],
 ['B01','Scandinavian Defense','e4 d5'],
 ['B07','Pirc Defense','e4 d6 d4 Nf6 Nc3 g6'],
 ['B02',"Alekhine's Defense",'e4 Nf6'],
 ['B06','Modern Defense','e4 g6'],
 ['A80','Dutch Defense','d4 f5'],
 ['C44','Scotch Game','e4 e5 Nf3 Nc6 d4'],
 ['C47','Four Knights Game','e4 e5 Nf3 Nc6 Nc3 Nf6'],
 ['C41','Philidor Defense','e4 e5 Nf3 d6'],
 ['C42',"Petrov's Defense",'e4 e5 Nf3 Nf6'],
 ['C30',"King's Gambit",'e4 e5 f4'],
 ['C51','Evans Gambit','e4 e5 Nf3 Nc6 Bc4 Bc5 b4'],
 ['D02','London System','d4 d5 Nf3 Nf6 Bf4'],
 ['A45','Trompowsky Attack','d4 Nf6 Bg5'],
 ['D80','Grünfeld Defense','d4 Nf6 c4 g6 Nc3 d5'],
 ['D10','Slav Defense','d4 d5 c4 c6'],
 ['D43','Semi-Slav Defense','d4 d5 c4 c6 Nf3 Nf6 Nc3 e6'],
 ['E00','Catalan Opening','d4 Nf6 c4 e6 g3'],
 ['A56','Benoni Defense','d4 Nf6 c4 c5'],
 ['B90','Sicilian Defense: Najdorf Variation','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'],
 ['B70','Sicilian Defense: Dragon Variation','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6'],
] as const;
export const openingKey=(fen:string)=>fen.split(' ').slice(0,4).join(' ');
export type Opening = {eco:string;name:string};
let book:Map<string,Opening>|undefined;
function openingBook(){
 if(book)return book;
 const next=new Map<string,Opening>();
 for(const [eco,name,san] of OPENINGS){const game=new Chess();for(const move of san.split(' '))game.move(move);
 const key=openingKey(game.fen());if(next.has(key))throw Error('Duplicate opening position');next.set(key,{eco,name});}
 book=next;return next;
}
// Derive from the actual history, not a sticky UI value; undo and resume stay correct.
// Do not classify arbitrary FEN puzzles or late-game repetitions.
export function identifyOpening(game:Chess):Opening|null{
 const history=game.history({verbose:true});if(!history.length||history[0].before!==new Chess().fen())return null;
 const index=openingBook();let found:Opening|null=null;
 for(const move of history.slice(0,24)){const match=index.get(openingKey(move.after));if(match)found=match;}
 return found;
}
