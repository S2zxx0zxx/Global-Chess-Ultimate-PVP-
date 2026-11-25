import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const expected={
  "premium-low-fantasy": "bc1cc69af39af7169d80407f1883d0bddc1931d47d751fdec428483984834c85",
  "premium-high": "83602629e365f682f06657ab25873164bcd198d7e85adb8dfc8b9132673da819",
  "premium-high-fantasy": "79a6376d551e6dfe1ba02044f75201910e42faede439a4effedddcb5e3912c33",
  "premium-low": "83846babcf10e1b4aff60c551a917ee5dfd876f89124cef37a959076f84d7c9e"
};
for(const [id,hash] of Object.entries(expected)){
 const path='public/assets/five-resource/'+id+'.fbx';
 const content=await readFile(path);
 if(createHash('sha256').update(content).digest('hex')!==hash)throw Error('Source mismatch: '+path);
 console.log('Verified '+path+' '+content.length+' bytes');
}
