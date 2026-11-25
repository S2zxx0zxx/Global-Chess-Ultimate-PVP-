#!/usr/bin/env python3
"""Read-only source interaction inventory; candidate contracts never execute callbacks."""
import argparse,collections as C,csv,hashlib,json,struct,zipfile
from pathlib import Path
TYPES={'Button','Toggle','Slider','Scrollbar','ScrollRect','TMP_InputField','ToggleGroup','GraphicRaycaster','UIGridView_Shell','UIListView_Shell','UIPageView_Shell','ChessBoardObj_Shell','EventTrigger','EventSystem','StandaloneInputModule','UIFoldout','CanvasGroup'}
# Deliberately bounded mappings. Source callback bodies are not recovered.
RULES={
 'UIGameForm':{'BtnSetting':'game.menu','btnHelp':'game.hint','BtnRetract':'game.undo','ChatBtn':'game.local_emote_partial'},
 'UIGameSetForm':{'HomeBtn':'game.save_exit','NewGameBtn':'game.new','ThemeBtn':'studio.customize'},
 'UIEndGameForm':{'ButtonRetry':'game.new','btnHelp':'game.hint','BtnSetting':'game.menu','ButtonBack':'studio.training'},
 'UIPromotionForm':{'BtnQ':'game.promote_q','BtnR':'game.promote_r','BtnB':'game.promote_b','BtnN':'game.promote_n','BtnClose':'game.promotion_cancel','BtnComfirm':'game.promotion_confirm_gap'},
 'UIFinishForm':{'BtnHome':'studio.home','BtnNewGame':'game.new','BtnReview':'game.review','BtnReplayGame':'game.review','BtnBack':'studio.home'},
 'UIProfileForm':{'ImgNick':'studio.name','NodeHead':'studio.avatar','NodeBadge':'studio.frame','BtnReset':'studio.reset_scope_gap'},
 'UISelColorForm':{'BtnWhite':'studio.side','BtnBlack':'studio.side','BtnRandom':'studio.random_side_gap','BtnPlay':'studio.start'},
 'UIEloRateForm':{'BtnWhite':'studio.side','BtnBlack':'studio.side','BtnRandom':'studio.random_side_gap','BtnPlay':'studio.start','SliderElo':'studio.elo_gap'},
 'UIMainForm':{'Home Button':'studio.home','EndGame Button':'studio.training','Store Button':'studio.shop','Theme Button':'studio.customize','Tutorial Button':'studio.tutorial','SettingsBtn':'studio.settings','HeadBtn':'studio.profile','IconSevenDayTask':'studio.missions','StartBnt':'studio.start_mode_gap','ChessboardBtn':'studio.board_skin','ChesspieceBtn':'studio.piece_skin_gap'},
 'HomePage':{'StartBnt':'studio.start_mode_gap','IconSevenDayTask':'studio.missions'},
 'ThemePage':{'SettingsBtn':'studio.settings','ChessboardBtn':'studio.board_skin','ChesspieceBtn':'studio.piece_skin_gap'},
 'UISettingsForm':{'PrivacyBtn':'studio.privacy','ContactBtn':'studio.feedback','RateBtn':'studio.feedback','LangBtn':'studio.language_gap'},
 'UIReviewForm':{'BtnPlay':'game.review','BtnStop':'game.review','BtnPrevious':'game.review','BtnNext':'game.review','histCell':'game.review'},
 'UIConfirmForm':{'YesBtn':'game.context_confirmation','NoBtn':'game.context_confirmation'},
 'UIExitForm':{'YesBtn':'game.exit_confirmation_gap','NoBtn':'game.exit_confirmation_gap'},
 'UIGuideForm':{'BtnNext':'studio.tutorial','BtnEnd':'studio.tutorial','touchMask':'game.board_guard_gap'},
 'UIChatForm':{'EmojiBtn':'game.local_emote_partial','ChatBtn':'game.chat_unavailable'},
 'UIRateUsForm':{'MailBtn':'studio.feedback','RateBtn':'studio.feedback'},
 'StorePage':{'SettingsBtn':'studio.settings'},'UIIapForm':{'SettingsBtn':'studio.settings'},
}
GAPS={'studio.random_side_gap','game.local_emote_partial','game.promotion_confirm_gap','studio.reset_scope_gap','studio.elo_gap','studio.start_mode_gap','studio.piece_skin_gap','studio.language_gap','game.context_confirmation','game.exit_confirmation_gap','game.board_guard_gap'}
def classify(root,path,name,typ):
 if root.startswith('DebugUI'):return 'debug_only',None
 if typ in {'GraphicRaycaster','CanvasGroup','EventSystem','StandaloneInputModule','ToggleGroup','ScrollRect','Scrollbar','UIGridView_Shell','UIListView_Shell','UIPageView_Shell','UIFoldout','EventTrigger'}:return 'structural_contract',None
 if typ=='ChessBoardObj_Shell':return 'candidate','game.board'
 if root in ('UISettingsForm','UIGameSetForm'):
  if name in ('2D','3D') and '/ChessCell/' in path:return 'candidate','game.board_view'
  for cell,action in {'SoundCell':'studio.sound','VibrateCell':'studio.haptic','LegalCell':'studio.hints','MusicCell':'studio.music_unavailable','ChatCell':'game.chat_unavailable','LocationCell':'studio.location_gap'}.items():
   if '/'+cell+'/' in path and name=='btn on':return ('partial_or_unavailable' if action.endswith(('_gap','_unavailable')) else 'candidate'),action
 if root=='UIChatForm' and name.startswith('EmojiCell '):return 'partial_or_unavailable','game.local_emote_partial'
 if root=='UIChatForm' and name.startswith('ChatCell '):return 'partial_or_unavailable','game.chat_unavailable'
 a=RULES.get(root,{}).get(name)
 if a:return ('partial_or_unavailable' if a in GAPS or a.endswith('_unavailable') else 'candidate'),a
 if name in ('BuyButton','FreeCoins','DailyBox','Coinsbg','ClaimBtn','BtnAD','BtnCoin','BtnVideo','BtnSliderVideo','GemsBtn','ToolBtn'):return 'unavailable_service_or_economy',None
 return 'unresolved',None

