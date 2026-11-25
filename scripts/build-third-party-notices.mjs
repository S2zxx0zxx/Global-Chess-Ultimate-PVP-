import {readFile,readdir,writeFile} from 'node:fs/promises';
const packages=JSON.parse(await readFile('package-lock.json','utf8')).packages;
const notices=[];
for(const [path,pkg] of Object.entries(packages)){
 if(!path.startsWith('node_modules/')||pkg.dev)continue;
 let actual;try{actual=JSON.parse(await readFile(path+'/package.json','utf8'));}catch(e){if(pkg.optional)continue;throw e;}
 const names=(await readdir(path)).filter(s=>/^(LICENSE|LICENCE|NOTICE|COPYING)(\.|$)/i.test(s)).sort();
 if(!names.length||!actual.license)throw Error('Missing license '+path);
 const texts=[];for(const name of names)texts.push(name+'\n'+await readFile(path+'/'+name,'utf8'));
 notices.push(actual.name+' '+actual.version+' — '+actual.license+'\n'+texts.join('\n\n'));
}
await writeFile('dist/THIRD_PARTY_NOTICES.txt',notices.join('\n\n----------------\n\n')+'\n');
