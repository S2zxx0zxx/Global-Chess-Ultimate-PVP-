import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Deliberately narrow: prevents known reference paths and all unreleased
// adoption staging assets from entering the tracked repository. Not a license scanner.
function prohibited(path) {
  const p=path.replaceAll('\\','/').toLowerCase();
  const parts=p.split('/');
  return /\.(apk|apks|xapk)$/.test(p) ||
    parts.some(s=>s==='.apk-quarantine'||s==='chess_adoption_readiness'||s==='chess_audit_work'||s==='chess_ad03_private'||s==='chess_ad03_private_manifest.zip'||s==='chess_ad02_owner_authorized_inventory.csv'||s==='chess_ad04_private'||s==='chess_ad04_audio_readiness.zip'||s==='chess_ad05_private'||s==='chess_ad05_ogg_pack.zip'||s==='chess_ad05_wav_masters.zip'||s==='ad04_pinned_vgmstream.zip'||s==='chess_ad06_private'||s==='chess_ad06_normalized_animations.zip'||s==='chess_ad07_private'||s==='chess_ad07_binding_and_interpolation.zip'||s==='chess_ad08_private'||s==='chess_ad08_spine_mapping.zip'||s==='chess_ad09_private'||s==='chess_ad09_uv_compatibility.zip'||s==='ad09_runtime_metadata.zip'||s==='chess_ad10_private'||s==='chess_ad10_playback_verification.zip'||s==='ad10_spine_core_evaluation.zip'||s==='chess_ad09_11_closure'||s==='chess_ad09_11_closure_r2'||s==='chess_ad09_ad11_closure_audit.zip'||s==='chess_ad09_ad11_closure_r2.zip'||s==='chess_ad09_11_closure_r3'||s==='chess_ad09_ad11_closure_r3.zip'||s==='chess_ad12_private'||s==='chess_ad12_interaction_contracts.zip'||s==='chess_ad11_private'||s==='chess_ad11_ui_hierarchy_mapping.zip'||
      /^chess_(uiux_extracted_assets|boards_and_pieces|unity_raw_evidence|adoption_readiness_pack)\.zip$/.test(s)||
      /^chess_ad02_private_provenance\.csv$/.test(s)||
      /^chess_extracted_(boards|piece_themes)\.png$/.test(s)) ||
    /^(public\/assets|src\/assets)\/apk-adoption(?:\/|$)/.test(p);
}
test('AD-02 quarantine tripwire rejects known reference paths',()=>{
  for(const p of ['Chess.apks','nested/BASE.APK','public/Chess_UIUX_Extracted_Assets.zip',
    'public/assets/apk-adoption/piece.png','src/assets/apk-adoption/sound.ogg',
    '.apk-quarantine/audio.fsb','Chess_Adoption_Readiness/spine/a.skel',
    'docs/Chess_AD02_Private_Provenance.csv','public/Chess_Extracted_Boards.png',
    'Chess_AD03_Private/dependency_edges.csv','public/Chess_AD03_Private_Manifest.zip','Chess_AD02_Owner_Authorized_Inventory.csv','Chess_AD04_Private/preflight.json','Chess_AD04_Audio_Readiness.zip','Chess_AD05_Private/converted/ogg/a.ogg','Chess_AD05_OGG_Pack.zip','Chess_AD05_WAV_Masters.zip','AD04_Pinned_vgmstream.zip','Chess_AD06_Private/normalized/clips/a.json','Chess_AD06_Normalized_Animations.zip','Chess_AD07_Private/results/bindings.json','Chess_AD07_Binding_And_Interpolation.zip','Chess_AD08_Private/assets/payloads/a.skel','Chess_AD08_Spine_Mapping.zip','Chess_AD09_Private/region_uv_audit.json','Chess_AD09_UV_Compatibility.zip','AD09_Runtime_Metadata.zip','Chess_AD10_Private/results/results.json','Chess_AD10_Playback_Verification.zip','AD10_Spine_Core_Evaluation.zip','Chess_AD11_Private/results/nodes.json','Chess_AD11_UI_Hierarchy_Mapping.zip'])
    assert.equal(prohibited(p),true,p);
  for(const p of ['docs/APK_ASSET_PROVENANCE.md','src/App.tsx','public/assets/asset-manifest.json',
    'public/assets/original/piece.svg','tests/apk-quarantine.test.mjs'])
    assert.equal(prohibited(p),false,p);
});
test('AD-02 tracked tree contains no reserved quarantine or adoption paths',()=>{
  const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
  assert.ok(files.length>0,'Git tracked tree required');
  assert.deepEqual(files.filter(prohibited),[],'Quarantined or not-yet-approved asset paths tracked');
});
