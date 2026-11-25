import { validRequest, type Response } from './protocol.ts';
import { runSearch } from './search.ts';
const scope=globalThis as unknown as {onmessage:((e:MessageEvent<unknown>)=>void)|null;postMessage:(r:Response|{protocol:1;type:'invalid-request'})=>void};
scope.onmessage=e=>{
  if(!validRequest(e.data)){scope.postMessage({protocol:1,type:'invalid-request'});return;}
  scope.postMessage(runSearch(e.data));
};
