import {readFile,readdir,writeFile} from 'node:fs/promises';
const packages=JSON.parse(await readFile('package-lock.json','utf8')).packages;
const notices=['Kytric — Voxel Board Games (CC0 1.0). Source-derived mesh surfaces and board palettes. https://kytric.itch.io/board-game-assets','Lichess chess-openings — CC0. Opening SAN/ECO reference: https://github.com/lichess-org/chess-openings','Georgez05 — 3D Chess Set Asset Pack (optional supplied FBX). Author publicly permits use; attribution retained. https://georgez05.itch.io/chess-pack-high-and-low-poly'];
for(const [path,pkg] of Object.entries(packages)){
 if(!path.startsWith('node_modules/')||pkg.dev)continue;
 let actual;try{actual=JSON.parse(await readFile(path+'/package.json','utf8'));}catch(e){if(pkg.optional)continue;throw e;}
 const names=(await readdir(path)).filter(s=>/^(LICENSE|LICENCE|NOTICE|COPYING)(\.|$)/i.test(s)).sort();
 if(!names.length||!actual.license)throw Error('Missing license '+path);
 const texts=[];for(const name of names)texts.push(name+'\n'+await readFile(path+'/'+name,'utf8'));
 notices.push(actual.name+' '+actual.version+' — '+actual.license+'\n'+texts.join('\n\n'));
}
await writeFile('dist/THIRD_PARTY_NOTICES.txt',notices.join('\n\n----------------\n\n')+'\n');