def events(v,path=''):
 if isinstance(v,dict):
  if 'm_PersistentCalls' in v:yield path,v['m_PersistentCalls']['m_Calls']
  for k,x in v.items():yield from events(x,path+'/'+k)
 elif isinstance(v,list):
  for i,x in enumerate(v):yield from events(x,path+'/'+str(i))

def trigger(body):
 # Observed EventTrigger list/UnityEvent persistent-call serialization, bounded to this format.
 pos=0
 def take(n):
  nonlocal pos
  if n<0 or pos+n>len(body):raise ValueError('truncated body')
  v=body[pos:pos+n];pos+=n;return v
 def i():return struct.unpack('<i',take(4))[0]
 def ptr():return [i(),str(struct.unpack('<q',take(8))[0])]
 def st():
  n=i();v=take(n).decode('utf8');pad=take((-n)%4)
  if any(pad):raise ValueError('nonzero string padding')
  return v
 count=i()
 if not 0<=count<=100:raise ValueError('entry count')
 out=[]
 for _ in range(count):
  ev=i();n=i()
  if not 0<=n<=100:raise ValueError('call count')
  for _ in range(n):
   target=ptr();assembly=st();method=st();mode=i();obj=ptr();arg_type=st();integer=i();floating=struct.unpack('<f',take(4))[0];string=st();boolean=i();state=i()
   if boolean not in (0,1) or state not in (0,1,2):raise ValueError('unsupported call')
   out.append(dict(event_id=ev,target=target,assembly=assembly,method=method,mode=mode,object_argument=obj,argument_type=arg_type,int_argument=integer,float_argument=floating,string_argument=string,bool_argument=bool(boolean),call_state=state))
 if pos!=len(body):raise ValueError('trailing bytes')
 return out

