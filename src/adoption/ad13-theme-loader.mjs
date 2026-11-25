// AD-13 private prepared asset loader. No default remote endpoint or production activation.
const hashPattern=/^[0-9a-f]{64}$/;
const kinds=new Set(['sprite','texture','audio','animation','spine_atlas','spine_skeleton']);
const keys=['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'];
const must=(ok,reason)=>{if(!ok)throw new Error(reason);};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const object=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
export async function sha256(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');}
export async function createThemeLoader({catalogBytes,expectedSha256,readBlob}){
  must(catalogBytes instanceof Uint8Array&&catalogBytes.byteLength<=16*1024*1024,'invalid catalog bytes');
  must(hashPattern.test(expectedSha256)&&await sha256(catalogBytes)===expectedSha256,'catalog integrity mismatch');
  must(typeof readBlob==='function','explicit blob provider required');
  const c=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(catalogBytes));
  must(c.schema===1&&c.scope==='private-preparation'&&object(c.records)&&object(c.themes)&&object(c.aliases),'invalid catalog schema');
  const ext={sprite:'png',texture:'png',audio:'ogg',animation:'json',spine_atlas:'atlas',spine_skeleton:'skel'};
  for(const [id,r] of Object.entries(c.records)){
    must(object(r)&&r.id===id&&kinds.has(r.kind)&&typeof r.source==='string'&&/^-?\d+$/.test(r.pathId)&&id===`${r.kind}:${r.source}:${r.pathId}`,'invalid record identity');
    must(['prepared','review','blocked'].includes(r.status),'invalid status');
    must(r.status!=='prepared'||r.kind==='sprite','unsupported prepared kind');
    if(r.status==='blocked'){must(!own(r,'blob')&&!own(r,'sha256')&&!own(r,'bytes'),'blocked resource has blob');continue;}
    must(hashPattern.test(r.sha256)&&r.blob===`blobs/${r.sha256}.${ext[r.kind]}`&&Number.isSafeInteger(r.bytes)&&r.bytes>0&&r.bytes<=64*1024*1024,'invalid blob descriptor');
    if(r.kind==='sprite'||r.kind==='texture')must(Number.isInteger(r.metadata?.width)&&r.metadata.width>0&&Number.isInteger(r.metadata?.height)&&r.metadata.height>0,'invalid image dimensions');
  }
  function sprite(id){must(typeof id==='string'&&own(c.records,id),'unknown asset');const r=c.records[id];must(r.kind==='sprite'&&r.status==='prepared','asset not prepared');return r;}
  for(const id of Object.values(c.aliases))sprite(id);
  for(const field of ['boards','pieces','highlights','previews','coordinates'])must(object(c.themes[field]),'invalid theme section');
  for(const field of ['boards','highlights','previews','coordinates'])for(const id of Object.values(c.themes[field]))sprite(id);
  for(const t of Object.values(c.themes.pieces)){
    must(object(t),'invalid piece theme');for(const mode of ['chess','chess2d']){must(object(t[mode])&&Object.keys(t[mode]).length===12&&keys.every(k=>own(t[mode],k)),'incomplete piece set');for(const k of keys)sprite(t[mode][k]);}sprite(t.shadow);
  }
  function resolveTheme(boardId,pieceId,mode='chess2d'){
    must(mode==='chess'||mode==='chess2d','invalid piece mode');must(typeof boardId==='string'&&typeof pieceId==='string','invalid theme IDs');
    must(own(c.themes.boards,boardId)&&own(c.themes.pieces,pieceId),'unknown theme');const t=c.themes.pieces[pieceId];return {board:c.themes.boards[boardId],pieces:{...t[mode]},shadow:t.shadow};
  }
  async function loadSprite(id){const r=sprite(id);const value=await readBlob(r.blob,r.bytes);must(value instanceof Uint8Array&&value.byteLength===r.bytes,'blob length mismatch');const bytes=Uint8Array.from(value);must(await sha256(bytes)===r.sha256,'blob integrity mismatch');return {id,bytes,width:r.metadata.width,height:r.metadata.height};}
  async function loadTheme(boardId,pieceId,mode='chess2d'){
    const t=resolveTheme(boardId,pieceId,mode),ids=[t.board,...keys.map(k=>t.pieces[k]),t.shadow],loaded=new Map();
    // Transactional result: no partial theme returned on a missing/corrupt resource.
    for(const id of new Set(ids))loaded.set(id,await loadSprite(id));
    return {board:loaded.get(t.board),pieces:Object.fromEntries(keys.map(k=>[k,loaded.get(t.pieces[k])])),shadow:loaded.get(t.shadow)};
  }
  return Object.freeze({resolveTheme,loadTheme,loadSprite,listThemes:()=>({boards:Object.keys(c.themes.boards),pieces:Object.keys(c.themes.pieces)})});
}
