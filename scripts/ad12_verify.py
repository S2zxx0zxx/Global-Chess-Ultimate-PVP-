#!/usr/bin/env python3
"""Check coverage and fail-closed classification of AD-12 private output."""
import argparse,collections as C,json,struct,unittest
from pathlib import Path
from ad12_interactions import classify,trigger,TYPES

def verify(src,closure,out):
 def read(p):return json.loads(p.read_text())
 source=read(src/'components.json');nodes={tuple(r['source']):r for r in read(src/'nodes.json')};headers={tuple(r['source']):r for r in read(closure/'remaining_component_headers.json')};rows=read(out/'controls.json');summary=read(out/'summary.json');expected={}
 for c in source:
  k=tuple(c['source']);t=(headers.get(k,{}).get('script_identity') or {}).get('m_ClassName',c['script']);t='CanvasGroup' if c['class_id']=='225' else t
  if t in TYPES:expected[k]=(c,t)
 actual={tuple(r['source']):r for r in rows};assert len(actual)==len(rows)==len(expected)==667 and actual.keys()==expected.keys()
 for k,r in actual.items():
  c,t=expected[k];assert r['type']==t and r['owner']==c['owner'] and r['sha256']==c['sha256'] and r['path']==nodes[tuple(c['owner'])]['hierarchy_path'];assert r['runtime_listener_verified'] is False
  if r['root'].startswith('DebugUI'):assert r['status']=='debug_only' and r['candidate_action'] is None
  if r['status']=='candidate':assert r['candidate_action'] and not r['candidate_action'].endswith(('_gap','_unavailable','_partial'))
 assert dict(C.Counter(r['status'] for r in rows))==summary['status'];evs=read(out/'events.json');assert len(evs)==3294 and sum(len(r['calls']) for r in evs)==24 and all(r['scope']=='debug' for r in evs if r['calls']);assert summary['player_nonempty_fields']==0
 raw=read(out/'stripped_controls.json');assert len(raw)==11
 for r in raw:
  if r['script']=='EventTrigger':assert trigger(bytes.fromhex(r['body_hex']))==r['parsed_calls']
 events=read(out/'animation_events.json');assert len(events)==len({(tuple(r['source']),r['index']) for r in events})==96 and all(r['dispatch']=='not_wired' for r in events)
 assert len(read(out/'forms.json'))==46 and sum(len(r['control_refs']) for r in read(out/'shell_links.json'))==85
 return {'status':'PASS','coverage':len(actual),'event_fields':len(evs),'persistent_debug_calls':24,'animation_events':96,'forms':46,'scope':'independent identity/coverage and policy checks, not runtime callbacks'}

class Fixtures(unittest.TestCase):
 def test_trigger_bounds(self):
  self.assertEqual(trigger(struct.pack('<i',0)),[])
  for b in [b'',struct.pack('<i',-1),struct.pack('<i',101),struct.pack('<ii',0,1),struct.pack('<iii',1,2,1)]:
   with self.assertRaises(ValueError):trigger(b)
 def test_unavailable(self):
  self.assertEqual(classify('UIIapForm','UIIapForm/BuyButton','BuyButton','Button'),('unavailable_service_or_economy',None))
  self.assertEqual(classify('UIChatForm','UIChatForm/ChatCell 101','ChatCell 101','Button'),('partial_or_unavailable','game.chat_unavailable'))
 def test_unknown(self):self.assertEqual(classify('Unseen','Unseen/BtnQ','BtnQ','Button'),('unresolved',None))
 def test_debug(self):self.assertEqual(classify('DebugUIButton','DebugUIButton','BtnQ','Button'),('debug_only',None))
 def test_contextual(self):
  self.assertEqual(classify('UIPromotionForm','UIPromotionForm/BtnComfirm','BtnComfirm','Button'),('partial_or_unavailable','game.promotion_confirm_gap'))
  self.assertEqual(classify('UISelColorForm','UISelColorForm/BtnRandom','BtnRandom','Button'),('partial_or_unavailable','studio.random_side_gap'))
  self.assertEqual(classify('UIGameForm','UIGameForm/btnHelp','btnHelp','Button'),('candidate','game.hint'))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('ad11',type=Path);p.add_argument('closure',type=Path);p.add_argument('output',type=Path);a=p.parse_args();r=verify(a.ad11,a.closure,a.output);suite=unittest.defaultTestLoader.loadTestsFromTestCase(Fixtures);tests=unittest.TextTestRunner(verbosity=2).run(suite);assert tests.wasSuccessful();r['fixture_tests']=tests.testsRun;(a.output/'verification.json').write_text(json.dumps(r,indent=2)+'\n');print(r)