def main():
 p=argparse.ArgumentParser();p.add_argument('ad11',type=Path);p.add_argument('closure',type=Path);p.add_argument('ad03',type=Path);p.add_argument('raw_zip',type=Path);p.add_argument('ad06',type=Path);p.add_argument('out',type=Path);a=p.parse_args();a.out.mkdir(exist_ok=True)
 def load(p):return json.loads(p.read_text())
 nodes={tuple(n['source']):n for n in load(a.ad11/'nodes.json')};components={tuple(c['source']):c for c in load(a.ad11/'components.json')};rec={tuple(c['source']):c for c in load(a.closure/'raw_component_recovery.json')};headers={tuple(c['source']):c for c in load(a.closure/'remaining_component_headers.json')};inv={(r['file'],r['path_id']):r for r in csv.DictReader((a.ad03/'unity_objects.csv').open())};dep=C.defaultdict(list)
 for d in load(a.ad11/'dependencies.json'):dep[d['source_file'],d['source_id']].append(d)
 controls=[];evs=[];shell=[];stripped=[];counts=C.Counter();cache={};verified=set()
 with zipfile.ZipFile(a.raw_zip) as z:
  def raw(k):
   if k[0] not in cache:cache[k[0]]=z.read('unpacked/'+k[0])
   r=inv[k];o,n=int(r['offset']),int(r['size_bytes']);b=cache[k[0]][o:o+n];assert len(b)==n and hashlib.sha256(b).hexdigest()==r['object_sha256'];verified.add(k);return b
  for k,c in components.items():
   n=nodes[tuple(c['owner'])];root=nodes[tuple(n['root'])]['name'];typ=c['script'];m=c['metadata'];h=headers.get(k);rr=rec.get(k)
   if h and h.get('script_identity'):typ=h['script_identity']['m_ClassName']
   if m is None and rr and rr['status']=='decoded':m=rr['metadata']
   if c['class_id']=='225':typ='CanvasGroup'
   for path,calls in events(m):
    if calls:raw(k)
    evs.append({'source':list(k),'root':root,'path':path,'script':typ,'calls':calls,'scope':'debug' if root.startswith('DebugUI') else 'player_or_framework'})
   if typ.endswith('_Shell') and m:
    refs=[d for d in dep[k] if d['target_id']!='0' and (d['target_file'],d['target_id']) in components and components[d['target_file'],d['target_id']]['script'] in TYPES]
    if refs:raw(k);shell.append({'source':list(k),'script':typ,'owner_path':n['hierarchy_path'],'control_refs':refs})
   if typ not in TYPES:continue
   b=raw(k);assert hashlib.sha256(b).hexdigest()==c['sha256'];status,action=classify(root,n['hierarchy_path'],n['name'],typ)
   if h and typ in ('EventTrigger','EventSystem','StandaloneInputModule','UIFoldout'):
    body=b[h['body_offset']:];r={'source':list(k),'script':typ,'body_hex':body.hex(),'schema_verified':False}
    if typ=='EventTrigger':
     calls=trigger(body);assert len(calls)==1 and calls[0]['method']=='OnScrollbarClicked';assert (k[0],calls[0]['target'][1]) in components;r['parsed_calls']=calls;evs.append({'source':list(k),'root':root,'path':'raw/EventTrigger','script':typ,'calls':calls,'scope':'debug'})
    stripped.append(r)
   fields={key:v for key,v in (m or {}).items() if key not in ('#374','m_Script','m_Name')};controls.append({'source':list(k),'owner':c['owner'],'root':root,'path':n['hierarchy_path'],'type':typ,'sha256':c['sha256'],'active_self':n['active'],'source_enabled':(m or {}).get('#349'),'metadata':fields,'source_schema_known':m is not None,'status':status,'candidate_action':action,'runtime_listener_verified':False});counts[status]+=1
  animations=[]
  for f in sorted(a.ad06.glob('*.json')):
   v=load(f);animations.extend({'source':[v['source_file'],v['path_id']],'clip':v['name'],'index':i,'event':e,'dispatch':'not_wired'} for i,e in enumerate(v['events']))
  assert len(animations)==96
 forms=load(a.ad11/'form_crosswalk.json');assert len(forms)==46;assert len(controls)==len({tuple(r['source']) for r in controls})
 summary={'controls':len(controls),'types':dict(C.Counter(r['type'] for r in controls)),'status':dict(counts),'event_fields':len(evs),'persistent_calls':sum(len(e['calls']) for e in evs),'nonempty_event_fields':sum(bool(e['calls']) for e in evs),'player_nonempty_fields':sum(bool(e['calls']) and e['scope']!='debug' for e in evs),'shell_control_links':sum(len(r['control_refs']) for r in shell),'stripped_controls':len(stripped),'raw_objects_rehashed':len(verified),'animation_events':len(animations),'forms':len(forms),'runtime_listeners_verified':0}
 for name,data in [('summary',summary),('controls',controls),('events',evs),('shell_links',shell),('stripped_controls',stripped),('animation_events',animations),('forms',forms)]: (a.out/(name+'.json')).write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
 print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
