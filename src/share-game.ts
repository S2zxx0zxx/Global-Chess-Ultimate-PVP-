export type SharePort={share?:(d:ShareData)=>Promise<void>;clipboard?:{writeText:(s:string)=>Promise<void>};canShare?:(d:ShareData)=>boolean};
export function safeShareUrl(origin:string):string|null{
 try{const u=new URL(origin);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;return u.origin+'/';}catch{return null;}
}
export async function shareGame(port:SharePort,origin:string):Promise<'shared'|'copied'|'cancelled'|'unavailable'>{
 const url=safeShareUrl(origin);if(!url)return 'unavailable';
 const data={title:'Global Chess Ultimate',text:'Play Global Chess Ultimate.',url};
 try{if(port.share&&(!port.canShare||port.canShare(data))){await port.share(data);return 'shared';}}catch(e){if(e&&typeof e==='object'&&'name' in e&&e.name==='AbortError')return 'cancelled';}
 try{if(port.clipboard){await port.clipboard.writeText(url);return 'copied';}}catch{}
 return 'unavailable';
}
// No independently verified store listing exists. No placeholder or publisher links.
export const VERIFIED_STORE_URL:null=null;
