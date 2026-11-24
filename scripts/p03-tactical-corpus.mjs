// Original deterministic tactical fixtures. Mate-in-two verified by exhaustive legal minimax in tests.
export const tacticalCorpus=[
 {id:'mate-one',moves:['f3','e5','g4'],expected:['d8h4']},
 {id:'mate-two',fen:'7k/8/5K2/8/8/8/8/Q7 w - - 0 1',expected:['f6f7','f6g6','a1a7','a1g1']},
 {id:'hanging-queen',fen:'4k3/8/8/3q4/8/3R4/8/4K3 w - - 0 1',expected:['d3d5']},
 {id:'recapture-trap',fen:'3r3k/8/8/3p4/8/8/8/K2Q4 w - - 0 1',avoid:['d1d5']},
 {id:'forced-evasion',fen:'7r/8/8/8/8/5k2/8/7K w - - 0 1',expected:['h1g1']},
 {id:'promotion',fen:'1r5k/P7/8/8/8/8/8/7K w - - 0 1',expected:['a7b8q']},
 {id:'black-hanging-queen',fen:'7k/8/4r3/8/4Q3/8/8/K7 b - - 0 1',expected:['e6e4']}
];
export const passes=(f,move)=>f.expected?f.expected.includes(move):!!move&&!f.avoid.includes(move);
