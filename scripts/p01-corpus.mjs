// Fixed original positions and SAN sequences; only exact tactical outcomes are scored.
export const corpus = [
  { id:'start', moves:[] },
  { id:'opening', moves:['e4','e5','Nf3','Nc6','Bc4','Nf6'] },
  { id:'kiwipete', fen:'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1' },
  { id:'white-capture', fen:'4k3/8/8/3q4/8/3R4/8/4K3 w - - 0 1', expected:'d3d5' },
  { id:'black-capture', fen:'7k/8/4r3/8/4Q3/8/8/K7 b - - 0 1', expected:'e6e4' },
  { id:'mate-in-one', moves:['f3','e5','g4'], expected:'d8h4' }
];
